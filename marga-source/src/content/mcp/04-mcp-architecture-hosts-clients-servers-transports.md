---
title: MCP architecture: hosts, clients, servers and transports
minutes: 13
summary: Understand the connection lifecycle, JSON-RPC messages, the stdio and HTTP transports, and the capabilities each side offers.
---

MCP is a small protocol with clear parts. Knowing the lifecycle and message flow lets you read logs, write servers and debug connection problems without treating the SDK as a black box.

## What you will learn

- Connection lifecycle and capability negotiation
- JSON-RPC messages for listing and calling tools
- Transports: stdio and streamable HTTP
- Capabilities on the client side

## Lifecycle

1. The client opens a connection and sends `initialize` with the protocol version it supports and its capabilities.
2. The server replies with its chosen version, capabilities and information about itself.
3. The client sends an `initialized` notification, and normal operation begins.
4. Either side can send requests and notifications until the connection closes.

Capabilities say what each side supports, such as tools, resources, prompts, and for clients, features like sampling or roots. If versions or capabilities do not match, the connection must fall back or fail clearly.

## Messages

All messages are JSON-RPC 2.0: requests have an `id` and a `method`, responses return `result` or `error`, notifications have no `id`.

```text
{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
{"jsonrpc": "2.0", "id": 3, "method": "tools/call",
 "params": {"name": "get_ticket", "arguments": {"ticket_id": "TCK-1042"}}}
```

A tool call result contains content blocks (text, images or resources) and a flag showing whether it was an error. The client passes tool definitions to the model, and when the model requests a call, the host decides whether to run it (often after asking the user).

## Transports

- **stdio**: the host starts the server as a child process and exchanges messages over standard input and output. Simple, local, and no network. The server must write only protocol messages to standard output; logs go to standard error.
- **Streamable HTTP**: the server runs as a web service, the client sends requests over HTTP, and the server can stream responses. Used for remote and shared servers, with authentication such as OAuth.

Older write-ups mention an HTTP-plus-SSE transport that has been superseded; check the current specification. The choice affects security: a local stdio server runs with your user's permissions, a remote server needs network authentication and TLS.

## Client-side features

Besides consuming tools, clients may offer features that servers can ask for: **roots** (which directories the server may work in), **sampling** (the server asks the host's model to generate text, with user approval) and **elicitation** (asking the user for input). Hosts should keep a human in control of sensitive steps. Because features vary between hosts, a server should work without them, or explain clearly when it needs one.

```predict
Q: A stdio MCP server prints debug messages with print() and the client reports "invalid JSON". What happened and how do you fix it?
???
The debug text went to standard output, which is reserved for protocol messages. Log to standard error or a file instead.
> stdout is the protocol channel.
```

## Incident: The connection that closed at once

> **Incident:** A new server worked in the inspector but the host reported a parse error.

```console
$ python server.py < /dev/null | head -2
Starting ticket server v0.3...
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2025-03-26"}}
```

The startup banner was printed to standard output before any protocol message, so the client could not parse the stream. The banner was moved to standard error, a test was added that checks that standard output contains only valid JSON lines, and the README explains how to enable debug logs safely.

## Common mistakes

- Printing logs to standard output in stdio servers
- Ignoring protocol version negotiation
- Assuming every client supports every feature
- Running a remote server without authentication

```quiz
Q: What message format does MCP use?
+ JSON-RPC 2.0
- XML-RPC :: No.
- SMTP :: No.
- FTP :: No.
> Requests, responses, notifications. Re-read the matching lesson section for the full reasoning.

Q: What is the first step of a connection?
+ initialize with version and capabilities
- tools/call :: After initialisation.
- shutdown :: Last.
- ping only :: Not required.
> Capability negotiation. Re-read the matching lesson section for the full reasoning.

Q: Which transport suits a local helper started by the host?
+ stdio
- Streamable HTTP always :: Heavier.
- FTP :: No.
- Email :: No.
> Child process over stdin and stdout. Re-read the matching lesson section for the full reasoning.

Q: Where should a stdio server write logs?
+ Standard error or a file
- Standard output :: Breaks the protocol.
- The tool result :: Wrong channel.
- Nowhere :: Hard to debug.
> Keep stdout clean. Re-read the matching lesson section for the full reasoning.
```

```cards
Lifecycle :: initialize, initialized, operate, close
Messages :: JSON-RPC requests, responses, notifications
tools/list and tools/call :: discover and run
stdio :: local child process
Streamable HTTP :: remote, needs auth
Logs :: stderr for stdio servers
```
