import puppeteer from "puppeteer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import path from "path";
import { generateSlideHTML } from "./educationalSceneBuilders.js";
import { getThemeForTopic, THEMES } from "./themeEngine.js";

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

function createSequenceClip(concatTxtPath, audioPath, outputPath, fps, audioDuration) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(concatTxtPath)
            .inputOptions(["-f", "concat", "-safe", "0"])
            .input(audioPath)
            .outputOptions([
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-pix_fmt", "yuv420p",
                "-c:a", "aac",
                "-b:a", "192k",
                "-t", `${audioDuration}`,
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

export async function createWebVideo(slides, tmpDir, finalVideoPath, options = {}) {
    console.log("🎬 Rendering Educational Video Scenes (Puppeteer)...");
    
    const clipsDir = path.join(tmpDir, "clips");
    if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });

    const theme = THEMES[options.topicCategory] || getThemeForTopic(options.topic || 'general');
    
    const clipPaths = new Array(slides.length);
    const fps = 30; // Changed to 30 FPS for much faster rendering

    // Launch browser once
    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const startTime = Date.now();
    let successfulSlides = 0;

    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        
        // Progress tracking
        const percentage = Math.round(((i + 1) / slides.length) * 100);
        let timeRemainingStr = "calculating...";
        if (i > 0) {
            const elapsed = Date.now() - startTime;
            const avgTimePerSlide = elapsed / i;
            const remaining = (slides.length - i) * avgTimePerSlide;
            timeRemainingStr = `${Math.ceil(remaining / 1000)}s`;
        }
        
        console.log(`   📸 Rendering Slide ${i + 1}/${slides.length} (${percentage}%) [${slide.scene_type || 'default'}] - ETA: ${timeRemainingStr}...`);

        let page;
        try {
            page = await browser.newPage();
            await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2560/1920 });

            const context = {
                theme,
                slideIndex: i,
                totalSlides: slides.length,
                prevSlide: i > 0 ? slides[i - 1] : null,
                nextSlide: i < slides.length - 1 ? slides[i + 1] : null,
                topicCategory: options.topicCategory || 'general'
            };

            const html = generateSlideHTML(slide, context);
            await page.setContent(html, { waitUntil: "load" });

            // WAIT FOR FONTS TO FULLY LOAD with timeout
            await page.evaluate(async () => {
                const fontWait = document.fonts.ready;
                const timeoutWait = new Promise(resolve => setTimeout(resolve, 5000));
                await Promise.race([fontWait, timeoutWait]);

                await Promise.all(Array.from(document.images).filter(img => !img.complete).map(img => new Promise(resolve => { img.onload = img.onerror = resolve; })));
                
                const mermaidBlocks = document.querySelectorAll('.mermaid');
                if (mermaidBlocks.length > 0) {
                     await new Promise(resolve => {
                         let attempts = 0;
                         const check = () => {
                             let allRendered = true;
                             mermaidBlocks.forEach(b => {
                                 if (!b.querySelector('svg')) allRendered = false;
                             });
                             if (allRendered || attempts > 50) resolve(); // 5s max
                             else { attempts++; setTimeout(check, 100); }
                         };
                         check();
                     });
                }
                await new Promise(r => setTimeout(r, 500));
                
                // Auto-scale to prevent overflow
                const container = document.querySelector('.scene-container');
                if (container) {
                    const sHeight = container.scrollHeight;
                    const sWidth = container.scrollWidth;
                    const cHeight = container.clientHeight;
                    const cWidth = container.clientWidth;
                    
                    let targetScale = 1;
                    if (sHeight > cHeight) targetScale = Math.min(targetScale, cHeight / sHeight);
                    if (sWidth > cWidth) targetScale = Math.min(targetScale, cWidth / sWidth);
                    
                    if (targetScale < 1) {
                        const finalScale = targetScale * 0.95; // 5% padding
                        const styleEl = document.createElement('style');
                        styleEl.innerHTML = `
                            @keyframes phase1 {
                                0% { opacity: 0; transform: scale(${finalScale * 0.95}); }
                                100% { opacity: 1; transform: scale(${finalScale}); }
                            }
                            @keyframes exitPhase1 { 
                                100% { opacity: 0; transform: scale(${finalScale * 1.05}); } 
                            }
                            .scene-container { transform: scale(${finalScale}) !important; transform-origin: center center; }
                        `;
                        document.head.appendChild(styleEl);
                    }
                }
                
                await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            });

            const maxAnimTimeMs = await page.evaluate(() => {
                let m = 0;
                document.getAnimations().forEach(a => {
                    const timing = a.effect.getComputedTiming();
                    if (timing.iterations === Infinity) return; // Skip infinite background animations
                    const end = timing.delay + timing.activeDuration;
                    if (end > m) m = end;
                });
                return m;
            });

            // Cap the entrance to max 2.5 seconds to prevent extremely long frame-by-frame captures
            const ENTRANCE_SEC = Math.min(2.5, Math.max(1.5, maxAnimTimeMs / 1000));
            const EXIT_SEC = 0.5;
            const totalDuration = slide.audioDuration || 5.0;
            
            const entranceFrames = Math.ceil(fps * Math.min(ENTRANCE_SEC, totalDuration));
            const exitFrames = Math.ceil(fps * Math.min(EXIT_SEC, totalDuration));
            const holdDuration = Math.max(0.5, totalDuration - (entranceFrames/fps) - (exitFrames/fps));

            const concatTxtPath = path.join(clipsDir, `slide_${slide.slide_number || (i+1)}_concat.txt`);
            let concatContent = "";
            let f = 1;

            // Capture Entrance
            for (let e = 1; e <= entranceFrames; e++) {
                const framePath = path.join(clipsDir, `slide_${slide.slide_number || (i+1)}_frame_${f.toString().padStart(4, "0")}.jpg`);
                await page.evaluate(async (timeMs) => {
                    document.getAnimations().forEach(anim => { anim.playbackRate = 0; anim.currentTime = timeMs; });
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                }, (e / fps) * 1000);

                if (e === entranceFrames) {
                    await page.evaluate(() => {
                        document.querySelectorAll('.anim-item').forEach(el => {
                            el.style.animation = 'none';
                            el.style.opacity = '1';
                            el.style.transform = 'none';
                        });
                    });
                }

                await page.screenshot({ path: framePath, type: 'jpeg', quality: 92 });
                const dur = (e === entranceFrames) ? ((1/fps) + holdDuration) : (1/fps);
                concatContent += `file '${framePath.replace(/\\/g, '/')}'\nduration ${dur.toFixed(6)}\n`;
                f++;
            }

            // Trigger Exit
            await page.evaluate(() => document.body.classList.add('is-exiting'));
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

            // Capture Exit
            for (let x = 1; x <= exitFrames; x++) {
                const framePath = path.join(clipsDir, `slide_${slide.slide_number || (i+1)}_frame_${f.toString().padStart(4, "0")}.jpg`);
                await page.evaluate(async (timeMs) => {
                    document.getAnimations().forEach(anim => { 
                        if (anim.animationName && anim.animationName.startsWith('exitPhase')) {
                            anim.playbackRate = 0; anim.currentTime = timeMs; 
                        }
                    });
                    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                }, (x / fps) * 1000);

                await page.screenshot({ path: framePath, type: 'jpeg', quality: 92 });
                concatContent += `file '${framePath.replace(/\\/g, '/')}'\nduration ${(1/fps).toFixed(6)}\n`;
                f++;
            }

            if (f > 1) {
                const lastFramePath = path.join(clipsDir, `slide_${slide.slide_number || (i+1)}_frame_${(f - 1).toString().padStart(4, "0")}.jpg`);
                concatContent += `file '${lastFramePath.replace(/\\/g, '/')}'\n`;
            }

            fs.writeFileSync(concatTxtPath, concatContent);

            const clipPath = path.join(clipsDir, `clip_${slide.slide_number || (i+1)}.mp4`);
            await createSequenceClip(concatTxtPath, slide.audioPath, clipPath, fps, slide.audioDuration);
            clipPaths[i] = clipPath;
            successfulSlides++;

        } catch (error) {
            console.error(`❌ Error rendering slide ${i + 1}:`, error.message);
            console.log("⚠️ Creating fallback slide...");
            
            // Error recovery: Create simple fallback
            try {
                if (!page || page.isClosed()) {
                    page = await browser.newPage();
                    await page.setViewport({ width: 1920, height: 1080 });
                }
                
                const fallbackHtml = `
                    <html>
                    <body style="background:#222; color:#fff; display:flex; align-items:center; justify-content:center; padding:100px; font-size:48px; font-family:sans-serif; text-align:center;">
                        <div>
                            <h1>${slide.title || 'Slide ' + (i + 1)}</h1>
                            <p>${slide.narration || ''}</p>
                        </div>
                    </body>
                    </html>
                `;
                
                await page.setContent(fallbackHtml, { waitUntil: "load" });
                const fallbackFramePath = path.join(clipsDir, `slide_${slide.slide_number || (i+1)}_fallback.jpg`);
                await page.screenshot({ path: fallbackFramePath, type: 'jpeg', quality: 92 });
                
                const concatTxtPath = path.join(clipsDir, `slide_${slide.slide_number || (i+1)}_concat.txt`);
                const dur = Math.max(3.0, slide.audioDuration || 5.0);
                let concatContent = `file '${fallbackFramePath.replace(/\\/g, '/')}'\nduration ${dur.toFixed(6)}\n`;
                concatContent += `file '${fallbackFramePath.replace(/\\/g, '/')}'\n`;
                fs.writeFileSync(concatTxtPath, concatContent);
                
                const clipPath = path.join(clipsDir, `clip_${slide.slide_number || (i+1)}.mp4`);
                await createSequenceClip(concatTxtPath, slide.audioPath, clipPath, fps, slide.audioDuration);
                clipPaths[i] = clipPath;
                successfulSlides++;
            } catch (fallbackError) {
                console.error(`❌ Fallback also failed for slide ${i + 1}:`, fallbackError.message);
                clipPaths[i] = null; // Mark as failed
            }
        } finally {
            if (page && !page.isClosed()) {
                await page.close();
            }
        }
    }

    await browser.close();
    
    // Filter out nulls in case of total failure
    const validClipPaths = clipPaths.filter(p => p !== null);

    if (validClipPaths.length === 0) {
        throw new Error("All slides failed to render. Cannot create final video.");
    }

    console.log(`🎞️ Merging ${validClipPaths.length}/${slides.length} successful scenes into Final Video...`);
    await mergeClips(validClipPaths, finalVideoPath);
    return finalVideoPath;
}
