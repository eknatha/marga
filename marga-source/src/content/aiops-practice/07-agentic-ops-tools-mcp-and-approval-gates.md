---
title: Agentic ops: tools, MCP and approval gates
minutes: 14
summary: Give an LLM agent a small, typed set of operations tools, start read-only, and put human approval gates in front of anything that changes a system.
---

An agent is a language model that can choose and call tools in a loop. In operations that means it can look at metrics, read logs, search runbooks and perhaps change things. The skill is to give it enough reach to be useful and little enough that a wrong step is harmless.

## What you will learn

- How an agent loop works and where it can go wrong
- How to design tools the model uses correctly
- How the Model Context Protocol (MCP) fits in
- How to stage autonomy from read-only to gated actions

## The loop

The model receives a goal and a list of tools. It replies with a tool call, the host runs the call, the result goes back to the model, and the loop repeats until the model answers or a limit is reached. The host, not the model, enforces the rules: which tools exist, what arguments are valid, what needs approval, and when to stop.

## Design tools for models

Make each tool do one thing and give it a clear name, a precise description and typed parameters with limits. `get_error_rate(service, window_minutes)` is better than `run_query(string)`. Return compact, structured results with units and time ranges, and include a short error message the model can act on. Never expose a generic shell or an unrestricted query tool, because the model's mistake then has no ceiling.

## MCP

The Model Context Protocol gives agents a standard way to discover and call tools served by separate processes. An MCP server for operations might expose `list_alerts`, `get_deploys`, `get_runbook` and `query_metrics`. The host decides which servers a given agent can connect to and applies policy on each call. Treat an MCP server like any service: authenticate it, give it least privilege and log every call.

## Stage the autonomy

1. **Read-only.** Tools only gather evidence. The agent writes a summary and a suggested next step. This already saves time and cannot change anything.
2. **Propose.** The agent prepares an action as a structured proposal: what, on which target, why, with the evidence and a rollback.
3. **Gate.** A human approves or rejects. The approval message shows exactly what will run.
4. **Bounded autonomy.** Low-risk, reversible actions within limits run without approval, using the tiers and guardrails from earlier lessons.

## Gates that mean something

An approval prompt that says "run remediation?" gets clicked through. Show the concrete command or API call, the target, the expected effect, and the evidence. Make the safe choice easy and make approval require a deliberate step for higher tiers. Record who approved and when.

## Limits on the loop

Cap the number of steps, the time and the tokens. Detect loops where the agent repeats the same call. Make the final answer include the steps taken so a person can follow the reasoning. Keep a transcript of every tool call and result.

```yaml
tools:
  - name: get_error_rate
    description: Error ratio for one service over a recent window.
    access: read
    params:
      service: {type: string, enum_from: service_catalog}
      window_minutes: {type: integer, min: 1, max: 120}
  - name: get_recent_changes
    description: Deploys, flags and config changes for one service.
    access: read
    params:
      service: {type: string, enum_from: service_catalog}
      since_minutes: {type: integer, min: 5, max: 360}
  - name: propose_rollback
    description: Prepare, but do not run, a rollback to the previous version.
    access: propose
    params:
      service: {type: string, enum_from: service_catalog}
approval:
  propose_rollback: {tier: 2, approvers: [oncall-primary, oncall-secondary]}
limits: {max_steps: 12, max_seconds: 180}
```

The agent can read data and prepare a rollback but cannot run it. A named on-call engineer must approve, and the run stops after 12 steps or three minutes.

## Evaluate the agent

Replay past incidents with the tools in a sandbox that returns recorded data. Check whether the agent reached the right diagnosis, used sensible tools, avoided dangerous ones and stayed within limits. Run the same set after every prompt or model change.

```diagram
title: An agent with gates
node: goal | Incident goal | 0 | 1 | Investigate high error rate on checkout. | Vague goals encourage wandering. | client
node: agent | Agent loop | 1 | 1 | Model chooses a tool, host runs it, repeat. | No step or time limit. | service
node: read | Read tools | 2 | 0 | Metrics, changes, runbooks, topology. | A generic query or shell tool. | cache
node: prop | Propose action | 2 | 2 | Structured plan with evidence and rollback. | A vague "fix it" button. | process
node: gate | Human gate | 3 | 2 | Shows the exact command and target. | Approvals clicked through unread. | security
node: log | Transcript and audit | 4 | 1 | Every call, result and approval recorded. | Logs the agent can alter. | store
edge: goal | agent
edge: agent | read
edge: agent | prop
edge: prop | gate
edge: read | log
edge: gate | log
```

## Incident: The helpful query

> **Incident:** An agent with a free-form query tool ran an expensive log search many times and slowed the logging cluster during an outage.

```console
$ agentlog summary --run run-0932
steps: 41  tool: run_query x 37  avg duration: 9.4s
logging cluster cpu: 96%
(this is a simulated illustration, not a real incident)
```

The tool accepted any query with no limit, so the agent kept widening its search. The team replaced it with typed tools with maximum windows, added a call budget and a step limit, and put rate limits on the logging API for automated callers.

## Common mistakes

- Giving the agent a generic shell or query tool
- No step, time or token limit
- Approval prompts that hide what will run
- Skipping the read-only stage
- No transcript of tool calls

```quiz
Q: Who enforces the rules in an agent loop?
+ The host that runs the tools, not the model
- The model alone :: It can be wrong.
- The user's browser :: Not involved.
- The log store :: Records only.
> Policy must live in code the model cannot change.

Q: What makes a good agent tool?
+ One clear purpose with typed, limited parameters
- A single run_anything tool :: No ceiling on mistakes.
- A tool with no description :: The model cannot use it well.
- A tool returning raw logs only :: Too large and unstructured.
> Narrow typed tools are safer and easier to use.

Q: Why start agents read-only?
+ It delivers value with no ability to change a system
- It is required by MCP :: Not required.
- It makes the model faster :: Not the reason.
- It avoids logging :: Unrelated.
> Evidence gathering is useful and safe.

Q: What should an approval prompt show?
+ The exact action, target, evidence and rollback
- A generic Run? button :: Gets clicked through.
- Only the model name :: Not useful.
- Nothing, to save time :: Unsafe.
> Approvers need to see what will actually happen.
```

```cards
Agent :: A model that chooses and calls tools in a loop toward a goal
MCP :: A protocol for exposing tools and data to AI applications
Tool call :: A structured request from the model to run a tool
Approval gate :: A required human decision before a change runs
Step limit :: A cap on how many tool calls an agent may make
```
