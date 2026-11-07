---
title: LLM assistants for incident response
minutes: 12
summary: Use language models to summarize incidents, draft updates and search runbooks, with guardrails for accuracy, privacy and human approval.
---

During an incident, people read too much and write too little. Language models are good at turning a wall of text into a summary, and at drafting updates, which frees humans to think. They are bad at being right without evidence.

## What you will learn

- Safe uses: summaries, timelines, drafts and search
- Grounding answers in your runbooks and data
- Privacy, redaction and access control
- Human approval and review

## Good tasks

- Summarize a long chat or log excerpt into a few lines.
- Draft a **timeline** from alerts, deploys and messages.
- Draft **stakeholder updates** for an engineer to edit and send.
- Search runbooks and past incidents for similar cases.
- Write the first draft of a **postmortem** from the timeline.

## Ground the answers

```python
def answer(question, search, llm):
    docs = search(question, top_k=5)          # runbooks, past incidents, service docs
    context = "\n\n".join(f"[{d.id}] {d.text}" for d in docs)
    prompt = (
        "Answer only from the context. Cite ids like [runbook-12]. "
        "If the answer is not there, say you do not know.\n\n"
        f"Context:\n{context}\n\nQuestion: {question}"
    )
    return llm(prompt)
```

Require citations and refuse answers without sources. Show the source text next to the answer so a person can verify in seconds.

## Privacy

Redact secrets, tokens and personal data before sending text to a model, use an approved provider with the right data terms and limit which channels the assistant can read. Keep an audit log of prompts and responses.

## Keep humans in charge

The assistant **suggests**, the engineer **decides**. Never let it run commands, change configuration or page people without explicit approval. Measure usefulness with feedback buttons and review wrong answers in the postmortem, since they teach you where grounding is weak.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How LLM assistants for incident response fits together
node: n1 | Good tasks | 0 | 0 | Summarize a long chat or log excerpt into a few lines. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n2 | Ground the answers | 1 | 1 | Require citations and refuse answers without sources. | Answers without cited sources. | process
node: n3 | Privacy | 2 | 0 | Redact secrets, tokens and personal data before sending text to a model, use an approved provider with the right data terms and limit which channels the assistant can... | Sending secrets or customer data to a model. | process
node: n4 | Keep humans in charge | 3 | 1 | The assistant suggests, the engineer decides. | Not reviewing wrong answers. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The command that did not exist

> **Incident:** An assistant suggested a made-up flag during an outage.

```console
$ dbctl failover --force-safe
error: unknown flag: --force-safe
elapsed: 6 minutes lost to the wrong suggestion
```

The assistant answered from general knowledge instead of the team's tools. The engineer noticed, but time was lost. The team connected it to the real runbooks, required citations and made it say it did not know when nothing matched.

## Common mistakes

- Letting a model run commands unsupervised
- Answers without cited sources
- Sending secrets or customer data to a model
- Not reviewing wrong answers

```quiz
Q: What should an incident assistant cite?
+ Runbook or incident sources
- Nothing :: No.
- Random web pages :: No.
- Its own memory :: No.
> Sources allow verification.

Q: Who decides actions?
+ The engineer
- The model :: No.
- No one :: No.
- A script alone :: No.
> Humans stay accountable.

Q: What should happen before sending text to a model?
+ Redact secrets and personal data
- Add more logs :: No.
- Remove citations :: No.
- Disable audit :: No.
> Protect sensitive data.

Q: What good task suits an assistant?
+ Drafting a timeline
- Changing production alone :: No.
- Deleting backups :: No.
- Approving access :: No.
> Low-risk text work. The lesson section above explains why.
```

```cards
Grounding :: Basing answers on retrieved evidence
Hallucination :: A confident but false model output
Redaction :: Removing sensitive values before use
Human in the loop :: A person approves important actions
```
