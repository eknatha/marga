---
title: Testing and debugging MCP servers
minutes: 12
summary: Test an MCP server with the Inspector, unit tests and recorded sessions, and find protocol, schema and transport problems quickly.
---

When a model fails to use a tool correctly, the fault could be the prompt, the tool description or the server. Testing the server without a model removes one variable and speeds up debugging.

## What you will learn

- Using the MCP Inspector
- Unit and integration tests for tools
- Stdio rules: protocol on stdout, logs on stderr
- Common failures and how to read them

## The Inspector

```bash
npx @modelcontextprotocol/inspector python server.py
```

The Inspector starts a web interface connected to your server. You can list tools, resources and prompts, view schemas, call a tool with arguments and see the raw request and response. Use it to check that descriptions read well and that errors are clear.

## Unit and integration tests

```python
import pytest
from server import search_incidents

def test_search_returns_ids():
    res = search_incidents(service="checkout", query="timeout", since_days=30)
    assert all("id" in r for r in res)

def test_bad_service_is_actionable():
    with pytest.raises(ValueError) as e:
        search_incidents(service="nope", query="x")
    assert "Did you mean" in str(e.value)
```

Test the tool functions as ordinary code. Then add an integration test that starts the server over stdio and performs an initialize and a tool call, to catch protocol mistakes.

## Stdio rules

With the **stdio** transport, the client reads protocol messages from the server's standard output. Anything else printed there breaks the stream. Send logs to **standard error**, and never use `print` for debugging in a stdio server.

```python
import logging, sys
logging.basicConfig(stream=sys.stderr, level=logging.INFO)
```

## Failure patterns

- **Server not listed:** the command path or environment is wrong.
- **Tool missing:** the registration failed or the server crashed on import.
- **Schema rejected:** invalid JSON Schema, such as a missing type.
- **Timeouts:** slow external calls with no timeout.
- **Works in Inspector only:** different working directory or environment variables in the client.

## Incident: A print statement broke the server

> **Incident:** Debug output on stdout corrupted the protocol.

```console
client: Unexpected token 'D' in JSON at position 0
server stdout: Debug: loading config
connection closed
```

A developer added a print statement while debugging. The client expected JSON messages and failed to parse the text. The team moved logging to standard error and added an integration test that fails if the server writes anything else to standard output.

## Common mistakes

- Printing to stdout in a stdio server
- Testing only through a model
- No timeouts on external calls
- Skipping schema validation

```quiz
Q: Where should stdio servers send logs?
+ Standard error
- Standard output :: No.
- The protocol stream :: No.
- The tool result :: No.
> Stdout carries messages.

Q: What does the Inspector let you do?
+ Call tools by hand and view messages
- Train a model :: No.
- Build images :: No.
- Deploy to production :: No.
> Isolate server problems.

Q: Why test tools as plain functions?
+ Faster and clearer feedback
- They are slower :: No.
- It removes schemas :: No.
- It avoids logging :: No.
> Unit tests catch logic bugs.

Q: What can cause a tool to be missing?
+ A crash or failed registration
- A longer name :: No.
- A new colour :: No.
- A bigger model :: No.
> Check startup logs. The lesson section above explains why.
```

```cards
Inspector :: Tool for testing MCP servers interactively
stdio transport :: Server runs as a subprocess using stdin and stdout
Integration test :: Test that exercises the real protocol
Stderr :: Standard error stream used for logs
```
