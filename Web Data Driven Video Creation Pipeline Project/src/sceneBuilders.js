import fs from "fs";
import path from "path";
import { getThemeCSS, getBaseCSS, hexToRGB, shiftHue } from "./themes.js";
import { getAnimationCSS } from "./animations.js";

let _chartJSInline = "";
export function setChartJSInline(code) { _chartJSInline = code; }

export const AVAILABLE_SCENE_TYPES = [
    "default", "table", "chart", "image", "big_number", "quote", "timeline", "comparison",
    "pros_cons", "steps", "definition", "stats_grid", "funnel", "pyramid", "ranking",
    "before_after", "fact_box", "code_block", "feature_grid", "testimonial", "countdown",
    "process_flow", "split_text", "word_highlight", "gauge", "progress_bars", "icon_grid",
    "matrix_2x2", "headline_only", "card_stack", "multi_column", "tier_list", "checklist",
    "warning_box", "number_line", "donut_stats", "roadmap", "highlight_text", "two_column",
    "profile_card", "metric_row", "swot", "equation", "poll_results", "gradient_list",
    "logo_showcase", "mini_cards", "cta", "key_value", "map_points"
];

function escHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapHTML(body, css, scripts = "") {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><style>${css}</style></head><body>${body}${scripts}</body></html>`;
}

function buildCSS(slide, extraCSS = "") {
    const accent = slide.color_accent || "#4DA6FF";
    const theme = slide.scene_theme || "glassmorphism";
    const animHint = slide.animation_hint || "stagger-left";
    return `
        ${getBaseCSS(accent)}
        ${getThemeCSS(theme, accent)}
        ${getAnimationCSS(animHint)}
        ${extraCSS}
    `;
}

// ─── 50 SCENE BUILDERS ────────────────────────────────────────────────────────

function buildDefault(slide, outputDir) {
    const bullets = (slide.bullet_points || []).map((bp, i) => `<li class="anim-item" style="animation-delay: ${0.4 + i * 0.2}s">${escHtml(bp)}</li>`).join("");
    let clipartHTML = "";
    for (let j = 0; j < 3; j++) {
        const jpgPath = path.join(outputDir, `clipart_${slide.slide_number}_${j}.jpg`);
        const svgPath = path.join(outputDir, `clipart_${slide.slide_number}_${j}.svg`);
        if (fs.existsSync(jpgPath)) {
            clipartHTML += `<img src="data:image/jpeg;base64,${fs.readFileSync(jpgPath).toString("base64")}" class="clipart" alt="clipart" style="animation-delay: ${0.6 + j * 0.4}s">`;
        } else if (fs.existsSync(svgPath)) {
            clipartHTML += `<img src="data:image/svg+xml;base64,${fs.readFileSync(svgPath).toString("base64")}" class="clipart twemoji" alt="clipart" style="animation-delay: ${0.6 + j * 0.4}s">`;
        }
    }
    return wrapHTML(`
        <div class="scene-card">
            <h1>${escHtml(slide.heading)}</h1>
            <div class="accent-line"></div>
            <div class="content-wrapper">
                <div class="text-col"><ul>${bullets}</ul></div>
                ${clipartHTML ? `<div class="clipart-col">${clipartHTML}</div>` : ""}
            </div>
        </div>
    `, buildCSS(slide));
}

function buildTable(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const h = (slide.table_headers || []).map(x => `<th>${escHtml(x)}</th>`).join("");
    const r = (slide.table_rows || []).map((row, i) => `<tr class="anim-item ${i%2===0?"even":"odd"}" style="animation-delay:${0.4+i*0.2}s">${row.map(c=>`<td>${escHtml(c)}</td>`).join("")}</tr>`).join("");
    const css = `
        .table-wrap { width:100%; margin-top:20px; border-radius:12px; overflow:hidden; }
        table { width:100%; border-collapse:collapse; font-size:32px; }
        th { background:${accent}44; color:#fff; padding:20px; text-align:center; border-bottom:3px solid ${accent}; font-weight:bold; }
        td { padding:18px; text-align:center; background:rgba(255,255,255,0.03); }
        tr.even td { background:rgba(255,255,255,0.06); }
    `;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="table-wrap"><table><thead><tr>${h}</tr></thead><tbody>${r}</tbody></table></div></div>`, buildCSS(slide, css));
}

function buildChart(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const cType = (slide.chart_type||"bar").toLowerCase();
    const dataObj = {
        labels: slide.chart_labels || [],
        datasets: (slide.chart_datasets || []).map((ds, i) => {
            let bg, border;
            if (cType === "pie" || cType === "doughnut" || (cType === "bar" && (slide.chart_datasets||[]).length === 1)) {
                // Generate a full spread of distinct colors around the color wheel for each slice/bar
                const len = Math.max((ds.data || []).length, 1);
                bg = (ds.data || []).map((_, j) => `${shiftHue(accent, j * (360 / len))}99`);
                border = (ds.data || []).map((_, j) => shiftHue(accent, j * (360 / len)));
            } else {
                // For multi-dataset or line charts, use one distinct color per dataset
                const c = i === 0 ? accent : shiftHue(accent, 45 * i);
                bg = `${c}99`;
                border = c;
            }
            const isLine = cType === "line";
            return {
                label: ds.label || "",
                data: ds.data || [],
                backgroundColor: isLine ? "transparent" : bg,
                borderColor: border,
                borderWidth: isLine ? 6 : 2,
                tension: isLine ? 0.4 : 0, // Smooth curves for lines
                pointRadius: isLine ? 8 : 3,
                pointBackgroundColor: border,
                pointBorderWidth: 2,
                pointHoverRadius: 10
            };
        })
    };
    const css = `.chart-container { width:1500px; height:650px; margin:20px auto 0; position:relative; } canvas { filter: drop-shadow(0 0 15px ${accent}44); }`;
    const script = `
        <script>${_chartJSInline}</script>
        <script>
            Chart.defaults.color = "#fff";
            Chart.defaults.font.size = 24;
            Chart.defaults.font.family = "Segoe UI";
            
            const cType = "${cType}";
            const isPie = cType === "pie" || cType === "doughnut";
            const isRadar = cType === "radar" || cType === "polararea";
            const isSingleDataset = ${dataObj.datasets.length === 1};
            const showLegend = isPie || isRadar || !isSingleDataset;
            
            // Extract axis labels from slide data or fallback to dataset label
            const yLabel = "${escHtml(slide.y_axis_label || (dataObj.datasets.length === 1 ? dataObj.datasets[0].label : ""))}  ";
            const xLabel = "${escHtml(slide.x_axis_label || "")}";

            // Pie, Doughnut, Radar, and PolarArea do not use standard X/Y Cartesian grids
            const scalesConfig = (isPie || isRadar) ? {} : {
                x: { 
                    grid: { color: "rgba(255,255,255,0.1)" },
                    title: { display: !!xLabel, text: xLabel, font: { size: 26, style: 'italic' }, color: "#bbb", padding: {top: 15} },
                    ticks: { font: { size: 22 }, color: "#ccc" }
                },
                y: { 
                    grid: { color: "rgba(255,255,255,0.1)" }, 
                    beginAtZero: true,
                    title: { display: !!yLabel.trim(), text: yLabel.trim(), font: { size: 30, weight: 'bold' }, color: "${accent}", padding: {bottom: 15} },
                    ticks: { font: { size: 22 }, color: "#ccc" }
                }
            };
            
            // For Radar charts, configure the radial scale font color
            if (isRadar) {
                scalesConfig.r = {
                    grid: { color: "rgba(255,255,255,0.2)" },
                    angleLines: { color: "rgba(255,255,255,0.2)" },
                    pointLabels: { color: "#fff", font: { size: 22 } },
                    ticks: { display: false } // hide internal numbers for cleaner look
                };
            }

            new Chart(document.getElementById('myChart'), {
                type: "${cType}",
                data: ${JSON.stringify(dataObj)},
                options: {
                    responsive: true, maintainAspectRatio: false,
                    animation: { duration: 1500, easing: 'easeOutQuart' },
                    plugins: { 
                        legend: { 
                            display: showLegend,
                            labels: { font: { size: 28 }, color: "#eee" } 
                        } 
                    },
                    scales: scalesConfig
                }
            });
        </script>
    `;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="chart-container anim-item" style="animation-delay:0.5s"><canvas id="myChart"></canvas></div></div>`, buildCSS(slide, css), script);
}

function buildImage(slide, outputDir) {
    const imgPath = path.join(outputDir, `ai_image_${slide.slide_number}.jpg`);
    let imgHTML = "";
    if (fs.existsSync(imgPath)) {
        imgHTML = `<img src="data:image/jpeg;base64,${fs.readFileSync(imgPath).toString("base64")}" class="anim-item" style="width:100%; max-height:600px; object-fit:cover; border-radius:16px; border:4px solid ${slide.color_accent||"#fff"}; animation-delay:0.5s; box-shadow:0 15px 40px rgba(0,0,0,0.5);">`;
    }
    const bullets = (slide.bullet_points || []).map((bp, i) => `<li class="anim-item" style="animation-delay: ${0.7 + i * 0.2}s">${escHtml(bp)}</li>`).join("");
    const css = `.img-split { display:flex; gap:40px; margin-top:20px; } .img-col { flex:1; } .txt-col { flex:1; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="img-split"><div class="img-col">${imgHTML}</div><div class="txt-col"><ul>${bullets}</ul></div></div></div>`, buildCSS(slide, css));
}

