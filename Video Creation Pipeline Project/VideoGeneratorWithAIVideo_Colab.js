/**
 * VideoGeneratorWithAIVideo_Colab.js
 * ─────────────────────────────────────────────────────────────
 * Full AI video pipeline: each scene is a real LTX-Video AI clip,
 * not a static image slideshow.
 *
 * SETUP:
 *   1. Run colab_video_server.py on Google Colab (T4 GPU, free)
 *   2. Add to your .env:
 *        COLAB_VIDEO_URL=https://xxxx.ngrok-free.app   ← LTX-Video server
 *        COLAB_API_URL=https://yyyy.ngrok-free.app     ← SDXL image server (for thumbnails, optional)
 *   3. Run:  node VideoGeneratorWithAIVideo_Colab.js
 *
 * PIPELINE:
 *   Gemini Script → Edge TTS Audio → LTX-Video Clips (×10) → ffmpeg Concat → Thumbnail
 *
 * FALLBACK CHAIN (per clip):
 *   Colab LTX-Video clip  →  still image (Colab/Pollinations/Wikipedia) → black frame
 *
 * VIDEO SPEED NOTE:
 *   LTX-Video on free Colab T4 ≈ 2–4 min per 4-second clip.
 *   10 clips for a 60-second video ≈ 20–40 minutes total.
 *
 * ENV VARIABLES:
 *   COLAB_VIDEO_URL   LTX-Video server URL (required for AI video)
 *   COLAB_API_URL     SDXL-Turbo image server URL (optional, for thumbnails)
 *   VIDEO_NUM_CLIPS   Number of AI video clips per video (default: 10)
 *   EDGE_TTS_VOICE / RATE / PITCH / VOLUME
 *   GOOGLE_GENAI_API_KEY / GOOGLE_GENAI_MODEL
 *   YOUTUBE_CHANNEL_NAME
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
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

if (ffmpegPath)         ffmpeg.setFfmpegPath(ffmpegPath);
if (ffprobeStatic?.path) ffmpeg.setFfprobePath(ffprobeStatic.path);

const execPromise  = util.promisify(exec);
const TEMP_DIR     = path.join(process.cwd(), 'tmp');
const SAVE_DIR     = path.join(process.cwd(), 'save');
const VIDEO_FPS    = 25;
const NUM_CLIPS    = parseInt(process.env.VIDEO_NUM_CLIPS || '10', 10);

// ── Utility ──────────────────────────────────────────────────────────────────

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

/** Snap num_frames so (num_frames - 1) % 8 === 0, minimum 9. */
function snapFrames(n) {
    n = Math.max(9, Math.round(n));
    const rem = (n - 1) % 8;
    return rem === 0 ? n : n + (8 - rem);
}

/** Black frame image fallback */
async function generateLocalFallbackImage(outputFile, _title, _index, width, height) {
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    await new Promise((resolve, reject) => {
        ffmpeg()
            .input(`color=c=black:s=${width}x${height}:d=1`)
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
        const s = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topic)}&utf8=&format=json&srlimit=1`);
        const sd = await s.json();
        if (!sd.query.search.length) return null;
        const title = sd.query.search[0].title;
        const ir = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${encodeURIComponent(title)}`);
        const id = await ir.json();
        const page = Object.values(id.query.pages)[0];
        return page?.original?.source || null;
    } catch { return null; }
}

// ── Colab Image API (SDXL-Turbo — for thumbnails & still fallbacks) ──────────

