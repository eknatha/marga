---
title: Building an MCP server in Python
minutes: 14
summary: Build a small server with the Python SDK, expose tools with type hints and docstrings, test it with an inspector, and connect it to a host.
---

Writing a server is the best way to understand MCP, and it is short. With the official Python SDK, a function with type hints and a docstring becomes a tool. The craft is in choosing good tools, returning useful results, and testing the server on its own before any model is involved.

## What you will learn

- A minimal server with one tool
- Type hints and docstrings become the schema
- Test with the inspector and unit tests
- Register the server with a host

## Minimal server

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("tickets")

TICKETS = {"TCK-1042": {"title": "Login fails", "status": "open", "priority": "high"}}

@mcp.tool()
def get_ticket(ticket_id: str) -> dict:
    """Fetch one support ticket by ID, such as TCK-1042.

    Returns title, status and priority, or an error if the ID is unknown.
    """
    ticket = TICKETS.get(ticket_id)
    if ticket is None:
        return {"error": "no ticket with ID " + ticket_id}
    return ticket

if __name__ == "__main__":
    mcp.run()   # stdio transport by default
```

Install the SDK with `pip install "mcp[cli]"` in a virtual environment. Check the SDK documentation for the current import path and options, because the library is developing quickly.

## Schema from the function

The SDK builds the tool's input schema from the parameter names and type hints, and uses the docstring as the description. So write the docstring for the model: what it does, what it returns, when to use it. Use `Literal` or enums for fixed choices and defaults for optional parameters. Keep each tool small. Return structured data or concise text, and return errors as data the model can read, not tracebacks.

## Test it alone

Test the server without a model. The MCP Inspector lets you connect, list tools and call them by hand; run it with the command from the SDK docs. Also write ordinary unit tests for the functions. Check that standard output stays clean, that bad arguments produce clear errors, and that large results are limited.

```bash
npx @modelcontextprotocol/inspector python server.py
pytest tests/ -q
```

## Connect to a host

Hosts read a configuration that says how to start each server, typically a command and arguments, and sometimes environment variables for settings. Use absolute paths and a virtual environment's Python so the right libraries are found. Pass secrets through environment variables or the host's secret store, never in tool arguments. After connecting, ask the host to list its tools, then try a realistic request. If something fails, look at the host's MCP logs and your server's standard error output.

```predict
Q: Your tool returns a Python traceback on a bad ID. What should it return instead?
???
A short, structured error such as "no ticket with ID X" that tells the model what to try next.
> Errors are data for the model.
```

## Incident: The server that could not be found

> **Incident:** A host showed "failed to start server" for a new tool.

```console
$ cat mcp-config.json | jq .servers.tickets
{ "command": "python", "args": ["server.py"] }
$ python server.py
ModuleNotFoundError: No module named 'mcp'
```

The host started the system Python, which lacked the SDK, and used a relative path to server.py. The configuration was changed to use the virtual environment's Python and an absolute path, and the README gained a "test with the inspector first" step.

## Common mistakes

- Printing to stdout
- Relative paths and the wrong Python in host config
- Returning raw tracebacks
- Skipping tests without a model

```quiz
Q: How does the Python SDK build a tool's schema?
+ From type hints and the docstring
- From the file name :: No.
- From the OS :: No.
- By guessing :: No.
> Write good docstrings. Re-read the matching lesson section for the full reasoning.

Q: How can you test a server without a model?
+ Use the MCP Inspector and unit tests
- Hope :: No.
- Ask users :: Late.
- Deploy to production :: Risky.
> Test alone first. Re-read the matching lesson section for the full reasoning.

Q: How should secrets reach a server?
+ Through environment variables or a secret store
- In tool arguments :: Leaks.
- In the docstring :: Leaks.
- In the tool name :: Leaks.
> Never in prompts. Re-read the matching lesson section for the full reasoning.

Q: What should the host config use?
+ Absolute paths and the right Python environment
- Relative paths :: Fragile.
- Any Python :: Fragile.
- No command :: Cannot start.
> Make start-up reliable. Re-read the matching lesson section for the full reasoning.
```

```cards
Server :: FastMCP("name") and @mcp.tool()
Schema :: type hints + docstring
Run :: mcp.run() for stdio
Test :: inspector and pytest
Config :: absolute paths, venv Python
Secrets :: environment, never arguments
```
