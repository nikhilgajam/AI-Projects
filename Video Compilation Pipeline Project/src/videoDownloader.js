import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Perform an HTTP/HTTPS GET request to a URL following redirects
 * and parse the response as JSON.
 */
function fetchJson(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const requestModule = parsedUrl.protocol === 'http:' ? http : https;

        const req = requestModule.get(url, { headers }, (res) => {
            const { statusCode } = res;

            if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
                // Follow redirect
                fetchJson(res.headers.location, headers).then(resolve).catch(reject);
                return;
            }

            if (statusCode !== 200) {
                reject(new Error(`Request Failed. Status Code: ${statusCode}`));
                res.resume(); // Consume response data to free up memory
                return;
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(rawData);
                    resolve(parsedData);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });
    });
}

/**
 * Download a file from a URL to a specified destination path.
 * Follows redirects.
 */
function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const requestModule = parsedUrl.protocol === 'http:' ? http : https;

        const req = requestModule.get(url, (res) => {
            const { statusCode } = res;

            if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
                // Follow redirect
                downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
                return;
            }

            if (statusCode !== 200) {
                reject(new Error(`Download Failed. Status Code: ${statusCode}`));
                res.resume();
                return;
            }

            const fileStream = fs.createWriteStream(destPath);
            res.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve(destPath);
            });

            fileStream.on('error', (err) => {
                fs.unlink(destPath, () => reject(err));
            });
        });

        req.on('error', (e) => {
            reject(e);
        });
    });
}

/**
 * Searches Pexels API for a video matching the query.
 */
async function searchPexelsVideo(query, apiKey, orientation, size) {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.pexels.com/videos/search?query=${encodedQuery}&per_page=5&orientation=${orientation}&size=${size}`;
    
    try {
        const data = await fetchJson(url, { Authorization: apiKey });
        if (data && data.videos && data.videos.length > 0) {
            return data.videos[0];
        }
    } catch (err) {
        console.warn(`Pexels API warning for query "${query}": ${err.message}`);
    }
    return null;
}

/**
 * Select the best MP4 file from a Pexels video object.
 */
function getBestVideoFile(video) {
    if (!video || !video.video_files || video.video_files.length === 0) {
        return null;
    }

    const mp4Files = video.video_files.filter(f => f.file_type === 'video/mp4');
    if (mp4Files.length === 0) return null;

    // Sort by width descending
    mp4Files.sort((a, b) => b.width - a.width);

    // Prefer files with width >= 2560 (1440p native)
    const qhdFiles = mp4Files.filter(f => f.width >= 2560);
    if (qhdFiles.length > 0) {
        return qhdFiles[0];
    }

    // Fallback to files with width >= 1920 (1080p, will be upscaled)
    const hdFiles = mp4Files.filter(f => f.width >= 1920);
    if (hdFiles.length > 0) {
        return hdFiles[0];
    }
    
    // If no HD, pick largest available
    return mp4Files[0];
}

/**
 * Downloads stock videos for each segment using the Pexels API.
 * @param {Array} segments Array of segment objects.
 * @param {string} tmpDir Directory to save the downloaded videos.
 * @returns {Promise<Array>} Updated segments array with videoPath.
 */
export async function downloadVideosForSegments(segments, tmpDir) {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) {
        throw new Error('PEXELS_API_KEY is not set in the environment variables.');
    }

    const orientation = process.env.VIDEO_ORIENTATION || 'landscape';
    const size = process.env.VIDEO_SIZE || 'medium';

    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    console.log(`📹 Downloading stock videos for ${segments.length} segments...`);

    const downloadPromises = segments.map(async (segment, index) => {
        const segmentNum = index + 1;
        const queries = segment.video_search_queries || [];
        let videoDownloaded = false;
        let successfulQuery = '';
        let destPath = null;

        for (const query of queries) {
            const video = await searchPexelsVideo(query, apiKey, orientation, size);
            
            if (video) {
                const bestFile = getBestVideoFile(video);
                
                if (bestFile && bestFile.link) {
                    destPath = path.join(tmpDir, `segment_${segmentNum}_video.mp4`);
                    try {
                        await downloadFile(bestFile.link, destPath);
                        videoDownloaded = true;
                        successfulQuery = query;
                        break; // Stop trying queries once a successful download occurs
                    } catch (err) {
                        console.warn(`Failed to download video for query "${query}": ${err.message}`);
                    }
                }
            }
        }

        if (videoDownloaded) {
            console.log(`✅ [${segmentNum}/${segments.length}] Downloaded video for Segment ${segmentNum} (query: "${successfulQuery}")`);
            return { ...segment, videoPath: destPath };
        } else {
            console.log(`⚠️ [${segmentNum}/${segments.length}] No video found for Segment ${segmentNum}`);
            return { ...segment, videoPath: null };
        }
    });

    return await Promise.all(downloadPromises);
}
