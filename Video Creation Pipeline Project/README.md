# 🚀 Automated YouTube Video Generator

An intelligent, fully automated Node.js application that runs an end-to-end video production pipeline. From brainstorming topics to final `.mp4` assembly, it leverages the Gemini AI, Edge-TTS, and Pollinations AI to create stunning, faceless YouTube Shorts and Wide videos—100% free and locally processed.

## ✨ Features

- **🧠 Dynamic AI Brainstorming:** Queries Google Gemini to dynamically generate 10 unique, trending YouTube niches/topics on every run. You can also specify custom topics!
- **📜 Automated Scriptwriting:** Generates highly engaging, unique 60-second YouTube scripts automatically based on your selected topic.
- **🖼️ Intelligent Asset Generation:** 
  - Gemini AI brainstorms exactly 10 distinct, highly cinematic scenes per video.
  - Automatically fetches high-definition images natively via **Pollinations AI (Turbo)**.
  - Safely falls back to **Wikipedia Commons** or **LoremFlickr** if AI rendering fails.
- **🎙️ Studio-Grade Voiceovers:** Uses Microsoft `edge-tts` to generate premium neural voiceovers completely offline. Supports multiple languages and voices (Hindi, Tamil, Telugu, English, etc.).
- **🎬 Cinematic Assembly:** Seamlessly stitches the audio and 10 dynamic images together using `ffmpeg`, complete with perfectly timed `xfade` (crossfade) video transitions.
- **📈 SEO Meta-Data Extraction:** Generates extremely click-worthy YouTube titles and SEO-optimized descriptions with hashtags. Saves them in a ready-to-copy `.txt` file perfectly alongside your rendered `.mp4`.

## ⚙️ Prerequisites

1. **Node.js**: Ensure Node.js (v18+) is installed.
2. **FFmpeg**: Must be installed and accessible globally in your system's PATH.
3. **Edge-TTS**: A Python library required for the voiceovers.
   ```bash
   pip install edge-tts
   ```

## 🛠️ Installation

1. Clone or download this project folder.
2. Open your terminal inside the project folder.
3. Install the required Node dependencies:
   ```bash
   npm install @google/genai fluent-ffmpeg sqlite3 sqlite
   ```

## 🔑 Configuration

You must set up your Google Gemini API key as an environment variable before running the script:

**Windows (PowerShell):**
```powershell
$env:GOOGLE_GENAI_API_KEY="your_api_key_here"
```
*(You can get a free API key from Google AI Studio).*

**YouTube Channel Name (Optional):**
You can dynamically inject your channel name into the scripts:
```powershell
$env:YOUTUBE_CHANNEL_NAME="Your Channel Name"
```

## 🚀 Usage

Simply execute the main script:

```bash
node .\VideoGenerator.js
```

**Step-by-step Execution:**
1. **Format Selection:** Choose either Shorts (9:16) or Standard Wide (16:9).
2. **Category Selection:** Pick a number from the 10 dynamically generated trending niches, or type `0` to enter your own custom topic.
3. **Batch Size:** Choose how many completely unique videos you want the engine to mass-produce automatically in a row (e.g. `5`).
4. **Sit back!** The console will provide a live log of the scriptwriting, image generation, audio processing, and rendering.

## 📁 Output

All finished renders are saved inside a newly created `save/` directory located next to the script:
- `10_Mind_Blowing_Space_Facts.mp4` (The final rendered video)
- `10_Mind_Blowing_Space_Facts.txt` (Your SEO-optimized title and description, ready for upload!)

## 🗣️ Changing Voices

By default, the script uses `"en-US-ChristopherNeural"`. 
To use regional voices (like Hindi, Tamil, Telugu), open `VideoGenerator.js`, locate the `generateFreeAudio` function (around line 210), and replace the voice code.

**Examples:**
- Hindi Female: `"hi-IN-SwaraNeural"`
- Telugu Male: `"te-IN-MohanNeural"`
- Tamil Female: `"ta-IN-PallaviNeural"`

*(Tip: To see all available global voices, run `edge-tts --list-voices` in your terminal).*

## 🛑 License

This script is provided for educational and open-source automation purposes. Please respect API rate limits and copyright policies regarding generated media.


## Thumbnail creation Prompt:

```
You're a professional youtube short thumbnail creator


TITLE: 
DESCRIPTION:


Create a HD Youtube optimized thumbnail using with the title and right image
```
