# ToBeLoaded Directory

Place any documents you want the AI to learn from in this folder.
When you run the data loader scripts (`load_data.py` or `load_data.js`), they will scan this folder, extract the text, generate vector embeddings, and store them in the SQLite database.

Supported file types:
- Text Files (.txt)
- Markdown Files (.md)
- PDF Documents (.pdf)

After loading the data, you can ask the RAG system questions based on the contents of these documents!
