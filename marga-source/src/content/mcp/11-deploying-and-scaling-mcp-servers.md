---
title: Deploying and scaling MCP servers
minutes: 13
summary: Run MCP servers remotely over HTTP with authentication, containers, health checks, rate limits and observability.
---

A server used by a whole team cannot run as a subprocess on each laptop. Moving it behind HTTP lets many clients share it, and brings the usual concerns of identity, capacity and reliability.

## What you will learn

- Local stdio versus remote HTTP servers
- Authentication and authorization for tools
- Containers, health checks and limits
- Observability and audit for tool calls

## Transports

**stdio** servers run as a child process of the client, which is simple and private. **Streamable HTTP** servers listen on a URL, support many clients and can run in a cluster. Choose HTTP for shared tools, central control and shared data access.

## Authentication

Authenticate every request. The MCP specification uses OAuth for remote servers: the client obtains a token and sends it as a bearer token, and the server validates the audience and scopes. Authorize per tool, so a read-only token cannot call write tools, and pass the end user's identity to downstream systems instead of a shared superuser.

## Run it like a service

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .
USER 10001
EXPOSE 8080
CMD ["python", "server.py", "--transport", "http", "--port", "8080"]
```

```yaml
resources:
  requests: {cpu: 100m, memory: 128Mi}
  limits: {memory: 256Mi}
readinessProbe:
  httpGet: {path: /healthz, port: 8080}
```

Add rate limits per client and per tool, timeouts on every external call, and request size limits. Keep session state in a shared store so any replica can answer.

## Observe

Log each tool call with the caller identity, tool name, arguments with sensitive values removed, duration and result status. Export metrics such as calls, errors and latency per tool. Alert on error spikes and on unusual call volume from one identity. Keep logs as an audit trail.

## Incident: One agent, ten thousand calls

> **Incident:** A looping agent overloaded a shared tool server.

```console
tool: search_logs
calls from agent-77: 10214 in 6 minutes
server p99 latency: 18s, other clients timing out
```

An agent got stuck in a loop and called an expensive search repeatedly. With no limits, it affected all users. The team added per-identity rate limits, a timeout and a cap on result size, and alerting on abnormal call volume.

## Common mistakes

- Remote servers with no authentication
- Shared superuser credentials for downstream systems
- No rate limits or timeouts
- Sessions stored in one instance's memory

```quiz
Q: Which transport suits a shared team server?
+ Streamable HTTP
- stdio :: No.
- Pipes only :: No.
- Email :: No.
> HTTP supports many clients.

Q: What should authorization be tied to?
+ The caller identity and tool scope
- The server name :: No.
- The colour :: No.
- Nothing :: No.
> Least privilege per tool.

Q: Why rate limit tools?
+ Loops and surges can overload the server
- To hide tools :: No.
- To increase tokens :: No.
- To encrypt :: No.
> Protect capacity. The lesson section above explains why.

Q: What belongs in an audit log of tool calls?
+ Identity, tool, duration and result
- Secrets :: No.
- Passwords :: No.
- Nothing :: No.
> Accountability. The lesson section above explains why.
```

```cards
Streamable HTTP :: Remote MCP transport over HTTP
Bearer token :: Credential sent in an Authorization header
Rate limit :: Cap on calls per time per client
Audit log :: Record of who did what
```
