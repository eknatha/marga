---
title: LLMOps: versioning prompts, models and evaluations
minutes: 12
summary: Run language model applications like software: version prompts and models, test with evaluation sets, monitor cost and quality and release carefully.
---

Classic MLOps manages models you train. LLMOps manages applications built on models you call, where behavior is changed mostly through prompts, retrieval and model selection. The discipline is the same: version, test, release, observe.

## What you will learn

- Prompts as versioned artifacts
- Pinning models and planning upgrades
- Evaluation suites in CI
- Monitoring cost, latency and quality

## Prompts in version control

```yaml
# prompts/ticket_summary/v3.yaml
name: ticket_summary
version: 3
model: claude-sonnet-4-5-20250929
temperature: 0.2
system: |
  You summarize support tickets for engineers. Be factual and brief.
template: |
  Ticket:
  {{ticket_text}}
  Write a summary of at most 3 sentences and list the product area.
```

Store prompts with their model settings, review changes in pull requests and tag releases. Avoid editing prompts only in a vendor console where history is lost.

## Pin and upgrade

Use specific model versions instead of moving aliases. When a new model appears, run the evaluation suite, compare quality and cost and roll out gradually.

## Evaluate in CI

```bash
python evals/run.py --prompt prompts/ticket_summary/v3.yaml --cases evals/tickets.jsonl --out results.json
python evals/check.py results.json --min-score 0.85 --max-cost-per-1k 4.00
```

Cases come from real examples. Combine exact checks (valid JSON, required fields), rule checks (no personal data) and graded checks for quality. Fail the pipeline on regression.

## Observe

Record per request: prompt version, model version, input and output tokens, latency, cost, tool calls and user feedback, with sensitive data redacted. Alert on cost per request, error rate and format failures. Add failing real cases to the evaluation set, so the suite improves with experience.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How LLMOps: versioning prompts, models and evaluations fits together
node: n1 | Prompts in version control | 0 | 0 | Store prompts with their model settings, review changes in pull requests and tag releases. | Prompts edited in consoles without history. | process
node: n2 | Pin and upgrade | 1 | 1 | Use specific model versions instead of moving aliases. | Using moving model aliases in production. | process
node: n3 | Evaluate in CI | 2 | 0 | Cases come from real examples. Combine exact checks (valid JSON, required fields), rule checks (no personal data) and graded checks for quality. | Not tracking cost per request. | process
node: n4 | Observe | 3 | 1 | Record per request: prompt version, model version, input and output tokens, latency, cost, tool calls and user feedback, with sensitive data redacted. | No evaluation set. | observe
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The alias that changed

> **Incident:** A model alias moved to a new version and broke JSON parsing.

```console
model: provider-latest
output now starts with "Sure, here is the JSON:"
parser error rate: 0% to 17%
```

The team used an alias for convenience, and the provider updated it. The new version added a polite preface before the JSON. They pinned an exact model version, added a format check to evaluations and scheduled upgrades with testing.

## Common mistakes

- Using moving model aliases in production
- Prompts edited in consoles without history
- No evaluation set
- Not tracking cost per request

```quiz
Q: Why pin model versions?
+ Behavior should not change unexpectedly
- They are cheaper :: No.
- They are faster :: No.
- They remove prompts :: No.
> Upgrades should be planned.

Q: Where store prompts?
+ Version control with review
- A chat window :: No.
- An email :: No.
- A spreadsheet only :: No.
> They are code. The lesson section above explains why.

Q: What gates a prompt change?
+ Evaluation results
- Opinions :: No.
- Prompt length :: No.
- Colour :: No.
> Test before release.

Q: What should be logged per request?
+ Versions, tokens, latency and cost
- Passwords :: No.
- Nothing :: No.
- Only success :: No.
> Needed for diagnosis.
```

```cards
Prompt version :: A tracked revision of a prompt
Model pinning :: Using an exact model version
Evaluation suite :: Tests of quality for a prompt or model
LLMOps :: Operating applications built on language models
```
