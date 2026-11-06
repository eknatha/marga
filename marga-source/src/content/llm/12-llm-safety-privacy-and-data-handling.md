---
title: LLM safety, privacy and data handling
minutes: 13
summary: Handle data safely in language model applications: redact personal data, control retention, defend against prompt injection and log responsibly.
---

Language model applications mix untrusted text, private data and powerful tools. Most incidents come from a few predictable mistakes: sending too much, logging too much and trusting text that came from outside.

## What you will learn

- Classifying and redacting data before it reaches a model
- Provider settings: retention, training and region
- Prompt injection and untrusted content
- Safe logging and output handling

## Data in prompts

Decide which classes of data may go to which provider. Redact secrets, tokens and personal identifiers before sending, replacing them with placeholders and restoring them afterwards if needed.

```python
import re

PATTERNS = {
    "email": re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"),
    "token": re.compile(r"\b(?:sk|ghp|AKIA)[A-Za-z0-9_-]{16,}\b"),
}

def redact(text):
    for name, rx in PATTERNS.items():
        text = rx.sub(f"[{name.upper()}]", text)
    return text
```

## Provider and retention

Check contract terms: whether inputs are used for training, how long they are retained, where they are processed and what audit options exist. Use zero or short retention for sensitive workloads and keep a record of approved providers.

## Prompt injection

Text from emails, web pages and documents can contain instructions that try to hijack the model. Treat all such content as **data, not commands**: put it in a delimited section, tell the model not to follow instructions inside it, and, more importantly, limit what the application can do. If a model reads untrusted text, do not give it the ability to send email, move money or read secrets without a human approval step.

## Logging and outputs

Logs help debugging and can leak data. Redact before logging, restrict access and set retention. Validate model output before using it: escape it before displaying, check JSON against a schema and never execute generated code or SQL without review and sandboxing.

## Incident: Customer emails in the debug logs

> **Incident:** Prompt logging stored private data with weak access controls.

```console
log: prompt="Hi, my card 4111 1111 1111 1111 declined, call 555-0143"
retention: unlimited
readers: all engineering (412 people)
```

The debug logging was enabled to improve prompts and was never reviewed. Logs held card numbers and phone numbers. The team redacted before logging, limited access to a small group, set a 14-day retention and added data checks to code review.

## Common mistakes

- Logging full prompts forever
- Giving a model that reads untrusted text powerful tools
- Skipping provider retention checks
- Using output without validation

```quiz
Q: What is prompt injection?
+ Untrusted text trying to give the model instructions
- A faster model :: No.
- A cache :: No.
- A network fault :: No.
> Treat content as data.

Q: What reduces injection impact most?
+ Limiting what the app can do
- A longer prompt :: No.
- A bigger model :: No.
- More logs :: No.
> Capabilities limit harm.

Q: What should happen before logging prompts?
+ Redact sensitive data
- Add more data :: No.
- Share widely :: No.
- Disable access control :: No.
> Logs are a copy of data.

Q: How treat generated SQL or code?
+ As untrusted until reviewed and sandboxed
- Run immediately :: No.
- Trust it :: No.
- Hide it :: No.
> Outputs can be wrong or unsafe.
```

```cards
Prompt injection :: Hijacking a model with instructions in input data
Redaction :: Removing sensitive data from text
Retention :: How long data is kept
Data classification :: Labeling data by sensitivity
```
