---
title: Testing and evaluating a skill
minutes: 13
summary: Test triggering, output quality and cost with a fixed set of tasks, compare with and without the skill, and keep results over time.
---

A skill you have not tested is a guess. Fortunately a skill is easy to test: a list of requests, the expected behaviour, and a way to compare runs. Testing shows whether the skill triggers, whether the output is better than without it, and whether an edit helped or hurt.

## What you will learn

- Three things to test: triggering, correctness, cost
- Build a task set with expected results
- Compare with and without the skill
- Track changes over time and re-test on updates

## What to test

1. **Triggering**: does the skill load for the requests it should, and stay out of the way for the rest?
2. **Output quality**: does the result follow your template and rules, and is it correct?
3. **Cost and speed**: how many tokens and how much time does it add? A skill that doubles tokens for a tiny gain may not be worth it.

Test in the same product and model setting your users have, since behaviour can differ.

## The task set

Write 10 to 20 realistic tasks. For each, write what a good result looks like as a checklist: required sections, forbidden content, specific facts that must appear. Include easy, typical, and awkward cases, an input in a different style, and requests that should not trigger the skill.

```text
Task 7: "Here are my notes from last night's outage. Write it up."
Expect: uses the incident template; has What happened, Impact, Status;
        under 300 words; says "not stated" where notes are silent; no blame.
Task 12: "What does a 502 mean?"
Expect: skill NOT used (general question).
```

## With and without

Run each task twice, once with the skill disabled and once enabled. Compare against your checklist. If the base model already passes most tasks, the skill adds little; trim it or reconsider. If the skill fixes failures that matter, you have evidence. Read outputs yourself; automatic checks (a script that verifies sections, a grader model with a rubric) help at scale, but check them against your own judgement.

## Iterate and keep records

Change one thing per iteration (the description, a rule, an example, a script). Re-run the whole set, not only the failing task. Save results with the skill version and date, in a table or file in the repository. Re-test when the model, the product or the underlying documents change. Ask users for failures, add each to the set, and fix them. Over time the task set becomes your regression suite.

```predict
Q: After tuning your skill on 5 tasks, results look great. Why might it still disappoint users?
???
Five tuned tasks may not represent real use. Test on a broader, held-out set including awkward and non-triggering requests.
> Do not overfit to your examples.
```

## Incident: It worked on my five

> **Incident:** A skill passed every demo task but failed with real notes from other teams.

```console
$ python run_skill_tests.py --skill incident-summary
smoke (5 tasks): 5/5
full (24 tasks): 15/24   failures: notes_in_bullets(5), non_english(3), no_timestamps(1)
```

The demo notes were all neatly formatted paragraphs. Real notes arrived as bullet lists, in other languages, and without timestamps. The team added those cases, adjusted the instructions about missing data, and raised the pass rate to 22 of 24 before release.

## Common mistakes

- Testing only on tuned examples
- Not comparing with the skill disabled
- Changing several things at once
- Never re-testing after model updates

Practice: open the [skill-writing lab](#/skill-lab) to write or fix a SKILL.md and have it checked in your browser.

```quiz
Q: What three things should you test about a skill?
+ Triggering, output quality, cost
- Colour, font, size :: No.
- Name, date, author :: No.
- Speed only :: Incomplete.
> All three. Re-read the matching lesson section for the full reasoning.

Q: Why run tasks with the skill disabled?
+ To see whether the skill really adds value
- To waste time :: No.
- To pass tests :: No.
- To hide bugs :: No.
> A baseline. Re-read the matching lesson section for the full reasoning.

Q: Which tasks belong in the set?
+ Typical, awkward and non-triggering requests
- Only the easy ones :: Biased.
- Only the author's :: Biased.
- None :: Untested.
> Cover the spread. Re-read the matching lesson section for the full reasoning.

Q: When should you re-test?
+ After changes to the skill, model, product or source documents
- Never :: Regressions.
- Only once a year :: Too late.
- Only when asked :: Too late.
> Keep regressions out. Re-read the matching lesson section for the full reasoning.
```

```cards
Test :: triggering, quality, cost
Task set :: 10 to 20 realistic tasks with checklists
Baseline :: with and without the skill
Iterate :: one change at a time
Record :: version, date, results
Re-test :: on any change
```
