---
title: Training, knowledge and hallucination
minutes: 12
summary: Learn how a model gets its knowledge, why it has a cutoff date, and the practical ways to supply facts it does not have.
---

A model's knowledge comes from training, and training ended at some date. Your documents, your tickets and yesterday's news were never part of it. Understanding the stages of training, and the difference between knowledge in the model and knowledge in the prompt, tells you when to use context, retrieval, tools or training.

## What you will learn

- Pre-training and post-training in plain terms
- The knowledge cutoff and why facts go stale
- Why hallucinations happen
- Ways to add knowledge: context, retrieval, tools, fine-tuning

## Stages of training

**Pre-training** teaches the model to predict text from a huge collection of documents and code. This gives it language, broad facts and skills. **Post-training** then shapes behaviour with examples and feedback so that the model follows instructions, refuses harmful requests and writes in a helpful style. Together they produce an assistant. The details differ by provider, and are not something you control when you call an API.

## The cutoff

The training data ends at a date, called the knowledge cutoff. After that, the model knows nothing unless you provide it. This affects library versions, product names, prices, laws and current events. A model may also be unsure about its own cutoff, so do not ask it what is current. Put the current date and the facts you need into the prompt, or give it a search tool.

## Why it makes things up

The model is trained to produce plausible text, and when the answer is not in its training or in your prompt, a plausible-sounding answer is still the most likely continuation. Rare facts, precise numbers, citations and names of obscure APIs are the most common places it invents. You reduce this by giving source text and asking for answers only from it, allowing "I don't know" as a valid answer, and asking for quotes that you can check.

## Adding knowledge

1. **Put it in the prompt** (context): best for small, current, private facts.
2. **Retrieve it**: search your documents and include the best passages (RAG).
3. **Give tools**: let the model call a database, an API or a search and use the result.
4. **Fine-tune**: train further on your examples. Useful for style, format or narrow tasks at scale; poor at adding frequently changing facts, and it costs effort to evaluate and maintain.

Start at the top of this list. Most applications never need the last one.

```predict
Q: A support bot must answer using last week's policy changes. Which approach fits, and why not fine-tuning?
???
Retrieve the current policy text and put it in the prompt. Fine-tuning is slow to update and poor for facts that change often.
> Facts change; keep them in context.
```

## Incident: The library that did not exist

> **Incident:** A model suggested a function that failed on first use.

```console
$ python -c "import boto3; boto3.client('s3').upload_stream('a', 'b')"
AttributeError: 'S3' object has no attribute 'upload_stream'
```

The model blended real method names into one that sounded right. The developer checked the official reference and found the correct call. The team now pastes the relevant documentation page into the prompt for unfamiliar APIs and reviews generated code with tests.

## Common mistakes

- Assuming the model knows recent or private facts
- Fine-tuning to add facts that change
- Not allowing the model to say it does not know
- Trusting citations without opening them

```quiz
Q: What is a knowledge cutoff?
+ The date after which the training data has nothing
- A price limit :: No.
- A time limit per reply :: No.
- A rate limit :: No.
> Newer facts must be provided. Re-read the matching lesson section for the full reasoning.

Q: Where should you start when the model lacks a fact?
+ Put it in the prompt or retrieve it
- Fine-tune first :: Heavy and slow.
- Hope :: Not a plan.
- Raise temperature :: Unrelated.
> Context first. Re-read the matching lesson section for the full reasoning.

Q: Which request reduces hallucination?
+ Answer only from the provided text and say if it is not there
- Be creative :: Increases risk.
- Answer fast :: Unrelated.
- Never refuse :: Increases risk.
> Grounding and an exit. Re-read the matching lesson section for the full reasoning.

Q: When is fine-tuning a good fit?
+ Consistent style or format on a narrow task at scale
- Daily changing facts :: Poor fit.
- One-off questions :: Overkill.
- Secrets :: Not a store.
> Evaluate before and after. Re-read the matching lesson section for the full reasoning.
```

```cards
Pre-training :: learn language and facts from large text
Post-training :: shape instruction following and behaviour
Cutoff :: no knowledge after the training date
Hallucination :: plausible invented content
Add facts :: prompt, retrieve, tools, then fine-tune
Grounding :: answer only from given text
```
