import requests
from mcp.server.mcpserver import MCPServer

app = MCPServer("mcp-joke-server")

@app.tool(description="Get a random joke to lighten the mood.")
def get_random_joke() -> str:
    try:
        response = requests.get("https://official-joke-api.appspot.com/random_joke")
        response.raise_for_status()
        data = response.json()
        joke_text = f"{data['setup']}\n\n...{data['punchline']}"
        return joke_text
    except Exception as e:
        return f"Failed to fetch a joke: {str(e)}"

if __name__ == "__main__":
    app.run()
