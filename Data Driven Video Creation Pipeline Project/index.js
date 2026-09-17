import { generateVideoData } from "./src/generateData.js";
import { generateAudioForSlides } from "./src/generateAudio.js";
import { createPresentation } from "./src/generatePPT.js";
import fs from "fs";
import path from "path";
import readline from "readline";

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

async function main() {
    let topic = process.argv[2];
    let duration = process.argv[3];
    
    if (!topic) {
        topic = await askQuestion("❓ Please enter the topic for your video presentation: ");
        if (!topic.trim()) {
            console.log("No topic entered. Defaulting to 'The Future of Artificial Intelligence'.");
            topic = "The Future of Artificial Intelligence";
        }
    }

    if (!duration) {
        duration = await askQuestion("❓ Please enter the preferred duration in seconds (Leave empty for optimal length): ");
    }

    console.log(`\n🚀 Starting Data-Driven Video Creation Pipeline for topic: "${topic}"`);
    if (duration.trim()) {
        console.log(`⏱️ Target duration: ${duration} seconds`);
    }

    const uniqueId = Date.now().toString();
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
        // Step 1: Brainstorm Script & SEO Data
        const videoData = await generateVideoData(topic, duration.trim(), tmpDir);
        console.log("✅ Script generated successfully!");
        
        // Save Metadata
        const metadataPath = path.join(outputDir, `${safeTopic}.txt`);
        const metadataContent = `TITLE: ${videoData.youtube_title}\n\nDESCRIPTION:\n${videoData.youtube_description}\n\TAGS: ${videoData.tags.join(", ")}`;
        fs.writeFileSync(metadataPath, metadataContent);
        console.log(`✅ YouTube Title & Description saved to ${metadataPath}`);

        // Step 2: Generate Audio
        const audioDir = path.join(tmpDir, "audio_files");
        const slidesWithAudio = await generateAudioForSlides(videoData.slides, audioDir);

        // Step 3: Generate Presentation (.pptx file)
        const pptPath = path.join(outputDir, `${safeTopic}.pptx`);
        await createPresentation(slidesWithAudio, pptPath, tmpDir);
        console.log(`✅ PPTX saved to ${pptPath}`);

        // Step 4: Record Presentation to MP4 (Cross-Platform via FFmpeg)
        const finalVideoPath = path.join(outputDir, `${safeTopic}.mp4`);
        const { createCrossPlatformVideo } = await import("./src/generateVideo.js");
        await createCrossPlatformVideo(slidesWithAudio, tmpDir, finalVideoPath);

        console.log(`\\n🎉 Pipeline Complete!\\n`);
    } catch (error) {
        console.error("❌ Pipeline Failed:", error);
    }
}

main();
