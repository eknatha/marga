---
title: Examples and few-shot prompting
minutes: 11
summary: Show the model what you want with a few good examples, choose them well, and avoid the traps that make outputs copy the examples.
---

Describing a format in words is often less effective than showing it. A handful of examples teaches the model the pattern, the tone and the edge cases in a way instructions struggle to. Used well, examples are one of the cheapest ways to raise reliability. Used badly, they make every answer look like the examples.

## What you will learn

- When examples help
- How many and which examples to choose
- Format examples consistently
- Avoid copying and keep examples fresh

## Instructions versus examples

Use examples when the rule is easy to demonstrate and hard to describe: a house style, a label set with fine differences, an unusual output shape. A zero-shot prompt has no examples, a one-shot has one, a few-shot has several. If the model already does the task correctly from instructions alone, extra examples only cost tokens.

## Choose them

- Use **3 to 5** examples to start, and add more only if tests show gains.
- Cover **different cases**: a typical one, a tricky one, a borderline one, and one where the right answer is "none" or "escalate".
- Keep the **format identical** in every example, including punctuation and field order.
- Make them **realistic**, drawn from real data (with private details removed).
- **Label** them in tags so they are not confused with the real input.

```text
<examples>
<example>
<ticket>I was charged twice for May</ticket>
<answer>{"category": "billing", "urgency": "high"}</answer>
</example>
<example>
<ticket>How do I change my avatar?</ticket>
<answer>{"category": "account", "urgency": "low"}</answer>
</example>
<example>
<ticket>asdf</ticket>
<answer>{"category": "unknown", "urgency": "low"}</answer>
</example>
</examples>
```

## Traps

- **Copying**: if all examples are short, answers get short; if all examples start with the same word, so will the outputs. Vary them.
- **Label imbalance**: if four of five examples are "billing", the model leans that way. Balance them or say that the examples are not representative.
- **Conflict with instructions**: if an example breaks a rule you stated, the model will follow the example.
- **Leakage**: do not reuse your evaluation cases as examples, or your tests will look better than reality.

## Keep them maintainable

Store examples in a separate file, load them at run time, and test changes. Rotate or select examples by similarity to the current input if you have many (dynamic few-shot), but measure that it beats a fixed set. When the output format is critical, combine examples with a schema and validation, covered in the next lessons.

```predict
Q: Your classifier outputs "billing" far too often. The examples are 4 billing and 1 other. What do you change?
???
Balance and diversify the examples, add borderline cases and an "unknown" case, and re-run the evaluation set.
> Examples set the prior.
```

## Incident: Everything is urgent

> **Incident:** A triage prompt marked almost every ticket as high urgency.

```console
$ python triage.py tickets.csv | cut -d, -f2 | sort | uniq -c
  91 high
   6 medium
   3 low
```

Four of the five examples in the prompt were outages with high urgency, so the model assumed most tickets were. The team replaced them with five examples spread across all levels, added a clear definition for each level, and checked the distribution against human labels on 100 tickets.

## Common mistakes

- Examples that are all the same kind
- Format that differs between examples
- Using test cases as examples
- Adding examples that contradict the rules

```quiz
Q: When are examples most helpful?
+ When the pattern is easier to show than to describe
- Never :: They help in many cases.
- Only for images :: Not only.
- Only for code :: Not only.
> Show formats and styles. Re-read the matching lesson section for the full reasoning.

Q: Why vary examples?
+ To stop the model copying one shape or length
- To save tokens :: Not the aim.
- To confuse it :: No.
- To reduce cost :: No.
> Diversity. Re-read the matching lesson section for the full reasoning.

Q: What should be true of the format across examples?
+ It must be identical
- It must differ :: Confuses.
- It must be random :: Confuses.
- It must be empty :: Useless.
> Consistent fields. Re-read the matching lesson section for the full reasoning.

Q: Why not use evaluation cases as examples?
+ The test would look better than real performance
- It is illegal :: Not the point.
- It costs more :: Not the point.
- It is slower :: Not the point.
> Keep sets separate. Re-read the matching lesson section for the full reasoning.
```

```cards
Zero, one, few-shot :: number of examples
Start :: 3 to 5 varied examples
Cover :: typical, tricky, borderline, none
Format :: identical every time
Avoid :: label imbalance and copying
Keep apart :: examples vs test set
```
