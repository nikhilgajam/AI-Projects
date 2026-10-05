import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { generateSlideHTML } from './src/educationalSceneBuilders.js';
import { THEME_CATEGORIES, THEMES } from './src/themeEngine.js';

async function generatePreviews() {
    console.log("🎨 Generating Theme Previews...");
    const outDir = path.join(process.cwd(), "output", "theme_previews");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    // 2560/1920 scale factor for crisp 1440p-style text
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2560/1920 });

    const categories = Object.keys(THEME_CATEGORIES);

    for (const category of categories) {
        console.log(`   📸 Capturing: ${category}`);
        const theme = THEMES[category];
        
        const slide = {
            scene_type: "mermaid_diagram",
            title: `${category.toUpperCase()} ARCHITECTURE`,
            mermaid_code: `graph TD
    Client((Client)) --> LB[Load Balancer]
    
    subgraph VPC [AWS Cloud - VPC]
        LB --> API{API Gateway}
        
        subgraph Public [Public Subnet]
            API --> Auth[Auth Service]
            API --> Web[Web Frontend]
        end
        
        subgraph Private [Private Subnet]
            Auth --> DB[(User DB)]
            Web --> Cache[(Redis Cache)]
        end
    end`
        };

        const context = {
            theme,
            slideIndex: 0,
            totalSlides: 10,
            topicCategory: category
        };

        const html = generateSlideHTML(slide, context);
        await page.setContent(html, { waitUntil: "load" });

        // Wait for fonts and skip to end of entrance animations
        
        if (html.includes('mermaidRendered')) {
            await page.waitForFunction('window.mermaidRendered === true', { timeout: 10000 }).catch(() => console.log('   ⚠️ Mermaid timeout'));
        }

        await page.evaluate(async () => {
            const fontWait = document.fonts.ready;
            const timeoutWait = new Promise(resolve => setTimeout(resolve, 5000));
            await Promise.race([fontWait, timeoutWait]);
            
            document.getAnimations().forEach(anim => {
                anim.currentTime = 2500; // Jump 2.5 seconds in (entrance finished)
                anim.pause();
            });
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        });

        const outPath = path.join(outDir, `${category}_preview.jpg`);
        await page.screenshot({ path: outPath, type: 'jpeg', quality: 95 });
    }

    await browser.close();
    console.log(`✅ Done! All 10 previews saved to: ${outDir}`);
}

generatePreviews();
