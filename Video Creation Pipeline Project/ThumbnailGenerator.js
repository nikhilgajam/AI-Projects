import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
    const args = process.argv.slice(2);
    
    let formatStr = args[0];
    let textFile = args[1];
    
    if (!formatStr) {
        formatStr = await askQuestion('Enter format (1 for Short 9:16, 2 for Regular 16:9): ');
    }
    
    if (!textFile) {
        textFile = await askQuestion('Enter the path to the text file containing the prompt: ');
    }
    
    rl.close();
    
    const format = parseInt(formatStr, 10);
    if (![1, 2].includes(format)) {
        console.error('Error: Format must be 1 (Short) or 2 (Regular)');
        process.exit(1);
    }
    let promptContent;
    
    try {
        promptContent = fs.readFileSync(textFile, 'utf8').trim();
    } catch (err) {
        console.error(`Error reading text file: ${err.message}`);
        process.exit(1);
    }
    
    if (!promptContent) {
        console.error('Error: Text file is empty.');
        process.exit(1);
    }
    
    const aspectRatio = format === 1 ? '9:16' : '16:9';
    const formatName = format === 1 ? 'YouTube Short' : 'Regular YouTube';
    
    const optimizedPrompt = `Create a high-definition, eye-catching, and vibrant ${formatName} thumbnail optimized for a large audience. The thumbnail should visually represent the following concept: ${promptContent}`;
    
    console.log(`Generating ${aspectRatio} thumbnail using model 'gemini-3.1-flash-lite-image'...`);
    console.log(`Prompt: ${optimizedPrompt}`);
    
    const GEMINI_API_KEY = process.env.GOOGLE_GENAI_API_KEY;
    
    if (!GEMINI_API_KEY) {
        console.error("\n❌ ERROR: GOOGLE_GENAI_API_KEY is not set in your .env file!");
        console.error("Please open .env and add your real Google Gemini API key.\n");
        process.exit(1);
    }

    try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: optimizedPrompt,
            config: {
                outputMimeType: 'image/jpeg',
                aspectRatio: aspectRatio
            }
        });
        
        const candidate = response.candidates && response.candidates[0];
        const part = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0];
        
        if (part && part.inlineData && part.inlineData.data) {
            const imageBase64 = part.inlineData.data;
            const outputBuffer = Buffer.from(imageBase64, 'base64');
            const outputPath = 'thumbnail.jpg';
            fs.writeFileSync(outputPath, outputBuffer);
            console.log(`Success! Thumbnail saved to ${outputPath}`);
        } else {
            console.error('Failed to generate image: Unexpected response format.');
            console.error(JSON.stringify(response, null, 2));
        }
    } catch (error) {
        console.error('Error generating image:', error);
    }
}

main();
