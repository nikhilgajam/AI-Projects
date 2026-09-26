import puppeteer from "puppeteer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Inline Chart.js from local node_modules — eliminates any CDN network request in Puppeteer
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHARTJS_PATH = path.join(__dirname, "..", "node_modules", "chart.js", "dist", "chart.umd.min.js");
const CHARTJS_INLINE = fs.readFileSync(CHARTJS_PATH, "utf8");

// ─── Shared CSS / Layout ────────────────────────────────────────────────────

const BASE_CSS = `
    @keyframes slideDown {
        from { opacity: 0; transform: translateY(-50px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideRight {
        from { opacity: 0; transform: translateX(-50px); }
        to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes popIn {
        0%   { opacity: 0; transform: scale(0.5); }
        70%  { opacity: 1; transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
    }
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(50px); }
        to   { opacity: 1; transform: translateY(0); }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
        width: 1920px;
        height: 1080px;
        background-color: #1E1E1E;
        color: #FFFFFF;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 100px;
        position: relative;
        overflow: hidden;
    }
    .header {
        width: 100%;
        height: 20px;
        background-color: #0052CC;
        position: absolute;
        top: 0; left: 0;
    }
    h1 {
        font-size: 80px;
        text-align: left;
        margin-bottom: 50px;
        text-shadow: 2px 2px 8px rgba(0,0,0,0.5);
        color: #4DA6FF;
        width: 100%;
        animation: slideDown 1s ease-out forwards;
        animation-play-state: paused;
    }
    h1.centered { text-align: center; }
    .content-wrapper {
        display: flex;
        width: 100%;
        justify-content: space-between;
        align-items: center;
        flex: 1;
    }
    ul {
        font-size: 50px;
        line-height: 1.6;
        width: 65%;
        color: #E0E0E0;
        list-style: disc;
        padding-left: 60px;
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
`;

// ─── DEFAULT slide ───────────────────────────────────────────────────────────

function buildDefaultHTML(slide, outputDir) {
    const bullets = (slide.bullet_points || [])
        .map((bp, i) => `<li style="animation-delay: ${0.3 + i * 0.3}s">${escHtml(bp)}</li>`)
        .join("");

    let clipartHTML = "";
    for (let j = 0; j < 3; j++) {
        const jpgPath = path.join(outputDir, `clipart_${slide.slide_number}_${j}.jpg`);
        const svgPath = path.join(outputDir, `clipart_${slide.slide_number}_${j}.svg`);
        let imgTag = "";
        if (fs.existsSync(jpgPath)) {
            const b64 = fs.readFileSync(jpgPath).toString("base64");
            imgTag = `<img src="data:image/jpeg;base64,${b64}" class="clipart" alt="clipart">`;
        } else if (fs.existsSync(svgPath)) {
            const b64 = fs.readFileSync(svgPath).toString("base64");
            imgTag = `<img src="data:image/svg+xml;base64,${b64}" class="clipart twemoji" alt="clipart">`;
        }
        if (imgTag) {
            const delay = 0.5 + j * 1.0;
            imgTag = imgTag.replace('class="clipart"', `class="clipart" style="animation-delay: ${delay}s"`);
            imgTag = imgTag.replace('class="clipart twemoji"', `class="clipart twemoji" style="animation-delay: ${delay}s"`);
            clipartHTML += imgTag;
        }
    }

    return wrapHTML(`
        <div class="header"></div>
        <h1>${escHtml(slide.heading)}</h1>
        <div class="content-wrapper">
            <ul>${bullets}</ul>
            <div class="clipart-container">${clipartHTML}</div>
        </div>
    `, BASE_CSS);
}

// ─── TABLE slide ─────────────────────────────────────────────────────────────

function buildTableHTML(slide) {
    const headers = slide.table_headers || [];
    const rows = slide.table_rows || [];

    const headerCells = headers.map(h => `<th>${escHtml(String(h))}</th>`).join("");
    const dataRows = rows.map((row, ri) => {
        const cells = row.map(c => `<td>${escHtml(String(c))}</td>`).join("");
        return `<tr class="${ri % 2 === 0 ? "even" : "odd"}">${cells}</tr>`;
    }).join("");

    const tableCSS = `
        ${BASE_CSS}
        body { justify-content: flex-start; }
        h1 { font-size: 70px; text-align: center; }
        .table-wrap {
            width: 100%;
            overflow: hidden;
            animation: slideUp 0.6s ease-out 0.1s both;
            animation-play-state: paused;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 32px;
        }
        th {
            background-color: #0052CC;
            color: #FFFFFF;
            padding: 22px 30px;
            text-align: center;
            font-weight: bold;
            border: 1px solid #1a3a6e;
        }
        td {
            padding: 18px 30px;
            text-align: center;
            color: #E0E0E0;
            border: 1px solid #333;
        }
        tr.even { background-color: #2A2A2A; }
        tr.odd  { background-color: #222222; }
    `;

    return wrapHTML(`
        <div class="header"></div>
        <h1 class="centered">${escHtml(slide.heading)}</h1>
        <div class="table-wrap">
            <table>
                <thead><tr>${headerCells}</tr></thead>
                <tbody>${dataRows}</tbody>
            </table>
        </div>
    `, tableCSS);
}


