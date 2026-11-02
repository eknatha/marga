---
title: Tool use and MCP
summary: Tool definitions, the tool-use loop, MCP messages, a Python server, transports, approvals and injection defences.
module: mcp
---

## Tool definition

```json
{
  "name": "get_ticket",
  "description": "Fetch one support ticket by ID, such as TCK-1042. Returns title, status and priority.",
  "input_schema": {
    "type": "object",
    "properties": {"ticket_id": {"type": "string"}},
    "required": ["ticket_id"]
  }
}
```

> **Warning:** Validate every tool call's arguments in your code. The model can send wrong types, extra fields or invalid values.

## The loop

```python
for step in range(MAX_STEPS):
    reply = client.messages.create(model=MODEL, max_tokens=1000,
                                   tools=TOOLS, messages=messages)
    messages.append({"role": "assistant", "content": reply.content})
    if reply.stop_reason != "tool_use":
        break
    messages.append({"role": "user", "content": run_all_tools(reply)})
```

Return one tool result per call, matched by the call ID. Return errors as results.

> **Warning:** Always cap steps, tokens, time and cost, and stop on repeated identical calls.

## MCP messages

```text
{"jsonrpc": "2.0", "id": 1, "method": "initialize"}
{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
{"jsonrpc": "2.0", "id": 3, "method": "tools/call",
 "params": {"name": "get_ticket", "arguments": {"ticket_id": "TCK-1042"}}}
```

## Python server

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("tickets")

@mcp.tool()
def get_ticket(ticket_id: str) -> dict:
    """Fetch one support ticket by ID. Returns title and status."""
    return TICKETS.get(ticket_id, {"error": "unknown ticket"})

if __name__ == "__main__":
    mcp.run()
```

> **Warning:** In stdio servers, write logs to standard error. Anything else on standard output breaks the protocol stream.

## Test and connect

```bash
npx @modelcontextprotocol/inspector python server.py
pytest tests/ -q
```

Use absolute paths and the virtual environment's Python in the host configuration.

## Primitives

```text
Tools      model-controlled actions
Resources  data by URI, attached by app or user
Prompts    templates the user chooses
```

## Security checklist

```text
read-only credentials for read tools
approval for destructive, costly or external actions
no token passthrough; scoped short-lived tokens
tool output and fetched pages are untrusted data
```

> **Warning:** Do not combine private data access, untrusted content and an outbound channel in one session without strong controls. Prompt wording is not a security boundary.

## Debug

```bash
python server.py < /dev/null | head -c 300
jq '.steps[] | {n, tool, input, is_error}' trace.json
```

Order: server alone, transport, protocol, definitions, model choices, loop.
