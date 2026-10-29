---
title: Debugging bad prompts and outputs
minutes: 14
summary: Investigate wrong, inconsistent or unsafe outputs: simplify, isolate, compare and fix with evidence.
---

When a prompt fails, rewriting it at random wastes days. A methodical approach finds the cause: reproduce with the exact input, reduce the prompt to the smallest version that still fails, test one change at a time, and measure on the whole set before declaring victory.

## What you will learn

- Reproduce with the exact stored input
- Reduce and isolate: find which part causes it
- Common failure patterns and their fixes
- Measure the fix and prevent regressions

## Reproduce

Take the stored request: the full prompt, parameters and model version. Run it several times to learn how often it fails. A failure that happens 1 time in 20 needs a different approach from one that happens every time. Save the failing input as a test case before you change anything.

## Reduce and isolate

Remove parts of the prompt until the failure disappears, then put the last removed part back. Swap the model for a larger one: if it passes, the task may be too hard for the smaller model or needs more guidance. Put the input in a minimal prompt with only the task: if it passes, something in your long prompt interferes, such as two conflicting rules or an example that contradicts an instruction. Try the same input with different formatting of tags.

## Patterns and fixes

- **Ignores a rule**: the rule is buried or conflicts with an example. Move it, state it once, give the reason, align the examples.
- **Too long or too short**: add a measurable limit.
- **Invents facts**: supply the source text, allow "not stated", ask for quotes.
- **Wrong format sometimes**: use a schema method and validation; add a retry.
- **Inconsistent between runs**: lower temperature, add examples, constrain choices.
- **Follows instructions inside the data**: mark as untrusted data and limit what the model can do.
- **Fine in tests, bad in production**: the production inputs differ; add real samples to the test set.

## Prove the fix

Change one thing, then run the full evaluation set several times and compare with the baseline, looking at the target failure and for new ones. Keep a note of what you tried: which changes helped, which did not. Add the original failure and its variations as permanent tests. If a fix works only by making the prompt very long or fragile, consider splitting the task into steps.

```predict
Q: A prompt works on your 5 test cases but fails on 1 in 10 production inputs. What is the most useful first step?
???
Collect the failing production inputs, add them to the evaluation set, and look for what they have in common.
> Test sets must look like production.
```

## Incident: The rule that was ignored

> **Incident:** A summariser kept including customer email addresses despite a rule against it.

```console
$ python run_evals.py --case pii-014 --runs 10
failures: 4/10   reply contains: maria.k@example.com
$ grep -n "email" prompts/summary/v3.txt
12: Never include email addresses.
40: <example><answer>Contact maria.k@example.com ...</answer></example>
```

An example near the end contradicted the rule at line 12, and the model followed the example. Replacing the example with one that masks addresses fixed the problem. A code check was also added to scrub email patterns from the output, because a prompt rule alone is not a guarantee.

## Common mistakes

- Rewriting everything at once
- Fixing only the failing case
- Contradicting rules in examples
- Relying on a prompt rule for a safety requirement

```quiz
Q: What is the first step when a prompt fails?
+ Reproduce with the exact stored input and save it as a test
- Rewrite it :: Blind.
- Blame the model :: Premature.
- Add capital letters :: Rarely helps.
> Evidence first. Re-read the matching lesson section for the full reasoning.

Q: Why reduce the prompt?
+ To find which part causes the failure
- To save paper :: No.
- To hide it :: No.
- To change the model :: No.
> Isolate the cause. Re-read the matching lesson section for the full reasoning.

Q: A rule is ignored. A common cause is:
+ An example or another rule contradicts it
- The GPU :: No.
- The date :: No.
- The font :: No.
> Align examples. Re-read the matching lesson section for the full reasoning.

Q: How do you protect a safety requirement?
+ Add code checks in addition to prompt rules
- Only capitals :: Not a control.
- Only please :: Not a control.
- Nothing :: Risky.
> Defence in depth. Re-read the matching lesson section for the full reasoning.
```

```cards
Reproduce :: exact input, run several times
Isolate :: remove parts, swap model
Typical causes :: conflict, buried rule, missing source
Fix :: one change at a time
Measure :: full set, several runs
Prevent :: permanent regression tests
```
