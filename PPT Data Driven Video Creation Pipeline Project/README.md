# 📊 Data Driven Video Creation Pipeline

A fully automated Node.js application that runs an end-to-end data-driven presentation video production pipeline.
Google Gemini AI brainstorms the script and **intelligently picks the best visual format per slide** (bullets, table, chart, or AI image), Edge-TTS generates studio-grade voiceovers, `pptxgenjs` builds an animated `.pptx`, and Puppeteer + FFmpeg render a perfect 1080p MP4 — no PowerPoint required.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🧠 **AI Script Generation** | Gemini dynamically writes slide scripts, bullet points, and narration based on your topic |
| 🎨 **Smart Slide Types** | Gemini auto-selects the best visual format per slide: bullets, table, bar/line/pie chart, or AI image |
| 📈 **SEO Metadata** | Generates a click-worthy YouTube title, description with hashtags, and tags — saved to `output/` |
| 🎙️ **Neural Voiceovers** | `edge-tts` generates premium neural voiceovers for each slide — fully configurable voice, rate, pitch, and volume |
| 📊 **PowerPoint Export** | `pptxgenjs` builds a `.pptx` with native tables, charts, embedded images, and audio |
| 🎬 **Cross-Platform Video** | Puppeteer renders HTML slides into frames; FFmpeg stitches them with audio into a 1080p MP4 |
| 🎯 **Duration Control** | Pass a target duration (seconds) and the pipeline adjusts slide count and word count to match |
| 🖼️ **Clipart Support** | Twemoji SVGs or Pollinations AI-generated illustrations per slide |

---

## 🎨 Slide Types

Gemini automatically picks the right visual for each slide. You don't need to configure anything — it decides based on content.

| `slide_type` | When it's used | What it renders |
|---|---|---|
| `default` | Most slides | Heading + bullet points + clipart icons |
| `table` | Comparisons, specs, structured data | Styled table with header row + alternating rows |
| `chart` | Trends, rankings, numeric data over categories | Bar / line / pie chart (Chart.js in video; native pptxgenjs chart in PPT) |
| `image` | Concepts better shown visually | AI-generated image (Pollinations Flux) + optional sub-bullets |

---

## ⚙️ Prerequisites

