const fs = require('fs');
const path = require('path');
const axios = require('axios');

const FONTS_DIR = 'fonts';

const fontsToDownload = [
    {
        name: 'NotoSansDevanagari-Bold.ttf',
        url: 'https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf'
    },
    {
        name: 'NotoSansTelugu-Bold.ttf',
        url: 'https://github.com/google/fonts/raw/main/ofl/notosanstelugu/NotoSansTelugu%5Bwdth%2Cwght%5D.ttf'
    }
];

async function downloadFile(url, outputPath) {
    const writer = fs.createWriteStream(outputPath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function setup() {
    if (!fs.existsSync(FONTS_DIR)) {
        fs.mkdirSync(FONTS_DIR);
    }
    for (const font of fontsToDownload) {
        const filePath = path.join(FONTS_DIR, font.name);
        if (!fs.existsSync(filePath)) {
            console.log(`Downloading ${font.name}...`);
            await downloadFile(font.url, filePath);
            console.log(`${font.name} downloaded.`);
        } else {
            console.log(`${font.name} already exists.`);
        }
    }
}

setup().catch(console.error);
