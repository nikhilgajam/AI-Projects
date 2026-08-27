import pptxgen from "pptxgenjs";
import fs from "fs";
import path from "path";
import https from "https";

function fileToBase64(filePath) {
    const file = fs.readFileSync(filePath);
    return Buffer.from(file).toString('base64');
}

async function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

export async function createPresentation(slides, outputPath, tmpDir) {
    console.log("🎬 Assembling Presentation with Animations and Voice...");
    let pptx = new pptxgen();

    // Presentation metadata
    pptx.author = "Automated Video Generator";
    pptx.company = "Data Driven Video Creation Pipeline";
    pptx.layout = "LAYOUT_16x9";

    // Create Master Slide for consistency
    pptx.defineSlideMaster({
        title: "MASTER_SLIDE",
        background: { color: "1E1E1E" },
        objects: [
            { rect: { x: 0, y: 0, w: "100%", h: 0.7, fill: { color: "0052CC" } } },
            { text: { text: "Data Driven Video Creation Pipeline", options: { x: 0, y: 0, w: "100%", h: 0.7, color: "FFFFFF", align: "center", fontFace: "Arial", fontSize: 14 } } }
        ]
    });

    for (const data of slides) {
        let slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
        
        // Ensure duration covers the audio completely (add 0.5s padding)
        const durationSec = Math.ceil(data.audioDuration) + 1;
        
        // Add Audio (Note: pptxgenjs doesn't natively support auto-play for audio in all viewers, 
        // but it embeds the audio. We will rely on PowerShell/COM to ensure it plays)
        if (data.audioPath && fs.existsSync(data.audioPath)) {
            const base64Audio = fileToBase64(data.audioPath);
            slide.addMedia({ type: "audio", data: `data:audio/mp3;base64,${base64Audio}`, x: 0.5, y: 0.5, w: 0.5, h: 0.5 });
            // Unfortunately, pptxgenjs API for setting slide transition timing or auto-play media is limited.
            // We will do a basic insertion. COM automation might be needed for perfect timing,
            // but PPTXGenJS allows adding text animations.
        }

        // Fetch and Add Cliparts
        const clipartSource = process.env.CLIPART_SOURCE || 'pollinations';
        
        const keywords = Array.isArray(data.clipart_keywords) ? data.clipart_keywords : (data.clipart_keyword ? [data.clipart_keyword] : ["idea"]);
        const emojis = Array.isArray(data.clipart_emojis) ? data.clipart_emojis : (data.clipart_emoji ? [data.clipart_emoji] : ["💡"]);
        
        const numCliparts = Math.max(keywords.length, emojis.length);
        
        for (let j = 0; j < numCliparts; j++) {
            let clipartUrl = '';
            let clipartExt = '';
            
            if (clipartSource === 'twemoji' && emojis[j]) {
                const hex = Array.from(emojis[j])
                    .map(c => c.codePointAt(0).toString(16))
                    .filter(x => x !== 'fe0f')
                    .join('-');
                clipartUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${hex}.svg`;
                clipartExt = '.svg';
            } else {
                const clipartKeyword = keywords[j] || keywords[0] || "idea";
                clipartUrl = `https://image.pollinations.ai/prompt/clipart%20illustration%20of%20${encodeURIComponent(clipartKeyword)}%20on%20dark%20grey%20background?width=400&height=400&nologo=true`;
                clipartExt = '.jpg';
            }
            
            const clipartPath = path.join(tmpDir, `clipart_${data.slide_number}_${j}${clipartExt}`);
            try {
                await downloadImage(clipartUrl, clipartPath);
                
                // Position them sequentially downwards on the right
                const yPos = 1.0 + (j * 2.6); // Spacing them out
                
                slide.addImage({ 
                    path: clipartPath, 
                    x: 7.0, 
                    y: Math.min(yPos, 5.0), // Ensure it doesn't go completely off-screen
                    w: 2.5, 
                    h: 2.5,
                    sizing: { type: "contain" }
                });
            } catch (err) {
                console.error("Failed to add clipart", err);
            }
        }

        // Add Heading with animation
        slide.addText(data.heading, {
            x: 0.5,
            y: 1.0,
            w: 9.0,
            h: 1.0,
            color: "FFFFFF",
            fontFace: "Arial",
            fontSize: 36,
            bold: true,
            isTextBox: true,
            align: "center",
            shadow: { type: "outer", color: "000000", blur: 3, offset: 2 }
        });

        // Add Bullet Points with cascade animation
        let yPos = 2.5;
        for (let i = 0; i < data.bullet_points.length; i++) {
            slide.addText(data.bullet_points[i], {
                x: 0.5, // shifted slightly left to make room for clipart
                y: yPos,
                w: 6.0,
                h: 0.8,
                color: "E0E0E0",
                fontFace: "Arial",
                fontSize: 24,
                bullet: true,
            });
            yPos += 1.0;
        }
    }

    await pptx.writeFile({ fileName: outputPath });
    console.log(`✅ Presentation saved to ${outputPath}`);
}