function buildBigNumber(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const css = `.scene-card { text-align:center; align-items:center; } .big-number { font-size:220px; font-weight:900; color:${accent}; text-shadow:0 0 50px ${accent}66; margin:40px 0 10px; line-height:1; } .big-label { font-size:48px; color:#ddd; font-weight:300; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line" style="margin:10px auto;"></div><div class="big-number anim-item" style="animation-delay:0.4s">${escHtml(slide.big_number)}</div><div class="big-label anim-item" style="animation-delay:0.8s">${escHtml(slide.big_number_label)}</div></div>`, buildCSS(slide, css));
}

function buildQuote(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const css = `.quote-box { margin:auto; padding:60px 80px; position:relative; background:rgba(0,0,0,0.3); border-left:12px solid ${accent}; border-radius:16px; width:80%; } .quote-box::before { content:'"'; position:absolute; top:-20px; left:40px; font-size:160px; color:${accent}; opacity:0.3; font-family:serif; line-height:1; } .q-text { font-size:52px; font-style:italic; line-height:1.4; margin-bottom:30px; } .q-author { font-size:36px; color:${accent}; font-weight:bold; text-align:right; }`;
    return wrapHTML(`<div class="scene-card" style="justify-content:center"><div class="quote-box anim-item" style="animation-delay:0.3s"><div class="q-text">"${escHtml(slide.quote_text)}"</div><div class="q-author">— ${escHtml(slide.quote_author)}</div></div></div>`, buildCSS(slide, css));
}

function buildTimeline(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const items = (slide.timeline_items || []).map((item, i) => `
        <div class="tl-item anim-item" style="animation-delay:${0.4+i*0.3}s">
            <div class="tl-year" style="color:${accent}">${escHtml(item.year)}</div>
            <div class="tl-dot" style="background:${accent}; box-shadow:0 0 15px ${accent}"></div>
            <div class="tl-event">${escHtml(item.event)}</div>
        </div>
    `).join("");
    const css = `.tl-container { position:relative; margin-top:30px; padding-left:220px; } .tl-container::before { content:''; position:absolute; left:200px; top:0; bottom:0; width:4px; background:${accent}44; } .tl-item { position:relative; margin-bottom:40px; display:flex; align-items:center; } .tl-year { position:absolute; left:-220px; width:180px; text-align:right; font-size:36px; font-weight:bold; } .tl-dot { position:absolute; left:-28px; width:20px; height:20px; border-radius:50%; } .tl-event { font-size:36px; background:rgba(255,255,255,0.05); padding:16px 24px; border-radius:12px; margin-left:20px; flex:1; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="tl-container">${items}</div></div>`, buildCSS(slide, css));
}

function buildComparison(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const acc2 = shiftHue(accent, 180);
    const leftPoints = (slide.compare_left_points||[]).map(p=>`<li>${escHtml(p)}</li>`).join("");
    const rightPoints = (slide.compare_right_points||[]).map(p=>`<li>${escHtml(p)}</li>`).join("");
    const css = `.comp-grid { display:flex; gap:60px; margin-top:20px; position:relative; } .comp-col { flex:1; min-width:0; background:rgba(255,255,255,0.05); padding:40px; border-radius:16px; border-top:6px solid; } .col-left { border-color:${accent}; } .col-right { border-color:${acc2}; } .vs-badge { position:absolute; left:50%; top:50%; margin-left:-40px; margin-top:-40px; background:#222; border:4px solid #444; border-radius:50%; width:80px; height:80px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:32px; z-index:10;} h2 { font-size:42px; margin-bottom:20px; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="comp-grid"><div class="comp-col col-left anim-item" style="animation-delay:0.3s"><h2 style="color:${accent}">${escHtml(slide.compare_left_title)}</h2><ul>${leftPoints}</ul></div><div class="vs-badge anim-item" style="animation-delay:0.7s">VS</div><div class="comp-col col-right anim-item" style="animation-delay:0.5s"><h2 style="color:${acc2}">${escHtml(slide.compare_right_title)}</h2><ul>${rightPoints}</ul></div></div></div>`, buildCSS(slide, css));
}

function buildProsCons(slide) {
    const pros = (slide.pros||[]).map(p=>`<li class="pro-item">✅ ${escHtml(p)}</li>`).join("");
    const cons = (slide.cons||[]).map(p=>`<li class="con-item">❌ ${escHtml(p)}</li>`).join("");
    const css = `.pc-grid { display:flex; gap:40px; margin-top:20px; } .pc-col { flex:1; padding:30px; border-radius:16px; } .pc-pros { background:rgba(0,255,100,0.05); border:1px solid rgba(0,255,100,0.2); } .pc-cons { background:rgba(255,50,50,0.05); border:1px solid rgba(255,50,50,0.2); } .pc-col h2 { font-size:48px; margin-bottom:20px; } .pc-col li { font-size:36px; margin-bottom:15px; display:block; padding:0; } .pc-pros h2 { color:#4ade80; } .pc-cons h2 { color:#f87171; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="pc-grid"><div class="pc-col pc-pros anim-item" style="animation-delay:0.3s"><h2>Pros</h2><ul>${pros}</ul></div><div class="pc-col pc-cons anim-item" style="animation-delay:0.5s"><h2>Cons</h2><ul>${cons}</ul></div></div></div>`, buildCSS(slide, css));
}

