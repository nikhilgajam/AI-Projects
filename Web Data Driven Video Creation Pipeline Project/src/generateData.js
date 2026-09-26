import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { AVAILABLE_THEMES } from "./themes.js";
import { AVAILABLE_ANIMATIONS } from "./animations.js";
import { AVAILABLE_SCENE_TYPES } from "./sceneBuilders.js";

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

    // Determine which themes to offer to Gemini
    const sceneStyle = process.env.SCENE_STYLE || "random";
    let themesForPrompt;
    if (sceneStyle === "random") {
        themesForPrompt = AVAILABLE_THEMES;
    } else if (AVAILABLE_THEMES.includes(sceneStyle)) {
        themesForPrompt = [sceneStyle];
    } else {
        themesForPrompt = AVAILABLE_THEMES;
    }

    const prompt = `
    You are a professional YouTube video script writer, SEO expert, and creative web animation director.
    Create a highly engaging, data-driven, visually STUNNING video script on the topic: "${topic}".
    Your goal is to maximize click-through rate (CTR) and audience retention for a large YouTube audience.

    THIS IS NOT A POWERPOINT PRESENTATION. This is a modern, cinematic web-animated video.
    Each slide is a fully unique HTML/CSS/JS scene with its own visual theme, animations, and layout.
    The video must feel like a premium YouTube explainer — NOT a slideshow.

    Output MUST be valid JSON with the following structure:
    {
        "youtube_title": "A highly clickable, SEO-optimized title (use emotional trigger words, include keywords early)",
        "youtube_description": "An engaging, SEO-optimized description. Include a compelling hook in the first 2 lines, detailed body, call to actions, and hashtags.",
        "tags": ["high_volume_keyword1", "long_tail_keyword2", "niche_keyword3"],
        "slides": [
            {
                "slide_number": 1,
                "slide_type": "default",
                "scene_theme": "neon",
                "color_accent": "#FF6B6B",
                "heading": "Catchy Heading for the slide",
                "bullet_points": ["Short point 1", "Short point 2", "Short point 3"],
                "narration_script": "The exact script the voiceover artist will read for this slide.",
                "clipart_keywords": ["keyword1", "keyword2", "keyword3"],
                "clipart_emojis": ["🤖", "🧠", "💻"],
                "animation_hint": "stagger-left"
            }
        ]
    }

    TITLE, DESCRIPTION, AND TAG RULES:
    - TITLE: Must be highly clickable, ideally under 60 characters, use emotional trigger words (e.g., "Secret", "Genius", "Shocking", "Ultimate", "Why"), and place main keywords at the beginning. Avoid misleading clickbait, but make it irresistible to click.
    - DESCRIPTION: The first 1-2 sentences must be a strong hook since this shows up in YouTube search results. Include a detailed summary of the video content, relevant keywords naturally integrated, and 3-5 highly relevant hashtags at the bottom.
    - TAGS: Provide 15-20 highly relevant tags, mixing broad, high-volume keywords with specific, long-tail phrases to maximize search visibility.

    ─── SCENE THEMES ───
    Each slide MUST have a "scene_theme" field. Pick from: ${JSON.stringify(themesForPrompt)}.
    ${themesForPrompt.length > 1 ? "IMPORTANT: Vary the theme across slides! Do NOT use the same theme for consecutive slides. Each slide should feel visually unique and different from the previous one." : `Use the theme "${themesForPrompt[0]}" for all slides.`}

    ─── COLOR ACCENT ───
    Each slide MUST have a "color_accent" field — a hex color (e.g., "#4DA6FF") that acts as the primary accent for that slide.
    Vary colors across slides for visual diversity. Pick colors that match the theme and content mood.

    ─── ANIMATION HINTS ───
    Each slide MUST have an "animation_hint" field. Pick from: ${JSON.stringify(AVAILABLE_ANIMATIONS)}.
    Vary these across slides for visual interest! Don't repeat the same animation consecutively.

    ─── SLIDE TYPES ───
    Choose the best visual layout for each slide's content. Available types: ${JSON.stringify(AVAILABLE_SCENE_TYPES)}.

    Here are the MOST COMMON slide types and their required data fields:

    1. "default" — heading + bullet points + clipart. Use for most slides.
       Required: heading, bullet_points[], narration_script, clipart_keywords[], clipart_emojis[]

    2. "table" — data table. Use for comparisons, specs, structured data.
       Required: heading, narration_script, table_headers[], table_rows[][]

    3. "chart" — Chart.js chart. Use for trends, rankings, numeric data.
       Required: heading, narration_script, chart_type ("bar"|"line"|"pie"|"doughnut"), chart_labels[], chart_datasets[{label, data[]}]
       IMPORTANT: For "line" charts, ALWAYS try to provide MULTIPLE datasets in the chart_datasets array (e.g. 2 or 3 items in the array, like comparing different companies or metrics) so the graph draws multiple overlapping lines on the same chart!

    4. "image" — AI-generated image + optional bullets.
       Required: heading, narration_script, image_prompt, bullet_points[] (optional)

    5. "big_number" — giant animated statistic. Use for impressive numbers.
       Required: heading, narration_script, big_number (string like "$4.2T"), big_number_label

    6. "quote" — elegant quote card.
       Required: narration_script, quote_text, quote_author

    7. "timeline" — vertical timeline. Use for chronological events.
       Required: heading, narration_script, timeline_items[{year, event}]

    8. "comparison" — side-by-side A vs B.
       Required: heading, narration_script, compare_left_title, compare_left_points[], compare_right_title, compare_right_points[]

    9. "pros_cons" — two columns: pros (green) and cons (red).
       Required: heading, narration_script, pros[], cons[]

    10. "steps" — numbered step-by-step process.
        Required: heading, narration_script, steps[{number, title, description}]

    11. "definition" — large term + definition.
        Required: heading, narration_script, term, definition

    12. "stats_grid" — grid of statistic cards with numbers/labels.
        Required: heading, narration_script, stats[{value, label}]

    13. "funnel" — funnel stages (wide to narrow).
        Required: heading, narration_script, funnel_stages[{label, value}]

    14. "process_flow" — horizontal step-by-step flowchart or pipeline.
        Required: heading, narration_script, process_steps[{label}]

    14. "pyramid" — hierarchy pyramid levels.
        Required: heading, narration_script, pyramid_levels[{label}]

    15. "ranking" — numbered ranking with bars.
        Required: heading, narration_script, rankings[{rank, label, value}]

    16. "before_after" — before/after split.
        Required: heading, narration_script, before_title, before_points[], after_title, after_points[]

    17. "fact_box" — single highlighted fact callout.
        Required: heading, narration_script, fact_text, fact_source

    18. "code_block" — code display.
        Required: heading, narration_script, code_text, code_language

    19. "feature_grid" — 2x2 grid of feature cards.
        Required: heading, narration_script, features[{icon_emoji, title, description}]

    20. "testimonial" — user review/testimonial.
        Required: heading, narration_script, testimonial_text, testimonial_author, testimonial_role

    21. "countdown" — countdown list (5,4,3...).
        Required: heading, narration_script, countdown_items[{number, text}]

    22. "process_flow" — horizontal process steps with arrows.
        Required: heading, narration_script, process_steps[{label}]

    23. "split_text" — left side big heading, right side text.
        Required: narration_script, left_heading, right_text

    24. "word_highlight" — key words/phrases displayed large.
        Required: heading, narration_script, keywords[{word, description}]

    25. "gauge" — circular gauge/meter (0-100).
        Required: heading, narration_script, gauge_value (number 0-100), gauge_label

    26. "progress_bars" — multiple horizontal progress bars.
        Required: heading, narration_script, progress_items[{label, percentage}]

    27. "icon_grid" — emoji/icon grid with labels.
        Required: heading, narration_script, icon_items[{emoji, label}]

    28. "matrix_2x2" — 2x2 decision matrix.
        Required: heading, narration_script, quadrants[{title, items[]}] (exactly 4)

    29. "headline_only" — big centered headline + subtitle.
        Required: narration_script, headline, subtitle

    30. "card_stack" — 3 overlapping cards.
        Required: heading, narration_script, cards[{title, text}]

    31. "multi_column" — 3 columns of content.
        Required: heading, narration_script, columns[{title, points[]}]

    32. "tier_list" — S/A/B/C/D tier ranking.
        Required: heading, narration_script, tiers[{tier_label, items[]}]

    33. "checklist" — check/cross items.
        Required: heading, narration_script, checklist_items[{text, checked: true/false}]

    34. "warning_box" — alert/warning callout.
        Required: heading, narration_script, warning_title, warning_text

    35. "number_line" — horizontal number line.
        Required: heading, narration_script, number_points[{position, label}]

    36. "donut_stats" — CSS donut percentage indicators (max 3).
        Required: heading, narration_script, donut_items[{percentage, label}]

    37. "roadmap" — horizontal milestones.
        Required: heading, narration_script, milestones[{label, description}]

    38. "highlight_text" — paragraph with highlighted phrases.
        Required: heading, narration_script, paragraph, highlights[]

    39. "two_column" — two equal text columns.
        Required: heading, narration_script, left_content, right_content

    40. "profile_card" — person/entity profile.
        Required: heading, narration_script, profile_name, profile_title, profile_description, profile_emoji

    41. "metric_row" — horizontal row of 3-4 metric boxes.
        Required: heading, narration_script, metrics[{value, label, change}]

    42. "swot" — 2x2 SWOT analysis grid.
        Required: heading, narration_script, strengths[], weaknesses[], opportunities[], threats[]

    43. "equation" — math/formula display.
        Required: heading, narration_script, equation_text, equation_description

    44. "poll_results" — horizontal bar poll.
        Required: heading, narration_script, poll_items[{label, percentage}]

    45. "gradient_list" — list with gradient left borders.
        Required: heading, narration_script, gradient_items[{text}]

    46. "logo_showcase" — grid of brand cards.
        Required: heading, narration_script, brands[{name, description}]

    47. "mini_cards" — 4-6 small cards.
        Required: heading, narration_script, mini_cards[{title, text}]

    48. "cta" — call to action closing scene.
        Required: narration_script, cta_title, cta_subtitle, cta_buttons[{text}]

    49. "key_value" — key-value pair list.
        Required: heading, narration_script, pairs[{key, value}]

    50. "map_points" — regional/categorical data.
        Required: heading, narration_script, map_items[{region, value, description}]

    RULES:
    - Use "default" for most slides. Use specialized types ONLY when the content strongly calls for it.
    - Pick the slide type that BEST presents the content — e.g., numbers → big_number or chart, comparisons → comparison or table, processes → steps or process_flow.
    - Always include slide_type, scene_theme, color_accent, animation_hint, and narration_script on every slide.
    - For "default" slides, include bullet_points, clipart_keywords, and clipart_emojis.

    CRITICAL VISUAL-AUDIO ALIGNMENT:
    The visual content (bullet_points, table data, chart data, etc.) MUST match the narration_script. If a specific name, number, or data point is spoken, it MUST appear on screen.

    ${numSlidesInstruction} For default slides, provide 2 to 3 clipart keywords and emojis.

    ${durationInstruction}

    IMPORTANT LAST SLIDE: The very last slide MUST be about the YouTube channel "${channelName}". It MUST include a strong call to action asking viewers to LIKE, SHARE, and SUBSCRIBE. The narration for this slide MUST be approximately 30 seconds long (around 75 words). Use slide_type "default" or "cta" for this slide.
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
