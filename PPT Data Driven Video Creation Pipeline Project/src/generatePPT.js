import pptxgen from "pptxgenjs";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

// Shared dark-theme background (matches HTML/video renderer)
const SLIDE_BG = "1E1E1E";

// ─── Utilities ────────────────────────────────────────────────────────────────

function fileToBase64(filePath) {
    return Buffer.from(fs.readFileSync(filePath)).toString("base64");
}

async function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith("https") ? https : http;
        const file = fs.createWriteStream(dest);
        protocol.get(url, (res) => {
            // Follow redirects (Pollinations uses 302)
            if (res.statusCode === 301 || res.statusCode === 302) {
                file.close();
                fs.unlink(dest, () => {});
                return downloadImage(res.headers.location, dest).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                file.close();
                fs.unlink(dest, () => {});
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            res.pipe(file);
            file.on("finish", () => file.close(resolve));
        }).on("error", (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

// ─── Slide builders ───────────────────────────────────────────────────────────

async function addDefaultSlide(pptx, slide, data, tmpDir, clipartSource) {
    // Explicitly set dark background on the slide object itself —
    // master bg alone is not always picked up by pptxgenjs for element rendering.
    slide.background = { color: SLIDE_BG };

    await addCliparts(slide, data, tmpDir, clipartSource);

    slide.addText(data.heading, {
        x: 0.5, y: 1.0, w: 9.0, h: 1.0,
        color: "FFFFFF", fontFace: "Arial", fontSize: 36, bold: true,
        isTextBox: true, align: "center",
        shadow: { type: "outer", color: "000000", blur: 3, offset: 2 }
    });

    const bullets = (data.bullet_points || []).map(bp => ({ text: bp, options: { bullet: true } }));
    if (bullets.length > 0) {
        slide.addText(bullets, {
            x: 0.5, y: 2.2, w: 6.0, h: 5.0,
            color: "E0E0E0", fontFace: "Arial", fontSize: 22,
            valign: "top", paraSpaceAfter: 8
        });
    }
}

function addTableSlide(pptx, slide, data) {
    slide.background = { color: SLIDE_BG };

    slide.addText(data.heading, {
        x: 0.3, y: 0.8, w: 9.4, h: 0.9,
        color: "FFFFFF", fontFace: "Arial", fontSize: 32, bold: true,
        align: "center",
        shadow: { type: "outer", color: "000000", blur: 3, offset: 2 }
    });

    const headers = data.table_headers || [];
    const rows = data.table_rows || [];

    if (headers.length === 0) {
        console.warn(`⚠️  Slide ${data.slide_number}: table_headers missing, skipping table.`);
        return;
    }

    const headerRow = headers.map(h => ({
        text: String(h),
        options: {
            bold: true, color: "FFFFFF",
            fill: { color: "0052CC" },
            align: "center", fontFace: "Arial", fontSize: 18, valign: "middle"
        }
    }));

    const dataRows = rows.map((row, ri) =>
        row.map(cell => ({
            text: String(cell),
            options: {
                color: "E0E0E0",
                fill: { color: ri % 2 === 0 ? "2A2A2A" : "252525" },
                align: "center", fontFace: "Arial", fontSize: 16, valign: "middle"
            }
        }))
    );

    const colW = 9.4 / Math.max(headers.length, 1);
    slide.addTable([headerRow, ...dataRows], {
        x: 0.3, y: 1.85, w: 9.4,
        rowH: 0.6,
        colW: headers.map(() => colW),
        border: { type: "solid", color: "444444", pt: 1 }
    });
}

function addChartSlide(pptx, slide, data) {
    slide.background = { color: SLIDE_BG };

    slide.addText(data.heading, {
        x: 0.3, y: 0.8, w: 9.4, h: 0.9,
        color: "FFFFFF", fontFace: "Arial", fontSize: 32, bold: true,
        align: "center",
        shadow: { type: "outer", color: "000000", blur: 3, offset: 2 }
    });

    const chartType = (data.chart_type || "bar").toLowerCase();
    const labels    = (data.chart_labels || []).map(String);
    const datasets  = data.chart_datasets || [];

    if (labels.length === 0 || datasets.length === 0) {
        console.warn(`⚠️  Slide ${data.slide_number}: chart data missing, skipping chart.`);
        return;
    }

    // Coerce all values to numbers — Gemini sometimes returns them as strings
    const chartData = datasets.map(ds => ({
        name:   String(ds.label || "Series"),
        labels: labels,
        values: (ds.data || []).map(v => Number(v) || 0)
    }));

    const PALETTE = ["4DA6FF","FF6B6B","6BCB77","FFD93D","C77DFF","FF9A3C","00B4D8","F72585"];
    const pptxType = chartType === "pie" ? "pie" : chartType === "line" ? "line" :
                     chartType === "doughnut" ? "doughnut" : "bar";

    slide.addChart(pptxType, chartData, {
        x: 0.5, y: 1.85, w: 9.0, h: 5.3,
        chartColors:        PALETTE.slice(0, Math.max(datasets.length, 1)),
        chartColorsOpacity: 90,
        showLegend:         datasets.length > 1,
        legendPos:          "b",
        legendFontSize:     13,
        showValue:          pptxType !== "line",
        dataLabelFontSize:  11,
        dataLabelColor:     "FFFFFF",
        valAxisLabelColor:  "DDDDDD",
        catAxisLabelColor:  "DDDDDD",
        valAxisLineColor:   "555555",
        catAxisLineColor:   "555555",
        plotAreaBkgdColor:  SLIDE_BG,
        chartAreaBkgdColor: SLIDE_BG,
        valGridLine: { style: "solid", color: "333333" }
    });
}

async function addImageSlide(pptx, slide, data, tmpDir) {
    slide.background = { color: SLIDE_BG };

    slide.addText(data.heading, {
        x: 0.3, y: 0.8, w: 9.4, h: 0.9,
        color: "FFFFFF", fontFace: "Arial", fontSize: 32, bold: true,
        align: "center",
        shadow: { type: "outer", color: "000000", blur: 3, offset: 2 }
    });

    const imagePrompt   = data.image_prompt || data.heading || "abstract technology concept";
    const encodedPrompt = encodeURIComponent(imagePrompt);
    // nologo=true + nofeed=true both suppress the Pollinations watermark
    const imageUrl  = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux&nofeed=true&nologo=true`;
    const imagePath = path.join(tmpDir, `ai_image_${data.slide_number}.jpg`);

    try {
        await downloadImage(imageUrl, imagePath);
        slide.addImage({ path: imagePath, x: 1.5, y: 1.85, w: 7.0, h: 3.94, sizing: { type: "contain" } });
    } catch (err) {
        console.error(`⚠️  Could not fetch AI image for slide ${data.slide_number}:`, err.message);
        slide.addShape("rect", { x: 1.5, y: 1.85, w: 7.0, h: 3.94, fill: { color: "2A2A2A" }, line: { color: "444444" } });
        slide.addText("[ Image unavailable ]", { x: 1.5, y: 3.4, w: 7.0, h: 0.8, color: "888888", fontFace: "Arial", fontSize: 18, align: "center" });
    }

    const bullets = (data.bullet_points || []).map(bp => ({ text: bp, options: { bullet: true } }));
    if (bullets.length > 0) {
        slide.addText(bullets, {
            x: 0.5, y: 5.9, w: 9.0, h: 1.2,
            color: "AAAAAA", fontFace: "Arial", fontSize: 14,
            valign: "top", paraSpaceAfter: 4
        });
    }
}

async function addCliparts(slide, data, tmpDir, clipartSource) {
    const keywords = Array.isArray(data.clipart_keywords)
        ? data.clipart_keywords : (data.clipart_keyword ? [data.clipart_keyword] : ["idea"]);
    const emojis = Array.isArray(data.clipart_emojis)
        ? data.clipart_emojis : (data.clipart_emoji ? [data.clipart_emoji] : ["💡"]);

    const n = Math.max(keywords.length, emojis.length);

    for (let j = 0; j < n; j++) {
        let clipartUrl = "", clipartExt = "";

        if (clipartSource === "twemoji" && emojis[j]) {
            const hex = Array.from(emojis[j])
                .map(c => c.codePointAt(0).toString(16))
                .filter(x => x !== "fe0f")
                .join("-");
            clipartUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${hex}.svg`;
            clipartExt = ".svg";
        } else {
            const kw = keywords[j] || keywords[0] || "idea";
            clipartUrl = `https://image.pollinations.ai/prompt/clipart%20of%20${encodeURIComponent(kw)}%20dark%20background?width=400&height=400&nologo=true&nofeed=true`;
            clipartExt = ".jpg";
        }

        const clipartPath = path.join(tmpDir, `clipart_${data.slide_number}_${j}${clipartExt}`);
        try {
            await downloadImage(clipartUrl, clipartPath);
            slide.addImage({
                path: clipartPath,
                x: 7.0, y: Math.min(1.0 + j * 2.6, 5.0), w: 2.5, h: 2.5,
                sizing: { type: "contain" }
            });
        } catch (err) {
            console.error(`⚠️  Clipart ${j} for slide ${data.slide_number} failed:`, err.message);
        }
    }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function createPresentation(slides, outputPath, tmpDir) {
    console.log("🎬 Assembling Presentation with Animations and Voice...");
    const pptx = new pptxgen();

    pptx.author  = "Automated Video Generator";
    pptx.company = "Data Driven Video Creation Pipeline";
    pptx.layout  = "LAYOUT_16x9";

    pptx.defineSlideMaster({
        title: "MASTER_SLIDE",
        background: { color: SLIDE_BG },
        objects: [
            { rect: { x: 0, y: 0, w: "100%", h: 0.7, fill: { color: "0052CC" } } },
            { text: { text: "Data Driven Video Creation Pipeline",
                options: { x: 0, y: 0, w: "100%", h: 0.7, color: "FFFFFF", align: "center", fontFace: "Arial", fontSize: 14 } } }
        ]
    });

    const clipartSource = process.env.CLIPART_SOURCE || "pollinations";

    for (const data of slides) {
        const slide     = pptx.addSlide({ masterName: "MASTER_SLIDE" });
        const slideType = (data.slide_type || "default").toLowerCase();

        // Embed audio
        if (data.audioPath && fs.existsSync(data.audioPath)) {
            slide.addMedia({ type: "audio", data: `data:audio/mp3;base64,${fileToBase64(data.audioPath)}`, x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
        }

        if (slideType === "table") {
            console.log(`📊 Building table slide ${data.slide_number}...`);
            addTableSlide(pptx, slide, data);
        } else if (slideType === "chart") {
            console.log(`📈 Building chart slide ${data.slide_number} (${data.chart_type || "bar"})...`);
            addChartSlide(pptx, slide, data);
        } else if (slideType === "image") {
            console.log(`🖼️  Building AI-image slide ${data.slide_number}...`);
            await addImageSlide(pptx, slide, data, tmpDir);
        } else {
            await addDefaultSlide(pptx, slide, data, tmpDir, clipartSource);
        }
    }

    await pptx.writeFile({ fileName: outputPath });
    console.log(`✅ Presentation saved to ${outputPath}`);
}
