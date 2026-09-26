# Song Creation Pipeline Project

An automated AI video creation pipeline tailored for **devotional music, ancient Hindu texts, Stotrams, Mantras, and Keerthanalu** in **Sanskrit, Telugu, and Hindi**.

This pipeline leverages Google Gemini for generating music prompts and text, a Google Colab GPU backend running Meta's MusicGen for generating instrumental tracks, `edge-tts` for generating vocals, and FFmpeg for mixing and rendering a production-ready `.mp4` video with subtle animations (Ken Burns zoom/pan and audio spectrum).

## Features

- **Tri-Language Support**: Sanskrit, Telugu, and Hindi.
- **AI Devotional Brain**: Uses Google Gemini to generate appropriate lyrics and MusicGen prompts based on the selected language and Stotram name.
- **Dual Vocal Options**: Automatically generate male or female chanting/vocals using `edge-tts`.
- **Automated Video Rendering**: Applies Ken Burns effect to a deity image, an audio spectrum visualization, and native text overlays via FFmpeg.

## Prerequisites

- **Node.js** (v14 or higher)
- **Python 3** (for `edge-tts`)
- **FFmpeg** (managed via `ffmpeg-static` via npm, but ensure your system supports it)
- A **Google Colab** account (to run the GPU backend for music generation)
- An **Ngrok** Auth Token (for tunneling the Colab server)
- A **Google Gemini API Key** (for the AI Brain)

## Setup Instructions

### 1. Local Dependencies

1. Open a terminal and navigate to the project directory.
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Install `edge-tts` globally via pip (required for vocal generation):
   ```bash
   pip install edge-tts
   ```

### 2. Google Colab Backend Setup

The pipeline requires a Google Colab backend to run the heavy AI music generation models (Meta MusicGen) on a GPU.

1. Open [Google Colab](https://colab.research.google.com/) and create a new notebook.
2. Go to **Runtime -> Change runtime type** and select **T4 GPU**.
3. Open `colab_devotional_server.py` from this repository. Read the setup instructions at the top.
4. Copy the code into Colab cells as instructed in the file.
5. In Cell 3, replace the `NGROK_TOKEN` with your free [Ngrok Auth Token](https://dashboard.ngrok.com/get-started/your-authtoken).
6. Run all the cells sequentially. The final cell will output a public Ngrok URL (e.g., `https://xxxx.ngrok-free.app`). Leave this cell running.

### 3. Environment Variables

Create a `.env` file in the root of the project and add the following keys:

```env
# Your Google Gemini API Key
GOOGLE_GENAI_API_KEY="your_gemini_api_key_here"

# The Ngrok URL you copied from the Google Colab terminal
COLAB_API_URL="https://your-ngrok-url-here.ngrok-free.app"

# Optional: Specific Gemini model to use
# GOOGLE_GENAI_MODEL="gemini-3.1-flash-lite"
```

### 4. Font Setup

The video renderer uses specific Google Noto Fonts (Devanagari and Telugu) to ensure native scripts render correctly in the video.

Run the setup script to download these fonts into the `fonts/` directory:

```bash
npm run setup
```

## Usage

1. Ensure you have an image file named `image.jpg` in the root of the project directory. This image will be used as the background deity portrait for the video.
2. Run the pipeline:

```bash
npm start
```

3. Follow the interactive prompts to enter:
   - Stotram Name (e.g., "Shiv Tandav Stotram")
   - Language (Sanskrit, Telugu, or Hindi)
   - Voice Gender (male or female)

4. The pipeline will:
   - Request lyrics and prompts from Gemini.
   - Fetch the AI-generated instrumental audio from the Colab backend.
   - Generate vocals using `edge-tts`.
   - Mix the audio tracks.
   - Render the final `.mp4` video with the image and effects.
5. Once complete, you will find your output files in the `devotional_outputs/` directory.

## Project Structure

- `devotionalPipelineRunner.js` - Main orchestrator script.
- `devotionalBrain.js` - Uses Gemini to fetch Stotram lyrics, transliterations, and music prompts.
- `setupFonts.js` - Helper script to download necessary TrueType fonts.
- `colab_devotional_server.py` - FastAPI backend script for Google Colab to run Meta MusicGen.
- `devotional_outputs/` - Generated final videos, instrumental tracks, and vocal WAVs.
- `fonts/` - Downloaded fonts used by FFmpeg for native text rendering.
