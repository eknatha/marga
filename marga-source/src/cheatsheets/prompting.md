---
title: Prompting and structured output
summary: Prompt structure, examples, reasoning patterns, system prompts, JSON schemas, validation, retries and versioning.
module: prompting
---

## Prompt template

```text
You are helping {{audience}}.
Task: {{one clear instruction}}.
Rules:
- at most 3 sentences
- if the answer is not in <documents>, say "not stated"
<documents>{{material}}</documents>
<question>{{question}}</question>
Return JSON: {"answer": "...", "source": "..."}
```

> **Warning:** Replace adjectives with limits. "Be brief" varies; "at most three sentences" does not.

## Few-shot examples

```text
<example>
<ticket>I was charged twice</ticket>
<answer>{"category": "billing"}</answer>
</example>
```

Use 3 to 5 varied, realistic examples with identical format, including a borderline case and an "unknown" case.

> **Warning:** Do not reuse your test cases as examples, and do not let examples contradict your rules. The model follows examples.

## Reasoning

```text
Think step by step inside <thinking> tags.
Then give the final result in <answer> tags.
```

```python
import re
m = re.search(r"<answer>(.*?)</answer>", reply, re.S)
answer = m.group(1).strip()
```

> **Warning:** Never show raw reasoning to users or treat an explanation as proof. Verify with code or a person.

## System prompt layout

```text
<role>...</role>
<rules>...</rules>
<documents>...</documents>
<question>...</question>
```

Long documents first, question last. Keep tag names consistent.

> **Warning:** Do not put secrets in a system prompt. Assume users can make the model repeat it.

## JSON schema

```json
{"type": "object",
 "properties": {"category": {"type": "string", "enum": ["billing", "account", "unknown"]}},
 "required": ["category"], "additionalProperties": false}
```

Methods: prompt only, forced tool use, schema-constrained output. Use enums and an explicit unknown value.

## Validate and retry

```python
for attempt in range(3):
    reply = call_model(prompt, feedback)
    try:
        data = json.loads(reply)
        validate(data, SCHEMA)
        return data
    except Exception as err:
        feedback = "Rejected: " + str(err)
raise RuntimeError("failed validation")
```

> **Warning:** Cap retries. A model that fails three times needs a changed prompt, not a fourth try. Never repair data by guessing.

## Version and test

```text
prompts/triage/v7.txt     # changed: added unknown category
```

Run the evaluation set in CI, pin the model version, log the prompt version with each request, and release gradually.

## Debug

```bash
python run_evals.py --case pii-014 --runs 10
```

Reproduce, reduce the prompt, change one thing, re-run the whole set, and add the case to the tests.
