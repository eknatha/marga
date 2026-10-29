---
title: Claude Skills
summary: Skill folder layout, SKILL.md header, descriptions that trigger, structure, scripts, tests and a security review checklist.
module: claude-skills
---

## Folder layout

```text
incident-summary/
  SKILL.md
  template.md
  reference/format.md
  examples/outage-example.md
  scripts/check_summary.py
```

## SKILL.md

```text
---
name: incident-summary
description: Write a blameless incident summary from notes or a timeline. Use when the user asks for an incident summary, post-incident report or outage write-up.
---

Use template.md. Steps:
1. Collect start, end, impact, detection and mitigation.
2. Write "not stated" for anything the notes do not say.
3. Keep it under 300 words.
4. Run scripts/check_summary.py and fix what it reports.
```

> **Warning:** The description decides whether the skill is ever used. Say what it does and when to use it, with real nouns and verbs. Check current name and length limits in the product documentation.

## Descriptions

```text
Weak:   Helps with documents.
Better: Create and edit Word (.docx) files with headings, tables and tracked changes. Use when the user asks for a Word document or to edit a .docx.
```

Add exclusions for neighbouring skills. Keep the key words first.

## Progressive disclosure

```text
Level 1: name and description (always)
Level 2: SKILL.md body (when triggered)
Level 3: linked files and scripts (when needed)
```

> **Warning:** A giant SKILL.md wastes context. Move rarely needed detail to linked files, one level deep.

## Scripts

```python
#!/usr/bin/env python3
"""Check a summary. Usage: python check_summary.py summary.md"""
import sys
text = open(sys.argv[1], encoding="utf-8").read()
problems = [] if len(text.split()) <= 300 else ["over 300 words"]
print("OK" if not problems else "\n".join(problems))
sys.exit(1 if problems else 0)
```

Use scripts for exact work. Keep output short and specific.

## Test

```text
Should trigger:     "write up last night's outage from these notes"
Should not trigger: "what does a 502 mean?"
```

Run 10 should-fire and 10 should-not requests, with and without the skill. Keep the task set in the repository.

## Share safely

```bash
grep -rn "curl\|wget\|urlopen\|requests\.\|eval(\|exec(" skills/NAME/
```

> **Warning:** A skill can steer Claude and include scripts that run. Read every file, look for network calls, downloads and shell commands, and run unknown skills in a sandbox first.

## Debug

```bash
ls -la .claude/skills/NAME/
head -6 .claude/skills/NAME/SKILL.md
```

Check location, exact file name SKILL.md, header syntax, then the description, then the body, then scripts.

> **Warning:** Re-run your trigger and task tests after any model, product or description change.
