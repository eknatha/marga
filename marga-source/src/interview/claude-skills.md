## What is a Claude Skill?
level: junior
A skill is a folder with a SKILL.md file containing a name, a description of what it does and when to use it, and instructions, plus optional reference files, templates and scripts. Claude sees the descriptions up front and loads the full instructions only when a request matches, so expertise is available without a huge prompt every time.

## How is a skill different from a prompt or a tool?
level: junior
A prompt lives in one conversation, a skill is reusable and loaded on demand. A tool performs an action or fetches data, while a skill supplies know-how and can tell Claude how to use tools or run bundled scripts. They complement each other, and a skill can be reviewed and versioned like code.

## What makes a good skill description?
level: mid
It says what the skill does and when to use it, uses the nouns and verbs people really use, mentions file types or tool names, and excludes near neighbours. It is neither vague nor so broad that it fires everywhere. I test it with ten requests that should trigger it and ten that should not.

## What is progressive disclosure in skills?
level: mid
Information loads in layers: name and description always, the body of SKILL.md when the skill is triggered, and linked files or scripts only when the task needs them. I keep the body to the workflow and move long references and rarely used detail into separate files, linked one level deep, to save context.

## When do you put logic in a script instead of instructions?
level: mid
For exact work: validating a file, summing numbers, converting formats, linting a configuration. The model handles judgement and wording, and the script returns short, specific output and an exit code. Scripts are read-only unless a write is needed, contain no secrets or downloads, and have tests.

## How do you test a skill?
level: mid
I write 10 to 20 realistic tasks with checklists of expected results, including awkward cases and requests that should not trigger the skill. I run them with and without the skill, measure quality, tokens and time, change one thing per iteration, and keep results with the version. I re-test after model or product changes.

## A skill never triggers. How do you debug it?
level: senior
I check discovery first: folder location, exact SKILL.md name and valid header. Then I test whether naming the skill explicitly works, which separates a description problem from a body problem. I compare the description with neighbouring skills, make it more specific with trigger phrases, and re-run my trigger tests.

## How do you manage skills across a team safely?
level: senior
Skills live in version control with an owner, review, a changelog and a test set. I treat skills from outside as untrusted code: read every file, check for network calls, downloads and shell commands, run in a sandbox first, pin a reviewed commit, and re-review on updates. Access is limited to what each skill needs.
