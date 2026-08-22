/**
 * VideoGenerator_Custom.js
 * ─────────────────────────────────────────────────────────────
 * AI-powered YouTube video pipeline using Google Colab SDXL-Turbo
 * tailored for user-specified theme and duration.
 */

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

async function generateColabImage(prompt, outputFile, width, height) {
    const colabUrl = (process.env.COLAB_API_URL || '').replace(/\/$/, '');
    if (!colabUrl) throw new Error('COLAB_API_URL not set in .env');

    const snap = (n) => Math.max(512, Math.round(n / 64) * 64);
    let w, h;
    if (width >= height) {
        w = 1024;
        h = snap((height / width) * 1024);
    } else {
        h = 1024;
        w = snap((width / height) * 1024);
    }

    console.log(`   -> [Colab SDXL-Turbo] ${w}x${h} — "${prompt.slice(0, 70)}..."`);

    const response = await fetch(`${colabUrl}/generate-image`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ prompt, width: w, height: h, steps: 1, seed: -1 }),
        signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`Colab API ${response.status}: ${errText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000) throw new Error('Colab returned empty/invalid image');

    await fs.writeFile(outputFile, buffer);
    console.log(`      [Success] Colab image saved (${(buffer.length / 1024).toFixed(1)} KB)`);
    return outputFile;
}
async function generateThumbnailPrompt(ytTitle, ytDescription, formatLabel) {
    const prompt = `You are a professional YouTube ${formatLabel} thumbnail creator.

TITLE: ${ytTitle}
DESCRIPTION: ${ytDescription.slice(0, 350)}

Write ONLY a single detailed AI image generation prompt for the thumbnail background.
Requirements:
- Cinematic composition, high contrast, vibrant eye-catching colors
- Clear emotional focal point that relates to the topic
- Professional studio-quality lighting (dramatic, volumetric, or golden hour)
- Ultra HD, photorealistic, 8K quality
- Emotionally compelling — makes the viewer stop scrolling and click
- Do NOT include any text, words, letters, titles, or watermarks in the scene
- Just describe the visual scene with rich detail

