const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const axios = require('axios');
const ffmpeg = require('ffmpeg-static');
require('dotenv').config();
const { getDevotionalData } = require('./devotionalBrain');

const COLAB_API_URL = process.env.COLAB_API_URL || "https://YOUR_NGROK_SUBDOMAIN.ngrok-free.app";
const OUTPUT_DIR = "devotional_outputs";
const FONTS_DIR = "fonts";

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function fetchAudioFromColab(prompt, totalDuration, vocalGender, outputPath) {
    console.log(`\n🎶 Requesting ${vocalGender.toUpperCase()} vocal track from Colab GPU in pieces...`);
    const url = `${COLAB_API_URL}/generate-song`;
    const CHUNK_SIZE = 15;
    const sessionId = Math.random().toString(36).substring(2, 15);
    let currentDuration = 0;
    const chunkFiles = [];
    let isFirst = true;
    let chunkIndex = 0;

    while (currentDuration < totalDuration) {
        const remaining = totalDuration - currentDuration;
        const duration = Math.min(CHUNK_SIZE, remaining);
        
        const payload = { 
            prompt, 
            duration, 
            vocal_gender: vocalGender,
            session_id: sessionId,
            is_first: isFirst
        };

        console.log(`   -> Generating chunk ${chunkIndex + 1} (${duration}s)...`);
        try {
            const response = await axios.post(url, payload, {
                responseType: 'arraybuffer',
                timeout: 300000 // 5 minutes
            });
            const chunkPath = outputPath.replace('.wav', `_chunk${chunkIndex}.wav`);
            fs.writeFileSync(chunkPath, response.data);
            chunkFiles.push(chunkPath);
            console.log(`      ✅ Saved chunk to ${chunkPath}`);
        } catch (error) {
            if (error.response && error.response.data) {
                const body = Buffer.from(error.response.data).toString('utf8');
                console.error(`❌ Server error ${error.response.status}: ${body}`);
            } else {
                console.error(`❌ Request error: ${error.message}`);
            }
            throw error;
        }

        currentDuration += duration;
        isFirst = false;
        chunkIndex++;
    }

    console.log(`\n🔄 Stitching ${chunkFiles.length} chunks into final audio...`);
    const listPath = outputPath.replace('.wav', '_concat_list.txt');
    const listContent = chunkFiles.map(f => `file '${path.basename(f)}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    const cmdArgs = [
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", path.basename(listPath),
        "-c", "copy",
        path.basename(outputPath)
    ];

    const result = spawnSync(ffmpeg, cmdArgs, { encoding: 'utf-8', cwd: path.dirname(outputPath) });
    
    if (result.status !== 0) {
        console.error(`❌ FFmpeg Audio Stitch Error:\n${result.stderr || result.error}`);
        throw new Error("FFmpeg audio stitching failed.");
    }
    
    console.log(`✅ Final audio stitched and saved to ${outputPath}`);

    fs.unlinkSync(listPath);
    for (const f of chunkFiles) {
        if (fs.existsSync(f)) fs.unlinkSync(f);
    }
}

function renderDevotionalVideo(imagePath, audioPath, outputMp4, titleText, duration, fontPath) {
    console.log(`\n🎬 Rendering final video with FFmpeg -> ${outputMp4}`);
    const fps = 25;
    const totalFrames = duration * fps;

    // Use forward slashes for font path to avoid ffmpeg escaping issues on Windows
    const safeFontPath = fontPath.replace(/\\/g, '/');

    const complexFilter = `[0:v]zoompan=z='min(zoom+0.001,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1280x720:fps=${fps}[bg];` +
        `[1:a]showwaves=s=1280x160:mode=cline:colors=0xFFD700@0.85[fg];` +
        `[bg][fg]overlay=x=0:y=H-h-30[bg_spec];` +
        `[bg_spec]drawtext=fontfile='${safeFontPath}':text='${titleText}':fontcolor=white:fontsize=36:box=1:boxcolor=black@0.5:boxborderw=10:x=(w-text_w)/2:y=50[outv]`;

    const cmdArgs = [
        "-y",
        "-loop", "1", "-i", imagePath,
        "-i", audioPath,
        "-filter_complex", complexFilter,
        "-map", "[outv]",
        "-map", "1:a",
        "-c:v", "libx264", "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-pix_fmt", "yuv420p",
        outputMp4
    ];

    const result = spawnSync(ffmpeg, cmdArgs, { encoding: 'utf-8' });

    if (result.status !== 0) {
        console.error(`❌ FFmpeg Error:\n${result.stderr || result.error}`);
        throw new Error("FFmpeg rendering failed.");
    }

    console.log(`✅ Output Video Ready: ${outputMp4}`);
}

function getTTSVoice(language, gender) {
    const isMale = gender === 'male';
    const lang = language.toLowerCase();
    if (lang === 'telugu') {
        return isMale ? 'te-IN-MohanNeural' : 'te-IN-ShrutiNeural';
    }
    return isMale ? 'hi-IN-MadhurNeural' : 'hi-IN-SwaraNeural';
}

function generateTTS(text, voice, outputPath) {
    console.log(`\n🗣️ Generating TTS Vocals with edge-tts (${voice})...`);
    const tempTextFile = path.join(path.dirname(outputPath), 'temp_lyrics.txt');
    fs.writeFileSync(tempTextFile, text, 'utf-8');
    
    const result = spawnSync("edge-tts", [
        "--voice", voice,
        "-f", tempTextFile,
        "--write-media", outputPath
    ], { encoding: 'utf-8' });
    
    if (fs.existsSync(tempTextFile)) {
        fs.unlinkSync(tempTextFile);
    }

    if (result.status !== 0) {
        console.error(`❌ TTS Error:\n${result.stderr || result.error}`);
        throw new Error("edge-tts generation failed.");
    }
    console.log(`✅ Saved TTS vocals to ${outputPath}`);
}

function mixAudio(vocalsPath, musicPath, outputPath) {
    console.log(`\n🎛️ Mixing Vocals with Instrumental Music...`);
    const cmdArgs = [
        "-y",
        "-i", vocalsPath,
        "-i", musicPath,
        "-filter_complex", "[0:a]volume=1.8[a0];[1:a]volume=0.8[a1];[a0][a1]amix=inputs=2:duration=longest[outa]",
        "-map", "[outa]",
        outputPath
    ];
    const result = spawnSync(ffmpeg, cmdArgs, { encoding: 'utf-8' });
    if (result.status !== 0) {
        console.error(`❌ Audio Mix Error:\n${result.stderr || result.error}`);
        throw new Error("FFmpeg audio mixing failed.");
    }
    console.log(`✅ Mixed audio saved to ${outputPath}`);
}

async function executePipeline(stotramName, language, vocalGender, imagePath, duration = 45) {
    console.log(`\n=== Starting Devotional Video Pipeline for '${stotramName}' (${language} - ${vocalGender}) ===\n`);

    console.log("🧠 Fetching AI Data from Devotional Brain...");
    const data = await getDevotionalData(stotramName, language);
    const titleNative = data.title_native || stotramName;
    const lyrics = data.lyrics_native || data.lyrics_transliterated || stotramName;
    console.log(`📄 Title Native: ${titleNative}`);

    const fontFile = language.toLowerCase() === "telugu" ? "fonts/NotoSansTelugu-Bold.ttf" : "fonts/NotoSansDevanagari-Bold.ttf";

    const baseName = `${stotramName.replace(/\s+/g, '_')}_${vocalGender}`;
    
    const instrumentalWav = path.join(OUTPUT_DIR, `${baseName}_instrumental.wav`);
    const ttsWav = path.join(OUTPUT_DIR, `${baseName}_vocals.wav`);
    const mixedWav = path.join(OUTPUT_DIR, `${baseName}_mixed.wav`);
    const outputMp4 = path.join(OUTPUT_DIR, `${baseName}_Final_Video.mp4`);

    // 1. Fetch Instrumental Music from Colab
    const musicPrompt = vocalGender === 'male' ? data.male_music_prompt : data.female_music_prompt;
    await fetchAudioFromColab(musicPrompt, duration, vocalGender, instrumentalWav);

    // 2. Generate TTS Vocals
    const ttsVoice = getTTSVoice(language, vocalGender);
    generateTTS(lyrics, ttsVoice, ttsWav);

    // 3. Mix Vocals and Instrumental
    mixAudio(ttsWav, instrumentalWav, mixedWav);

    // 4. Render Video using the Mixed Audio
    renderDevotionalVideo(imagePath, mixedWav, outputMp4, `${titleNative}`, duration, fontFile);

    console.log(`\n🎉 Pipeline Complete! Created ${vocalGender} video version successfully.`);
}

const readline = require('readline');
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

if (require.main === module) {
    (async () => {
        const defaultStotram = "Shiv Tandav Stotram";
        const stotramInput = await askQuestion(`Enter Stotram Name [default: ${defaultStotram}]: `);
        const STOTRAM = stotramInput.trim() || defaultStotram;

        const defaultLanguage = "Sanskrit";
        const languageInput = await askQuestion(`Enter Language (Sanskrit/Telugu/Hindi) [default: ${defaultLanguage}]: `);
        const LANGUAGE = languageInput.trim() || defaultLanguage;

        const defaultGender = "female";
        const genderInput = await askQuestion(`Enter Voice (male/female) [default: ${defaultGender}]: `);
        const GENDER = genderInput.trim().toLowerCase() || defaultGender;

        const DEITY_IMAGE = "image.jpg";

        if (fs.existsSync(DEITY_IMAGE)) {
            await executePipeline(STOTRAM, LANGUAGE, GENDER, DEITY_IMAGE, 45);
        } else {
            console.log(`⚠️ Please place a deity image at '${DEITY_IMAGE}' first.`);
        }
    })().catch(err => console.error(err));
}

module.exports = { executePipeline };
