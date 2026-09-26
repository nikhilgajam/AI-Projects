export const AVAILABLE_THEMES = [
    "glassmorphism", "neon", "gradient", "particles", "minimal",
    "cinematic", "retro", "aurora", "geometric", "watercolor",
    "cyberpunk", "synthwave", "dark_elegance", "tech_circuit", "smoke",
    "spotlight", "blueprint", "holographic", "galaxy", "sunset_glow",
    "ocean_depth", "forest_canopy", "volcanic", "frost", "marble_luxury",
    "parchment", "chalkboard", "terminal_green", "comic_pop", "art_deco",
    "brutalist", "pastel_soft", "vaporwave", "wireframe", "topographic",
    "crystal", "industrial", "sakura", "matrix_rain", "vintage_sepia",
    "stained_glass", "origami", "arctic", "zen_garden", "mosaic_tile",
    "deep_space", "prism_rainbow", "ink_brush", "carbon_fiber", "electric_storm"
];

export function hexToRGB(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r},${g},${b}`;
}

export function shiftHue(hex, degrees) {
    const h = hex.replace('#', '');
    let r = parseInt(h.substring(0, 2), 16) / 255;
    let g = parseInt(h.substring(2, 4), 16) / 255;
    let b = parseInt(h.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let hue, s, l = (max + min) / 2;
    if (max === min) { hue = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: hue = ((b - r) / d + 2) / 6; break;
            case b: hue = ((r - g) / d + 4) / 6; break;
        }
    }
    hue = (hue * 360 + degrees) % 360;
    if (hue < 0) hue += 360;
    hue /= 360;
    function hue2rgb(p, q, t) {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    }
    let rr, gg, bb;
    if (s === 0) { rr = gg = bb = l; }
    else {
        const q2 = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q2;
        rr = hue2rgb(p, q2, hue + 1/3);
        gg = hue2rgb(p, q2, hue);
        bb = hue2rgb(p, q2, hue - 1/3);
    }
    const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0');
    return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`;
}

export function getBaseCSS(accent) {
    return `
        @keyframes headingIn {
            from { opacity: 0; transform: translateY(-40px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes accentLine {
            from { opacity: 0; width: 0; }
            to   { opacity: 1; }
        }
        @keyframes clipartPop {
            0%   { opacity: 0; transform: scale(0.3) rotate(-10deg); }
            70%  { opacity: 1; transform: scale(1.08) rotate(2deg); }
            100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes sceneExit {
            0% { opacity: 1; transform: scale(1); filter: blur(0px); }
            100% { opacity: 0; transform: scale(0.95); filter: blur(10px); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            width: 1920px; height: 1080px;
            color: #FFFFFF;
            font-family: 'Segoe UI', -apple-system, system-ui, sans-serif;
            display: flex; align-items: center; justify-content: center;
            position: relative; overflow: hidden;
        }
        body.is-exiting {
            animation: sceneExit 0.8s ease-in forwards !important;
        }
        .scene-card {
            width: 1720px; min-height: 880px;
            display: flex; flex-direction: column; justify-content: flex-start;
        }
        h1 {
            font-size: 72px; font-weight: 700; line-height: 1.15;
            margin-bottom: 10px;
            animation: headingIn 0.8s ease-out both;
        }
        .accent-line {
            animation: accentLine 0.6s ease-out 0.3s both;
        }
        ul { font-size: 44px; line-height: 1.55; list-style: none; padding-left: 0; }
        li {
            padding: 12px 0; color: #ddd;
            display: flex; align-items: flex-start; gap: 18px;
        }
        li::before {
            content: '▸'; color: ${accent};
            font-size: 36px; flex-shrink: 0; margin-top: 4px;
        }
        .content-wrapper {
            display: flex; width: 100%; gap: 40px;
            align-items: flex-start; flex: 1;
        }
        .text-col { flex: 1; }
        .clipart-col {
            width: 340px; display: flex; flex-direction: column;
            gap: 24px; align-items: center; justify-content: center;
        }
        .clipart {
            width: 280px; height: 200px; object-fit: contain;
            border-radius: 16px; opacity: 0;
            animation: clipartPop 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }
        .twemoji { background: transparent; box-shadow: none; border-radius: 0; }
    `;
}

