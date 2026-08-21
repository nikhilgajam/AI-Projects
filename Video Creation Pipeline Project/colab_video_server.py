# ============================================================
#  colab_video_server.py
#  ─────────────────────────────────────────────────────────
#  Runs on Google Colab (NOT your local PC).
#  Uses LTX-Video (Lightricks) for AI video clip generation.
#  Your local pipeline calls the URL this prints.
#
#  SETUP STEPS:
#    1. Open https://colab.research.google.com → New notebook
#    2. Runtime → Change runtime type → T4 GPU → Save
#    3. Paste each "CELL N" block into a separate Colab cell
#    4. Run cells top-to-bottom (Shift+Enter each)
#    5. Copy the printed ngrok URL into your .env:
#          COLAB_VIDEO_URL=https://xxxx.ngrok-free.app
#    6. Run:  node VideoGeneratorWithAIVideo_Colab.js
#
#  NOTE ON SPEED:
#    LTX-Video on a free T4 GPU takes ~2–4 min per 4-second clip.
#    A 60-second video (10 clips) takes ~20–40 minutes to generate.
#    Higher quality, real AI video — worth the wait!
#
#  MODEL:  Lightricks/LTX-Video  (~13 GB, auto-downloaded on first run)
#  MEMORY: Uses CPU offloading to fit within T4's 15 GB VRAM.
# ============================================================


# ── CELL 1 ─── Install packages ─────────────────────────────
# Paste only this block into Colab Cell 1 and run it.
"""
!pip install -q \
    "sympy==1.13.1" \
    diffusers \
    transformers \
    accelerate \
    sentencepiece \
    fastapi \
    "uvicorn[standard]" \
    pyngrok \
    Pillow \
    imageio \
    "imageio[ffmpeg]"

print("✅ All packages installed!")
"""


# ── CELL 2 ─── Verify GPU ───────────────────────────────────
# Paste only this block into Colab Cell 2 and run it.
"""
import torch
print("CUDA available :", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU            :", torch.cuda.get_device_name(0))
    print("VRAM (GB)      :", round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1))
else:
    print("❌ No GPU found! Change Runtime → T4 GPU before continuing.")
"""


# ── CELL 3 ─── Full LTX-Video API Server ────────────────────
# Paste EVERYTHING below this comment into Colab Cell 3 and run it.
# This cell keeps running — leave it open while using the pipeline.

import io
import os
import asyncio
import threading
import tempfile

import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from diffusers import LTXPipeline
from pyngrok import ngrok
import uvicorn
from PIL import Image

# ── App ─────────────────────────────────────────────────────
app = FastAPI(title="Colab LTX-Video Generation API", version="1.0.0")

# ── Globals ─────────────────────────────────────────────────
pipe_video  = None
model_ready = threading.Event()

# ── Request schemas ──────────────────────────────────────────
class VideoRequest(BaseModel):
    prompt:          str
    negative_prompt: str  = "worst quality, inconsistent motion, blurry, jittery, distorted, watermark, text, letters"
    width:           int  = 704    # LTX-Video landscape default
    height:          int  = 480    # LTX-Video landscape default
    num_frames:      int  = 97     # ~4 seconds at 25fps; must satisfy (n-1)%8==0
    steps:           int  = 20
    guidance_scale:  float = 3.0
    seed:            int  = -1     # -1 = random

class ImageRequest(BaseModel):
    prompt: str
    width:  int = 704
    height: int = 480
    seed:   int = -1


# ── Helpers ──────────────────────────────────────────────────
def validate_num_frames(n: int) -> int:
    """Snap num_frames so that (n-1) % 8 == 0, minimum 9."""
    n = max(9, n)
    remainder = (n - 1) % 8
    if remainder != 0:
        n = n + (8 - remainder)
    return n

def clamp_ltx_resolution(width: int, height: int):
    """
    LTX-Video works best at these resolutions on a T4 GPU with offloading:
      Landscape: 704×480   (16:9 approx)
      Portrait:  480×704   (9:16 approx)
      Square:    512×512
    """
    if width == height:
        return 512, 512
    elif width > height:
        return 704, 480   # landscape
    else:
        return 480, 704   # portrait

def frames_to_mp4_bytes(frames, fps: int = 25) -> bytes:
    """Encode a list of PIL images to MP4 bytes using imageio."""
    import imageio
    import numpy as np

    tmp_path = tempfile.mktemp(suffix=".mp4")
    writer = imageio.get_writer(
        tmp_path, fps=fps, codec="libx264",
        quality=8, macro_block_size=1
    )
    for frame in frames:
        if not isinstance(frame, np.ndarray):
            frame = np.array(frame)
        writer.append_data(frame)
    writer.close()

    with open(tmp_path, "rb") as f:
        data = f.read()
    os.unlink(tmp_path)
    return data