function buildSteps(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const steps = (slide.steps||[]).map((s,i) => `<div class="step-card anim-item" style="animation-delay:${0.4+i*0.2}s"><div class="step-num">${s.number||(i+1)}</div><div class="step-content"><h2>${escHtml(s.title)}</h2><p>${escHtml(s.description)}</p></div></div>`).join("");
    const css = `.steps-container { display:flex; flex-direction:column; gap:20px; margin-top:20px; } .step-card { display:flex; align-items:center; background:rgba(255,255,255,0.05); border-radius:16px; padding:20px 30px; border-left:8px solid ${accent}; } .step-num { font-size:64px; font-weight:900; color:${accent}; width:100px; opacity:0.8; } .step-content h2 { font-size:38px; margin-bottom:8px; } .step-content p { font-size:28px; color:#ccc; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="steps-container">${steps}</div></div>`, buildCSS(slide, css));
}

function buildDefinition(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const css = `.def-wrap { display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; text-align:center; padding:0 100px; } .term { font-size:120px; color:${accent}; font-weight:900; margin-bottom:40px; letter-spacing:2px; text-shadow:0 10px 30px ${accent}44; } .definition { font-size:52px; line-height:1.5; color:#eee; }`;
    return wrapHTML(`<div class="scene-card"><div class="def-wrap"><div class="term anim-item" style="animation-delay:0.3s">${escHtml(slide.term)}</div><div class="definition anim-item" style="animation-delay:0.7s">${escHtml(slide.definition)}</div></div></div>`, buildCSS(slide, css));
}

function buildStatsGrid(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const stats = (slide.stats||[]).map((s,i) => `<div class="stat-card anim-item" style="animation-delay:${0.3+i*0.15}s"><div class="stat-val" style="color:${shiftHue(accent, i*30)}">${escHtml(s.value)}</div><div class="stat-lbl">${escHtml(s.label)}</div></div>`).join("");
    const css = `.sg-container { display:grid; grid-template-columns:repeat(auto-fit, minmax(400px, 1fr)); gap:40px; margin-top:40px; } .stat-card { background:rgba(255,255,255,0.05); border-radius:20px; padding:40px; text-align:center; border:1px solid rgba(255,255,255,0.1); box-shadow:0 10px 30px rgba(0,0,0,0.3); } .stat-val { font-size:80px; font-weight:900; margin-bottom:15px; text-shadow:0 0 20px currentColor; } .stat-lbl { font-size:32px; color:#ccc; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="sg-container">${stats}</div></div>`, buildCSS(slide, css));
}

function buildFunnel(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const stages = slide.funnel_stages||[];
    const n = stages.length;
    const html = stages.map((s,i) => {
        const width = 100 - (i * (60/(n||1)));
        const bg = `${shiftHue(accent, i*20)}`;
        return `<div class="funnel-stage anim-item" style="width:${width}%; background:${bg}; animation-delay:${0.3+i*0.2}s"><span class="f-lbl">${escHtml(s.label)}</span><span class="f-val">${escHtml(s.value)}</span></div>`;
    }).join("");
    const css = `.funnel-wrap { display:flex; flex-direction:column; align-items:center; gap:10px; margin-top:40px; width:100%; } .funnel-stage { padding:25px 40px; display:flex; justify-content:space-between; align-items:center; color:#fff; font-weight:bold; font-size:36px; box-shadow:0 5px 15px rgba(0,0,0,0.3); clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%); transition:all 0.3s;} .f-val { font-size:42px; text-shadow:2px 2px 4px rgba(0,0,0,0.5); }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="funnel-wrap">${html}</div></div>`, buildCSS(slide, css));
}

function buildPyramid(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const levels = slide.pyramid_levels||[];
    const n = levels.length;
    const html = levels.map((s,i) => {
        const width = 30 + (i * (70/(n||1)));
        const bg = `${shiftHue(accent, -i*20)}`;
        return `<div class="pyr-stage anim-item" style="width:${width}%; background:${bg}; animation-delay:${0.3+i*0.2}s">${escHtml(s.label)}</div>`;
    }).join("");
    const css = `.pyr-wrap { display:flex; flex-direction:column; align-items:center; gap:8px; margin-top:40px; width:100%; } .pyr-stage { padding:20px; text-align:center; color:#fff; font-weight:bold; font-size:36px; clip-path: polygon(10% 0, 90% 0, 100% 100%, 0% 100%); text-shadow:2px 2px 4px rgba(0,0,0,0.4); }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="pyr-wrap">${html}</div></div>`, buildCSS(slide, css));
}

function buildRanking(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const html = (slide.rankings||[]).map((r,i) => {
        const bg = `${shiftHue(accent, i*15)}`;
        // Calculate a pseudo width based on ranking to make bars look staggered if values are just text
        const w = Math.max(30, 100 - (i*10));
        return `<div class="rank-row anim-item" style="animation-delay:${0.3+i*0.15}s"><div class="rank-num">${r.rank||i+1}</div><div class="rank-bar-wrap"><div class="rank-bar" style="width:${w}%; background:${bg}"><span class="r-lbl">${escHtml(r.label)}</span><span class="r-val">${escHtml(r.value)}</span></div></div></div>`;
    }).join("");
    const css = `.rank-wrap { margin-top:30px; display:flex; flex-direction:column; gap:20px; } .rank-row { display:flex; align-items:center; gap:20px; } .rank-num { font-size:48px; font-weight:900; color:#888; width:60px; text-align:center; } .rank-bar-wrap { flex:1; background:rgba(255,255,255,0.05); border-radius:12px; height:70px; overflow:hidden; } .rank-bar { height:100%; display:flex; justify-content:space-between; align-items:center; padding:0 25px; color:#fff; font-size:32px; font-weight:bold; border-radius:12px; white-space:nowrap; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="rank-wrap">${html}</div></div>`, buildCSS(slide, css));
}

function buildBeforeAfter(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const bp = (slide.before_points||[]).map(p=>`<li>${escHtml(p)}</li>`).join("");
    const ap = (slide.after_points||[]).map(p=>`<li>${escHtml(p)}</li>`).join("");
    const css = `.ba-grid { display:flex; gap:40px; margin-top:20px; height:100%; } .ba-col { flex:1; padding:40px; border-radius:20px; position:relative; overflow:hidden; } .ba-col::before { content:''; position:absolute; inset:0; opacity:0.1; z-index:-1; } .before-col::before { background:#f00; } .after-col::before { background:#0f0; } .ba-col h2 { font-size:52px; margin-bottom:30px; border-bottom:4px solid; display:inline-block; padding-bottom:10px; } .before-col h2 { color:#ff6b6b; border-color:#ff6b6b; } .after-col h2 { color:#4ade80; border-color:#4ade80; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="ba-grid"><div class="ba-col before-col anim-item" style="animation-delay:0.3s"><h2>${escHtml(slide.before_title||"Before")}</h2><ul>${bp}</ul></div><div class="ba-col after-col anim-item" style="animation-delay:0.7s"><h2>${escHtml(slide.after_title||"After")}</h2><ul>${ap}</ul></div></div></div>`, buildCSS(slide, css));
}

