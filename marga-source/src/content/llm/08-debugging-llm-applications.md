---
title: Debugging LLM applications
minutes: 14
summary: Investigate a bad answer step by step: capture the exact input, separate retrieval, prompt, model and parsing problems, and fix with tests.
---

When an LLM feature misbehaves there is no stack trace. The system is probabilistic and the failure may be in retrieval, the prompt, the model, the limits or the code around it. A fixed order of checks finds the cause quickly and turns each incident into a permanent test.

## What you will learn

- Capture the exact request and response
- Check limits, stop reasons and errors
- Separate retrieval, prompt, model and parsing problems
- Reproduce, fix and add a regression test

## Capture everything

You cannot debug what you cannot see. For every request, log the request ID, model and version, the full assembled prompt (with personal data protected), parameters, retrieved passages, tool calls and results, the raw reply, the stop reason, token counts and latency. Store them for a limited time with access controls. A trace that connects one user report to one stored request is worth more than any guess.

## First checks

```bash
jq '{id, model, stop_reason, usage, error}' logs/llm/2026-10-28/req-8f31.json
jq -r '.prompt' logs/llm/2026-10-28/req-8f31.json | head -60
jq -r '.reply' logs/llm/2026-10-28/req-8f31.json
```

Look for: an error or a **429/529**; **stop_reason** other than a normal end (cut off by length); the **model version** changed; the prompt contains stale or missing text; a very large input that pushed out instructions; the reply that is valid text but fails your parser.

## Which layer failed?

- **Retrieval or context**: is the needed fact in the prompt? If not, fix search, chunking or the data. The model cannot use what it never saw.
- **Prompt**: is the instruction clear, are examples consistent, do two rules conflict? Try the same input with a simplified prompt.
- **Model**: with the right facts and a clear prompt, does it still fail? Try a stronger model or break the task into steps.
- **Parsing and code**: is the output valid but your code mishandles it, for example by assuming the first content block is text?
- **Environment**: did a tool fail silently, or return an error that the model had to guess around?

## Fix and lock it in

Reproduce with the stored request, change one thing, and re-run. Then add the case to the evaluation set with the expected behaviour, so it cannot return unnoticed. Compare the new pass rate with the old on the whole set, not only on the case you fixed. Record the cause in your runbook: most incidents repeat. Add monitors for the signals that would have caught this earlier, such as parse-failure rate, empty-answer rate, refusal rate, token growth and user thumbs-down rate.

```predict
Q: A support bot suddenly says "I don't have that information" for questions it answered yesterday. Which layer do you check first?
???
Retrieval and context: check whether the relevant document is still being found and included, before blaming the model.
> Is the fact in the prompt?
```

## Incident: The bot that stopped finding the policy

> **Incident:** After a documentation update, a support assistant began refusing policy questions.

```console
$ jq '{retrieved: [.retrieved[].source], stop_reason}' req-1204.json
{ "retrieved": ["blog/holiday-hours.md", "faq/shipping.md"], "stop_reason": "end_turn" }
$ jq '.retrieved[].source' req-0711-last-week.json
"policies/returns-v3.md"
```

The reindexing job had skipped the policies folder after a path change, so the returns policy was never retrieved and the model correctly said it did not know. The index was rebuilt, a monitor was added for documents that are not found for known test questions, and those questions became part of the nightly evaluation.

## Common mistakes

- Blaming the model before checking the prompt contents
- Not logging the assembled prompt
- Fixing one case without a regression test
- Changing several things at once

```quiz
Q: What should you check first for a bad answer?
+ The exact assembled input and the stop reason
- The CEO :: No.
- The weather :: No.
- The keyboard :: No.
> See what the model saw. Re-read the matching lesson section for the full reasoning.

Q: The needed fact is absent from the prompt. Whose problem is it?
+ Retrieval or context assembly
- The tokenizer :: No.
- The GPU :: No.
- The user :: No.
> The model cannot use unseen facts. Re-read the matching lesson section for the full reasoning.

Q: What do you do after fixing a failure?
+ Add it to the evaluation set
- Delete the logs :: Loses evidence.
- Nothing :: It may return.
- Raise temperature :: Unrelated.
> Regression test. Re-read the matching lesson section for the full reasoning.

Q: Which signal can warn you early?
+ Parse-failure or refusal rate rising
- Office temperature :: No.
- Number of tabs :: No.
- Screen brightness :: No.
> Monitor quality signals. Re-read the matching lesson section for the full reasoning.
```

```cards
Log :: request ID, model, full prompt, reply, stop reason
Check :: errors, limits, model version
Layers :: retrieval, prompt, model, parsing
Reproduce :: from the stored request
Fix :: one change at a time
Lock in :: add to the evaluation set
```