async function generateColabImage(prompt, outputFile, width, height) {
    const colabUrl = (process.env.COLAB_API_URL || '').replace(/\/$/, '');
    if (!colabUrl) throw new Error('COLAB_API_URL not set in .env');

    // Aspect-ratio-aware scaling within SDXL-Turbo's T4 VRAM limits
    const snap = (n) => Math.max(512, Math.round(n / 64) * 64);
    let w, h;
    if (width >= height) { w = 1024; h = snap((height / width) * 1024); }
    else                  { h = 1024; w = snap((width / height) * 1024); }

    console.log(`   -> [Colab SDXL] ${w}x${h} — "${prompt.slice(0, 60)}..."`);

    const res = await fetch(`${colabUrl}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ prompt, width: w, height: h, steps: 1, seed: -1 }),
        signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) throw new Error(`SDXL API ${res.status}: ${await res.text().catch(() => res.statusText)}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) throw new Error('SDXL returned empty image');
    await fs.writeFile(outputFile, buffer);
    console.log(`      [Success] Image saved (${(buffer.length / 1024).toFixed(1)} KB)`);
    return outputFile;
}

/** Fallback still image — Pollinations → Wikipedia → LoremFlickr → black */
async function generateFallbackImage(phrase, fallbackWord, outputFile, index, width, height) {
    if (process.env.COLAB_API_URL) {
        try { return await generateColabImage(phrase, outputFile, width, height); } catch {}
    }
    try {
        const prompt = encodeURIComponent(phrase);
        let url = `https://image.pollinations.ai/prompt/${prompt}?width=${width}&height=${height}&model=turbo&nologo=true`;
        let res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok || (await res.clone().arrayBuffer()).byteLength < 5000) {
            const wikiUrl = await getWikiImage(fallbackWord);
            if (wikiUrl) res = await fetch(wikiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        }
        if (!res.ok) {
            url = `https://loremflickr.com/${width}/${height}/${encodeURIComponent(fallbackWord)}?random=${Date.now() + index}`;
            res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        }
        if (res.ok) {
            const buf = Buffer.from(await res.arrayBuffer());
            if (buf.length > 5000) {
                await fs.writeFile(outputFile, buf);
                return outputFile;
            }
        }
    } catch {}
    return generateLocalFallbackImage(outputFile, phrase, index, width, height);
}

// ── Colab Video API (LTX-Video) ───────────────────────────────────────────────

/**
 * Call the Colab LTX-Video API to generate one video clip.
 * Returns path to saved .mp4 clip.
 */
async function generateColabVideoClip(prompt, outputFile, width, height, durationSeconds) {
    const videoUrl = (process.env.COLAB_VIDEO_URL || '').replace(/\/$/, '');
    if (!videoUrl) throw new Error('COLAB_VIDEO_URL not set in .env');

    // Clamp to LTX-Video's supported resolutions on T4
    let w, h;
    if (width >= height) { w = 704; h = 480; }   // landscape
    else                  { w = 480; h = 704; }   // portrait

    // Calculate frames: (num_frames - 1) % 8 === 0, at VIDEO_FPS fps
    const targetFrames = Math.round(durationSeconds * VIDEO_FPS);
    const num_frames   = snapFrames(targetFrames);
    const actualSecs   = (num_frames / VIDEO_FPS).toFixed(1);

    console.log(`   -> [Colab LTX-Video] ${w}x${h} | ${num_frames}f (~${actualSecs}s) | "${prompt.slice(0, 65)}..."`);

    const res = await fetch(`${videoUrl}/generate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
            prompt,
            negative_prompt: 'worst quality, inconsistent motion, blurry, jittery, distorted, watermark, text, letters, static',
            width: w, height: h,
            num_frames, steps: 20, guidance_scale: 3.0, seed: -1,
        }),
        signal: AbortSignal.timeout(360_000),   // 6-minute timeout per clip
    });

    if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        throw new Error(`LTX-Video API ${res.status}: ${err}`);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) throw new Error('LTX-Video returned empty video');

    await fs.writeFile(outputFile, buffer);
    console.log(`      [Success] Video clip saved (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
    return outputFile;
}

/** Convert a still image to a short video clip using ffmpeg */
async function imageToVideoClip(imagePath, outputClipPath, durationSeconds, resolution) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(imagePath)
            .inputOptions(['-loop', '1', '-t', `${durationSeconds.toFixed(3)}`])
            .videoFilters([
                `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,` +
                `pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p`
            ])
            .outputOptions(['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', `${VIDEO_FPS}`])
            .save(outputClipPath)
            .on('end', resolve)
            .on('error', reject);
    });
}