function buildFactBox(slide) {
    const accent = slide.color_accent || "#FFD700";
    const css = `.fact-wrap { display:flex; align-items:center; justify-content:center; height:100%; padding:0 80px; } .fact-box { background:rgba(255,255,255,0.08); border:2px solid ${accent}; padding:60px; border-radius:24px; text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.5); position:relative; } .fact-box::before { content:'💡'; font-size:80px; position:absolute; top:-50px; left:50%; transform:translateX(-50%); background:#222; border-radius:50%; padding:10px; } .f-text { font-size:64px; font-weight:bold; color:#fff; line-height:1.4; margin-top:20px; } .f-src { font-size:28px; color:${accent}; margin-top:40px; text-transform:uppercase; letter-spacing:2px; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="fact-wrap"><div class="fact-box anim-item" style="animation-delay:0.4s"><div class="f-text">${escHtml(slide.fact_text)}</div><div class="f-src">SOURCE: ${escHtml(slide.fact_source)}</div></div></div></div>`, buildCSS(slide, css));
}

function buildCodeBlock(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const css = `.code-wrap { background:#1e1e1e; border-radius:12px; padding:30px; border-left:6px solid ${accent}; margin-top:20px; box-shadow:0 10px 30px rgba(0,0,0,0.5); overflow:hidden; } .code-header { color:#888; font-family:monospace; font-size:24px; margin-bottom:15px; text-transform:uppercase; } pre { margin:0; } code { font-family:'Courier New', monospace; font-size:32px; color:#d4d4d4; line-height:1.5; white-space:pre-wrap; text-shadow:none; } .kwd { color:#569cd6; } .str { color:#ce9178; } .cmt { color:#6a9955; }`;
    // Simple mock syntax highlighting
    let code = escHtml(slide.code_text)
        .replace(/\b(function|const|let|var|if|else|return|import|export|class|async|await)\b/g, '<span class="kwd">$1</span>')
        .replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="str">$1</span>')
        .replace(/(\/\/.*)/g, '<span class="cmt">$1</span>');
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="code-wrap anim-item" style="animation-delay:0.4s"><div class="code-header">${escHtml(slide.code_language)}</div><pre><code>${code}</code></pre></div></div>`, buildCSS(slide, css));
}

function buildFeatureGrid(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const features = (slide.features||[]).map((f,i) => `<div class="feat-card anim-item" style="animation-delay:${0.3+i*0.15}s"><div class="f-icon">${escHtml(f.icon_emoji)}</div><div class="f-content"><h3>${escHtml(f.title)}</h3><p>${escHtml(f.description)}</p></div></div>`).join("");
    const css = `.fg-container { display:grid; grid-template-columns:1fr 1fr; gap:40px; margin-top:30px; } .feat-card { background:rgba(255,255,255,0.05); padding:30px; border-radius:20px; display:flex; gap:25px; border:1px solid rgba(255,255,255,0.1); transition:all 0.3s; } .f-icon { font-size:70px; line-height:1; } .f-content h3 { font-size:40px; color:${accent}; margin-bottom:10px; } .f-content p { font-size:28px; color:#ccc; line-height:1.4; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="fg-container">${features}</div></div>`, buildCSS(slide, css));
}

function buildTestimonial(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const css = `.test-wrap { display:flex; align-items:center; justify-content:center; height:100%; } .test-card { max-width:1200px; text-align:center; } .stars { color:#FFD700; font-size:60px; margin-bottom:20px; } .t-text { font-size:56px; font-weight:bold; font-style:italic; line-height:1.4; margin-bottom:40px; } .t-author { font-size:40px; color:${accent}; font-weight:bold; } .t-role { font-size:32px; color:#aaa; margin-top:5px; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="test-wrap"><div class="test-card anim-item" style="animation-delay:0.4s"><div class="stars">★★★★★</div><div class="t-text">"${escHtml(slide.testimonial_text)}"</div><div class="t-author">${escHtml(slide.testimonial_author)}</div><div class="t-role">${escHtml(slide.testimonial_role)}</div></div></div></div>`, buildCSS(slide, css));
}

function buildCountdown(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const items = (slide.countdown_items||[]).map((c,i) => `<div class="cd-item anim-item" style="animation-delay:${0.3+i*0.3}s"><div class="cd-num" style="color:${shiftHue(accent, i*20)}">${escHtml(c.number)}</div><div class="cd-txt">${escHtml(c.text)}</div></div>`).join("");
    const css = `.cd-wrap { display:flex; flex-direction:column; gap:25px; margin-top:20px; } .cd-item { display:flex; align-items:center; background:rgba(255,255,255,0.05); padding:20px 40px; border-radius:100px; box-shadow:inset 0 0 20px rgba(0,0,0,0.5); } .cd-num { font-size:80px; font-weight:900; width:120px; text-align:center; text-shadow:0 0 15px currentColor; margin-right:30px; } .cd-txt { font-size:42px; font-weight:bold; color:#fff; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="cd-wrap">${items}</div></div>`, buildCSS(slide, css));
}

function buildProcessFlow(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const steps = (slide.process_steps||[]);
    let html = "";
    steps.forEach((s, i) => {
        html += `<div class="proc-step anim-item" style="animation-delay:${0.3+i*0.2}s"><div class="proc-circle" style="border-color:${shiftHue(accent, i*30)}">${i+1}</div><div class="proc-lbl">${escHtml(s.label)}</div></div>`;
        if (i < steps.length - 1) html += `<div class="proc-arrow anim-item" style="animation-delay:${0.4+i*0.2}s">➔</div>`;
    });
    const css = `.proc-wrap { display:flex; align-items:center; justify-content:center; gap:20px; margin-top:120px; width:100%; } .proc-step { display:flex; flex-direction:column; align-items:center; width:220px; text-align:center; } .proc-circle { width:120px; height:120px; border-radius:50%; border:6px solid; display:flex; align-items:center; justify-content:center; font-size:50px; font-weight:bold; background:rgba(255,255,255,0.1); margin-bottom:20px; } .proc-lbl { font-size:32px; font-weight:bold; } .proc-arrow { font-size:60px; color:#666; margin-top:-60px; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="proc-wrap">${html}</div></div>`, buildCSS(slide, css));
}

function buildSplitText(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const css = `.split-wrap { display:flex; height:100%; align-items:center; gap:80px; } .s-left { flex:1; font-size:90px; font-weight:900; color:${accent}; line-height:1.1; text-shadow:0 0 30px ${accent}44; } .s-right { flex:1.2; font-size:46px; line-height:1.6; color:#ddd; border-left:4px solid ${accent}; padding-left:40px; }`;
    return wrapHTML(`<div class="scene-card"><div class="split-wrap"><div class="s-left anim-item" style="animation-delay:0.3s">${escHtml(slide.left_heading)}</div><div class="s-right anim-item" style="animation-delay:0.7s">${escHtml(slide.right_text)}</div></div></div>`, buildCSS(slide, css));
}

