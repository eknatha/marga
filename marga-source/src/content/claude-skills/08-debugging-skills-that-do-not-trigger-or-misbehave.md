---
title: Debugging skills that do not trigger or misbehave
minutes: 14
summary: Investigate a skill that never loads, loads at the wrong time, or loads and is ignored: check discovery, description, structure, conflicts and output.
---

Skill problems fall into a few families: Claude cannot find the skill, finds it but does not choose it, chooses it but follows it badly, or follows it and a script fails. Checking in that order saves hours.

## What you will learn

- Is the skill discovered at all?
- Is the description good enough to be chosen?
- Is the body read and followed?
- Do scripts and files work in this environment?

## Discovery

Confirm the folder is where the product looks for skills, that the file is named exactly `SKILL.md` (case matters), that the header has valid `---` lines and required fields, and that the name follows the rules. A YAML mistake, such as an unquoted colon in the description, can make the skill invisible. Ask Claude directly which skills it has available, and restart or reload if your product needs it.

```bash
ls -la .claude/skills/incident-summary/
head -6 .claude/skills/incident-summary/SKILL.md
python3 -c "import yaml,sys; t=open(sys.argv[1]).read().split('---')[1]; print(yaml.safe_load(t))" .claude/skills/incident-summary/SKILL.md
```

## Choosing

If the skill is listed but not used, test the description: phrase the request in the user's own words and see what happens. Compare it with neighbouring skills; a similar description may win. Make the description more specific, add trigger phrases, and exclude near neighbours. If it fires too often, narrow it. Try explicitly naming the skill in a request to prove that the rest of the skill works; if that works, the problem is the description.

## Following

If the skill loads but the output ignores the instructions, check for contradictions between rules and examples, steps buried in long paragraphs, and instructions that depend on a file Claude never read. Make the key rule a numbered step near the top, say what to do when information is missing, and link to files with precise conditions. Check whether another instruction in the conversation, such as project instructions, conflicts with the skill.

## Scripts and files

If a script fails, run it by hand with the same input. Check the interpreter and libraries available in the environment, file paths (relative to the skill folder), permissions, and network limits. Make errors readable. If the environment cannot run scripts or install packages, offer a fallback in the instructions. Record the fix and add the case to your test set. Where behaviour changed after a product or model update, re-run the full test set and compare with your last good results.

```predict
Q: Naming your skill in the request works, but ordinary requests never trigger it. Where is the problem?
???
The description: the skill itself works, but its description does not match how users phrase requests.
> Edit the description and re-test.
```

## Incident: The invisible skill

> **Incident:** A new skill never appeared in the list of available skills.

```console
$ head -4 skills/api-review/skill.md
---
name: api-review
description: Review API designs: naming, errors, pagination. Use when asked.
---
$ ls skills/api-review
skill.md
```

The file was named skill.md in lowercase, but the product looks for SKILL.md. The description also contained a colon that broke the header, so it was quoted. After renaming the file and fixing the header, the skill was discovered and the trigger tests were re-run and adjusted.

## Common mistakes

- Wrong file name or folder
- Header syntax errors
- Debugging the body when the description is the problem
- Not testing scripts by hand

```quiz
Q: Where do you check first when a skill never appears?
+ File name, location and header syntax
- The body wording :: Not read yet.
- The colour theme :: No.
- The user's age :: No.
> Discovery first. Re-read the matching lesson section for the full reasoning.

Q: Naming the skill works but normal requests do not trigger it. The fix is:
+ A better description
- A longer body :: Wrong place.
- A bigger model :: Wrong place.
- More scripts :: Wrong place.
> Triggering is the description. Re-read the matching lesson section for the full reasoning.

Q: The skill loads but is ignored. What do you check?
+ Contradictions and buried rules
- Network speed :: Unrelated.
- The date :: Unrelated.
- Disk label :: Unrelated.
> Make key rules prominent. Re-read the matching lesson section for the full reasoning.

Q: A script fails. What do you try?
+ Run it by hand with the same input and check the environment
- Rename the skill :: Unrelated.
- Delete the folder :: Destructive.
- Ignore :: Unfixed.
> Isolate the script. Re-read the matching lesson section for the full reasoning.
```

```cards
Discovery :: location, SKILL.md name, header
Choosing :: description and neighbours
Following :: contradictions, buried rules
Scripts :: run by hand, check environment
Prove :: name the skill in the request
Lock in :: add to the test set
```
