import sqlite3
import json
import os
import glob
from google import genai
from dotenv import load_dotenv
import PyPDF2

load_dotenv()

# Initialize Gemini SDK per your requirements
client = genai.Client(api_key=os.environ.get("GOOGLE_GENAI_API_KEY"))

def get_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector for the given text using the Gemini embedding model.
    """
    response = client.models.embed_content(
        model="text-embedding-004",
        contents=text
    )
    return response.embeddings[0].values

def setup_database(db_path: str = "rag_database.db") -> sqlite3.Connection:
    """
    Initialize the SQLite database with a table for documents and their embeddings.
    """
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            embedding TEXT NOT NULL
        )
    ''')
    conn.commit()
    return conn

def load_data(conn: sqlite3.Connection, documents: list[str]) -> None:
    """
    Embed documents and store them in the SQLite database.
    """
    cursor = conn.cursor()
    for doc in documents:
        print(f"Embedding chunk: {doc[:30].replace(chr(10), ' ')}...")
        # Get the embedding vector for the document
        embedding = get_embedding(doc)
        
        # Store in database
        cursor.execute(
            "INSERT INTO documents (content, embedding) VALUES (?, ?)", 
            (doc, json.dumps(embedding))
        )
    conn.commit()
    print("Data loaded successfully.")

def extract_text_from_file(file_path: str) -> str:
    """
    Extract text content from .txt, .md, and .pdf files.
    """
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    try:
        if ext in ['.txt', '.md']:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        elif ext == '.pdf':
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return text.strip()

def get_documents_from_folder(folder_path: str) -> list[str]:
    """
    Scan the folder for supported files, extract text, and split into chunks.
    """
    documents = []
    if not os.path.exists(folder_path):
        print(f"Directory not found: {folder_path}")
        return documents
        
    for file_name in os.listdir(folder_path):
        file_path = os.path.join(folder_path, file_name)
        if os.path.isfile(file_path):
            ext = os.path.splitext(file_name)[1].lower()
            if ext in ['.txt', '.md', '.pdf']:
                print(f"Reading file: {file_name}")
                text = extract_text_from_file(file_path)
                if text:
                    # Very simple fixed-size chunking (2000 characters) to keep embeddings clean
                    chunk_size = 2000
                    for i in range(0, len(text), chunk_size):
                        chunk = text[i:i+chunk_size]
                        documents.append(chunk)
            else:
                if file_name != "README.txt":
                    print(f"Skipping unsupported file: {file_name}")
    return documents

if __name__ == "__main__":
    folder_path = os.path.join(os.path.dirname(__file__), '..', 'ToBeLoaded')
    print(f"Scanning for documents in: {os.path.abspath(folder_path)}")
    documents = get_documents_from_folder(folder_path)
    
    if not documents:
        print("No documents found to load. Please add .txt, .md, or .pdf files to the ToBeLoaded folder.")
    else:
        db_connection = setup_database()
        load_data(db_connection, documents)
        db_connection.close()