/**
 * Generate all AI video clips for a video.
 * Falls back to still image → clip if LTX-Video fails.
 */
async function generateSceneClips(topic, scenePrompts, resolution, durationPerClip, tempDir, videoIndex) {
    const clips = [];
    const total = scenePrompts.length;

    for (let i = 0; i < total; i++) {
        const item     = scenePrompts[i];
        const clipPath = path.join(tempDir, `clip_${videoIndex}_${i}.mp4`);
        console.log(`\n   [Clip ${i + 1}/${total}]`);

        try {
            // Primary: LTX-Video AI clip
            await generateColabVideoClip(item.phrase, clipPath, resolution.width, resolution.height, durationPerClip);
        } catch (e) {
            console.warn(`      [LTX Failed] ${e.message.split('\n')[0]}`);
            console.warn(`      [Fallback]   Generating still image → video clip...`);
            try {
                const imgPath = path.join(tempDir, `img_fallback_${videoIndex}_${i}.jpg`);
                await generateFallbackImage(item.phrase, item.word, imgPath, i, resolution.width, resolution.height);
                await imageToVideoClip(imgPath, clipPath, durationPerClip, resolution);
                await fs.unlink(imgPath).catch(() => {});
                console.log(`      [Fallback OK] Still image clip used for scene ${i + 1}`);
            } catch (e2) {
                console.warn(`      [All Failed]  Using black frame for scene ${i + 1}`);
                const blackPath = path.join(tempDir, `black_${videoIndex}_${i}.jpg`);
                await generateLocalFallbackImage(blackPath, '', i, resolution.width, resolution.height);
                await imageToVideoClip(blackPath, clipPath, durationPerClip, resolution);
                await fs.unlink(blackPath).catch(() => {});
            }
        }
        clips.push(clipPath);
    }
    return clips;
}

// ── Video Assembly ────────────────────────────────────────────────────────────

/** Concatenate AI video clips and mix in the audio track */
async function assembleAIVideo(clipPaths, audioPath, outputPath, resolution) {
    const concatFile = path.join(TEMP_DIR, `concat_${Date.now()}.txt`);

    // Write ffmpeg concat list (forward slashes required on Windows for concat demuxer)
    const listContent = clipPaths
        .map(p => `file '${p.replace(/\\/g, '/').replace(/'/g, "\\'")}'`)
        .join('\n');
    await fs.writeFile(concatFile, listContent, 'utf8');

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatFile)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .input(audioPath)
            .videoFilters([
                `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,` +
                `pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2:color=black,format=yuv420p`
            ])
            .outputOptions([
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-c:v', 'libx264',
                '-c:a', 'aac',
                '-b:a', '192k',
                '-r',   `${VIDEO_FPS}`,
                '-shortest',
            ])
            .save(outputPath)
            .on('end', async () => {
                await fs.unlink(concatFile).catch(() => {});
                resolve(outputPath);
            })
            .on('error', (err) => reject(err));
    });
}

// ── Thumbnail (reused from VideoGenerator_Colab.js) ───────────────────────────

