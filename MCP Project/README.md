# MCP Joke Server

This repository contains Model Context Protocol (MCP) servers written in both Node.js and Python. Whenever triggered, these servers will return a random joke.

## What is MCP (Model Context Protocol)?

The **Model Context Protocol (MCP)** is an open standard introduced by Anthropic that standardizes how AI models and agents communicate with external tools, data sources, and services. 

Before MCP, integrating an AI model with various external systems (like databases, APIs, or local files) required building custom integrations for each system and each AI provider. MCP solves this by providing a universal, standardized protocol. It uses JSON-RPC 2.0 as its foundational message format.

### Key Concepts of MCP

MCP revolves around a few core capabilities that a Server can provide to an AI model:

1. **Tools:** These are executable functions that the AI model can invoke. They perform actions (like sending an email, executing code, or in our case, fetching a joke) and return the result. They are similar to OpenAI's function calling.
2. **Resources:** These provide readable data context to the AI model. Resources can be files, database schemas, API responses, or any structured data. They are referenced using URIs (e.g., `file:///logs/app.log` or `postgres://schema/users`).
3. **Prompts:** These are reusable prompt templates or instructions that the AI model can request to guide its behavior or format its output.

### MCP Architecture

- **MCP Hosts:** Applications that use AI models (like Claude Desktop, an IDE like Cursor, or your custom agent).
- **MCP Clients:** The layer inside the host application that speaks the MCP protocol, establishing the connection to servers.
- **MCP Servers:** Lightweight programs (like the ones in this repo) that expose specific capabilities (Tools, Resources, or Prompts) over a standardized transport.

## Types of MCP Transports

MCP supports different transport mechanisms for communication between the Client and the Server. The transport standard defines *how* the JSON-RPC messages are sent and received.

### 1. STDIO (Standard Input/Output)
This is the most common and straightforward transport for local MCP servers.
- **How it works:** The MCP Host (Client) launches the MCP Server as a subprocess. They communicate by reading from and writing to the standard input (`stdin`) and standard output (`stdout`) streams.
- **Pros:** Extremely secure (no network ports opened), very fast, easy to deploy locally, lifecycle is managed by the host (when the host closes, the server subprocess closes).
- **Cons:** Only works when the Client and Server are running on the same machine.
- **Usage in this repo:** Both our Node.js and Python joke servers use the STDIO transport.

### 2. SSE (Server-Sent Events) / HTTP
This transport is designed for remote communication over the network.
- **How it works:** The MCP Server runs as an HTTP server. 
  - The Server sends messages to the Client using Server-Sent Events (SSE) over a long-lived HTTP connection.
  - The Client sends messages to the Server using standard HTTP `POST` requests to a specific endpoint.
- **Pros:** Allows the MCP Server to be hosted remotely (e.g., on AWS or Vercel) and accessed by multiple clients across the internet.
- **Cons:** Requires network configuration (ports, firewalls, CORS), authentication, and lifecycle management (the server must be kept running independently of the client).

*Note: While there are community implementations for other transports (like WebSockets), STDIO and SSE are the two officially supported standards in the core MCP SDKs.*

## What is `@modelcontextprotocol/inspector`?

The `@modelcontextprotocol/inspector` is a specialized debugging and testing tool provided by the MCP team. It acts as an interactive, web-based MCP Host that allows you to connect to any local MCP Server and test its Tools, Resources, and Prompts manually—without needing a full AI application like Claude Desktop.

It is extremely useful for developers building MCP servers, as you can verify that your server correctly handles requests, inspect the exact JSON-RPC payloads being sent back and forth, and ensure your tools execute as expected.

### How to use the Inspector

You can run the inspector directly via `npx` (Node Package Execute), pointing it to the command that starts your MCP server.

**For a Node.js MCP Server:**
```bash
npx @modelcontextprotocol/inspector node path/to/your/server.js
```

**For a Python MCP Server:**
```bash
npx @modelcontextprotocol/inspector python path/to/your/server.py
```

When you run this command, it will start a local web server and provide a URL (usually `http://localhost:5173`). Open that URL in your browser to interact with your MCP server's tools and resources via a graphical UI.

---

## How to Run the Joke MCP Servers

### Node.js Version

1. Navigate to the `node` directory:
   ```bash
   cd node
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Test it using the Inspector:
   ```bash
   npx @modelcontextprotocol/inspector node index.js
   ```

### Python Version

1. Navigate to the `python` directory:
   ```bash
   cd python
   ```
2. Install dependencies (it's recommended to use a virtual environment):
   ```bash
   pip install -r requirements.txt
   ```
3. Test it using the Inspector:
   ```bash
   npx @modelcontextprotocol/inspector python server.py
   ```

## Configuring an MCP Host (mcp.json)

To use these servers in an actual AI application (like Claude Desktop or Cursor), you will need to provide the host with a configuration file. This file tells the host how to start your MCP servers using the STDIO transport. 

We have provided an example `mcp.json` file (often named `claude_desktop_config.json` depending on the host application) in the root of this project:

```json
{
  "mcpServers": {
    "joke-server-node": {
      "command": "node",
      "args": [
        "C:\\Users\\ADMIN\\Documents\\AI-Projects\\MCP Project\\node\\index.js"
      ]
    },
    "joke-server-python": {
      "command": "python",
      "args": [
        "C:\\Users\\ADMIN\\Documents\\AI-Projects\\MCP Project\\python\\server.py"
      ]
    }
  }
}
```

### How it works:
- **`mcpServers`**: A dictionary containing all the servers you want the host to connect to.
- **`command`**: The executable to run (e.g., `node` or `python`).
- **`args`**: The arguments passed to the command, which should be the absolute path to the server script. (Make sure to use your actual absolute path if you move these files).