Return ONLY the image prompt. No explanation, no extra text.`;

    try {
        const result = await generateScript(prompt);
        if (result?.trim().length > 15) return result.trim();
    } catch {}
    return `${ytTitle} — dramatic cinematic close-up, ultra HD 8K, vibrant high-contrast colors, professional dramatic lighting, photorealistic, eye-catching`;
}

async function generateInternetImage(phrase, fallbackWord, outputFile, index, width, height) {
    if (process.env.COLAB_API_URL) {
        try {
            return await generateColabImage(phrase, outputFile, width, height);
        } catch (e) {
            console.warn(`      [Colab Failed] ${e.message.split('\n')[0]}. Falling back to internet sources.`);
        }
    }

    try {
        let imageUrl = null;
        let finalSource = '';

        const prompt = encodeURIComponent(phrase);
        imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=${width}&height=${height}&model=turbo&nologo=true`;
        console.log(`   -> [Attempting] Pollinations AI: ${imageUrl}`);
        
        let response = await fetch(imageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*,*/*' }
        });

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

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
const modelName = process.env.GOOGLE_GENAI_MODEL || 'gemini-3.1-flash-lite-preview';

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
    return response.text; 
}

function parseVtt(vttString) {
    const lines = vttString.split(/\r?\n/);
    const cues = [];
    let currentCue = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line === 'WEBVTT') continue;

        if (line.includes('-->')) {
            const parts = line.split('-->');
            const startStr = parts[0].trim();
            const endStr = parts[1].trim();
            
            const parseTime = (timeStr) => {
                const match = timeStr.match(/(?:(\d+):)?(\d+):(\d+)[.,](\d+)/);
                if (!match) return 0;
                return (parseInt(match[1]||0) * 3600) + (parseInt(match[2]) * 60) + parseInt(match[3]) + (parseInt(match[4].padEnd(3, '0').slice(0,3)) / 1000);
            };

            currentCue = {
                start: parseTime(startStr),
                end: parseTime(endStr),
                text: ""
            };
            cues.push(currentCue);
        } else if (currentCue && !line.match(/^\d+$/)) {
            currentCue.text += (currentCue.text ? " " : "") + line;
        }
    }
    return cues;
}

function calculateImageTimes(cues, segments, audioDuration) {
    const imageTimes = [0];
    const N = segments.length;
    if (N <= 1) return imageTimes;

    let vttTextLength = cues.reduce((sum, cue) => sum + (cue.text ? cue.text.length : 0), 0);
    let scriptTextLength = segments.reduce((sum, seg) => sum + seg.length, 0);
    const ratio = scriptTextLength > 0 ? (vttTextLength / scriptTextLength) : 1;

    let currentLength = 0;
    let currentImageIndex = 1;
    let targetLength = segments[0].length * ratio;
    
    // Calculate a dynamic minimum gap to prevent fast flipping, e.g. 60% of average duration
    const avgDuration = audioDuration / N;
    const minGap = Math.max(0.5, avgDuration * 0.6);

    for (let i = 0; i < cues.length; i++) {
        const cue = cues[i];
        const cueLength = cue.text ? cue.text.length : 0;
        const previousLength = currentLength;
        currentLength += cueLength;
        
        while (currentImageIndex < N && currentLength >= targetLength) {
            let fraction = 0;
            if (cueLength > 0) {
                fraction = (targetLength - previousLength) / cueLength;
                fraction = Math.max(0, Math.min(1, fraction));
            }
            let t = cue.start + fraction * (cue.end - cue.start);
            
            if (t < imageTimes[currentImageIndex - 1] + minGap) {
                t = imageTimes[currentImageIndex - 1] + minGap;
            }
            imageTimes.push(t);
            targetLength += segments[currentImageIndex].length * ratio;
            currentImageIndex++;
        }
    }
    
    while (imageTimes.length < N) {
        let t = imageTimes[imageTimes.length - 1] + minGap;
        if (t > audioDuration - 0.6) {
            t = imageTimes[imageTimes.length - 1] + 0.6;
        }
        imageTimes.push(t);
    }
    
    return imageTimes;
}

async function generateFreeAudio(text, outputFile) {
    const voice  = process.env.EDGE_TTS_VOICE  || 'en-US-AriaNeural';
    const rate   = process.env.EDGE_TTS_RATE   || '-5%';
    const pitch  = process.env.EDGE_TTS_PITCH  || '-2Hz';
    const volume = process.env.EDGE_TTS_VOLUME || '+0%';

    const tempTextFile = outputFile + '.txt';
    const tempVttFile = outputFile + '.vtt';
    await fs.writeFile(tempTextFile, text, 'utf8');

    const command = `edge-tts -f "${tempTextFile}" --voice "${voice}" --rate="${rate}" --pitch="${pitch}" --volume="${volume}" --write-media "${outputFile}" --write-subtitles "${tempVttFile}"`;
    try {
        await execPromise(command);
    } finally {
        await fs.unlink(tempTextFile).catch(() => {});
    }
    
    let vttContent = "";
    try {
        vttContent = await fs.readFile(tempVttFile, 'utf8');
        await fs.unlink(tempVttFile).catch(() => {});
    } catch(e) {}
    
    return { audioPath: outputFile, vtt: vttContent };
}

async function getAudioDuration(audioPath) {
    const { stdout } = await execPromise(`"${ffprobeStatic.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`);
    return parseFloat(stdout);
}

function assembleVideo(audioPath, imagePaths, outputPath, resolution, imageTimes, audioDuration) {
    return new Promise(async (resolve, reject) => {
        try {
            const command = ffmpeg();
            const N = imagePaths.length;
            
            for (let i = 0; i < N; i++) {
                command.input(imagePaths[i]);
                
                let duration_i;
                if (i === 0) {
                    duration_i = (N > 1) ? imageTimes[1] : audioDuration;
                } else if (i < N - 1) {
                    duration_i = imageTimes[i+1] - imageTimes[i] + 0.5;
                } else {
                    duration_i = audioDuration - imageTimes[i] + 0.5;
                }
                
                command.inputOptions(['-loop', '1', '-framerate', '30', '-t', `${duration_i.toFixed(3)}`]);
            }
            command.input(audioPath);
            
            let filtergraph = '';
            for (let i = 0; i < N; i++) {
                filtergraph += `[${i}:v]scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p[v${i}]; `;
            }

            let lastOut = `[v0]`;

            for (let i = 1; i < N; i++) {
                const nextOut = `[x${i}]`;
                const offset = imageTimes[i] - 0.5;
                filtergraph += `${lastOut}[v${i}]xfade=transition=fade:duration=0.5:offset=${offset.toFixed(3)}${nextOut}; `;
                lastOut = nextOut;
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

async function main() {
    console.log("Welcome to the Custom Video Generator Pipeline");
    const rl = readline.createInterface({ input, output });

    const channelName = process.env.YOUTUBE_CHANNEL_NAME || 'Nikhil Tech';
    const tempDir = await ensureDirectory(TEMP_DIR);
    const saveDir = await ensureDirectory(SAVE_DIR);

    if (process.env.COLAB_API_URL) {
        const colabUrl = process.env.COLAB_API_URL.replace(/\/$/, '');
        console.log(`\n[Colab] Checking connection to: ${colabUrl}`);
        try {
            const healthRes = await fetch(`${colabUrl}/health`, {
                signal: AbortSignal.timeout(10_000),
                headers: { 'ngrok-skip-browser-warning': 'true' },
            });

            const health = await healthRes.json();
            if (health.status === 'loading') {
                console.log('[Colab] ⚠  Model is still loading on Colab. First image may take ~60s.');
            } else {
                console.log(`[Colab] ✅ Connected! Model: ${health.model} | Device: ${health.device}`);
            }
        } catch (e) {
            console.warn(`[Colab] ⚠  Could not reach Colab API (${e.message}). Will fall back to internet images.`);
        }
    } else {
        console.log('[Colab] ℹ  COLAB_API_URL not set. Using Pollinations/Wikipedia/LoremFlickr for images.');
    }

    // 1. Format Selection
    const vFormat = await rl.question("\nChoose format - [1] Shorts (9:16) [2] Regular/Wide (16:9): ");
    const resolution = vFormat === '1' ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
    const formatLabel = vFormat === '1' ? 'Short' : 'Regular';

    // 2. Duration
    const durationStr = await rl.question("Enter estimated video duration in seconds (e.g., 60): ");
    const duration = parseInt(durationStr, 10) || 60;

    // 3. Theme / Idea
    const selectedTheme = await rl.question("Enter the idea or main theme of the video: ");
    if (!selectedTheme.trim()) {
        console.log("Theme is required. Exiting.");
        process.exit(1);
    }

    const globalStartTime = Date.now();
    console.log(`\nStarting video generation for theme: "${selectedTheme}"...`);

    try {
        // A. Script
        console.log(` - Writing script...`);
        // A rough rule of thumb: ~2.5 words per second
        const wordCount = Math.round(duration * 2.5);
        const scriptPrompt = `Write a completely unique, highly engaging YouTube script about "${selectedTheme}".
The script should take exactly ${duration} seconds to read at a normal, engaging pace (approximately ${wordCount} words).
No formatting, no markdown, no director notes, no sound effects. Just the spoken words.
Make the hook incredible. Make it fast-paced, dynamic, and unpredictable.
Speak naturally, as a passionate storyteller. Keep the focus entirely on "${selectedTheme}".`;
        
        const script = await generateScript(scriptPrompt);
        const finalScript = `${String(script || '').trim()} ${channelName ? `Like, share and subscribe to ${channelName}.` : 'Like, share and subscribe to this channel.'}`;
        
        // Image generation keywords
        // User requested to lower the image count by ~5 per minute, so roughly 15 images per minute (1 image every 4 seconds).
        const requestedImageCount = Math.max(8, Math.round(duration / 4.0));
        
        // Split the script explicitly into text segments to guarantee chronological alignment
        const tempSegments = [];
        const charsPerSegment = Math.ceil(finalScript.length / requestedImageCount);
        let currentIdx = 0;
        for (let i = 0; i < requestedImageCount; i++) {
            let nextIdx = currentIdx + charsPerSegment;
            if (nextIdx < finalScript.length) {
                while(nextIdx < finalScript.length && finalScript[nextIdx] !== ' ' && finalScript[nextIdx] !== '.') {
                    nextIdx++;
                }
            } else {
                nextIdx = finalScript.length;
            }
            tempSegments.push(finalScript.slice(currentIdx, nextIdx).trim());
            currentIdx = nextIdx;
            if (currentIdx >= finalScript.length) break;
        }
        const textSegments = tempSegments.filter(s => s.length > 0);
        const imageCount = textSegments.length;

        console.log(` - Generating ${imageCount} synchronized AI image prompts keeping strictly to the theme "${selectedTheme}"...`);
        
        const segmentsText = textSegments.map((seg, idx) => `Segment ${idx + 1}: ${seg}`).join('\n');
        
        const keywordPrompt = `Here are ${imageCount} chronological segments of a voiceover script for a YouTube video about "${selectedTheme}":
---
${segmentsText}
---

For EVERY single segment, generate a visual scene that perfectly matches what the narrator is saying at that EXACT moment AND strictly adheres to the core theme "${selectedTheme}". Do not generate random disconnected images. Every image must clearly relate to the main theme.

For each of the ${imageCount} segments provide:
1. A DETAILED AI image generation prompt (20–40 words) — highly specific visualization, cinematic composition, precise lighting, mood, vibrant colors, ultra HD quality, visually stunning.
2. A single broad fallback noun related to the theme (e.g. 'space', 'technology', 'nature').

Format each line EXACTLY like this (nothing else, no numbering, no prefix):
PROMPT|WORD

Example format:
dramatic close-up of a glowing neural network brain with electric blue circuits on dark background, cinematic lighting, ultra HD, 8k|technology
vast ancient Roman colosseum at golden hour with crowds, epic wide angle, warm sunlight, photorealistic, cinematic|history

Return EXACTLY ${imageCount} lines, one for each segment in chronological order.`;

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
            .slice(0, imageCount);
        
        while (generatedKeywords.length < imageCount) {
            generatedKeywords.push({ phrase: `${selectedTheme} cinematic ultra HD dramatic lighting professional visually stunning`, word: selectedTheme.split(' ')[0] || 'visual' });
        }
        
        console.log(`   -> Using Instructions:`);
        generatedKeywords.forEach(k => console.log(`      - AI Phrase: "${k.phrase}"\n      - Fallback: "${k.word}"\n`));

        // Generate YouTube Metadata
        console.log(` - Generating optimized YouTube title and description...`);
        const metaPrompt = `Create a highly engaging, click-worthy YouTube title (max 60 characters) and a detailed, SEO-optimized description with hashtags for a video about "${selectedTheme}". The video script is: "${finalScript}".
Make sure the Title and Description are heavily optimized for the YouTube algorithm to gain huge views.
Return exactly in this format:
TITLE: <title here>
DESCRIPTION: <description here>`;
        
        const metaText = await generateScript(metaPrompt);
        
        let ytTitle = selectedTheme;
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
        const audioPath = path.join(tempDir, `custom_audio_${Date.now()}.mp3`);
        const { vtt } = await generateFreeAudio(finalScript, audioPath);
        
        const audioDuration = await getAudioDuration(audioPath);
        const cues = parseVtt(vtt);
        const imageTimes = calculateImageTimes(cues, textSegments, audioDuration);

        // C. Media
        console.log(` - Generating AI images via Colab (or internet fallback)...`);
        const topicImages = await getTopicImageSet(selectedTheme, generatedKeywords, resolution.width, resolution.height, tempDir);
        
        // D. Assembly
        console.log(` - Assembling video via ffmpeg with transitions...`);
        await assembleVideo(audioPath, topicImages, outputName, resolution, imageTimes, audioDuration);
        
        // E. Thumbnail Prompt
        const thumbPrompt = await generateThumbnailPrompt(ytTitle, ytDescription, formatLabel);
        
        // Save Description
        await fs.writeFile(descName, `TITLE: ${ytTitle}\n\nDESCRIPTION:\n${ytDescription}\n\nTHUMBNAIL PROMPT:\n${thumbPrompt}`);
        
        console.log(`\n[Success] Video generated successfully!`);
        console.log(`[File] Video: ${outputName}`);
        console.log(`[File] Metadata: ${descName}`);

    } catch (err) {
        console.error(`\n[!] Error generating video: ${err.message}`);
    }

    const elapsedSeconds = ((Date.now() - globalStartTime) / 1000).toFixed(1);
    const elapsedMinutes = (elapsedSeconds / 60).toFixed(2);
    console.log(`⏱️ Total Time: ${elapsedMinutes} minutes (${elapsedSeconds}s)`);

    rl.close();
}

main().catch(console.error);
