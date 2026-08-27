import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

export async function generateVideoData(topic, duration) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_GENAI_API_KEY is not set in .env");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite-preview",
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
    You are a professional YouTube video script writer and presentation expert.
    Create a highly engaging, data-driven presentation script on the topic: "${topic}".
    
    Output MUST be valid JSON with the following structure:
    {
        "youtube_title": "A highly clickable, SEO-optimized title",
        "youtube_description": "An engaging, SEO-optimized description with hashtags",
        "tags": ["tag1", "tag2", "tag3"],
        "slides": [
            {
                "slide_number": 1,
                "heading": "Catchy Heading for the slide",
                "bullet_points": ["Short point 1", "Short point 2", "Short point 3"],
                "narration_script": "The exact script the voiceover artist will read for this slide.",
                "clipart_keywords": ["keyword1", "keyword2", "keyword3"],
                "clipart_emojis": ["🤖", "🧠", "💻"]
            }
        ]
    }
    
    CRITICAL VISUAL-AUDIO ALIGNMENT:
    To keep the video interesting, the "bullet_points" MUST visually highlight the exact key names, statistics, and core data that the "narration_script" is talking about. The audio should elaborate on the bullet points, but if a specific name or data point is spoken, it MUST appear in the bullet points on screen.

    ${numSlidesInstruction} Provide 2 to 3 clipart keywords and emojis per slide.
    
    ${durationInstruction}
    
    IMPORTANT LAST SLIDE: The very last slide MUST be about the YouTube channel "${channelName}". It MUST include a strong call to action asking the viewers to LIKE, SHARE, and SUBSCRIBE to the channel. The narration for this specific last slide MUST be approximately 30 seconds long (around 75 words).
    `;

    console.log("🧠 Brainstorming and generating script via Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    let jsonText = text.trim();
    // Remove markdown formatting if present
    jsonText = jsonText.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();

    try {
        return JSON.parse(jsonText);
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
                return JSON.parse(extracted);
            }
        }
        console.error("Failed to parse Gemini response as JSON:");
        console.error(text);
        throw e;
    }
}
