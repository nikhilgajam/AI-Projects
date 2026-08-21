# 🚀 Automated YouTube Video Generator

An intelligent, fully automated Node.js application that runs an end-to-end video production pipeline. From brainstorming topics to final `.mp4` assembly, it leverages Google Gemini AI, Edge-TTS, and various image/video generation backends to create stunning, faceless YouTube Shorts and Wide videos—100% free and locally processed.

## ✨ Features

- **🧠 Dynamic AI Brainstorming:** Queries Google Gemini to dynamically generate 10 unique, trending YouTube niches/topics on every run. You can also specify custom topics!
- **📜 Automated Scriptwriting:** Generates highly engaging, unique 60-second YouTube scripts automatically based on your selected topic.
- **🖼️ Intelligent Asset Generation:** 
  - Gemini AI brainstorms precisely distinct, highly cinematic scenes per video.
  - Automatically fetches high-definition images natively via **Pollinations AI (Turbo)**.
  - Safely falls back to **Wikipedia Commons** or local color placeholders if AI rendering fails.
- **🎙️ Studio-Grade Voiceovers:** Uses Microsoft `edge-tts` to generate premium neural voiceovers completely offline. Supports multiple languages and voices (Hindi, Tamil, Telugu, English, etc.).
- **🎬 Cinematic Assembly:** Seamlessly stitches the audio and dynamic images together using `ffmpeg`, complete with perfectly timed `xfade` (crossfade) video transitions.
- **📈 SEO Meta-Data Extraction:** Generates extremely click-worthy YouTube titles and SEO-optimized descriptions with hashtags. Saves them in a ready-to-copy `.txt` file perfectly alongside your rendered `.mp4`.
- **🗃️ Topic Tracking Database:** Uses a local SQLite database (`trends.db`) to ensure the same video topics are not generated twice across sessions.
- **☁️ Colab Integration (Optional):** Want better quality? Run the included Colab python server scripts to generate high-quality Stable Diffusion images or AI videos, then connect them via your `.env` file using the Colab specific Node.js generators.

## ⚙️ Prerequisites

1. **Node.js**: Ensure Node.js (v18+) is installed.
2. **FFmpeg**: Handled automatically via `ffmpeg-static` and `ffprobe-static` npm packages (no system install required!).
3. **Edge-TTS**: A Python library required for the voiceovers.
   ```bash
   pip install edge-tts
   ```

## 🛠️ Installation

1. Clone or download this project folder.
2. Open your terminal inside the project folder.
3. Install the required Node dependencies:
   ```bash
   npm install
   ```

## 🔑 Configuration

Create a file named `.env` in the root folder of this project and add your API keys and configuration settings:

```env
# Required: Google Gemini API Key (Get free from Google AI Studio)
GOOGLE_GENAI_API_KEY=your_api_key_here

# Optional: Your YouTube Channel Name to dynamically inject into scripts
YOUTUBE_CHANNEL_NAME=Your Channel Name

# Optional: URL from the Colab Image/Video servers if running Colab mode
# COLAB_API_URL=https://xxxx.ngrok-free.app 
```

## 🚀 Usage

Simply execute the main script for the default free generation:

```bash
node VideoGenerator.js
```

### ☁️ Using Google Colab for High-Quality Generation
If you want to use HuggingFace models for Image or Video generation via Colab:
1. Upload and run `colab_image_server.py` or `colab_video_server.py` on a Google Colab instance with a T4 GPU.
2. Copy the resulting `ngrok` URL into your `.env` file as `COLAB_API_URL`.
3. Run the corresponding generator:
   - For Colab Images: `node VideoGenerator_Colab.js`
   - For Colab AI Video: `node VideoGeneratorWithAIVideo_Colab.js`

### Step-by-step Execution (when running):
1. **Format Selection:** Choose either Shorts (9:16) or Standard Wide (16:9).
2. **Category Selection:** Pick a number from the 10 dynamically generated trending niches, or type `0` to enter your own custom topic.
3. **Batch Size:** Choose how many completely unique videos you want the engine to mass-produce automatically in a row (e.g. `5`).
4. **Sit back!** The console will provide a live log of the scriptwriting, image generation, audio processing, and rendering.

## 📁 Output

All finished renders are saved inside a newly created `save/` directory located next to the script:
- `10_Mind_Blowing_Space_Facts.mp4` (The final rendered video)
- `10_Mind_Blowing_Space_Facts.txt` (Your SEO-optimized title and description, ready for upload!)
- Temporary files are stored in `tmp/` and automatically cleaned up.

## 🗣️ Changing Voices

By default, the script uses `"en-US-ChristopherNeural"`. 
To use regional voices (like Hindi, Tamil, Telugu), open `VideoGenerator.js`, locate the `generateFreeAudio` function, and replace the voice code.

**Examples:**
- Hindi Female: `"hi-IN-SwaraNeural"`
- Telugu Male: `"te-IN-MohanNeural"`
- Tamil Female: `"ta-IN-PallaviNeural"`

*(Tip: To see all available global voices, run `edge-tts --list-voices` in your terminal).*

## 🛑 License

This script is provided for educational and open-source automation purposes. Please respect API rate limits and copyright policies regarding generated media.

## Thumbnail creation Prompt:

```text
You're a professional youtube short thumbnail creator

Create a HD Youtube Short optimized thumbnail using with the title and right image
And the text shouldn't be at the extreme top and extreme bottom so that users can view
```