// ─── CHART slide ─────────────────────────────────────────────────────────────

function buildChartHTML(slide) {
    const rawChartType = (slide.chart_type || "bar").toLowerCase();
    // Normalize chart type to prevent Chart.js from crashing on types like 'column'
    const chartType = rawChartType === "pie" ? "pie" :
                      rawChartType === "line" ? "line" :
                      rawChartType === "doughnut" ? "doughnut" : "bar";

    const labels = JSON.stringify((slide.chart_labels || []).map(String));
    const palette = ["#4DA6FF","#FF6B6B","#6BCB77","#FFD93D","#C77DFF","#FF9A3C","#00B4D8","#F72585"];

    const datasets = JSON.stringify((slide.chart_datasets || []).map((ds, i) => {
        const dataValues = (ds.data || []).map(v => Number(v) || 0);
        
        // For pie/doughnut, we must provide an array of colors corresponding to each data point
        let backgroundColor, borderColor;
        if (chartType === "pie" || chartType === "doughnut") {
            backgroundColor = dataValues.map((_, idx) => palette[idx % palette.length]);
            borderColor = "#1E1E1E"; // dark borders for slices
        } else {
            const color = palette[i % palette.length];
            backgroundColor = chartType === "line" ? color + "33" : color;
            borderColor = color;
        }

        return {
            label: ds.label || "Series",
            data: dataValues,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: chartType === "line" ? 3 : (chartType === "pie" || chartType === "doughnut" ? 2 : 1),
            fill: chartType === "line",
            tension: 0.4,
            pointRadius: 6,
            pointHoverRadius: 8
        };
    }));

    const chartCSS = `
        ${BASE_CSS}
        body { justify-content: flex-start; padding-bottom: 60px; }
        h1 { font-size: 70px; text-align: center; }
        .chart-wrap {
            width: 100%;
            flex: 1;
            animation: slideUp 0.6s ease-out 0.1s both;
            animation-play-state: paused;
        }
        canvas { display: block; margin: 0 auto; }
    `;

    return wrapHTML(`
        <div class="header"></div>
        <h1 class="centered">${escHtml(slide.heading)}</h1>
        <div class="chart-wrap">
            <canvas id="myChart" width="1720" height="740"></canvas>
        </div>
        <script>${CHARTJS_INLINE}<\/script>
        <script>
            {
                const ctx = document.getElementById('myChart').getContext('2d');
                new Chart(ctx, {
                type: ${JSON.stringify(chartType)},
                data: {
                    labels: ${labels},
                    datasets: ${datasets}
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: { color: '#AAAAAA', font: { size: 24 } }
                        }
                    },
                    scales: ${(chartType === "pie" || chartType === "doughnut") ? "undefined" : `{
                        x: {
                            ticks: { color: '#AAAAAA', font: { size: 22 } },
                            grid:  { color: '#333333' }
                        },
                        y: {
                            ticks: { color: '#AAAAAA', font: { size: 22 } },
                            grid:  { color: '#333333' }
                        }
                    }`}
                }
            });
            }
        <\/script>
    `, chartCSS);
}


// ─── IMAGE slide ─────────────────────────────────────────────────────────────

