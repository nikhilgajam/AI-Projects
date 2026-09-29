require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const sqlite3 = require('sqlite3').verbose();

// Initialize Gemini SDK per your requirements
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
const modelName = process.env.GOOGLE_GENAI_MODEL || 'gemini-3.1-flash-lite';
const embeddingModelName = 'gemini-embedding-2';

/**
 * 1. AI Generation Module (Gemini)
 */
async function generateScript(prompt) {
    const response = await ai.models.generateContent({
        model: modelName,
        contents: [
            {
                role: 'user',
                parts: [{ text: prompt }]
            }
        ],
    });
    // Assuming standard response structure for @google/genai
    return response.text; 
}

/**
 * Generate an embedding for the given text.
 * @param {string} text - The input text to embed.
 * @returns {Promise<number[]>} - The embedding vector.
 */
async function getEmbedding(text) {
    const response = await ai.models.embedContent({
        model: embeddingModelName,
        contents: text
    });
    return response.embeddings[0].values;
}

/**
 * Calculate the cosine similarity between two vectors.
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number}
 */
function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
}

/**
 * Fetch all documents from the SQLite database.
 * @param {string} dbPath
 * @returns {Promise<Array<{content: string, embedding: string}>>}
 */
function fetchAllDocuments(dbPath = 'rag_database.db') {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) reject(err);
        });

        db.all("SELECT content, embedding FROM documents", [], (err, rows) => {
            db.close();
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

/**
 * Retrieve the top_k most relevant documents from the database for a given query.
 * @param {string} query
 * @param {number} topK
 * @returns {Promise<string[]>}
 */
async function retrieveContext(query, topK = 2) {
    // 1. Embed the user query
    const queryEmbedding = await getEmbedding(query);
    
    // 2. Fetch all documents and their embeddings from the database
    const rows = await fetchAllDocuments();
    
    // 3. Calculate similarity for each document against the query embedding
    const results = rows.map(row => {
        // Parse the JSON string back into a JavaScript array
        const docEmbedding = JSON.parse(row.embedding);
        const similarity = cosineSimilarity(queryEmbedding, docEmbedding);
        return { similarity, content: row.content };
    });
    
    // 4. Sort by similarity in descending order and get the top results
    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, topK);
    
    return topResults.map(res => res.content);
}

/**
 * Execute the full RAG pipeline: Retrieve relevant context and generate an answer.
 * @param {string} query
 */
async function runRagPipeline(query) {
    console.log(`Query: ${query}`);
    
    try {
        // Retrieve relevant context from our SQLite database
        const contexts = await retrieveContext(query);
        const contextStr = contexts.map(ctx => `- ${ctx}`).join('\n');
        
        console.log("\n--- Retrieved Context ---");
        console.log(contextStr);
        
        // Construct the augmented prompt, fusing the retrieved knowledge with the original question
        const augmentedPrompt = `You are a helpful assistant. Use the provided context to answer the user's question.

Context:
${contextStr}

User Question: ${query}

Answer:`;
        
        console.log("\n--- Generating Answer ---");
        // Generate the final answer using the LLM with the custom generateScript function
        const answer = await generateScript(augmentedPrompt);
        console.log(answer);
    } catch (error) {
        console.error("Error running RAG pipeline:", error);
    }
}

// Execute with a test query
if (require.main === module) {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("RAG System Initialized. Type 'exit' or 'quit' to stop.");

    const askQuestion = () => {
        rl.question('\nEnter your question: ', async (userQuery) => {
            if (['exit', 'quit'].includes(userQuery.trim().toLowerCase())) {
                console.log("Exiting...");
                rl.close();
                return;
            }
            if (userQuery.trim()) {
                await runRagPipeline(userQuery);
            }
            // Ask the next question
            askQuestion();
        });
    };

    askQuestion();
}
