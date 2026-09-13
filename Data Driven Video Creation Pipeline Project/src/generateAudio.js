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

/**
 * Ensures a percent string (rate/volume) always has a leading + or - sign.
 * edge-tts strictly requires format: ^[+-]\d+%$
 * e.g.  "0%"  → "+0%"   "-5%" → "-5%"   "+10%" → "+10%"
 */
function normalizePercent(value, fallback) {
    const str = (value || fallback || "+0%").trim();
    // Already has sign
    if (/^[+-]/.test(str)) return str;
    // Missing sign — prepend +
    return `+${str}`;
}

/**
 * Ensures a Hz string (pitch) always has a leading + or - sign.
 * edge-tts strictly requires format: ^[+-]\d+Hz$
 * e.g.  "2Hz"  → "+2Hz"   "-2Hz" → "-2Hz"
 */
function normalizeHz(value, fallback) {
    const str = (value || fallback || "+0Hz").trim();
    if (/^[+-]/.test(str)) return str;
    return `+${str}`;
}

export async function generateAudioForSlides(slides, outputDir, voice = "en-US-AriaNeural") {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log("🎙️ Generating voiceovers for slides using edge-tts...");
    const updatedSlides = [];

    // Resolve and normalize all prosody settings once (outside the loop)
    const envVoice  = process.env.EDGE_TTS_VOICE  || voice;
    const rate      = normalizePercent(process.env.EDGE_TTS_RATE,   "-5%");
    const pitch     = normalizeHz(process.env.EDGE_TTS_PITCH,       "-2Hz");
    const volume    = normalizePercent(process.env.EDGE_TTS_VOLUME,  "+0%");

    console.log(`   Voice: ${envVoice} | Rate: ${rate} | Pitch: ${pitch} | Volume: ${volume}`);

    for (const slide of slides) {
        const audioFileName = `slide_${slide.slide_number}.mp3`;
        const audioFilePath = path.join(outputDir, audioFileName);

        // Escape double-quotes inside narration text for the shell command
        const safeText = slide.narration_script.replace(/"/g, '\\"');
        const command = `edge-tts --voice "${envVoice}" --rate="${rate}" --pitch="${pitch}" --volume="${volume}" --text "${safeText}" --write-media "${audioFilePath}"`;

        try {
            execSync(command, { stdio: "pipe" });
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
