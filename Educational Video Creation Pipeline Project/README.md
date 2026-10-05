# 🎓 Deep Educational Video Creation Pipeline

A fully autonomous, AI-driven pipeline specialized in generating deep, high-quality educational videos on Tech, Computer Science, Data Structures, System Design, and Math topics.

This pipeline is inspired by the professional, cinematic visual styles of channels. You simply provide a topic, and the engine handles the scriptwriting, voiceover generation, CSS animation rendering, background music mixing, and final video encoding.

## ✨ Key Features

- **🧠 Deep Educational Structure**: Forces a strict narrative curve: *Hook & Concept -> Deep Dive & Code Implementation -> Practical Industry Examples -> Key Insights -> Channel Subscription CTA*.
- **🎨 Dynamic Theme Engine**: Automatically classifies your topic into 10 distinct categories (Systems, Algorithms, Web, AI/ML, Hardware, Security, etc.) and applies a curated, cinematic color palette with dynamic animated backgrounds, particle effects, and typography.
- **10 Curated Theme Palettes**: Includes specific aesthetic touches and emoji watermarks like ⚡ (Systems), ⌨️ (Programming), 🧠 (AI), 🌐 (Web), and true black Matrix green (Security).
- **🎥 Cinematic Visuals**: 
  - Staggered multi-phase CSS animations (fluid bouncy entrances, smooth floating elements).
  - Massive, center-aligned typography with glowing text-shadows and beautiful glass-morphism panels.
  - Progress bars, timeline nodes, and contextual "bridge text" connecting slides smoothly.
- **📚 14 Scene Types**: Includes `concept_intro`, `definition`, `code_walkthrough` (with multi-language syntax highlighting), `math_equation`, `step_by_step`, `comparison_table`, `pros_cons`, `big_number`, `mermaid_diagram`, `key_insight`, `timeline`, `quote`, and `recap`.
- **📐 Dynamic Overflow Auto-Scaling**: The Puppeteer renderer evaluates the DOM structure during rendering and dynamically rewrites CSS `@keyframes` to safely scale down massive code snippets or giant tables so they never clip off the screen.
- **🔊 Professional Audio & Mixing**: 
  - Uses `edge-tts` for natural, high-quality AI voiceovers.
  - Automatically mixes ambient background music from your local library (perfectly balanced at ~7% volume beneath the narration).
- **📺 1440p (2K) Output Resolution**: Uses Puppeteer headless rendering at 2.5x scale to guarantee ultra-crisp text and shapes.
- **🔍 SEO & Study Materials**: Automatically generates YouTube video titles, descriptions, tags, and a curated list of *Free Study Material Links*.
- **🤖 Silent Auto-Healing**: Built-in JSON repair algorithms dynamically (and silently) recover from LLM hallucination formatting errors like trailing commas or missing brackets.

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Python** (for `edge-tts`)
  - Install edge-tts: `pip install edge-tts`

### 2. Installation
```bash
# Clone the repository and navigate to the directory
cd "Educational Video Creation Pipeline"

# Install Node dependencies
npm install
```

### 3. Configuration
Copy the provided `.env.example` to `.env` (or create one) and configure your keys:
```env
# Required: Get your key at https://aistudio.google.com/apikeys
GOOGLE_GENAI_API_KEY=your_api_key_here
GOOGLE_GENAI_MODEL=gemini-1.5-pro

# Required: For the automated Call-to-Action slide
YOUTUBE_CHANNEL_NAME="Your Channel Name"

# Background Music
BG_MUSIC_ENABLED=true
BG_MUSIC_SOURCE=local_library
BG_MUSIC_VOLUME=0.065
```

## 🎬 Usage

Run the pipeline by simply passing your desired educational topic as an argument:

```bash
node index.js "B Trees and Database Indexing"
```
```bash
node index.js "Merge Sort Algorithm Explained"
```
```bash
node index.js "System Design: Consistent Hashing"
```

### Pipeline Workflow:
1. **Script Generation**: Gemini classifies the topic, generates a structured scene-by-scene script with deep narration, and includes cohesive transition hooks between slides.
2. **Audio Generation**: Edge-TTS generates voiceovers for each scene.
3. **Video Rendering**: Puppeteer renders the HTML/CSS scenes frame-by-frame utilizing the dynamic `themeEngine`, and exports them via FFmpeg.
4. **Music Mixing**: The final video is stitched together with background music.
5. **Output**: Your final `.mp4` and `_Metadata.txt` are saved to the `output/` directory!

## 🧠 Pro-Tip: Generating Full Courses

If you want to generate an entire YouTube course (e.g., a full System Design or Data Structures course), you can use the following mega-prompt in ChatGPT or Gemini to generate a perfectly formatted list of topics. You can then feed each topic directly into this pipeline!

**Copy and paste this prompt:**
> Act as an elite Computer Science Professor and Professional Course Creator.
> 
> I am building a comprehensive, professional-grade YouTube course on **[INSERT TOPIC HERE]**. I have a fully automated AI video creation pipeline that takes a single "context string" (the video topic) and generates a complete, deep-dive educational video.
> 
> Please provide a complete, meticulously structured curriculum for a full **[INSERT TOPIC HERE]** course (from beginner to expert). 
> 
> For every single video in the course, provide the exact **Context String** I should feed into my pipeline. Format your output as a simple, copy-pasteable list of strings.

## 🎨 Pro-Tip: Generating Professional Thumbnails

To generate highly clickable, professional thumbnails for your videos (perfect for Midjourney or DALL-E 3), you can use the following prompt. Just replace `[INSERT TOPIC HERE]` with the specific topic of your video.

**Copy and paste this prompt:**
> Act as an expert YouTube Thumbnail Designer.
> 
> I am creating a highly technical, deep-dive educational video about **[INSERT TOPIC HERE]**.
> Please generate an image with highlighting words as title not everything.
> 
> The style should be:
> - Cinematic, modern, and highly technical.
> - High contrast (neon colors on dark backgrounds, glassmorphism, 3D elements).
> - Clean composition, leaving space for bold text (usually on the right or left third).
> - Abstract but recognizable representations of the topic (e.g., glowing nodes for systems, floating code blocks for programming, neural network patterns for AI).
> 
> Focus on lighting, composition, and high-end 3D rendering style (Octane Render, Unreal Engine 5 aesthetic).

---
*Built to empower creators to produce high-end educational content at scale.*
