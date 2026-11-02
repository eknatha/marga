---
title: Debugging tool use and MCP
minutes: 14
summary: Investigate failures at each layer: the server, the connection, the tool definitions, the model's choices and the loop.
---

A tool-using system has many moving parts, so failures can hide anywhere. A layered approach isolates the problem: does the server work alone, does the connection work, are the tools described well, does the model choose and call them correctly, and does the loop behave. Testing from the bottom up keeps you from blaming the model for a typo in a config file.

## What you will learn

- Test the server alone
- Check the connection and host logs
- Review tool definitions and traces
- Fix, add tests and monitor

## Bottom-up checklist

1. **Server alone**: run it, use the inspector, call each tool by hand with good and bad inputs.
2. **Transport**: does the host start it (command, path, environment)? Is standard output clean? For HTTP: DNS, TLS, authentication, timeouts.
3. **Protocol**: does `initialize` succeed, is `tools/list` returning what you expect?
4. **Definitions**: are names and descriptions clear, and the schema correct?
5. **Model behaviour**: with the traces, does it choose the right tool and valid arguments?
6. **Loop**: results returned with the right IDs, limits working, errors handled?

## Tools for the job

```bash
npx @modelcontextprotocol/inspector python server.py     # call tools by hand
python server.py < /dev/null | head -c 300               # is stdout clean JSON only?
tail -n 50 ~/.host/logs/mcp-tickets.log                  # host-side logs (path depends on the host)
curl -i https://mcp.example.com/health                   # remote server reachable?
jq '.steps[] | {n, tool, input, is_error}' trace.json    # what the model actually did
```

## Common causes

- Server does not start: wrong Python, missing packages, relative paths, missing environment variables.
- Parse errors: logs on standard output.
- Tools missing: the host cached the old list; restart or reconnect; a capability not negotiated.
- Wrong tool chosen: unclear or overlapping descriptions; too many tools.
- Bad arguments: loose schema, missing enums, no examples in the description.
- Timeouts: slow backends; add limits, pagination, caching and progress.
- 401/403: expired token or wrong scope on a remote server.
- Loops: empty or unhelpful results; no step cap.

## Prove and prevent

Reproduce the failure from a stored trace. Fix one layer at a time. Add a test for the server (a unit test), for the definitions (a conversation set that checks the right tool is chosen) and for the loop (step caps, error results). Monitor tool error rates, latency, call counts per conversation, and approvals declined. Review traces regularly, since they show how users and models really use your tools.

```predict
Q: The model never uses your new tool, but the inspector shows it works. What do you check next?
???
Whether the host lists the tool (cache, reconnect), and the tool's name and description clarity; then check traces to see if the model considers it.
> Server fine, so look at discovery and definitions.
```

## Incident: The tool that vanished after an update

> **Incident:** After a server update, users reported the assistant no longer created tickets.

```console
$ npx @modelcontextprotocol/inspector --cli python server.py --method tools/list | jq -r ".tools[].name"
get_ticket
search_tickets
$ git diff HEAD~1 -- server.py | grep "^-.*create_ticket"
-@mcp.tool()
-def create_ticket(title: str, body: str) -> dict:
```

A refactor had removed create_ticket, and the unit tests did not cover the tool list. The tool was restored, a test now asserts the exact set of tool names, and the release process includes a conversation test where the assistant must create a ticket.

## Common mistakes

- Blaming the model first
- Testing only through the assistant
- No tests for the tool list
- Ignoring host-side logs

```quiz
Q: Where do you start debugging a tool problem?
+ Test the server alone, then connection, definitions, model behaviour and loop
- Rewrite the prompt :: Premature.
- Switch models :: Premature.
- Restart the laptop :: Rarely helps.
> Bottom-up. Re-read the matching lesson section for the full reasoning.

Q: The inspector works but the model picks the wrong tool. Likely cause?
+ Unclear or overlapping tool descriptions
- A broken cable :: No.
- The OS :: No.
- DNS :: No.
> Definitions. Re-read the matching lesson section for the full reasoning.

Q: Why check that stdout is clean?
+ Extra output breaks the JSON-RPC stream in stdio servers
- It saves disk :: No.
- It speeds up the CPU :: No.
- It hides errors :: No.
> Logs go to stderr. Re-read the matching lesson section for the full reasoning.

Q: How do you stop regressions?
+ Tests for server, tool list, definitions and loop
- Hope :: No.
- Fewer tools only :: Not a test.
- Disable logging :: Harmful.
> Automate checks. Re-read the matching lesson section for the full reasoning.
```

```cards
Order :: server, transport, protocol, definitions, model, loop
Inspector :: call tools by hand
stdout :: protocol only; logs to stderr
Traces :: what the model did
Fix :: one layer at a time
Prevent :: tests for list, definitions, loop
```
