import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

/**
 * Calls the Colab-hosted API to generate an image.
 */
async function generateColabImage(prompt, outputFile, width, height) {
    const colabUrl = (process.env.COLAB_API_URL || '').replace(/\/$/, '');
    if (!colabUrl) throw new Error('COLAB_API_URL not set in .env');

    // Aspect-ratio-aware scaling. SDXL-Turbo natively prefers ~512px. Generating at 1024px causes face deformation and cloned bodies.
    let w, h;
    if (width >= height) { w = 768; h = 512; }
    else                 { h = 768; w = 512; }

    console.log(`   -> [Colab SDXL-Turbo] ${w}x${h} — "${prompt.slice(0, 70)}..."`);
    
    let enhancedPrompt = prompt;
    const lowerPrompt = prompt.toLowerCase();
    
    // Simplified style for SDXL-Turbo (it degrades with too many tags)
    const baseStyle = "high quality, detailed, realistic";
    
    let isPlural = lowerPrompt.match(/(people|men|women|children|crowd|group|friends|couple)/);
    let isSingular = lowerPrompt.match(/(person|man|woman|boy|girl|human|god)/);

    if (isPlural) {
        enhancedPrompt = `${prompt}, ${baseStyle}`;
    } else if (isSingular) {
        enhancedPrompt = `${prompt}, highly detailed face, ${baseStyle}`;
    } else {
        enhancedPrompt = `${prompt}, ${baseStyle}`;
    }

    // Keep negative prompt short to avoid burning the image at CFG 1.5
    let finalNeg = "nsfw, nude, deformed, ugly, blurry, bad anatomy, bad proportions, watermark";

    if (lowerPrompt.match(/(text|sign|word|number|letter|writing)/)) {
        enhancedPrompt += `, clear legible text`;
    } else {
        finalNeg += ", text, watermark, signature";
    }

    const response = await fetch(`${colabUrl}/generate-image`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',   // bypass ngrok's HTML interstitial
        },
        body: JSON.stringify({ prompt: enhancedPrompt, negative_prompt: finalNeg, width: w, height: h, steps: 4, seed: -1 }),
        signal: AbortSignal.timeout(120_000),   // 2-minute timeout per image
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        throw new Error(`Colab API ${response.status}: ${errText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000) throw new Error('Colab returned empty/invalid image');

    await fs.writeFile(outputFile, buffer);
    console.log(`      [Success] Colab image saved to ${outputFile} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return outputFile;
}

async function main() {
    const rl = readline.createInterface({ input, output });

    try {
        console.log("=== Single Image Generator (Colab SDXL-Turbo) ===");
        
        // 1. Get Prompt
        const prompt = await rl.question("\nEnter image prompt: ");
        if (!prompt.trim()) {
            console.log("Prompt cannot be empty. Exiting.");
            return;
        }

        // 2. Format Selection
        const formatChoice = await rl.question("\nChoose format - [1] Square (1:1) [2] Landscape (16:9) [3] Portrait (9:16): ");
        let width = 1024;
        let height = 1024;
        
        if (formatChoice === '2') {
            width = 1920;
            height = 1080;
        } else if (formatChoice === '3') {
            width = 1080;
            height = 1920;
        }

        // 3. Output Filename
        const filename = await rl.question("\nEnter output filename (default: output.jpg): ");
        const finalFilename = filename.trim() || 'output.jpg';
        
        // Ensure save directory exists
        const outputDir = path.join(process.cwd(), 'save');
        await fs.mkdir(outputDir, { recursive: true });
        
        const outputFile = path.join(outputDir, finalFilename);

        console.log("\nGenerating...");
        await generateColabImage(prompt, outputFile, width, height);

    } catch (err) {
        console.error(`\n[!] Error: ${err.message}`);
    } finally {
        rl.close();
    }
}

main().catch(console.error);
