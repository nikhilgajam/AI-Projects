import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobeStatic?.path) {
    ffmpeg.setFfprobePath(ffprobeStatic.path);
}

const execPromise = util.promisify(exec);
const TEMP_DIR = path.join(process.cwd(), 'tmp');
const SAVE_DIR = path.join(process.cwd(), 'save');

async function ensureDirectory(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
}

function sanitizeFileName(value) {
    return String(value || 'video')
        .replace(/[^a-zA-Z0-9-_ ]/g, '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40) || 'video';
}

function escapeFilterText(value) {
    return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/:/g, '\\:')
        .replace(/\n/g, ' ');
}

async function generateLocalFallbackImage(outputFile, title, index, width, height) {
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    
    const color = 'black';
    
    await new Promise((resolve, reject) => {
        ffmpeg()
            .input(`color=c=${color}:s=${width}x${height}:d=1`)
            .inputOptions(['-f', 'lavfi'])
            .outputOptions(['-frames:v', '1', '-q:v', '2'])
            .save(outputFile)
            .on('end', resolve)
            .on('error', reject);
    });

    return outputFile;
}

async function getWikiImage(topic) {
    try {
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&utf8=&format=json&srlimit=1`);
        const searchData = await searchRes.json();
        if (searchData.query.search.length === 0) return null;
        
        const title = searchData.query.search[0].title;
        const imageRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(title)}`);
        const imageData = await imageRes.json();
        const pages = imageData.query.pages;
        const pageId = Object.keys(pages)[0];
        
        if (pages[pageId] && pages[pageId].original && pages[pageId].original.source) {
            return pages[pageId].original.source;
        }
    } catch(e) {
        // ignore
    }
    return null;
}

