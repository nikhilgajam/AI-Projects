import puppeteer from "puppeteer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateSlideHTML, setChartJSInline } from "./sceneBuilders.js";

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Inline Chart.js from local node_modules — eliminates any CDN network request in Puppeteer
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHARTJS_PATH = path.join(__dirname, "..", "node_modules", "chart.js", "dist", "chart.umd.min.js");
setChartJSInline(fs.readFileSync(CHARTJS_PATH, "utf8"));

// ─── Video helpers ────────────────────────────────────────────────────────────

function createSequenceClip(concatTxtPath, audioPath, outputPath, fps, audioDuration) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatTxtPath)
            .inputOptions(["-f", "concat", "-safe", "0"])
            .input(audioPath)
            .outputOptions([
                "-c:v libx264",
                "-preset", "ultrafast", // Massively speeds up FFmpeg encoding
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", "192k",
                `-t`, `${audioDuration}`,
                "-r", `${fps}`,
                "-vsync", "1" // Force CFR (Constant Frame Rate) to fix video player stutter
            ])
            .save(outputPath)
            .on("end", () => resolve(outputPath))
            .on("error", (err) => reject(err));
    });
}

function mergeClips(clipPaths, finalOutputPath) {
    return new Promise((resolve, reject) => {
        const mergedVideo = ffmpeg();
        clipPaths.forEach(clip => mergedVideo.input(clip));
        
        let lastLogTime = Date.now();
        mergedVideo
            .on("progress", (progress) => {
                const now = Date.now();
                if (now - lastLogTime > 60000) { // Log once per minute
                    console.log(`   ⏳ Merging progress... [Time: ${progress.timemark} | ${progress.currentFps || 0} fps]`);
                    lastLogTime = now;
                }
            })
            .on("end", () => resolve(finalOutputPath))
            .on("error", (err) => reject(err))
            .mergeToFile(finalOutputPath, path.join(path.dirname(finalOutputPath), "temp"));
    });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function createWebVideo(slides, tmpDir, finalVideoPath) {
    console.log("🎬 Generating Cinematic HTML/CSS/JS Scenes and rendering Video...");

    const clipsDir = path.join(tmpDir, "clips");
    if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });

    const clipPaths = new Array(slides.length);
    const fps = 60; // 60 FPS for ultra-smooth easing/bounces

    const CONCURRENCY = 5;
    console.log(`⚡ Rendering ${slides.length} scenes in true parallel multi-processing batches of ${CONCURRENCY}...`);

    for (let i = 0; i < slides.length; i += CONCURRENCY) {
        const chunk = slides.slice(i, i + CONCURRENCY);
        
        await Promise.all(chunk.map(async (slide, chunkIdx) => {
            const actualIdx = i + chunkIdx;
            
            const slideType = (slide.slide_type || "default").toLowerCase();
            const theme = slide.scene_theme || "glassmorphism";
            const html = generateSlideHTML(slide, tmpDir);

            // Launch a COMPLETELY isolated browser process per slide to avoid Chromium's single-thread compositor bottleneck
            const browser = await puppeteer.launch({ 
                headless: true, 
                protocolTimeout: 0 
            });

            const page = await browser.newPage();
            page.setDefaultNavigationTimeout(0);
            page.on('console', msg => {
                if (msg.text().includes('CSS animations')) {
                    console.log(`[Slide ${slide.slide_number} LOG]`, msg.text());
                }
            });
            await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2560 / 1920 });
            await page.setContent(html, { waitUntil: "load", timeout: 0 });

            await page.evaluate(() => new Promise(resolve =>
                requestAnimationFrame(() => requestAnimationFrame(resolve))
            ));

            if (slideType === "chart") {
                await page.evaluate(() => new Promise(resolve =>
                    requestAnimationFrame(() => requestAnimationFrame(resolve))
                ));
            }

            // Optimized capture: only entrance and exit!
            const ENTRANCE_SEC = 2.3;
            const EXIT_SEC = 1.0;
            const totalDuration = slide.audioDuration || 5.0;
            
            const entranceDuration = Math.min(ENTRANCE_SEC, totalDuration);
            const exitDuration = Math.max(0, Math.min(EXIT_SEC, totalDuration - entranceDuration));
            const holdDuration = Math.max(0, totalDuration - entranceDuration - exitDuration);
            
            const entranceFrames = Math.ceil(fps * entranceDuration);
            const exitFrames = Math.ceil(fps * exitDuration);
            const totalRenderedFrames = entranceFrames + exitFrames;
            
            console.log(`📸 [${actualIdx + 1}/${slides.length}] Fast-capturing ${totalRenderedFrames} frames (Entrance+Exit) for Scene ${slide.slide_number} [${theme}/${slideType}]...`);
            
            const concatTxtPath = path.join(clipsDir, `slide_${slide.slide_number}_concat.txt`);
            let concatContent = "";
            let f = 1;

            // 1. Capture Entrance
            for (let e = 1; e <= entranceFrames; e++) {
                const framePath = path.join(clipsDir, `slide_${slide.slide_number}_frame_${f.toString().padStart(4, "0")}.jpg`);
                
                await page.evaluate(async (timeMs) => {
                    const anims = document.getAnimations();
                    anims.forEach(anim => { anim.playbackRate = 0; anim.currentTime = timeMs; });
                    // Double rAF ensures the compositor thread has fully painted the DOM state before resolving
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                }, (e / fps) * 1000);

                await page.screenshot({ path: framePath, type: 'jpeg', quality: 85 });
                
                // If it's the last entrance frame, hold it for the middle duration!
                const frameDuration = (e === entranceFrames) ? ((1/fps) + holdDuration) : (1/fps);
                concatContent += `file '${framePath.replace(/\\/g, '/')}'\nduration ${frameDuration.toFixed(6)}\n`;
                f++;
            }

            // 2. Trigger Exit Animation
            await page.evaluate(() => document.body.classList.add('is-exiting'));
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

            // 3. Capture Exit
            for (let x = 1; x <= exitFrames; x++) {
                const framePath = path.join(clipsDir, `slide_${slide.slide_number}_frame_${f.toString().padStart(4, "0")}.jpg`);
                
                await page.evaluate(async (timeMs) => {
                    const anims = document.getAnimations();
                    anims.forEach(anim => { 
                        if (anim.animationName === 'sceneExit') {
                            anim.playbackRate = 0; 
                            anim.currentTime = timeMs; 
                        }
                    });
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                }, (x / fps) * 1000);

                await page.screenshot({ path: framePath, type: 'jpeg', quality: 85 });
                
                concatContent += `file '${framePath.replace(/\\/g, '/')}'\nduration ${(1/fps).toFixed(6)}\n`;
                f++;
            }
            
            // Concat demuxer needs last file repeated without a duration line
            if (f > 1) {
                const lastFramePath = path.join(clipsDir, `slide_${slide.slide_number}_frame_${(f - 1).toString().padStart(4, "0")}.jpg`);
                concatContent += `file '${lastFramePath.replace(/\\/g, '/')}'\n`;
            }
            
            fs.writeFileSync(concatTxtPath, concatContent);

            await browser.close(); // Closes the entire isolated Chrome process

            console.log(`🎬 [${actualIdx + 1}/${slides.length}] Rendering Scene Clip ${slide.slide_number} (${slide.audioDuration.toFixed(2)}s)...`);
            const clipPath = path.join(clipsDir, `clip_${slide.slide_number}.mp4`);
            await createSequenceClip(concatTxtPath, slide.audioPath, clipPath, fps, slide.audioDuration);
            
            clipPaths[actualIdx] = clipPath;
        }));
    }

    console.log("🎞️ Merging all scene clips into Final Video...");
    await mergeClips(clipPaths, finalVideoPath);

    console.log(`✅ Final Video successfully rendered to ${finalVideoPath}`);
    return finalVideoPath;
}