async function generateThumbnail(ytTitle, ytDescription, resolution, saveDir, safeTitle) {
    console.log(` - Generating YouTube thumbnail...`);
    const format = resolution.width > resolution.height ? 'Regular' : 'Short';

    const thumbGenPrompt = `You're a professional YouTube ${format} thumbnail creator.

TITLE: ${ytTitle}
DESCRIPTION: ${ytDescription.slice(0, 400)}

Write ONLY a single detailed AI image generation prompt (no extra text) for the thumbnail background.
The prompt should be: cinematic, high contrast, vibrant, eye-catching, professional lighting, ultra HD.
Do NOT include any text, titles, or words in the image description — just the visual scene.`;

    let visualPrompt = `${ytTitle} cinematic ultra HD professional dramatic lighting vibrant`;
    try {
        const gp = await generateScript(thumbGenPrompt);
        if (gp?.trim().length > 10) visualPrompt = gp.trim();
    } catch {}

    const thumbBgPath = path.join(saveDir, `${safeTitle}_thumb_bg.jpg`);

    // Try video server's /generate-image first, then SDXL image server, then fallback
    let thumbGenerated = false;
    if (process.env.COLAB_VIDEO_URL) {
        try {
            const videoUrl = (process.env.COLAB_VIDEO_URL || '').replace(/\/$/, '');
            const snap = (n) => Math.max(512, Math.round(n / 64) * 64);
            let w = resolution.width >= resolution.height ? 1024 : snap((resolution.width / resolution.height) * 1024);
            let h = resolution.width >= resolution.height ? snap((resolution.height / resolution.width) * 1024) : 1024;
            const res = await fetch(`${videoUrl}/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ prompt: visualPrompt, width: w, height: h, seed: -1 }),
                signal: AbortSignal.timeout(120_000),
            });
            if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                if (buf.length > 1000) { await fs.writeFile(thumbBgPath, buf); thumbGenerated = true; }
            }
        } catch {}
    }
    if (!thumbGenerated && process.env.COLAB_API_URL) {
        try { await generateColabImage(visualPrompt, thumbBgPath, resolution.width, resolution.height); thumbGenerated = true; }
        catch {}
    }
    if (!thumbGenerated) {
        await generateLocalFallbackImage(thumbBgPath, ytTitle, 0, resolution.width, resolution.height);
    }

    const thumbOutputPath = path.join(saveDir, `${safeTitle}_thumbnail.jpg`);
    const W = resolution.width, H = resolution.height;
    const safeText = escapeFilterText(ytTitle);
    const fontSize  = Math.round(H * 0.052);
    const boxY      = Math.round(H * 0.62);
    const boxH      = Math.round(H * 0.28);
    const textY     = Math.round(H * 0.68);

    await new Promise((resolve, reject) => {
        ffmpeg()
            .input(thumbBgPath)
            .videoFilters([
                `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black`,
                `drawbox=x=0:y=${boxY}:w=${W}:h=${boxH}:color=black@0.55:t=fill`,
                `drawtext=text='${safeText}':fontsize=${fontSize}:fontcolor=white:x=(w-text_w)/2:y=${textY}:shadowcolor=black@0.8:shadowx=3:shadowy=3`,
            ])
            .outputOptions(['-frames:v', '1', '-q:v', '1'])
            .save(thumbOutputPath)
            .on('end', async () => { await fs.unlink(thumbBgPath).catch(() => {}); resolve(); })
            .on('error', reject);
    });

    console.log(`[Success] Thumbnail saved: ${thumbOutputPath}`);
    return thumbOutputPath;
}

// ── Gemini & SQLite (reused) ──────────────────────────────────────────────────

const ai        = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
const modelName = process.env.GOOGLE_GENAI_MODEL || 'gemini-3.1-flash-lite-preview';

async function generateScript(prompt) {
    const res = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    return res.text;
}

async function setupDatabase() {
    const db = await open({ filename: './trends.db', driver: sqlite3.Database });
    await db.exec(`CREATE TABLE IF NOT EXISTS trends (id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT UNIQUE)`);
    const count = await db.get('SELECT COUNT(*) as count FROM trends');
    if (count.count === 0) {
        for (const t of ['AI Innovations', 'Space Exploration', 'Ancient History'])
            await db.run('INSERT INTO trends (topic) VALUES (?)', t);
    }
    return db;
}

// ── Edge TTS (reused) ─────────────────────────────────────────────────────────

async function generateFreeAudio(text, outputFile) {
    const safeText = text.replace(/"/g, '\\"');
    const voice    = process.env.EDGE_TTS_VOICE  || 'en-US-AriaNeural';
    const rate     = process.env.EDGE_TTS_RATE   || '-5%';
    const pitch    = process.env.EDGE_TTS_PITCH  || '-2Hz';
    const volume   = process.env.EDGE_TTS_VOLUME || '+0%';
    const cmd = `edge-tts --text "${safeText}" --voice "${voice}" --rate="${rate}" --pitch="${pitch}" --volume="${volume}" --write-media "${outputFile}"`;
    await execPromise(cmd);
    return outputFile;
}

async function getAudioDuration(audioPath) {
    const { stdout } = await execPromise(
        `"${ffprobeStatic.path}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
    );
    return parseFloat(stdout);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log('Welcome to the AI Video Pipeline — Colab LTX-Video Edition');
    const rl = readline.createInterface({ input, output });

    const channelName = process.env.YOUTUBE_CHANNEL_NAME || 'Nikhil Tech';
    const tempDir = await ensureDirectory(TEMP_DIR);
    const saveDir = await ensureDirectory(SAVE_DIR);

    // ── Health checks ───────────────────────────────────────────────────────
    const videoUrl = (process.env.COLAB_VIDEO_URL || '').replace(/\/$/, '');
    if (videoUrl) {
        console.log(`\n[LTX-Video] Checking connection to: ${videoUrl}`);
        try {
            const h = await fetch(`${videoUrl}/health`, {
                signal: AbortSignal.timeout(10_000),
                headers: { 'ngrok-skip-browser-warning': 'true' },
            });
            const hj = await h.json();
            if (hj.status === 'loading') {
                console.log('[LTX-Video] ⚠  Model still loading. First clip will be slow.');
            } else {
                console.log(`[LTX-Video] ✅ Connected! Model: ${hj.model} | VRAM: ${hj.vram_gb} GB`);
                console.log(`            ⚠  Each clip ≈ 2–4 min on T4. ${NUM_CLIPS} clips ≈ ${NUM_CLIPS * 3}–${NUM_CLIPS * 4} min total.`);
            }
        } catch (e) {
            console.warn(`[LTX-Video] ⚠  Could not reach video API (${e.message}). Will use image fallback.`);
        }
    } else {
        console.log('[LTX-Video] ℹ  COLAB_VIDEO_URL not set.');
        console.log('            Run colab_video_server.py on Colab, then set COLAB_VIDEO_URL in .env\n');
    }

    if (process.env.COLAB_API_URL) {
        const imgUrl = (process.env.COLAB_API_URL || '').replace(/\/$/, '');
        try {
            const h = await fetch(`${imgUrl}/health`, {
                signal: AbortSignal.timeout(10_000),
                headers: { 'ngrok-skip-browser-warning': 'true' },
            });
            const hj = await h.json();
            console.log(`[SDXL Image] ✅ Connected (for thumbnails)! Model: ${hj.model}`);
        } catch {
            console.warn('[SDXL Image] ⚠  Image server unreachable. Thumbnails use LTX or fallback.');
        }
    }

    // ── Setup ───────────────────────────────────────────────────────────────
    const db = await setupDatabase();

    // 1. Format
    const vFormat   = await rl.question('\nChoose format - [1] Shorts (9:16) [2] Wide (16:9): ');
    const resolution = vFormat === '1'
        ? { width: 1080, height: 1920 }
        : { width: 1920, height: 1080 };
    const formatLabel = vFormat === '1' ? 'Short' : 'Regular';

    // 2. Topic
    console.log('\nBrainstorming trending video categories...');
    const categoriesText = await generateScript(
        `Generate exactly 10 highly engaging, unique, trending YouTube channel niches or broad topics. ` +
        `(Seed: ${Math.random()}). Return only 10 topics, one per line, no numbering.`
    );
    const dynamicTopics = categoriesText.split('\n')
        .map(t => t.trim().replace(/^[0-9.\- ]+/, '').replace(/["*]/g, ''))
        .filter(t => t.length > 0).slice(0, 10);

    if (!dynamicTopics.length)
        dynamicTopics.push('AI Innovations', 'Space Exploration', 'Ancient History', 'Deep Sea Mysteries');

    console.log('\n--- Select a Topic Category ---');
    dynamicTopics.forEach((t, i) => console.log(`[${i + 1}] ${t}`));
    console.log('[0] (Enter custom topic)');

    let selectedTopic = '';
    while (true) {
        const choice = await rl.question('\nEnter a number or type your custom topic: ');
        const idx = parseInt(choice, 10);
        if (choice.trim() === '0') {
            selectedTopic = await rl.question('Type your topic: ');
            if (selectedTopic.trim()) break;
        } else if (!isNaN(idx) && idx >= 1 && idx <= dynamicTopics.length && idx.toString() === choice.trim()) {
            selectedTopic = dynamicTopics[idx - 1]; break;
        } else if (choice.trim().length > 0) {
            selectedTopic = choice.trim(); break;
        }
    }

    await db.run('INSERT OR IGNORE INTO trends (topic) VALUES (?)', selectedTopic);

    // 3. Video ideas
    const ideasText = await generateScript(
        `Suggest 5 concise, highly unique video ideas about ${selectedTopic}. ` +
        `(Seed: ${Math.random()}). Return only the titles.`
    );
    console.log(`\nSelected Themes:\n${ideasText}\n`);
    const topics = ideasText.split('\n').filter(l => l.trim().length > 0);

    // 4. Batch size
    const numVideosStr = await rl.question('How many videos to create?: ');
    const numVideos    = parseInt(numVideosStr, 10) || 1;

    console.log(`\nStarting AI video generation of ${numVideos} video(s)...`);
    console.log(`Each video uses ${NUM_CLIPS} LTX-Video clips.\n`);

    const shuffledTopics = topics.sort(() => 0.5 - Math.random());
    const summary = { success: [], errors: [] };
    const globalStart = Date.now();

    for (let i = 0; i < numVideos; i++) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Video ${i + 1}/${numVideos}`);
        console.log('='.repeat(50));
        const topic = shuffledTopics[i % shuffledTopics.length];

        try {
            // A. Script
            console.log(` - Writing script for: ${topic}`);
            const script = await generateScript(
                `Write a completely unique, highly engaging 60-second YouTube script about "${topic}" ` +
                `without formatting or director notes. Make it fresh and dynamic. (Seed: ${Math.random()}).`
            );
            const finalScript = `${String(script || '').trim()} ` +
                `${channelName ? `Like, share and subscribe to ${channelName}.` : 'Like, share and subscribe.'}`;

            // B. YouTube metadata
            console.log(` - Generating YouTube title and description...`);
            const metaText = await generateScript(
                `Create a click-worthy YouTube title (max 60 chars) and SEO-optimized description with hashtags ` +
                `for a ${formatLabel} video about "${topic}". Script: "${finalScript.slice(0, 300)}"\n` +
                `Return exactly:\nTITLE: <title>\nDESCRIPTION: <description>`
            );
            let ytTitle = topic, ytDescription = finalScript;
            const tm = metaText.match(/TITLE:\s*(.*)/i);
            const dm = metaText.match(/DESCRIPTION:\s*([\s\S]*)/i);
            if (tm) ytTitle       = tm[1].trim().replace(/["*]/g, '');
            if (dm) ytDescription = dm[1].trim();

            const safeTitle  = sanitizeFileName(ytTitle);
            const outputName = path.join(saveDir, `${safeTitle}.mp4`);
            const descName   = path.join(saveDir, `${safeTitle}.txt`);

            // C. Audio
            console.log(` - Generating Edge TTS audio...`);
            const audioPath = path.join(tempDir, `audio_${i}.mp3`);
            await generateFreeAudio(finalScript, audioPath);
            const audioDuration   = await getAudioDuration(audioPath);
            const durationPerClip = audioDuration / NUM_CLIPS;

            console.log(` - Audio: ${audioDuration.toFixed(1)}s → ${NUM_CLIPS} clips × ${durationPerClip.toFixed(1)}s each`);

            // D. Generate scene prompts (video-optimised)
            console.log(` - Generating ${NUM_CLIPS} cinematic scene prompts synchronized with the script...`);
            const sceneText = await generateScript(
                `Here is the voiceover script for a YouTube ${formatLabel} video about "${topic}":\n` +
                `---\n${finalScript}\n---\n\n` +
                `Divide the script chronologically into exactly ${NUM_CLIPS} equal segments. ` +
                `For each segment, generate a visual scene that perfectly matches what the narrator is saying at that moment.\n` +
                `Each scene is a ${Math.round(durationPerClip)}–${Math.round(durationPerClip) + 1} second video clip.\n\n` +
                `For each scene provide:\n` +
                `1. A DETAILED video prompt (25–40 words): describe MOTION, CAMERA MOVEMENT, subject action, lighting, ` +
                `mood, colors, cinematic style. Make it vivid, dynamic, and suitable for AI video generation.\n` +
                `2. A single broad fallback search noun (e.g. 'space', 'city', 'robot').\n\n` +
                `Format EXACTLY (one per line, nothing else, no numbering, no prefix):\n` +
                `PROMPT|WORD\n\n` +
                `Example:\n` +
                `slow cinematic zoom into a glowing blue neural network brain with pulsing electric light patterns, dark atmosphere, ultra HD, 8k|technology\n\n` +
                `Return EXACTLY ${NUM_CLIPS} lines.`
            );
            const scenePrompts = sceneText.split('\n')
                .filter(l => l.includes('|'))
                .map(l => { const [phrase, word] = l.split('|'); return { phrase: phrase.trim(), word: (word||'').trim().replace(/[^a-zA-Z]/g, '') }; })
                .filter(k => k.word.length > 1)
                .slice(0, NUM_CLIPS);

            while (scenePrompts.length < NUM_CLIPS) {
                scenePrompts.push({
                    phrase: `${topic} cinematic dramatic lighting ultra HD dynamic motion`,
                    word: topic.split(' ')[0] || 'nature',
                });
            }

            console.log(` - Scene prompts ready:`);
            scenePrompts.forEach((s, idx) => console.log(`      [${idx+1}] ${s.phrase.slice(0, 70)}...`));

            // E. Generate video clips
            console.log(`\n - Generating ${NUM_CLIPS} AI video clips via LTX-Video...`);
            const clipPaths = await generateSceneClips(topic, scenePrompts, resolution, durationPerClip, tempDir, i);

            // F. Assemble
            console.log(`\n - Assembling final video...`);
            await assembleAIVideo(clipPaths, audioPath, outputName, resolution);

            // Clean up clips
            for (const cp of clipPaths) await fs.unlink(cp).catch(() => {});

            // G. Description
            await fs.writeFile(descName, `TITLE: ${ytTitle}\n\nDESCRIPTION:\n${ytDescription}`);

            // H. Thumbnail
            const thumbPath = await generateThumbnail(ytTitle, ytDescription, resolution, saveDir, safeTitle);

            console.log(`\n[Success] ${outputName}`);
            console.log(`[Success] ${descName}`);
            console.log(`[Success] ${thumbPath}`);
            summary.success.push(`"${ytTitle}" -> ${safeTitle}.mp4 + thumbnail`);

        } catch (err) {
            console.error(`\n[!] Error for "${topic}": ${err.message}`);
            summary.errors.push({ topic, error: err.message });
        }
    }

    const elapsed = ((Date.now() - globalStart) / 1000).toFixed(1);
    console.log(`\n${'='.repeat(50)}`);
    console.log('          GENERATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`⏱  Total Time : ${(elapsed / 60).toFixed(2)} min (${elapsed}s)`);
    console.log(`✅ Success (${summary.success.length}):`);
    summary.success.forEach(t => console.log(`   - ${t}`));
    if (summary.errors.length) {
        console.log(`\n❌ Errors (${summary.errors.length}):`);
        summary.errors.forEach(e => console.log(`   - ${e.topic}: ${e.error}`));
    }
    console.log('='.repeat(50) + '\n');

    rl.close();
}

main().catch(console.error);
