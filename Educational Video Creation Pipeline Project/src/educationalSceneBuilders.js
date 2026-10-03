import fs from "fs";

function escHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escMermaid(str) {
    if (!str) return "";
    // Only escape < and > to prevent HTML injection, leave quotes alone for Mermaid syntax
    return String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getBaseCSS(accent) {
    return `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            background: radial-gradient(circle at 50% 40%, #1e293b 0%, #020617 80%); /* Deep cinematic void */
            color: #f8fafc;
            font-family: 'Inter', -apple-system, sans-serif;
            width: 1920px; height: 1080px; 
            overflow: hidden; 
            display: flex; align-items: center; justify-content: center;
        }
        /* Subtle grid background for tech aesthetic */
        body::before {
            content: ""; position: absolute; inset: 0;
            background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
            background-size: 60px 60px;
            pointer-events: none;
        }
        .scene-container {
            width: 1720px; height: 900px;
            display: flex; flex-direction: column; justify-content: center;
            padding: 0 100px;
            position: relative;
            z-index: 10;
        }
        h1 { font-size: 76px; font-weight: 800; margin-bottom: 24px; color: #fff; letter-spacing: -2px; }
        .accent-line { width: 120px; height: 8px; background: ${accent}; border-radius: 4px; margin-bottom: 60px; box-shadow: 0 0 30px ${accent}88; }
        
        .anim-item { animation: fluidEntrance 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
        
        @keyframes fluidEntrance {
            0% { opacity: 0; transform: translateY(60px) scale(0.95); filter: blur(20px); }
            100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .is-exiting .anim-item { animation: fluidExit 0.8s cubic-bezier(0.4, 0, 1, 1) forwards !important; }
        @keyframes fluidExit { 
            0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
            100% { opacity: 0; transform: translateY(-40px) scale(1.05); filter: blur(15px); } 
        }
    `;
}

function wrapHTML(body, css) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono:wght@400;700&family=STIX+Two+Math&display=swap" rel="stylesheet">
    <style>
        ${css}
        .mermaid { display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; overflow: visible; }
        .mermaid svg { width: 100% !important; height: auto !important; max-width: 100% !important; max-height: 100% !important; }
        /* Mermaid: Lines and Arrows */
        .mermaid svg .edgePath path, .mermaid svg .flowchart-link { stroke: #ffffff !important; stroke-width: 4px !important; fill: none !important; }
        .mermaid svg marker path, .mermaid svg .arrowheadPath { fill: #ffffff !important; stroke: none !important; }
        
        /* Mermaid Global Text Rules (Critical for accurate bounding box calculation) */
        .label, text, span { font-family: 'Inter', -apple-system, sans-serif !important; }
        .node .label, .cluster-label .label, .cluster .label { font-weight: 700 !important; }
        .edgeLabel .label { font-weight: 600 !important; }
        .mermaid svg foreignObject { overflow: visible !important; }
        
        /* Mermaid: Edge Labels (Text on arrows) */
        .mermaid svg .edgeLabel, .mermaid svg .edgeLabel .label, .mermaid svg .edgeLabel rect, .mermaid svg .edge-thickness-normal { background-color: transparent !important; background: transparent !important; fill: transparent !important; }
        .mermaid svg .edgeLabel text, .mermaid svg .edgeLabel span, .mermaid svg .edgeLabel .label { fill: #ffffff !important; color: #ffffff !important; background: transparent !important; }
        
        /* Mermaid: Nodes (Main boxes) */
        .mermaid svg .node rect, .mermaid svg .node circle, .mermaid svg .node polygon, .mermaid svg .node path { fill: #ffffff !important; stroke: #ffffff !important; stroke-width: 2px !important; }
        .mermaid svg .node text, .mermaid svg .node .label, .mermaid svg .node span { fill: #0f172a !important; color: #0f172a !important; background: transparent !important; }
        
        /* Mermaid: Subgraphs (Clusters / Outer boxes) */
        .mermaid svg .cluster rect { fill: rgba(255,255,255,0.05) !important; stroke: rgba(255,255,255,0.4) !important; stroke-width: 2px !important; rx: 15px !important; ry: 15px !important; }
        .mermaid svg .cluster .label, .mermaid svg .cluster text, .mermaid svg .cluster span, .mermaid svg .cluster-label span, .mermaid svg .cluster-label text { color: #ffffff !important; fill: #ffffff !important; background: transparent !important; }
    </style></head><body>${body}
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
      document.fonts.ready.then(() => {
          mermaid.initialize({ 
              startOnLoad: false, 
              theme: 'dark', 
              themeVariables: { 
                  fontFamily: 'Inter', 
                  fontSize: '36px',
                  lineColor: '#ffffff',
                  primaryTextColor: '#ffffff',
                  nodeBorder: '#ffffff',
                  clusterBkg: 'rgba(255,255,255,0.05)',
                  clusterBorder: 'rgba(255,255,255,0.4)',
                  edgeLabelBackground: 'transparent',
                  tertiaryColor: 'transparent'
              },
              flowchart: { nodeSpacing: 120, rankSpacing: 120, padding: 30 },
              sequence: { messageMargin: 60, actorMargin: 100 }
          });
          mermaid.run();
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

export function generateSlideHTML(slide) {
    const type = slide.scene_type || "concept_intro";
    const accent = slide.color_accent || "#3b82f6";
    const baseCSS = getBaseCSS(accent);
    
    let safeMermaidCode = slide.mermaid_code ? slide.mermaid_code.trim() : '';
    if (safeMermaidCode && !/^(graph|flowchart|stateDiagram|sequenceDiagram|classDiagram|erDiagram|gantt|pie|gitGraph|journey|mindmap|quadrantChart|xychart-beta)/i.test(safeMermaidCode)) {
        safeMermaidCode = "graph TD\\n" + safeMermaidCode;
    }

    if (type === "concept_intro" || type === "analogy_visual") {
        const bulletList = slide.bullets || [];
        const scale = getDynamicScale(bulletList.length);
        const bullets = bulletList.map((b, i) => `
            <div class="anim-item" style="animation-delay:${0.4 + i*0.2}s; font-size: ${scale.font}; font-weight: 500; padding: ${scale.pad}; background: rgba(255,255,255,0.03); border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); color: #e2e8f0; display:flex; align-items:center; gap:${scale.gap}; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${accent}; box-shadow: 0 0 20px ${accent}; flex-shrink:0;"></div>
                <div style="text-align: left; line-height: 1.4;">${escHtml(b)}</div>
            </div>
        `).join("");

        return wrapHTML(`
            <div class="scene-container" style="align-items: center; text-align: center;">
                <h1 class="anim-item" style="animation-delay:0.1s">${escHtml(slide.heading)}</h1>
                <div class="accent-line anim-item" style="animation-delay:0.2s"></div>
                <div style="display:flex; flex-direction:column; align-items: center; width: 100%;">
                    <div style="display:flex; flex-direction:column; align-items: stretch; gap: 30px; width: fit-content; max-width: 1400px; min-width: 800px;">
                        ${bullets}
                    </div>
                </div>
            </div>
        `, baseCSS);
    }
    
    if (type === "definition") {
        return wrapHTML(`
            <div class="scene-container" style="display:flex; flex-direction:column; justify-content:center; text-align:center; padding: 0 150px;">
                <div class="anim-item" style="font-size: 110px; font-weight: 800; color: ${accent}; margin-bottom: 40px; text-transform: capitalize; letter-spacing: -2px; animation-delay: 0.2s">${escHtml(slide.term)}</div>
                <div class="anim-item" style="font-size: 56px; line-height: 1.6; color: #e2e8f0; animation-delay: 0.6s">"${escHtml(slide.definition)}"</div>
            </div>
        `, baseCSS);
    }

    if (type === "code_walkthrough") {
        const lineCount = slide.code_snippet ? slide.code_snippet.split('\\n').length : 0;
        let codeFontSize = '36px';
        if (lineCount > 22) codeFontSize = '20px';
        else if (lineCount > 16) codeFontSize = '24px';
        else if (lineCount > 12) codeFontSize = '28px';
        
        // Simple regex-based syntax highlighter for a beautiful VS Code like theme
        let codeHtml = escHtml(slide.code_snippet)
            .replace(/\b(int|float|void|char|struct|class|public|private|return|if|else|for|while)\b/g, '<span style="color:#c678dd">$1</span>')
            .replace(/\b(\d+)\b/g, '<span style="color:#d19a66">$1</span>')
            .replace(/(\/\/.*)/g, '<span style="color:#5c6370; font-style:italic;">$1</span>');
            
        return wrapHTML(`
            <div class="scene-container">
                <h1 class="anim-item" style="animation-delay:0.1s">${escHtml(slide.heading || "Code Implementation")}</h1>
                <div class="accent-line anim-item" style="animation-delay:0.2s"></div>
                <div class="anim-item" style="background:#282c34; padding:40px; border-radius:16px; border-left: 8px solid ${accent}; box-shadow: 0 20px 40px rgba(0,0,0,0.6); animation-delay:0.4s;">
                    <div style="font-family:'JetBrains Mono', monospace; font-size:${codeFontSize}; line-height:1.6; color:#abb2bf; white-space:pre-wrap;">${codeHtml}</div>
                </div>
            </div>
        `, baseCSS);
    }

    if (type === "math_equation") {
        return wrapHTML(`
            <div class="scene-container" style="display:flex; flex-direction:column; justify-content:center; text-align:center;">
                <div class="anim-item" style="font-family:'STIX Two Math', serif; font-size: 130px; color: ${accent}; margin-bottom: 60px; animation-delay:0.3s">${escHtml(slide.equation)}</div>
                <div class="anim-item" style="display:flex; flex-direction:column; gap:20px; animation-delay:0.7s;">
                    ${(slide.explanation_steps || []).map(s => `<div style="font-size: 42px; color: #cbd5e1;">${escHtml(s)}</div>`).join("")}
                </div>
            </div>
        `, baseCSS);
    }

    if (type === "step_by_step") {
        const stepList = slide.steps || [];
        const scale = getDynamicScale(stepList.length);
        const steps = stepList.map((s, i) => `
            <div class="anim-item" style="display:flex; align-items:center; gap:${scale.gap}; background:linear-gradient(90deg, rgba(255,255,255,0.05), transparent); padding:${scale.pad}; border-radius:24px; border-left: 4px solid ${accent}; animation-delay:${0.3 + i*0.2}s">
                <div style="width: ${scale.circ}; height: ${scale.circ}; border-radius: 50%; background: ${accent}; color: #000; font-size: ${scale.numFont}; font-weight: 800; display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow: 0 0 30px ${accent}aa;">${i+1}</div>
                <div style="font-size: ${scale.font}; font-weight: 500; color: #f8fafc; line-height: 1.4; text-align: left;">${escHtml(s)}</div>
            </div>
        `).join("");
        return wrapHTML(`
            <div class="scene-container" style="align-items: center; text-align: center;">
                <h1 class="anim-item">${escHtml(slide.title || "Process")}</h1>
                <div class="accent-line anim-item"></div>
                <div style="display:flex; flex-direction:column; align-items: center; width: 100%;">
                    <div style="display:flex; flex-direction:column; align-items: stretch; gap: 30px; width: fit-content; max-width: 1400px; min-width: 800px;">
                        ${steps}
                    </div>
                </div>
            </div>
        `, baseCSS);
    }

    if (type === "comparison_table") {
        const rowList = slide.rows || [];
        const scale = getDynamicScale(rowList.length);
        const headers = (slide.headers || []).map(h => `<th style="padding:${scale.thPad}; text-align:center; font-size:${scale.thFont}; font-weight:800; color:${accent}; border-bottom:4px solid rgba(255,255,255,0.1); text-transform:uppercase; letter-spacing: 2px;">${escHtml(h)}</th>`).join("");
        const rows = rowList.map((r, i) => `
            <tr class="anim-item" style="animation-delay:${0.4 + i*0.1}s; background: ${i%2===0 ? 'rgba(255,255,255,0.02)' : 'transparent'}; transition: all 0.3s;">
                ${r.map(cell => `<td style="padding:${scale.thPad}; font-size:${scale.tdFont}; font-weight:500; color:#e2e8f0; text-align:center; border-bottom:1px solid rgba(255,255,255,0.05); word-wrap: break-word; overflow-wrap: break-word;">${escHtml(cell)}</td>`).join("")}
            </tr>
        `).join("");
        return wrapHTML(`
            <div class="scene-container" style="align-items: center; text-align: center;">
                <h1 class="anim-item">${escHtml(slide.title || "Comparison")}</h1>
                <div class="accent-line anim-item"></div>
                <div style="width:100%; max-width: 1600px; background: rgba(15, 23, 42, 0.6); border-radius: 30px; border: 1px solid rgba(255,255,255,0.05); padding: 20px; box-shadow: 0 40px 80px rgba(0,0,0,0.8);">
                    <table style="width:100%; border-collapse:collapse; table-layout: fixed;">
                        <thead class="anim-item" style="animation-delay:0.3s"><tr>${headers}</tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>
        `, baseCSS);
    }

    if (type === "pros_cons") {
        const prosList = slide.pros || [];
        const consList = slide.cons || [];
        const maxItems = Math.max(prosList.length, consList.length);
        const scale = getDynamicScale(maxItems);
        const pros = prosList.map(p => `<li style="margin-bottom:${scale.marginB}; display:flex; gap:24px; align-items:center;"><div style="width:16px; height:16px; border-radius:50%; background:#10b981; box-shadow: 0 0 15px #10b981; flex-shrink:0;"></div> <span style="line-height:1.4;">${escHtml(p)}</span></li>`).join("");
        const cons = consList.map(c => `<li style="margin-bottom:${scale.marginB}; display:flex; gap:24px; align-items:center;"><div style="width:16px; height:16px; border-radius:50%; background:#ef4444; box-shadow: 0 0 15px #ef4444; flex-shrink:0;"></div> <span style="line-height:1.4;">${escHtml(c)}</span></li>`).join("");
        return wrapHTML(`
            <div class="scene-container" style="align-items: center;">
                <h1 class="anim-item">${escHtml(slide.title || "Trade-offs")}</h1>
                <div class="accent-line anim-item"></div>
                <div style="display:flex; gap:60px; width: 100%; max-width: 1600px; margin-top:40px;">
                    <div class="anim-item" style="flex:1; background:linear-gradient(145deg, rgba(16, 185, 129, 0.1), rgba(0,0,0,0)); border-top: 4px solid #10b981; border-radius:30px; padding:60px; box-shadow: 0 30px 60px rgba(0,0,0,0.5); animation-delay:0.4s; backdrop-filter:blur(10px);">
                        <h2 style="color:#10b981; font-size:64px; font-weight:800; margin-bottom:40px; text-shadow: 0 0 30px rgba(16,185,129,0.5);">Pros</h2>
                        <ul style="list-style:none; font-size:${scale.prosFont}; font-weight:500; color:#f8fafc;">${pros}</ul>
                    </div>
                    <div class="anim-item" style="flex:1; background:linear-gradient(145deg, rgba(239, 68, 68, 0.1), rgba(0,0,0,0)); border-top: 4px solid #ef4444; border-radius:30px; padding:60px; box-shadow: 0 30px 60px rgba(0,0,0,0.5); animation-delay:0.6s; backdrop-filter:blur(10px);">
                        <h2 style="color:#ef4444; font-size:64px; font-weight:800; margin-bottom:40px; text-shadow: 0 0 30px rgba(239,68,68,0.5);">Cons</h2>
                        <ul style="list-style:none; font-size:${scale.prosFont}; font-weight:500; color:#f8fafc;">${cons}</ul>
                    </div>
                </div>
            </div>
        `, baseCSS);
    }
    
    if (type === "big_number") {
        const numStr = String(slide.number || "");
        let numFontSize = "320px";
        let shadowSize = "100px";
        let letterSpacing = "-5px";
        if (numStr.length > 15) { numFontSize = "100px"; shadowSize = "40px"; letterSpacing = "-2px"; }
        else if (numStr.length > 10) { numFontSize = "140px"; shadowSize = "50px"; letterSpacing = "-2px"; }
        else if (numStr.length > 7) { numFontSize = "200px"; shadowSize = "60px"; letterSpacing = "-3px"; }
        else if (numStr.length > 4) { numFontSize = "260px"; shadowSize = "80px"; letterSpacing = "-4px"; }
        
        return wrapHTML(`
            <div class="scene-container" style="display:flex; flex-direction:column; justify-content:center; align-items:center;">
                <div class="anim-item" style="font-size: ${numFontSize}; font-weight: 800; color: #fff; line-height:1; margin-bottom: 30px; text-shadow: 0 0 ${shadowSize} ${accent}aa; animation-delay:0.3s; letter-spacing: ${letterSpacing}; text-align: center;">${escHtml(numStr)}</div>
                <div class="anim-item" style="font-size: 64px; font-weight: 500; color: #cbd5e1; letter-spacing: 4px; text-transform: uppercase; animation-delay:0.7s; text-align: center;">${escHtml(slide.label)}</div>
            </div>
        `, baseCSS);
    }

    if (type === "mermaid_diagram") {
        return wrapHTML(`
            <div class="scene-container" style="align-items: center; text-align: center;">
                <h1 class="anim-item" style="animation-delay:0.1s; margin-bottom: 20px;">${escHtml(slide.title || slide.heading || "Architecture")}</h1>
                <div class="accent-line anim-item" style="animation-delay:0.2s; margin-bottom: 30px;"></div>
                <div class="anim-item" style="animation-delay:0.3s; width: 100%; max-width: 1700px; height: 80vh; display:flex; justify-content:center; align-items:center; background: rgba(15, 23, 42, 0.6); padding: 20px; border-radius: 30px; box-shadow: 0 40px 80px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.05);">
                    <div class="mermaid">${escMermaid(safeMermaidCode)}</div>
                </div>
            </div>
        `, baseCSS);
    }

    // Default fallback
    return wrapHTML(`
        <div class="scene-container" style="align-items: center; text-align: center;">
            <h1 class="anim-item">${escHtml(slide.heading || "Education")}</h1>
            <div class="accent-line anim-item"></div>
            <p class="anim-item" style="font-size: 56px; font-weight: 400; color: #e2e8f0; line-height:1.6; max-width: 1400px; animation-delay:0.4s;">${escHtml(slide.narration_script)}</p>
        </div>
    `, baseCSS);
}
