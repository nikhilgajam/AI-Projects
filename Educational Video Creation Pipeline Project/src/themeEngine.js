/**
 * Theme Engine for Educational Video Creation Pipeline
 * Generates dynamic, topic-adaptive themes for video content.
 */

// Category Definitions and Keywords
export const THEME_CATEGORIES = {
    systems: {
        id: 'systems',
        name: 'Systems & Infrastructure',
        keywords: ['os', 'operating system', 'linux', 'network', 'distributed', 'database', 'sql', 'nosql', 'indexing', 'cache', 'memory', 'concurrency', 'threads', 'processes', 'kernel', 'file system', 'tcp', 'ip', 'udp', 'dns', 'router'],
        weight: 1
    },
    algorithms: {
        id: 'algorithms',
        name: 'Algorithms & Data Structures',
        keywords: ['algorithm', 'sort', 'search', 'graph', 'tree', 'dynamic programming', 'dp', 'greedy', 'recursion', 'time complexity', 'big o', 'array', 'linked list', 'hash', 'stack', 'queue', 'heap', 'trie', 'dijkstra', 'bfs', 'dfs'],
        weight: 1
    },
    web: {
        id: 'web',
        name: 'Web Technologies',
        keywords: ['web', 'frontend', 'backend', 'api', 'rest', 'graphql', 'html', 'css', 'javascript', 'react', 'vue', 'angular', 'node', 'express', 'browser', 'dom', 'http', 'websocket', 'spa', 'pwa', 'framework'],
        weight: 1
    },
    ai_ml: {
        id: 'ai_ml',
        name: 'Artificial Intelligence & Machine Learning',
        keywords: ['ai', 'machine learning', 'ml', 'neural network', 'deep learning', 'nlp', 'computer vision', 'transformer', 'llm', 'gpt', 'model', 'training', 'inference', 'gradient descent', 'tensor', 'pytorch', 'tensorflow', 'clustering', 'classification', 'regression'],
        weight: 1
    },
    hardware: {
        id: 'hardware',
        name: 'Computer Hardware & Architecture',
        keywords: ['hardware', 'cpu', 'gpu', 'ram', 'circuit', 'architecture', 'processor', 'register', 'cache', 'alu', 'instruction set', 'fpga', 'microcontroller', 'silicon', 'transistor', 'clock', 'bus', 'motherboard'],
        weight: 1
    },
    security: {
        id: 'security',
        name: 'Cybersecurity & Cryptography',
        keywords: ['security', 'crypto', 'cryptography', 'encryption', 'decryption', 'hash', 'rsa', 'aes', 'hacker', 'exploit', 'vulnerability', 'malware', 'firewall', 'auth', 'authentication', 'authorization', 'oauth', 'jwt', 'tls', 'ssl', 'cyber'],
        weight: 1
    },
    math: {
        id: 'math',
        name: 'Mathematics',
        keywords: ['math', 'calculus', 'linear algebra', 'statistics', 'probability', 'geometry', 'trigonometry', 'matrix', 'vector', 'derivative', 'integral', 'equation', 'theorem', 'proof', 'discrete', 'combinatorics', 'algebra'],
        weight: 1
    },
    programming: {
        id: 'programming',
        name: 'Programming Languages & Paradigms',
        keywords: ['programming', 'language', 'python', 'java', 'c++', 'c#', 'rust', 'go', 'ruby', 'swift', 'kotlin', 'oop', 'functional', 'design pattern', 'solid', 'clean code', 'refactoring', 'syntax', 'compiler', 'interpreter', 'paradigm'],
        weight: 1
    },
    devops: {
        id: 'devops',
        name: 'DevOps & Cloud Computing',
        keywords: ['devops', 'cloud', 'aws', 'azure', 'gcp', 'docker', 'container', 'kubernetes', 'k8s', 'ci', 'cd', 'pipeline', 'deployment', 'infrastructure as code', 'terraform', 'ansible', 'monitoring', 'observability', 'serverless', 'microservices'],
        weight: 1
    },
    general: {
        id: 'general',
        name: 'General Computer Science',
        keywords: ['computer science', 'cs', 'tech', 'technology', 'basics', 'introduction', 'concept', 'overview'],
        weight: 0.1 // Fallback weight
    }
};

