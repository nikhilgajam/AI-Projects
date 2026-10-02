import { exec } from "child_process";
import util from "util";
import ffmpeg from "fluent-ffmpeg";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import path from "path";

const execAsync = util.promisify(exec);
ffmpeg.setFfprobePath(ffprobeStatic.path);

function getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration);
        });
    });
}

function normalizePercent(value, fallback) {
    const str = (value || fallback || "+0%").trim();
    if (/^[+-]/.test(str)) return str;
    return `+${str}`;
}

export async function generateAudioForSlides(slides, outputDir) {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    
    console.log("🎙️ Generating professional voiceover using edge-tts...");
    const voice = process.env.EDGE_TTS_VOICE || "en-US-ChristopherNeural"; // A good professional male voice
    const rate = normalizePercent(process.env.EDGE_TTS_RATE, "-5%"); // slightly slower for educational content
    const pitch = normalizePercent(process.env.EDGE_TTS_PITCH, "+0Hz");
    
    const updatedSlides = await Promise.all(slides.map(async (slide, i) => {
        const audioPath = path.join(outputDir, `slide_${slide.slide_number}.mp3`);
        const safeText = slide.narration_script.replace(/"/g, '\\"');
        const cmd = `edge-tts --voice "${voice}" --rate="${rate}" --pitch="${pitch}" --text "${safeText}" --write-media "${audioPath}"`;
        
        try {
            await execAsync(cmd);
            const duration = await getAudioDuration(audioPath);
            console.log(`   ✅ Slide ${slide.slide_number} Audio: ${duration.toFixed(2)}s`);
            return { ...slide, audioPath, audioDuration: duration };
        } catch (err) {
            console.error(`❌ Audio Error on Slide ${slide.slide_number}:`, err);
            throw err;
        }
    }));
    return updatedSlides;
}
