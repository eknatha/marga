---
title: Resources, prompts and other primitives
minutes: 12
summary: Know when to expose data as resources or reusable prompts instead of tools, and how clients use them.
---

Tools are the best-known part of MCP, but not the only one. Resources let a server offer data that the application or user can attach to a conversation. Prompts offer reusable templates. Choosing the right primitive keeps tools focused and gives hosts better control over what enters the context.

## What you will learn

- Tools, resources and prompts compared
- Resources: URIs, types and subscriptions
- Prompts: templates the user selects
- Choosing the primitive

## Three primitives

- **Tools** are chosen by the model and perform actions or computations (model-controlled).
- **Resources** are data identified by a URI, such as a file, a database row or a log. The application or user decides what to attach (application-controlled).
- **Prompts** are templates with arguments that the user picks, such as "summarise this incident" (user-controlled).

The split reflects who is in control, which matters for safety and for user experience.

## Resources

A resource has a URI (`tickets://TCK-1042`), a name, a description and a MIME type, and the server returns its content when read. Servers can list resources, offer templates for families of URIs and notify clients when a resource changes. Use resources for read-only, bulk or reference data that users may want to attach, such as documents or schemas, without the model needing to call a tool.

```python
@mcp.resource("tickets://{ticket_id}")
def ticket_resource(ticket_id: str) -> str:
    """Full text of one ticket."""
    return render_ticket(ticket_id)
```

## Prompts

A prompt is a named template with typed arguments that returns messages for the conversation. Hosts may show them as commands. They are good for repeated workflows that you want users to start deliberately.

```python
@mcp.prompt()
def incident_summary(ticket_id: str) -> str:
    return "Summarise ticket " + ticket_id + " for the on-call channel in five bullet points."
```

## Choosing

Ask: does it change something or compute? Tool. Is it data to look at? Resource. Is it a workflow the user starts? Prompt. Not every host supports every primitive, so a server aimed at many hosts often exposes read access as both a resource and a simple read tool. Document what each server offers. Keep descriptions honest, because text from servers enters the model's context.

```predict
Q: Users often want to attach the company style guide to a chat. Tool, resource or prompt?
???
A resource, since it is reference data the user or app attaches; a tool would force the model to fetch it each time.
> Data to attach is a resource.
```

## Incident: Everything was a tool

> **Incident:** A server exposed 40 tools, including one per document, and the model chose badly.

```console
$ python -c "import server; print(len(server.mcp._tool_manager.list_tools()))"
40
$ mcp-inspector list tools | head -4
get_doc_style_guide
get_doc_security_policy
get_doc_onboarding
get_doc_runbook_db
```

Document readers had been written as separate tools, which cluttered the tool list. The team turned the documents into resources under one URI scheme and kept three real tools (search, summarise, create ticket). The model's tool choice improved and users could attach documents themselves.

## Common mistakes

- Making every read a tool
- Assuming all hosts support resources and prompts
- Large resources with no limits
- Dishonest or manipulative descriptions

```quiz
Q: Who controls tools?
+ The model
- The user only :: That is prompts.
- The OS :: No.
- The registry :: No.
> Model-controlled. Re-read the matching lesson section for the full reasoning.

Q: What identifies a resource?
+ A URI
- A colour :: No.
- A password :: No.
- A ticket price :: No.
> For example tickets://TCK-1042. Re-read the matching lesson section for the full reasoning.

Q: What are prompts for?
+ User-selected templates for repeated workflows
- Passwords :: No.
- Network routes :: No.
- Backups :: No.
> User-controlled. Re-read the matching lesson section for the full reasoning.

Q: Which fits attaching a style guide?
+ Resource
- Tool only :: Forces fetching.
- Transport :: No.
- Sampling :: No.
> Data to attach. Re-read the matching lesson section for the full reasoning.
```

```cards
Tools :: model-controlled actions
Resources :: application-controlled data by URI
Prompts :: user-controlled templates
Choose :: action, data, or workflow
Host support :: varies, keep fallbacks
Descriptions :: honest, they enter context
```
