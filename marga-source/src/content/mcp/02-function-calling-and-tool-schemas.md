---
title: Function calling and tool schemas
minutes: 12
summary: Describe a tool to a model with a name, a clear description and a JSON schema, and design tools that models use correctly.
---

The model chooses tools by reading their descriptions and fills in arguments by following their schemas. A tool with a vague name or an unclear schema is used wrongly or not at all. Designing tools is like designing a small API for a very literal user who reads quickly and cannot ask questions.

## What you will learn

- Anatomy of a tool definition
- Write descriptions that guide the choice
- Schemas: types, enums, required fields
- Design a small set of focused tools

## A tool definition

```json
{
  "name": "get_ticket",
  "description": "Fetch one support ticket by its ID. Returns title, status, priority, and the last 5 comments. Use when the user mentions a ticket number like TCK-1042.",
  "input_schema": {
    "type": "object",
    "properties": {
      "ticket_id": {"type": "string", "description": "Ticket ID such as TCK-1042"}
    },
    "required": ["ticket_id"]
  }
}
```

The three parts are a **name**, a **description** and an **input schema** written in JSON Schema. Field names differ slightly between providers, but the idea is the same.

## Descriptions that work

State what the tool does, what it returns, when to use it, and when not to. Mention units, formats and limits. Explain differences between similar tools ("use search_tickets to find tickets by text; use get_ticket when you have an ID"). Descriptions are instructions to the model: write them clearly, in full sentences, and test how often the model picks the right tool.

## Schemas

- Use precise **types**; use **enums** for fixed choices (`"status": {"enum": ["open", "closed"]}`).
- Mark **required** fields and give examples in descriptions.
- Prefer a few clear parameters over a large nested object.
- Validate every call in your code, since the model can send wrong types, extra fields or invalid values.
- Make destructive options explicit, such as a `confirm` argument or a separate tool, so they are not triggered by accident.

```python
from jsonschema import validate

def run_tool(name, args):
    schema = TOOLS[name]["input_schema"]
    validate(args, schema)          # raises if the model sent bad arguments
    return HANDLERS[name](**args)
```

## Small, focused toolset

Give the model the tools it needs and no more. Twenty overlapping tools confuse choice and add tokens. Prefer tools that match user tasks over thin wrappers of every API endpoint. Return concise, relevant results (not a 5,000-line dump) with clear field names and error messages. Name tools with verbs and nouns (`create_ticket`, `list_deployments`). Keep read tools and write tools separate so you can allow one without the other.

```predict
Q: A tool is named "do" and described as "Does things with tickets." What happens and how do you fix it?
???
The model cannot choose it reliably. Split it into focused tools with clear names, descriptions, return values and schemas.
> Specific verbs and nouns.
```

## Incident: The model picked the wrong tool

> **Incident:** An assistant kept calling search_logs when users gave a request ID.

```console
$ jq '.tool_calls[] | {name, input}' trace-318.json
{ "name": "search_logs", "input": { "query": "req-77a1" } }
$ jq '.tools[] | {name, description}' tools.json
{ "name": "search_logs", "description": "Search logs." }
{ "name": "get_request_trace", "description": "Trace." }
```

Both descriptions were too short to tell apart. The team rewrote them: get_request_trace takes a request ID and returns a timeline; search_logs takes free text and a time range. With clear guidance, the right tool was chosen in 28 of 30 test conversations, up from 17.

## Common mistakes

- Vague tool names and descriptions
- Too many overlapping tools
- No validation of arguments
- Returning huge unfiltered results

```quiz
Q: Which three things define a tool?
+ Name, description and input schema
- Price, size, colour :: No.
- Author, date, ID :: No.
- Token, key, secret :: No.
> The model reads these. Re-read the matching lesson section for the full reasoning.

Q: Why use enums?
+ To limit a field to allowed values
- To slow calls :: No.
- To save disk :: No.
- To hide fields :: No.
> Constrain choices. Re-read the matching lesson section for the full reasoning.

Q: Who should validate tool arguments?
+ Your code, every time
- Nobody :: Unsafe.
- The model only :: Not enough.
- The user :: Not practical.
> Never trust arguments. Re-read the matching lesson section for the full reasoning.

Q: What makes a good toolset?
+ Few, focused tools that match user tasks
- Every endpoint as a tool :: Too many.
- One tool that does everything :: Unclear.
- No descriptions :: Unusable.
> Quality over count. Re-read the matching lesson section for the full reasoning.
```

```cards
Tool :: name + description + JSON Schema
Description :: what, returns, when to use, when not
Schema :: types, enums, required
Validate :: every call, in code
Toolset :: small and focused
Results :: concise with clear errors
```
