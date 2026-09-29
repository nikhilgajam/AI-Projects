import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

/**
 * Extracts and parses JSON from a string, handling potential markdown formatting or extra text.
 * @param {string} text The raw text response from the LLM.
 * @returns {object} The parsed JSON object.
 */
function extractJSON(text) {
    // 1. Try extracting from markdown code blocks first
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
        try {
            return JSON.parse(match[1]);
        } catch (e) {
            // fall through to bracket matcher
        }
    }

    // 2. Try parsing the raw text directly
    try {
        return JSON.parse(text);
    } catch (e) {
        // 3. Fallback: Stack-based bracket matcher to find the first complete JSON object
        const startIndex = text.indexOf('{');
        if (startIndex !== -1) {
            let openBraces = 0;
            let inString = false;
            let escapeNext = false;

            for (let i = startIndex; i < text.length; i++) {
                const char = text[i];
                
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
                    if (char === '{') openBraces++;
                    if (char === '}') {
                        openBraces--;
                        if (openBraces === 0) {
                            // Reached the closing brace of the root object
                            const jsonString = text.substring(startIndex, i + 1);
                            try {
                                return JSON.parse(jsonString);
                            } catch (err) {
                                throw new Error("Extracted JSON structure is invalid: " + err.message);
                            }
                        }
                    }
                }
            }
        }
        throw new Error("Could not locate a valid JSON object in response.");
    }
}

/**
 * Generates a video script and metadata using Gemini AI.
 * @param {string} topic The main topic for the video.
 * @param {number|null} duration The target duration in seconds (optional).
 * @param {string} tmpDir Directory to save intermediate debug files.
 * @returns {Promise<object>} Parsed video data JSON.
 */
export async function generateVideoData(topic, duration, tmpDir) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_GENAI_API_KEY is not set in .env");
    }

    const channelName = process.env.YOUTUBE_CHANNEL_NAME || "Our Channel";
    
    // Calculate duration logic (135 words per minute is typical for Edge-TTS Aria at -1%)
    const wordsPerSecond = 2.3;
    const targetDuration = (duration && !isNaN(parseInt(duration))) ? parseInt(duration) : 60;
    const totalWords = Math.round(targetDuration * wordsPerSecond);
    
    // DYNAMIC SEGMENT SCALING:
    // If we use 12s segments for a 5-minute video, it requires 25 JSON segments. 
    // Generating 25 JSON blocks takes the AI a massive amount of time and can hit token limits.
    // Instead, we increase the length of each clip for longer videos to keep the segment count reasonable.
    let avgSegmentLength = 12; // default for short videos
    if (targetDuration > 120) avgSegmentLength = 16;
    if (targetDuration > 240) avgSegmentLength = 22; // 4+ mins
    if (targetDuration > 400) avgSegmentLength = 30; // 6+ mins

    const segmentCount = Math.max(4, Math.round(targetDuration / avgSegmentLength)); 
    const wordsPerSegment = Math.round(totalWords / segmentCount);

    const prompt = `
You are an expert YouTube scriptwriter and premium documentary video producer. I need you to create a structured script for a highly professional video about "${topic}".

IMPORTANT: MATCHING VISUAL CONTEXT & ERA
This video will be compiled using REAL STOCK FOOTAGE from Pexels. You must carefully consider the ERA and TONE of the topic when writing the \`video_search_queries\`:
- 🏛️ HISTORICAL/OLD topics (e.g., Rome, 1920s, ancient mysteries): You MUST append keywords like "vintage", "retro", "black and white", "ancient ruins", "historical", or "old architecture" to your queries so the modern stock footage looks appropriate for the past.
- 🚀 FUTURE/MODERN topics (e.g., AI, space tech, cyberpunk): Use keywords like "futuristic", "modern technology", "neon", "cyber", "advanced".
- 🌿 NATURE/SCIENCE topics: Use "cinematic macro", "4k landscape", "drone nature".
- Always use short, descriptive visual phrases (e.g., "vintage clock ticking", "black and white old city", "futuristic neon server").

CRITICAL: STRICT DURATION & WORD COUNT ENFORCEMENT
AI generators often write scripts that are way too short, resulting in videos that don't meet the target duration. You MUST fix this by writing detailed, in-depth paragraphs.
- Target Video Duration: ~${targetDuration} seconds
- Required Total Word Count: AT LEAST ${totalWords} words
- Number of Segments: Exactly ${segmentCount} segments
- Words Per Segment: AT LEAST ${wordsPerSegment} words per segment. Do NOT summarize. Expand on the details, add rich storytelling, and ensure the script is long enough.
- The final segment MUST be a natural, verbal call-to-action (CTA) by the narrator (e.g., "If you found this insightful, subscribe to ${channelName}..."). Provide B-roll queries that fit a cinematic outro (e.g., "sunset landscape").

JSON OUTPUT SCHEMA:
You must respond with ONLY a valid JSON object matching the following structure:
{
    "youtube_title": "SEO-optimized clickable title",
    "youtube_description": "Engaging description with hooks and hashtags",
    "tags": ["keyword1", "keyword2", "keyword3"],
    "segments": [
        {
            "segment_number": 1,
            "narration_script": "What the voiceover artist reads for this segment (MUST BE AT LEAST ${wordsPerSegment} WORDS)",
            "video_search_queries": ["query1", "query2", "query3"] // 2-3 specific visual search terms tailored to the era/topic
        }
    ]
}

ADDITIONAL RULES:
- Ensure the title and description use emotional triggers and are optimized for CTR.
- Make the B-roll search queries highly concrete. Avoid abstract concepts; focus on what can be physically filmed.
- Do NOT include markdown code blocks (like \`\`\`json) in your response, just output the raw JSON object.
`;

    // Ensure tmp directory exists
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Save prompt to tmp folder
    fs.writeFileSync(path.join(tmpDir, 'llm_prompt.txt'), prompt.trim());

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: process.env.GOOGLE_GENAI_MODEL || "gemini-3.1-flash-lite",
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    try {
        console.log(`🧠 Brainstorming and writing ${segmentCount} segments via Gemini...`);
        console.log(`   (This requires the AI to write ~${totalWords} words. It may take 30-60 seconds for long videos. Please wait...)`);
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Save raw output
        fs.writeFileSync(path.join(tmpDir, 'llm_output_raw.txt'), responseText);

        // Parse JSON
        const parsedData = extractJSON(responseText);

        // Save parsed JSON
        fs.writeFileSync(path.join(tmpDir, 'llm_output_parsed.json'), JSON.stringify(parsedData, null, 2));

        return parsedData;
    } catch (error) {
        console.error("Error generating or parsing video data:", error);
        throw error;
    }
}
