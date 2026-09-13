# Technical Specification: Devotional AI Song & Video Creation Pipeline (v3.0)

This document provides a complete, end-to-end technical specification for building an automated AI video creation pipeline tailored for **devotional music, ancient Hindu texts, Stotrams, Mantras, and Keerthanalu** in **Sanskrit, Telugu, and Hindi**. 

Inspired by the client-server architecture of [nikhilgajam/AI-Projects](https://github.com/nikhilgajam/AI-Projects/tree/main/Video%20Creation%20Pipeline%20Project), this pipeline generates custom AI music via a Google Colab GPU backend and pairs it with a single deity image featuring subtle animation (Ken Burns zoom/pan and divine audio spectrum visualizer) to produce production-ready `.mp4` videos.

---

## 1. System Architecture & Workflow

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                              ORCHESTRATION LAYER                                  │
│                      (Local Python Runner / Antigravity Agent)                   │
│                                                                                   │
│  1. User Inputs Stotram Name (e.g., "Shiv Tandav Stotram") & Language             │
│  2. Devotional Brain (Gemini LLM): Fetches Lyrics, Raga & Instrument Prompts      │
│  3. Requests Audio from Colab Server: Generates BOTH Male & Female Versions       │
│  4. Renders Video via FFmpeg: Single Image + Ken Burns Motion + Spectrum + Text   │
│  5. Exports: [Stotram]_Male_Version.mp4 & [Stotram]_Female_Version.mp4           │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
                                          ▼ (HTTP / ngrok)
┌───────────────────────────────────────────────────────────────────────────────────┐
│                              COLAB GPU BACKEND                                    │
│                       (colab_devotional_server.py + ngrok)                        │
│                                                                                   │
│  • FastAPI / Uvicorn server running on Google Colab T4 GPU                        │
│  • Meta MusicGen (AudioCraft) model loaded on CUDA                                │
│  • Endpoint: POST /generate-song (supports prompt, duration, vocal_gender)       │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Capabilities

1. **Tri-Language Support**:
   - **Sanskrit**: Devanagari script, IAST transliteration, Vedic chanting prompts.
   - **Telugu**: Native Telugu script, phonetic transliteration, Carnatic raga mapping (*Raga Mayamalavagowla*, *Raga Hamsadhvani*).
   - **Hindi**: Devanagari script, Hindustani Bhajan style, Harmonium/Sitar accompaniment.
2. **Dual Vocal Output**: Automatically generates both **Male Chanting/Vocals** and **Female Chanting/Vocals** for every track request.
3. **Single Image Motion Graphics**:
   - **Ken Burns Effect**: Smooth, subtle zooming and panning on deity portraits.
   - **Divine Audio Spectrum**: Glowing golden visualizer overlay dynamically reacting to the audio.
   - **Native Script Overlay**: Renders Stotram titles cleanly using Google Noto Devanagari & Telugu fonts.

---

## 3. Component 1: Devotional Brain (`devotional_brain.py`)

This component uses Google Gemini AI to retrieve authentic lyrics and construct music generation prompts tuned for classical Indian ragas and instrumentation.

```python
import os
import json
import google.generativeai as genai

# Configure Gemini API
genai.configure(api_key=os.environ.get("GOOGLE_GENAI_API_KEY"))

DEVOTIONAL_PROMPT_TEMPLATE = """
You are an expert scholar of ancient Hindu scriptures, Sanskrit Stotrams, Telugu Keerthanalu, and Hindi Bhajans.

Target Request: "{stotram_name}"
Target Language: "{language}" (Must be Sanskrit, Telugu, or Hindi)

Provide a JSON output with the following keys:
1. "title_native": The exact title in the native script (Devanagari for Sanskrit/Hindi, Telugu script for Telugu).
2. "title_english": Transliterated English title.
3. "lyrics_native": The first 4-8 key verses in native script.
4. "lyrics_transliterated": Transliteration in English script for pronunciation.
5. "recommended_raga": Classical Indian Raga best suited (e.g., Raga Bhairavi, Raga Darbari, Raga Hamsadhvani).
6. "male_music_prompt": Detailed prompt for Meta MusicGen for MALE vocals/chanting. Include raga, mood, instruments (Veena, Flute, Tanpura, Mridangam, Shankh, Temple Bells), tempo, and vocal style ("deep resonant male Vedic chanting").
7. "female_music_prompt": Detailed prompt for Meta MusicGen for FEMALE vocals/chanting. Include raga, mood, instruments, tempo, and vocal style ("devotional melodic female chanting").

Return ONLY valid JSON.
"""

def get_devotional_data(stotram_name: str, language: str) -> dict:
    model = genai.GenerativeModel('gemini-1.5-flash')
    prompt = DEVOTIONAL_PROMPT_TEMPLATE.format(stotram_name=stotram_name, language=language)
    
    response = model.generate_content(prompt)
    cleaned_json = response.text.strip().removeprefix("```json").removesuffix("```").strip()
    return json.loads(cleaned_json)
```

---

## 4. Component 2: Colab GPU Server (`colab_devotional_server.py`)

Run this code in Google Colab with a **T4 GPU** runtime. It exposes Meta's `MusicGen` via FastAPI and `ngrok`.

```python
import os
import io
import torch
import torchaudio
import uvicorn
import nest_asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from pyngrok import ngrok
from audiocraft.models import MusicGen

nest_asyncio.apply()

app = FastAPI(title="Devotional AI Music Server")

print("Loading Meta MusicGen model onto T4 GPU...")
MODEL_NAME = "facebook/musicgen-medium"  # 'small', 'medium', or 'large'
model = MusicGen.get_pretrained(MODEL_NAME)

class SongRequest(BaseModel):
    prompt: str
    duration: int = 45  # duration in seconds
    vocal_gender: str = "male"  # 'male' or 'female'

@app.post("/generate-song")
async def generate_song(req: SongRequest):
    try:
        full_prompt = f"{req.prompt}, {req.vocal_gender} vocals, sacred devotional music, high fidelity audio"
        print(f"Generating ({req.vocal_gender}): '{full_prompt}' [{req.duration}s]")
        
        model.set_generation_params(duration=req.duration)
        wav_tensors = model.generate([full_prompt])
        
        audio_buf = io.BytesIO()
        sample_rate = model.sample_rate
        torchaudio.save(audio_buf, wav_tensors[0].cpu(), sample_rate, format="wav")
        audio_buf.seek(0)
        
        return Response(content=audio_buf.read(), media_type="audio/wav")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "online", "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "None"}

# Start ngrok tunnel
NGROK_TOKEN = "YOUR_NGROK_AUTH_TOKEN"  # Insert actual token
if NGROK_TOKEN != "YOUR_NGROK_AUTH_TOKEN":
    ngrok.set_auth_token(NGROK_TOKEN)

public_url = ngrok.connect(8000)
print(f"🚀 Devotional Music Server active at: {public_url}")

uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 5. Component 3: Pipeline Runner (`devotional_pipeline_runner.py`)

This local orchestrator manages the entire generation lifecycle and calls FFmpeg to render final videos.

```python
import os
import sys
import subprocess
import requests
from devotional_brain import get_devotional_data

COLAB_API_URL = "https://YOUR_NGROK_SUBDOMAIN.ngrok-free.app"
OUTPUT_DIR = "devotional_outputs"
FONTS_DIR = "fonts"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def fetch_audio_from_colab(prompt: str, duration: int, vocal_gender: str, output_path: str):
    print(f" Requesting {vocal_gender.upper()} vocal track from Colab GPU...")
    url = f"{COLAB_API_URL}/generate-song"
    payload = {"prompt": prompt, "duration": duration, "vocal_gender": vocal_gender}
    
    res = requests.post(url, json=payload, timeout=300)
    if res.status_code == 200:
        with open(output_path, "wb") as f:
            f.write(res.content)
        print(f" Saved audio to {output_path}")
    else:
        raise RuntimeError(f"Server error {res.status_code}: {res.text}")

def render_devotional_video(
    image_path: str,
    audio_path: str,
    output_mp4: str,
    title_text: str,
    duration: int,
    font_path: str = "fonts/NotoSansDevanagari-Bold.ttf"
):
    print(f" Rendering final video with FFmpeg -> {output_mp4}")
    fps = 25
    total_frames = duration * fps
    
    # FFmpeg Filter Graph:
    # 1. Ken Burns slow zoom in
    # 2. Golden audio spectrum overlay at bottom
    # 3. Native script title text overlay
    complex_filter = (
        f"[0:v]zoompan=z='min(zoom+0.001,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={total_frames}:s=1280x720:fps={fps}[bg];"
        f"[1:a]showwaves=s=1280x160:mode=cline:colors=0xFFD700@0.85[fg];"
        f"[bg][fg]overlay=x=0:y=H-h-30[bg_spec];"
        f"[bg_spec]drawtext=fontfile='{font_path}':text='{title_text}':fontcolor=white:fontsize=36:"
        f"box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=50[outv]"
    )
    
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-i", image_path,
        "-i", audio_path,
        "-filter_complex", complex_filter,
        "-map", "[outv]",
        "-map", "1:a",
        "-c:v", "libx264", "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-pix_fmt", "yuv420p",
        output_mp4
    ]
    
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        print(f"FFmpeg Error:\n{result.stderr}")
        raise RuntimeError("FFmpeg rendering failed.")
    print(f" Output Video Ready: {output_mp4}")

