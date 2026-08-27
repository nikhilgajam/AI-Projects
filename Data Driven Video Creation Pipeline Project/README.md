# 📊 Data Driven Video Creation Pipeline

A fully automated Node.js application that runs an end-to-end data-driven presentation video production pipeline. 
Inspired by the "Automated YouTube Video Generator", this project uses Google Gemini AI to brainstorm slide topics, generates professional voiceovers using Edge-TTS, builds an animated `.pptx`, and seamlessly renders a perfect `FinalVideo.mp4` natively using headless rendering!

## ✨ Features

- **🧠 Dynamic AI Brainstorming:** Queries Google Gemini to dynamically generate slide data, bullet points, and narration scripts based on a given topic.
- **📈 SEO Meta-Data Extraction:** Generates an extremely click-worthy YouTube title and SEO-optimized description with hashtags. Saves them in `output/youtube_metadata.txt`.
- **🎙️ Studio-Grade Voiceovers:** Uses `edge-tts` to generate premium neural voiceovers for each slide.
- **📊 Automated PowerPoint Generation:** Uses `pptxgenjs` to procedurally create a presentation with master slides, texts, and embedded audio timings.
- **🎬 Cinematic Cross-Platform Assembly:** Uses **Puppeteer** and **FFmpeg** to internally capture custom-generated HTML slides and perfectly sync them mathematically with the audio durations, rendering an MP4 entirely without PowerPoint! Works seamlessly on **Windows, macOS, and Linux**.

## ⚙️ Prerequisites

1. **Node.js**: Ensure Node.js (v18+) is installed.
2. **Edge-TTS**: Python library required for voiceovers.
   \`\`\`bash
   pip install edge-tts
   \`\`\`

## 🛠️ Installation

1. Clone or navigate into this project folder.
2. Install the required Node dependencies (this installs `puppeteer` and `fluent-ffmpeg`):
   \`\`\`bash
   npm install
   \`\`\`

## 🔑 Configuration

Create a file named `.env` in the root folder of this project and add your API keys:

\`\`\`env
# Required: Google Gemini API Key
GOOGLE_GENAI_API_KEY=your_api_key_here
\`\`\`

## 🚀 Usage

Execute the pipeline by running the main script. You can either pass a topic directly as an argument, or let the script prompt you interactively:

\`\`\`bash
# Run and get prompted for a topic
node index.js

# Or pass a topic directly
node index.js "The Impact of Quantum Computing"
\`\`\`

### Step-by-step Execution:
1. **Brainstorming:** Gemini builds a slide structure and returns the script.
2. **Audio Generation:** `edge-tts` generates `.mp3` files and `ffprobe` determines duration.
3. **Presentation Generation:** A standard `.pptx` file is compiled for your records.
4. **Cross-Platform Recording:** Puppeteer renders HTML versions of your slides into HD images, and FFmpeg mathematically stitches the exact audio durations perfectly into a highly optimized 1080p MP4.

## 📁 Output

Finished renders are saved inside the `output/` directory:
- `FinalVideo.mp4` (The final recorded video natively rendered!)
- `youtube_metadata.txt` (Your SEO-optimized title and description)
- `Presentation.pptx` (The generated slide deck)
- `clips/` & `audio_files/` (Temporary generation assets)
