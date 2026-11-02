---
title: Writing descriptions that trigger
minutes: 12
summary: Write the one field that decides whether a skill is ever used: say what it does, when to use it, and the words people really use.
---

Claude decides whether to use a skill by reading its name and description, long before it sees the body. A skill with a vague description is never used, and one with an over-broad description fires at the wrong times. Getting the description right is the single most valuable thing you can do for a skill.

## What you will learn

- What the description must do
- Patterns that work: what, when, and trigger words
- Avoid being too narrow or too broad
- Test with real requests, including near misses

## Its job

The description answers two questions for the model: **What can this skill do?** and **When should I reach for it?** It is the only part visible when Claude chooses, so it must carry enough meaning to match many ways people phrase a request. Write it in the third person ("Writes...", "Use when..."), and include the nouns and verbs users actually use.

## Weak and strong

Weak: `Helps with documents.` Claude cannot tell when this applies, and it competes with everything.

Better: `Create and edit Word documents (.docx) with headings, tables, tracked changes and comments. Use when the user asks for a Word file, a .docx, a report or memo as a Word document, or to edit or review an existing .docx.`

It names the format, lists capabilities, and gives trigger phrases, including the extension. For an internal skill: `Review Terraform plans for risky changes such as destroys, replaced databases and open security groups. Use when the user shares terraform plan output or asks if an apply is safe.`

## Balance

- **Too narrow**: "Use when the user says exactly "run the weekly report"" misses "can you make this week's numbers summary".
- **Too broad**: "Use for anything about files" triggers constantly and loads text for nothing.
- Mention **exclusions** when neighbours exist: "Not for spreadsheets; use the spreadsheet skill".
- Keep within the length limit, and put the most important words first.
- Avoid marketing language. Plain, specific verbs and objects work best.

## Test it

Make a list of 10 requests that should trigger the skill (varied phrasing, with and without the file extension or tool name) and 10 that should not (near misses). Run them in the product you use and note which fire. Adjust the description, not the body, to fix triggering. Re-run after every edit. Keep this list in the skill's repository as your trigger test.

```predict
Q: Your skill "Use for Kubernetes things" fires on every infrastructure question and loads a long body. How do you fix it?
???
Narrow the description to specific tasks and trigger phrases, add exclusions, and test with near-miss requests.
> Specific verbs and objects.
```

## Incident: The skill that never loaded

> **Incident:** A team wrote a careful skill for security reviews, but nobody saw it used.

```console
$ cat skills/sec-review/SKILL.md | head -4
---
name: sec-review
description: Security stuff.
---
```

The description gave no hint about what the skill did or when to use it, so requests such as "can you check this Dockerfile for risky settings" never matched. The new description named Dockerfiles, Kubernetes manifests, IAM policies and pull request reviews, listed trigger phrases, and excluded general coding questions. Triggering went from 2 of 10 to 9 of 10 sample requests.

## Common mistakes

- Descriptions with no "when to use"
- Over-broad descriptions that fire everywhere
- Only one phrasing of the request
- Fixing triggering by editing the body

Practice: open the [skill-writing lab](#/skill-lab) to write or fix a SKILL.md and have it checked in your browser.

```quiz
Q: What two things should a description say?
+ What the skill does and when to use it
- Who wrote it and when :: Not enough.
- How long it is :: No.
- Its colour :: No.
> Both matter. Re-read the matching lesson section for the full reasoning.

Q: Which description is better?
+ Review Terraform plans for risky changes; use when the user shares plan output
- Terraform stuff :: Vague.
- Helps :: Vague.
- Cloud things :: Vague.
> Be specific. Re-read the matching lesson section for the full reasoning.

Q: How do you test triggering?
+ Run varied requests that should and should not fire it
- Read it once :: Not a test.
- Ask a friend to like it :: Not a test.
- Change the colour :: No.
> Include near misses. Re-read the matching lesson section for the full reasoning.

Q: Where do you fix a skill that does not trigger?
+ In the description
- In the last line of the body :: The body is not read yet.
- In the file permissions :: No.
- In the folder size :: No.
> The description decides. Re-read the matching lesson section for the full reasoning.
```

```cards
Say :: what it does + when to use it
Use :: real nouns, verbs, file extensions
Avoid :: vague and over-broad
Add :: exclusions for neighbours
Test :: 10 should fire, 10 should not
Fix triggering in :: the description
```
