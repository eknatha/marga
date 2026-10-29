---
title: Why tools, and what MCP is
minutes: 11
summary: See why a model needs tools to act and fetch facts, and how the Model Context Protocol standardises connecting tools and data to AI applications.
---

A model alone can only produce text from its prompt. To read your ticket system, query a database, or restart a service, it needs tools: functions the application runs on its behalf. Every team was writing custom glue for each model and each tool. The Model Context Protocol, or MCP, is an open standard for that glue, so a tool server written once can be used by many AI applications.

## What you will learn

- What tools add to a model
- The problem MCP solves
- Hosts, clients and servers in one picture
- What MCP does not do for you

## Tools in one paragraph

You describe functions to the model (name, purpose, inputs). During a conversation, the model may ask the application to call one with arguments it chooses. The application runs the function, and returns the result as text for the model to use. The model never executes anything itself; your code does. This is how a model checks real data, performs actions and works with exact results.

## The integration problem

Without a standard, connecting five AI applications to ten systems needs fifty custom integrations, each with its own format, authentication and bugs. MCP defines one protocol: a server exposes capabilities in a common format, and any compatible application can connect. It is often compared to a common port that lets many devices and many peripherals work together.

## Three roles

- The **host** is the AI application the user works in, such as a chat app, an editor or an agent runner.
- The **client** is a component inside the host that keeps one connection to one server.
- The **server** is a program that exposes **tools** (actions), **resources** (data to read) and **prompts** (reusable templates).

Servers can run on your machine, communicating through standard input and output, or run remotely and communicate over HTTP. The messages use JSON-RPC 2.0.

## What MCP does not do

MCP standardises connecting; it does not make a tool safe, a prompt good or a model reliable. You still decide which servers to trust, what permissions to give, how to authenticate, what the model may do without approval, and how to test the result. A connected server is code and text that influence the model, so treat it with the care you give any dependency. The protocol is evolving, so check the specification version your SDK and servers support.

```predict
Q: You must connect three AI applications to your internal ticket system. Why might an MCP server be a good choice?
???
One server exposing the ticket tools can be used by all compatible applications instead of three custom integrations.
> Write once, connect many.
```

## Incident: Fifty integrations

> **Incident:** A platform team maintained separate plugins for each AI assistant its engineers used.

```console
$ ls integrations/
assistant-a-tickets/  assistant-b-tickets/  assistant-c-tickets/  ide-tickets/
$ ls mcp/ticket-server/
server.py  README.md  tests/
```

Each plugin had its own authentication and a different bug. The team replaced them with one MCP server with a clear set of tools, one place for permissions and logging, and a test suite. New assistants could connect without new integration code.

## Common mistakes

- Thinking the model runs the tools itself
- Trusting any server because the protocol is standard
- Exposing too many tools at once
- Ignoring authentication

```quiz
Q: Who executes a tool call?
+ The application or server, not the model
- The model :: It only requests.
- The user's browser :: Not necessarily.
- The GPU :: No.
> The model asks, your code acts. Re-read the matching lesson section for the full reasoning.

Q: What is MCP?
+ An open protocol for connecting tools and data to AI applications
- A database :: No.
- A model :: No.
- A programming language :: No.
> JSON-RPC based. Re-read the matching lesson section for the full reasoning.

Q: What do MCP servers expose?
+ Tools, resources and prompts
- Only images :: No.
- Only passwords :: No.
- Only logs :: No.
> Three primitives. Re-read the matching lesson section for the full reasoning.

Q: Does MCP make a connected tool safe?
+ No, you still control trust, permissions and approval
- Yes :: False.
- Only on Linux :: False.
- Only locally :: False.
> A server is a dependency. Re-read the matching lesson section for the full reasoning.
```

```cards
Tool :: function the app runs for the model
MCP :: open protocol for tool and data servers
Host :: the AI application
Client :: connection inside the host
Server :: exposes tools, resources, prompts
Remember :: standard is not safe by itself
```
