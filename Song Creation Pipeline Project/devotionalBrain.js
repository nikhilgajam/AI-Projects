const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const ai        = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
const modelName = process.env.GOOGLE_GENAI_MODEL || "gemini-3.1-flash-lite";

const DEVOTIONAL_PROMPT_TEMPLATE = `
You are an expert scholar of ancient Hindu scriptures, Sanskrit Stotrams, Telugu Keerthanalu, and Hindi Bhajans.

Target Request: "{stotram_name}"
Target Language: "{language}" (Must be Sanskrit, Telugu, or Hindi)

Provide a JSON output with the following keys:
1. "title_native": The exact title in the native script (Devanagari for Sanskrit/Hindi, Telugu script for Telugu).
2. "title_english": Transliterated English title.
3. "lyrics_native": The first 4-8 key verses in native script.
4. "lyrics_transliterated": Transliteration in English script for pronunciation.
5. "recommended_raga": Classical Indian Raga best suited (e.g., Raga Bhairavi, Raga Darbari, Raga Hamsadhvani).
6. "male_music_prompt": Detailed prompt for Meta MusicGen for MALE vocals/chanting. Include raga, mood, instruments (Veena, Flute, Tanpura, Mridangam, Shankh, Temple Bells), tempo, and vocal style ("deep resonant male Vedic chanting").
7. "female_music_prompt": Detailed prompt for Meta MusicGen for FEMALE vocals/chanting. Include raga, mood, instruments, tempo, and vocal style ("devotional melodic female chanting").

Return ONLY valid JSON.
`;

async function getDevotionalData(stotramName, language) {
    const prompt = DEVOTIONAL_PROMPT_TEMPLATE
        .replace("{stotram_name}", stotramName)
        .replace("{language}", language);

    const res = await ai.models.generateContent({
        model:    modelName,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const responseText = res.text;
    const cleanedJson  = responseText.trim().replace(/^```json/, "").replace(/```$/, "").trim();
    return JSON.parse(cleanedJson);
}

module.exports = { getDevotionalData };
