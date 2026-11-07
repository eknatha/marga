---
title: Senior skills: influencing without authority and managing stakeholders
minutes: 11
summary: Get cross-team work done by understanding what others need, building a case with evidence, negotiating trade-offs and keeping stakeholders informed without surprises.
---

Most important reliability and platform work crosses team boundaries, and you rarely control the people whose cooperation you need. Influence is the ability to move work forward through trust, clarity and shared goals rather than through rank.

## What you will learn

- Map stakeholders and what each one cares about
- Build a case with evidence and options
- Negotiate and say no with alternatives
- Keep people informed, and handle conflict calmly

## Map the people

For any initiative, list who is affected, who decides, who can block and who can help. For each one, note what they want and what they fear: a product manager wants delivery dates, a security lead wants fewer exposed credentials, an on-call engineer wants fewer pages, finance wants predictable cost. Your proposal should answer each one's concern in their language. Talk to important stakeholders before any meeting, so nobody is surprised publicly.

```yaml
stakeholders:
  - name: "Checkout team lead"
    role: "can block"
    wants: "No change freeze during the sale"
    worry: "Migration risk before peak season"
    plan: "Offer rollout after the sale and a canary on the staging flow"
  - name: "Security"
    role: "decides"
    wants: "Short-lived credentials"
    worry: "Exceptions that become permanent"
    plan: "Show audit logs and expiry enforced by the platform"
  - name: "Finance partner"
    role: "informed"
    wants: "Forecast within 10 percent"
    worry: "Surprises in the bill"
    plan: "Monthly cost note with unit costs"
```

## Build the case

Lead with the problem and its cost to the listener: pages per week, hours lost, risk to revenue, audit findings. Use data from your own systems, one clear chart or number, not ten. Present options with trade-offs and your recommendation, and ask for a specific decision ("I need approval for two engineers for one quarter"). Start with a small pilot that proves value and lowers the risk of saying yes. Make the first step easy and reversible.

## Negotiate and decline well

Understand the interest behind a demand: "we need this by Friday" may really mean "we have a customer demo". Look for options that serve the interest at a lower cost. When you must say no, say it early, explain the constraint and offer an alternative: "We cannot build the full tool this quarter. We can give you a script and a runbook now, and schedule the tool for next quarter." Be consistent: use the same criteria for everyone's requests, such as risk, user impact and effort, and show the queue so people see the trade-off.

## No surprises

Share bad news early with your plan: "The migration is two weeks late because of X. Here are the options." Send short, regular updates in a stable format (status, risks, decisions needed). Write down agreements and send a summary after meetings. In conflicts, separate the people from the problem, restate the other side's view fairly before disagreeing, and escalate only after trying direct conversation, and with the other party informed.

```predict
Q: A team refuses to adopt your new logging standard. What should you do before escalating?
???
Ask why. Learn their constraints, address them (tooling, migration help, a pilot), and show the benefit in their terms. Escalate only if that fails, and tell them first.
> Understand the objection first.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Senior skills: influencing without authority and... fits together
node: n1 | Map the people | 0 | 0 | For any initiative, list who is affected, who decides, who can block and who can help. | Surprising stakeholders with bad news late. | process
node: n2 | Build the case | 1 | 1 | Lead with the problem and its cost to the listener: pages per week, hours lost, risk to revenue, audit findings. | Describing your needs, not theirs. | process
node: n3 | Negotiate and decline well | 2 | 0 | Understand the interest behind a demand: "we need this by Friday" may really mean "we have a customer demo". | Springing proposals on people in meetings. | client
node: n4 | No surprises | 3 | 1 | Share bad news early with your plan: "The migration is two weeks late because of X. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The mandate that was ignored

> **Incident:** A platform team announced a mandatory new CI template by email, and six months later only three of forty teams had adopted it.

```console
$ grep -l "legacy-ci-template" teams/*/pipeline.yaml | wc -l
37
```

The announcement described what the platform team wanted, not what teams gained, and ignored the teams' real obstacles: special build steps and no time for migration. After interviews, the platform team added support for custom steps, offered migration help and a clear benefit (builds 40 percent faster in a pilot), and published a dashboard of adoption without shaming anyone. Within a quarter thirty teams had moved voluntarily.

## Common mistakes

- Springing proposals on people in meetings
- Describing your needs, not theirs
- Saying no without an alternative
- Surprising stakeholders with bad news late

```quiz
Q: Why talk to stakeholders before a meeting?
+ To learn their concerns and avoid public surprises
- To avoid the meeting :: Not the aim.
- To hide the plan :: Not the aim.
- To delay the project :: Not the aim.
> Pre-wiring builds trust.

Q: What is a strong way to present a proposal?
+ Problem and cost, options, a recommendation and a clear decision request
- Only technical details :: Misses the decision.
- A long list of tools :: Not persuasive.
- A demand without evidence :: Weak.
> Make it easy to decide.

Q: How should you decline a request?
+ Early, with the reason and an alternative
- Late and without a reason :: Damages trust.
- By ignoring it :: Worse.
- By promising and delaying :: Dishonest.
> Offer options along with the no.

Q: A stakeholder resists change. What first?
+ Find out their concern and address it
- Escalate immediately :: Burns trust.
- Ignore them :: Resistance grows.
- Force it through :: Fails later.
> Understand before escalating.
```

```cards
Stakeholder map :: who decides, blocks, helps, and what each wants
Case :: problem cost, evidence, options, recommendation, decision request
Pilot :: small, reversible proof of value
No surprises :: share bad news early with a plan
Interest vs position :: ask what the demand is really for
```
