# ============================================================
#  colab_image_server.py
#  ─────────────────────────────────────────────────────────
#  Run this on Google Colab (NOT on your local PC).
#  Your local pipeline calls the URL it produces.
#
#  SETUP STEPS:
#    1. Open https://colab.research.google.com → New notebook
#    2. Runtime → Change runtime type → T4 GPU → Save
#    3. Paste each "CELL N" block below into a separate cell
#    4. Run cells top-to-bottom (Shift+Enter each)
#    5. Copy the printed ngrok URL into your local .env:
#          COLAB_API_URL=https://xxxx.ngrok-free.app
#    6. Run:  node VideoGenerator_Colab.js
# ============================================================


# ── CELL 1 ─── Install packages ─────────────────────────────
# (paste only the lines below into Colab Cell 1)
"""
!pip install -q diffusers transformers accelerate xformers \
    fastapi "uvicorn[standard]" pyngrok Pillow
"""


# ── CELL 2 ─── Verify GPU ───────────────────────────────────
# (paste only the lines below into Colab Cell 2)
"""
import torch
print("CUDA available :", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU            :", torch.cuda.get_device_name(0))
    print("VRAM (GB)      :", round(torch.cuda.get_device_properties(0).total_memory / 1e9, 1))
else:
    print("No GPU! Change runtime → T4 GPU before continuing.")
"""


# ── CELL 3 ─── Full API server ──────────────────────────────
# (paste EVERYTHING below this comment into Colab Cell 3 and run it)
# This cell keeps running — leave it open while you use the pipeline.

import io
import os
import asyncio
import threading

import torch
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from diffusers import AutoPipelineForText2Image
from pyngrok import ngrok
import uvicorn
from PIL import Image

# ── App ─────────────────────────────────────────────────────
app = FastAPI(title="Colab HuggingFace Image API", version="1.0.0")

# ── Globals ─────────────────────────────────────────────────
pipe        = None
model_ready = threading.Event()

# ── Request schema ───────────────────────────────────────────
class ImageRequest(BaseModel):
    prompt: str
    width:  int = 1024
    height: int = 1024
    steps:  int = 1     # SDXL-Turbo works best with 1 step
    seed:   int = -1    # -1 = random each time


# ── Model loader (background thread) ────────────────────────
def load_model():
    global pipe
    print("\n[Loading] SDXL-Turbo from HuggingFace ...")
    print("          First run downloads ~6 GB — grab a coffee ☕")
    pipe = AutoPipelineForText2Image.from_pretrained(
        "stabilityai/sdxl-turbo",
        torch_dtype=torch.float16,
        variant="fp16",
    ).to("cuda")

    # Built-in PyTorch memory saving — no xformers needed
    pipe.enable_attention_slicing()

    model_ready.set()
    print("[Ready]   Model loaded! API is accepting requests.\n")


# ── Routes ───────────────────────────────────────────────────
@app.get("/health")
def health():
    """Used by the local pipeline to confirm Colab is reachable."""
    return {
        "status": "ok" if model_ready.is_set() else "loading",
        "model":  "stabilityai/sdxl-turbo",
        "device": str(next(pipe.unet.parameters()).device) if pipe else "N/A",
    }


@app.post("/generate-image")
def generate_image(req: ImageRequest):
    """
    Generate an image from a text prompt.
    Returns raw JPEG bytes.
    The local Node.js pipeline calls this endpoint.
    """
    if not model_ready.is_set():
        raise HTTPException(
            status_code=503,
            detail="Model still loading — retry in ~60 seconds."
        )

    # Cap resolution so we stay within T4 VRAM (15 GB)
    w = min(req.width,  1024)
    h = min(req.height, 1024)

    # Optional reproducible seed
    generator = None
    if req.seed >= 0:
        generator = torch.Generator(device="cuda").manual_seed(req.seed)

    with torch.inference_mode():
        result = pipe(
            prompt=req.prompt,
            num_inference_steps=req.steps,
            guidance_scale=0.0,     # CFG-free inference for SDXL-Turbo
            width=w,
            height=h,
            generator=generator,
        )

    image: Image.Image = result.images[0]

    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90)
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

ngrok.kill()   # kill any leftover tunnels from previous runs
tunnel     = ngrok.connect(8000)
public_url = tunnel.public_url

print("=" * 60)
print("  ✅  Colab API is LIVE at:")
print(f"      {public_url}")
print()
print("  👉  Copy this line into your local .env file:")
print(f"      COLAB_API_URL={public_url}")
print()
print("  Then run:  node VideoGenerator_Colab.js")
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
import time
while True:
    time.sleep(60)
