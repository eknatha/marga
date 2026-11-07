---
title: Senior skills: writing design docs and RFCs
minutes: 12
summary: Write short design documents that state the problem, options and trade-offs, get useful review early, and record decisions so future engineers know why.
---

At a senior level your output is increasingly decisions, not code. A design document is how you make a decision visible, test it against other people's knowledge and leave a record. A good one is short, specific and honest about what is uncertain.

## What you will learn

- When a design doc is worth writing
- A structure that readers can scan
- How to present options and trade-offs fairly
- Running review and recording the decision

## When to write one

Write a design document when a change is hard to reverse, affects several teams, has security or cost impact, or when you cannot explain the approach in a few sentences. Skip it for small, reversible changes where a pull request description is enough. The cost of a document is a day or two; the cost of a wrong design discovered after launch is months.

## A structure that works

```yaml
title: "Move session storage to a managed cache"
status: draft            # draft, in review, accepted, rejected, superseded
authors: ["A. Rao"]
reviewers: ["platform", "security", "checkout"]
sections:
  - context: "Why now. What is broken or missing. One paragraph."
  - goals: "What success looks like, with numbers where possible."
  - non_goals: "What this design deliberately does not solve."
  - proposal: "The chosen design in enough detail to build and review."
  - alternatives: "Two or three real options and why they lost."
  - risks: "What could go wrong, how we will notice, how we roll back."
  - rollout: "Steps, owners, dates, and the decision points."
  - open_questions: "What we do not know yet."
```

Start with the **context and goals**, because reviewers cannot judge a solution without the problem. State **non-goals** to stop scope creep. Put a short summary at the top that a busy executive can read in one minute. Use a diagram for flows and failure paths, and prefer concrete numbers (traffic, data size, latency, cost) over adjectives.

## Options and trade-offs

The most useful section is **alternatives**. Present real options, including "do nothing" and a simpler one, with the same criteria for each: effort, risk, cost, operational burden, reversibility. Say why you prefer yours and what would change your mind. A document with one option reads as a decision already made, and reviewers disengage. Be honest about weaknesses of your own proposal; you will be trusted more.

## Review and decision

Share early as a draft, ask named people for specific input ("security: does this meet the key-handling rule?"), and set a review deadline. Respond to every comment, even with "not doing this because...". Hold a short meeting only for unresolved points. When the decision is made, change the status, record the date and who decided, and link the document from the code or repository. An **architecture decision record** (a one-page summary per decision) is useful for the long term.

```predict
Q: Reviewers keep asking "why not use the managed service?" in a design that did not mention it. What was missing?
???
The alternatives section. Add the managed option with fair criteria and a clear reason for the choice.
> Reviewers will supply the options you did not.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Senior skills: writing design docs and RFCs fits together
node: n1 | When to write one | 0 | 0 | Write a design document when a change is hard to reverse, affects several teams, has security or cost impact, or when you cannot explain the approach in a few sentences. | Writing a design after the code is done. | process
node: n2 | A structure that works | 1 | 1 | Start with the context and goals, because reviewers cannot judge a solution without the problem. | Burying the key decision in a long document. | process
node: n3 | Options and trade-offs | 2 | 0 | The most useful section is alternatives. | One option, presented as the only one. | process
node: n4 | Review and decision | 3 | 1 | Share early as a draft, ask named people for specific input ("security: does this meet the key-handling rule?"), and set a review deadline. | No named reviewers and no deadline. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The design nobody read

> **Incident:** A 30-page design for a new deployment system was circulated on Friday and approved on Monday with two comments, and then a month later the on-call team refused to run it.

```console
$ wc -w deployment-system-design.md
11840 deployment-system-design.md
$ grep -c "rollback" deployment-system-design.md
2
```

The document was long, buried the key decision on page 14, had no alternatives section and no named reviewers, so the on-call team never saw it. After launch they found there was no easy rollback. The author rewrote it as a five-page document with a one-page summary, risks and rollback, asked the on-call team and security for explicit review, and the second version found three real issues before any code shipped.

## Common mistakes

- Writing a design after the code is done
- One option, presented as the only one
- Burying the key decision in a long document
- No named reviewers and no deadline

```quiz
Q: When is a design document most valuable?
+ When the change is hard to reverse or affects several teams
- For every small typo fix :: Overkill.
- Never, code is enough :: Misses shared understanding.
- Only after launch :: Too late.
> Use documents where mistakes are expensive.

Q: Why list non-goals?
+ To prevent scope creep and set expectations
- To make the document longer :: Not the purpose.
- To hide risks :: Opposite.
- To skip review :: Opposite.
> Boundaries keep the design focused.

Q: What makes the alternatives section useful?
+ Real options compared with the same criteria
- A weak option to make yours look good :: Reviewers notice.
- A list of tools without analysis :: Not useful.
- Leaving it empty :: Invites repeated questions.
> Fair comparison builds trust.

Q: What should happen once a decision is made?
+ Update the status, record who and when, and link it from the code
- Delete the document :: Loses history.
- Keep it private :: Others need the reasoning.
- Rewrite it each year :: Not required.
> Decisions need a durable record.
```

```cards
Design doc trigger :: hard to reverse, cross-team, risky or costly
Core sections :: context, goals, non-goals, proposal, alternatives, risks, rollout
Alternatives :: real options and the same criteria
Early review :: named reviewers, specific questions, a deadline
Decision record :: status, date, decider, link
```
