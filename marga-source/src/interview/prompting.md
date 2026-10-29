## What makes a prompt clear?
level: junior
It states the task, the audience and purpose, the material to work on, constraints with measurable limits, and the exact output format. It separates material from instructions with tags, and says what to do when the answer is not available. I test it on varied real inputs, not one example.

## When do you use few-shot examples?
level: junior
When a pattern is easier to show than to describe, such as a house style or a label set with fine differences. I use three to five varied, realistic examples in an identical format, including a borderline case and an unknown case, and I keep them separate from my test set.

## How do you get structured JSON from a model?
level: mid
I define a schema with types, enums and required fields, then use the most reliable method available: forced tool use or schema-constrained output, otherwise a careful prompt with examples. I parse with a real JSON parser, validate against the schema, check the stop reason for truncation, and retry with the error message within limits.

## When does step-by-step reasoning help?
level: mid
It helps on multi-step problems such as planning, diagnosis and maths, because intermediate steps are available to later tokens. It adds tokens and delay and does little for simple lookups. I test it on my evaluation set, keep reasoning separate from the final answer, and never treat an explanation as proof.

## What goes into a system prompt and what does not?
level: mid
Stable role, rules, output format and boundaries go in it, while per-request material goes in the user message. Secrets never go in it, since users can often make the model repeat it. For untrusted text I mark it as data, and I limit what the model can do rather than relying on wording alone.

## How do you test and version prompts?
level: mid
Prompts live in versioned files with a changelog and a config naming the model and parameters. Changes go through review, and CI runs the evaluation set with a pass-rate threshold. I log the prompt version per request, release to a small share of traffic first, and keep rollback to a configuration change.

## A prompt works on your tests but fails 1 in 10 in production. What do you do?
level: senior
I collect the failing production inputs, add them to the evaluation set, and look for what they share, such as format, language or length. I reproduce each failure several times, reduce the prompt to isolate the cause, change one thing at a time, and measure on the full set. Safety-critical rules also get code checks.

## How do you defend a prompt-based system against injection?
level: senior
I assume injection will sometimes work. Untrusted content is marked as data, tools use least privilege, risky actions need approval, outputs are validated, and I avoid combining private data, untrusted input and an outbound channel in one session. I log traces, run injection cases in the evaluation set, and review incidents.
