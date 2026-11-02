---
title: Anatomy of a skill folder
minutes: 12
summary: Lay out a skill: SKILL.md header and body, reference files, templates and scripts, with naming rules and a clean structure.
---

A skill is only a folder, so structure is everything. A clear layout makes it easy for Claude to find what it needs and for people to review and maintain. This lesson walks through the files and the rules for the header.

## What you will learn

- The SKILL.md header: name and description
- The body: instructions Claude follows
- Supporting files: references, templates, scripts, assets
- Naming and size guidelines

## A minimal skill

```text
incident-summary/
  SKILL.md
  template.md
  examples/
    outage-example.md
  scripts/
    check_summary.py
```

```text
---
name: incident-summary
description: Write a blameless incident summary from notes, logs or a timeline. Use when the user asks for an incident summary, post-incident report, or outage write-up.
---

Write the summary using template.md.
Steps:
1. Collect facts: start time, end time, impact, detection, mitigation.
2. State only what the notes support; write "not stated" otherwise.
3. Keep it under 300 words and avoid blaming individuals.
4. Run scripts/check_summary.py on the result and fix what it reports.
```

## The header

The header sits between two lines of three dashes at the top of SKILL.md. Two fields are required: **name** and **description**. The name is short, in lowercase letters, numbers and hyphens (documentation sets a maximum length), and usually matches the folder name. The description says **what the skill does and when to use it**, and has a maximum length set by the platform, so check current limits. Other optional fields exist in some products, for example to restrict which tools a skill may use; read the documentation for your environment.

## The body and supporting files

The body is plain Markdown that tells Claude what to do. Use imperative sentences, short numbered steps, and concrete examples. When material is long or only sometimes needed, move it into separate files and link to it from SKILL.md: "For the full format, read `reference/format.md`." Put templates in their own files, put examples in an `examples` folder, and put scripts in `scripts`. Files are read or run only when needed.

## Size and naming

Keep SKILL.md focused; a common guideline is a body of a few hundred lines at most, with detail pushed into linked files. Use clear, consistent file names. Use forward slashes in paths, avoid deeply nested chains of files that point to each other, and never include secrets or personal data. Add a short comment in each script saying what it does and what it needs. A reviewer should understand the skill in five minutes by reading the folder.

```predict
Q: SKILL.md has grown to 900 lines with API tables, a style guide and three templates. What do you do?
???
Keep the workflow in SKILL.md, and move tables, style guide and templates into separate linked files that are read when needed.
> Split by when it is needed.
```

## Incident: The skill nobody could review

> **Incident:** A pull request added a skill with one 1,400-line SKILL.md file.

```console
$ wc -l skills/api-review/SKILL.md
1412 skills/api-review/SKILL.md
$ ls skills/api-review
SKILL.md
```

The reviewer could not tell which parts mattered, and Claude loaded all 1,400 lines for every API question. The author split it into a 90-line SKILL.md with the workflow and linked reference files for the style guide, error formats and examples. Reviews took minutes and answers improved.

## Common mistakes

- One giant SKILL.md
- Names that do not match the folder or follow the rules
- Chains of files that link to other files
- Secrets or personal data in the folder

Practice: open the [skill-writing lab](#/skill-lab) to write or fix a SKILL.md and have it checked in your browser.

```quiz
Q: Which fields are required in the header?
+ name and description
- author and date :: Not required.
- price and licence :: Not required.
- tokens and model :: Not required.
> Check the docs for optional fields. Re-read the matching lesson section for the full reasoning.

Q: What should the description contain?
+ What the skill does and when to use it
- The author's history :: No.
- A joke :: No.
- Only a title :: Too weak.
> This drives triggering. Re-read the matching lesson section for the full reasoning.

Q: Where does long, rarely needed detail go?
+ Linked reference files
- All in SKILL.md :: Too heavy.
- Nowhere :: Lost.
- In the name field :: No.
> Load on demand. Re-read the matching lesson section for the full reasoning.

Q: Which is a good habit for scripts?
+ Add a short comment saying what it does and needs
- Hide them :: Hard to review.
- Make them huge :: Hard to review.
- Include passwords :: Never.
> Reviewable scripts. Re-read the matching lesson section for the full reasoning.
```

```cards
Layout :: SKILL.md, templates, examples/, scripts/
Header :: name and description between ---
Body :: short imperative steps
Details :: link to separate files
Size :: keep SKILL.md focused
Never :: secrets in the folder
```
