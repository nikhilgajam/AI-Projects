import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSlideHTML, setChartJSInline } from './src/sceneBuilders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load Chart.js exactly as the pipeline does
const CHARTJS_PATH = path.join(__dirname, "node_modules", "chart.js", "dist", "chart.umd.min.js");
setChartJSInline(fs.readFileSync(CHARTJS_PATH, "utf8"));

const barSlide = {
    slide_type: "chart",
    scene_theme: "neon",
    color_accent: "#FF6B6B",
    heading: "Current Bar Chart (Single Dataset)",
    chart_type: "bar",
    chart_labels: ["North America", "Europe", "Asia", "South America", "Africa"],
    chart_datasets: [{ label: "Revenue (M)", data: [450, 320, 580, 150, 90] }]
};

const lineSlide = {
    slide_type: "chart",
    scene_theme: "glassmorphism",
    color_accent: "#4DEEEA",
    heading: "Current Line Chart (Multiple Lines)",
    chart_type: "line",
    chart_labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    chart_datasets: [
        { label: "Our Company", data: [1000, 1500, 1300, 2200, 2800, 2400, 3500] },
        { label: "Competitor A", data: [800, 1200, 1400, 1600, 1900, 2100, 2300] },
        { label: "Competitor B", data: [1500, 1400, 1200, 1100, 1000, 950, 800] }
    ]
};

const pieSlide = {
    slide_type: "chart",
    scene_theme: "minimal",
    color_accent: "#FFD700",
    heading: "Current Pie Chart (Market Share)",
    chart_type: "pie",
    chart_labels: ["Product A", "Product B", "Product C", "Product D"],
    chart_datasets: [{ label: "Share %", data: [45, 25, 20, 10] }]
};

const doughnutSlide = {
    slide_type: "chart",
    scene_theme: "cyberpunk",
    color_accent: "#00FFDD",
    heading: "New Doughnut Chart",
    chart_type: "doughnut",
    chart_labels: ["Desktop", "Mobile", "Tablet", "Console"],
    chart_datasets: [{ label: "Traffic Source", data: [55, 30, 10, 5] }]
};

const radarSlide = {
    slide_type: "chart",
    scene_theme: "tech_circuit",
    color_accent: "#A78BFA",
    heading: "New Radar Chart (Performance Comparison)",
    chart_type: "radar",
    chart_labels: ["Speed", "Reliability", "Cost", "Support", "Features", "Security"],
    chart_datasets: [
        { label: "Our Product", data: [90, 85, 70, 95, 80, 100] },
        { label: "Competitor", data: [75, 80, 85, 60, 90, 70] }
    ]
};

// Generate the HTML for each
fs.writeFileSync("example_bar_chart.html", generateSlideHTML(barSlide, __dirname));
fs.writeFileSync("example_line_chart.html", generateSlideHTML(lineSlide, __dirname));
fs.writeFileSync("example_pie_chart.html", generateSlideHTML(pieSlide, __dirname));
fs.writeFileSync("example_doughnut_chart.html", generateSlideHTML(doughnutSlide, __dirname));
fs.writeFileSync("example_radar_chart.html", generateSlideHTML(radarSlide, __dirname));

console.log("✅ All 5 chart examples generated successfully!");