def execute_pipeline(stotram_name: str, language: str, image_path: str, duration: int = 45):
    print(f"=== Starting Devotional Video Pipeline for '{stotram_name}' ({language}) ===")
    
    # 1. Get Lyrics & Raga Details via Gemini
    data = get_devotional_data(stotram_name, language)
    title_native = data.get("title_native", stotram_name)
    
    # Select Font based on Language
    font_file = "fonts/NotoSansTelugu-Bold.ttf" if language.lower() == "telugu" else "fonts/NotoSansDevanagari-Bold.ttf"
    
    # 2. Process Male Version
    male_wav = os.path.join(OUTPUT_DIR, f"{stotram_name}_male.wav")
    male_mp4 = os.path.join(OUTPUT_DIR, f"{stotram_name}_Male_Version.mp4")
    fetch_audio_from_colab(data["male_music_prompt"], duration, "male", male_wav)
    render_devotional_video(image_path, male_wav, male_mp4, f"{title_native} (Male Version)", duration, font_path=font_file)
    
    # 3. Process Female Version
    female_wav = os.path.join(OUTPUT_DIR, f"{stotram_name}_female.wav")
    female_mp4 = os.path.join(OUTPUT_DIR, f"{stotram_name}_Female_Version.mp4")
    fetch_audio_from_colab(data["female_music_prompt"], duration, "female", female_wav)
    render_devotional_video(image_path, female_wav, female_mp4, f"{title_native} (Female Version)", duration, font_path=font_file)
    
    print("\n🎉 Pipeline Complete! Created both Male and Female video versions successfully.")

