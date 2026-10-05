import fs from "fs";

function escHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escMermaid(str) {
    if (!str) return "";
    return String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getBaseCSS(theme) {
    return `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700&family=STIX+Two+Math&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            background: ${theme.bgGradient || 'radial-gradient(circle at 50% 40%, #1e293b 0%, #020617 80%)'}; 
            color: ${theme.textPrimary || '#f8fafc'};
            font-family: '${theme.fontFamily || 'Inter'}', -apple-system, sans-serif;
            width: 1920px; height: 1080px; 
            overflow: hidden; 
            display: flex; align-items: center; justify-content: center;
            position: relative;
        }
        
        /* Grid overlay */
        body::before {
            content: ""; position: absolute; inset: 0;
            background-image: linear-gradient(${theme.gridColor || 'rgba(255,255,255,0.02)'} 1px, transparent 1px),
            linear-gradient(90deg, ${theme.gridColor || 'rgba(255,255,255,0.02)'} 1px, transparent 1px);
            background-size: 60px 60px;
            pointer-events: none;
            z-index: 1;
        }

        /* Vignette */
        body::after {
            content: ""; position: absolute; inset: 0;
            background: radial-gradient(circle, transparent 40%, rgba(0,0,0,0.6) 100%);
            pointer-events: none;
            z-index: 2;
        }

        /* Particles */
        .particles {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; overflow: hidden;
        }
        .particle {
            position: absolute; border-radius: 50%;
            background: ${theme.particleColor || theme.accentColor || '#3b82f6'};
            filter: blur(60px);
            opacity: 0.25;
            animation: floatParticle 20s infinite ease-in-out alternate;
        }
        @keyframes floatParticle {
            0% { transform: translate(0, 0) scale(1); }
            100% { transform: translate(150px, -150px) scale(1.5); }
        }

        .scene-container {
            width: 1720px; height: 900px;
            display: flex; flex-direction: column; justify-content: center;
            padding: 0 100px;
            position: relative;
            z-index: 10;
        }
        
        .glass-panel {
            backdrop-filter: blur(20px);
            background: ${theme.panelBg || 'rgba(255,255,255,0.03)'};
            border: 1px solid ${theme.panelBorder || 'rgba(255,255,255,0.08)'};
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        
        h1, h2, h3 { 
            font-family: 'Space Grotesk', sans-serif;
            letter-spacing: -2px;
            text-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }
        h1 { font-size: 76px; font-weight: 700; margin-bottom: 24px; color: ${theme.textPrimary || '#fff'}; }
        
        .accent-line { 
            width: 0; height: 8px; background: ${theme.accentColor || '#3b82f6'}; border-radius: 4px; margin-bottom: 60px; 
            box-shadow: 0 0 30px ${theme.glowColor || theme.accentColor || '#3b82f6'}; 
        }
        
        p, div, span {
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        /* Animations */
        .anim-container { animation: phase1 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        .anim-heading { animation: phase2 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both; }
        .anim-accent { animation: phase3 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.6s both; }
        .anim-item { animation: phase4 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        
        .float-subtle { animation: floatSubtle 6s infinite ease-in-out; }

        @keyframes phase1 {
            0% { opacity: 0; transform: scale(0.95); }
            100% { opacity: 1; transform: scale(1); }
        }
        @keyframes phase2 {
            0% { opacity: 0; transform: translateX(-60px); }
            100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes phase3 {
            0% { width: 0; opacity: 0; }
            100% { width: 120px; opacity: 1; }
        }
        @keyframes phase4 {
            0% { opacity: 0; transform: translateY(40px); filter: blur(10px); }
            100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes floatSubtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        
        /* Reverse animations for exit */
        .is-exiting .anim-container { animation: exitPhase1 0.5s ease-in forwards !important; }
        .is-exiting .anim-heading, .is-exiting .anim-accent, .is-exiting .anim-item { animation: exitPhase2 0.4s ease-in forwards !important; }
        
        @keyframes exitPhase1 { 100% { opacity: 0; transform: scale(1.05); } }
        @keyframes exitPhase2 { 100% { opacity: 0; transform: translateY(-30px); filter: blur(10px); } }

        /* Progress Bar & Slide Number */
        .progress-bar-container {
            position: absolute; bottom: 0; left: 0; width: 100%; height: 4px;
            background: rgba(255,255,255,0.05);
            z-index: 100;
        }
        .progress-bar {
            height: 100%; background: ${theme.accentColor || '#3b82f6'};
            box-shadow: 0 0 10px ${theme.accentColor || '#3b82f6'};
            transition: width 0.5s ease;
        }

        .bridge-text {
            position: absolute; top: 40px; left: 100px;
            font-size: 24px; color: ${theme.textSecondary || 'rgba(255,255,255,0.5)'};
            font-style: italic;
            animation: phase4 0.8s ease-out 0.8s both;
        }
    `;
}

function wrapHTML(body, context) {
    const theme = context.theme || {};
    const css = getBaseCSS(theme);
    const totalSlides = Math.max(context.totalSlides || 1, 1);
    const slideIndex = context.slideIndex || 0;
    const progressPercent = totalSlides > 1 ? (slideIndex / (totalSlides - 1)) * 100 : 100;
    
    // Bridge text logic
    let bridgeText = "";
    if (slideIndex > 0 && context.prevSlide) {
        const prevType = context.prevSlide.scene_type;
        if (prevType === 'definition') bridgeText = `Now that we understand ${context.prevSlide.term}...`;
        else if (prevType === 'code_walkthrough') bridgeText = `Building on that implementation...`;
        else if (prevType === 'analogy_visual') bridgeText = `With that mental model...`;
        else bridgeText = `Continuing our exploration...`;
    }

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
        ${css}
        .mermaid { display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; overflow: visible; white-space: pre; }
        .mermaid svg { width: 100% !important; height: auto !important; max-width: 100% !important; max-height: 100% !important; }
        .mermaid svg .edgePath path, .mermaid svg .flowchart-link { stroke: ${theme.textPrimary || '#fff'} !important; stroke-width: 4px !important; fill: none !important; }
        .mermaid svg marker path, .mermaid svg .arrowheadPath { fill: ${theme.textPrimary || '#fff'} !important; stroke: none !important; }
        .label, text, span { font-family: '${theme.fontFamily || 'Inter'}', -apple-system, sans-serif !important; }
        .node .label, .cluster-label .label, .cluster .label { font-weight: 700 !important; }
        .edgeLabel .label { font-weight: 600 !important; }
        .mermaid svg foreignObject { overflow: visible !important; }
        .mermaid svg .edgeLabel, .mermaid svg .edgeLabel .label, .mermaid svg .edgeLabel rect, .mermaid svg .edge-thickness-normal { background-color: transparent !important; background: transparent !important; fill: transparent !important; }
        .mermaid svg .edgeLabel text, .mermaid svg .edgeLabel span, .mermaid svg .edgeLabel .label { fill: ${theme.textPrimary || '#fff'} !important; color: ${theme.textPrimary || '#fff'} !important; background: transparent !important; text-shadow: 0 2px 4px rgba(0,0,0,0.8); }
        .mermaid svg .node rect, .mermaid svg .node circle, .mermaid svg .node polygon, .mermaid svg .node path { fill: ${theme.panelBg || 'rgba(255,255,255,0.05)'} !important; stroke: ${theme.accentColor || '#fff'} !important; stroke-width: 2px !important; backdrop-filter: blur(10px); }
        .mermaid svg .node text, .mermaid svg .node .label, .mermaid svg .node span { fill: ${theme.textPrimary || '#fff'} !important; color: ${theme.textPrimary || '#fff'} !important; background: transparent !important; }
        .mermaid svg .cluster rect { fill: rgba(255,255,255,0.02) !important; stroke: rgba(255,255,255,0.2) !important; stroke-width: 2px !important; rx: 15px !important; ry: 15px !important; }
        .mermaid svg .cluster .label, .mermaid svg .cluster text, .mermaid svg .cluster span, .mermaid svg .cluster-label span, .mermaid svg .cluster-label text { color: ${theme.textSecondary || '#ccc'} !important; fill: ${theme.textSecondary || '#ccc'} !important; background: transparent !important; }
    
        /* Sequence Diagram */
        .mermaid svg .actor { stroke: ${theme.accentColor || '#fff'} !important; fill: ${theme.panelBg || 'rgba(255,255,255,0.05)'} !important; stroke-width: 2px !important; }
        .mermaid svg text.actor > tspan, .mermaid svg .actor-text { fill: ${theme.textPrimary || '#fff'} !important; color: ${theme.textPrimary || '#fff'} !important; }
        .mermaid svg .actor-line { stroke: ${theme.textSecondary || '#ccc'} !important; stroke-width: 2px !important; }
        .mermaid svg .messageLine0, .mermaid svg .messageLine1 { stroke: ${theme.textPrimary || '#fff'} !important; stroke-width: 2px !important; }
        .mermaid svg .messageText { fill: ${theme.textPrimary || '#fff'} !important; stroke: none !important; font-size: 24px !important; }
        .mermaid svg .sequenceNumber { fill: ${theme.textPrimary || '#fff'} !important; }
        .mermaid svg #arrowhead path { fill: ${theme.textPrimary || '#fff'} !important; stroke: none !important; }
        .mermaid svg .note { stroke: ${theme.accentColor || '#fff'} !important; fill: rgba(16, 185, 129, 0.2) !important; }
        .mermaid svg .noteText, .mermaid svg .noteText > tspan { fill: ${theme.textPrimary || '#fff'} !important; }
        .mermaid svg .activation0, .mermaid svg .activation1, .mermaid svg .activation2 { fill: ${theme.accentColor || '#fff'} !important; opacity: 0.3; }
    </style></head><body>
    
    <div class="particles">
        <div class="particle" style="width: 300px; height: 300px; top: 10%; left: 20%; animation-delay: 0s;"></div>
        <div class="particle" style="width: 400px; height: 400px; top: 60%; left: 70%; animation-delay: -5s; animation-duration: 25s;"></div>
        <div class="particle" style="width: 200px; height: 200px; top: 30%; left: 80%; animation-delay: -10s; animation-duration: 15s;"></div>
    </div>

    ${bridgeText ? `<div class="bridge-text">${escHtml(bridgeText)}</div>` : ''}
    
    ${body}
    
    <div class="progress-bar-container"><div class="progress-bar" style="width: ${progressPercent}%"></div></div>
    
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
      document.fonts.ready.then(() => {
          mermaid.initialize({ 
              startOnLoad: false, 
              theme: 'base', 
              themeVariables: { 
                  fontFamily: "${(theme.fontFamily || 'Inter').replace(/\"/g, '\\\"')}",
                  fontSize: '28px',
                  lineColor: "${theme.textPrimary || '#ffffff'}",
                  primaryTextColor: "${theme.textPrimary || '#ffffff'}",
                  nodeBorder: "${theme.accentColor || '#ffffff'}",
                  clusterBkg: 'rgba(255,255,255,0.02)',
                  clusterBorder: 'rgba(255,255,255,0.2)',
                  edgeLabelBackground: 'transparent',
                  tertiaryColor: 'transparent',
                  primaryColor: 'transparent'
              },
              flowchart: { nodeSpacing: 100, rankSpacing: 100, padding: 30 },
              sequence: { messageMargin: 60, actorMargin: 100 }
          });
          mermaid.run().then(() => { window.mermaidRendered = true; });
      });
    </script>
    </body></html>`;
}

function getDynamicScale(itemCount) {
    if (itemCount <= 3) return { font: '52px', pad: '30px 50px', gap: '40px', circ: '100px', numFont: '56px', thFont: '48px', tdFont: '42px', marginB: '30px', prosFont: '42px' };
    if (itemCount === 4) return { font: '42px', pad: '20px 40px', gap: '30px', circ: '80px', numFont: '46px', thFont: '38px', tdFont: '32px', marginB: '20px', prosFont: '36px' };
    if (itemCount === 5) return { font: '34px', pad: '15px 30px', gap: '20px', circ: '60px', numFont: '36px', thFont: '30px', tdFont: '26px', marginB: '15px', prosFont: '30px' };
    return { font: '28px', pad: '12px 20px', gap: '15px', circ: '50px', numFont: '28px', thFont: '24px', tdFont: '20px', marginB: '10px', prosFont: '24px' };
}

function applySyntaxHighlighting(code, codeTheme) {
    if (!codeTheme) codeTheme = { keyword: '#c678dd', number: '#d19a66', string: '#98c379', comment: '#5c6370', function: '#61afef', operator: '#56b6c2' };
    
    const tokenRegex = /("[^"]*"|'[^']*'|`[^`]*`)|(\/\/.*|#.*|\/\*[\s\S]*?\*\/)|\b(int|float|void|char|struct|class|public|private|return|if|else|for|while|const|let|var|function|async|await|import|export|from|def|fn|type|interface|go|chan)\b|\b(\d+(?:\.\d+)?)\b|\b([a-zA-Z_]\w*)(?=\s*\()|(=|\+|-|\*|\/|%|==|!=|>|<|>=|<=|&&|\|\||!)/g;
    
    let lastIndex = 0;
    let html = "";
    let match;
    
    // Ensure code is a string
    const safeCode = String(code || "");

    while ((match = tokenRegex.exec(safeCode)) !== null) {
        html += escHtml(safeCode.substring(lastIndex, match.index));
        
        let type = 'text';
        if (match[1]) type = 'string';
        else if (match[2]) type = 'comment';
        else if (match[3]) type = 'keyword';
        else if (match[4]) type = 'number';
        else if (match[5]) type = 'function';
        else if (match[6]) type = 'operator';
        
        let color = codeTheme[type] || '#fff';
        let style = `color:${color}`;
        if (type === 'comment') style += '; font-style:italic;';
        
        html += `<span style="${style}">${escHtml(match[0])}</span>`;
        lastIndex = tokenRegex.lastIndex;
    }
    
    html += escHtml(safeCode.substring(lastIndex));
    return html;
}

export function generateSlideHTML(slide, context = {}) {
    const type = slide.scene_type || "concept_intro";
    const theme = context.theme || { 
        accentColor: slide.color_accent || "#3b82f6",
        textPrimary: "#fff", textSecondary: "#cbd5e1"
    };
    context.theme = theme;
    
    const iconEmoji = theme.iconEmoji || '✨';
    const accent = theme.accentColor;

    
    let safeMermaidCode = String(slide.mermaid_code || '').replace(/\\n/g, '\n').trim();
    if (safeMermaidCode && !/^(graph|flowchart|stateDiagram|sequenceDiagram|classDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|quadrantChart|xychart-beta)/i.test(safeMermaidCode)) {
        safeMermaidCode = "graph TD\n" + safeMermaidCode;
    }
    
    // Auto-repair common LLM Mermaid syntax hallucinations
    if (safeMermaidCode.match(/^(graph|flowchart)/i)) {
        // LLMs often mistakenly use classDiagram inheritance arrows (<|--) in flowcharts
        safeMermaidCode = safeMermaidCode.replace(/<\|--/g, '-->');
        safeMermaidCode = safeMermaidCode.replace(/--\|>/g, '-->');
        safeMermaidCode = safeMermaidCode.replace(/<\|\.\./g, '-.->');
        safeMermaidCode = safeMermaidCode.replace(/\.\.\|>/g, '-.->');
    }


    if (type === "concept_intro" || type === "analogy_visual") {
        const bulletList = slide.bullets || [];
        const scale = getDynamicScale(bulletList.length);
        const bullets = bulletList.map((b, i) => `
            <div class="anim-item glass-panel float-subtle" style="animation-delay:${1.0 + i*0.2}s; font-size: ${scale.font}; font-weight: 500; padding: ${scale.pad}; color: ${theme.textPrimary}; display:flex; align-items:center; gap:${scale.gap}; text-align:left;">
                <div style="font-size: 1.2em; filter: drop-shadow(0 0 10px ${accent}88); flex-shrink:0;">${iconEmoji}</div>
                <div style="line-height: 1.4;">${escHtml(b)}</div>
            </div>
        `).join("");

        return wrapHTML(`
            <div class="scene-container anim-container" style="align-items: flex-start;">
                <div style="position: absolute; right: 0; bottom: 10%; font-size: 400px; opacity: 0.05; filter: grayscale(1); z-index: -1;">${iconEmoji}</div>
                <h1 class="anim-heading" style="margin-bottom: 20px;">${escHtml(slide.heading)}</h1>
                <div class="accent-line anim-accent" style="margin-bottom: 60px;"></div>
                <div style="display:flex; flex-direction:column; align-items: flex-start; gap: 30px; width: 100%; max-width: 1400px;">
                    ${bullets}
                </div>
            </div>
        `, context);
    }
    
    if (type === "definition") {
        return wrapHTML(`
            <div class="scene-container anim-container" style="display:flex; flex-direction:column; justify-content:center; text-align:center; padding: 0 150px;">
                <div style="position:absolute; top: 10%; left: 10%; font-size: 200px; color: ${accent}; opacity: 0.1; font-family: serif;">"</div>
                <div style="position:absolute; bottom: 20%; right: 10%; font-size: 200px; color: ${accent}; opacity: 0.1; font-family: serif;">"</div>
                
                <div class="anim-item float-subtle" style="font-size: 130px; font-weight: 800; font-family: 'Space Grotesk'; background: linear-gradient(135deg, ${theme.textPrimary || '#fff'}, ${accent}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 50px; text-transform: capitalize; letter-spacing: -3px; animation-delay: 0.8s; filter: drop-shadow(0 10px 30px ${accent}66);">${escHtml(slide.term)}</div>
                
                <div class="anim-item glass-panel" style="font-size: 56px; line-height: 1.6; color: ${theme.textSecondary}; animation-delay: 1.2s; padding: 60px;">
                    "${escHtml(slide.definition)}"
                </div>
            </div>
        `, context);
    }

    if (type === "code_walkthrough") {
        
          const codeTheme = theme.codeTheme || { bg: '#1e1e1e', keyword: '#569cd6', string: '#ce9178', comment: '#6a9955', number: '#b5cea8', function: '#dcdcaa', operator: '#d4d4d4', border: '#333' };
          
          let codeTitle = slide.title || slide.heading;
          if (!codeTitle && slide.slide_context_bridge) {
              codeTitle = slide.slide_context_bridge.replace(/\.\.\.$/, '');
          }
          if (!codeTitle) codeTitle = "Code Implementation";
          
          let titleFontSize = "76px";
          if (codeTitle.length > 45) titleFontSize = "42px";
          else if (codeTitle.length > 30) titleFontSize = "54px";

          const normalizedCode = String(slide.code_snippet || "").replace(/\\n/g, '\n');
        const lineCount = normalizedCode.split('\n').length;
        let codeFontSize = '36px';
        if (lineCount > 22) codeFontSize = '20px';
        else if (lineCount > 16) codeFontSize = '24px';
        else if (lineCount > 12) codeFontSize = '28px';
        
        let codeHtml = applySyntaxHighlighting(normalizedCode, codeTheme);
        
        // Add line numbers
        const lines = codeHtml.split('\n');
        const numberedCodeHtml = lines.map((line, i) => `
            <div style="display: flex;">
                <span style="color: rgba(255,255,255,0.3); width: 50px; text-align: right; margin-right: 20px; user-select: none; flex-shrink: 0;">${i + 1}</span>
                <span style="flex: 1; word-wrap: break-word; white-space: pre-wrap;">${line || ' '}</span>
            </div>
        `).join('');
            
        return wrapHTML(`
            <div class="scene-container anim-container">
                <h1 class="anim-heading" style="font-size: ${titleFontSize}; transition: font-size 0.3s ease;">${escHtml(codeTitle)}</h1>
                <div class="accent-line anim-accent"></div>
                <div class="anim-item glass-panel float-subtle" style="padding: 0; animation-delay:1.0s; overflow: hidden;">
                    <div style="background: rgba(0,0,0,0.4); padding: 15px 20px; display: flex; align-items: center; border-bottom: 1px solid ${codeTheme.border};">
                        <div style="display:flex; gap:8px;">
                            <div style="width: 14px; height: 14px; border-radius: 50%; background: #ff5f56;"></div>
                            <div style="width: 14px; height: 14px; border-radius: 50%; background: #ffbd2e;"></div>
                            <div style="width: 14px; height: 14px; border-radius: 50%; background: #27c93f;"></div>
                        </div>
                        
                    </div>
                    <div style="padding: 30px; font-family: '${theme.codeFontFamily || 'JetBrains Mono'}', monospace; font-size:${codeFontSize}; line-height:1.6; color:${theme.textPrimary}; background: ${codeTheme.bg};">
                        ${numberedCodeHtml}
                    </div>
                </div>
            </div>
        `, context);
    }

    if (type === "math_equation") {
        return wrapHTML(`
            <div class="scene-container anim-container" style="display:flex; flex-direction:column; justify-content:center; text-align:center;">
                <div style="position: relative; margin-bottom: 80px;">
                    <div class="anim-item float-subtle" style="position: absolute; inset: -40px; background: radial-gradient(circle, ${accent}66 0%, transparent 70%); filter: blur(40px); animation-delay:0.8s;"></div>
                    <div class="anim-item" style="position: relative; font-family:'${theme.mathFontFamily || 'STIX Two Math'}', serif; font-size: 150px; color: #fff; animation-delay:0.9s; text-shadow: 0 0 30px ${accent};">${escHtml(slide.equation)}</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:20px; align-items: center;">
                    ${(slide.explanation_steps || []).map((s, i) => `
                        <div class="anim-item glass-panel" style="font-size: 38px; color: ${theme.textSecondary}; padding: 20px 40px; animation-delay:${1.2 + i*0.2}s;">${escHtml(s)}</div>
                    `).join("")}
                </div>
            </div>
        `, context);
    }

    if (type === "step_by_step") {
        const stepList = slide.steps || [];
        const steps = stepList.map((s, i) => {
            const isActive = i === stepList.length - 1;
            const itemAccent = isActive ? accent : 'rgba(255,255,255,0.3)';
            const glow = isActive ? `box-shadow: 0 0 30px ${accent}aa;` : '';
            return `
            <div class="anim-item float-subtle" style="display:flex; align-items:center; gap:40px; animation-delay:${0.8 + i*0.2}s; position: relative;">
                <div style="width: 80px; height: 80px; border-radius: 50%; background: ${isActive ? accent : theme.panelBg}; border: 4px solid ${itemAccent}; color: ${isActive ? '#000' : '#fff'}; font-size: 40px; font-family: 'Space Grotesk'; font-weight: 700; display:flex; align-items:center; justify-content:center; flex-shrink:0; ${glow} z-index: 2;">${i+1}</div>
                <div class="glass-panel" style="font-size: 42px; font-weight: 500; color: ${isActive ? '#fff' : theme.textSecondary}; line-height: 1.4; text-align: left; padding: 30px 40px; flex: 1; border-color: ${itemAccent};">${escHtml(s)}</div>
            </div>
        `});

        return wrapHTML(`
            <div class="scene-container anim-container">
                <h1 class="anim-heading">${escHtml(slide.title || "Process")}</h1>
                <div class="accent-line anim-accent"></div>
                <div style="display:flex; justify-content: center; width: 100%;">
                    <div style="position: relative; display:flex; flex-direction:column; gap: 40px; width: 100%; max-width: 1400px; padding-left: 20px;">
                        <div class="anim-item" style="position: absolute; left: 60px; top: 40px; bottom: 40px; width: 4px; background: rgba(255,255,255,0.1); z-index: 1; animation-delay: 0.8s;"></div>
                        ${steps.join("")}
                    </div>
                </div>
            </div>
        `, context);
    }

    if (type === "comparison_table") {
        const rowList = slide.rows || [];
        const scale = getDynamicScale(rowList.length);
        const headers = (slide.headers || []).map(h => `<th style="padding:${scale.pad}; text-align:center; font-size:${scale.thFont}; font-weight:700; color:${accent}; border-bottom:4px solid ${accent}; text-transform:uppercase; letter-spacing: 2px;">${escHtml(h)}</th>`).join("");
        const rows = rowList.map((r, i) => `
            <tr class="anim-item" style="animation-delay:${1.0 + i*0.1}s; background: ${i%2===0 ? 'rgba(255,255,255,0.02)' : 'transparent'};">
                ${r.map(cell => `<td style="padding:${scale.pad}; font-size:${scale.tdFont}; font-weight:500; color:${theme.textPrimary}; text-align:center; border-bottom:1px solid rgba(255,255,255,0.05);">${escHtml(cell)}</td>`).join("")}
            </tr>
        `).join("");
        return wrapHTML(`
            <div class="scene-container anim-container" style="align-items: center;">
                <h1 class="anim-heading">${escHtml(slide.title || "Comparison")}</h1>
                <div class="accent-line anim-accent"></div>
                <div class="anim-item glass-panel" style="width:100%; max-width: 1600px; padding: 0; overflow: hidden; animation-delay:0.8s;">
                    <table style="width:100%; border-collapse:collapse; table-layout: fixed;">
                        <thead style="background: rgba(0,0,0,0.2);"><tr>${headers}</tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `, context);
    }

    if (type === "pros_cons") {
        const prosList = slide.pros || [];
        const consList = slide.cons || [];
        const maxItems = Math.max(prosList.length, consList.length);
        const scale = getDynamicScale(maxItems);
        const pros = prosList.map((p, i) => `<li class="anim-item" style="margin-bottom:${scale.marginB}; display:flex; gap:24px; align-items:center; animation-delay:${1.0 + i*0.1}s;"><div style="font-size:32px; color:#10b981; filter: drop-shadow(0 0 10px #10b981); flex-shrink:0;">✓</div> <span style="line-height:1.4;">${escHtml(p)}</span></li>`).join("");
        const cons = consList.map((c, i) => `<li class="anim-item" style="margin-bottom:${scale.marginB}; display:flex; gap:24px; align-items:center; animation-delay:${1.0 + i*0.1}s;"><div style="font-size:32px; color:#ef4444; filter: drop-shadow(0 0 10px #ef4444); flex-shrink:0;">✗</div> <span style="line-height:1.4;">${escHtml(c)}</span></li>`).join("");
        return wrapHTML(`
            <div class="scene-container anim-container" style="align-items: center;">
                <h1 class="anim-heading">${escHtml(slide.title || "Trade-offs")}</h1>
                <div class="accent-line anim-accent"></div>
                <div style="display:flex; gap:60px; width: 100%; max-width: 1600px; margin-top:20px;">
                    <div class="anim-item glass-panel float-subtle" style="flex:1; background:linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(0,0,0,0)); border-top: 4px solid #10b981; padding:60px; animation-delay:0.8s;">
                        <h2 style="color:#10b981; font-size:64px; font-weight:700; margin-bottom:40px; text-shadow: 0 0 30px rgba(16,185,129,0.5);">Pros</h2>
                        <ul style="list-style:none; font-size:${scale.prosFont}; font-weight:500; color:${theme.textPrimary};">${pros}</ul>
                    </div>
                    <div class="anim-item glass-panel float-subtle" style="flex:1; background:linear-gradient(145deg, rgba(239, 68, 68, 0.1), rgba(0,0,0,0)); border-top: 4px solid #ef4444; padding:60px; animation-delay:0.9s;">
                        <h2 style="color:#ef4444; font-size:64px; font-weight:700; margin-bottom:40px; text-shadow: 0 0 30px rgba(239,68,68,0.5);">Cons</h2>
                        <ul style="list-style:none; font-size:${scale.prosFont}; font-weight:500; color:${theme.textPrimary};">${cons}</ul>
                    </div>
                </div>
            </div>
        `, context);
    }
    
    if (type === "big_number") {
        const numStr = String(slide.number || "");
        let numFontSize = "360px";
        let shadowSize = "100px";
        let letterSpacing = "-8px";
        if (numStr.length > 15) { numFontSize = "120px"; shadowSize = "40px"; letterSpacing = "-2px"; }
        else if (numStr.length > 10) { numFontSize = "160px"; shadowSize = "50px"; letterSpacing = "-3px"; }
        else if (numStr.length > 7) { numFontSize = "220px"; shadowSize = "60px"; letterSpacing = "-4px"; }
        else if (numStr.length > 4) { numFontSize = "280px"; shadowSize = "80px"; letterSpacing = "-6px"; }
        
        return wrapHTML(`
            <div class="scene-container anim-container" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <div style="position: relative;">
                    <div class="anim-item" style="position: absolute; inset: -100px; background: radial-gradient(circle, ${accent}88 0%, transparent 60%); filter: blur(50px); animation: pulseGlow 4s infinite alternate; animation-delay:0.8s;"></div>
                    <div class="anim-item float-subtle" style="position: relative; font-family: 'Space Grotesk'; font-size: ${numFontSize}; font-weight: 700; color: #fff; line-height:1; margin-bottom: 20px; text-shadow: 0 0 ${shadowSize} ${accent}aa; animation-delay:0.9s; letter-spacing: ${letterSpacing}; text-align: center;">${escHtml(numStr)}</div>
                </div>
                <div class="anim-item" style="font-size: 64px; font-weight: 500; color: ${theme.textSecondary}; letter-spacing: 10px; text-transform: uppercase; animation-delay:1.2s; text-align: center; animation: letterSpaceIn 2s ease-out forwards;">${escHtml(slide.label)}</div>
                
                <style>
                    @keyframes pulseGlow { 0% { opacity: 0.5; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1.1); } }
                    @keyframes letterSpaceIn { 0% { letter-spacing: 30px; opacity: 0; } 100% { letter-spacing: 10px; opacity: 1; } }
                </style>
            </div>
        `, context);
    }

    if (type === "mermaid_diagram") {
        return wrapHTML(`
            <div class="scene-container anim-container" style="align-items: center;">
                <h1 class="anim-heading" style="margin-bottom: 20px;">${escHtml(slide.title || slide.heading || "Architecture")}</h1>
                <div class="accent-line anim-accent" style="margin-bottom: 30px;"></div>
                <div class="anim-item glass-panel float-subtle" style="animation-delay:0.8s; width: 100%; max-width: 1700px; height: 75vh; display:flex; justify-content:center; align-items:center; padding: 40px;">
                    <div class="mermaid">${escMermaid(safeMermaidCode)}</div>
                </div>
            </div>
        `, context);
    }

    // NEW SCENE TYPES
    if (type === "key_insight") {
        return wrapHTML(`
            <div class="scene-container anim-container" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <div class="anim-item glass-panel float-subtle" style="display:flex; flex-direction:column; align-items:center; text-align:center; padding: 80px; max-width: 1400px; animation-delay:0.8s; background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01)); border-top: 4px solid ${accent};">
                    <div style="font-size: 100px; margin-bottom: 40px; filter: drop-shadow(0 0 30px ${accent});">${theme.iconEmoji || '&#128161;'}</div>
                    <div style="font-size: 64px; font-weight: 700; color: ${theme.textPrimary}; margin-bottom: 30px; font-family: 'Space Grotesk'; letter-spacing: -2px;">${escHtml(slide.insight)}</div>
                    <div style="font-size: 40px; color: ${theme.textSecondary}; line-height: 1.6;">${escHtml(slide.supporting_text)}</div>
                </div>
            </div>
        `, context);
    }

    if (type === "timeline") {
        const events = slide.events || [];
        const eventNodes = events.map((ev, i) => {
            const isTop = i % 2 === 0;
            return `
                <div class="anim-item" style="position: relative; flex: 1; display:flex; flex-direction:column; align-items:center; animation-delay:${0.8 + i*0.2}s;">
                    ${isTop ? `
                        <div class="glass-panel" style="padding: 20px; text-align:center; margin-bottom: 40px; width: 100%;">
                            <div style="font-family: 'Space Grotesk'; font-size: 32px; font-weight: 700; color: ${accent}; margin-bottom: 10px;">${escHtml(ev.year || ev.label)}</div>
                            <div style="font-size: 24px; color: ${theme.textPrimary};">${escHtml(ev.description)}</div>
                        </div>
                    ` : '<div style="flex:1;"></div>'}
                    
                    <div style="width: 30px; height: 30px; border-radius: 50%; background: ${accent}; box-shadow: 0 0 20px ${accent}; z-index: 2; margin: ${isTop ? '0 0 40px 0' : '40px 0 0 0'};"></div>
                    
                    ${!isTop ? `
                        <div class="glass-panel" style="padding: 20px; text-align:center; margin-top: 40px; width: 100%;">
                            <div style="font-family: 'Space Grotesk'; font-size: 32px; font-weight: 700; color: ${accent}; margin-bottom: 10px;">${escHtml(ev.year || ev.label)}</div>
                            <div style="font-size: 24px; color: ${theme.textPrimary};">${escHtml(ev.description)}</div>
                        </div>
                    ` : '<div style="flex:1;"></div>'}
                </div>
            `;
        }).join("");

        return wrapHTML(`
            <div class="scene-container anim-container">
                <h1 class="anim-heading">${escHtml(slide.title || "Timeline")}</h1>
                <div class="accent-line anim-accent"></div>
                <div style="position: relative; display:flex; width: 100%; max-width: 1600px; margin: 60px auto 0; align-items: center;">
                    <div class="anim-item" style="position: absolute; top: 50%; left: 0; right: 0; height: 4px; background: rgba(255,255,255,0.2); transform: translateY(-50%); z-index: 1; animation-delay: 0.7s;"></div>
                    ${eventNodes}
                </div>
            </div>
        `, context);
    }

    if (type === "quote") {
        return wrapHTML(`
            <div class="scene-container anim-container" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <div class="anim-item float-subtle" style="position: relative; max-width: 1400px; text-align: center; animation-delay:0.8s;">
                    <div style="font-family: serif; font-size: 240px; color: ${accent}; opacity: 0.2; position: absolute; top: -100px; left: -80px; line-height: 1;">"</div>
                    <div style="font-size: 64px; font-weight: 500; color: ${theme.textPrimary}; font-style: italic; line-height: 1.5; margin-bottom: 40px; position: relative; z-index: 2;">${escHtml(slide.quote)}</div>
                    <div style="font-family: 'Space Grotesk'; font-size: 40px; font-weight: 700; color: ${accent}; letter-spacing: 2px; text-transform: uppercase;">— ${escHtml(slide.author)}</div>
                </div>
            </div>
        `, context);
    }

    if (type === "recap") {
        const points = slide.points || [];
        const items = points.map((p, i) => `
            <div class="anim-item" style="display:flex; align-items:center; gap:30px; animation-delay:${1.0 + i*0.2}s; margin-bottom: 30px;">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: ${accent}33; display:flex; justify-content:center; align-items:center; color: ${accent}; font-size: 24px; flex-shrink:0;">✓</div>
                <div style="font-size: 42px; color: ${theme.textPrimary};">${escHtml(p)}</div>
            </div>
        `).join("");

        return wrapHTML(`
            <div class="scene-container anim-container" style="align-items: center;">
                <h1 class="anim-heading">${escHtml(slide.title || "Key Takeaways")}</h1>
                <div class="accent-line anim-accent"></div>
                <div class="anim-item glass-panel float-subtle" style="width: 100%; max-width: 1200px; padding: 60px 80px; animation-delay:0.8s; border-top: 4px solid ${accent};">
                    ${items}
                </div>
            </div>
        `, context);
    }

    // Default fallback
    return wrapHTML(`
        <div class="scene-container anim-container" style="align-items: center; text-align: center;">
            <h1 class="anim-heading">${escHtml(slide.heading || "Education")}</h1>
            <div class="accent-line anim-accent"></div>
            <p class="anim-item float-subtle" style="font-size: 56px; font-weight: 400; color: ${theme.textSecondary}; line-height:1.6; max-width: 1400px; animation-delay:0.8s;">${escHtml(slide.narration_script)}</p>
        </div>
    `, context);
}
