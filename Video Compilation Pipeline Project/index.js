import { generateVideoData } from "./src/generateData.js";
import { downloadVideosForSegments } from "./src/videoDownloader.js";
import { generateAudioForSegments } from "./src/generateAudio.js";
import { composeVideo } from "./src/videoCompositor.js";
import { addBackgroundMusic } from "./src/backgroundMusic.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import readline from "readline";

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

    console.log(`\n🚀 Starting Video Compilation Pipeline for topic: "${topic}"`);
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
        // Step 1: Generate Script & SEO Data via Gemini
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📝 STEP 1/5: Generating script & SEO metadata via Gemini");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const videoData = await generateVideoData(topic, (duration || "").trim(), tmpDir);
        console.log("✅ Script generated successfully!");
        console.log(`   📝 ${videoData.segments.length} segments`);

        // Save SEO Metadata
        const metadataPath = path.join(outputDir, `${safeTopic}.txt`);
        const metadataContent = `TITLE: ${videoData.youtube_title}\n\nDESCRIPTION:\n${videoData.youtube_description}\n\nTAGS: ${videoData.tags.join(", ")}`;
        fs.writeFileSync(metadataPath, metadataContent);
        console.log(`✅ YouTube Title & Description saved to ${metadataPath}`);

        // Step 2: Download Stock Videos from Pexels
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🎬 STEP 2/5: Downloading stock videos from Pexels");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const segmentsWithVideos = await downloadVideosForSegments(videoData.segments, tmpDir);

        // Step 3: Generate Voiceover Audio (Edge-TTS)
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🎙️ STEP 3/5: Generating voiceover narration via Edge-TTS");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const audioDir = path.join(tmpDir, "audio_files");
        const segmentsWithAudio = await generateAudioForSegments(segmentsWithVideos, audioDir);

        // Step 4: Composite Video (FFmpeg)
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🎞️ STEP 4/5: Compositing video with overlays & transitions");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const rawVideoPath = path.join(tmpDir, `${safeTopic}_raw.mp4`);
        await composeVideo(segmentsWithAudio, tmpDir, rawVideoPath);

        // Step 5: Add Background Music
        console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🎵 STEP 5/5: Adding background music");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        const finalVideoPath = path.join(outputDir, `${safeTopic}.mp4`);
        await addBackgroundMusic(rawVideoPath, finalVideoPath, tmpDir);

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        const mins = Math.floor(totalTime / 60);
        const secs = (totalTime % 60).toFixed(1);
        const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

        console.log(`\n${"═".repeat(56)}`);
        console.log(`🎉 Pipeline Complete in ${timeStr}!`);
        console.log(`${"═".repeat(56)}`);
        console.log(`   📹 Video:    ${finalVideoPath}`);
        console.log(`   📝 Metadata: ${metadataPath}\n`);
    } catch (error) {
        console.error("❌ Pipeline Failed:", error);
    }
}

main();