export function getThemeCSS(themeName, accentColor) {
    const accent = accentColor || '#4DA6FF';
    const rgbAccent = hexToRGB(accent);
    const compAccent = shiftHue(accent, 180);
    const analAccent1 = shiftHue(accent, 30);
    const analAccent2 = shiftHue(accent, -30);

    let css = '';
    
    switch (themeName) {
        case 'glassmorphism':
            css = `
                body { background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); }
                .scene-card { background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; padding: 50px 60px; box-shadow: 0 8px 32px rgba(0,0,0,0.37); }
                h1 { color: ${accent}; text-shadow: 0 0 30px rgba(${rgbAccent}, 0.27); }
                .accent-line { width: 120px; height: 4px; background: linear-gradient(90deg, ${accent}, transparent); border-radius: 2px; margin-bottom: 40px; }
            `;
            break;
        case 'neon':
            css = `
                body { background: #0a0a0a; }
                .scene-card { background: #111; border: 2px solid ${accent}; border-radius: 4px; padding: 50px 60px; box-shadow: 0 0 15px rgba(${rgbAccent}, 0.4), inset 0 0 15px rgba(${rgbAccent}, 0.07); }
                h1 { color: #fff; text-shadow: 0 0 10px ${accent}, 0 0 40px rgba(${rgbAccent}, 0.53), 0 0 80px rgba(${rgbAccent}, 0.27); }
                .accent-line { width: 120px; height: 3px; background: ${accent}; box-shadow: 0 0 10px ${accent}, 0 0 20px rgba(${rgbAccent}, 0.53); margin-bottom: 40px; }
                li { text-shadow: 0 0 4px rgba(${rgbAccent}, 0.2); }
            `;
            break;
        case 'gradient':
            css = `
                body { background: #121212; }
                .scene-card { background: linear-gradient(180deg, rgba(${rgbAccent},0.05) 0%, rgba(18,18,18,0) 100%); border-top: 4px solid ${accent}; padding: 50px 60px; border-radius: 12px; }
                h1 { background: linear-gradient(90deg, ${accent}, ${compAccent}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .accent-line { width: 150px; height: 4px; background: linear-gradient(90deg, ${accent}, ${compAccent}); border-radius: 2px; margin-bottom: 40px; }
            `;
            break;
        case 'particles':
            css = `
                body { background: #1a1a2e; }
                body::before { content: ""; position: absolute; top:0; left:0; right:0; bottom:0; background-image: radial-gradient(${accent} 1px, transparent 1px), radial-gradient(${accent} 1px, transparent 1px); background-size: 50px 50px; background-position: 0 0, 25px 25px; opacity: 0.15; z-index: -1; }
                .scene-card { background: rgba(26,26,46,0.8); border: 1px dashed rgba(${rgbAccent},0.5); padding: 50px 60px; border-radius: 20px; }
                h1 { color: #fff; text-shadow: 2px 2px 0px ${accent}; }
                .accent-line { width: 80px; height: 6px; background: ${accent}; border-radius: 3px; margin-bottom: 40px; box-shadow: 0 0 10px ${accent}; }
            `;
            break;
        case 'minimal':
            css = `
                body { background: #111; color: #eee; }
                .scene-card { background: transparent; padding: 40px 20px; }
                h1 { font-weight: 900; letter-spacing: -1.5px; color: #fff; font-size: 84px; }
                .accent-line { width: 60px; height: 8px; background: ${accent}; margin-bottom: 50px; }
                li { border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 20px; margin-bottom: 10px; }
            `;
            break;
        case 'cinematic':
            css = `
                body { background: #000; }
                body::before, body::after { content: ""; position: absolute; left: 0; right: 0; height: 80px; background: #000; z-index: 10; }
                body::before { top: 0; }
                body::after { bottom: 0; }
                .scene-card { background: linear-gradient(to bottom, #111, #050505); padding: 70px 80px; border: 1px solid rgba(255,255,255,0.03); }
                h1 { text-transform: uppercase; letter-spacing: 4px; color: #f0f0f0; font-weight: 600; text-align: center; }
                .accent-line { width: 200px; height: 2px; background: ${accent}; margin: 0 auto 40px auto; }
            `;
            break;
        case 'retro':
            css = `
                body { background: #1a1a2e; }
                body::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 2px, transparent 2px, transparent 4px); pointer-events: none; z-index: 10; }
                .scene-card { background: #151525; padding: 50px 60px; border: 4px solid ${accent}; font-family: 'Courier New', monospace; box-shadow: 10px 10px 0 ${compAccent}; }
                h1 { color: ${accent}; text-transform: uppercase; text-shadow: 3px 3px 0px ${compAccent}; }
                .accent-line { width: 100%; height: 4px; background: ${accent}; margin-bottom: 40px; }
                li { font-family: 'Courier New', monospace; }
            `;
            break;
        case 'aurora':
            css = `
                body { background: #0b0f19; }
                body::before { content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, rgba(${rgbAccent},0.2), rgba(${hexToRGB(compAccent)},0.2), transparent); filter: blur(80px); transform: skewY(-15deg); z-index: -1; }
                .scene-card { background: rgba(255,255,255,0.03); border-radius: 30px; padding: 60px; box-shadow: inset 0 0 20px rgba(255,255,255,0.02); backdrop-filter: blur(10px); }
                h1 { color: #fff; font-weight: 300; letter-spacing: 1px; }
                .accent-line { width: 150px; height: 3px; background: linear-gradient(90deg, ${accent}, ${compAccent}); margin-bottom: 40px; border-radius: 3px; }
            `;
            break;
        case 'geometric':
            css = `
                body { background: #0d1117; }
                body::before { content: ""; position: absolute; inset: 0; background: linear-gradient(45deg, rgba(${rgbAccent},0.05) 25%, transparent 25%, transparent 75%, rgba(${rgbAccent},0.05) 75%, rgba(${rgbAccent},0.05)), linear-gradient(45deg, rgba(${rgbAccent},0.05) 25%, transparent 25%, transparent 75%, rgba(${rgbAccent},0.05) 75%, rgba(${rgbAccent},0.05)); background-size: 60px 60px; background-position: 0 0, 30px 30px; z-index: -1; }
                .scene-card { background: #161b22; border-left: 8px solid ${accent}; padding: 50px 60px; }
                h1 { color: #c9d1d9; }
                .accent-line { width: 80px; height: 8px; background: ${accent}; margin-bottom: 40px; }
            `;
            break;
        case 'watercolor':
            css = `
                body { background: #1a1520; }
                body::before { content: ""; position: absolute; top: -200px; left: -200px; width: 800px; height: 800px; background: radial-gradient(circle, rgba(${rgbAccent},0.3) 0%, transparent 70%); filter: blur(60px); z-index: -1; }
                body::after { content: ""; position: absolute; bottom: -200px; right: -200px; width: 800px; height: 800px; background: radial-gradient(circle, rgba(${hexToRGB(analAccent1)},0.3) 0%, transparent 70%); filter: blur(60px); z-index: -1; }
                .scene-card { background: rgba(255,255,255,0.02); padding: 60px; border-radius: 40px; }
                h1 { color: #fff; font-style: italic; font-weight: 400; }
                .accent-line { width: 100px; height: 2px; background: ${accent}; margin-bottom: 40px; opacity: 0.7; }
            `;
            break;
        case 'cyberpunk':
            css = `
                body { background: #050510; }
                body::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(${rgbAccent},0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(${rgbAccent},0.15) 1px, transparent 1px); background-size: 40px 40px; z-index: -1; }
                .scene-card { background: rgba(5,5,16,0.9); border: 2px solid ${accent}; padding: 50px 60px; box-shadow: -5px 5px 0 ${compAccent}; clip-path: polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%); }
                h1 { color: #fff; text-transform: uppercase; text-shadow: 2px 0 ${compAccent}, -2px 0 ${accent}; }
                .accent-line { width: 140px; height: 5px; background: ${accent}; margin-bottom: 40px; }
            `;
            break;
        case 'synthwave':
            css = `
                body { background: linear-gradient(to bottom, #2b1055 0%, #7597de 100%); }
                .scene-card { background: rgba(15,10,30,0.8); border-bottom: 4px solid ${accent}; border-top: 1px solid rgba(255,255,255,0.1); padding: 50px 60px; border-radius: 10px; box-shadow: 0 15px 35px rgba(0,0,0,0.5); }
                h1 { color: transparent; -webkit-text-stroke: 1px ${accent}; text-shadow: 0 0 10px rgba(${rgbAccent},0.5); font-style: italic; }
                .accent-line { width: 100%; height: 2px; background: linear-gradient(90deg, transparent, ${accent}, transparent); margin-bottom: 40px; }
            `;
            break;
        case 'dark_elegance':
            css = `
                body { background: #000; font-family: "Georgia", serif; }
                .scene-card { background: #050505; border: 1px solid #D4AF37; padding: 60px; border-radius: 0; }
                h1 { color: #D4AF37; font-weight: normal; font-family: "Georgia", serif; text-align: center; }
                .accent-line { width: 120px; height: 1px; background: #D4AF37; margin: 0 auto 40px auto; }
                li::before { color: #D4AF37; }
            `;
            break;
        case 'tech_circuit':
            css = `
                body { background: #0a0e17; }
                body::before { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(${rgbAccent},0.1) 1px, transparent 1px) 0 0 / 100px 100px, linear-gradient(rgba(${rgbAccent},0.1) 1px, transparent 1px) 0 0 / 100px 100px; z-index: -1; }
                .scene-card { background: #0d121c; border-left: 2px solid ${accent}; border-right: 2px solid ${accent}; padding: 50px 60px; }
                h1 { color: #fff; font-family: monospace; }
                .accent-line { width: 80px; height: 4px; background: ${accent}; margin-bottom: 40px; position: relative; }
                .accent-line::after { content: ""; position: absolute; right: -10px; top: -3px; width: 10px; height: 10px; background: ${accent}; border-radius: 50%; }
            `;
            break;
        case 'smoke':
            css = `
                body { background: #050505; }
                body::before { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(${rgbAccent},0.15) 0%, transparent 70%); filter: blur(40px); z-index: -1; }
                .scene-card { background: rgba(20,20,20,0.6); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px); border-radius: 15px; padding: 60px; box-shadow: 0 20px 40px rgba(0,0,0,0.8); }
                h1 { color: #fff; font-weight: 200; text-shadow: 0 0 20px rgba(255,255,255,0.3); }
                .accent-line { width: 100px; height: 1px; background: rgba(255,255,255,0.3); margin-bottom: 40px; }
            `;
            break;
        case 'spotlight':
            css = `
                body { background: #000; }
                body::before { content: ""; position: absolute; top: -10%; left: 50%; transform: translateX(-50%); width: 800px; height: 600px; background: radial-gradient(ellipse, rgba(${rgbAccent},0.25) 0%, transparent 70%); pointer-events: none; z-index: 10; }
                .scene-card { background: #111; padding: 60px; border-radius: 20px; z-index: 1; position: relative; }
                h1 { color: #fff; }
                .accent-line { width: 100px; height: 4px; background: ${accent}; margin: 0 auto 40px auto; border-radius: 2px; }
                .scene-card h1 { text-align: center; }
            `;
            break;
        case 'blueprint':
            css = `
                body { background: #0a1628; }
                body::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 20px 20px; z-index: -1; }
                .scene-card { background: transparent; border: 2px solid rgba(255,255,255,0.2); padding: 50px 60px; font-family: monospace; }
                h1 { color: #fff; text-transform: uppercase; font-weight: normal; }
                .accent-line { width: 100%; height: 2px; background: rgba(255,255,255,0.3); margin-bottom: 40px; }
                li::before { color: rgba(255,255,255,0.6); content: '+'; font-size: 40px; }
            `;
            break;
        case 'holographic':
            css = `
                body { background: #111; }
                .scene-card { background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); padding: 60px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 10px 30px rgba(${rgbAccent},0.2), inset 0 0 20px rgba(${hexToRGB(compAccent)},0.1); }
                h1 { background: linear-gradient(90deg, ${accent}, ${compAccent}, ${accent}); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .accent-line { width: 140px; height: 3px; background: linear-gradient(90deg, ${accent}, ${compAccent}); margin-bottom: 40px; }
            `;
            break;
        case 'galaxy':
            css = `
                body { background: #050510; }
                body::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(white 1px, transparent 1px), radial-gradient(white 1px, transparent 1px); background-size: 80px 80px, 120px 120px; background-position: 0 0, 40px 40px; opacity: 0.3; z-index: -1; }
                .scene-card { background: rgba(255,255,255,0.02); padding: 60px; border-radius: 50%; width: 900px; height: 900px; margin: auto; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0 0 100px rgba(${rgbAccent},0.2); }
                h1 { color: #fff; text-align: center; }
                .accent-line { width: 100px; height: 2px; background: ${accent}; margin: 0 auto 40px auto; }
            `;
            break;
        case 'sunset_glow':
            css = `
                body { background: linear-gradient(180deg, #ff7e5f, #feb47b, #2b1055); }
                .scene-card { background: rgba(0,0,0,0.4); padding: 60px; border-radius: 20px; backdrop-filter: blur(10px); }
                h1 { color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
                .accent-line { width: 150px; height: 5px; background: #fff; margin-bottom: 40px; opacity: 0.8; }
            `;
            break;
        case 'ocean_depth':
            css = `
                body { background: linear-gradient(to bottom, #001f3f, #001122); }
                body::before { content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: repeating-radial-gradient(circle at 50% 50%, rgba(${rgbAccent},0.1) 0%, transparent 5%, rgba(${rgbAccent},0.1) 10%); opacity: 0.3; filter: blur(10px); z-index: -1; }
                .scene-card { background: rgba(0,20,40,0.6); border: 1px solid rgba(0,100,200,0.3); padding: 60px; border-radius: 30px; }
                h1 { color: #e0f7fa; }
                .accent-line { width: 120px; height: 3px; background: ${accent}; margin-bottom: 40px; }
            `;
            break;
        case 'forest_canopy':
            css = `
                body { background: #0a140a; }
                body::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at top left, rgba(100,200,100,0.1), transparent 50%), radial-gradient(circle at bottom right, rgba(${rgbAccent},0.1), transparent 50%); z-index: -1; }
                .scene-card { background: rgba(15,25,15,0.8); border-top: 5px solid #2e7d32; padding: 60px; border-radius: 8px; }
                h1 { color: #a5d6a7; }
                .accent-line { width: 90px; height: 4px; background: #2e7d32; margin-bottom: 40px; }
            `;
            break;
        case 'volcanic':
            css = `
                body { background: #110000; }
                body::before { content: ""; position: absolute; bottom: 0; left: 0; width: 100%; height: 50%; background: linear-gradient(to top, rgba(200,50,0,0.2), transparent); z-index: -1; }
                .scene-card { background: #1a0505; border: 1px solid rgba(255,50,0,0.2); padding: 60px; border-radius: 12px; box-shadow: 0 10px 40px rgba(200,20,0,0.3); }
                h1 { color: #ff5722; text-transform: uppercase; }
                .accent-line { width: 110px; height: 5px; background: linear-gradient(to right, #ff5722, transparent); margin-bottom: 40px; }
                li::before { color: #ff5722; }
            `;
            break;
        case 'frost':
            css = `
                body { background: #0a1520; }
                .scene-card { background: rgba(255,255,255,0.03); backdrop-filter: blur(5px); border: 1px solid rgba(150,200,255,0.2); padding: 60px; border-radius: 15px; box-shadow: 0 0 30px rgba(100,150,255,0.1); }
                h1 { color: #b3e5fc; font-weight: 300; }
                .accent-line { width: 130px; height: 2px; background: #81d4fa; margin-bottom: 40px; }
                li::before { color: #81d4fa; content: '❄'; font-size: 24px; }
            `;
            break;
        case 'marble_luxury':
            css = `
                body { background: #181818; }
                body::before { content: ""; position: absolute; inset: 0; background: repeating-radial-gradient(circle at center, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 100px); opacity: 0.5; z-index: -1; filter: blur(2px) skewX(20deg); }
                .scene-card { background: linear-gradient(135deg, #222, #111); padding: 60px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
                h1 { color: #e0e0e0; letter-spacing: 2px; text-transform: uppercase; }
                .accent-line { width: 80px; height: 2px; background: ${accent}; margin-bottom: 40px; }
            `;
            break;
        case 'parchment':
            css = `
                body { background: #1a1510; }
                .scene-card { background: #261f17; padding: 60px; border-radius: 4px; box-shadow: inset 0 0 50px rgba(0,0,0,0.5); border: 1px solid rgba(255,200,100,0.1); }
                h1 { color: #e6c280; font-family: "Times New Roman", serif; font-style: italic; }
                .accent-line { width: 160px; height: 1px; background: #e6c280; margin-bottom: 40px; }
                li { color: #c0a070; }
                li::before { color: #e6c280; content: '❧'; font-size: 30px; }
            `;
            break;
        case 'chalkboard':
            css = `
                body { background: #1a2e1a; }
                body::before { content: ""; position: absolute; inset: 0; background: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg=='); z-index: -1; }
                .scene-card { background: transparent; padding: 60px; border: 8px solid #3c2a1e; border-radius: 10px; box-shadow: 10px 10px 20px rgba(0,0,0,0.5); }
                h1 { color: #f4f4f4; text-shadow: 1px 1px 2px rgba(255,255,255,0.5); font-family: "Comic Sans MS", cursive, sans-serif; }
                .accent-line { width: 100px; height: 3px; background: #fff; margin-bottom: 40px; opacity: 0.7; }
                li { color: #eee; text-shadow: 1px 1px 1px rgba(255,255,255,0.3); font-family: "Comic Sans MS", cursive, sans-serif; }
            `;
            break;
        case 'terminal_green':
            css = `
                body { background: #000; font-family: 'Courier New', Courier, monospace; }
                .scene-card { background: #000; padding: 60px; border: 2px solid #00FF41; border-radius: 0; }
                h1 { color: #00FF41; font-family: 'Courier New', Courier, monospace; font-weight: normal; }
                h1::before { content: "> "; }
                .accent-line { width: 20px; height: 30px; background: #00FF41; margin-bottom: 40px; animation: blink 1s step-end infinite; }
                @keyframes blink { 50% { opacity: 0; } }
                li { color: #008F11; font-family: 'Courier New', Courier, monospace; }
                li::before { color: #00FF41; content: "$"; }
            `;
            break;
        case 'comic_pop':
            css = `
                body { background: #1a1a2e; }
                body::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(rgba(${rgbAccent},0.2) 20%, transparent 20%); background-size: 20px 20px; z-index: -1; }
                .scene-card { background: #222; border: 6px solid #fff; padding: 60px; box-shadow: 15px 15px 0 ${accent}; transform: rotate(-1deg); }
                h1 { color: #fff; text-transform: uppercase; font-weight: 900; text-shadow: 4px 4px 0 ${accent}; transform: rotate(1deg); }
                .accent-line { display: none; }
                li { font-weight: bold; }
            `;
            break;
        case 'art_deco':
            css = `
                body { background: #111; }
                .scene-card { background: #1a1a1a; padding: 60px; border: 2px solid #D4AF37; outline: 1px solid #D4AF37; outline-offset: -10px; }
                h1 { color: #D4AF37; text-transform: uppercase; letter-spacing: 5px; text-align: center; font-family: "Trebuchet MS", sans-serif; }
                .accent-line { width: 200px; height: 1px; background: #D4AF37; margin: 0 auto 40px auto; position: relative; }
                .accent-line::before, .accent-line::after { content: ""; position: absolute; top: -4px; width: 8px; height: 8px; background: #D4AF37; transform: rotate(45deg); }
                .accent-line::before { left: 0; }
                .accent-line::after { right: 0; }
                li::before { color: #D4AF37; content: '❖'; font-size: 24px; }
            `;
            break;
        case 'brutalist':
            css = `
                body { background: #2a2a2a; }
                .scene-card { background: #d0d0d0; padding: 60px; border: 8px solid #000; border-radius: 0; box-shadow: 20px 20px 0 #000; }
                h1 { color: #000; font-weight: 900; text-transform: uppercase; font-size: 88px; line-height: 1; }
                .accent-line { width: 100%; height: 12px; background: ${accent}; border: 3px solid #000; margin-bottom: 40px; }
                li { color: #111; font-weight: bold; }
                li::before { color: #000; content: '⬛'; font-size: 20px; }
            `;
            break;
        case 'pastel_soft':
            css = `
                body { background: #2d2b36; }
                .scene-card { background: rgba(255,255,255,0.05); padding: 60px; border-radius: 50px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); }
                h1 { color: #f4d5e6; font-weight: 600; }
                .accent-line { width: 90px; height: 6px; background: #f4d5e6; border-radius: 3px; margin-bottom: 40px; }
                li { color: #e6ddeb; }
                li::before { color: #f4d5e6; }
            `;
            break;
        case 'vaporwave':
            css = `
                body { background: linear-gradient(180deg, #110022, #440055, #001133); }
                .scene-card { background: rgba(0,0,0,0.5); padding: 60px; border: 2px solid #ff00ff; border-radius: 0; box-shadow: 0 0 20px rgba(255,0,255,0.5), inset 0 0 10px rgba(0,255,255,0.5); }
                h1 { color: #00ffff; text-shadow: 2px 2px 0 #ff00ff; text-transform: uppercase; font-style: italic; letter-spacing: 2px; }
                .accent-line { width: 100%; height: 2px; background: linear-gradient(90deg, #00ffff, #ff00ff); margin-bottom: 40px; }
                li { color: #ff99ff; text-shadow: 1px 1px 0 #000; }
                li::before { color: #00ffff; content: '▶'; }
            `;
            break;
        case 'wireframe':
            css = `
                body { background: #0a0a0a; }
                .scene-card { background: transparent; padding: 60px; border: 1px solid ${accent}; border-radius: 0; position: relative; }
                .scene-card::before { content: ""; position: absolute; inset: 10px; border: 1px dashed rgba(${rgbAccent},0.5); pointer-events: none; }
                h1 { color: transparent; -webkit-text-stroke: 1px ${accent}; }
                .accent-line { width: 100px; height: 1px; background: ${accent}; margin-bottom: 40px; }
            `;
            break;
        case 'topographic':
            css = `
                body { background: #121212; }
                body::before { content: ""; position: absolute; inset: 0; background: repeating-radial-gradient(circle at 0% 0%, transparent 0, transparent 20px, rgba(255,255,255,0.03) 21px, transparent 22px); z-index: -1; }
                .scene-card { background: rgba(18,18,18,0.9); padding: 60px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; }
                h1 { color: #fff; }
                .accent-line { width: 120px; height: 4px; background: ${accent}; border-radius: 2px; margin-bottom: 40px; }
            `;
            break;
        case 'crystal':
            css = `
                body { background: #111; }
                body::before { content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, rgba(255,0,0,0.1), rgba(0,255,0,0.1), rgba(0,0,255,0.1)); opacity: 0.5; clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); z-index: -1; }
                .scene-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(15px); padding: 60px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); }
                h1 { color: #fff; letter-spacing: 2px; }
                .accent-line { width: 90px; height: 2px; background: linear-gradient(90deg, #ff00ff, #00ffff); margin-bottom: 40px; }
            `;
            break;
        case 'industrial':
            css = `
                body { background: #1a1210; }
                .scene-card { background: #261d1a; padding: 60px; border: 3px dashed #8a5a44; border-radius: 0; }
                h1 { color: #d4a373; font-weight: 800; text-transform: uppercase; }
                .accent-line { width: 100%; height: 4px; background: #8a5a44; margin-bottom: 40px; border: 1px solid #1a1210; }
                li { color: #faedcd; }
                li::before { color: #d4a373; content: '⚙'; font-size: 28px; }
            `;
            break;
        case 'sakura':
            css = `
                body { background: #141012; }
                .scene-card { background: rgba(255,183,197,0.05); padding: 60px; border: 1px solid rgba(255,183,197,0.2); border-radius: 20px 0 20px 0; }
                h1 { color: #FFB7C5; font-weight: 300; }
                .accent-line { width: 60px; height: 2px; background: #FFB7C5; margin-bottom: 40px; }
                li { color: #ffebee; }
                li::before { color: #FFB7C5; content: '❀'; font-size: 24px; }
            `;
            break;
        case 'matrix_rain':
            css = `
                body { background: #000; }
                body::before { content: "101010101 01010101 101010 0101 111000 000111"; position: absolute; top: 0; left: 10%; width: 10px; color: rgba(0,255,0,0.2); font-family: monospace; font-size: 20px; line-height: 1; word-break: break-all; z-index: -1; }
                .scene-card { background: rgba(0,20,0,0.8); border-left: 2px solid #0F0; padding: 60px; }
                h1 { color: #0F0; font-family: monospace; text-shadow: 0 0 5px #0F0; }
                .accent-line { width: 150px; height: 2px; background: #0F0; margin-bottom: 40px; box-shadow: 0 0 5px #0F0; }
                li { color: #aaa; font-family: monospace; }
                li::before { color: #0F0; content: '>'; }
            `;
            break;
        case 'vintage_sepia':
            css = `
                body { background: #2b2520; }
                body::before { content: ""; position: absolute; inset: 0; background: radial-gradient(rgba(0,0,0,0.3) 1px, transparent 1px); background-size: 4px 4px; opacity: 0.3; z-index: -1; }
                .scene-card { background: rgba(60,50,40,0.8); padding: 60px; border: 4px double rgba(200,170,140,0.5); border-radius: 10px; }
                h1 { color: #d0bba0; font-family: "Georgia", serif; }
                .accent-line { width: 120px; height: 1px; background: #d0bba0; margin-bottom: 40px; }
                li { color: #a59585; }
            `;
            break;
        case 'stained_glass':
            css = `
                body { background: #111; }
                .scene-card { background: rgba(20,20,20,0.9); padding: 60px; border: 4px solid #333; position: relative; overflow: hidden; }
                .scene-card::before { content: ""; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: conic-gradient(from 0deg, rgba(255,0,0,0.1), rgba(0,255,0,0.1), rgba(0,0,255,0.1), rgba(255,255,0,0.1), rgba(255,0,0,0.1)); z-index: -1; opacity: 0.5; }
                h1 { color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
                .accent-line { width: 100px; height: 4px; background: #fff; margin-bottom: 40px; border: 1px solid #000; }
            `;
            break;
        case 'origami':
            css = `
                body { background: #222; }
                .scene-card { background: #2d2d2d; padding: 60px; border-radius: 0; position: relative; box-shadow: 10px 10px 30px rgba(0,0,0,0.5); background-image: linear-gradient(135deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.05) 75%, transparent 75%, transparent); background-size: 200px 200px; }
                h1 { color: #eaeaea; font-weight: 300; }
                .accent-line { width: 100px; height: 2px; background: ${accent}; margin-bottom: 40px; transform: skewX(-45deg); }
            `;
            break;
        case 'arctic':
            css = `
                body { background: linear-gradient(135deg, #0d1520, #1a2a40); }
                .scene-card { background: rgba(255,255,255,0.1); padding: 60px; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; box-shadow: 0 0 20px rgba(200,230,255,0.2); }
                h1 { color: #d0ebff; text-transform: uppercase; font-weight: bold; }
                .accent-line { width: 80px; height: 4px; background: #a5d8ff; margin-bottom: 40px; }
                li { color: #e7f5ff; }
                li::before { color: #74c0fc; }
            `;
            break;
        case 'zen_garden':
            css = `
                body { background: #1a1815; }
                .scene-card { background: #24221f; padding: 80px; border-radius: 0; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                h1 { color: #d4cfc5; font-weight: 300; letter-spacing: 2px; margin-bottom: 20px; }
                .accent-line { width: 40px; height: 2px; background: #8b7d6b; margin-bottom: 50px; }
                li { color: #a8a39a; font-weight: 300; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
                li::before { content: '○'; color: #8b7d6b; font-size: 20px; }
            `;
            break;
        case 'mosaic_tile':
            css = `
                body { background: #151515; }
                body::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px); background-size: 15px 15px; z-index: -1; }
                .scene-card { background: rgba(25,25,25,0.9); padding: 60px; border: 2px solid rgba(255,255,255,0.1); border-radius: 0; }
                h1 { color: #fff; font-weight: 700; }
                .accent-line { width: 100px; height: 5px; background: repeating-linear-gradient(90deg, ${accent}, ${accent} 10px, transparent 10px, transparent 20px); margin-bottom: 40px; }
            `;
            break;
        case 'deep_space':
            css = `
                body { background: #030308; }
                body::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 30% 30%, rgba(100,50,200,0.2) 0%, transparent 60%), radial-gradient(circle at 70% 70%, rgba(50,100,200,0.2) 0%, transparent 60%); filter: blur(30px); z-index: -1; }
                .scene-card { background: transparent; padding: 60px; }
                h1 { color: #fff; text-shadow: 0 0 20px rgba(255,255,255,0.3); }
                .accent-line { width: 120px; height: 1px; background: linear-gradient(90deg, transparent, #fff, transparent); margin: 0 auto 40px auto; }
                .scene-card h1 { text-align: center; }
            `;
            break;
        case 'prism_rainbow':
            css = `
                body { background: #111; }
                .scene-card { background: rgba(20,20,20,0.9); padding: 60px; border-radius: 12px; position: relative; }
                .scene-card::before { content: ""; position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; background: linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet); z-index: -1; border-radius: 14px; opacity: 0.5; }
                h1 { color: #fff; }
                .accent-line { width: 100%; height: 4px; background: linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet); margin-bottom: 40px; border-radius: 2px; }
            `;
            break;
        case 'ink_brush':
            css = `
                body { background: #12100e; }
                .scene-card { background: #1a1816; padding: 60px; border-radius: 5px; box-shadow: -5px 5px 15px rgba(0,0,0,0.5), 5px -5px 0px rgba(255,255,255,0.02); }
                h1 { color: #e8e6e3; font-family: "Palatino Linotype", "Book Antiqua", Palatino, serif; font-style: italic; }
                .accent-line { width: 150px; height: 6px; background: #000; border-radius: 50% 50% 50% 50% / 10% 10% 90% 90%; margin-bottom: 40px; background-color: #333; }
                li::before { content: '～'; font-weight: bold; }
            `;
            break;
        case 'carbon_fiber':
            css = `
                body { background: #1a1a1a; }
                body::before { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(45deg, #222, #222 5px, #1a1a1a 5px, #1a1a1a 10px); z-index: -1; }
                .scene-card { background: rgba(20,20,20,0.9); padding: 60px; border: 1px solid #333; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
                h1 { color: #fff; text-transform: uppercase; letter-spacing: 2px; }
                .accent-line { width: 80px; height: 4px; background: #555; margin-bottom: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.5); }
                li { font-weight: 600; }
            `;
            break;
        case 'electric_storm':
            css = `
                body { background: #050510; }
                body::before { content: ""; position: absolute; inset: 0; background: radial-gradient(circle at 20% 20%, rgba(0,191,255,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(0,191,255,0.1) 0%, transparent 40%); z-index: -1; }
                .scene-card { background: rgba(5,5,15,0.8); padding: 60px; border: 1px solid rgba(0,191,255,0.3); border-radius: 10px; box-shadow: 0 0 20px rgba(0,191,255,0.1); }
                h1 { color: #fff; text-shadow: 0 0 10px #00BFFF; }
                .accent-line { width: 140px; height: 2px; background: #00BFFF; margin-bottom: 40px; box-shadow: 0 0 10px #00BFFF; }
                li::before { color: #00BFFF; text-shadow: 0 0 5px #00BFFF; content: '⚡'; font-size: 24px; }
            `;
            break;
        default:
            css = `
                body { background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%); }
                .scene-card { background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.15); border-radius: 24px; padding: 50px 60px; box-shadow: 0 8px 32px rgba(0,0,0,0.37); }
                h1 { color: ${accent}; text-shadow: 0 0 30px rgba(${rgbAccent}, 0.27); }
                .accent-line { width: 120px; height: 4px; background: linear-gradient(90deg, ${accent}, transparent); border-radius: 2px; margin-bottom: 40px; }
            `;
            break;
    }

    return css;
}