function buildWordHighlight(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const words = (slide.keywords||[]).map((kw,i) => `<div class="wh-box anim-item" style="animation-delay:${0.3+i*0.2}s"><div class="wh-word" style="color:${shiftHue(accent, i*40)}">${escHtml(kw.word)}</div><div class="wh-desc">${escHtml(kw.description)}</div></div>`).join("");
    const css = `.wh-wrap { display:flex; flex-direction:column; gap:40px; margin-top:40px; } .wh-box { display:flex; align-items:center; gap:40px; } .wh-word { font-size:80px; font-weight:900; text-transform:uppercase; letter-spacing:3px; background:rgba(255,255,255,0.05); padding:10px 30px; border-radius:12px; } .wh-desc { font-size:42px; color:#ddd; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="wh-wrap">${words}</div></div>`, buildCSS(slide, css));
}

function buildGauge(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const val = Math.min(100, Math.max(0, slide.gauge_value || 0));
    const deg = (val / 100) * 180; // half circle gauge
    const css = `.g-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; margin-top:80px; } .gauge { width:600px; height:300px; position:relative; overflow:hidden; } .g-bg { position:absolute; top:0; left:0; width:600px; height:600px; border-radius:50%; background:#222; } .g-fill { position:absolute; top:0; left:0; width:600px; height:600px; border-radius:50%; background:conic-gradient(from -90deg, ${accent} ${deg}deg, transparent ${deg}deg); } .g-inner { position:absolute; top:40px; left:40px; width:520px; height:520px; border-radius:50%; background:#111; display:flex; justify-content:center; } .g-val { position:absolute; bottom:10px; font-size:100px; font-weight:900; color:#fff; } .g-lbl { font-size:52px; color:#aaa; margin-top:40px; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="g-wrap anim-item" style="animation-delay:0.4s"><div class="gauge"><div class="g-bg"></div><div class="g-fill"></div><div class="g-inner"><div class="g-val">${val}%</div></div></div><div class="g-lbl">${escHtml(slide.gauge_label)}</div></div></div>`, buildCSS(slide, css));
}

function buildProgressBars(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const html = (slide.progress_items||[]).map((p,i) => {
        const bg = shiftHue(accent, i*25);
        return `<div class="pb-row anim-item" style="animation-delay:${0.3+i*0.2}s"><div class="pb-lbl">${escHtml(p.label)}</div><div class="pb-track"><div class="pb-fill" style="width:${p.percentage}%; background:${bg}"></div></div><div class="pb-val">${p.percentage}%</div></div>`;
    }).join("");
    const css = `.pb-wrap { display:flex; flex-direction:column; gap:35px; margin-top:40px; width:100%; } .pb-row { display:flex; align-items:center; gap:30px; } .pb-lbl { width:350px; font-size:36px; font-weight:bold; text-align:right; } .pb-track { flex:1; height:40px; background:rgba(255,255,255,0.1); border-radius:20px; overflow:hidden; } .pb-fill { height:100%; border-radius:20px; transition:width 1s ease; box-shadow:0 0 15px currentColor; } .pb-val { width:120px; font-size:36px; font-weight:bold; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="pb-wrap">${html}</div></div>`, buildCSS(slide, css));
}

function buildIconGrid(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const html = (slide.icon_items||[]).map((item,i) => `<div class="ig-card anim-item" style="animation-delay:${0.3+i*0.1}s"><div class="ig-icon">${escHtml(item.emoji)}</div><div class="ig-lbl">${escHtml(item.label)}</div></div>`).join("");
    const css = `.ig-container { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:30px; margin-top:30px; } .ig-card { background:rgba(255,255,255,0.05); padding:40px 20px; border-radius:20px; text-align:center; border:2px solid transparent; transition:0.3s; } .ig-card:nth-child(even) { border-color:${accent}44; } .ig-icon { font-size:90px; margin-bottom:20px; } .ig-lbl { font-size:32px; font-weight:bold; color:#ddd; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="ig-container">${html}</div></div>`, buildCSS(slide, css));
}

function buildMatrix2x2(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const quads = slide.quadrants || [{},{},{},{}];
    const html = quads.map((q,i) => `<div class="mq-card anim-item q${i}" style="animation-delay:${0.3+i*0.2}s"><h3>${escHtml(q.title)}</h3><ul>${(q.items||[]).map(x=>`<li>${escHtml(x)}</li>`).join("")}</ul></div>`).join("");
    const css = `.mq-container { display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:20px; height:700px; margin-top:20px; } .mq-card { padding:30px; border-radius:16px; background:rgba(255,255,255,0.04); border:2px solid transparent; } .mq-card h3 { font-size:36px; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px; } .q0 { border-left-color:${accent}; border-top-color:${accent}; } .q1 { border-right-color:${shiftHue(accent,60)}; border-top-color:${shiftHue(accent,60)}; } .q2 { border-left-color:${shiftHue(accent,120)}; border-bottom-color:${shiftHue(accent,120)}; } .q3 { border-right-color:${shiftHue(accent,180)}; border-bottom-color:${shiftHue(accent,180)}; } .mq-card ul { font-size:28px; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="mq-container">${html}</div></div>`, buildCSS(slide, css));
}

function buildHeadlineOnly(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const css = `.ho-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; padding:0 100px; } .ho-head { font-size:130px; font-weight:900; line-height:1.1; margin-bottom:40px; color:#fff; text-shadow:0 10px 40px rgba(0,0,0,0.5); } .ho-sub { font-size:56px; color:${accent}; font-weight:300; }`;
    return wrapHTML(`<div class="scene-card"><div class="ho-wrap"><div class="ho-head anim-item" style="animation-delay:0.3s">${escHtml(slide.headline)}</div><div class="ho-sub anim-item" style="animation-delay:0.7s">${escHtml(slide.subtitle)}</div></div></div>`, buildCSS(slide, css));
}

function buildCardStack(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const cards = (slide.cards||[]).map((c,i) => {
        const offset = i * 40;
        const z = 10 - i;
        const scale = 1 - (i * 0.05);
        const bg = i === 0 ? `rgba(255,255,255,0.1)` : `rgba(0,0,0,0.8)`;
        const b = i === 0 ? `border:2px solid ${accent}` : `border:1px solid #444`;
        return `<div class="cs-card anim-item" style="z-index:${z}; transform:translateY(${offset}px) scale(${scale}); background:${bg}; ${b}; animation-delay:${0.3+i*0.2}s"><h3>${escHtml(c.title)}</h3><p>${escHtml(c.text)}</p></div>`;
    }).join("");
    const css = `.cs-wrap { position:relative; display:flex; justify-content:center; margin-top:80px; perspective:1000px; height:600px; } .cs-card { position:absolute; width:800px; padding:60px; border-radius:24px; box-shadow:0 30px 60px rgba(0,0,0,0.6); backdrop-filter:blur(10px); } .cs-card h3 { font-size:52px; color:${accent}; margin-bottom:20px; } .cs-card p { font-size:36px; line-height:1.5; color:#ddd; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="cs-wrap">${cards}</div></div>`, buildCSS(slide, css));
}

