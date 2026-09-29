# Video Compilation Pipeline Project

A fully automated, AI-powered video generation pipeline that turns any topic into a premium, **cinematic documentary-style YouTube video**. This pipeline downloads **real HD stock footage** from Pexels, overlays AI-generated narration with smooth fade transitions, and compiles everything into a high-quality `.mp4` ready for upload.

To ensure a professional look for large audiences, this pipeline uses **pure stock footage and voiceover**—no amateur text overlays, no animations, and no cheesy green-screen subscribe buttons.

## 🎬 How It Works

```
Topic → Gemini AI Script → Stock Video Download → Voiceover → Cinematic Compositing → Final MP4
```

1. **Gemini AI** generates a structured video script with narration, SEO metadata, and highly specific stock video search queries.
2. **Pexels API** downloads matching HD stock footage for each segment (free, no watermark).
3. **Edge-TTS** synthesizes natural-sounding voiceover narration.
4. **FFmpeg** composites everything: trims clips, applies smooth fade-in/out transitions, and syncs audio in high quality (CRF 20).
5. **Background music** is mixed in from your local library or auto-generated ambient pads.

## 🚀 Key Features

- **Cinematic Documentary Style**: Pure HD/4K stock footage with professional voiceover.
- **Auto-Color Grading**: Applies a subtle contrast and saturation boost to all downloaded clips via FFmpeg so the final video looks premium and punchy.
- **Seamless Ping-Pong Looping**: When a stock video is too short, the engine applies a professional "boomerang" effect (playing forward, then reverse) to stretch the footage smoothly without jarring jump cuts.
- **Clean Visuals**: No blocky text overlays or distracting green-screen CTA buttons.
- **Smooth Audio/Video Transitions**: Professional cross-fades (0.25s) between clips, complete with audio fades to prevent popping.
- **AI-Powered Scripts & Dynamic Scaling**: Gemini generates engaging narration. The system dynamically scales segment lengths based on your target duration to handle everything from 60-second shorts to massive 10-minute documentaries perfectly.
- **SEO Optimized**: Auto-generated YouTube titles, descriptions, and tags.
- **Background Music**: Drop tracks in `assets/music/` or let the system generate ambient pads.
- **Zero Cost APIs**: Both Gemini and Pexels APIs are free to use.

---

## 💡 YouTube Documentary Idea Generator Prompt

Stuck on what video to make next? Copy and paste the prompt below into any AI (ChatGPT, Gemini, Claude) to get a fresh batch of highly engaging video ideas. **This prompt is designed to force the AI to use random variables so you get unique, non-repetitive ideas every single time you use it.**

> **Copy & Paste this prompt to your favorite AI:**
> 
> *"You are an expert YouTube strategist. I run a faceless, cinematic documentary channel that uses premium stock footage and voiceovers. Please generate 5 completely unique, highly engaging documentary video ideas. To ensure these are fresh every single time I ask: use a random number generator in your head to pick an unexpected niche (e.g., obscure historical mysteries, fascinating deep-sea phenomena, forgotten tech inventions, bizarre psychology, space anomalies, strange economics, unsolved internet mysteries) that aren't widely covered. For each idea, provide: 1. A click-worthy Title. 2. A 2-sentence hook/summary. 3. A list of 3-4 visual keywords that would be easy to find stock footage for (e.g., 'abandoned factory', 'storm clouds', 'retro computer'). DO NOT give me generic ideas like 'The Future of AI' or 'History of Rome'."*

---

## 🛠️ Installation

1. **Navigate to the project folder**.
2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```
3. **Install Edge-TTS** (Python CLI tool for voiceovers):
   ```bash
   pip install edge-tts
   ```
4. **Configure your `.env` file**:
   ```env
   GOOGLE_GENAI_API_KEY=your_gemini_api_key_here
   PEXELS_API_KEY=your_pexels_api_key_here
   YOUTUBE_CHANNEL_NAME=Your Channel Name
   ```
   - Get a free Gemini API key at: https://aistudio.google.com/apikeys
   - Get a free Pexels API key at: https://www.pexels.com/api/

## 🎵 Setting up Background Music (Recommended)

1. Run the script once — it will auto-create an `assets/music/` folder.
2. Download free tracks from the **YouTube Studio Audio Library**.
3. Drop `.mp3` or `.wav` files anywhere inside `assets/music/`.
4. The script will randomly pick a track, loop it, and mix it into your final video!

*(If no music files are found, the system falls back to a subtle ambient pad generated via FFmpeg.)*

## ⚡ Usage

Run the pipeline by providing a topic:
```bash
node index.js "The Deep Sea Anomalies We Can't Explain"
```

You can optionally provide a target duration in seconds (e.g., 120 seconds):
```bash
node index.js "The Lost City of Cahokia" 120
```

Or run interactively (prompts you for topic and duration):
```bash
node index.js
```

## 📂 Output

- **`output/`**: Contains your final `.mp4` video and a `.txt` file with YouTube Title, Description, and Tags.
- **`tmp/`**: Used for temporary processing (downloaded clips, audio, composited segments). Safe to clear occasionally.

## ⚙️ Configuration

All settings are in the `.env` file:

| Setting | Default | Description |
|---------|---------|-------------|
| `GOOGLE_GENAI_API_KEY` | — | Your Gemini API key |
| `PEXELS_API_KEY` | — | Your Pexels API key (free) |
| `YOUTUBE_CHANNEL_NAME` | Our Channel | Channel name for the narrator's verbal CTA |
| `EDGE_TTS_VOICE` | en-US-AriaNeural | Microsoft Edge neural voice |
| `VIDEO_RESOLUTION` | 1920x1080 | Output video resolution |
| `VIDEO_FPS` | 30 | Output frame rate |
| `BG_MUSIC_SOURCE` | local_library | Music source mode (`local_library`, `auto`, etc.) |
| `BG_MUSIC_VOLUME` | 0.06 | Background music volume (0-1) |

## 🔑 API Keys

| API | Cost | Get Key |
|-----|------|---------|
| Google Gemini | Free | https://aistudio.google.com/apikeys |
| Pexels | Free | https://www.pexels.com/api/ |
