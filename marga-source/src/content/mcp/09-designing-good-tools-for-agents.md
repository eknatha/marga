---
title: Designing good tools for agents
minutes: 12
summary: Design tool names, descriptions, inputs and outputs so a model chooses and uses them correctly, with safe defaults and helpful errors.
---

The model chooses tools from their names and descriptions, so those few lines are the most important part of a tool. Good tool design looks like good API design, with extra care for ambiguity.

## What you will learn

- Names and descriptions that guide selection
- Small typed inputs and clear outputs
- Errors the model can recover from
- Separating read from write and guarding destructive actions

## Names and descriptions

```json
{
  "name": "search_incidents",
  "description": "Search past incidents by service and keyword. Use to find similar incidents. Returns up to 10 incidents with id, title, date and summary. Does not change anything.",
  "input_schema": {
    "type": "object",
    "properties": {
      "service": {"type": "string", "description": "Service name, for example checkout"},
      "query": {"type": "string", "description": "Keywords, for example timeout database"},
      "since_days": {"type": "integer", "minimum": 1, "maximum": 365, "default": 90}
    },
    "required": ["service", "query"]
  }
}
```

State what the tool does, when to use it, what it returns and what it does not do. Use verbs and domain terms. Avoid generic names like `run` or `execute`.

## Inputs and outputs

Prefer a few typed arguments with enums over free-form text. Return only what the model needs, with stable **identifiers** it can pass to other tools, and cap result size. A giant JSON blob wastes context and hides the answer.

## Errors

```json
{
  "error": "service_not_found",
  "message": "No service named 'checkot'. Did you mean 'checkout'?",
  "suggestions": ["checkout", "checkout-worker"]
}
```

A good error says what went wrong and what to try next. Do not return stack traces or secrets.

## Reads, writes and approvals

Split read tools from write tools. For destructive actions, require an explicit argument such as `confirm: true` plus a reason, or route them through human approval in the client. Make write tools idempotent where possible.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Designing good tools for agents fits together
node: n1 | Names and descriptions | 0 | 0 | State what the tool does, when to use it, what it returns and what it does not do. | One generic tool for everything. | process
node: n2 | Inputs and outputs | 1 | 1 | Prefer a few typed arguments with enums over free-form text. | Huge outputs with no identifiers. | process
node: n3 | Errors | 2 | 0 | A good error says what went wrong and what to try next. | Errors that only say failed. | process
node: n4 | Reads, writes and approvals | 3 | 1 | Split read tools from write tools. For destructive actions, require an explicit argument such as confirm: true plus a reason, or route them through human approval in the... | Destructive actions without confirmation. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The tool called run

> **Incident:** A generic tool let the agent execute arbitrary commands.

```console
tool: run(command="kubectl delete ns staging")
result: namespace "staging" deleted
confirmation requested: none
```

The single tool accepted any shell command and did not distinguish reading from deleting. The team replaced it with narrow tools such as list_namespaces and scale_deployment, added approval for deletes and returned errors that explain allowed values.

## Common mistakes

- One generic tool for everything
- Huge outputs with no identifiers
- Errors that only say failed
- Destructive actions without confirmation

```quiz
Q: What do models use to choose a tool?
+ Its name and description
- Its file size :: No.
- Its colour :: No.
- Its port :: No.
> They read the interface text.

Q: What makes a good error?
+ It says what failed and what to try
- A stack trace :: No.
- Nothing :: No.
- A random code :: No.
> The model can recover.

Q: Why split read and write tools?
+ To control and approve risky actions
- To make them slower :: No.
- To avoid schemas :: No.
- To hide results :: No.
> Safety by design. The lesson section above explains why.

Q: What should results include?
+ Stable identifiers for follow-up
- All raw data :: No.
- Secrets :: No.
- Nothing :: No.
> Identifiers connect steps.
```

```cards
Tool description :: Text that tells a model when to use a tool
Input schema :: Typed definition of tool arguments
Idempotent :: Safe to repeat with the same effect
Confirmation :: An explicit approval step for risky actions
```
