---
title: Sampling, temperature and determinism
minutes: 11
summary: Understand how the next token is chosen, what temperature and top-p change, and how to get repeatable behaviour from a system that is random by design.
---

After the model scores every possible next token, something must choose one. That choice is called sampling, and it explains why answers vary between runs. Getting predictable behaviour for a pipeline is partly a matter of settings, and mostly a matter of designing the system so that small variation does not matter.

## What you will learn

- How sampling chooses a token
- What temperature and top-p do
- What you can and cannot make deterministic
- Designing around variation

## Probabilities

For each step the model produces a probability for every token. If "Paris" has 92 percent and "Lyon" has 3 percent after "The capital of France is", then most runs choose Paris. Different prompts and different points in a sentence have very different spreads: a factual answer is peaked, a story opening is wide.

## Temperature and top-p

**Temperature** rescales probabilities before choosing. Low values (near 0) make the highest-probability token win almost always, giving focused and repeatable output. Higher values flatten the choice and give more varied, creative output. **Top-p** limits the choice to the smallest set of tokens whose probabilities add up to p. Change one of them, not both, unless you have a reason. For extraction, classification and code, use low temperature; for brainstorming, use higher.

```python
response = client.messages.create(
    model=MODEL,
    max_tokens=300,
    temperature=0.0,
    messages=[{"role": "user", "content": "Classify this ticket: " + ticket}],
)
```

## Determinism has limits

Even at temperature 0, results can differ slightly between calls, because of how requests are batched and how hardware does arithmetic, and any change to the model version changes outputs. Some newer models and modes fix or ignore sampling settings, so check the documentation for the model you use. Never write tests that require an exact sentence from a model, unless you have pinned the model and accept occasional breaks.

## Designing around variation

- Ask for **structured output** and validate it; the format stays stable even when wording varies.
- Test **properties**, not strings: the answer must contain a valid category, a number in range, or cite a given document.
- Run an important test several times and look at the **pass rate**.
- For decisions, use a constrained set of answers and a fallback to a human when the model is unsure.
- Pin a **model version** in production and re-run your tests before upgrading.

```predict
Q: A unit test compares a model reply to an exact sentence and fails once a week. What should it check instead?
???
A property of the answer, such as valid JSON with an allowed category, run several times with a pass-rate threshold.
> Test behaviour, not wording.
```

## Incident: The flaky classifier

> **Incident:** A ticket router sent the same message to different queues on different days.

```console
$ for i in 1 2 3 4 5; do python route.py "refund not received"; done
billing
billing
payments
billing
payments
```

The prompt asked for free text, the temperature was left at the default, and "payments" and "billing" both seemed reasonable. The team listed the allowed queues in the prompt, requested one value from that list in JSON, set a low temperature, and added a test that runs each sample ten times.

## Common mistakes

- Using high temperature for extraction or classification
- Expecting exact repeatability
- Tuning temperature and top-p together without measuring
- Not pinning the model version

```quiz
Q: What does a low temperature do?
+ Makes the most likely token win almost always
- Makes the model smarter :: Not a quality knob.
- Reduces cost :: No.
- Disables the model :: No.
> More focused output. Re-read the matching lesson section for the full reasoning.

Q: What is top-p?
+ A limit to the smallest set of tokens whose probabilities add up to p
- A price :: No.
- A timeout :: No.
- A language :: No.
> Nucleus sampling. Re-read the matching lesson section for the full reasoning.

Q: Is temperature 0 a guarantee of identical output?
+ No, small differences can still occur
- Yes always :: Not guaranteed.
- Only on Mondays :: No.
- Only for code :: No.
> Design for variation. Re-read the matching lesson section for the full reasoning.

Q: How should a test of a model-based feature be written?
+ Check properties of the answer, repeated several times
- Compare to one exact sentence :: Brittle.
- Run it once :: Misses variation.
- Skip tests :: Risky.
> Pass rates and properties. Re-read the matching lesson section for the full reasoning.
```

```cards
Sampling :: choose the next token from probabilities
Temperature :: low is focused, high is varied
Top-p :: limit to the most probable set
Extraction and code :: low temperature
Tests :: properties and pass rate
Production :: pin the model version
```