async function generateInternetImage(phrase, fallbackWord, outputFile, index, width, height) {
    try {
        let imageUrl = null;
        let finalSource = '';
        // 1. Try Pollinations AI first (Turbo model)
        const prompt = encodeURIComponent(phrase);
        imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=${width}&height=${height}&model=turbo&nologo=true`;
        console.log(`   -> [Attempting] Pollinations AI: ${imageUrl}`);
        
        let response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'image/*,*/*'
            }
        });

        // 2. Try Wikipedia Commons
        if (!response.ok || (await response.clone().arrayBuffer()).byteLength < 5000) {
            console.log(`      [Failed] Pollinations AI. Falling back to Wikipedia for word: ${fallbackWord}`);
            imageUrl = await getWikiImage(fallbackWord);
            if (imageUrl) {
                console.log(`   -> [Attempting] Wikipedia: ${imageUrl}`);
                response = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            }
        } else {
            finalSource = 'Pollinations';
        }
        
        // 3. If no Wikipedia image, fallback to LoremFlickr
        if ((!imageUrl || !response.ok) && finalSource !== 'Pollinations') {
            if (imageUrl) console.log(`      [Failed] Wikipedia.`);
            imageUrl = `https://loremflickr.com/${width}/${height}/${encodeURIComponent(fallbackWord)}?random=${Date.now() + index}`;
            console.log(`   -> [Attempting] LoremFlickr: ${imageUrl}`);
            response = await fetch(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            finalSource = 'LoremFlickr';
        } else if (!finalSource) {
            finalSource = 'Wikipedia';
        }

        if (!response.ok) {
            console.log(`      [Failed] ${finalSource} returned ${response.status}`);
            throw new Error(`API returned ${response.status}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > 5000) {
            console.log(`      [Success] Downloaded image from ${finalSource}!`);
            const tempFile = outputFile + '.temp.jpg';
            await fs.writeFile(tempFile, buffer);
            
            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(tempFile)
                    .videoFilters([
                        `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`
                    ])
                    .outputOptions(['-frames:v', '1', '-q:v', '2'])
                    .save(outputFile)
                    .on('end', async () => {
                        await fs.unlink(tempFile).catch(() => {});
                        resolve();
                    })
                    .on('error', reject);
            });
            return outputFile;
        }
    } catch(e) {
        console.warn(`\n [!] Internet image failed (${e.message.split('\n')[0]}). Using local fallback.`);
    }
    
    return generateLocalFallbackImage(outputFile, phrase, index, width, height);
}

async function getTopicImageSet(topic, keywordPairs, width, height, tempDir) {
    const images = [];

    for (let i = 0; i < keywordPairs.length; i++) {
        const imagePath = path.join(tempDir, `${sanitizeFileName(topic)}_${i}.jpg`);
        const item = keywordPairs[i];
        await generateInternetImage(item.phrase, item.word, imagePath, i, width, height);
        images.push(imagePath);
    }

    return images;
}

// Initialize Gemini SDK per your requirements
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
const modelName = process.env.GOOGLE_GENAI_MODEL || 'gemini-3.1-flash-lite-preview';

/**
 * 1. AI Generation Module (Gemini)
 */
async function generateScript(prompt) {
    const response = await ai.models.generateContent({
        model: modelName,
        contents: [
            {
                role: 'user',
                parts: [{ text: prompt }]
            }
        ],
    });
    // Assuming standard response structure for @google/genai
    return response.text; 
}

/**
 * 2. SQLite Cache Module
 */
async function setupDatabase() {
    const db = await open({
        filename: './trends.db',
        driver: sqlite3.Database
    });
    
    await db.exec(`
        CREATE TABLE IF NOT EXISTS trends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT UNIQUE
        )
    `);
    
    // Seed dummy data if empty
    const count = await db.get('SELECT COUNT(*) as count FROM trends');
    if (count.count === 0) {
        const defaultTrends = ["AI Innovations", "Space Exploration", "Ancient History"];
        for (const t of defaultTrends) {
            await db.run('INSERT INTO trends (topic) VALUES (?)', t);
        }
    }
    return db;
}

/**
 * 3. Text-to-Speech Module (Edge TTS via Child Process)
 */
async function generateFreeAudio(text, outputFile) {
    // Escaping double quotes for shell execution
    const safeText = text.replace(/"/g, '\\"');
    // Using the edge-tts CLI tool (must be installed via pip install edge-tts)
    /*
        English Voices:
        • "en-US-AriaNeural"
        • "en-US-JennyNeural"
        • "en-US-AnaNeural"
        • "en-GB-SoniaNeural" (British)

        Hindi Voices:
        • "hi-IN-SwaraNeural" (Female)
        • "hi-IN-MadhurNeural" (Male)

        Telugu Voices:
        • "te-IN-ShrutiNeural" (Female)
        • "te-IN-MohanNeural" (Male)

        Tamil Voices:
        • "ta-IN-PallaviNeural" (Female)
        • "ta-IN-ValluvarNeural" (Male)
    */
    const voice = process.env.EDGE_TTS_VOICE || 'en-US-ChristopherNeural';
    const command = `edge-tts --text "${safeText}" --voice "${voice}" --write-media "${outputFile}"`;
    await execPromise(command);
    return outputFile;
}

async function getAudioDuration(audioPath) {
    const { stdout } = await execPromise(`"${ffprobeStatic.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
    return parseFloat(stdout);
}

function assembleVideo(audioPath, imagePaths, outputPath, resolution, durationPerImage, audioDuration) {
    return new Promise(async (resolve, reject) => {
        try {
            const command = ffmpeg();
            const N = imagePaths.length;
            const newDurationPerImage = (audioDuration + 0.5 * (N - 1)) / N;
            
            for (const img of imagePaths) {
                command.input(img);
                command.inputOptions(['-loop', '1', '-t', `${newDurationPerImage.toFixed(3)}`]);
            }
            command.input(audioPath);
            
            let filtergraph = '';
            for (let i = 0; i < N; i++) {
                filtergraph += `[${i}:v]scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p[v${i}]; `;
            }

            let lastOut = `[v0]`;
            let currentOffset = newDurationPerImage - 0.5;

            for (let i = 1; i < N; i++) {
                const nextOut = `[x${i}]`;
                filtergraph += `${lastOut}[v${i}]xfade=transition=fade:duration=0.5:offset=${currentOffset.toFixed(3)}${nextOut}; `;
                lastOut = nextOut;
                currentOffset += (newDurationPerImage - 0.5);
            }
            
            filtergraph = filtergraph.trim().replace(/;$/, '');
            
            command.complexFilter(filtergraph, lastOut.replace(/\[|\]/g, ''));
            
            command.outputOptions([
                '-map', `${N}:a`,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-pix_fmt', 'yuv420p',
                '-shortest'
            ])
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Main Generation Loop
 */
async function main() {
    console.log("Welcome to the 100% Free Auto-Video Pipeline (Node.js Edition)");
    const rl = readline.createInterface({ input, output });

    const channelName = process.env.YOUTUBE_CHANNEL_NAME || 'Nikhil Tech';
    const tempDir = await ensureDirectory(TEMP_DIR);
    const saveDir = await ensureDirectory(SAVE_DIR);
    
    // Setup SQLite
    const db = await setupDatabase();

    // 1. Format Selection
    const vFormat = await rl.question("Choose format - [1] Shorts (9:16) [2] Wide (16:9): ");
    const resolution = vFormat === '1' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };

    // 2. Topic Selection
    console.log("\nBrainstorming fresh, trending video categories...");
    const categoryPrompt = `Generate exactly 10 highly engaging, unique, and trending YouTube channel niches or broad topics (e.g. AI Innovations, Deep Sea Mysteries, Ancient Warfare). Make them fresh and different. (Randomization seed: ${Math.random()}). Return only the 10 topics, one on each line, without numbering.`;
    
    const categoriesText = await generateScript(categoryPrompt);
    const dynamicTopics = categoriesText.split('\n')
        .map(t => t.trim().replace(/^[0-9.\- ]+/, '').replace(/["*]/g, ''))
        .filter(t => t.length > 0)
        .slice(0, 10);
        
    // Fallback if AI fails
    if (dynamicTopics.length === 0) {
        dynamicTopics.push("AI Innovations", "Space Exploration", "Ancient History", "Deep Sea Mysteries", "Future of Technology");
    }

    console.log("\n--- Select a Topic Category ---");
    dynamicTopics.forEach((t, i) => console.log(`[${i + 1}] ${t}`));
    console.log(`[0] (Enter a custom topic manually)`);
    
    let selectedTopic = "";
    while(true) {
        const choice = await rl.question("\nEnter a number from above, OR directly type your custom topic: ");
        const idx = parseInt(choice, 10);
        
        if (choice.trim() === '0') {
            selectedTopic = await rl.question("Type your custom topic: ");
            if (selectedTopic.trim()) break;
        } else if (!isNaN(idx) && idx >= 1 && idx <= dynamicTopics.length && idx.toString() === choice.trim()) {
            selectedTopic = dynamicTopics[idx - 1];
            break;
        } else if (choice.trim().length > 0) {
            selectedTopic = choice.trim();
            break;
        }
    }

    // Save custom topics to db if it's new
    await db.run('INSERT OR IGNORE INTO trends (topic) VALUES (?)', selectedTopic);

    console.log(`\nGenerating ideas via Gemini for: ${selectedTopic}...`);
    const prompt = `Suggest 5 concise, highly unique video ideas about ${selectedTopic}. Ensure the ideas are completely different from common tropes. (Randomization seed: ${Math.random()}). Return only the titles.`;
    const ideasText = await generateScript(prompt);
    
    console.log(`\nSelected Themes:\n${ideasText}\n`);
    
    // Naive parsing of ideas for the automation loop
    const topics = ideasText.split('\n').filter(line => line.trim().length > 0);

    // 3. Batch Size
    const numVideosStr = await rl.question("How many videos to create automatically?: ");
    const numVideos = parseInt(numVideosStr, 10) || 1;

    // 4. Zero-Intervention Loop
    console.log(`\nStarting free generation of ${numVideos} videos...`);
    
    // Shuffle topics to ensure we pick unique ones without repeating (unless numVideos > available topics)
    const shuffledTopics = topics.sort(() => 0.5 - Math.random());
    const summary = { success: [], errors: [] };
    const globalStartTime = Date.now();
    
    for (let i = 0; i < numVideos; i++) {
        console.log(`\nGenerating video ${i + 1}/${numVideos}...`);
        const topic = shuffledTopics[i % shuffledTopics.length];
        
        try {
            // A. Script
            console.log(` - Writing script for: ${topic}`);
            const scriptPrompt = `Write a completely unique, highly engaging 60-second YouTube script about "${topic}" without formatting or director notes. Make it fresh, dynamic, and unpredictable. (Randomization seed: ${Math.random()}).`;
            const script = await generateScript(scriptPrompt);
            const finalScript = `${String(script || '').trim()} ${channelName ? `Like, share and subscribe to ${channelName}.` : 'Like, share and subscribe to this channel.'}`;
            
            // Generate keywords for images using Gemini
            console.log(` - Generating detailed image prompts and fallbacks for: ${topic}`);
            const keywordPrompt = `Generate exactly 10 ideas for images related to the topic: "${topic}".
            For each idea, provide a detailed 3-to-4 word visual phrase for AI generation, followed by a single very broad, common noun (like 'planet', 'history', 'person') for a basic image search.
            Format each line exactly like this:
            PHRASE|WORD
            Example:
            dark starry night sky|stars
            Return exactly 10 lines with no other text.`;
            
            const keywordsText = await generateScript(keywordPrompt);
            const generatedKeywords = keywordsText.split('\n')
                .filter(line => line.includes('|'))
                .map(line => {
                    const parts = line.split('|');
                    return {
                        phrase: parts[0].trim(),
                        word: parts[1].trim().replace(/[^a-zA-Z]/g, '')
                    };
                })
                .filter(k => k.word.length > 2)
                .slice(0, 10);
            
            // Fallback if AI fails to generate 10 valid pairs
            while (generatedKeywords.length < 10) {
                generatedKeywords.push({ phrase: `${topic} visually cinematic`, word: topic.split(' ')[0] || 'nature' });
            }
            
            console.log(`   -> Using Instructions:`);
            generatedKeywords.forEach(k => console.log(`      - AI Phrase: "${k.phrase}" | Fallback Word: "${k.word}"`));

            // Generate YouTube Metadata (Title & Description)
            console.log(` - Generating optimized YouTube title and description...`);
            const metaPrompt = `Create a highly engaging, click-worthy YouTube title (max 60 characters) and a detailed, SEO-optimized description with hashtags for a video about "${topic}". The script says: "${finalScript}".
            Return exactly in this format:
            TITLE: <title here>
            DESCRIPTION: <description here>`;
            const metaText = await generateScript(metaPrompt);
            
            let ytTitle = topic;
            let ytDescription = finalScript;
            const titleMatch = metaText.match(/TITLE:\s*(.*)/i);
            const descMatch = metaText.match(/DESCRIPTION:\s*([\s\S]*)/i);
            
            if (titleMatch) ytTitle = titleMatch[1].trim().replace(/["*]/g, '');
            if (descMatch) ytDescription = descMatch[1].trim();

            const safeTitle = sanitizeFileName(ytTitle);
            const outputName = path.join(saveDir, `${safeTitle}.mp4`);
            const descName = path.join(saveDir, `${safeTitle}.txt`);

            // B. Audio
            console.log(` - Generating Edge TTS audio...`);
            const audioPath = path.join(tempDir, `audio_${i}.mp3`);
            await generateFreeAudio(finalScript, audioPath);
            
            const audioDuration = await getAudioDuration(audioPath);
            const durationPerImage = audioDuration / generatedKeywords.length;

            // C. Media
            console.log(` - Downloading free topic images...`);
            const topicImages = await getTopicImageSet(topic, generatedKeywords, resolution.width, resolution.height, tempDir);
            
            // D & E. Assembly and Export
            console.log(` - Assembling video via ffmpeg with transitions...`);
            await assembleVideo(audioPath, topicImages, outputName, resolution, durationPerImage, audioDuration);
            
            // Save Description
            await fs.writeFile(descName, `TITLE: ${ytTitle}\n\nDESCRIPTION:\n${ytDescription}`);
            
            console.log(`[Success] Saved ${outputName}`);
            console.log(`[Success] Saved ${descName}`);
            summary.success.push(`"${ytTitle}" -> ${safeTitle}.mp4`);
            
        } catch (err) {
            console.error(`\n[!] Error generating video for topic "${topic}": ${err.message}`);
            summary.errors.push({ topic, error: err.message });
        }
    }

    const elapsedSeconds = ((Date.now() - globalStartTime) / 1000).toFixed(1);
    const elapsedMinutes = (elapsedSeconds / 60).toFixed(2);

    console.log(`\n======================================`);
    console.log(`          GENERATION SUMMARY          `);
    console.log(`======================================`);
    console.log(`⏱️ Total Time: ${elapsedMinutes} minutes (${elapsedSeconds}s)`);
    console.log(`✅ Success (${summary.success.length}):`);
    summary.success.forEach(t => console.log(`   - ${t}`));
    if (summary.errors.length > 0) {
        console.log(`\n❌ Errors (${summary.errors.length}):`);
        summary.errors.forEach(e => console.log(`   - ${e.topic}: ${e.error}`));
    }
    console.log(`======================================\n`);

    rl.close();
}

main().catch(console.error);
