---
title: Progressive disclosure and structure
minutes: 12
summary: Load only what is needed at each stage: metadata first, then SKILL.md, then linked files and scripts, to keep context small and answers focused.
---

Context is limited and costly. If a skill pours everything into the conversation at once, there is less room for the user's own material, and the model has more to ignore. Progressive disclosure means information arrives in layers, only when the task calls for it. Good structure makes skills powerful without making them heavy.

## What you will learn

- The three levels: metadata, instructions, resources
- What to put at each level
- Link patterns that keep depth shallow
- Measure what a skill costs in tokens

## Three levels

1. **Metadata** (name and description): always available, a few dozen tokens per skill. This is what lets Claude know a skill exists.
2. **Instructions** (the body of SKILL.md): loaded when the skill is triggered.
3. **Resources** (other files, scripts, templates): read or run only if the instructions point to them and the task needs them. A script that runs can return just its result, without its source entering the context.

This is why you can install many skills without slowing every conversation.

## What goes where

- **Level 1**: trigger-quality description only.
- **Level 2**: the workflow: when to do what, decisions, key rules, and links to detail. Aim for the shortest body that produces correct results.
- **Level 3**: long reference tables, full style guides, API specifications, big templates, examples for rare cases, and scripts for exact work.

A useful test: if a section is needed in less than a third of uses, move it to a linked file.

## Linking

In SKILL.md write precise pointers: "If the user needs Kubernetes manifests, read `reference/k8s.md`. For Dockerfiles, read `reference/docker.md`." Keep links one level deep from SKILL.md rather than chains where file A points to file B that points to file C, because deep chains lead to partial reads. For a long reference file, begin with a short contents list so the reader can jump to a section. Name files by content (`reference/error-codes.md`), not by number.

## Measure

Check how big your skill is at each level. Count tokens of the description (small), the body (hundreds to a couple of thousand) and the largest linked file. Compare answer quality with and without a section. If a long section does not change results in your tests, delete it. A shorter skill is cheaper, faster and easier to keep correct. Re-measure after edits.

```predict
Q: A skill's SKILL.md includes a 400-line error code table used in 1 of 10 requests. What do you change?
???
Move the table to a linked reference file and point to it from SKILL.md only for error-related requests.
> Load on need.
```

## Incident: The skill that crowded out the document

> **Incident:** Users pasted long contracts and got shallow answers once a legal skill was active.

```console
$ wc -w skills/contract-review/SKILL.md skills/contract-review/reference/*.md
  6120 skills/contract-review/SKILL.md
  2200 skills/contract-review/reference/clauses.md
```

The skill put its entire clause library in SKILL.md, so every use consumed thousands of tokens that the user's document needed. After moving the library to a reference file read only for clause lookups, the body fell to 700 words and long contracts were handled better.

## Common mistakes

- Putting everything in the body
- Deep chains of linked files
- Long reference files without a contents list
- Never measuring size

```quiz
Q: What is always available from a skill?
+ Its name and description
- Its whole body :: Loaded on demand.
- All scripts :: Loaded on demand.
- Nothing :: Metadata is present.
> Level 1. Re-read the matching lesson section for the full reasoning.

Q: Where does rarely used detail belong?
+ In linked reference files
- In the description :: Too heavy.
- In the name :: No.
- Nowhere :: Lost.
> Level 3. Re-read the matching lesson section for the full reasoning.

Q: Why keep links one level deep?
+ Deep chains can cause partial reads
- They are illegal :: No.
- They look nicer :: Not the reason.
- They save time :: Not the reason.
> Flat structure. Re-read the matching lesson section for the full reasoning.

Q: What is a reason to delete a section?
+ It does not change results in your tests
- It was hard to write :: Not a reason.
- It is long :: Not alone.
- It has bold text :: No.
> Measure value. Re-read the matching lesson section for the full reasoning.
```

```cards
Level 1 :: name and description, always present
Level 2 :: SKILL.md body, when triggered
Level 3 :: linked files and scripts, when needed
Rule :: rare detail goes to a file
Links :: one level deep
Measure :: tokens and quality
```
