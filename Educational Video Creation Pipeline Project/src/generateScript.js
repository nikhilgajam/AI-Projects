import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

export async function generateEducationalScript(topic, tmpDir) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_GENAI_API_KEY is not set in .env");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: process.env.GOOGLE_GENAI_MODEL || "gemini-1.5-pro", 
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    const channelName = process.env.YOUTUBE_CHANNEL_NAME || "our channel";

    const prompt = `
    You are an elite educational content creator, combining the pedagogical brilliance of 3Blue1Brown, Core Dumped, and Fireship.
    Your task is to write a highly detailed, professional educational video script on the topic: "${topic}".
    The target audience ranges from students to working professionals. 

    The video MUST follow this precise narrative structure:
    1. Cold Open Hook (1 slide): Start with a provocative question or mind-blowing fact. NOT a generic intro.
    2. The Problem (1-2 slides): Set up the problem that this topic solves. Make the viewer FEEL the pain point. Use analogies.
    3. Core Concept Introduction (2-3 slides): Introduce the concept with a clear definition and intuitive analogy.
    4. Deep Technical Dive (5-10 slides): The meat. Code, math, step-by-step algorithms, diagrams. Flow logically from simple to complex.
    5. Practical Application (2-3 slides): Real-world usage in industry. Name actual companies, actual systems.
    6. Key Insight / "Aha Moment" (1 slide): Use the "key_insight" scene type. Summarize the most important takeaway.
    7. Recap (1 slide): Use the "recap" scene type to list 3-5 key takeaways.
    8. Call to Action (1 slide): Subscribe + check description for resources. Keep under 10 seconds.

    NARRATION QUALITY RULES:
    - Write in a conversational, enthusiastic but authoritative tone (like a passionate professor, not a textbook).
    - Use rhetorical questions: "But wait, why can't we just...?"
    - Use pattern interrupts: "Here's the thing most people get wrong about this..."
    - Minimum 4-6 sentences per slide narration for depth.
    - Include specific numbers, dates, and facts when relevant.

    SLIDE CONNECTIVITY RULES (CRITICAL):
    - Every slide MUST include a "transition_hook" field (except the last slide) - a 1-sentence teaser at the end of the narration creating curiosity for the next slide.
    - Every slide MUST include a "slide_context_bridge" field (except slide 1) - a short phrase like "Building on the analogy..." describing how it connects to the previous one.
    - The "narration_script" should be structured as: [explain current slide content] + [transition_hook to next slide].

    Output MUST be valid JSON with this structure:
    {
        "topic_category": "systems|algorithms|web|ai_ml|hardware|security|math|programming|devops|general",
        "youtube_title": "Professional, highly clickable title",
        "youtube_description": "Detailed SEO description (excluding chapters/resources, we will add them).",
        "tags": ["education", "computer science", "tutorial"],
        "study_materials": [{"title": "Name of free resource/book/docs", "url": "https://..."}],
        "difficulty_level": "beginner|intermediate|advanced|mixed",
        "estimated_duration_minutes": 8,
        "slides": [
            {
                "slide_number": 1,
                "scene_type": "analogy_visual", 
                "heading": "The Library Problem",
                "narration_script": "Imagine a library with millions of books, but no index... But here's where things get really interesting.",
                "transition_hook": "But here's where things get really interesting.",
                "bullets": ["Millions of records", "Sequential search is O(N)", "Disk I/O is slow"]
            },
            {
                "slide_number": 2,
                "slide_context_bridge": "Building on the library analogy...",
                "scene_type": "concept_intro",
                "heading": "Database Indexes",
                "narration_script": "...",
                "transition_hook": "..."
            }
        ]
    }

    AVAILABLE SCENE TYPES & REQUIRED FIELDS:
    1. "concept_intro": heading, bullets[], narration_script
    2. "definition": term, definition, narration_script
    3. "code_walkthrough": code_snippet, language, highlights[] (array of line numbers/concepts), narration_script
    4. "math_equation": equation, explanation_steps[], narration_script
    5. "step_by_step": title, steps[] (array of strings), narration_script
    6. "comparison_table": title, headers[], rows[][], narration_script
    7. "pros_cons": title, pros[], cons[], narration_script
    8. "big_number": number, label, narration_script
    9. "analogy_visual": heading, bullets[], narration_script
    10. "mermaid_diagram": heading, mermaid_code, narration_script
    11. "key_insight": insight (string), supporting_text (string), narration_script
    12. "timeline": title, events (array of {year, description}), narration_script
    13. "quote": quote (string), author (string), narration_script
    14. "recap": title, points (array of strings), narration_script

    (Note: Do not include visual themes or color accents in the JSON output, they are handled separately).
    `;

    console.log("🧠 Generating deep educational script and visual plan...");
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    if (tmpDir && fs.existsSync(tmpDir)) {
        fs.writeFileSync(path.join(tmpDir, "llm_output_raw.txt"), text);
    }

    const parseJSON = (str) => {
        let jsonText = str.trim().replace(/^```(?:json)?[ \t]*\n/i, '').replace(/\n```$/, '').trim();
        try {
            return JSON.parse(jsonText);
        } catch (e) {
            // Attempt repairs silently
            let repaired = jsonText.replace(/,\s*([\}\]])/g, "$1");
            try {
                return JSON.parse(repaired);
            } catch(e2) {
                let openBraces = (repaired.match(/\{/g) || []).length;
                let closeBraces = (repaired.match(/\}/g) || []).length;
                let openBrackets = (repaired.match(/\[/g) || []).length;
                let closeBrackets = (repaired.match(/\]/g) || []).length;
                
                let bracketRepaired = repaired;
                while(closeBrackets < openBrackets) { bracketRepaired += ']'; closeBrackets++; }
                while(closeBraces < openBraces) { bracketRepaired += '}'; closeBraces++; }
                
                try {
                    return JSON.parse(bracketRepaired);
                } catch(e3) {
                    let trimRepaired = repaired;
                    while (trimRepaired.length > 10) {
                        try {
                            return JSON.parse(trimRepaired);
                        } catch (err) {
                            trimRepaired = trimRepaired.substring(0, trimRepaired.length - 1).trim();
                        }
                    }
                    throw new Error("Failed to repair JSON.");
                }
            }
        }
    };

    try {
        const parsed = parseJSON(text);
        if (tmpDir && fs.existsSync(tmpDir)) {
            fs.writeFileSync(path.join(tmpDir, "script_plan.json"), JSON.stringify(parsed, null, 2));
        }
        return parsed;
    } catch (e) {
        console.warn("Initial parsing and repair failed. Attempting LLM retry for JSON fix...");
        const retryPrompt = `The following text was supposed to be a valid JSON but failed to parse. Please output ONLY the corrected JSON without any markdown formatting or explanations.\n\n${text}`;
        
        try {
            const retryResult = await model.generateContent(retryPrompt);
            const retryText = await retryResult.response.text();
            
            const parsed = parseJSON(retryText);
            if (tmpDir && fs.existsSync(tmpDir)) {
                fs.writeFileSync(path.join(tmpDir, "script_plan.json"), JSON.stringify(parsed, null, 2));
            }
            return parsed;
        } catch(retryErr) {
            console.error("Failed to parse Gemini response as JSON even after LLM retry.");
            throw retryErr;
        }
    }
}
