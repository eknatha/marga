---
title: Security champions and secure code review
minutes: 12
summary: Spread security through teams with champions, practical code review checklists, threat modeling and feedback loops that developers value.
---

A small security team cannot review every change. The scalable approach is to make security a normal part of how teams build, with a few trained people in each team and simple practices everyone can follow.

## What you will learn

- What security champions do and what they do not
- A practical secure review checklist
- Lightweight threat modeling for new features
- Using findings to improve defaults

## Champions

A **security champion** is a developer or operator in a product team who has a bit of time and training to help with security questions, reviews and triage. They are not responsible for all security, and they are not a gatekeeper. The program needs management support, a regular meeting, shared learning and a way to escalate to the security team.

## A review checklist

Keep it short enough that people use it:

- **Authentication and authorization:** is every endpoint checked, including object ownership?
- **Input:** is all input validated, and queries parameterized?
- **Secrets:** nothing in code, logs or error messages?
- **Data:** is sensitive data minimized, encrypted and not logged?
- **Dependencies:** new packages reviewed, pinned and scanned?
- **Failure:** do errors reveal internals, and does failure fail closed?

```markdown
## Security review (PR template)
- [ ] New or changed endpoints have authorization tests
- [ ] No secrets or personal data in code or logs
- [ ] New dependencies are pinned and scanned
- [ ] Threat model updated if data flow changed
```

## Quick threat modeling

For each new feature, spend thirty minutes asking four questions: what are we building, what can go wrong, what will we do about it and did we do a good job. Draw the data flow, mark trust boundaries and list the top three risks with a mitigation each.

## Improve the platform

Track what keeps recurring. If many findings are the same mistake, fix it in a shared library, template or pipeline check rather than in each service. Share incidents blamelessly as short stories, and celebrate good catches.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Security champions and secure code review fits together
node: n1 | Champions | 0 | 0 | A security champion is a developer or operator in a product team who has a bit of time and training to help with security questions, reviews and triage. | A champion program with no time or support. | process
node: n2 | A review checklist | 1 | 1 | Keep it short enough that people use it. | - Failure: do errors reveal internals, and does failure fail closed? | observe
node: n3 | Security review (PR template) | 2 | 0 | [ ] New or changed endpoints have authorization tests. | Check the Common mistakes list below this diagram for what usually goes wrong here. | security
node: n4 | Quick threat modeling | 3 | 1 | For each new feature, spend thirty minutes asking four questions: what are we building, what can go wrong, what will we do about it and did we do a good job. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n5 | Improve the platform | 4 | 0 | Track what keeps recurring. If many findings are the same mistake, fix it in a shared library, template or pipeline check rather than in each service. | Never fixing recurring issues at the platform level. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
```

## Incident: Caught in review, not in a pentest

> **Incident:** A missing ownership check was found in code review.

```console
PR #2381: GET /exports/{id}
champion comment: where do we check the export belongs to the caller?
fixed before merge, test added
```

The champion used the checklist and noticed the missing check, which would have exposed other customers' files. The fix and test took minutes. The team then added a reusable ownership check helper to the shared library.

## Common mistakes

- A champion program with no time or support
- Checklists too long to use
- Treating champions as gatekeepers
- Never fixing recurring issues at the platform level

```quiz
Q: What do champions do?
+ Help their team with security
- Replace the security team :: No.
- Block all releases :: No.
- Write all code :: No.
> A bridge to the experts.

Q: Why keep checklists short?
+ People will actually use them
- They are cheaper :: No.
- They hide risk :: No.
- They are required :: No.
> Adoption matters. The lesson section above explains why.

Q: What does threat modeling ask?
+ What can go wrong and what we will do
- Which colour to use :: No.
- Who to blame :: No.
- When to deploy :: No.
> A short structured discussion.

Q: How reduce repeat findings?
+ Fix them in shared libraries and templates
- Ignore them :: No.
- Add more reports :: No.
- Blame teams :: No.
> Fix the platform. The lesson section above explains why.
```

```cards
Security champion :: Team member who promotes security practices
Threat modeling :: Finding and planning for what could go wrong
Trust boundary :: Line where data changes trust level
Fail closed :: Deny access when a check fails
```
