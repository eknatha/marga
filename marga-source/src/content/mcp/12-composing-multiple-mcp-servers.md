---
title: Composing multiple MCP servers
minutes: 12
summary: Connect a client to several MCP servers, avoid tool name clashes and overload, and design a small set of focused servers.
---

One server for everything becomes a bottleneck, and ten servers with overlapping tools confuse the model. The goal is a small set of well-scoped servers combined per use case.

## What you will learn

- How clients combine servers and tools
- Namespacing and avoiding overlap
- Limiting the toolbox per agent
- Testing combinations and permissions

## Configuration

```json
{
  "mcpServers": {
    "incidents": {"command": "python", "args": ["incidents_server.py"]},
    "metrics": {"url": "https://mcp.example.com/metrics", "headers": {"Authorization": "Bearer ${METRICS_TOKEN}"}},
    "tickets": {"url": "https://mcp.example.com/tickets"}
  }
}
```

The client connects to each server, lists its tools and presents all of them to the model. If two servers expose `search`, the client must rename or prefix them, for example `incidents_search` and `tickets_search`.

## Keep servers focused

Group tools by domain and by permission level. A read-only observability server and a separate change-management server are easier to secure and to enable selectively than one server with everything.

## Limit the toolbox

Tool descriptions consume context, and large toolboxes reduce accuracy. Give each agent only the tools it needs. Many clients allow an allowlist per server or per task.

```json
{"agents": {"triage": {"tools": ["incidents_search", "metrics_query", "tickets_read"]}}}
```

## Test combinations

Write scenario tests where the agent must use two or three tools across servers, and check that it picks the right ones. Check permissions across servers too: a read-only identity on one server should not become write access through another. Review the combined list of tool names and descriptions for overlaps whenever a server is added.

## Incident: Sixty tools and the wrong choice

> **Incident:** An agent picked the wrong search tool among many similar ones.

```console
tools available: 60
agent called: search_docs
intended: search_incidents
```

The names were similar and the descriptions overlapped. After the team limited each agent to a short list, renamed tools with a domain prefix and rewrote descriptions to say when not to use them, selection errors dropped sharply.

## Common mistakes

- Exposing every tool to every agent
- Several tools with the same purpose
- No namespacing across servers
- Not testing cross-server scenarios

```quiz
Q: What can happen with the same tool name on two servers?
+ A clash that needs prefixes
- Faster calls :: No.
- Smaller context :: No.
- Better selection :: No.
> Names must be unique.

Q: Why limit tools per agent?
+ Fewer wrong choices and less context
- It is slower :: No.
- It hides servers :: No.
- It removes auth :: No.
> Curate the toolbox. The lesson section above explains why.

Q: Why split servers by permission level?
+ Easier to secure and enable selectively
- More files :: No.
- Higher cost :: No.
- No reason :: No.
> Separate read and write.

Q: What do you test across servers?
+ Realistic multi-tool scenarios
- Only startup :: No.
- Only names :: No.
- Nothing :: No.
> Combinations reveal conflicts.
```

```cards
Namespacing :: Prefixing names to avoid clashes
Allowlist :: A list of permitted tools
Toolbox :: The set of tools an agent can use
Context cost :: Tokens used by tool descriptions
```
