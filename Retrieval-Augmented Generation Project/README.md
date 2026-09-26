# Retrieval-Augmented Generation (RAG) Project

Welcome to the Retrieval-Augmented Generation (RAG) project! This repository contains basic from-scratch implementations of a RAG pipeline in both Python and Node.js using SQLite as a lightweight storage backend and the Gemini AI models for generation and embeddings.

---

## What is RAG (Retrieval-Augmented Generation)?

Retrieval-Augmented Generation (RAG) is a powerful AI framework designed to improve the quality, accuracy, and reliability of Large Language Models (LLMs). 

### The Problem it Solves
Standard LLMs are trained on massive datasets, but their knowledge is effectively "frozen in time" once training is complete. This leads to a few core problems:
1. **Hallucinations:** When an LLM doesn't know an answer, it might confidently invent one.
2. **Outdated Information:** An LLM cannot natively know about events or documents created after its training cutoff.
3. **Lack of Private Knowledge:** LLMs do not have access to your proprietary company data, personal documents, or specialized internal wikis.

### The RAG Solution
RAG solves this by providing the LLM with an "open-book" test format. Instead of forcing the AI to rely solely on its internal, pre-trained memory, RAG intercepts the user's question, **retrieves** relevant facts from an external knowledge base, and **augments** the prompt with these facts before asking the LLM to **generate** an answer. 

This guarantees that the model uses the most accurate, private, and up-to-date data available without requiring you to expensively retrain or fine-tune the model itself.

---

## How RAG Works (Step-by-Step)

A typical RAG pipeline is broken down into two main phases: **Data Ingestion** and **Retrieval/Generation**.

### Phase 1: Data Ingestion (Loading Knowledge)
Before you can ask questions, you must build the knowledge base.
1. **Document Loading:** Place your `.txt`, `.md`, or `.pdf` files into the `ToBeLoaded/` folder at the root of the project.
2. **Parsing & Chunking:** When you run the data loader scripts, they will scan the `ToBeLoaded` directory, extract the raw text (even from PDFs!), and split large files into manageable chunks (e.g., 2000 characters).
3. **Embedding:** Each chunk is passed to an AI Embedding Model (like Gemini's `text-embedding-004`). The model converts the human-readable text into a list of numbers (a high-dimensional vector array) representing the semantic meaning of the text.
4. **Storage:** The original text chunk and its numerical vector embedding are saved into a database (often a specialized Vector Database, though this project uses SQLite).

### Phase 2: Retrieval & Generation (Answering Questions)
When a user asks a question, the pipeline springs into action:
1. **Query Embedding:** The user's query is sent to the same Embedding Model to get a vector representation of the question.
2. **Vector Search:** The system compares the query vector against all the document vectors in the database. It calculates the mathematical distance between them (often using **Cosine Similarity**). Vectors that are close together mathematically share similar semantic meaning.
3. **Context Retrieval:** The top *K* most similar documents are retrieved from the database.
4. **Augmenting the Prompt:** The system constructs a new prompt that combines the original question with the text of the retrieved documents (the context).
5. **Generation:** This augmented prompt is sent to the LLM (like `gemini-3.1-flash-lite`). The LLM reads the context, grounds its reasoning in the provided facts, and generates a highly accurate answer.

---

## How the Code Works in this Project

This project includes implementations in both `python_rag/` and `node_rag/`. Both operate using the exact same underlying logic to demonstrate how RAG can be built from scratch.

### 1. The Data Loader (`load_data.py` & `load_data.js`)
- **Initialization:** We initialize a local SQLite database named `rag_database.db`.
- **Schema:** We create a table called `documents` containing an `id`, `content` (the text), and `embedding` (the vector). Because standard SQLite lacks native array types, the vectors are serialized into JSON strings before storage.
- **Scanning:** The script looks at the root `ToBeLoaded` folder. It reads `.txt`, `.md`, and `.pdf` files, parses out their text, and splits them into 2000-character chunks.
- **Embedding Generation:** The script iterates over the text chunks, calling Gemini's `embedContent` API to fetch a vector for each.
- **Insertion:** The text and its stringified vector are saved to SQLite.

### 2. The Retriever (`retrieve.py` & `retrieve.js`)
- **Querying:** A hardcoded test query (e.g., "What is Retrieval-Augmented Generation?") is processed.
- **Similarity Calculation:** The query is embedded. The script then fetches *all* documents from SQLite, parses their JSON embeddings back into arrays, and runs a custom **Cosine Similarity** mathematical function to find the most relevant matches.
- **Injection & Generation:** The top 2 most relevant text blocks are extracted. We construct a prompt (via the `generateScript` function in Node or its equivalent in Python) that commands the Gemini model to answer the question using *only* the retrieved context.

---

## Installation and Usage

### Prerequisites
You will need a Gemini API Key from [Google AI Studio](https://aistudio.google.com/) to use the embedding and generation models. 

Each implementation (`node_rag` and `python_rag`) includes a `.env.example` file. Rename this file to `.env` in the directory you plan to run and paste your API key inside:
```ini
GOOGLE_GENAI_API_KEY="your_api_key_here"
```

---

### Python Implementation

**1. Navigate to the Python directory:**
```bash
cd python_rag
```

**2. Install dependencies:**
You will need the official Google GenAI SDK. Install it using the requirements file.
```bash
pip install -r requirements.txt
```

**3. Load the data into SQLite:**
Run this script first to create `rag_database.db` and embed the documents.
```bash
python load_data.py
```

**4. Retrieve and Generate:**
Run the retriever to search the database and generate an answer using the LLM.
```bash
python retrieve.py
```

---

### Node.js Implementation

**1. Navigate to the Node directory:**
```bash
cd node_rag
```

**2. Install dependencies:**
Install the Google GenAI SDK and SQLite3 driver using the provided package file.
```bash
npm install
```

**3. Load the data into SQLite:**
Run this script first to create `rag_database.db` and embed the documents.
```bash
node load_data.js
```

**4. Retrieve and Generate:**
Run the retriever to search the database and generate an answer using the LLM.
```bash
node retrieve.js
```
