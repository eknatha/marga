---
title: What a Claude Skill is
minutes: 11
summary: Understand skills as folders of instructions, scripts and resources that Claude loads when a task needs them, and when a skill is the right tool.
---

You have written the same long prompt many times: how your team formats a report, how to review a pull request, how to fill in a template. A Claude Skill packages that know-how once, so Claude can load it when the task appears and ignore it otherwise. This module shows how to design, write, test and share skills. Product features change quickly, so check the current documentation for details such as limits and where skills are supported.

## What you will learn

- What a skill is and what it contains
- How skills differ from prompts, projects and tools
- Where skills run and who writes them
- When a skill is the right choice

## The idea

A skill is a folder. At minimum it holds a file named `SKILL.md` that starts with a short header giving the skill's **name** and a **description** of what it does and when to use it, followed by instructions in plain Markdown. The folder can also hold reference documents, templates and scripts. Claude sees the names and descriptions of available skills up front, and when a request matches, it reads the rest. The result is expertise on demand without a huge prompt in every conversation.

## Skills compared with other things

- **A prompt** lives in one conversation. A skill is reusable and loaded only when relevant.
- **A system prompt or project instructions** are always present. A skill's body is loaded only when needed, so it can be large without costing tokens all the time.
- **A tool** (function or MCP server) performs an action or fetches data. A skill supplies know-how, and may tell Claude how to use tools or run bundled scripts. They work together.
- **Fine-tuning** changes a model. A skill is just files you can read, edit and review.

## Where they are used

Skills are supported in several Claude products, such as the Claude apps, Claude Code and the API, with differences in how you install them: for example, a folder placed in a known directory in Claude Code, an upload in an app, or a reference in an API request. Some environments allow skills to run code, which is powerful and needs the care described in the security lesson. Because support evolves, treat the product documentation as the source of truth for setup steps.

## When to write one

Write a skill when: the task repeats; the right way is specific to your team or domain; it takes more than a few lines of instruction; it benefits from templates, checklists or a script; and several people should get the same behaviour. Do not write one for a one-off question, or for general knowledge the model already has. Start by doing the task with Claude a few times, note what you had to correct, and put those corrections in the skill.

```predict
Q: Your team wants every release note to follow a template and a tone guide. A single long prompt in everyone's notes app, or a skill?
???
A skill: it is shared, versioned, and loaded only when someone asks for release notes.
> Repeatable, team-specific work.
```

## Incident: The copy-pasted prompt

> **Incident:** Five engineers each kept a slightly different copy of the "write an incident summary" prompt.

```console
$ diff prompt-anita.txt prompt-ravi.txt | wc -l
38
$ ls skills/incident-summary/
SKILL.md  template.md  examples/
```

Each copy had drifted, so summaries differed in format and missed the impact section. The team moved the instructions, the template and two examples into one skill folder, kept it in version control and reviewed changes by pull request. Summaries became consistent, and improvements reached everyone at once.

## Common mistakes

- Writing a skill for something the model already does well
- Putting everything in one giant file
- Treating a skill as a place for secrets
- Assuming every product supports skills identically

```quiz
Q: What is the minimum content of a skill?
+ A folder with a SKILL.md that has a name and description
- A database :: No.
- A fine-tuned model :: No.
- A server :: No.
> Plus instructions in Markdown. Re-read the matching lesson section for the full reasoning.

Q: When is a skill's full body loaded?
+ When the request matches its description
- Always :: That would waste tokens.
- Never :: Then it is useless.
- At boot only :: Not the idea.
> On demand. Re-read the matching lesson section for the full reasoning.

Q: How is a skill different from a tool?
+ A skill supplies know-how; a tool performs an action or fetches data
- They are the same :: No.
- A skill is a server :: No.
- A tool is a prompt :: No.
> They complement each other. Re-read the matching lesson section for the full reasoning.

Q: Which task suits a skill?
+ A repeated, team-specific process with a template
- A one-off question :: Overkill.
- General trivia :: Not needed.
- Storing a password :: Never.
> Reusable expertise. Re-read the matching lesson section for the full reasoning.
```

```cards
Skill :: folder with SKILL.md (name, description, instructions)
Loaded :: when the request matches
Versus prompt :: reusable and on demand
Versus tool :: know-how vs action
Good fit :: repeated, specific, team-wide
Check :: product docs for setup and limits
```
