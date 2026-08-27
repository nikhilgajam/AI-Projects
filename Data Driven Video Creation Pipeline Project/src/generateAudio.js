import { execSync } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import path from "path";

ffmpeg.setFfprobePath(ffprobeStatic.path);

function getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                return reject(err);
            }
            resolve(metadata.format.duration);
        });
    });
}

export async function generateAudioForSlides(slides, outputDir, voice = "en-US-ChristopherNeural") {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log("🎙️ Generating voiceovers for slides using edge-tts...");
    const updatedSlides = [];

    for (const slide of slides) {
        const audioFileName = `slide_${slide.slide_number}.mp3`;
        const audioFilePath = path.join(outputDir, audioFileName);
        
        // Escape quotes for command line
        const safeText = slide.narration_script.replace(/"/g, '\\"');
        const envVoice = process.env.EDGE_TTS_VOICE || voice;
        const rate = process.env.EDGE_TTS_RATE || "+0%";
        const pitch = process.env.EDGE_TTS_PITCH || "+0Hz";
        const volume = process.env.EDGE_TTS_VOLUME || "+0%";
        const command = `edge-tts --voice "${envVoice}" --rate="${rate}" --pitch="${pitch}" --volume="${volume}" --text "${safeText}" --write-media "${audioFilePath}"`;
        
        try {
            execSync(command, { stdio: 'pipe' });
            const duration = await getAudioDuration(audioFilePath);
            updatedSlides.push({
                ...slide,
                audioPath: audioFilePath,
                audioDuration: duration
            });
            console.log(`✅ Generated audio for Slide ${slide.slide_number} (${duration.toFixed(2)}s)`);
        } catch (error) {
            console.error(`❌ Error generating TTS for Slide ${slide.slide_number}:`, error.message);
            throw error;
        }
    }
    return updatedSlides;
}
