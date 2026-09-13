# ============================================================
#  colab_devotional_server.py
#  ---------------------------------------------------------
#  Run this on Google Colab (NOT on your local PC).
#  Your local pipeline calls the URL it produces.
#
#  SETUP STEPS:
#    1. Open https://colab.research.google.com -> New notebook
#    2. Runtime -> Change runtime type -> T4 GPU -> Save
#    3. Paste each "CELL N" block below into a separate cell
#    4. Run cells top-to-bottom (Shift+Enter each)
#    5. Copy the printed ngrok URL into your local .env:
#          COLAB_API_URL=https://xxxx.ngrok-free.app
#    6. Run:  npm start
# ============================================================


# ── CELL 1 ── Install packages ──────────────────────────────
# Paste ONLY the lines inside the triple-quotes into Colab Cell 1.
# This installs everything audiocraft needs on Python 3.13 / torch 2.x.
#
# Notes:
#   * torch / torchaudio are NOT reinstalled -- Colab pre-installs CUDA builds.
#     Reinstalling from PyPI would replace the CUDA build with a CPU-only one.
#   * spacy is skipped -- fails to build on Python 3.13; not needed by MusicGen.
#   * torchvision / torchtext are skipped -- their pinned versions (0.16.0)
#     don't exist for Python 3.13, and MusicGen doesn't need them.
#   * audiocraft's pyproject.toml has requires-python=">=3.9,<3.13" which blocks
#     Python 3.13. Fix: clone the repo, patch the constraint, install locally.
"""
# 1a: pin build tools before anything compiles from source
!pip install -q "setuptools<82" wheel

# 1b: install all audiocraft dependencies FIRST
#     (torch/torchaudio excluded — already installed with CUDA on Colab)
!pip install -q \
    encodec \
    torchdiffeq \
    torchmetrics \
    protobuf \
    pesq \
    pystoi \
    einops \
    flashy \
    "hydra-core>=1.1" \
    hydra_colorlog \
    julius \
    num2words \
    sentencepiece \
    "transformers>=4.31.0" \
    huggingface_hub \
    xformers \
    av

# 1c: download audiocraft zip and install locally
#     Uses Python's built-in urllib — no git or wget needed.
#     Current audiocraft main branch uses setup.py only (no pyproject.toml),
#     so no Python version patching is required.
import urllib.request, zipfile, shutil, os, subprocess, sys

shutil.rmtree("audiocraft", ignore_errors=True)
for f in os.listdir("."):
    if f.startswith("audiocraft") and os.path.isdir(f):
        shutil.rmtree(f, ignore_errors=True)

print("Downloading audiocraft...")
urllib.request.urlretrieve(
    "https://github.com/facebookresearch/audiocraft/archive/refs/heads/main.zip",
    "audiocraft.zip"
)
print(f"Downloaded: {os.path.getsize('audiocraft.zip'):,} bytes")

with zipfile.ZipFile("audiocraft.zip", "r") as z:
    z.extractall(".")
    top_dirs = {name.split("/")[0] for name in z.namelist() if "/" in name}
    extracted_folder = list(top_dirs)[0]
    print(f"Extracted folder: {extracted_folder}")

if extracted_folder != "audiocraft":
    os.rename(extracted_folder, "audiocraft")

# --no-build-isolation: reuse our pinned setuptools<82
# --no-deps: all deps already installed in step 1b
subprocess.run(
    [sys.executable, "-m", "pip", "install", "-q",
     "--no-build-isolation", "--no-deps", "./audiocraft"],
    check=True
)
print("audiocraft installed ✅")

# 1d: web server utilities
!pip install -q fastapi "uvicorn[standard]" pyngrok

print("\n✅ All packages installed successfully!")
"""


# ── CELL 2 ── Verify GPU ────────────────────────────────────
# Paste only the lines below into Colab Cell 2.
"""
import torch
print("CUDA available :", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU            :", torch.cuda.get_device_name(0))
    print("VRAM (GB)      :", round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1))
else:
    print("No GPU detected!")
    print("Go to: Runtime -> Change runtime type -> T4 GPU -> Save")
    print("Then:  Runtime -> Disconnect and delete runtime -> re-run all cells.")
"""


# ── CELL 3 ── Full API server ───────────────────────────────
# Paste EVERYTHING below this comment into Colab Cell 3 and run it.
# This cell keeps running -- leave it open while you use the pipeline.

import io
import os
import asyncio
import threading
import time

import torch
import torchaudio
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from pyngrok import ngrok
import uvicorn
from audiocraft.models import MusicGen

# ── App ─────────────────────────────────────────────────────
app = FastAPI(title="Devotional AI Music Server", version="1.0.0")

# ── Globals ─────────────────────────────────────────────────
model       = None
model_ready = threading.Event()
sessions    = {}

from transformers import AutoProcessor, BarkModel

bark_model = None
bark_processor = None
bark_ready = threading.Event()

# ── Request schema ───────────────────────────────────────────
class SongRequest(BaseModel):
    prompt:       str
    duration:     int = 45     # seconds
    vocal_gender: str = "male" # "male" or "female"
    session_id:   str = ""
    is_first:     bool = True

# ── Model loader (background thread) ────────────────────────
def load_model():
    global model, bark_model, bark_processor
    MODEL_NAME = "facebook/musicgen-medium"  # options: small | medium | large
    print(f"\n[Loading] {MODEL_NAME} from HuggingFace ...")
    print("          First run downloads ~3 GB -- grab a coffee")
    model = MusicGen.get_pretrained(MODEL_NAME)
    model_ready.set()
    print("[Ready]   MusicGen loaded!\n")

    print(f"\n[Loading] suno/bark-small from HuggingFace ...")
    bark_processor = AutoProcessor.from_pretrained("suno/bark-small")
    bark_model = BarkModel.from_pretrained("suno/bark-small").to("cuda")
    bark_ready.set()
    print("[Ready]   Bark model loaded! API is accepting requests.\n")

