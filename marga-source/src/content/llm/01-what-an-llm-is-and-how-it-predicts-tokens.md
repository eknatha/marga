---
title: What an LLM is and how it predicts tokens
minutes: 11
summary: See a large language model as a next-token predictor, and understand what that means for what it does well and badly.
---

A large language model, or LLM, is a program trained on a very large amount of text to predict what comes next. That one skill, repeated thousands of times, produces answers, code, summaries and conversation. Engineers who understand the prediction loop make better decisions about prompts, costs and safety than those who treat the model as a mind or as a search engine.

## What you will learn

- The prediction loop: text in, one token out, repeat
- Why the same prompt can give different answers
- What models are good at, and where they fail
- A mental model you can use when something goes wrong

## The loop

The model receives text, converted to numbers, and produces a score for every possible next piece of text. One piece is chosen, added to the input, and the process repeats until the model produces a stop signal or hits a length limit. Nothing else happens inside: no lookup in a database and no running of code unless you give it tools. A reply of 300 words is hundreds of small predictions in a row, each depending on everything before it.

## Why it feels smart

Predicting text well requires capturing grammar, facts, style, reasoning patterns and code structure that appear in the training text. So the model can explain a stack trace, translate a paragraph or write a Terraform module, because those patterns were common in what it learned. It does not "look up" an answer. It produces the most plausible continuation, shaped by training to be helpful and honest.

## Strengths and weak spots

- **Strong**: summarising, rewriting, classifying, extracting fields from messy text, drafting code and explanations, translating between formats.
- **Weaker**: exact arithmetic on long numbers, counting characters, facts after its training cutoff, rarely seen details (an obscure flag of a tool), and anything that needs real-time data.
- **Risky**: confident but wrong answers, called hallucinations. A fluent sentence is not evidence of a true one.

The practical rule: use the model for language and pattern work, and use tools (a calculator, a search, a database) for exact facts.

## A mental model that helps debugging

When a result is wrong, ask three questions. **What did the model actually see?** Print the exact input, including the system prompt and any retrieved text. **Is the answer in the input?** If not, the model must guess. **Is the task a language task?** If it needs exactness, add a tool or a check. Most "model problems" are input problems. Keep the model's output as untrusted data: validate it before it reaches a database, a shell or a customer.

```predict
Q: You ask a model for the exact SHA-256 of a string and it answers with a plausible 64-character hash. Why is this unreliable?
???
The model predicts plausible text; it does not run the hash algorithm. Use a tool or code for exact computation.
> Language task versus exact task.
```

## Incident: The confident wrong flag

> **Incident:** An on-call engineer pasted a model answer into a runbook without checking it.

```console
$ kubectl rollout restart deploy/web --graceful-period=30
error: unknown flag: --graceful-period
$ kubectl rollout restart --help | grep -i grace
(no output)
```

The model had produced a flag that looks right but does not exist for that command. The runbook was corrected using the tool's own help, and the team added a rule: commands from a model are tested in a safe environment and checked against the official reference before they enter documentation.

## Common mistakes

- Treating fluent output as verified output
- Asking the model for exact arithmetic or recent facts without tools
- Not looking at the exact input the model received
- Putting model output straight into a shell or database

```quiz
Q: What does an LLM do at each step?
+ Predicts the next token from the text so far
- Searches a database of answers :: It does not look up stored answers by default.
- Runs the code it writes :: It only produces text unless given tools.
- Reads the internet live :: Not without a tool.
> The loop repeats. Re-read the matching lesson section for the full reasoning.

Q: Why can the same prompt give different answers?
+ The next token is sampled from probabilities
- The model gets tired :: No.
- The network changes the prompt :: No.
- The prompt is deleted :: No.
> Sampling adds variation. Re-read the matching lesson section for the full reasoning.

Q: Which task is best done by code, not the model alone?
+ Computing a checksum
- Summarising a log :: A language task.
- Rewriting an email :: A language task.
- Classifying a ticket :: A language task.
> Exact work needs exact tools. Re-read the matching lesson section for the full reasoning.

Q: What is a hallucination?
+ A fluent answer that is not true or not supported by the input
- A server crash :: No.
- A slow response :: No.
- A rate limit :: No.
> Plausible is not the same as correct. Re-read the matching lesson section for the full reasoning.
```

```cards
LLM :: predicts the next token from the text so far
Loop :: predict, append, repeat until stop
Strong at :: language and pattern tasks
Weak at :: exact facts, arithmetic, recent events
Hallucination :: fluent but unsupported answer
Rule :: validate output before using it
```