// Theme Palettes
export const THEMES = {
    systems: {
        primaryColor: '#00d4ff',
        secondaryColor: '#0a0e27',
        accentColor: '#39ff14', // Terminal green
        bgGradient: 'linear-gradient(135deg, #0a0e27 0%, #1a2245 100%)',
        gridColor: 'rgba(0, 212, 255, 0.1)',
        panelBg: 'rgba(10, 14, 39, 0.7)',
        panelBorder: 'rgba(0, 212, 255, 0.3)',
        textPrimary: '#ffffff',
        textSecondary: '#a0aec0',
        textMuted: '#718096',
        codeTheme: {
            bg: '#050713',
            keyword: '#c678dd',
            string: '#98c379',
            comment: '#5c6370',
            number: '#d19a66',
            function: '#61afef',
            operator: '#56b6c2',
            border: '#00d4ff44'
        },
        particleColor: '#00d4ff',
        glowColor: '#00d4ff88',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        codeFontFamily: "'Fira Code', 'Cascadia Code', monospace",
        mathFontFamily: "'KaTeX_Math', 'Times New Roman', serif",
        iconEmoji: '⚡'
    },
    algorithms: {
        primaryColor: '#ffd700',
        secondaryColor: '#0d0221',
        accentColor: '#ff007f',
        bgGradient: 'linear-gradient(135deg, #0d0221 0%, #26094a 100%)',
        gridColor: 'rgba(255, 215, 0, 0.08)',
        panelBg: 'rgba(13, 2, 33, 0.8)',
        panelBorder: 'rgba(255, 215, 0, 0.3)',
        textPrimary: '#ffffff',
        textSecondary: '#e2e8f0',
        textMuted: '#94a3b8',
        codeTheme: {
            bg: '#070112',
            keyword: '#ff79c6',
            string: '#f1fa8c',
            comment: '#6272a4',
            number: '#bd93f9',
            function: '#50fa7b',
            operator: '#ffb86c',
            border: '#ffd70044'
        },
        particleColor: '#ffd700',
        glowColor: '#ffd70088',
        fontFamily: "'Roboto', system-ui, sans-serif",
        codeFontFamily: "'JetBrains Mono', monospace",
        mathFontFamily: "'KaTeX_Math', 'Times New Roman', serif",
        iconEmoji: '🌳'
    },
    web: {
        primaryColor: '#3b82f6',
        secondaryColor: '#0f172a',
        accentColor: '#8b5cf6',
        bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        gridColor: 'rgba(255, 255, 255, 0.05)',
        panelBg: 'rgba(15, 23, 42, 0.7)',
        panelBorder: 'rgba(59, 130, 246, 0.3)',
        textPrimary: '#f8fafc',
        textSecondary: '#cbd5e1',
        textMuted: '#64748b',
        codeTheme: {
            bg: '#020617',
            keyword: '#818cf8',
            string: '#34d399',
            comment: '#475569',
            number: '#f472b6',
            function: '#60a5fa',
            operator: '#a78bfa',
            border: '#3b82f644'
        },
        particleColor: '#8b5cf6',
        glowColor: '#3b82f688',
        fontFamily: "'Inter', sans-serif",
        codeFontFamily: "'Fira Code', monospace",
        mathFontFamily: "'KaTeX_Math', serif",
        iconEmoji: '🌐'
    },
    ai_ml: {
        primaryColor: '#00e5ff',
        secondaryColor: '#000000',
        accentColor: '#ff00ff',
        bgGradient: 'linear-gradient(135deg, #000000 0%, #111111 50%, #001f2b 100%)',
        gridColor: 'rgba(0, 229, 255, 0.1)',
        panelBg: 'rgba(10, 10, 10, 0.8)',
        panelBorder: 'rgba(255, 0, 255, 0.3)',
        textPrimary: '#ffffff',
        textSecondary: '#b0bec5',
        textMuted: '#546e7a',
        codeTheme: {
            bg: '#050505',
            keyword: '#ff00ff',
            string: '#00e5ff',
            comment: '#546e7a',
            number: '#ffff00',
            function: '#b388ff',
            operator: '#ff5252',
            border: '#00e5ff44'
        },
        particleColor: '#ff00ff',
        glowColor: '#00e5ff88',
        fontFamily: "'Exo 2', sans-serif",
        codeFontFamily: "'Source Code Pro', monospace",
        mathFontFamily: "'KaTeX_Math', serif",
        iconEmoji: '🧠'
    },
    hardware: {
        primaryColor: '#4fc3f7',
        secondaryColor: '#263238',
        accentColor: '#ff8a65',
        bgGradient: 'linear-gradient(135deg, #212121 0%, #37474f 100%)',
        gridColor: 'rgba(79, 195, 247, 0.1)',
        panelBg: 'rgba(38, 50, 56, 0.8)',
        panelBorder: 'rgba(255, 138, 101, 0.3)',
        textPrimary: '#ffffff',
        textSecondary: '#cfd8dc',
        textMuted: '#78909c',
        codeTheme: {
            bg: '#1a1a1a',
            keyword: '#ffb74d',
            string: '#81c784',
            comment: '#607d8b',
            number: '#ff8a65',
            function: '#64b5f6',
            operator: '#ba68c8',
            border: '#4fc3f744'
        },
        particleColor: '#ff8a65',
        glowColor: '#4fc3f788',
        fontFamily: "'Roboto Condensed', sans-serif",
        codeFontFamily: "'Consolas', monospace",
        mathFontFamily: "'KaTeX_Math', serif",
        iconEmoji: '⚙️'
    },
    security: {
        primaryColor: '#00ff41',
        secondaryColor: '#050505',
        accentColor: '#ff0000',
        bgGradient: 'linear-gradient(135deg, #000000 0%, #0a110a 100%)',
        gridColor: 'rgba(0, 255, 65, 0.15)',
        panelBg: 'rgba(5, 5, 5, 0.9)',
        panelBorder: 'rgba(0, 255, 65, 0.4)',
        textPrimary: '#ffffff',
        textSecondary: '#cccccc',
        textMuted: '#808080',
        codeTheme: {
            bg: '#000000',
            keyword: '#00ff41',
            string: '#00ff41',
            comment: '#005915',
            number: '#00ff41',
            function: '#00ff41',
            operator: '#00ff41',
            border: '#00ff4166'
        },
        particleColor: '#00ff41',
        glowColor: '#00ff4188',
        fontFamily: "'VT323', 'Courier New', monospace",
        codeFontFamily: "'VT323', 'Courier New', monospace",
        mathFontFamily: "'KaTeX_Math', serif",
        iconEmoji: '🔒'
    },
    math: {
        primaryColor: '#ffb74d',
        secondaryColor: '#1a237e',
        accentColor: '#f5f5f5',
        bgGradient: 'linear-gradient(135deg, #121858 0%, #283593 100%)',
        gridColor: 'rgba(255, 255, 255, 0.05)',
        panelBg: 'rgba(26, 35, 126, 0.6)',
        panelBorder: 'rgba(255, 183, 77, 0.3)',
        textPrimary: '#ffffff',
        textSecondary: '#e8eaf6',
        textMuted: '#9fa8da',
        codeTheme: {
            bg: '#0d1340',
            keyword: '#ffcc80',
            string: '#c5e1a5',
            comment: '#7986cb',
            number: '#ef9a9a',
            function: '#81d4fa',
            operator: '#ce93d8',
            border: '#ffb74d44'
        },
        particleColor: '#ffffff',
        glowColor: '#ffb74d88',
        fontFamily: "'Lora', serif",
        codeFontFamily: "'Fira Code', monospace",
        mathFontFamily: "'KaTeX_Math', 'Times New Roman', serif",
        iconEmoji: '∑'
    },
    programming: {
        primaryColor: '#e34f26',
        secondaryColor: '#1e1e1e',
        accentColor: '#007acc',
        bgGradient: 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)',
        gridColor: 'rgba(255, 255, 255, 0.05)',
        panelBg: 'rgba(30, 30, 30, 0.8)',
        panelBorder: 'rgba(0, 122, 204, 0.3)',
        textPrimary: '#d4d4d4',
        textSecondary: '#cccccc',
        textMuted: '#808080',
        codeTheme: {
            bg: '#1e1e1e',
            keyword: '#569cd6',
            string: '#ce9178',
            comment: '#6a9955',
            number: '#b5cea8',
            function: '#dcdcaa',
            operator: '#d4d4d4',
            border: '#333333'
        },
        particleColor: '#007acc',
        glowColor: '#007acc88',
        fontFamily: "'Segoe UI', sans-serif",
        codeFontFamily: "'Consolas', monospace",
        mathFontFamily: "'KaTeX_Math', serif",
        iconEmoji: '⌨️'
    },
    devops: {
        primaryColor: '#008b8b',
        secondaryColor: '#2b2d42',
        accentColor: '#ef233c',
        bgGradient: 'linear-gradient(135deg, #2b2d42 0%, #3a405a 100%)',
        gridColor: 'rgba(0, 139, 139, 0.1)',
        panelBg: 'rgba(43, 45, 66, 0.8)',
        panelBorder: 'rgba(0, 139, 139, 0.3)',
        textPrimary: '#edf2f4',
        textSecondary: '#8d99ae',
        textMuted: '#6c757d',
        codeTheme: {
            bg: '#1a1b26',
            keyword: '#f7768e',
            string: '#9ece6a',
            comment: '#565f89',
            number: '#ff9e64',
            function: '#7aa2f7',
            operator: '#89ddff',
            border: '#008b8b44'
        },
        particleColor: '#008b8b',
        glowColor: '#008b8b88',
        fontFamily: "'Ubuntu', sans-serif",
        codeFontFamily: "'Ubuntu Mono', monospace",
        mathFontFamily: "'KaTeX_Math', serif",
        iconEmoji: '☁️'
    },
    general: {
        primaryColor: '#6366f1',
        secondaryColor: '#111827',
        accentColor: '#10b981',
        bgGradient: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
        gridColor: 'rgba(255, 255, 255, 0.05)',
        panelBg: 'rgba(17, 24, 39, 0.7)',
        panelBorder: 'rgba(99, 102, 241, 0.3)',
        textPrimary: '#f9fafb',
        textSecondary: '#d1d5db',
        textMuted: '#9ca3af',
        codeTheme: {
            bg: '#030712',
            keyword: '#818cf8',
            string: '#34d399',
            comment: '#6b7280',
            number: '#fbbf24',
            function: '#60a5fa',
            operator: '#a78bfa',
            border: '#6366f144'
        },
        particleColor: '#6366f1',
        glowColor: '#6366f188',
        fontFamily: "'Inter', sans-serif",
        codeFontFamily: "'Fira Code', monospace",
        mathFontFamily: "'KaTeX_Math', serif",
        iconEmoji: '💡'
    }
};

