import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// ─── Download helper ─────────────────────────────────────────────────────────

async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith("https") ? https : http;
        const file = fs.createWriteStream(dest);
        protocol.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                file.close();
                fs.unlink(dest, () => {});
                return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
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

// ─── Local Music Library Manager ─────────────────────────────────────────────

function getRandomLocalMusic() {
    const baseDir = path.join(process.cwd(), "assets", "music");
    
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
        return null;
    }

    function getAudioFiles(dir) {
        let results = [];
        const list = fs.readdirSync(dir);
        for (const file of list) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat && stat.isDirectory()) {
                results = results.concat(getAudioFiles(fullPath));
            } else if (fullPath.endsWith(".mp3") || fullPath.endsWith(".wav") || fullPath.endsWith(".m4a")) {
                results.push(fullPath);
            }
        }
        return results;
    }

    const allFiles = getAudioFiles(baseDir);
    if (allFiles.length > 0) {
        return allFiles[Math.floor(Math.random() * allFiles.length)];
    }

    return null;
}

// ─── Media duration helper ───────────────────────────────────────────────────

function getMediaDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration);
        });
    });
}

// ─── Generate ambient background music using FFmpeg ──────────────────────────

async function generateAmbientMusic(outputPath, duration) {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(`anoisesrc=color=pink:duration=${Math.ceil(duration + 5)}:sample_rate=44100`)
            .inputFormat("lavfi")
            .audioFilters([
                "lowpass=f=180",
                "highpass=f=30",
                "volume=0.25",
            ])
            .outputOptions(["-c:a", "libmp3lame", "-b:a", "128k"])
            .save(outputPath)
            .on("end", () => resolve(outputPath))
            .on("error", reject);
    });
}

// ─── Main export: add background music to a video ────────────────────────────

export async function addBackgroundMusic(videoPath, outputPath, tmpDir) {
    const enabled = (process.env.BG_MUSIC_ENABLED || "true").toLowerCase();
    if (enabled !== "true") {
        console.log("🎵 Background music disabled (BG_MUSIC_ENABLED=false).");
        fs.copyFileSync(videoPath, outputPath);
        return outputPath;
    }

    const volume = Math.max(0, Math.min(1, parseFloat(process.env.BG_MUSIC_VOLUME || "0.08")));
    const source = (process.env.BG_MUSIC_SOURCE || "auto").toLowerCase();

    let musicPath = null;

    if (source === "local_library") {
        console.log(`🎵 Searching local music library (assets/music) for a random track...`);
        musicPath = getRandomLocalMusic();
        if (musicPath) {
            console.log(`🎵 Selected local track: "${path.basename(musicPath)}"`);
        } else {
            console.warn(`⚠️  No music found in 'assets/music/'. Falling back to generated ambient pad.`);
        }
    } else if (source === "file" && process.env.BG_MUSIC_PATH) {
        musicPath = process.env.BG_MUSIC_PATH;
        if (!fs.existsSync(musicPath)) {
            console.warn(`⚠️  BG_MUSIC_PATH not found: ${musicPath}. Falling back to ambient.`);
            musicPath = null;
        } else {
            console.log(`🎵 Using custom music file: ${musicPath}`);
        }
    } else if (source === "url" && process.env.BG_MUSIC_URL) {
        musicPath = path.join(tmpDir, "bg_music_download.mp3");
        try {
            console.log(`🎵 Downloading background music from URL...`);
            await downloadFile(process.env.BG_MUSIC_URL, musicPath);
            console.log(`✅ Music downloaded successfully.`);
        } catch (err) {
            console.warn(`⚠️  Failed to download music: ${err.message}. Falling back to ambient.`);
            musicPath = null;
        }
    }

    if (!musicPath) {
        console.log("🎵 Generating ambient background music...");
        musicPath = path.join(tmpDir, "bg_ambient.mp3");
        const videoDuration = await getMediaDuration(videoPath);
        await generateAmbientMusic(musicPath, videoDuration);
        console.log("✅ Ambient background music generated.");
    }

    console.log(`🎵 Mixing background music (volume: ${(volume * 100).toFixed(0)}%)...`);

    return new Promise((resolve, reject) => {
        const mixer = ffmpeg()
            .input(videoPath)
            .input(musicPath)
            .complexFilter([
                `[1:a]aloop=loop=-1:size=2e+09,volume=${volume}[bg]`,
                `[0:a][bg]amix=inputs=2:duration=first:dropout_transition=3[out]`
            ])
            .outputOptions([
                "-map", "0:v",
                "-map", "[out]",
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                "-shortest"
            ]);

        let lastLogTime = Date.now();
        mixer
            .on("progress", (progress) => {
                const now = Date.now();
                if (now - lastLogTime > 60000) {
                    console.log(`   ⏳ Mixing progress... [Time: ${progress.timemark}]`);
                    lastLogTime = now;
                }
            })
            .on("end", () => {
                console.log("✅ Background music mixed successfully.");
                resolve(outputPath);
            })
            .on("error", (err) => {
                console.error("⚠️  Music mixing failed:", err.message);
                console.log("   Falling back to video without background music.");
                fs.copyFileSync(videoPath, outputPath);
                resolve(outputPath);
            })
            .save(outputPath);
    });
}