if __name__ == "__main__":
    # Example usage:
    STOTRAM = "Shiv Tandav Stotram"
    LANGUAGE = "Sanskrit"  # 'Sanskrit', 'Telugu', or 'Hindi'
    DEITY_IMAGE = "shiva.jpg"
    
    if os.path.exists(DEITY_IMAGE):
        execute_pipeline(STOTRAM, LANGUAGE, DEITY_IMAGE, duration=30)
    else:
        print(f"Please place a deity image at '{DEITY_IMAGE}' first.")
```

---

## 6. Step-by-Step Setup & Execution

### Step 1: Install Required Noto Fonts
To prevent broken boxes or glyph errors when rendering Sanskrit, Telugu, or Hindi text overlays in FFmpeg:
```bash
mkdir -p fonts
# Download Google Noto Fonts for Devanagari and Telugu
curl -L -o fonts/NotoSansDevanagari-Bold.ttf "https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf"
curl -L -o fonts/NotoSansTelugu-Bold.ttf "https://github.com/google/fonts/raw/main/ofl/notosanstelugu/NotoSansTelugu%5Bwdth%2Cwght%5D.ttf"
```

### Step 2: Launch Colab GPU Backend
1. Open Google Colab and set Runtime -> T4 GPU.
2. Install AudioCraft & Dependencies:
   ```bash
   !pip install git+https://github.com/facebookresearch/audiocraft.git
   !pip install fastapi uvicorn pyngrok nest_asyncio
   ```
3. Run `colab_devotional_server.py` and copy the public `ngrok` URL.

### Step 3: Run Local Pipeline Execution
1. Set environment variable: `export GOOGLE_GENAI_API_KEY="your_api_key"`
2. Set `COLAB_API_URL` in `devotional_pipeline_runner.py`.
3. Run:
   ```bash
   python devotional_pipeline_runner.py
   ```

---

## 7. Deliverables & Output Format

For every track request, the pipeline automatically outputs two finalized videos:
1. `devotional_outputs/[Stotram_Name]_Male_Version.mp4`
2. `devotional_outputs/[Stotram_Name]_Female_Version.mp4`

Both videos feature a high-definition 16:9 or 9:16 portrait render, smooth Ken Burns image panning, golden audio wave spectrum visualization, and native Sanskrit/Telugu/Hindi titles.
