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
    const baseStyle = "masterpiece, best quality, ultra-detailed, 8k uhd, cinematic lighting, photorealistic, sharp focus";
    let humanFraming = "extreme close-up portrait headshot, 85mm lens, sharp focus on face, hyper-detailed beautiful realistic face, flawless symmetrical eyes, perfect facial proportions, clear distinct features, depth of field";
    let textFraming = "close up shot, sharp focus on text, perfectly flat and clear, centered";
    let defaultFraming = (width >= height) ? "wide horizontal landscape, centered composition" : "epic scenic shot, expansive environment, perfectly proportioned, centered composition";
    
    let finalNeg = "nsfw, nude, naked, exposed, bare chest, stretching, stretched, elongated, distorted proportions, bobblehead, giant head, disproportionate, double body, double hands, extra hands, missing hands, double heads, extra limbs, disconnected limbs, twin, cloned, duplicate, mutated, ugly, poorly drawn face, deformed face, asymmetric face, cross-eyed, badly drawn hands, multiple people, out of frame, bad anatomy, malformed joints, deformed animal";

    let isPlural = lowerPrompt.includes('people') || lowerPrompt.includes('men') || lowerPrompt.includes('women') || lowerPrompt.includes('children') || lowerPrompt.includes('crowd') || lowerPrompt.includes('group') || lowerPrompt.includes('friends') || lowerPrompt.includes('couple');
    let isSingular = lowerPrompt.includes('person') || lowerPrompt.includes('man') || lowerPrompt.includes('woman') || lowerPrompt.includes('boy') || lowerPrompt.includes('girl') || lowerPrompt.includes('human') || lowerPrompt.includes('god');

    if (isPlural) {
        enhancedPrompt = `${prompt}, multiple distinct people, fully clothed, modest attire, cinematic medium shot, clear distinct faces, highly detailed, perfect human anatomy, ${baseStyle}`;
        finalNeg = finalNeg.replace(", multiple people", "");
    } else if (isSingular) {
        enhancedPrompt = `${prompt}, solo, 1boy/1girl, one distinct person, fully clothed, wearing detailed appropriate clothing, modest attire, ${humanFraming}, perfect human anatomy, stunningly beautiful realistic face, highly detailed face, flawless symmetrical features, ${baseStyle}`;
    } else if (lowerPrompt.includes('animal') || lowerPrompt.includes('dog') || lowerPrompt.includes('cat') || lowerPrompt.includes('bird') || lowerPrompt.includes('wildlife') || lowerPrompt.includes('creature')) {
        enhancedPrompt = `${prompt}, ${defaultFraming}, perfect animal anatomy, highly detailed fur and features, realistic, ${baseStyle}`;
    } else {
        enhancedPrompt = `${prompt}, ${defaultFraming}, ${baseStyle}`;
    }

    if (lowerPrompt.includes('text') || lowerPrompt.includes('sign') || lowerPrompt.includes('word') || lowerPrompt.includes('number') || lowerPrompt.includes('letter') || lowerPrompt.includes('writing')) {
        enhancedPrompt += `, ${textFraming}, clear legible text, correct spelling, perfectly formed letters and numbers, sharp typography, meaningful text`;
        finalNeg += ", gibberish, illegible, unreadable, bad spelling, scrambled letters, garbled text";
    } else {
        finalNeg += ", text, signature, watermark, letters, numbers, words, gibberish";
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
