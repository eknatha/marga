---
title: Blameless postmortems and toil
minutes: 15
summary: Learn from incidents without blame, write postmortems that produce real fixes, and identify and eliminate toil.
---

An incident that teaches nothing will repeat. The postmortem turns a bad night into lasting improvement, but only if people feel safe describing what actually happened. And between incidents, the daily drudgery called toil quietly consumes the time you would need to prevent the next one.

## What you will learn

- What blameless means and why it matters
- The structure of a useful postmortem
- Writing action items that get done
- Defining and reducing toil

## Blameless does not mean accountability-free

Complex systems fail because of many contributing factors, not a single careless person. If people are punished for mistakes, they hide them, and the organization loses the knowledge it needs. **Blameless** means we ask "how did our systems, processes and tooling make this mistake easy and its impact large?" rather than "who did it?"

> **Why it matters:** If an engineer ran a command that took down production, the useful question is why a single command could do that without a confirmation, a dry run, a limited blast radius or a review. Fix the system and the next person is protected, whoever they are.

Accountability remains. It shows up as owned, tracked action items, not as individual blame.

## Structure of a postmortem

| Section | Content |
|---------|---------|
| **Summary** | Two or three sentences: what broke, for how long, who was affected |
| **Impact** | Users, requests, revenue, SLO budget consumed |
| **Timeline** | Timestamped events: detection, escalations, actions, recovery |
| **Root causes and contributing factors** | The chain of conditions that allowed the incident |
| **What went well / badly / where we got lucky** | Honest reflection, including luck |
| **Action items** | Concrete, owned, dated changes |
| **Lessons learned** | What others can learn |

Write it within a few days while memories are fresh. For SEV1 and SEV2 incidents, hold a short review meeting, and publish the document widely so other teams learn from it.

## Finding causes without stopping early

Use a "five whys" style chain, but treat it as a way to explore branches, not to find one "root cause".

```text
Why did checkout fail?            The inventory service returned errors.
Why did it return errors?         Its database connection pool was exhausted.
Why was the pool exhausted?       A new query held connections for 6 seconds.
Why did the query take 6 seconds? A missing index on a new column.
Why did it reach production?      Load tests used a small dataset; no query-plan check in CI.
Why was there no alert earlier?   No saturation alert on connection pools.
```

Each answer reveals a gap you can close: a missing index, a test that did not reflect production data, and missing monitoring. Stopping at "a developer forgot an index" would have fixed nothing systemic.

## Action items that get done

Weak: "Improve monitoring." Strong:

| Action | Type | Owner | Due |
|--------|------|-------|-----|
| Add an alert for connection pool saturation above 80% for 5 minutes | Detect | Dana | 2026-11-07 |
| Add a CI step that fails on queries with full table scans in test | Prevent | Arun | 2026-11-21 |
| Document the rollback steps in the runbook and rehearse once | Mitigate | Mei | 2026-11-14 |

Prefer actions that prevent, detect or reduce impact over "be more careful", which is not a control. Track them in the same system as your regular work, and review completion. A postmortem whose actions are never done is theatre.

## Toil

**Toil** is work that is manual, repetitive, automatable, tactical (reactive), without lasting value, and that grows as the service grows. Restarting a stuck job by hand every week, manually creating accounts, copying certificates: all toil.

Not toil: engineering projects, design, and the overhead of meetings and planning. Toil is specifically the repetitive operational work that a machine could do.

| Reducing toil | Example |
|---------------|---------|
| Automate the task | A script or controller replaces the manual procedure |
| Remove the cause | Fix the bug that makes the job stick, rather than restarting it |
| Self-service | Give developers a tool to do the task without a ticket |
| Stop doing it | Some tasks provide no value |

A common guideline is to keep toil **below about half** of an operations engineer's time, and to put the rest into engineering that reduces future toil. Measure it: ask the team to tag time spent, and rank sources of toil by hours per month. Automate the biggest first, and where automation costs more than the toil will ever, do not.

## Incident: the same outage three times

> **Incident:** An expired TLS certificate takes down the customer portal. It is the third certificate expiry in 18 months. The previous two postmortems each recorded the action "be more careful with renewals".

The action items never changed the system, so the system produced the same result. Review the earlier documents and look for what a real fix would have been:

- **Detect**: alert when any certificate expires in under 21 days, from an external check of the live endpoints
- **Prevent**: automate issuance and renewal so no human is in the loop
- **Reduce impact**: inventory every certificate and its owner

```console
$ echo | openssl s_client -connect portal.example.com:443 -servername portal.example.com 2>/dev/null | openssl x509 -noout -enddate
notAfter=Nov 11 09:00:00 2026 GMT
```

A scheduled check like this one, run against every public hostname, gives early warning. Replace the vague action with the three concrete ones, give them owners and dates, and add the certificate renewal to the toil list with a target of zero manual steps. The fourth occurrence never happens.

## Common mistakes

- Naming a person as the cause
- Stopping at one "root cause"
- Vague actions with no owner or date
- Writing the postmortem and never reading it again
- Letting toil crowd out all engineering time

```quiz
Q: What does blameless mean in a postmortem?
- Nobody is accountable
+ The focus is on how systems and processes allowed the failure, not on punishing individuals
- Mistakes are ignored
- Only managers speak
> Accountability is expressed through owned action items, not blame.

Q: Which action item is best?
- Be more careful
+ Add an alert for pool saturation above 80%, owner Dana, due in two weeks
- Improve things
- Review monitoring someday
> Good actions are specific, owned and dated.

Q: Which of these is toil?
- Designing a new service
+ Manually restarting a stuck job every week
- Writing a design doc
- Learning a new tool
> Toil is repetitive, manual, automatable operational work that grows with the service.

Q: Why is it a problem to stop at one root cause?
- It saves time
+ Incidents usually have several contributing factors, and fixing only one leaves gaps
- Postmortems must be short
- Causes do not matter
> Complex failures involve a chain of conditions, each a chance to improve.
```

```cards
Purpose of a blameless postmortem? :: Learn how the system allowed the failure, without punishing individuals
Good action item traits? :: Specific, owned, dated and aimed at preventing, detecting or reducing impact
Definition of toil? :: Manual, repetitive, automatable, reactive work that grows with the service
Guideline for toil share? :: Keep it below about half of an operations engineer's time
```
