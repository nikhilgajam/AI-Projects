# 🎓 Deep Educational Video Creation Pipeline

A fully autonomous, AI-driven pipeline specialized in generating deep, high-quality educational videos on Tech, Computer Science, Data Structures, System Design, and Math topics.

This pipeline is inspired by the professional, cinematic visual styles of channels. You simply provide a topic, and the engine handles the scriptwriting, voiceover generation, CSS animation rendering, background music mixing, and final video encoding.

## ✨ Key Features

- **🧠 Deep Educational Structure**: Forces a strict narrative curve: *Hook & Concept -> Deep Dive & Code Implementation -> Practical Industry Examples -> Channel Subscription CTA*.
- **🎥 Cinematic Visuals**: 
  - Edge-to-edge dark cinematic voids.
  - Custom `fluidEntrance` spring physics animations with lens blur.
  - Massive, center-aligned typography and glowing mathematical equations.
  - Beautiful glass-morphism panels for code walkthroughs.
- **🔊 Professional Audio & Mixing**: 
  - Uses `edge-tts` for natural, high-quality AI voiceovers.
  - Automatically mixes ambient background music from your local library (perfectly balanced at ~7% volume beneath the narration).
- **📺 1440p (2K) Output Resolution**: Uses Puppeteer headless rendering at 2.5x scale to guarantee ultra-crisp text and shapes.
- **🔍 SEO & Study Materials**: Automatically generates YouTube video titles, descriptions, tags, and a curated list of *Free Study Material Links* for viewers to explore.
- **🤖 Aggressive Auto-Healing**: Built-in JSON repair algorithms to dynamically recover from any LLM hallucination formatting errors.

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

### 4. Background Music Setup (Optional)
To use the local library background music feature, place your MP3/WAV files in the `assets/music/` directory. The pipeline will randomly select one to seamlessly mix under the voiceover.

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
1. **Script Generation**: Gemini generates a structured scene-by-scene script.
2. **Audio Generation**: Edge-TTS generates voiceovers for each scene.
3. **Video Rendering**: Puppeteer renders the HTML/CSS scenes frame-by-frame and exports them via FFmpeg.
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
> For every single video in the course, provide the exact **Context String** I should feed into my pipeline. The context string should be descriptive enough so my AI scriptwriter knows exactly what technical depth and practical examples to cover.
> 
> Format your output as a simple, copy-pasteable list of strings, like this:
> "[Topic] Basics: What is it and Why does it matter?"
> "Advanced [Topic] Concepts: Trade-offs and Practical Examples"
> "[Topic] Deep Dive: Algorithms, Architecture, and Real-world usage"

## 🖼️ Pro-Tip: Generating Viral Titles & Thumbnails

Once your video is generated, use this prompt in ChatGPT/Gemini to get highly clickable titles and an AI image generation prompt (for Midjourney or DALL-E) to create the perfect YouTube thumbnail!

**Copy and paste this prompt:**
> I have just created a highly professional, deep-dive educational video about **[INSERT VIDEO TOPIC]**. 
> I need to package this video for YouTube so it gets a massive Click-Through Rate (CTR).
> 
> Please provide:
> 1. **3 Viral Title Options:** Curiosity-driven, highly clickable, and under 60 characters.
> 2. **Thumbnail Text:** Max 3-4 words of massive, bold text to put on the thumbnail. (It should complement, NOT repeat, the title).
> 3. **Thumbnail Visual Concept:** Describe the layout, contrasting colors, and focal point.
> 4. **AI Image Prompt:** A highly detailed prompt I can paste into Midjourney or DALL-E to generate the background art. (Use cinematic lighting, dark backgrounds, glowing tech elements, 8k resolution, and a 16:9 aspect ratio).

## 📱 Pro-Tip: Social Media & Community Promo

Use this prompt to generate engaging promotional posts for Twitter/X, LinkedIn, or your YouTube Community Tab to drive traffic to your new video:

**Copy and paste this prompt:**
> I just published a deep-dive educational video on **[INSERT VIDEO TOPIC]**. 
> Please write 3 different promotional posts to drive traffic to this video:
> 1. A short, highly-engaging **Twitter/X Thread** hook (under 280 characters) that teases a mind-blowing fact about the topic.
> 2. A professional **LinkedIn Post** focusing on how understanding this topic is critical for career growth and system design interviews.
> 3. A conversational **YouTube Community Tab Poll** that asks the audience a question related to the topic, and tells them the answer is in the new video.

## 💡 Pro-Tip: Brainstorming Viral Video Series

If you're stuck on what to generate next, use this prompt to build a massive backlog of high-converting video ideas tailored for this exact pipeline:

**Copy and paste this prompt:**
> I run an educational Tech/CS YouTube channel that produces 3Blue1Brown-style animated deep dives. 
> I need to build a backlog of video ideas that have extremely high viral potential.
> 
> Please generate 5 unique **Video Series** ideas (e.g., "The 'Under the Hood' Series", "10-Minute System Design").
> For each series, provide 5 specific video topics that I can feed into my automated pipeline.
> Focus on topics that are highly searched by software engineers, computer science students, and tech enthusiasts.

---
*Built to empower creators to produce high-end educational content at scale.*