1. **Node.js v18+** — [Download](https://nodejs.org)
2. **Python + Edge-TTS** — for voiceover generation:
   ```bash
   pip install edge-tts
   ```

---

## 🛠️ Installation

1. Clone or navigate into this project folder.
2. Install Node dependencies (includes `puppeteer`, `fluent-ffmpeg`, `pptxgenjs`):
   ```bash
   npm install
   ```

---

## 🔑 Configuration

Create a `.env` file in the project root. All options are shown below:

```env
# ============================================================
#  Data Driven Video Creation Pipeline Project - Env Variables
# ============================================================

# ----------------------------------------------------------
# Google Gemini API
# Get your key at: https://aistudio.google.com/apikeys
# ----------------------------------------------------------
GOOGLE_GENAI_API_KEY=your_api_key_here

# Gemini model to use for script generation
# Default: gemini-3.1-flash-lite
GOOGLE_GENAI_MODEL=gemini-3.1-flash-lite

# ----------------------------------------------------------
# YouTube / Channel Settings
# ----------------------------------------------------------
YOUTUBE_CHANNEL_NAME=Your Channel Name

# ----------------------------------------------------------
# Edge TTS Voice & Prosody Settings
# Supported voices: https://learn.microsoft.com/azure/ai-services/speech-service/language-support
#
# Popular English voices:
#   en-US-AriaNeural     ← warm, conversational female (recommended)
#   en-US-GuyNeural      ← natural, clear male
#   en-US-JennyNeural    ← friendly female
#   en-US-DavisNeural    ← expressive male
#   en-GB-RyanNeural     ← British male (documentary style)
#   en-GB-SoniaNeural    ← British female
# ----------------------------------------------------------
EDGE_TTS_VOICE=en-US-AriaNeural

# Rate: "-10%" = slower | "+5%" = faster
EDGE_TTS_RATE=-1%

# Pitch: "-5Hz" = deeper | "+2Hz" = higher
EDGE_TTS_PITCH=-2Hz

# Volume: "+0%" = normal | "+10%" = louder
EDGE_TTS_VOLUME=+0%

# ----------------------------------------------------------
# Clipart source (supported: twemoji, pollinations)
#   twemoji      → Twitter emoji SVGs (clean, consistent icons)
#   pollinations → AI-generated JPG illustrations (creative)
# ----------------------------------------------------------
CLIPART_SOURCE=twemoji
```

---

## 🚀 Usage

```bash
# Interactive mode — prompted for topic and duration
node index.js

# Pass topic directly (pipeline uses optimal slide count)
node index.js "The Impact of Quantum Computing"

# Pass topic + target duration in seconds
node index.js "The Impact of Quantum Computing" 120
```

### Pipeline Steps

```
1. 🧠  Gemini generates: slide script, slide_type, bullet points, table/chart/image data, narration
2. 🎙️  edge-tts renders per-slide .mp3 voiceovers | ffprobe measures exact durations
3. 📊  pptxgenjs builds .pptx with native tables, charts, AI images, and embedded audio
4. 📸  Puppeteer renders HTML slides (with Chart.js, CSS tables, base64 images) into PNG frames
5. 🎬  FFmpeg stitches frames + audio into 1080p MP4 clips, then concatenates into final video
```

---

## 📁 Output

All output is saved inside the `output/` directory:

| File | Description |
|---|---|
| `<topic>.mp4` | Final 1080p rendered video |
| `<topic>.pptx` | PowerPoint presentation with tables, charts, and embedded audio |
| `<topic>.txt` | SEO-optimized YouTube title, description, and tags |

Temporary assets (frames, audio clips, clipart) are stored in `tmp/<timestamp>/` and can be safely deleted after the run.

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `@google/generative-ai` | Gemini API client for script generation |
| `dotenv` | Loads `.env` configuration |
| `pptxgenjs` | PowerPoint file creation (tables, charts, images, audio) |
| `puppeteer` | Headless browser — renders HTML slides to PNG frames |
| `fluent-ffmpeg` | FFmpeg wrapper — stitches frames + audio into MP4 |
| `ffmpeg-static` | Bundled FFmpeg binary |
| `ffprobe-static` | Bundled ffprobe binary for audio duration detection |
| `edge-tts` *(Python)* | Neural TTS voiceover generation |

---

## 💡 Prompts

Here are some optimized ChatGPT/Gemini prompts you can use to brainstorm high-performing topics for this pipeline:

### Topic Idea Generation (Broad Audience & SEO)
Use this prompt to generate highly searchable, presentation-ready video concepts:

```text
Act as a YouTube strategist and SEO expert. I want to create educational YouTube videos where I explain complex topics simply using a presentation (PPT). Generate a list of 10 highly searchable, educational video topics designed for a broad, mass-market audience. 

These topics must be highly visual and easy to break down into slide formats (bullet points, charts, comparisons, or steps). 

For each idea, please provide:
1. A catchy, high-CTR YouTube title
2. Primary and secondary SEO keywords
3. A brief 1-2 sentence outline of how the presentation would be structured
4. Why this topic appeals to a mass audience

Just give me the ideas, do not generate the actual script or PPT content yet.
```

### Niche Deep-Dive (Data-Heavy Topics)
Use this prompt to generate detailed, data-centric video concepts tailored for specific niches:

```text
Act as a niche content strategist. I want to create an educational YouTube video that does a deep dive into a data-heavy or highly technical topic using a presentation. Generate a list of 5 specialized video topics that require charts, graphs, and structured data tables to explain effectively.

For each idea, provide:
1. A compelling YouTube title
2. Target audience (who this is for)
3. Key data points or charts that should be featured
4. A brief 1-2 sentence outline
```

### Trend Jacking (Current Events / Tech News)
Use this prompt to generate timely video ideas based on current trends, news, or emerging technologies:

```text
Act as a trend analyst and YouTube strategist. I need to create a rapid-response, presentation-style YouTube video explaining a major current event or recent tech breakthrough. Generate 5 timely video ideas based on recent trends.

For each idea, provide:
1. A high-urgency, click-worthy YouTube title
2. The core trend or news being addressed
3. A breakdown of how to structure the slide content (e.g., timeline, pros/cons, comparison)
4. Why this topic is relevant right now
```

