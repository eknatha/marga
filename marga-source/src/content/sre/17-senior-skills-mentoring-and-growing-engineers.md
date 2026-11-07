---
title: Senior skills: mentoring and growing other engineers
minutes: 11
summary: Help engineers grow through good questions, deliberate delegation, useful feedback and code and design reviews that teach, without doing their work for them.
---

Your impact as a senior engineer is measured partly by how much stronger the people around you become. Mentoring is not giving answers faster; it is helping others build judgment so they need you less over time.

## What you will learn

- Setting up a mentoring relationship with a clear goal
- Teaching through questions, pairing and stretch work
- Giving feedback that is specific and kind
- Reviews and delegation as growth tools

## Start with goals

In the first conversation ask what the person wants in the next six to twelve months: a skill, a role, more scope, a certification. Agree on how often to meet (30 minutes every week or two is plenty), what each of you will prepare, and how you will know it works. Mentoring is a relationship with a purpose, not a social chat, though trust matters. Different people need different support: new joiners need orientation, mid-level engineers need scope and feedback, senior engineers need sponsorship and strategic perspective.

## Teach with questions and pairing

When someone brings a problem, resist solving it immediately. Ask: "What have you tried? What do you expect to see? What would you check next?" The goal is to model a debugging method, not to display your knowledge. Pair on tasks and let the mentee drive, with you narrating your reasoning when you do take over. Share your mistakes and how you recovered, since it shows that errors are normal and fixable. Point to documents and tools, then ask them to improve the document afterwards.

## Stretch and delegate

Growth happens just beyond comfort. Give a task that is slightly bigger than the last one, with clear outcomes, boundaries and checkpoints, and stay available. Delegation is more than handing off work: explain the why, agree on what "good" looks like, agree when to check in, and let them own decisions within the boundaries. If the result is different from what you would do but works, accept it. Take the blame for failures publicly and share the credit for successes.

## Feedback that works

Make it timely, specific, about behavior and impact, and offer a path forward. Use a simple pattern: situation, behavior, impact, next step.

```yaml
feedback:
  situation: "In yesterday's incident call"
  behavior: "You posted the rollback plan in the channel before asking the IC"
  impact: "The IC lost track of who owned the step and two people ran it"
  next_step: "Say the plan out loud to the IC first, then post it. Let's practice in the next game day."
  also_good: "Your timeline notes were the clearest I have seen."
```

Give positive feedback with the same specificity, since people repeat what is named. Ask for feedback on yourself too.

## Reviews that teach

In code and design reviews, separate must-fix from suggestions and learning notes, explain the reason ("this retry has no backoff, which can overload the service during an outage"), and ask questions ("what happens when the queue is full?"). Link to material. Praise good decisions. A review that only lists defects teaches fear; one that explains principles teaches judgment.

```predict
Q: A junior asks how to fix a failing deployment. You know the answer in ten seconds. What do you do?
???
Ask what they have checked and what the logs say, guide them to the next check, and let them find it. Give the answer only if time is critical, and explain how you got there.
> Teach the method, not just the answer.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Senior skills: mentoring and growing other... fits together
node: n1 | Start with goals | 0 | 0 | In the first conversation ask what the person wants in the next six to twelve months: a skill, a role, more scope, a certification. | Vague feedback ("do better") or only negative feedback. | process
node: n2 | Teach with questions and pairing | 1 | 1 | When someone brings a problem, resist solving it immediately. | Solving everything yourself. | process
node: n3 | Stretch and delegate | 2 | 0 | Growth happens just beyond comfort. Give a task that is slightly bigger than the last one, with clear outcomes, boundaries and checkpoints, and stay available. | Delegating a task without context or boundaries. | process
node: n4 | Feedback that works | 3 | 1 | Make it timely, specific, about behavior and impact, and offer a path forward. | Reviews that only list defects. | process
node: n5 | Reviews that teach | 4 | 0 | In code and design reviews, separate must-fix from suggestions and learning notes, explain the reason ("this retry has no backoff, which can overload the service during... | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
```

## Incident: The helpful rescuer

> **Incident:** A senior engineer fixed every problem that a new teammate brought, and after a year the teammate still could not handle an on-call shift alone.

```console
$ git shortlog -sn --since="1 year ago" -- services/billing | head -3
   412 senior.engineer
    38 new.teammate
```

The senior engineer worked quickly and meant well, but the teammate never practiced. When the senior left on holiday, the team had a billing incident and nobody dared to act. In the follow-up they set up a plan: the teammate shadowed on-call, then led with the senior as backup, then took a shift alone with a written escalation path. Within three months the teammate handled incidents calmly, and the senior had time for larger design work.

## Common mistakes

- Solving everything yourself
- Vague feedback ("do better") or only negative feedback
- Delegating a task without context or boundaries
- Reviews that only list defects

```quiz
Q: What is a good first step in a mentoring relationship?
+ Agree on the mentee's goals and meeting rhythm
- Assign random tasks :: No direction.
- Avoid planning :: Aimless.
- Review their salary :: Not the point.
> A clear purpose comes first.

Q: Why ask questions instead of giving the answer at once?
+ It builds the mentee's own debugging method
- It hides your knowledge :: Not the aim.
- It saves time always :: Often slower short term.
- It avoids responsibility :: Not the aim.
> Teach the process.

Q: Which feedback is most useful?
+ Specific behavior, its impact and a next step
- "You need to be better" :: Vague.
- A public criticism :: Harmful.
- No feedback :: Wastes learning.
> Make it concrete.

Q: How should you delegate a stretch task?
+ Explain why, define good, set checkpoints and let them decide within bounds
- Hand it over with no context :: Likely to fail.
- Watch and redo it :: Undermines trust.
- Delegate only trivial work :: Little growth.
> Clear ownership with support.
```

```cards
Goals first :: agree on what the mentee wants to reach
Questions :: what have you tried, what do you expect, what next
Stretch task :: slightly bigger than last time, with checkpoints
Feedback pattern :: situation, behavior, impact, next step
Teaching review :: reasons, questions and praise, not only defects
```
