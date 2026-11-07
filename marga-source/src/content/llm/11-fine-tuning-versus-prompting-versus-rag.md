---
title: Prompting, RAG or fine-tuning: choosing
minutes: 12
summary: Decide whether to change the prompt, add retrieval or fine-tune a model by looking at what is actually going wrong.
---

There are three main ways to improve a language model application, and people often reach for the most expensive one first. A short diagnosis of the failure tells you which to use.

## What you will learn

- What each approach changes
- Diagnosing the failure type
- Cost, risk and maintenance of each
- A sensible order of attempts

## What each one changes

- **Prompting:** instructions, examples, format and constraints. Fast, cheap and reversible.
- **RAG:** the knowledge the model sees. Good for private, large or changing facts, and for citations.
- **Fine-tuning:** the model's behavior. Good for a consistent style, strict format or a narrow task where examples are plentiful.

## Diagnose first

| Symptom | Likely fix |
| --- | --- |
| Ignores format or instructions | Better prompt, examples, structured output |
| Wrong or outdated facts about your data | RAG |
| Needs a house style at scale | Examples first, then fine-tuning |
| Too slow or costly for a simple task | Smaller model, possibly fine-tuned |
| Makes things up | Grounding, citations, allowing "I do not know" |

```python
# a tiny harness: run the same cases against each variant
cases = load_jsonl("evals/cases.jsonl")
for name, system in [("prompt-v1", p1), ("prompt-v2", p2), ("rag", rag), ("tuned", tuned)]:
    score = sum(grade(system(c.input), c.expected) for c in cases) / len(cases)
    print(name, round(score, 3))
```

## Cost and maintenance

Fine-tuning needs good labeled data, a training and evaluation pipeline, and retraining when requirements or base models change. A tuned model can also lose general abilities. RAG needs a data pipeline and search quality work, but updates are immediate when documents change.

## Order of attempts

1. Write an evaluation set from real examples.
2. Improve the prompt and examples.
3. Add retrieval if facts are the problem.
4. Consider fine-tuning only for a measured gap, with enough clean data.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Prompting, RAG or fine-tuning: choosing fits together
node: n1 | What each one changes | 0 | 0 | Prompting: instructions, examples, format and constraints. | Fine-tuning to teach changing facts. | process
node: n2 | Diagnose first | 1 | 1 | . | Fine-tuning with a small, messy dataset. | process
node: n3 | Cost and maintenance | 2 | 0 | Fine-tuning needs good labeled data, a training and evaluation pipeline, and retraining when requirements or base models change. | No evaluation set before changing anything. | process
node: n4 | Order of attempts | 3 | 1 | Write an evaluation set from real examples. | Skipping prompt improvements. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Fine-tuned on yesterday's prices

> **Incident:** A tuned model gave outdated answers because knowledge was baked into the weights.

```console
question: price of plan Pro?
answer: $29/month
current price (source of truth): $39/month
```

The team had put changing facts into training data. Every price change made the model wrong until the next training run. They moved facts to retrieval from the pricing service and kept fine-tuning only for tone and output format.

## Common mistakes

- Fine-tuning to teach changing facts
- No evaluation set before changing anything
- Skipping prompt improvements
- Fine-tuning with a small, messy dataset

```quiz
Q: Which approach suits changing facts?
+ RAG
- Fine-tuning only :: No.
- Bigger font :: No.
- Temperature zero :: No.
> Retrieval updates immediately.

Q: Which is cheapest and most reversible?
+ Prompting
- Fine-tuning :: No.
- New model training :: No.
- Pretraining :: No.
> Start there. The lesson section above explains why.

Q: What suits a consistent style at scale?
+ Examples, then fine-tuning
- Retrieval :: No.
- Bigger context only :: No.
- Logs :: No.
> Behavior changes. The lesson section above explains why.

Q: What first?
+ An evaluation set
- Training :: No.
- Buying GPUs :: No.
- A new database :: No.
> Measure before changing.
```

```cards
Fine-tuning :: Further training of a model on examples
RAG :: Supplying retrieved knowledge in the prompt
Evaluation set :: Test cases used to compare variants
Distillation :: Training a smaller model from a larger one
```