function buildImageHTML(slide, outputDir) {
    const imgPath = path.join(outputDir, `ai_image_${slide.slide_number}.jpg`);
    let imgTag = "";
    if (fs.existsSync(imgPath)) {
        const b64 = fs.readFileSync(imgPath).toString("base64");
        imgTag = `<img src="data:image/jpeg;base64,${b64}" class="ai-image" alt="slide image">`;
    } else {
        imgTag = `<div class="img-placeholder">[ Image unavailable ]</div>`;
    }

    const bullets = (slide.bullet_points || [])
        .map((bp, i) => `<li style="animation-delay: ${1.0 + i * 0.3}s">${escHtml(bp)}</li>`)
        .join("");

    const imageCSS = `
        ${BASE_CSS}
        body { justify-content: flex-start; }
        h1 { font-size: 70px; text-align: center; }
        .ai-image {
            width: 100%;
            max-height: 640px;
            object-fit: contain;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.7);
            animation: slideUp 0.6s ease-out 0.1s both;
            animation-play-state: paused;
        }
        .img-placeholder {
            width: 100%; height: 400px;
            background: #2A2A2A; border: 1px solid #444;
            border-radius: 20px; display: flex;
            align-items: center; justify-content: center;
            color: #888; font-size: 36px;
        }
        .image-wrap { width: 100%; }
        ul.sub {
            font-size: 36px;
            line-height: 1.5;
            color: #AAAAAA;
            width: 100%;
            padding-left: 60px;
            margin-top: 20px;
        }
    `;

    return wrapHTML(`
        <div class="header"></div>
        <h1 class="centered">${escHtml(slide.heading)}</h1>
        <div class="image-wrap">${imgTag}</div>
        ${bullets ? `<ul class="sub">${bullets}</ul>` : ""}
    `, imageCSS);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapHTML(body, css) {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>${css}</style>
    </head>
    <body>${body}</body>
    </html>`;
}

function generateSlideHTML(slide, outputDir) {
    const slideType = (slide.slide_type || "default").toLowerCase();
    if (slideType === "table")  return buildTableHTML(slide);
    if (slideType === "chart")  return buildChartHTML(slide);
    if (slideType === "image")  return buildImageHTML(slide, outputDir);
    return buildDefaultHTML(slide, outputDir);
}

// ─── Video helpers ────────────────────────────────────────────────────────────

function createSequenceClip(framePattern, audioPath, outputPath, fps, audioDuration) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(framePattern)
            .inputFPS(fps)
            .input(audioPath)
            .outputOptions([
                "-c:v libx264",
                "-pix_fmt yuv420p",
                "-c:a aac",
                "-b:a 192k",
                `-t ${audioDuration}`,
                `-vf tpad=stop_mode=clone:stop_duration=${Math.ceil(audioDuration)}`
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

// ─── Main export ──────────────────────────────────────────────────────────────

export async function createCrossPlatformVideo(slides, tmpDir, finalVideoPath) {
    console.log("📸 Generating Animated Slide Frames and rendering Video...");

    const clipsDir = path.join(tmpDir, "clips");
    if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    await page.setViewport({ width: 1920, height: 1080 });

    const clipPaths = [];
    const fps = 15;
    const animationDuration = 4.0;
    const animatedFrames = Math.floor(fps * animationDuration);

    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const slideType = (slide.slide_type || "default").toLowerCase();
        const html = generateSlideHTML(slide, tmpDir);

        // All slide types use "load" — Chart.js is inlined so no network requests are made
        await page.setContent(html, { waitUntil: "load" });

        // CRITICAL: wait for 2 full render cycles after setContent.
        // - Cycle 1: browser computes layout + registers CSS animations in the WAAPI
        // - Cycle 2: browser paints canvas elements (Chart.js draws on canvas in rAF)
        // Without this, document.getAnimations() returns [] and canvas stays blank.
        await page.evaluate(() => new Promise(resolve =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
        ));

        // For chart slides, also ensure Chart.js has fully rendered on the canvas
        if (slideType === "chart") {
            await page.evaluate(() => new Promise(resolve =>
                requestAnimationFrame(() => requestAnimationFrame(resolve))
            ));
        }

        console.log(`📸 Capturing ${animatedFrames} frames for Slide ${slide.slide_number} (${slideType})...`);
        const framePattern = path.join(clipsDir, `slide_${slide.slide_number}_frame_%04d.png`);

        for (let f = 1; f <= animatedFrames; f++) {
            const framePath = path.join(clipsDir, `slide_${slide.slide_number}_frame_${f.toString().padStart(4, "0")}.png`);

            await page.evaluate((timeMs) => {
                // Advance ALL CSS animations (bullets, heading, table, chart-wrap fadeIn, etc.)
                document.getAnimations().forEach(anim => { anim.currentTime = timeMs; });

                // For chart slides: the canvas itself is not CSS-animated, but it lives inside
                // .chart-wrap which has a fadeIn. Force a style flush so the opacity update
                // is applied to the canvas container before the screenshot.
                document.body.offsetHeight; // trigger reflow
            }, (f / fps) * 1000);

            await page.screenshot({ path: framePath });
        }


        console.log(`🎬 Rendering Animated Clip ${slide.slide_number} (${slide.audioDuration.toFixed(2)}s)...`);
        const clipPath = path.join(clipsDir, `clip_${slide.slide_number}.mp4`);
        await createSequenceClip(framePattern, slide.audioPath, clipPath, fps, slide.audioDuration);
        clipPaths.push(clipPath);
    }

    await browser.close();

    console.log("🎞️ Merging all clips into Final Video...");
    await mergeClips(clipPaths, finalVideoPath);

    console.log(`✅ Final Video successfully rendered to ${finalVideoPath}`);
    return finalVideoPath;
}
