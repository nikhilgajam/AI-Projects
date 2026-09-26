import { generateVideoData } from "./src/generateData.js";
import { generateAudioForSlides } from "./src/generateAudio.js";
import { addBackgroundMusic } from "./src/backgroundMusic.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import readline from "readline";
import https from "https";
import http from "http";

dotenv.config();

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

// ─── Clipart / AI Image Downloader ───────────────────────────────────────────

async function downloadImage(url, dest) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith("https") ? https : http;
        const file = fs.createWriteStream(dest);
        protocol.get(url, (res) => {
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

async function downloadCliparts(slides, tmpDir, clipartSource) {
    console.log(`🎨 Downloading clipart assets concurrently for ${slides.length} slides...`);
    const downloadPromises = [];

    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const keywords = Array.isArray(slide.clipart_keywords)
            ? slide.clipart_keywords : (slide.clipart_keyword ? [slide.clipart_keyword] : []);
        const emojis = Array.isArray(slide.clipart_emojis)
            ? slide.clipart_emojis : (slide.clipart_emoji ? [slide.clipart_emoji] : []);

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

            if (!clipartUrl) continue;

            const clipartPath = path.join(tmpDir, `clipart_${slide.slide_number}_${j}${clipartExt}`);
            downloadPromises.push(
                downloadImage(clipartUrl, clipartPath)
                    .then(() => console.log(`  🖼️  [${i + 1}/${slides.length}] Clipart ${j + 1} downloaded for slide ${slide.slide_number}`))
                    .catch(err => console.error(`⚠️  [${i + 1}/${slides.length}] Clipart ${j + 1} for slide ${slide.slide_number} failed:`, err.message))
            );
        }

        // Download AI images for "image" slide type
        if ((slide.slide_type || "").toLowerCase() === "image" && slide.image_prompt) {
            const imagePrompt = slide.image_prompt || slide.heading || "abstract technology concept";
            const encodedPrompt = encodeURIComponent(imagePrompt);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&model=flux&nofeed=true&nologo=true`;
            const imagePath = path.join(tmpDir, `ai_image_${slide.slide_number}.jpg`);
            
            downloadPromises.push(
                downloadImage(imageUrl, imagePath)
                    .then(() => console.log(`  📸  [${i + 1}/${slides.length}] AI image downloaded for slide ${slide.slide_number}`))
                    .catch(err => console.error(`⚠️  [${i + 1}/${slides.length}] AI image for slide ${slide.slide_number} failed:`, err.message))
            );
        }
    }
    
    await Promise.all(downloadPromises);
    console.log("✅ Clipart assets downloaded.");
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────

async function main() {
    let topic = process.argv[2];
    let duration = process.argv[3];

    if (!topic) {
        topic = await askQuestion("❓ Please enter the topic for your video: ");
        if (!topic.trim()) {
            console.log("No topic entered. Defaulting to 'The Future of Artificial Intelligence'.");
            topic = "The Future of Artificial Intelligence";
        }
    }

    if (!duration) {
        duration = await askQuestion("❓ Please enter the preferred duration in seconds (Leave empty for optimal length): ");
    }

    console.log(`\n🚀 Starting Web Data-Driven Video Creation Pipeline for topic: "${topic}"`);
    if (duration && duration.trim()) {
        console.log(`⏱️ Target duration: ${duration} seconds`);
    }

    const startTime = Date.now();
    const uniqueId = startTime.toString();
    const tmpDir = path.join(process.cwd(), "tmp", uniqueId);
    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    const outputDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Sanitize topic for filenames
    const safeTopic = topic.replace(/[^a-z0-9]/gi, '_').substring(0, 50).replace(/_+$/, '');

    try {
        // Step 1: Brainstorm Script & SEO Data via Gemini
        const videoData = await generateVideoData(topic, (duration || "").trim(), tmpDir);
        console.log("✅ Script generated successfully!");
        console.log(`   📝 ${videoData.slides.length} scenes | Themes: ${[...new Set(videoData.slides.map(s => s.scene_theme))].join(", ")}`);

        // Save SEO Metadata
        const metadataPath = path.join(outputDir, `${safeTopic}.txt`);
        const metadataContent = `TITLE: ${videoData.youtube_title}\n\nDESCRIPTION:\n${videoData.youtube_description}\n\nTAGS: ${videoData.tags.join(", ")}`;
        fs.writeFileSync(metadataPath, metadataContent);
        console.log(`✅ YouTube Title & Description saved to ${metadataPath}`);

        // Step 2: Download Clipart & AI Images
        const clipartSource = process.env.CLIPART_SOURCE || "twemoji";
        await downloadCliparts(videoData.slides, tmpDir, clipartSource);

        // Step 3: Generate Audio (Edge-TTS)
        const audioDir = path.join(tmpDir, "audio_files");
        const slidesWithAudio = await generateAudioForSlides(videoData.slides, audioDir);

        // Step 4: Render HTML/CSS/JS Scenes → Video
        const rawVideoPath = path.join(tmpDir, `${safeTopic}_raw.mp4`);
        const { createWebVideo } = await import("./src/generateVideo.js");
        await createWebVideo(slidesWithAudio, tmpDir, rawVideoPath);

        // Step 5: Add Background Music
        const finalVideoPath = path.join(outputDir, `${safeTopic}.mp4`);
        await addBackgroundMusic(rawVideoPath, finalVideoPath, tmpDir);

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const mins = Math.floor(totalTime / 60);
        const secs = (totalTime % 60).toFixed(1);
        const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        console.log(`\n🎉 Pipeline Complete in ${timeStr}!`);
        console.log(`   📹 Video:    ${finalVideoPath}`);
        console.log(`   📝 Metadata: ${metadataPath}\n`);
    } catch (error) {
        console.error("❌ Pipeline Failed:", error);
    }
}

main();
