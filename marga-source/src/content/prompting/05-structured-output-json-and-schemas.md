---
title: Structured output: JSON and schemas
minutes: 12
summary: Get machine-readable answers from a model using clear schemas, tool-based or schema-constrained output, and strict parsing.
---

Programs need fields, not paragraphs. Asking a model for JSON is easy, getting JSON that always parses and always has the right fields takes a little care. There are several methods, from careful prompting to schema-constrained decoding, and whichever you use, your code must still validate what arrives.

## What you will learn

- Ask for a precise schema
- Methods: prompt only, forced tool use, schema-constrained output
- Parse strictly and handle failure
- Design schemas that are easy to get right

## Define the shape

Write the schema first, with allowed values and short descriptions. Then put it in the prompt, or give it to the API through the method it supports.

```json
{
  "type": "object",
  "properties": {
    "category": {"type": "string", "enum": ["billing", "account", "outage", "unknown"]},
    "urgency": {"type": "string", "enum": ["low", "medium", "high"]},
    "summary": {"type": "string", "maxLength": 200}
  },
  "required": ["category", "urgency", "summary"],
  "additionalProperties": false
}
```

## Methods

1. **Prompt only**: describe the JSON and show examples. Works often, and can fail by adding commentary or code fences.
2. **Forced tool use**: define a "tool" whose input schema is your shape and instruct the model to call it; the arguments come back as structured data. Widely used and reliable for many cases.
3. **Schema-constrained output**: some APIs can restrict generation so that the output must match a schema. Check which models and keywords are supported, and test, because constraints differ between providers.
4. **Prefill or stop sequences**: starting the reply with an opening brace can help keep the format on some APIs; check support for your model.

Whatever you choose, keep the schema small and the field names meaningful.

## Parse strictly

```python
import json

def parse(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text.split("\n", 1)[1] if "\n" in text else text
    return json.loads(text)
```

Parse with a real JSON parser, never with regular expressions. Remove code fences if they appear, and reject anything else. Check the stop reason: a reply cut off by length is invalid. Convert the parsed data into a typed object or validate it with a schema library so wrong types fail early.

## Design for success

- Use **enums** for categories, so the answer is one of a known set.
- Add an explicit **"unknown"** or **"none"** value instead of forcing a guess.
- Keep nesting **shallow**; deep, optional-heavy shapes fail more.
- Put **short descriptions** on fields; they act as instructions.
- Avoid asking for exact counts or computed values; compute them in code.
- Version your schema and keep old versions working while consumers update.

```predict
Q: A model returns JSON with a trailing sentence after the closing brace. What are two fixes?
???
Use forced tool use or schema-constrained output; and parse strictly, rejecting or trimming extra text, with a retry.
> Do not rely on a polite format request alone.
```

## Incident: The comma that stopped the pipeline

> **Incident:** An overnight extraction job halted on one invalid JSON line.

```console
$ python extract.py invoices/2026-10-27.txt
json.decoder.JSONDecodeError: Expecting ',' delimiter: line 7 column 3 (char 142)
```

One reply had a missing comma. Without validation or retry the job crashed and 400 invoices waited. The team switched to forced tool use with a schema, added a validator, retried once with the error message, and sent failures to a review queue instead of stopping the batch.

## Common mistakes

- Parsing JSON with regular expressions
- No handling for parse failure
- Free-text fields where an enum would do
- Huge deeply nested schemas

```quiz
Q: Why use enums in a schema?
+ The answer must be one of a known set of values
- To make it longer :: No.
- To hide errors :: No.
- To save money :: Not the reason.
> Constrain choices. Re-read the matching lesson section for the full reasoning.

Q: How do you parse JSON from a model?
+ With a real JSON parser and strict checks
- With regex :: Fragile.
- By eye :: Not code.
- With eval :: Dangerous.
> Never use eval. Re-read the matching lesson section for the full reasoning.

Q: What if the reply was cut off by the length limit?
+ It is invalid; raise the limit or shorten the task
- Parse it anyway :: Fails.
- Ignore :: Silent failure.
- Add commas :: Guessing.
> Check stop_reason. Re-read the matching lesson section for the full reasoning.

Q: What is forced tool use for?
+ Getting arguments that match a schema
- Running shell commands :: Not this.
- Training :: No.
- Caching :: No.
> Structured data via tool schema. Re-read the matching lesson section for the full reasoning.
```

```cards
Schema first :: types, enums, required
Methods :: prompt, forced tool, schema-constrained
Parse :: real parser, strict
Unknown :: give an explicit escape value
Keep :: shallow, versioned schemas
Never :: eval or regex-parse JSON
```
