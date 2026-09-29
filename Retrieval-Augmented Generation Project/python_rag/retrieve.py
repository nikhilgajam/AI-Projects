import sqlite3
import json
import os
import math
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Initialize Gemini SDK per your requirements
client = genai.Client(api_key=os.environ.get("GOOGLE_GENAI_API_KEY"))
model_name = os.environ.get("GOOGLE_GENAI_MODEL", "gemini-3.1-flash-lite")

def get_embedding(text: str) -> list[float]:
    """
    Generate an embedding vector for the given text.
    """
    response = client.models.embed_content(
        model="gemini-embedding-2",
        contents=text
    )
    return response.embeddings[0].values

def cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """
    Calculate the cosine similarity between two vectors without external libraries like numpy.
    """
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def retrieve_context(query: str, db_path: str = "rag_database.db", top_k: int = 2) -> list[str]:
    """
    Retrieve the top_k most relevant documents from the SQLite database for a given query.
    """
    # 1. Embed the user query
    query_embedding = get_embedding(query)
    
    # 2. Fetch all documents and their embeddings from the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT content, embedding FROM documents")
    rows = cursor.fetchall()
    conn.close()
    
    # 3. Calculate similarity for each document
    results = []
    for content, embedding_str in rows:
        # Parse the JSON string back into a Python list
        doc_embedding = json.loads(embedding_str)
        similarity = cosine_similarity(query_embedding, doc_embedding)
        results.append((similarity, content))
        
    # 4. Sort by similarity in descending order and get top_k
    results.sort(key=lambda x: x[0], reverse=True)
    top_results = results[:top_k]
    
    return [content for _, content in top_results]

# 1. AI Generation Module (Gemini)
def generate_script(prompt: str) -> str:
    """
    Generate content using the Gemini model based on the provided prompt.
    """
    response = client.models.generate_content(
        model=model_name,
        contents=[{"role": "user", "parts": [{"text": prompt}]}]
    )
    return response.text

def run_rag_pipeline(query: str) -> None:
    """
    Execute the full RAG pipeline: Retrieve relevant context and generate an answer.
    """
    print(f"Query: {query}")
    
    # Retrieve relevant context from our SQLite database
    contexts = retrieve_context(query)
    context_str = "\n".join([f"- {ctx}" for ctx in contexts])
    print("\n--- Retrieved Context ---")
    print(context_str)
    
    # Construct the augmented prompt containing both the retrieved facts and the question
    augmented_prompt = f"""You are a helpful assistant. Use the provided context to answer the user's question.

Context:
{context_str}

User Question: {query}

Answer:"""
    
    print("\n--- Generating Answer ---")
    # Generate the final answer using the LLM
    answer = generate_script(augmented_prompt)
    print(answer)

if __name__ == "__main__":
    print("RAG System Initialized. Type 'exit' or 'quit' to stop.")
    while True:
        user_query = input("\nEnter your question: ")
        if user_query.lower() in ['exit', 'quit']:
            print("Exiting...")
            break
        if not user_query.strip():
            continue
        run_rag_pipeline(user_query)
