require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

// Initialize Gemini SDK per your requirements
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
const embeddingModelName = 'text-embedding-004';

async function getEmbedding(text) {
    const response = await ai.models.embedContent({
        model: embeddingModelName,
        contents: text
    });
    return response.embeddings[0].values;
}

function setupDatabase(dbPath = 'rag_database.db') {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) reject(err);
        });

        db.run(`
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                embedding TEXT NOT NULL
            )
        `, (err) => {
            if (err) reject(err);
            else resolve(db);
        });
    });
}

async function loadData(db, documents) {
    const stmt = db.prepare("INSERT INTO documents (content, embedding) VALUES (?, ?)");

    for (const doc of documents) {
        console.log(`Embedding chunk: ${doc.substring(0, 30).replace(/\n/g, ' ')}...`);
        try {
            const embedding = await getEmbedding(doc);
            stmt.run(doc, JSON.stringify(embedding));
        } catch (error) {
            console.error("Error embedding document:", error);
        }
    }

    stmt.finalize();
    console.log("Data loaded successfully.");
}

async function extractTextFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    try {
        if (ext === '.txt' || ext === '.md') {
            return fs.readFileSync(filePath, 'utf-8');
        } else if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            return data.text;
        }
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
    }
    return '';
}

async function getDocumentsFromFolder(folderPath) {
    const documents = [];
    if (!fs.existsSync(folderPath)) {
        console.log(`Directory not found: ${folderPath}`);
        return documents;
    }

    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        const filePath = path.join(folderPath, file);
        if (fs.statSync(filePath).isFile()) {
            const ext = path.extname(file).toLowerCase();
            if (['.txt', '.md', '.pdf'].includes(ext)) {
                console.log(`Reading file: ${file}`);
                const text = await extractTextFromFile(filePath);
                if (text && text.trim().length > 0) {
                    // Simple fixed-size chunking (2000 characters)
                    const chunkSize = 2000;
                    for (let i = 0; i < text.length; i += chunkSize) {
                        documents.push(text.substring(i, i + chunkSize));
                    }
                }
            } else {
                if (file !== "README.txt") {
                    console.log(`Skipping unsupported file: ${file}`);
                }
            }
        }
    }
    return documents;
}

async function main() {
    const folderPath = path.join(__dirname, '..', 'ToBeLoaded');
    console.log(`Scanning for documents in: ${path.resolve(folderPath)}`);
    const documents = await getDocumentsFromFolder(folderPath);

    if (documents.length === 0) {
        console.log("No documents found to load. Please add .txt, .md, or .pdf files to the ToBeLoaded folder.");
        return;
    }

    try {
        const db = await setupDatabase();
        await loadData(db, documents);
        db.close();
    } catch (error) {
        console.error("Database setup failed:", error);
    }
}

if (require.main === module) {
    main();
}