# ── Model loader (background thread) ────────────────────────
def load_model():
    global pipe_video
    print("\n[Loading] LTX-Video from HuggingFace (Lightricks/LTX-Video)...")
    print("          First run downloads ~13 GB — this takes a few minutes ☕")

    pipe_video = LTXPipeline.from_pretrained(
        "Lightricks/LTX-Video",
        torch_dtype=torch.bfloat16,
    )

    # CPU offloading keeps model in RAM and moves layers to GPU as needed.
    # Essential for T4 (15 GB VRAM) with a ~13 GB model.
    pipe_video.enable_model_cpu_offload()

    model_ready.set()
    print("[Ready]   LTX-Video loaded! API is accepting requests.\n")
    print("          ⚠  Each 4-second clip takes ~2–4 min on T4.")
    print("          ⚠  A full 60-second video (10 clips) ≈ 20–40 min.\n")


# ── Routes ───────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":  "ok" if model_ready.is_set() else "loading",
        "model":   "Lightricks/LTX-Video",
        "device":  "cuda" if torch.cuda.is_available() else "cpu",
        "vram_gb": round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1)
                   if torch.cuda.is_available() else "N/A",
    }


@app.post("/generate-video")
def generate_video(req: VideoRequest):
    """
    Generate a short video clip from a text prompt.
    Returns raw MP4 bytes.
    Called by the local Node.js pipeline (VideoGeneratorWithAIVideo_Colab.js).

    Resolution notes:
      Landscape: width=704, height=480
      Portrait:  width=480, height=704
    Frame notes:
      num_frames must satisfy (num_frames - 1) % 8 == 0
      97 frames ≈ 4 seconds at 25 fps
    """
    if not model_ready.is_set():
        raise HTTPException(
            status_code=503,
            detail="Model still loading — retry in a few minutes."
        )

    w, h          = clamp_ltx_resolution(req.width, req.height)
    num_frames    = validate_num_frames(req.num_frames)
    duration_secs = num_frames / 25

    generator = None
    if req.seed >= 0:
        generator = torch.Generator(device="cpu").manual_seed(req.seed)

    print(f"[Gen] {w}x{h} | {num_frames}f (~{duration_secs:.1f}s) | {req.steps} steps")
    print(f"      Prompt: {req.prompt[:80]}...")

    with torch.inference_mode():
        result = pipe_video(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            width=w,
            height=h,
            num_frames=num_frames,
            num_inference_steps=req.steps,
            guidance_scale=req.guidance_scale,
            generator=generator,
        )

    frames = result.frames[0]   # list of PIL Images
    video_bytes = frames_to_mp4_bytes(frames, fps=25)

    print(f"      ✅ Done — {len(video_bytes)/1024/1024:.1f} MB\n")
    return Response(content=video_bytes, media_type="video/mp4")


@app.post("/generate-image")
def generate_image_from_video(req: ImageRequest):
    """
    Generate a single-frame image using LTX-Video (1 frame).
    Useful for thumbnails when no separate image server is running.
    Note: Quality is lower than SDXL-Turbo for static images.
    """
    if not model_ready.is_set():
        raise HTTPException(status_code=503, detail="Model still loading.")

    w, h = clamp_ltx_resolution(req.width, req.height)

    generator = None
    if req.seed >= 0:
        generator = torch.Generator(device="cpu").manual_seed(req.seed)

    with torch.inference_mode():
        result = pipe_video(
            prompt=req.prompt,
            negative_prompt="worst quality, blurry, distorted",
            width=w, height=h,
            num_frames=1,
            num_inference_steps=20,
            guidance_scale=3.0,
            generator=generator,
        )

    frame: Image.Image = result.frames[0][0]
    buf = io.BytesIO()
    frame.save(buf, format="JPEG", quality=90)
    buf.seek(0)
    return Response(content=buf.read(), media_type="image/jpeg")


# ── ngrok tunnel ─────────────────────────────────────────────
# Get a FREE token at: https://dashboard.ngrok.com/get-started/your-authtoken
# Paste it below OR use Colab Secrets (🔑 icon in left sidebar):
#
#   from google.colab import userdata
#   NGROK_TOKEN = userdata.get("NGROK_TOKEN")

NGROK_TOKEN = "3I7yaLgYIGHzv8FZ1Me5cnNKZFf_2buVdeXuhRwXgq5a9siM"   # ← paste your free ngrok token here

if NGROK_TOKEN:
    ngrok.set_auth_token(NGROK_TOKEN)

ngrok.kill()
tunnel     = ngrok.connect(8000)
public_url = tunnel.public_url

print("=" * 60)
print("  ✅  Colab LTX-Video API is LIVE at:")
print(f"      {public_url}")
print()
print("  👉  Copy this into your local .env file:")
print(f"      COLAB_VIDEO_URL={public_url}")
print()
print("  Then run:  node VideoGeneratorWithAIVideo_Colab.js")
print("=" * 60)


# ── Start server in isolated event loop ──────────────────────
def run_server():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="warning")
    server = uvicorn.Server(config)
    loop.run_until_complete(server.serve())

threading.Thread(target=load_model, daemon=True).start()
threading.Thread(target=run_server,  daemon=True).start()

print("\nServer starting... Model loading in background.")
print("(Keep this cell running — do NOT stop it)\n")

import time
while True:
    time.sleep(60)
