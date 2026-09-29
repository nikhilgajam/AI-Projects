# ToBeLoaded Directory

Place any documents you want the AI to learn from in this folder.
When you run the data loader scripts (`load_data.py` or `load_data.js`), they will scan this folder, extract the text, generate vector embeddings, and store them in the local SQLite database.

## Supported file types:
- Text Files (.txt)
- Markdown Files (.md)
- PDF Documents (.pdf)

## How it works (The Learning Setup)
1. **Extraction:** We use PyPDF2 (Python) or pdf-parse (Node.js) to extract raw text from your files.
2. **Chunking:** The text is split into simple, fixed-size chunks (e.g., 2000 characters) to prepare it for processing.
3. **Embedding:** Each chunk is converted into a mathematical vector using the `gemini-embedding-2` model via the new Google GenAI SDK.
4. **Storage:** The text chunk and its numerical vector are saved side-by-side in a standard SQLite database (`rag_database.db`).

## How to use:
- **Node.js:** From the `node_rag` folder, run `npm run load` (or `node load_data.js`).
- **Python:** From the `python_rag` folder, run `python load_data.py`.

After loading your documents into the database, you can run the retrieval scripts (`retrieve.js` or `retrieve.py`) to ask the RAG system questions based on the knowledge inside this folder!
