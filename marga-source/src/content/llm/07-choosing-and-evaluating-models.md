---
title: Choosing and evaluating models
minutes: 12
summary: Build a small test set from your own task, compare models and prompts with it, and avoid trusting public benchmarks alone.
---

Public benchmarks measure general ability. Your feature needs one specific thing done well on your data. The only reliable way to choose a model or a prompt is to test it on examples that look like your real traffic, and to keep those tests running as things change.

## What you will learn

- Why you need your own evaluation set
- Build a set of examples with expected properties
- Score outputs: exact checks, rules and model-based grading
- Compare, decide and keep testing

## Why your own tests

Benchmarks can be outdated, narrow, or leaked into training data, and they use tasks unlike yours. A model that ranks first on a leaderboard may do worse on your support tickets or your log format. A small set of 30 to 100 real, varied examples with known good answers will tell you more about your feature than any public score.

## Build the set

Collect real inputs (with personal data removed), include normal cases, hard cases, and cases where the right answer is "I don't know" or "escalate". For each, write what a good answer must contain or must not contain. Keep a held-out part you do not tune on. Store the set in version control next to the prompt.

```json
{"id": "t-014", "input": "Customer says card was charged twice", "expect": {"category": "billing", "must_not_say": ["refund approved"]}}
```

## Score the answers

- **Exact checks** for structured fields: category in the allowed list, number in range, valid JSON.
- **Rules** for text: contains required facts, avoids forbidden claims, stays under a length.
- **Model-based grading**: another model compares the answer to a rubric. Fast and useful, but it makes mistakes and has biases, so spot-check it with humans and prefer clear rubrics with yes or no questions.
- **Human review** of a sample, especially for tone and safety.

```python
def score(case, output):
    ok = output.get("category") in ALLOWED
    ok = ok and output.get("category") == case["expect"]["category"]
    ok = ok and not any(w in output.get("reply", "") for w in case["expect"].get("must_not_say", []))
    return ok
```

## Decide and keep testing

Run each candidate model and prompt on the same set, several times, and compare pass rate, cost and latency. Choose the cheapest option that meets your quality bar. Re-run the set when you change the prompt, the model version, the retrieval, or the tools. Add every production failure as a new test case. This is a regression test for behaviour that cannot be unit tested in the old way.

```predict
Q: A new model version scores higher on a public benchmark. Should you switch production to it today?
???
Not before running your own evaluation set; check quality, cost and latency on your data, then roll out gradually.
> Your data decides.
```

## Incident: The upgrade that broke the router

> **Incident:** A model upgrade changed how the ticket router phrased its categories.

```console
$ python run_evals.py --model new --set tickets
pass_rate=0.71 (was 0.94)   failures: category_not_in_allowed_list=38
$ python run_evals.py --model old --set tickets
pass_rate=0.94
```

The new version added explanations to the category field, so parsing failed. Because the team had an evaluation set in CI, the problem showed up before release. They tightened the prompt and the schema, re-ran the set until the pass rate was back, and then switched gradually.

## Common mistakes

- Choosing a model by leaderboard alone
- Tuning on the same examples you evaluate on
- Using only model-based grading with no human check
- Not re-running tests after changes

```quiz
Q: What is the best basis for choosing a model for your feature?
+ A test set built from your own task
- A public leaderboard only :: May not match.
- The price only :: Ignores quality.
- The newest release date :: Not evidence.
> Evaluate on your data. Re-read the matching lesson section for the full reasoning.

Q: What should a test case contain?
+ An input and what a good answer must or must not contain
- Only a title :: Not testable.
- Secrets :: Never.
- Nothing :: Useless.
> Expected properties. Re-read the matching lesson section for the full reasoning.

Q: When should you re-run the evaluation?
+ After changing the prompt, model, retrieval or tools
- Never :: Regressions are missed.
- Only yearly :: Too late.
- Only on failure :: Too late.
> Treat it as CI. Re-read the matching lesson section for the full reasoning.

Q: Why spot-check model-based grading?
+ Graders make mistakes and have biases
- They are always right :: No.
- They are free :: Not the reason.
- They run offline :: Not the reason.
> Calibrate against humans. Re-read the matching lesson section for the full reasoning.
```

```cards
Own eval set :: 30 to 100 real, varied cases
Include :: hard cases and escalate cases
Score :: exact checks, rules, graded rubric, humans
Compare :: pass rate, cost, latency
Re-run :: on any change
Failures :: become new tests
```