/**
 * Classifies a topic string into one of the predefined categories
 * using keyword matching with weighted scoring.
 * 
 * @param {string} topicString - The topic to classify (e.g., 'Merge Sort Algorithm')
 * @returns {string} The category id (e.g., 'algorithms')
 */
export function classifyTopic(topicString) {
    if (!topicString || typeof topicString !== 'string') {
        return 'general';
    }

    const normalizedTopic = topicString.toLowerCase();
    
    // Calculate scores for each category
    const scores = Object.values(THEME_CATEGORIES).map(category => {
        let score = 0;
        
        for (const keyword of category.keywords) {
            // Use regex for word boundaries to avoid partial matches (e.g. "bus" in "business")
            // Escape keyword to be safe in regex
            const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'i');
            
            if (regex.test(normalizedTopic)) {
                // Longer keywords give slightly more score, multiplied by category weight
                score += (keyword.length * 0.1 + 1) * category.weight;
            } else if (normalizedTopic.includes(keyword)) {
                // Partial match gets less score
                score += 0.5 * category.weight;
            }
        }
        
        return { id: category.id, score };
    });

    // Find the category with the highest score
    scores.sort((a, b) => b.score - a.score);

    // If no keywords matched, return 'general'
    if (scores[0].score === 0) {
        return 'general';
    }

    return scores[0].id;
}

