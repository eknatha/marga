---
title: Scripts and deterministic steps
minutes: 13
summary: Use bundled scripts for exact work, write them so Claude can run and read their output, and keep them safe to run.
---

Language models are good at judgement and weak at exactness. A skill can include scripts for the exact parts: validating a file, converting a format, computing a total, checking a plan. The model decides when to run them and reads their output. This gives you the reliability of code with the flexibility of language.

## What you will learn

- What to put in a script and what to leave to the model
- Write scripts that give clear, small output
- Safety: least privilege and no surprises
- Make scripts testable on their own

## Split the work

Give scripts the jobs where exactness matters: parse and validate a file against a rule, count or sum, call a documented internal API, convert formats, lint a configuration. Leave to the model the jobs that need judgement: choosing what to emphasise, wording, deciding which findings matter. The skill's instructions say when to run which script and what to do with the result.

## A good script

```python
#!/usr/bin/env python3
"""Check an incident summary: length, required sections, no names of people.
Usage: python check_summary.py summary.md"""
import re
import sys

REQUIRED = ["What happened", "Impact", "Status"]

def main(path):
    text = open(path, encoding="utf-8").read()
    problems = []
    for head in REQUIRED:
        if head.lower() not in text.lower():
            problems.append("missing section: " + head)
    if len(text.split()) > 300:
        problems.append("over 300 words")
    if re.search(r"\bblame\b", text, re.I):
        problems.append("contains blame language")
    print("OK" if not problems else "\n".join(problems))
    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
```

It has a docstring with usage, prints short readable output, and returns a non-zero exit code on failure. Output should name the problem and where it is, so the model can fix it.

## Safe scripts

Scripts run with whatever access the environment gives them. Keep them read-only unless the task needs writes. Never print or store secrets. Do not download and run code at run time. Avoid destructive commands; if a step deletes or overwrites, require explicit confirmation in the instructions. List the libraries a script needs, and prefer the standard library. Review third-party scripts line by line before you trust them.

## Test them

Run scripts by hand with good and bad inputs, and add unit tests in the skill folder. Put sample inputs in `examples/`. Make error messages clear. When you change a script, re-run the skill test requests too. A script that fails with a stack trace teaches the model nothing; a script that says "line 12: missing required field owner" lets it fix the problem on its own.

```predict
Q: A skill asks the model to add up 40 invoice lines. What is the better design?
???
A script that sums the lines and returns the total, with the model using the result in the summary.
> Use code for exact work.
```

## Incident: The total that did not add up

> **Incident:** A reporting skill computed monthly totals in the model's head.

```console
$ python scripts/total.py data/oct.csv
183,402.55
$ cat report-oct.md | grep Total
Total spend: 183,042.55
```

Digits were transposed in the generated report. The skill was changed so that total.py computes every figure, the instructions tell the model to copy numbers only from the script output, and a check compares the numbers in the report with the script's output.

## Common mistakes

- Letting the model do arithmetic
- Scripts with huge or cryptic output
- Scripts that write or delete without warning
- Untested scripts

```quiz
Q: Which job belongs in a script?
+ Summing a column of numbers
- Choosing a friendly tone :: Judgement.
- Deciding what matters :: Judgement.
- Brainstorming :: Judgement.
> Exact work. Re-read the matching lesson section for the full reasoning.

Q: What makes script output useful to the model?
+ Short, specific messages saying what is wrong and where
- A stack trace only :: Hard to act on.
- Silence :: Useless.
- Colour codes :: Noise.
> Actionable output. Re-read the matching lesson section for the full reasoning.

Q: What is a safe default for scripts?
+ Read-only unless a write is needed and confirmed
- Delete first :: Dangerous.
- Download and run code :: Dangerous.
- Print secrets :: Dangerous.
> Least privilege. Re-read the matching lesson section for the full reasoning.

Q: How do you check a script works?
+ Run it with good and bad inputs and add tests
- Never run it :: Risky.
- Trust the author :: Risky.
- Read it once :: Not enough.
> Test it alone. Re-read the matching lesson section for the full reasoning.
```

```cards
Scripts for :: exact work
Model for :: judgement and wording
Output :: short, specific, exit code
Safe :: read-only, no secrets, no downloads
Test :: good and bad inputs
Document :: usage in a docstring
```
