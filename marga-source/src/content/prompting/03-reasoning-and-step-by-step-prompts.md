---
title: Reasoning and step-by-step prompts
minutes: 12
summary: Know when asking a model to reason in steps improves answers, how extended thinking differs, and how to keep reasoning from leaking into outputs you parse.
---

Some tasks go wrong because the model jumps to an answer. Giving it room to work through the problem first often helps, on maths, planning, diagnosis and multi-step logic. It costs tokens and time, so use it where it pays, and keep the final answer in a form your code can use.

## What you will learn

- Why step-by-step helps and when it does not
- Prompt patterns: think first, then answer
- Built-in extended thinking
- Separate reasoning from the final output

## Why it helps

The model writes one token at a time. If the answer depends on several facts combined, writing the intermediate steps lets later tokens use them. For simple lookups and short rewrites it adds cost without benefit. Try a step-by-step version on your evaluation set and keep it only if the pass rate improves enough to justify the extra output tokens and delay.

## Prompt patterns

```text
Work out the likely cause step by step inside <thinking> tags.
List the evidence for and against each candidate cause.
Then give your final answer in <answer> tags as JSON:
{"cause": "...", "confidence": "low|medium|high", "next_check": "..."}
```

Other useful patterns: ask for a **plan** before doing the work; ask the model to **check its answer** against the constraints; ask for **two candidates** and a comparison; break a big task into **separate calls** so each step is simple and testable (prompt chaining).

## Extended thinking

Some models offer a built-in thinking mode where the model reasons before answering, with a budget of tokens you can set. This is usually better than hand-written reasoning prompts for hard problems, because the reasoning is returned in a separate block from the answer. Thinking tokens cost money and add delay, and the reasoning text should not be shown to users or stored as a fact. Check your provider's documentation for the models and settings supported.

## Keep the output clean

Parse only the part you asked for. With tags, extract the text between `<answer>` and `</answer>`; with a thinking feature, read the answer block. Never feed the reasoning back as trusted data, as it may include mistakes. For safety-critical decisions, do not rely on the model's explanation as proof: verify with code, tests or a person. Explanations can sound convincing and still be wrong.

```python
import re

def extract_answer(text):
    m = re.search(r"<answer>(.*?)</answer>", text, re.S)
    if not m:
        raise ValueError("no <answer> block in the reply")
    return m.group(1).strip()
```

```predict
Q: A diagnosis prompt with step-by-step reasoning raises accuracy from 70 to 90 percent but triples the cost. How do you decide?
???
Compare the value of the accuracy gain with the extra cost and delay for your use case, and consider using it only on hard cases.
> Measure the trade-off.
```

## Incident: The thinking that went to the customer

> **Incident:** A support reply included the model's internal notes.

```console
$ python reply.py ticket-5531 | head -3
<thinking>The customer seems angry; the refund policy says 30 days, it was 45, but maybe we can bend it...</thinking>
Hello Maria, thanks for your patience.
```

The code sent the whole model output to the customer instead of extracting the answer block. The team added a strict extractor that fails when the answer tags are missing, tests that check no tag text ever reaches users, and they switched to the provider's separate thinking block for that task.

## Common mistakes

- Using step-by-step reasoning for trivial tasks
- Showing or storing raw reasoning as fact
- Parsing the whole reply instead of the answer block
- Treating an explanation as proof

```quiz
Q: When does step-by-step prompting help most?
+ Multi-step reasoning, planning and diagnosis
- Simple lookups :: Little gain.
- Renaming a file :: Little gain.
- Printing a date :: Little gain.
> Measure on your tests. Re-read the matching lesson section for the full reasoning.

Q: What is a cost of reasoning?
+ More output tokens and more delay
- Fewer tokens :: Opposite.
- Lower accuracy always :: Not always.
- No cost :: It has cost.
> Trade-off. Re-read the matching lesson section for the full reasoning.

Q: How should the final answer be extracted?
+ From a dedicated answer block
- From the whole reply :: Leaks reasoning.
- By guessing :: Fragile.
- From the first line :: Fragile.
> Use tags or a separate block. Re-read the matching lesson section for the full reasoning.

Q: Is a model's explanation proof that it is right?
+ No, verify with code or a person
- Yes always :: False.
- Only if long :: False.
- Only if polite :: False.
> Verify important decisions. Re-read the matching lesson section for the full reasoning.
```

```cards
Think first :: reason in tags, then answer
Chain :: split big tasks into steps
Thinking mode :: separate reasoning block, costs tokens
Extract :: parse only the answer block
Don't :: show raw reasoning to users
Verify :: explanations are not proof
```
