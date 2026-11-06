---
title: Evaluating and regression testing skills
minutes: 13
summary: Build a small test set for a skill, check triggering and output quality, compare versions and catch regressions before release.
---

Changing one line in a skill can change when it triggers or how it behaves. Without tests you will not know. A small evaluation set makes changes safe and shows whether the skill adds value.

## What you will learn

- Trigger tests: should and should not use the skill
- Output tests with clear grading
- Comparing with and without the skill
- Gating changes on results

## Trigger tests

```yaml
# evals/triggers.yaml
should_trigger:
  - "The checkout API p99 jumped after the deploy, help me triage"
  - "Latency is high on the orders service in prod"
should_not_trigger:
  - "Write a SQL query for monthly revenue"
  - "Explain what a Kubernetes pod is"
```

A good description triggers on the first group and stays quiet on the second. Include near misses, such as a database problem when the skill covers only API services.

## Output tests

```yaml
# evals/tasks.yaml
- id: latency-after-deploy
  prompt: "p99 doubled after the 14:10 deploy of checkout. Triage."
  must:
    - checks rollout history before proposing a change
    - uses read-only commands only
    - asks approval before rollback
  must_not:
    - runs kubectl rollout restart
```

Grade with a checklist, either by a person or by a model with a clear rubric you spot-check. Keep the rubric short, specific and tied to the skill's rules.

## Compare and gate

Run each task with and without the skill, and between the old and new version. Record pass rate, tokens and time.

```bash
python evals/run.py --skill triage-api-latency --version HEAD --out results/head.json
python evals/compare.py results/main.json results/head.json --fail-on-regression
```

Fail the merge on any regression in the must or must-not checks. Add a test every time a real failure is found, so the suite grows from experience.

## Incident: A description edit that triggered everywhere

> **Incident:** A small wording change made a skill load for unrelated requests.

```console
prompt: "Write a SQL query for monthly revenue"
skill loaded: triage-api-latency
expected: no skill
```

Someone broadened the description to include performance in general. The skill then loaded for many unrelated requests. A negative trigger test failed in review and the description was narrowed again.

## Common mistakes

- Only testing prompts that should trigger
- Grading outputs by feel
- Not comparing against no skill
- Fixing failures without adding tests

```quiz
Q: What is a negative trigger test?
+ A prompt that should not load the skill
- A broken script :: No.
- A password :: No.
- A slow test :: No.
> It checks over-triggering.

Q: Why compare with and without the skill?
+ To see whether it adds value
- To waste time :: No.
- To remove tests :: No.
- To change names :: No.
> Measure benefit. The lesson section above explains why.

Q: What gates a merge?
+ No regression in required checks
- Style only :: No.
- Longer descriptions :: No.
- More files :: No.
> Protect behavior. The lesson section above explains why.

Q: When add a new test?
+ After a real failure
- Never :: No.
- Only at release :: No.
- When bored :: No.
> Capture lessons. The lesson section above explains why.
```

```cards
Trigger test :: Checks when a skill loads
Rubric :: Checklist for grading outputs
Regression :: Behavior that was good and became worse
Eval set :: Collection of test prompts and expectations
```
