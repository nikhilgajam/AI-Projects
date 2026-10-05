import { generateEducationalScript } from "./src/generateScript.js";
import { generateAudioForSlides } from "./src/generateAudio.js";
import { createWebVideo } from "./src/generateVideo.js";
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

async function main() {
    console.log("🎓 Welcome to the Deep Educational Video Creator");
    let topic = process.argv[2];
    
    if (!topic) {
        topic = await askQuestion("❓ Enter the educational topic (e.g., 'B Trees', 'System Design', 'Pointers in C'): ");
        if (!topic.trim()) {
            topic = "Introduction to Data Structures";
        }
    }

    console.log(`\n🚀 Starting Educational Video Pipeline for: "${topic}"`);
    console.log("This will generate a beginner-to-expert level visual explanation.\n");

    const startTime = Date.now();
    const uniqueId = startTime.toString();
    const tmpDir = path.join(process.cwd(), "tmp", uniqueId);
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const outputDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const safeTopic = topic.replace(/[^a-z0-9]/gi, '_').substring(0, 50).replace(/_+$/, '');

    try {
        // Step 1: Generate Deep Script & Visual Layouts via Gemini
        const videoData = await generateEducationalScript(topic, tmpDir);
        console.log(`✅ Script generated! (${videoData.slides.length} structured educational scenes)`);
        console.log(`   🏷️  Category: ${videoData.topic_category || 'General'} | Difficulty: ${videoData.difficulty_level || 'Mixed'}`);

        // (Metadata saving moved to end to calculate timestamps)

        // Step 2: Generate Audio (Edge-TTS)
        const audioDir = path.join(tmpDir, "audio_files");
        const slidesWithAudio = await generateAudioForSlides(videoData.slides, audioDir);

        // Step 3: Render HTML/CSS/JS Scenes into Video
        const rawVideoPath = path.join(tmpDir, "raw_video.mp4");
        await createWebVideo(slidesWithAudio, tmpDir, rawVideoPath, {
            topic: topic,
            topicCategory: videoData.topic_category
        });

        // Step 4: Add Background Music
        const finalVideoPath = path.join(outputDir, `${safeTopic}.mp4`);
        await addBackgroundMusic(rawVideoPath, finalVideoPath, tmpDir, { volume: 0.1 });

        // Step 5: Save High-Quality SEO Metadata
        let chaptersStr = "CHAPTERS:\n";
        let currentTime = 0;
        slidesWithAudio.forEach((slide) => {
            const m = Math.floor(currentTime / 60);
            const s = Math.floor(currentTime % 60);
            const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
            chaptersStr += `${timeStr} ${slide.title || slide.heading || slide.scene_type || "Scene"}\n`;
            currentTime += slide.audioDuration || 5;
        });

        let materialsStr = "📚 Free Study Materials & Resources:\n";
        if (videoData.study_materials && videoData.study_materials.length > 0) {
            videoData.study_materials.forEach((m, i) => {
                materialsStr += `${i+1}. ${m.title}: ${m.url}\n`;
            });
        } else {
            materialsStr += "1. FreeCodeCamp: https://www.freecodecamp.org/\n2. GitHub Topics: https://github.com/topics\n";
        }

        const metadataPath = path.join(outputDir, `${safeTopic}_Metadata.txt`);
        const metadataContent = `TITLE: ${videoData.youtube_title}

DESCRIPTION:
${videoData.youtube_description}

${chaptersStr}
${materialsStr}
Follow for more deep-dives into software architecture and tech.

TAGS: ${(videoData.tags || []).join(", ")}`;
        fs.writeFileSync(metadataPath, metadataContent);
        console.log(`✅ SEO Metadata saved.`);

        const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`\n🎉 Educational Video Complete in ${totalTime}s!`);
        console.log(`   📹 Video:    ${finalVideoPath}`);
        console.log(`   📝 Metadata: ${metadataPath}\n`);
    } catch (error) {
        console.error("❌ Pipeline Failed:", error);
    }
}

main();
