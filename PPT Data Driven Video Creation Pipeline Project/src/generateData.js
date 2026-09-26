import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

export async function generateVideoData(topic, duration, tmpDir) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_GENAI_API_KEY is not set in .env");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: process.env.GOOGLE_GENAI_MODEL || "gemini-3.1-flash-lite",
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    let durationInstruction = "Make the narration engaging and natural for a voiceover. The default optimal length is around 60 seconds (approx 150 words total).";
    let numSlidesInstruction = "Ensure there are between 5 to 8 slides.";

    if (duration && !isNaN(parseInt(duration))) {
        const durSec = parseInt(duration);
        const words = durSec * 2.5;
        durationInstruction = `The user has requested the video to be EXACTLY ${durSec} seconds long. Therefore, the total narration_script across all slides combined MUST be approximately ${words} words long to fit this duration.`;
        
        // Dynamic slide count: ~15 seconds per slide to keep it engaging
        const targetSlides = Math.max(5, Math.ceil(durSec / 15));
        numSlidesInstruction = `Since the video is ${durSec} seconds long, you MUST create exactly ${targetSlides} slides. This ensures the visuals change frequently so the video is not boring. Each slide (except the last one) should cover roughly 15-20 seconds of audio.`;
    }

    const channelName = process.env.YOUTUBE_CHANNEL_NAME || "Our Channel";

    const prompt = `
    You are a professional YouTube video script writer, SEO expert, and presentation expert.
    Create a highly engaging, data-driven presentation script on the topic: "${topic}".
    Your goal is to maximize click-through rate (CTR) and audience retention for a large audience.
    
    Output MUST be valid JSON with the following structure:
    {
        "youtube_title": "A highly clickable, SEO-optimized title (use emotional trigger words, include keywords early)",
        "youtube_description": "An engaging, SEO-optimized description. Include a compelling hook in the first 2 lines, detailed body, call to actions, and hashtags.",
        "tags": ["high_volume_keyword1", "long_tail_keyword2", "niche_keyword3"],
        "slides": [
            {
                "slide_number": 1,
                "slide_type": "default",
                "heading": "Catchy Heading for the slide",
                "bullet_points": ["Short point 1", "Short point 2", "Short point 3"],
                "narration_script": "The exact script the voiceover artist will read for this slide.",
                "clipart_keywords": ["keyword1", "keyword2", "keyword3"],
                "clipart_emojis": ["🤖", "🧠", "💻"]
            }
        ]
    }

    TITLE, DESCRIPTION, AND TAG RULES:
    - TITLE: Must be highly clickable, ideally under 60 characters, use emotional trigger words (e.g., "Secret", "Genius", "Shocking", "Ultimate", "Why"), and place main keywords at the beginning. Avoid misleading clickbait, but make it irresistible to click.
    - DESCRIPTION: The first 1-2 sentences must be a strong hook since this shows up in YouTube search results. Include a detailed summary of the video content, relevant keywords naturally integrated, and 3-5 highly relevant hashtags at the bottom.
    - TAGS: Provide 15-20 highly relevant tags, mixing broad, high-volume keywords with specific, long-tail phrases to maximize search visibility.

    SLIDE TYPES — choose the best visual for each slide's content:

    1. "default" — standard heading + bullet points + clipart. Use this for most slides.

    2. "table" — when comparing items, showing structured data, or listing specs side-by-side.
       Add these fields (alongside heading and narration_script):
       "table_headers": ["Column A", "Column B", "Column C"],
       "table_rows": [["Row1Val1", "Row1Val2", "Row1Val3"], ["Row2Val1", "Row2Val2", "Row2Val3"]]

    3. "chart" — when showing trends, growth, rankings, or numeric comparisons over time or categories.
       Add these fields (alongside heading and narration_script):
       "chart_type": "bar" | "line" | "pie",
       "chart_labels": ["Label1", "Label2", "Label3"],
       "chart_datasets": [
           { "label": "Series Name", "data": [10, 20, 30] }
       ]

    4. "image" — when a real-world image, diagram, or AI-generated visual best illustrates the concept.
       Add these fields (alongside heading, narration_script, and bullet_points):
       "image_prompt": "A detailed description for an AI image generator, e.g. 'a futuristic city skyline at night with neon lights'"

    RULES:
    - ONLY use "table", "chart", or "image" when the content strongly calls for it (e.g., numeric data → chart, comparison → table). Otherwise use "default".
    - For "table" and "chart" slides, you may omit bullet_points and clipart fields.
    - For "image" slides, keep bullet_points (shown below the image) and clipart fields.
    - Always include slide_type on every slide.

    CRITICAL VISUAL-AUDIO ALIGNMENT:
    The "bullet_points" MUST visually highlight the exact key names, statistics, and core data spoken in the "narration_script". If a specific name or data point is spoken, it MUST appear on screen.

    ${numSlidesInstruction} For default slides, provide 2 to 3 clipart keywords and emojis.
    
    ${durationInstruction}
    
    IMPORTANT LAST SLIDE: The very last slide MUST be about the YouTube channel "${channelName}". It MUST include a strong call to action asking viewers to LIKE, SHARE, and SUBSCRIBE. The narration for this slide MUST be approximately 30 seconds long (around 75 words). Use slide_type "default" for this slide.
    `;

    console.log("🧠 Brainstorming and generating script via Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (tmpDir && fs.existsSync(tmpDir)) {
        fs.writeFileSync(path.join(tmpDir, "llm_prompt.txt"), prompt);
        fs.writeFileSync(path.join(tmpDir, "llm_output_raw.txt"), text);
    }
    
    let jsonText = text.trim();
    // Remove markdown formatting if present
    jsonText = jsonText.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();

    try {
        const parsed = JSON.parse(jsonText);
        if (tmpDir && fs.existsSync(tmpDir)) {
            fs.writeFileSync(path.join(tmpDir, "llm_output_parsed.json"), JSON.stringify(parsed, null, 2));
        }
        return parsed;
    } catch (e) {
        // Fallback: robustly extract the first top-level JSON object
        const startIdx = jsonText.indexOf('{');
        if (startIdx !== -1) {
            let openBraces = 0;
            let inString = false;
            let escapeNext = false;
            let endIdx = -1;

            for (let i = startIdx; i < jsonText.length; i++) {
                const char = jsonText[i];
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }
                if (char === '"') {
                    inString = !inString;
                    continue;
                }
                if (!inString) {
                    if (char === '{') {
                        openBraces++;
                    } else if (char === '}') {
                        openBraces--;
                        if (openBraces === 0) {
                            endIdx = i;
                            break;
                        }
                    }
                }
            }

            if (endIdx !== -1) {
                const extracted = jsonText.substring(startIdx, endIdx + 1);
                const parsed = JSON.parse(extracted);
                if (tmpDir && fs.existsSync(tmpDir)) {
                    fs.writeFileSync(path.join(tmpDir, "llm_output_parsed.json"), JSON.stringify(parsed, null, 2));
                }
                return parsed;
            }
        }
        console.error("Failed to parse Gemini response as JSON:");
        console.error(text);
        throw e;
    }
}
