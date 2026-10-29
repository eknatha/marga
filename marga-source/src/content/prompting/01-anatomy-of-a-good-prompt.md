---
title: Anatomy of a good prompt
minutes: 11
summary: Write prompts with a clear task, context, constraints and output format, and learn to remove ambiguity before you blame the model.
---

Most disappointing model answers come from prompts that left out something the writer knew. A model cannot read your mind or your repository. A good prompt is a short brief for a smart colleague who has never seen your project: it says what you want, why, for whom, with what material, and in what form.

## What you will learn

- The five parts of a clear prompt
- Be specific about the output
- Say what to do, not only what to avoid
- Test a prompt on real inputs, not one example

## Five parts

1. **Task**: one clear instruction ("Classify this ticket").
2. **Context**: who the audience is and why it matters ("These go to on-call engineers at 3 a.m.").
3. **Material**: the text, data or code to work on, clearly separated from the instructions.
4. **Constraints**: length, tone, things to avoid, what to do when unsure.
5. **Output format**: the exact shape of the answer, such as JSON with named fields or three bullet points.

You do not always need all five, but when an answer is wrong, check which part was missing.

## Compare two prompts

Vague: `Summarise this incident.`

Clear:

```text
You are helping an on-call engineer read an incident report quickly.
Summarise the report below in at most 5 bullet points.
For each point give: what happened, the impact, and the status.
If the report does not say the impact, write "impact not stated".
Do not guess causes that are not in the report.

<report>
{{report_text}}
</report>
```

The second prompt names the audience, limits the length, defines the content of each point, handles a missing fact, and separates the material with tags.

## Positive instructions and reasons

"Write in plain sentences" works better than "don't use jargon". Give the reason when a rule is not obvious: "Keep it under 100 words because it is shown in a push notification." A reason lets the model apply the idea to cases you did not list. Avoid piling on capital-letter warnings. If one rule matters most, say so once, clearly.

## Test on varied inputs

A prompt that works for one example may fail on a long input, an empty input, input in another language or input that contains instructions. Keep a small set of real examples, including awkward ones, and run the prompt on all of them whenever you change it. Treat the prompt as code: put it in version control with a note about what changed and why.

```predict
Q: A prompt says "Be brief." and answers vary from one line to five paragraphs. How do you fix it?
???
State a measurable limit and the reason, for example "at most three sentences, shown in a notification".
> Replace adjectives with limits.
```

## Incident: The summary nobody could use

> **Incident:** A weekly report prompt produced long essays that people stopped reading.

```console
$ python summarize.py week-42.txt | wc -w
612
$ cat prompt.txt
Summarise this incident.
```

The prompt had no audience, no length and no format. The team rewrote it with a five-bullet limit, a fixed structure of what happened, impact and status, and an instruction to say when something is not stated. Word counts dropped to under 120 and the reports were used again.

## Common mistakes

- Leaving out the audience and purpose
- Mixing instructions and material without separators
- Listing only prohibitions
- Testing on one friendly example

```quiz
Q: Which is a measurable constraint?
+ At most three sentences
- Be brief :: Vague.
- Keep it nice :: Vague.
- Not too long :: Vague.
> Use numbers. Re-read the matching lesson section for the full reasoning.

Q: Why separate material from instructions?
+ So the model does not confuse data with commands
- To save tokens :: Not the reason.
- To hide text :: No.
- To slow it down :: No.
> Tags or delimiters. Re-read the matching lesson section for the full reasoning.

Q: What should you do when the right answer might be missing from the text?
+ Tell the model what to write in that case
- Hope :: Leads to invention.
- Raise temperature :: No.
- Delete the field :: No.
> Provide an exit. Re-read the matching lesson section for the full reasoning.

Q: How should a prompt be tested?
+ On many real, varied inputs
- On one example :: Misleading.
- Never :: Risky.
- On the author only :: Biased.
> Include awkward cases. Re-read the matching lesson section for the full reasoning.
```

```cards
Parts :: task, context, material, constraints, format
Separate :: use tags around material
Be specific :: numbers, not adjectives
Give reasons :: the model can generalise
Exit :: say what to do when unsure
Test :: varied real inputs
```