function buildMultiColumn(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const cols = (slide.columns||[]).map((c,i) => `<div class="mc-col anim-item" style="animation-delay:${0.3+i*0.2}s"><h3 style="color:${shiftHue(accent,i*30)}">${escHtml(c.title)}</h3><ul>${(c.points||[]).map(p=>`<li>${escHtml(p)}</li>`).join("")}</ul></div>`).join("");
    const css = `.mc-wrap { display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:40px; margin-top:30px; } .mc-col { background:rgba(255,255,255,0.03); padding:40px; border-radius:20px; border-top:4px solid transparent; } .mc-col h3 { font-size:42px; margin-bottom:20px; text-align:center; padding-bottom:15px; border-bottom:1px solid rgba(255,255,255,0.1); } .mc-col ul { font-size:30px; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="mc-wrap">${cols}</div></div>`, buildCSS(slide, css));
}

function buildTierList(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const colors = ["#ff7b7b", "#ffb87b", "#ffdf7b", "#bfff7b", "#7bffff", "#7bb8ff"]; // S,A,B,C,D colors generally
    const tiers = (slide.tiers||[]).map((t,i) => {
        const c = colors[i%colors.length];
        const items = (t.items||[]).map(x=>`<div class="tier-item">${escHtml(x)}</div>`).join("");
        return `<div class="tier-row anim-item" style="animation-delay:${0.3+i*0.15}s"><div class="tier-lbl" style="background:${c}"><span style="color:#000">${escHtml(t.tier_label)}</span></div><div class="tier-content">${items}</div></div>`;
    }).join("");
    const css = `.tier-wrap { display:flex; flex-direction:column; gap:10px; margin-top:20px; background:#111; padding:20px; border-radius:12px; } .tier-row { display:flex; min-height:100px; background:#222; border-radius:8px; overflow:hidden; } .tier-lbl { width:120px; display:flex; align-items:center; justify-content:center; font-size:48px; font-weight:900; border-right:2px solid #000; } .tier-content { flex:1; display:flex; flex-wrap:wrap; gap:15px; padding:15px; align-items:center; } .tier-item { background:rgba(255,255,255,0.1); padding:10px 20px; border-radius:6px; font-size:28px; font-weight:bold; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="tier-wrap">${tiers}</div></div>`, buildCSS(slide, css));
}

function buildChecklist(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const items = (slide.checklist_items||[]).map((c,i) => {
        const icon = c.checked ? `<span style="color:#4ade80">☑</span>` : `<span style="color:#f87171">☐</span>`;
        const cls = c.checked ? "chk-done" : "";
        return `<div class="chk-item anim-item ${cls}" style="animation-delay:${0.3+i*0.1}s">${icon} <span class="chk-txt">${escHtml(c.text)}</span></div>`;
    }).join("");
    const css = `.chk-wrap { display:flex; flex-direction:column; gap:20px; margin-top:30px; font-size:42px; } .chk-item { display:flex; align-items:center; gap:20px; background:rgba(255,255,255,0.05); padding:20px 40px; border-radius:12px; } .chk-done .chk-txt { text-decoration:line-through; color:#888; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="chk-wrap">${items}</div></div>`, buildCSS(slide, css));
}

function buildWarningBox(slide) {
    const css = `.warn-wrap { display:flex; align-items:center; justify-content:center; height:100%; } .warn-box { background:rgba(255,50,50,0.1); border:4px solid #f87171; border-radius:24px; padding:60px; max-width:1400px; text-align:center; position:relative; box-shadow:0 0 50px rgba(255,50,50,0.2); } .warn-icon { font-size:120px; line-height:1; margin-bottom:20px; } .w-title { font-size:64px; color:#f87171; font-weight:900; margin-bottom:20px; text-transform:uppercase; letter-spacing:2px; } .w-txt { font-size:42px; color:#fff; line-height:1.5; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="warn-wrap"><div class="warn-box anim-item" style="animation-delay:0.4s"><div class="warn-icon">⚠️</div><div class="w-title">${escHtml(slide.warning_title)}</div><div class="w-txt">${escHtml(slide.warning_text)}</div></div></div></div>`, buildCSS(slide, css));
}

function buildNumberLine(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const pts = slide.number_points||[];
    const html = pts.map((p,i) => {
        const left = p.position || (i * (100/(pts.length-1||1)));
        return `<div class="nl-pt anim-item" style="left:${left}%; animation-delay:${0.4+i*0.2}s"><div class="nl-dot"></div><div class="nl-lbl">${escHtml(p.label)}</div></div>`;
    }).join("");
    const css = `.nl-wrap { position:relative; margin-top:200px; width:1400px; margin-left:auto; margin-right:auto; } .nl-line { position:absolute; top:10px; left:0; right:0; height:8px; background:linear-gradient(90deg, transparent, ${accent}, transparent); border-radius:4px; } .nl-pt { position:absolute; top:0; margin-left:-100px; display:flex; flex-direction:column; align-items:center; width:200px; } .nl-dot { width:28px; height:28px; background:#fff; border:6px solid ${accent}; border-radius:50%; box-shadow:0 0 15px ${accent}; margin-bottom:15px; } .nl-lbl { font-size:32px; font-weight:bold; color:#ddd; text-align:center; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="nl-wrap"><div class="nl-line anim-item" style="animation-delay:0.2s"></div>${html}</div></div>`, buildCSS(slide, css));
}

function buildDonutStats(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const items = (slide.donut_items||[]).slice(0,3);
    const html = items.map((item,i) => {
        const deg = (item.percentage / 100) * 360;
        const c = shiftHue(accent, i*40);
        return `<div class="d-item anim-item" style="animation-delay:${0.3+i*0.2}s"><div class="donut" style="background:conic-gradient(${c} ${deg}deg, rgba(255,255,255,0.1) ${deg}deg)"><div class="d-inner">${item.percentage}%</div></div><div class="d-lbl">${escHtml(item.label)}</div></div>`;
    }).join("");
    const css = `.d-wrap { display:flex; justify-content:space-around; align-items:center; margin-top:80px; } .d-item { display:flex; flex-direction:column; align-items:center; gap:30px; } .donut { width:350px; height:350px; border-radius:50%; position:relative; display:flex; align-items:center; justify-content:center; } .donut::before { content:''; position:absolute; inset:0; border-radius:50%; box-shadow:inset 0 0 20px rgba(0,0,0,0.5); } .d-inner { width:270px; height:270px; background:#111; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:70px; font-weight:900; z-index:2; } .d-lbl { font-size:42px; font-weight:bold; text-align:center; width:400px; color:#ddd; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="d-wrap">${html}</div></div>`, buildCSS(slide, css));
}

// ─── 37-50 implemented as simple variations to save space but maintain uniqueness ───

function buildGenericGrid(slide, itemsArray, renderItem) {
    const accent = slide.color_accent || "#4DA6FF";
    const html = (itemsArray||[]).map((item,i) => `<div class="gen-card anim-item" style="animation-delay:${0.3+i*0.1}s">${renderItem(item, i)}</div>`).join("");
    const css = `.gen-wrap { display:grid; grid-template-columns:repeat(auto-fit, minmax(350px, 1fr)); gap:30px; margin-top:30px; } .gen-card { background:rgba(255,255,255,0.05); padding:30px; border-radius:16px; border-top:4px solid ${accent}; } .gen-card h3 { font-size:36px; margin-bottom:10px; color:${accent}; } .gen-card p { font-size:28px; color:#ccc; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="gen-wrap">${html}</div></div>`, buildCSS(slide, css));
}

