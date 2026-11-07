---
title: Evaluating prompts with datasets
minutes: 12
summary: Build a small labeled test set, define pass criteria, compare prompt versions and use automated graders carefully.
---

Prompts feel easy to change and hard to judge. Without examples, every improvement is a guess, and fixes in one place hide damage in another. A dataset makes the effect of each change visible.

## What you will learn

- Building a test set from real inputs
- Exact checks, rubrics and model graders
- Comparing versions on quality, cost and latency
- Growing the set from failures

## The dataset

```text
{"id": "t-014", "input": "Customer cannot log in after password reset", "expected": {"category": "auth", "priority": "high"}}
{"id": "t-027", "input": "How do I export invoices?", "expected": {"category": "billing", "priority": "low"}}
{"id": "t-031", "input": "ASAP!!! site is down for everyone", "expected": {"category": "outage", "priority": "critical"}}
```

Collect real inputs, including awkward and rare ones. Thirty to a hundred good examples are more useful than thousands of artificial ones. Remove personal data.

## Checks

```python
import json

def grade(output, expected):
    try:
        data = json.loads(output)
    except ValueError:
        return 0.0                         # invalid format fails
    ok_cat = data.get("category") == expected["category"]
    ok_pri = data.get("priority") == expected["priority"]
    return (ok_cat + ok_pri) / 2
```

Use **exact checks** where answers are structured, **rules** for constraints such as length, and a **rubric** for open text. A **model grader** can apply a rubric at scale, but test it against human judgments on a sample, because graders have biases.

## Compare

```bash
python evals/run.py --prompt v4 --cases evals/tickets.jsonl --out v4.json
python evals/compare.py v3.json v4.json
```

Report accuracy, format validity, cost and latency per version. Look at which cases changed, not only the average. Keep the test set out of the prompt examples so you do not memorize it.

## Grow

Every production failure becomes a new test case. Review the set regularly and record why each case exists.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Evaluating prompts with datasets fits together
node: n1 | The dataset | 0 | 0 | Collect real inputs, including awkward and rare ones. | Judging a prompt by a few examples. | store
node: n2 | Checks | 1 | 1 | Use exact checks where answers are structured, rules for constraints such as length, and a rubric for open text. | Trusting model graders without checking them. | observe
node: n3 | Compare | 2 | 0 | Report accuracy, format validity, cost and latency per version. | Using the test examples inside the prompt. | process
node: n4 | Grow | 3 | 1 | Every production failure becomes a new test case. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: One fix, three regressions

> **Incident:** A prompt change fixed one complaint and broke other cases.

```console
v5 vs v4
t-027  pass -> fail
t-031  pass -> fail
json format errors: 0 -> 4
```

The new wording made the model chatty and it added text around the JSON. The set showed the regressions the same day. The team fixed the prompt, added a format check to the evaluation and kept the old version until results improved.

## Common mistakes

- Judging a prompt by a few examples
- Using the test examples inside the prompt
- Trusting model graders without checking them
- Never adding failures to the set

```quiz
Q: How many examples start a useful set?
+ Tens of real examples
- One :: No.
- Millions :: No.
- None :: No.
> Real and varied matters.

Q: Why spot-check model graders?
+ They can be biased or wrong
- They are perfect :: No.
- They are slow :: No.
- They are free :: No.
> Compare with human labels.

Q: What should failures become?
+ New test cases
- Nothing :: No.
- Prompt text :: No.
- Secrets :: No.
> Regression tests. The lesson section above explains why.

Q: What to compare across versions?
+ Quality, cost and latency
- Only length :: No.
- Only cost :: No.
- Colour :: No.
> Trade-offs matter. The lesson section above explains why.
```

```cards
Test set :: Labeled examples used for evaluation
Rubric :: Criteria for grading open answers
Model grader :: A model that scores outputs
Regression :: A case that worked and now fails
```
