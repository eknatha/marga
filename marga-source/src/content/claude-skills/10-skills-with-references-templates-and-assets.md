---
title: Skills with references, templates and assets
minutes: 12
summary: Use supporting files in a skill: reference documents, templates and examples, and keep the main file small so Claude loads only what it needs.
---

A single long instruction file works until it does not. Skills support progressive disclosure, where Claude reads the short description first, the main file when relevant and extra files only when the task needs them.

## What you will learn

- Layout of a skill folder with references and templates
- Linking to files from SKILL.md
- Templates and examples that shape output
- Keeping files focused and up to date

## Layout

```text
incident-report/
  SKILL.md
  references/
    severity-levels.md
    escalation-contacts.md
  templates/
    postmortem.md
  examples/
    good-report.md
  scripts/
    collect_timeline.py
```

`SKILL.md` has the front matter and the main steps. Other files are loaded when the main file points to them.

## Linking

```markdown
## Choose severity
Read `references/severity-levels.md` and choose the lowest level that matches the impact.

## Write the report
Copy `templates/postmortem.md` and fill each section. See `examples/good-report.md` for tone.
```

Say clearly when to read each file, such as only for a certain severity. Avoid long chains where one reference points to another, because Claude may not follow them reliably.

## Templates and examples

A **template** fixes the structure of the output, and an **example** shows tone and level of detail. Keep examples short and realistic, with sensitive data removed. Update them when your process changes.

## Maintain

Give each reference one topic and a clear title. Date or version reference documents that change often, such as contact lists, and prefer pointing to a source of truth over copying it. Review skills the way you review code, and remove files nobody uses.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Skills with references, templates and assets fits together
node: n1 | Layout | 0 | 0 | SKILL.md has the front matter and the main steps. | One huge SKILL.md. | process
node: n2 | Linking | 1 | 1 | . | Copying changing data instead of linking to its source. | process
node: n3 | Choose severity | 2 | 0 | Read references/severity-levels.md and choose the lowest level that matches the impact. | Long chains of references. | process
node: n4 | Write the report | 3 | 1 | Copy templates/postmortem.md and fill each section. | Examples with real customer data. | process
node: n5 | Templates and examples | 4 | 0 | A template fixes the structure of the output, and an example shows tone and level of detail. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n6 | Maintain | 5 | 1 | Give each reference one topic and a clear title. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
edge: n5 | n6
```

## Incident: The skill nobody could update

> **Incident:** A long single file contained outdated escalation contacts.

```console
SKILL.md: 2400 lines
escalation contact: former employee
page went to a disabled account
```

The contacts lived deep in a huge file and were never reviewed. The team moved them into a dedicated reference with an owner and review date, and the skill pointed to the on-call system when possible.

## Common mistakes

- One huge SKILL.md
- Copying changing data instead of linking to its source
- Long chains of references
- Examples with real customer data

```quiz
Q: What does progressive disclosure mean for skills?
+ Load details only when needed
- Show everything first :: No.
- Hide the skill :: No.
- Encrypt files :: No.
> Save context. The lesson section above explains why.

Q: What does a template do?
+ Fixes the structure of output
- Runs code :: No.
- Stores passwords :: No.
- Creates users :: No.
> It standardizes results.

Q: Why avoid long reference chains?
+ They may not be followed reliably
- They are faster :: No.
- They are required :: No.
- They hide logs :: No.
> Keep links direct. The lesson section above explains why.

Q: What should changing data link to?
+ A source of truth
- An old copy :: No.
- Chat :: No.
- A screenshot :: No.
> Avoid stale copies. The lesson section above explains why.
```

```cards
Reference file :: Supporting document loaded on demand
Template :: A file that gives output structure
Progressive disclosure :: Loading information in stages
Source of truth :: The system that owns the current data
```