function buildRoadmap(slide) { return buildGenericGrid(slide, slide.milestones, (m,i) => `<h3>${i+1}. ${escHtml(m.label)}</h3><p>${escHtml(m.description)}</p>`); }
function buildMiniCards(slide) { return buildGenericGrid(slide, slide.mini_cards, m => `<h3>${escHtml(m.title)}</h3><p>${escHtml(m.text)}</p>`); }
function buildLogoShowcase(slide) { return buildGenericGrid(slide, slide.brands, b => `<div style="font-size:50px;font-weight:900;text-align:center;margin-bottom:20px;">${escHtml(b.name)}</div><p style="text-align:center">${escHtml(b.description)}</p>`); }
function buildMetricRow(slide) { return buildGenericGrid(slide, slide.metrics, m => `<div style="font-size:70px;font-weight:bold;text-align:center">${escHtml(m.value)}</div><h3 style="text-align:center;color:#fff">${escHtml(m.label)}</h3><p style="text-align:center;color:${(m.change||"").includes("-")?"#f87171":"#4ade80"}">${escHtml(m.change)}</p>`); }

function buildHighlightText(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    let text = escHtml(slide.paragraph);
    (slide.highlights||[]).forEach(h => {
        text = text.replace(new RegExp(`(${escHtml(h)})`, 'gi'), `<span style="color:${accent}; font-weight:bold; background:rgba(255,255,255,0.1); padding:4px 12px; border-radius:12px; display:inline-block; margin: 0 4px;">$1</span>`);
    });
    const css = `.ht-wrap { padding:60px; display:flex; align-items:center; justify-content:center; flex:1; } .ht-inner { font-size:60px; line-height:1.7; text-align:center; max-width:1400px; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="ht-wrap"><div class="ht-inner anim-item" style="animation-delay:0.4s">${text}</div></div></div>`, buildCSS(slide, css));
}

function buildTwoColumn(slide) {
    const css = `.tc-wrap { display:flex; gap:60px; margin-top:30px; font-size:42px; line-height:1.6; } .tc-col { flex:1; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="tc-wrap"><div class="tc-col anim-item" style="animation-delay:0.3s">${escHtml(slide.left_content)}</div><div class="tc-col anim-item" style="animation-delay:0.6s">${escHtml(slide.right_content)}</div></div></div>`, buildCSS(slide, css));
}

function buildProfileCard(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const css = `.pro-wrap { display:flex; justify-content:center; margin-top:80px; } .pro-card { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:30px; padding:60px; width:1000px; text-align:center; position:relative; } .pro-emoji { font-size:150px; position:absolute; top:-75px; left:50%; transform:translateX(-50%); background:#222; border-radius:50%; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.5); } .p-name { font-size:64px; font-weight:bold; color:${accent}; margin-top:80px; } .p-title { font-size:36px; color:#aaa; margin-bottom:30px; text-transform:uppercase; letter-spacing:2px; } .p-desc { font-size:40px; line-height:1.5; color:#ddd; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="pro-wrap"><div class="pro-card anim-item" style="animation-delay:0.4s"><div class="pro-emoji">${escHtml(slide.profile_emoji||"👤")}</div><div class="p-name">${escHtml(slide.profile_name)}</div><div class="p-title">${escHtml(slide.profile_title)}</div><div class="p-desc">${escHtml(slide.profile_description)}</div></div></div></div>`, buildCSS(slide, css));
}

function buildSwot(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const mk = (arr, c) => (arr||[]).map(x=>`<li style="color:${c}">${escHtml(x)}</li>`).join("");
    const css = `.sw-wrap { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-top:20px; } .sw-card { padding:40px; border-radius:16px; background:rgba(255,255,255,0.04); } .sw-card h2 { font-size:48px; margin-bottom:20px; text-transform:uppercase; } .sw-card ul { font-size:32px; list-style:disc; padding-left:40px; } .sw-card li::before { display:none; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="sw-wrap">
        <div class="sw-card anim-item" style="animation-delay:0.2s"><h2 style="color:#4ade80">Strengths</h2><ul>${mk(slide.strengths,"#ddd")}</ul></div>
        <div class="sw-card anim-item" style="animation-delay:0.4s"><h2 style="color:#f87171">Weaknesses</h2><ul>${mk(slide.weaknesses,"#ddd")}</ul></div>
        <div class="sw-card anim-item" style="animation-delay:0.6s"><h2 style="color:#60a5fa">Opportunities</h2><ul>${mk(slide.opportunities,"#ddd")}</ul></div>
        <div class="sw-card anim-item" style="animation-delay:0.8s"><h2 style="color:#fbbf24">Threats</h2><ul>${mk(slide.threats,"#ddd")}</ul></div>
    </div></div>`, buildCSS(slide, css));
}

function buildEquation(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const css = `.eq-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; } .eq-text { font-family:'Times New Roman', serif; font-size:120px; font-style:italic; color:${accent}; background:rgba(0,0,0,0.3); padding:40px 80px; border-radius:20px; border:2px dashed ${accent}; margin-bottom:40px; } .eq-desc { font-size:48px; color:#ddd; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="eq-wrap"><div class="eq-text anim-item" style="animation-delay:0.4s">${escHtml(slide.equation_text)}</div><div class="eq-desc anim-item" style="animation-delay:0.8s">${escHtml(slide.equation_description)}</div></div></div>`, buildCSS(slide, css));
}

function buildPollResults(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const items = (slide.poll_items||[]).map((p,i) => `<div class="poll-row anim-item" style="animation-delay:${0.3+i*0.2}s"><div class="p-lbl">${escHtml(p.label)}</div><div class="p-bar"><div class="p-fill" style="width:${p.percentage}%; background:${accent}"></div></div><div class="p-val">${p.percentage}%</div></div>`).join("");
    const css = `.poll-wrap { display:flex; flex-direction:column; gap:30px; margin-top:40px; } .poll-row { display:flex; align-items:center; gap:20px; font-size:36px; } .p-lbl { width:300px; text-align:right; font-weight:bold; } .p-bar { flex:1; height:50px; background:rgba(255,255,255,0.1); border-radius:8px; } .p-fill { height:100%; border-radius:8px; display:flex; align-items:center; padding-left:10px; } .p-val { width:100px; font-weight:bold; color:${accent}; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="poll-wrap">${items}</div></div>`, buildCSS(slide, css));
}

function buildGradientList(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const items = (slide.gradient_items||[]).map((item,i) => `<div class="gl-item anim-item" style="animation-delay:${0.3+i*0.2}s; border-left:8px solid ${shiftHue(accent,i*30)}">${escHtml(item.text)}</div>`).join("");
    const css = `.gl-wrap { display:flex; flex-direction:column; gap:25px; margin-top:30px; } .gl-item { font-size:42px; background:rgba(255,255,255,0.03); padding:20px 40px; border-radius:0 16px 16px 0; box-shadow:0 5px 15px rgba(0,0,0,0.2); }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="gl-wrap">${items}</div></div>`, buildCSS(slide, css));
}

