import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import fs from 'fs';
import path from 'path';

// Set FFmpeg and FFprobe paths from static binaries
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMediaDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration);
        });
    });
}

// ─── Phase 1: Create individual segment clips ────────────────────────────────

/**
 * Creates one segment's clip:
 *   - Stock video scaled to 1920x1080
 *   - Looped if shorter than narration
 *   - Trimmed to match narration duration
 *   - Smooth fade-in at start, fade-out at end
 *   - Voiceover audio replaces stock video audio
 *   - NO text overlays — clean cinematic footage only
 */
async function createSegmentClip(segment, tmpDir, fps, index, totalSegments) {
    const { videoPath, audioPath } = segment;
    const clipPath = path.join(tmpDir, `clip_${index}.mp4`);

    // Get the narration duration
    let duration = segment.audioDuration || 5;
    if (!segment.audioDuration && audioPath && fs.existsSync(audioPath)) {
        duration = await getMediaDuration(audioPath);
    }

    const hasVideo = videoPath && fs.existsSync(videoPath);
    let stockDuration = 0;
    if (hasVideo) {
        stockDuration = await getMediaDuration(videoPath);
    }

    const fadeDuration = 0.25; // Shorter fade for tighter professional edits

    console.log(`   🎬 [${index + 1}/${totalSegments}] Compositing Segment ${index + 1} (${Number(duration).toFixed(1)}s)...`);

    return new Promise((resolve, reject) => {
        let command = ffmpeg();
        
        let audioInputIndex = -1;
        let videoStreamLabel = '[0:v]';
        let filterChains = [];
        
        if (hasVideo) {
            if (stockDuration < duration) {
                // Ping-pong looping logic (forward, reverse, forward...)
                let cycles = Math.ceil(duration / stockDuration);
                cycles = Math.min(cycles, 15); // Cap to avoid memory bloat
                
                console.log(`      🏓 Ping-pong looping video ${cycles} times to match audio duration...`);
                
                for (let c = 0; c < cycles; c++) {
                    command.input(videoPath);
                }
                
                let concatLabels = "";
                for (let c = 0; c < cycles; c++) {
                    if (c % 2 === 1) {
                        filterChains.push(`[${c}:v]reverse[rev${c}]`);
                        concatLabels += `[rev${c}]`;
                    } else {
                        concatLabels += `[${c}:v]`;
                    }
                }
                
                filterChains.push(`${concatLabels}concat=n=${cycles}:v=1:a=0[rawvideo]`);
                videoStreamLabel = '[rawvideo]';
                audioInputIndex = cycles; // The audio file will be the next input appended
            } else {
                command.input(videoPath);
                videoStreamLabel = '[0:v]';
                audioInputIndex = 1;
            }
        } else {
            console.log(`      ⚠️ No stock video for Segment ${index + 1}, using gradient background`);
            command.input(`color=c=#0a0a0a:s=1920x1080:d=${duration}`).inputFormat('lavfi');
            videoStreamLabel = '[0:v]';
            audioInputIndex = 1;
        }

        // Add voiceover audio input
        if (audioPath && fs.existsSync(audioPath)) {
            command.input(audioPath);
        } else {
            audioInputIndex = -1;
        }

        // Visual processing chain
        filterChains.push(
            `${videoStreamLabel}scale=1920:1080:force_original_aspect_ratio=decrease[scaled]`,
            `[scaled]pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=black[padded]`,
            `[padded]eq=contrast=1.05:saturation=1.1[graded]`,
            `[graded]fps=${fps}[fpsed]`,
            `[fpsed]setpts=PTS-STARTPTS[ptsed]`,
            `[ptsed]fade=t=in:st=0:d=${fadeDuration}[fadin]`,
            `[fadin]fade=t=out:st=${Math.max(0, duration - fadeDuration)}:d=${fadeDuration}[finalv]`
        );

        // Audio processing chain
        let finalAudioLabel = '';
        if (audioInputIndex !== -1) {
            filterChains.push(
                `[${audioInputIndex}:a]afade=t=in:st=0:d=${fadeDuration}[ain]`,
                `[ain]afade=t=out:st=${Math.max(0, duration - fadeDuration)}:d=${fadeDuration}[finala]`
            );
            finalAudioLabel = '[finala]';
        }

        // Apply all filters
        command.complexFilter(filterChains);

        const outputOptions = [
            '-map', '[finalv]',
            '-t', `${duration}`,
            '-r', `${fps}`,
            '-c:v', 'libx264',
            '-crf', '20',
            '-preset', 'medium',
            '-pix_fmt', 'yuv420p',
            '-shortest',
            '-movflags', '+faststart'
        ];

        if (finalAudioLabel) {
            outputOptions.push('-map', finalAudioLabel, '-c:a', 'aac', '-b:a', '192k');
        }

        command
            .outputOptions(outputOptions)
            .save(clipPath)
            .on('end', () => {
                console.log(`      ✅ Segment ${index + 1} done`);
                resolve(clipPath);
            })
            .on('error', (err, stdout, stderr) => {
                console.error(`      ❌ Segment ${index + 1} failed: ${err.message}`);
                if (stderr) console.error(`      ${stderr.split('\n').slice(-3).join('\n')}`);
                reject(err);
            });
    });
}

// ─── Phase 2: Concatenate all clips ──────────────────────────────────────────

function concatenateClips(clipPaths, outputPath) {
    return new Promise((resolve, reject) => {
        const concatDir = path.dirname(outputPath);
        const concatListPath = path.join(concatDir, 'concat.txt');

        // FFmpeg concat demuxer format
        const concatContent = clipPaths
            .map(p => `file '${p.replace(/\\/g, '/')}'`)
            .join('\n');
        fs.writeFileSync(concatListPath, concatContent, 'utf8');

        console.log(`   🎞️ Merging ${clipPaths.length} clips into final video...`);

        ffmpeg()
            .input(concatListPath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .outputOptions(['-c', 'copy', '-movflags', '+faststart'])
            .save(outputPath)
            .on('end', () => {
                console.log(`   ✅ Final video assembled!`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error(`   ❌ Merge failed: ${err.message}`);
                reject(err);
            });
    });
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Composites all downloaded segments and voiceovers into the final video.
 *
 * Strategy: Clean cinematic footage + voiceover narration.
 *   - No text overlays (drawtext removed — looks unprofessional)
 *   - Each clip gets smooth fade-in/out for seamless transitions
 *   - High quality encoding (CRF 20, medium preset)
 *   - Segments processed in batches of 3 to balance speed and memory
 */
export async function composeVideo(segments, tmpDir, finalVideoPath) {
    const fps = parseInt(process.env.VIDEO_FPS) || 30;
    const clipPaths = [];

    console.log(`\n   🎬 Compositing ${segments.length} segments (clean footage + voiceover)...`);

    // Process segments in batches of 3
    for (let i = 0; i < segments.length; i += 3) {
        const batch = segments.slice(i, i + 3);
        const promises = batch.map((segment, batchIndex) =>
            createSegmentClip(segment, tmpDir, fps, i + batchIndex, segments.length)
        );
        const results = await Promise.all(promises);
        clipPaths.push(...results);
    }

    await concatenateClips(clipPaths, finalVideoPath);
    return finalVideoPath;
}