/**
 * Gets the complete theme object for a given topic.
 * 
 * @param {string} topicString - The topic
 * @returns {Object} The complete theme palette
 */
export function getThemeForTopic(topicString) {
    const categoryId = classifyTopic(topicString);
    return THEMES[categoryId] || THEMES.general;
}

/**
 * Generates CSS custom properties (variables) from a theme object.
 * Can be injected directly into the :root or a specific container.
 * 
 * @param {Object} theme - The theme object
 * @returns {string} CSS string with variables
 */
export function getThemeCSS(theme) {
    return `
        --primary-color: ${theme.primaryColor};
        --secondary-color: ${theme.secondaryColor};
        --accent-color: ${theme.accentColor};
        --bg-gradient: ${theme.bgGradient};
        --grid-color: ${theme.gridColor};
        --panel-bg: ${theme.panelBg};
        --panel-border: ${theme.panelBorder};
        --text-primary: ${theme.textPrimary};
        --text-secondary: ${theme.textSecondary};
        --text-muted: ${theme.textMuted};
        
        /* Code Theme Variables */
        --code-bg: ${theme.codeTheme.bg};
        --code-keyword: ${theme.codeTheme.keyword};
        --code-string: ${theme.codeTheme.string};
        --code-comment: ${theme.codeTheme.comment};
        --code-number: ${theme.codeTheme.number};
        --code-function: ${theme.codeTheme.function};
        --code-operator: ${theme.codeTheme.operator};
        --code-border: ${theme.codeTheme.border};
        
        /* Effects */
        --particle-color: ${theme.particleColor};
        --glow-color: ${theme.glowColor};
        
        /* Typography */
        --font-family-primary: ${theme.fontFamily};
        --font-family-code: ${theme.codeFontFamily};
        --font-family-math: ${theme.mathFontFamily};
    `;
}

/**
 * Returns complete CSS for applying the theme to the body, including
 * animated grid backgrounds.
 * 
 * @param {Object} theme - The theme object
 * @returns {string} CSS string for the body
 */
export function getAdaptiveBackground(theme) {
    return `
        body {
            background: var(--bg-gradient);
            color: var(--text-primary);
            font-family: var(--font-family-primary);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            
            /* Animated Grid Overlay */
            background-image: 
                linear-gradient(var(--grid-color) 1px, transparent 1px),
                linear-gradient(90deg, var(--grid-color) 1px, transparent 1px);
            background-size: 30px 30px;
            background-position: center center;
            
            /* Optional animated background effect */
            animation: backgroundPan 30s linear infinite;
        }
        
        @keyframes backgroundPan {
            0% {
                background-position: 0 0;
            }
            100% {
                background-position: 60px 60px;
            }
        }
    `;
}