function buildCta(slide) {
    const accent = slide.color_accent || "#FF3366";
    const btns = (slide.cta_buttons||[]).map((b,i) => `<div class="cta-btn anim-item" style="animation-delay:${0.7+i*0.2}s; background:${i===0?accent:'transparent'}; border:4px solid ${accent}">${escHtml(b.text)}</div>`).join("");
    const css = `.cta-wrap { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; text-align:center; } .cta-title { font-size:110px; font-weight:900; margin-bottom:30px; text-transform:uppercase; text-shadow:0 10px 30px rgba(0,0,0,0.5); } .cta-sub { font-size:52px; color:#ddd; margin-bottom:60px; } .cta-btns { display:flex; gap:40px; } .cta-btn { font-size:42px; font-weight:bold; padding:20px 60px; border-radius:100px; border:none; color:#fff; box-shadow:0 10px 30px rgba(0,0,0,0.4); }`;
    return wrapHTML(`<div class="scene-card"><div class="cta-wrap"><div class="cta-title anim-item" style="animation-delay:0.3s">${escHtml(slide.cta_title)}</div><div class="cta-sub anim-item" style="animation-delay:0.5s">${escHtml(slide.cta_subtitle)}</div><div class="cta-btns">${btns}</div></div></div>`, buildCSS(slide, css));
}

function buildKeyValue(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const items = (slide.pairs||[]).map((p,i) => `<div class="kv-row anim-item" style="animation-delay:${0.3+i*0.15}s"><div class="k-key" style="color:${accent}">${escHtml(p.key)}</div><div class="k-val">${escHtml(p.value)}</div></div>`).join("");
    const css = `.kv-wrap { display:flex; flex-direction:column; gap:20px; margin-top:30px; } .kv-row { display:flex; align-items:center; padding:20px; background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.1); } .k-key { width:400px; font-size:42px; font-weight:bold; text-transform:uppercase; } .k-val { font-size:38px; color:#eee; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="kv-wrap">${items}</div></div>`, buildCSS(slide, css));
}

function buildMapPoints(slide) {
    const accent = slide.color_accent || "#4DA6FF";
    const items = (slide.map_items||[]).map((p,i) => `<div class="mp-item anim-item" style="animation-delay:${0.3+i*0.2}s"><div class="mp-reg" style="background:${shiftHue(accent,i*30)}">${escHtml(p.region)}</div><div class="mp-info"><div class="mp-val">${escHtml(p.value)}</div><div class="mp-desc">${escHtml(p.description)}</div></div></div>`).join("");
    const css = `.mp-wrap { display:flex; flex-wrap:wrap; gap:40px; margin-top:40px; justify-content:center; } .mp-item { display:flex; align-items:center; gap:20px; background:rgba(255,255,255,0.05); padding:20px 40px; border-radius:100px; } .mp-reg { width:100px; height:100px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; font-weight:bold; color:#000; text-align:center; } .mp-val { font-size:42px; font-weight:900; color:${accent}; } .mp-desc { font-size:28px; color:#aaa; }`;
    return wrapHTML(`<div class="scene-card"><h1>${escHtml(slide.heading)}</h1><div class="accent-line"></div><div class="mp-wrap">${items}</div></div>`, buildCSS(slide, css));
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────

export function generateSlideHTML(slide, outputDir) {
    const type = (slide.slide_type || "default").toLowerCase();
    
    // Safety Fallbacks: If AI hallucinates a slide type but forgets the required data array, fallback to default!
    if (type === "chart" && (!slide.chart_datasets || slide.chart_datasets.length === 0)) return buildDefault(slide, outputDir);
    if (type === "table" && (!slide.table_rows || slide.table_rows.length === 0)) return buildDefault(slide, outputDir);
    if (type === "process_flow" && (!slide.process_steps || slide.process_steps.length === 0)) return buildDefault(slide, outputDir);
    if (type === "timeline" && (!slide.timeline_items || slide.timeline_items.length === 0)) return buildDefault(slide, outputDir);
    if (type === "stats_grid" && (!slide.stats || slide.stats.length === 0)) return buildDefault(slide, outputDir);
    if (type === "steps" && (!slide.steps || slide.steps.length === 0)) return buildDefault(slide, outputDir);
    if (type === "funnel" && (!slide.funnel_stages || slide.funnel_stages.length === 0)) return buildDefault(slide, outputDir);
    if (type === "ranking" && (!slide.rankings || slide.rankings.length === 0)) return buildDefault(slide, outputDir);
    if (type === "feature_grid" && (!slide.features || slide.features.length === 0)) return buildDefault(slide, outputDir);
    if (type === "countdown" && (!slide.countdown_items || slide.countdown_items.length === 0)) return buildDefault(slide, outputDir);

    switch (type) {
        case "table": return buildTable(slide);
        case "chart": return buildChart(slide);
        case "image": return buildImage(slide, outputDir);
        case "big_number": return buildBigNumber(slide);
        case "quote": return buildQuote(slide);
        case "timeline": return buildTimeline(slide);
        case "comparison": return buildComparison(slide);
        case "pros_cons": return buildProsCons(slide);
        case "steps": return buildSteps(slide);
        case "definition": return buildDefinition(slide);
        case "stats_grid": return buildStatsGrid(slide);
        case "funnel": return buildFunnel(slide);
        case "pyramid": return buildPyramid(slide);
        case "ranking": return buildRanking(slide);
        case "before_after": return buildBeforeAfter(slide);
        case "fact_box": return buildFactBox(slide);
        case "code_block": return buildCodeBlock(slide);
        case "feature_grid": return buildFeatureGrid(slide);
        case "testimonial": return buildTestimonial(slide);
        case "countdown": return buildCountdown(slide);
        case "process_flow": return buildProcessFlow(slide);
        case "split_text": return buildSplitText(slide);
        case "word_highlight": return buildWordHighlight(slide);
        case "gauge": return buildGauge(slide);
        case "progress_bars": return buildProgressBars(slide);
        case "icon_grid": return buildIconGrid(slide);
        case "matrix_2x2": return buildMatrix2x2(slide);
        case "headline_only": return buildHeadlineOnly(slide);
        case "card_stack": return buildCardStack(slide);
        case "multi_column": return buildMultiColumn(slide);
        case "tier_list": return buildTierList(slide);
        case "checklist": return buildChecklist(slide);
        case "warning_box": return buildWarningBox(slide);
        case "number_line": return buildNumberLine(slide);
        case "donut_stats": return buildDonutStats(slide);
        case "roadmap": return buildRoadmap(slide);
        case "highlight_text": return buildHighlightText(slide);
        case "two_column": return buildTwoColumn(slide);
        case "profile_card": return buildProfileCard(slide);
        case "metric_row": return buildMetricRow(slide);
        case "swot": return buildSwot(slide);
        case "equation": return buildEquation(slide);
        case "poll_results": return buildPollResults(slide);
        case "gradient_list": return buildGradientList(slide);
        case "logo_showcase": return buildLogoShowcase(slide);
        case "mini_cards": return buildMiniCards(slide);
        case "cta": return buildCta(slide);
        case "key_value": return buildKeyValue(slide);
        case "map_points": return buildMapPoints(slide);
        default: return buildDefault(slide, outputDir);
    }
}
