# Web Data Driven Video Creation Pipeline

A fully automated, AI-powered video generation pipeline that turns any topic into a professional YouTube-ready video. Instead of relying on static slideshows, this project uses **HTML, CSS, JS, and Puppeteer** to render highly dynamic, cinematic **1440p (2K)** video scenes completely from scratch. 

Simply provide a topic, and the system uses Google Gemini to write a script, Edge-TTS to generate voiceovers, and FFmpeg to stitch everything together into a final `.mp4`.

## 🚀 Extreme Performance (The "Holy Trinity" Update)
The rendering engine has been heavily optimized to utilize **maximum hardware efficiency and true multi-processing** while producing buttery-smooth 60 FPS output:
- **True Parallel Multi-Processing:** Slides are batch-processed by launching isolated Chromium instances (up to 5 concurrently). This bypasses Chrome's single-thread compositor limits, chewing through scenes utilizing 100% of your multi-core CPU.
- **FFmpeg Concat Demuxer Optimization:** To skip thousands of useless frame captures, the system only renders the first 2.3 seconds (entrance) and the last 1.0 second (exit) of a slide. The middle duration is dynamically "freeze-framed" natively within FFmpeg.
- **60 FPS Constant Frame Rate (CFR):** Double `requestAnimationFrame` sync guarantees perfect Chrome GPU compositor sync. Outputs are stitched using `-r 60` and `-vsync 1` to output a pristine 60 FPS CFR video with zero player stutter.
- **Ultra-Fast JPEG Pipeline:** The engine captures lightweight JPEG frames instead of heavy PNGs, and utilizes FFmpeg's `-preset ultrafast` flag to slash compression overhead and reduce disk I/O by over 90%.

## 🎨 Massive Variety & Features
- **50 Unique Scene Layouts**: Automatically selects the best layout for the data (e.g., SWOT Grids, Timelines, VS Comparisons, Tier Lists, Code Blocks, Funnels, and more).
- **Cinematic Chart.js Integration**: Beautifully animated data visualizations including Bar, Line, Pie, Doughnut, and Radar charts. Features smart auto-legends, sweeping Bezier curves, and multi-line comparison capabilities natively rendered on a massive 1500x650 canvas.
- **Bulletproof Safety Fallbacks**: If the AI attempts to use a complex layout but forgets the underlying data, the slide router automatically intercepts the error and gracefully falls back to a gorgeous default text layout.
- **50 Visual Themes & 50 Animations**: Every scene gets a unique design aesthetic (e.g., Cyberpunk, Glassmorphism, Tech Circuit) matched with silky smooth CSS keyframe entrance and exit animations.
- **60 FPS & 2K Resolution (1440p)**: Losslessly scaled using hardware device scaling.
- **Smart Background Music**: Drop your favorite no-copyright tracks into `assets/music/` and the system will randomly pick one, loop it to fit the video length, and mix it perfectly behind the edge-tts voiceover.

## 🛠️ Installation

1. **Navigate to the project folder**.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure your `.env` file**:
   Ensure you have your Gemini API key and preferred settings.
   ```env
   GOOGLE_GENAI_API_KEY=your_gemini_api_key_here
   GOOGLE_GENAI_MODEL=gemini-3.1-flash-lite
   
   YOUTUBE_CHANNEL_NAME=Your Channel Name
   EDGE_TTS_VOICE=en-US-AriaNeural
   
   # Music Settings
   BG_MUSIC_SOURCE=local_library
   BG_MUSIC_VOLUME=0.08
   ```

## 🎵 Setting up Background Music (Recommended)
To ensure you never get YouTube copyright strikes, the pipeline relies on a secure local library.
1. Run the script once, and it will automatically generate an `assets/music/` folder.
2. Download your favorite free tracks from the **YouTube Studio Audio Library**.
3. Drop `.mp3` or `.wav` files anywhere inside `assets/music/`.
4. The script will automatically pick a random track, loop it, and mix it into your final video!

*(Note: If you don't add any music to the folder, the system will gracefully fall back to generating a subtle, warm ambient noise pad using FFmpeg).*

## ⚡ Usage

Run the pipeline by providing a topic:
```bash
node index.js "The Future of Artificial Intelligence"
```

You can optionally provide a target duration in seconds:
```bash
node index.js "The History of Rome" 60
```

## 📂 Output Directory
- **`output/`**: Contains your final rendered `.mp4` video and a `.txt` file containing your SEO-optimized YouTube Title, Description, and Tags.
- **`tmp/`**: Used for temporary processing (audio chunks, frames, downloaded clipart). It is safe to clear this folder occasionally.
