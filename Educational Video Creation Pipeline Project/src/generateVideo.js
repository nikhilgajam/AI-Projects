import puppeteer from "puppeteer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import path from "path";
import { generateSlideHTML } from "./educationalSceneBuilders.js";

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

function createSequenceClip(concatTxtPath, audioPath, outputPath, fps, audioDuration) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatTxtPath)
            .inputOptions(["-f", "concat", "-safe", "0"])
            .input(audioPath)
            .outputOptions([
                "-c:v libx264",
                "-preset", "ultrafast",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", "192k",
                `-t`, `${audioDuration}`,
                "-r", `${fps}`,
                "-vsync", "1"
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
        mergedVideo
            .on("end", () => resolve(finalOutputPath))
            .on("error", (err) => reject(err))
            .mergeToFile(finalOutputPath, path.join(path.dirname(finalOutputPath), "temp"));
    });
}

export async function createWebVideo(slides, tmpDir, finalVideoPath) {
    console.log("🎬 Rendering Educational Video Scenes (Puppeteer)...");
    
    const clipsDir = path.join(tmpDir, "clips");
    if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });

    const clipPaths = new Array(slides.length);
    const fps = 60; 

    // Process sequentially or small batches to ensure stability
    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const html = generateSlideHTML(slide);

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        // 1440p output by scaling 1920x1080
        await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2560/1920 });
        await page.setContent(html, { waitUntil: "load" });

        // WAIT FOR FONTS TO FULLY LOAD to prevent invisible text (FOIT)!
        await page.evaluate(async () => {
            await document.fonts.ready;
            // Also add a tiny buffer just in case
            await new Promise(r => setTimeout(r, 100));
            // CRITICAL: Force the browser to calculate styles and initialize CSS animations!
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        });

        // Dynamically determine how long the entrance animation actually takes
        const maxAnimTimeMs = await page.evaluate(() => {
            let m = 0;
            document.getAnimations().forEach(a => {
                const end = a.effect.getComputedTiming().delay + a.effect.getComputedTiming().activeDuration;
                if (end > m) m = end;
            });
            return m;
        });

        const ENTRANCE_SEC = Math.max(2.0, maxAnimTimeMs / 1000);
        const EXIT_SEC = 1.0;
        const totalDuration = slide.audioDuration || 5.0;
        
        const entranceFrames = Math.ceil(fps * Math.min(ENTRANCE_SEC, totalDuration));
        const exitFrames = Math.ceil(fps * Math.min(EXIT_SEC, totalDuration));
        const holdDuration = Math.max(0, totalDuration - (entranceFrames/fps) - (exitFrames/fps));

        console.log(`   📸 Rendering Slide ${slide.slide_number} (${slide.scene_type})...`);

        const concatTxtPath = path.join(clipsDir, `slide_${slide.slide_number}_concat.txt`);
        let concatContent = "";
        let f = 1;

        // Capture Entrance
        for (let e = 1; e <= entranceFrames; e++) {
            const framePath = path.join(clipsDir, `slide_${slide.slide_number}_frame_${f.toString().padStart(4, "0")}.jpg`);
            await page.evaluate(async (timeMs) => {
                document.getAnimations().forEach(anim => { anim.playbackRate = 0; anim.currentTime = timeMs; });
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }, (e / fps) * 1000);

            // CRITICAL FAILSAFE: On the very last entrance frame, force everything to be visible!
            if (e === entranceFrames) {
                await page.evaluate(() => {
                    document.querySelectorAll('.anim-item').forEach(el => {
                        el.style.animation = 'none';
                        el.style.opacity = '1';
                        el.style.transform = 'none';
                    });
                });
            }

            await page.screenshot({ path: framePath, type: 'jpeg', quality: 85 });
            const dur = (e === entranceFrames) ? ((1/fps) + holdDuration) : (1/fps);
            concatContent += `file '${framePath.replace(/\\/g, '/')}'\nduration ${dur.toFixed(6)}\n`;
            f++;
        }

        // Trigger Exit
        await page.evaluate(() => document.body.classList.add('is-exiting'));
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

        // Capture Exit
        for (let x = 1; x <= exitFrames; x++) {
            const framePath = path.join(clipsDir, `slide_${slide.slide_number}_frame_${f.toString().padStart(4, "0")}.jpg`);
            await page.evaluate(async (timeMs) => {
                document.getAnimations().forEach(anim => { 
                    if (anim.animationName === 'fadeOut') {
                        anim.playbackRate = 0; anim.currentTime = timeMs; 
                    }
                });
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            }, (x / fps) * 1000);

            await page.screenshot({ path: framePath, type: 'jpeg', quality: 85 });
            concatContent += `file '${framePath.replace(/\\/g, '/')}'\nduration ${(1/fps).toFixed(6)}\n`;
            f++;
        }

        if (f > 1) {
            const lastFramePath = path.join(clipsDir, `slide_${slide.slide_number}_frame_${(f - 1).toString().padStart(4, "0")}.jpg`);
            concatContent += `file '${lastFramePath.replace(/\\/g, '/')}'\n`;
        }

        fs.writeFileSync(concatTxtPath, concatContent);
        await browser.close();

        const clipPath = path.join(clipsDir, `clip_${slide.slide_number}.mp4`);
        await createSequenceClip(concatTxtPath, slide.audioPath, clipPath, fps, slide.audioDuration);
        clipPaths[i] = clipPath;
    }

    console.log("🎞️ Merging all scenes into Final Video...");
    await mergeClips(clipPaths, finalVideoPath);
    return finalVideoPath;
}
