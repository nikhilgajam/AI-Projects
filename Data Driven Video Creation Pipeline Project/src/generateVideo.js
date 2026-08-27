import puppeteer from "puppeteer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "fs";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegStatic);

// Helper function to generate HTML for a slide
// Helper function to generate HTML for a slide
function generateSlideHTML(slide, outputDir) {
    // Add staggered delay to bullet points
    const bullets = slide.bullet_points.map((bp, i) => `<li style="animation-delay: ${0.3 + i * 0.3}s">${bp}</li>`).join('');
    
    // Check for multiple cliparts
    let clipartHTML = '';
    
    // We generated multiple cliparts indexed 0 to N. Look for up to 3.
    for (let j = 0; j < 3; j++) {
        const jpgPath = path.join(outputDir, `clipart_${slide.slide_number}_${j}.jpg`);
        const svgPath = path.join(outputDir, `clipart_${slide.slide_number}_${j}.svg`);
        
        let imgTag = '';
        if (fs.existsSync(jpgPath)) {
            const base64Image = Buffer.from(fs.readFileSync(jpgPath)).toString('base64');
            imgTag = `<img src="data:image/jpeg;base64,${base64Image}" class="clipart" alt="clipart">`;
        } else if (fs.existsSync(svgPath)) {
            const base64Image = Buffer.from(fs.readFileSync(svgPath)).toString('base64');
            imgTag = `<img src="data:image/svg+xml;base64,${base64Image}" class="clipart twemoji" alt="clipart">`;
        }
        
        if (imgTag) {
            // Stagger delays based on how much time we have (e.g., 0.5s, 1.5s, 2.5s)
            const delay = 0.5 + (j * 1.0);
            imgTag = imgTag.replace('class="clipart"', `class="clipart" style="animation-delay: ${delay}s"`);
            imgTag = imgTag.replace('class="clipart twemoji"', `class="clipart twemoji" style="animation-delay: ${delay}s"`);
            clipartHTML += imgTag;
        }
    }

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-50px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes slideRight {
                from { opacity: 0; transform: translateX(-50px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes popIn {
                0% { opacity: 0; transform: scale(0.5); }
                70% { opacity: 1; transform: scale(1.1); }
                100% { opacity: 1; transform: scale(1); }
            }
            body {
                margin: 0;
                padding: 0;
                width: 1920px;
                height: 1080px;
                background-color: #1E1E1E;
                color: #FFFFFF;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: flex-start;
                box-sizing: border-box;
                padding: 100px;
                position: relative;
            }
            .header {
                width: 100%;
                height: 20px;
                background-color: #0052CC;
                position: absolute;
                top: 0;
                left: 0;
            }
            h1 {
                font-size: 80px;
                text-align: left;
                margin-bottom: 60px;
                text-shadow: 2px 2px 8px rgba(0,0,0,0.5);
                color: #4DA6FF;
                width: 100%;
                animation: slideDown 1s ease-out forwards;
                animation-play-state: paused;
            }
            .content-wrapper {
                display: flex;
                width: 100%;
                justify-content: space-between;
                align-items: center;
            }
            ul {
                font-size: 50px;
                line-height: 1.6;
                width: 65%;
                color: #E0E0E0;
            }
            li {
                margin-bottom: 30px;
                opacity: 0;
                animation: slideRight 0.8s ease-out forwards;
                animation-play-state: paused;
            }
            .clipart-container {
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 30px;
                height: 100%;
                width: 350px;
            }
            .clipart {
                width: 100%;
                height: 250px;
                object-fit: contain;
                border-radius: 20px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                opacity: 0;
                animation: popIn 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                animation-play-state: paused;
            }
            .twemoji {
                background: transparent;
                box-shadow: none;
                border-radius: 0;
            }
        </style>
    </head>
    <body>
        <div class="header"></div>
        <h1>${slide.heading}</h1>
        <div class="content-wrapper">
            <ul>${bullets}</ul>
            <div class="clipart-container">
                ${clipartHTML}
            </div>
        </div>
    </body>
    </html>
    `;
}

// Generate a video clip from an image sequence and audio
function createSequenceClip(framePattern, audioPath, outputPath, fps, audioDuration) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(framePattern)
            .inputFPS(fps)
            .input(audioPath)
            .outputOptions([
                '-c:v libx264',
                '-pix_fmt yuv420p',
                '-c:a aac',
                '-b:a 192k',
                `-t ${audioDuration}`, // Explicitly set duration to match audio length
                `-vf tpad=stop_mode=clone:stop_duration=${Math.ceil(audioDuration)}` // Pad the video frame up to the audio length
            ])
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
    });
}

// Concatenate multiple clips into the final video
function mergeClips(clipPaths, finalOutputPath) {
    return new Promise((resolve, reject) => {
        const mergedVideo = ffmpeg();
        
        clipPaths.forEach(clip => {
            mergedVideo.input(clip);
        });

        mergedVideo
            .on('end', () => resolve(finalOutputPath))
            .on('error', (err) => reject(err))
            .mergeToFile(finalOutputPath, path.join(path.dirname(finalOutputPath), 'temp'));
    });
}

export async function createCrossPlatformVideo(slides, tmpDir, finalVideoPath) {
    console.log("📸 Generating Animated Slide Frames and rendering Video...");
    
    const clipsDir = path.join(tmpDir, "clips");
    if (!fs.existsSync(clipsDir)) {
        fs.mkdirSync(clipsDir, { recursive: true });
    }

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    const clipPaths = [];
    const fps = 15;
    const animationDuration = 4.0; // 4.0 seconds of animation capture to allow staggered cliparts
    const animatedFrames = Math.floor(fps * animationDuration);

    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        
        // 1. Create HTML and capture frame sequence via Puppeteer
        const html = generateSlideHTML(slide, tmpDir);
        await page.setContent(html, { waitUntil: 'load' });

        console.log(`📸 Capturing ${animatedFrames} frames for Slide ${slide.slide_number} animations...`);
        const framePattern = path.join(clipsDir, `slide_${slide.slide_number}_frame_%04d.png`);
        
        for (let f = 1; f <= animatedFrames; f++) {
            const framePath = path.join(clipsDir, `slide_${slide.slide_number}_frame_${f.toString().padStart(4, '0')}.png`);
            
            // Fast-forward the CSS animations to the exact millisecond
            await page.evaluate((timeMs) => {
                document.getAnimations().forEach(anim => {
                    anim.currentTime = timeMs;
                });
            }, (f / fps) * 1000);
            
            await page.screenshot({ path: framePath });
        }

        // 2. Render sequence to video using FFmpeg
        console.log(`🎬 Rendering Animated Clip ${slide.slide_number} (${slide.audioDuration.toFixed(2)}s)...`);
        const clipPath = path.join(clipsDir, `clip_${slide.slide_number}.mp4`);
        await createSequenceClip(framePattern, slide.audioPath, clipPath, fps, slide.audioDuration);
        clipPaths.push(clipPath);
    }

    await browser.close();

    // 3. Merge Clips
    console.log("🎞️ Merging all clips into Final Video...");
    await mergeClips(clipPaths, finalVideoPath);
    
    console.log(`✅ Final Video successfully rendered to ${finalVideoPath}`);
    return finalVideoPath;
}
