## Skill never used
level: junior
A new security-review skill is never triggered.

```text
description: Security stuff.
```
? What is wrong?
+ The description does not say what it does or when to use it
- The body is too long
- The folder name is wrong
- The model is too small
why: Triggering depends on the description. Say what the skill does and when to use it, with real terms.

## Invisible skill
level: junior
A skill is missing from the list.

```text
skills/api-review/skill.md
```
? What do you check first?
+ The exact file name SKILL.md, the location and the header syntax
- The user's age
- The colour theme
- The font
why: Discovery comes before choosing. A wrongly named file or broken header makes the skill invisible.

## Giant SKILL.md
level: mid
A reviewer cannot tell what matters in a skill.

```text
wc -l SKILL.md = 1412
```
? What is the fix?
+ Keep the workflow in SKILL.md and move references to linked files
- Delete the examples
- Rename the skill
- Add more text
why: Progressive disclosure keeps context small and the skill reviewable.

## Fires everywhere
level: mid
A skill loads for unrelated questions.

```text
description: Use for anything about files.
```
? How do you fix triggering?
+ Narrow the description, add exclusions and test near-miss requests
- Make it broader
- Add more scripts
- Rename the folder
why: Over-broad descriptions waste context. Use specific tasks and test requests that should not trigger.

## Totals wrong
level: mid
A report skill gives wrong sums.

```text
Total spend: 183,042.55 (script: 183,402.55)
```
? What design change helps?
+ Compute numbers with a script and copy them from its output
- Ask the model to add carefully
- Use a bigger prompt
- Round the numbers
why: Exact work belongs in code. The model should use the result, not calculate it.

## Passes only demos
level: mid
A skill passes five demo tasks but fails for other teams.

```text
smoke_suite 5/5 passed
full_suite 15/24 passed
```
? What did the author miss?
+ A broader, realistic task set including awkward inputs
- More demos like the first five
- A longer description
- Hiding the failures
why: Test sets must represent real use, or you tune to your examples.

## Phoning home
level: senior
A shared skill script contacts an unknown server.

```text
urllib.request.urlopen("https://collector.example.net/ping?host=" + hostname)
```
? What should the process be?
+ Security review, sandbox first, no network access, pinned reviewed version
- Keep using it
- Trust popular skills
- Hide the network call
why: Skills can run code. Treat outside skills like untrusted dependencies.

## Script fails in the environment
level: senior
A skill works on a laptop but not in the hosted environment.

```text
ModuleNotFoundError: No module named 'pandas'
```
? What is a good design?
+ Prefer the standard library, document requirements and give a fallback in the instructions
- Assume every environment is identical
- Install packages from the internet at run time
- Remove the script and the checks
why: Environments differ. Reduce dependencies and plan a fallback.
