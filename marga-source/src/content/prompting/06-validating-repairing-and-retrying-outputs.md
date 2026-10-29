---
title: Validating, repairing and retrying outputs
minutes: 12
summary: Check model output with code, retry with feedback, repair what is safe to repair, and send the rest to a human.
---

Even a well-written prompt returns a bad answer sometimes. A reliable system does not hope otherwise. It checks every output, retries when a retry is likely to help, repairs only what is safe to repair, and has a fallback. This is ordinary defensive programming applied to a source that is occasionally wrong.

## What you will learn

- Layers of validation: syntax, schema, rules, meaning
- Retry with the error message
- Fallbacks and human review
- Limits: retries, cost, loops

## Four layers

1. **Syntax**: does it parse?
2. **Schema**: are required fields present, types right, values in the allowed set?
3. **Rules**: business checks, such as a refund below a limit, a date in the future, an ID that exists in your database.
4. **Meaning**: is it faithful to the source? For example, every quoted sentence must appear in the input; every cited document must be one you provided.

The first three are code. The fourth uses code where possible (string matching, database lookups) and a model-based or human check where not.

## Retry with feedback

```python
for attempt in range(3):
    reply = call_model(prompt, feedback)
    try:
        data = parse(reply)
        validate(data)
        return data
    except (ValueError, KeyError) as err:
        feedback = "Your previous answer was rejected: " + str(err) + ". Return only valid JSON."
raise RuntimeError("model output failed validation 3 times")
```

Tell the model what was wrong. Limit retries (two or three), because each costs money and a model that fails three times usually needs a different prompt, not a fourth try. Log every failure with the reason so you can see patterns.

## Repair carefully

Some fixes are safe: trimming whitespace, removing a code fence, converting "Yes" to true for a field defined that way. Others are not: guessing a missing amount, correcting a date, inventing an ID. If a repair could change the meaning, do not do it silently. Reject and retry or ask a person.

## Fallbacks

Decide in advance what happens when validation keeps failing: use a default, route to a review queue, show "we could not process this" to the user, or switch to a rule-based path. Alert on the failure rate; a rising rate is an early sign of a changed model, data or prompt. For actions with side effects (sending email, changing records), require a successful validation and, for risky ones, human approval.

```predict
Q: A model proposes a refund amount of 5,000 dollars; your rule limit is 200. What should the system do?
???
Reject it by rule, do not retry blindly, and route to human approval or a safe default.
> Business rules are code.
```

## Incident: The invoice with a made-up total

> **Incident:** An extraction pipeline stored totals that did not match the line items.

```console
$ python audit.py --day 2026-10-26
invoices=412 total_mismatch=17 (sum of lines != total)
```

The model sometimes wrote a plausible total instead of adding the lines. The pipeline gained a code check that sums the line items and compares them with the total, retries once with the difference, and routes the rest to review. Mismatches fell to zero in stored data, and review volume was small.

## Common mistakes

- Trusting output because it parsed
- Unlimited retries
- Silent repairs that change meaning
- No fallback path

```quiz
Q: Which is a business-rule check?
+ Refund amount is below the limit
- JSON has braces :: Syntax.
- Reply is polite :: Not a rule.
- Text is long :: Not a rule.
> Rules in code. Re-read the matching lesson section for the full reasoning.

Q: What should a retry include?
+ The reason the previous answer was rejected
- Nothing :: Less effective.
- A louder prompt :: No.
- A random seed :: No.
> Feedback. Re-read the matching lesson section for the full reasoning.

Q: Why cap retries?
+ Each retry costs money and repeated failure needs a prompt fix
- To save disk :: No.
- It is required by law :: No.
- To slow the system :: No.
> Two or three. Re-read the matching lesson section for the full reasoning.

Q: When is a repair unsafe?
+ When it could change the meaning, such as guessing a missing amount
- Trimming whitespace :: Safe.
- Removing a code fence :: Safe.
- Lowercasing an enum :: Usually safe.
> Do not guess data. Re-read the matching lesson section for the full reasoning.
```

```cards
Validate :: syntax, schema, rules, meaning
Retry :: with the error, max 2 or 3
Repair :: only meaning-preserving fixes
Fallback :: default, review queue, rule path
Side effects :: validate first, approve if risky
Monitor :: failure rate
```
