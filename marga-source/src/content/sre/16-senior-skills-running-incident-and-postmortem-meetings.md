---
title: Senior skills: running incident calls and post-mortem meetings
minutes: 12
summary: Lead a live incident call with clear roles and updates, and facilitate a blameless post-mortem meeting that produces owned, specific actions.
---

Technical skill finds the cause. Facilitation decides whether the group finds it quickly and learns from it afterward. Both the live incident call and the review meeting are skills you can practice.

## What you will learn

- Running an incident call: roles, cadence and decisions
- Keeping the room focused and calm
- Facilitating a blameless post-mortem meeting
- Turning discussion into actions that happen

## The incident call

Open with a single sentence of the problem and who is the **incident commander** (IC). The IC coordinates and decides; they do not debug. Assign a **scribe** to record a timeline, a **communications lead** to update stakeholders on a fixed cadence, and **subject experts** for each area. Use one channel for the call and one for the written record.

```yaml
incident_call:
  opening: "SEV2: checkout errors above 5 percent since 14:05. I am IC. Priya scribes. Omar on comms."
  cadence:
    internal_update_minutes: 15
    customer_update_minutes: 30
  rules:
    - "One person speaks at a time; the IC calls on experts."
    - "Say what you are about to do before you do it."
    - "Prefer mitigation (rollback, failover, scale) over finding root cause."
    - "Hand off the IC role explicitly after 60 to 90 minutes."
  closing: "State the mitigation, the next update time and who owns follow-up."
```

Repeat key facts ("so we agree: rollback of release 482 is running, next check in five minutes"), and keep side discussions out of the main call. Do not let theories become facts: label them as hypotheses and test the cheapest first. Call a break and hand over the role when people are tired.

## Calm and clear

Tone is contagious. Use plain language, avoid blame, and keep updates factual: what we know, what we do not know, what we are doing, when the next update comes. If executives join, give them a separate update channel so they do not pull the technical call off course.

## The post-mortem meeting

Send the draft timeline before the meeting, so the time is spent on understanding, not on reading. The facilitator (not the person who made the change) sets ground rules: blameless, curious, focused on systems and decisions. Ask "how did this make sense at the time?" and "what would have made it easier?" instead of "who caused it". Walk through the timeline, mark moments of detection, decision and recovery, and ask where information was missing. Capture contributing factors, not a single root cause.

## Actions that happen

Aim for a few, specific, owned actions, each with a date and a way to verify: "Add an alert on queue age above 5 minutes, owner Omar, by 30 April" is good; "improve monitoring" is not. Classify them as prevent, detect, mitigate or learn. Track them in the team's normal tracker and review completion at the next meeting. A post-mortem whose actions are not done is theatre.

```predict
Q: During a call, three engineers argue about the cause while the error rate stays high. What should the IC do?
???
Pause the debate, ask for the cheapest mitigation (such as rollback), assign one person per hypothesis to test, and set a short check-in time.
> Mitigate first, then investigate.
```

## Incident: The call with seven voices

> **Incident:** A major outage lasted 90 minutes, and the review found the fix was available at minute 20.

```console
$ grep -c "I think" incident-call-transcript.txt
64
$ grep -n "rollback" incident-call-transcript.txt | head -3
12: maybe rollback?
41: rollback might help
96: ok doing the rollback
```

Nobody was IC, several people investigated the same hypothesis, and the rollback suggestion was lost in the chatter. The company introduced the IC role, a written scribe timeline and a rule: if a recent change might be the cause, rolling it back is tried first unless there is a reason not to. The next outage with a bad release was fixed in 12 minutes.

## Common mistakes

- No clear IC, or an IC who also debugs
- Treating theories as facts
- Blaming people in the review
- Vague actions without owners or dates

```quiz
Q: What is the incident commander's main job?
+ Coordinate people and decisions, not debug
- Fix the bug personally :: Splits attention.
- Write the post-mortem alone :: Not their role.
- Stay silent :: They lead.
> Coordination keeps the call effective.

Q: Why favor mitigation over root cause during an incident?
+ Restoring service comes before full understanding
- Root cause is never needed :: It is needed later.
- Mitigation is always slower :: Often faster.
- To avoid documentation :: Still document.
> Stop the pain first.

Q: Which question fits a blameless review?
+ "How did this decision make sense at the time?"
- "Who made this mistake?" :: Blames a person.
- "Why were you careless?" :: Accusing.
- "Can we fire the owner?" :: Opposite of the aim.
> Look at systems and context.

Q: What makes an action item good?
+ Specific, with an owner, a date and a way to verify
- Vague and unowned :: Never done.
- A wish for better culture :: Not actionable.
- Anything the manager likes :: Not a criterion.
> Make it checkable.
```

```cards
Incident commander :: coordinates and decides, does not debug
Scribe and comms :: timeline and regular updates
Hypothesis :: a guess to test, not a fact
Blameless questions :: how did it make sense, what would have helped
Good action :: specific, owned, dated, verifiable
```