# ── Routes ───────────────────────────────────────────────────
@app.get("/health")
def health():
    """Used by the local pipeline to confirm Colab is reachable."""
    return {
        "status": "ok" if model_ready.is_set() else "loading",
        "model":  "facebook/musicgen-medium",
        "gpu":    torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
    }

@app.post("/generate-song")
def generate_song(req: SongRequest):
    """
    Generate a devotional song from a text prompt.
    Returns raw WAV bytes.
    The local Node.js pipeline calls this endpoint.
    """
    if not model_ready.is_set():
        raise HTTPException(
            status_code=503,
            detail="Model still loading -- retry in ~60 seconds."
        )

    try:
        # Cap duration to avoid OOM on T4 (15 GB VRAM)
        duration = min(req.duration, 60)

        full_prompt = (
            f"{req.prompt}, {req.vocal_gender} vocals, "
            "sacred devotional music, high fidelity audio"
        )
        print(f"[Generating] ({req.vocal_gender}, {duration}s): {full_prompt[:80]}...")

        model.set_generation_params(duration=duration)

        with torch.inference_mode():
            if not req.is_first and req.session_id and req.session_id in sessions:
                prev_wav = sessions[req.session_id]
                # Use last 5 seconds as prompt
                prompt_wav = prev_wav[..., -model.sample_rate * 5:]
                wav_tensors = model.generate_continuation(prompt_wav, model.sample_rate, [full_prompt])
                
                # Save the last 5 seconds for the next chunk
                sessions[req.session_id] = wav_tensors[..., -model.sample_rate * 5:]
                # Slice off the prompt so we only send the newly generated audio
                out_tensors = wav_tensors[..., prompt_wav.shape[-1]:]
            else:
                wav_tensors = model.generate([full_prompt])
                if req.session_id:
                    sessions[req.session_id] = wav_tensors[..., -model.sample_rate * 5:]
                out_tensors = wav_tensors

        # torchaudio on Python 3.13 uses torchcodec backend which cannot write
        # to a BytesIO buffer — it only accepts real file paths. Write to a
        # temp file, read the bytes back, then delete the file.
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        torchaudio.save(tmp_path, out_tensors[0].cpu(), model.sample_rate)
        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()
        os.remove(tmp_path)

        print(f"[Done]   Audio generated ({len(audio_bytes):,} bytes).")
        return Response(content=audio_bytes, media_type="audio/wav")

    except Exception as e:
        import traceback
        err = traceback.format_exc()
        print(f"[ERROR] generate_song failed:\n{err}")
        raise HTTPException(status_code=500, detail=str(e))


class VocalRequest(BaseModel):
    lyrics: str
    vocal_gender: str = "female"

@app.post("/generate-vocals")
def generate_vocals(req: VocalRequest):
    """
    Generate chanting vocals using Bark.
    """
    if not bark_ready.is_set():
        raise HTTPException(status_code=503, detail="Bark model still loading.")

    try:
        if req.vocal_gender == "male":
            voice_preset = "v2/hi_speaker_0"
        else:
            voice_preset = "v2/hi_speaker_1"
            
        text_prompt = f"♪ {req.lyrics} ♪"
        print(f"[Generating Bark] ({req.vocal_gender}): {text_prompt[:80]}")
        
        inputs = bark_processor(text_prompt, voice_preset=voice_preset).to("cuda")
        
        with torch.inference_mode():
            audio_array = bark_model.generate(**inputs)
            
        audio_array = audio_array.cpu().numpy().squeeze()
        sample_rate = bark_model.generation_config.sample_rate
        
        import tempfile
        import scipy.io.wavfile
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name
            
        scipy.io.wavfile.write(tmp_path, rate=sample_rate, data=audio_array)
        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()
        os.remove(tmp_path)
        
        return Response(content=audio_bytes, media_type="audio/wav")

    except Exception as e:
        import traceback
        err = traceback.format_exc()
        print(f"[ERROR] generate_vocals failed:\n{err}")
        raise HTTPException(status_code=500, detail=str(e))


# ── ngrok tunnel ─────────────────────────────────────────────
# Get a FREE token at: https://dashboard.ngrok.com/get-started/your-authtoken
# Paste it below OR use Colab Secrets (the key icon in the left sidebar):
#
#   from google.colab import userdata
#   NGROK_TOKEN = userdata.get("NGROK_TOKEN")

NGROK_TOKEN = "3I7yaLgYIGHzv8FZ1Me5cnNKZFf_2buVdeXuhRwXgq5a9siM"  # <- your ngrok token

if NGROK_TOKEN:
    ngrok.set_auth_token(NGROK_TOKEN)

ngrok.kill()  # kill any leftover tunnels from previous runs
tunnel     = ngrok.connect(8000)
public_url = tunnel.public_url

print("=" * 60)
print("  Colab API is LIVE at:")
print(f"      {public_url}")
print()
print("  Copy this line into your local .env file:")
print(f"      COLAB_API_URL={public_url}")
print()
print("  Then run:  npm start")
print("=" * 60)

# ── Start server ─────────────────────────────────────────────
# Uvicorn runs in its own thread with a brand-new event loop,
# completely isolated from Colab's existing loop.
def run_server():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="warning")
    server = uvicorn.Server(config)
    loop.run_until_complete(server.serve())

threading.Thread(target=load_model, daemon=True).start()
threading.Thread(target=run_server,  daemon=True).start()

print("Server is starting... (keep this cell running)")

# Block the cell so Colab doesn't exit
while True:
    time.sleep(60)
