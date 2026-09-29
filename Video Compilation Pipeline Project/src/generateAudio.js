import { exec } from "child_process";
import util from "util";
import ffmpeg from "fluent-ffmpeg";

const execAsync = util.promisify(exec);
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
 */
function normalizePercent(value, fallback) {
    const str = (value || fallback || "+0%").trim();
    if (/^[+-]/.test(str)) return str;
    return `+${str}`;
}

/**
 * Ensures a Hz string (pitch) always has a leading + or - sign.
 * edge-tts strictly requires format: ^[+-]\d+Hz$
 */
function normalizeHz(value, fallback) {
    const str = (value || fallback || "+0Hz").trim();
    if (/^[+-]/.test(str)) return str;
    return `+${str}`;
}

export async function generateAudioForSegments(segments, outputDir, voice = "en-US-AriaNeural") {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log("🎙️ Generating voiceovers for segments using edge-tts...");

    const envVoice  = process.env.EDGE_TTS_VOICE  || voice;
    const rate      = normalizePercent(process.env.EDGE_TTS_RATE,   "-5%");
    const pitch     = normalizeHz(process.env.EDGE_TTS_PITCH,       "-2Hz");
    const volume    = normalizePercent(process.env.EDGE_TTS_VOLUME,  "+0%");

    console.log(`   Voice: ${envVoice} | Rate: ${rate} | Pitch: ${pitch} | Volume: ${volume}`);

    const updatedSegments = await Promise.all(segments.map(async (segment, i) => {
        const audioFileName = `segment_${segment.segment_number}.mp3`;
        const audioFilePath = path.join(outputDir, audioFileName);

        const safeText = segment.narration_script.replace(/"/g, '\\"');
        const command = `edge-tts --voice "${envVoice}" --rate="${rate}" --pitch="${pitch}" --volume="${volume}" --text "${safeText}" --write-media "${audioFilePath}"`;

        try {
            await execAsync(command);
            const duration = await getAudioDuration(audioFilePath);
            console.log(`✅ [${i + 1}/${segments.length}] Generated audio for Segment ${segment.segment_number} (${duration.toFixed(2)}s)`);
            return {
                ...segment,
                audioPath: audioFilePath,
                audioDuration: duration
            };
        } catch (error) {
            console.error(`❌ [${i + 1}/${segments.length}] Error generating TTS for Segment ${segment.segment_number}:`, error.message);
            throw error;
        }
    }));
    return updatedSegments;
}
