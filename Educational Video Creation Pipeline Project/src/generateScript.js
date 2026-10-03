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
    You are an elite educational content creator, combining the pedagogical brilliance of 3Blue1Brown, Fireship, and MIT OpenCourseWare.
    Your task is to write a highly detailed, professional educational video script on the topic: "${topic}".
    The target audience ranges from students to working professionals. 

    The video must follow this precise narrative structure:
    1. The Hook & The Concept (Why does this matter? Introduce the core concept)
    2. Deep Dive & Implementation (Explain the whole thing thoroughly with the needed code, algorithms, and deep mechanics)
    3. Practical Examples & Industry Usage (At the end, show real-world practical examples of how this is used and implemented in actual projects or systems)
    4. Call to Action (The FINAL scene MUST explicitly tell the viewer to "check the video description for free study materials and resources", and then ask them to subscribe to "${channelName}". Keep this wrap-up under 10 seconds.)

    Output MUST be valid JSON with this structure:
    {
        "youtube_title": "Professional, highly clickable title (e.g. 'B-Trees Explained: The Data Structure Behind Databases')",
        "youtube_description": "Detailed SEO description, chapters, and summary. YOU MUST INCLUDE a '📚 Free Study Materials & Resources' section with 3-5 real, accurate, and free external links (like MIT OpenCourseWare, freeCodeCamp, Wikipedia, or trusted GitHub repos) related to the topic so viewers can explore more.",
        "tags": ["education", "computer science", "tutorial"],
        "slides": [
            {
                "slide_number": 1,
                "scene_type": "analogy_visual", 
                "heading": "The Library Problem",
                "narration_script": "Imagine a library with millions of books, but no index. Finding one book would take forever...",
                "bullets": ["Millions of records", "Sequential search is O(N)", "Disk I/O is slow"],
                "color_accent": "#FF6B6B"
            }
        ]
    }

    AVAILABLE SCENE TYPES & REQUIRED FIELDS:
    1. "concept_intro": heading, bullets[], narration_script
       - Standard intro with clean typography and bullet points.
    2. "definition": term, definition, narration_script
       - Giant text for a specific term and its formal definition.
    3. "code_walkthrough": code_snippet, language, highlights[] (array of line numbers or concepts to emphasize), narration_script
       - For showing C programming, algorithms, etc.
    4. "math_equation": equation, explanation_steps[], narration_script
       - Large, beautiful equation display.
    5. "step_by_step": title, steps[] (array of strings), narration_script
       - For algorithms or processes.
    6. "comparison_table": title, headers[], rows[][], narration_script
       - E.g. B-Tree vs BST, Array vs LinkedList.
    7. "pros_cons": title, pros[], cons[], narration_script
       - For trade-offs and expert-level analysis.
    8. "big_number": number, label, narration_script
       - E.g. "O(log N)" or "100x Faster". Can also be used for the final Call to Action.
    9. "analogy_visual": heading, bullets[], narration_script
       - Used for real-world analogies.
    10. "mermaid_diagram": heading, mermaid_code, narration_script
       - A dedicated full-screen graph or flowchart. MUST start with the graph type (e.g., 'graph TD' or 'flowchart LR'). MUST use '\\n' for newlines to properly separate statements, especially for subgraphs. Never write the entire graph on a single line. Do NOT use markdown codeblock backticks inside the string, just the raw Mermaid code.

    RULES:
    - Slide narration MUST be engaging, clear, and perfectly timed with the visual elements.
    - Write highly detailed, comprehensive narration. Each slide's narration_script should be at least 3 to 5 sentences long to ensure in-depth explanations.
    - DO NOT rush. Explain the concepts deeply. Total slides MUST be between 15 to 35 depending on topic complexity to guarantee a video length of 5 to 10+ minutes.
    - Ensure factual correctness and technical depth.
    - Vary the scene_types appropriately to keep visual interest high. Use 'mermaid_diagram' occasionally when a flowchart or architecture graph is necessary.
    - Color accents should use professional, modern tech colors (e.g. #3b82f6, #10b981, #f59e0b, #6366f1).
    `;

    console.log("🧠 Generating deep educational script and visual plan...");
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    if (tmpDir && fs.existsSync(tmpDir)) {
        fs.writeFileSync(path.join(tmpDir, "llm_output_raw.txt"), text);
    }

    let jsonText = text.trim().replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '').trim();
    
    try {
        const parsed = JSON.parse(jsonText);
        if (tmpDir && fs.existsSync(tmpDir)) {
            fs.writeFileSync(path.join(tmpDir, "script_plan.json"), JSON.stringify(parsed, null, 2));
        }
        return parsed;
    } catch (e) {
        // Fallback: The LLM might have output extra characters (like an extra '}') at the end.
        // Try trimming characters from the end one by one until it parses successfully.
        let repairedText = jsonText;
        while (repairedText.length > 10) {
            try {
                const parsed = JSON.parse(repairedText);
                if (tmpDir && fs.existsSync(tmpDir)) {
                    fs.writeFileSync(path.join(tmpDir, "script_plan_repaired.json"), JSON.stringify(parsed, null, 2));
                }
                return parsed;
            } catch (err) {
                // Remove the last character and try again
                repairedText = repairedText.substring(0, repairedText.length - 1).trim();
            }
        }
        console.error("Failed to parse Gemini response as JSON even after trimming.");
        throw e;
    }
}
