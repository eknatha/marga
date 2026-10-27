---
title: Disaster recovery exercises
minutes: 13
summary: Plan, run and learn from recovery drills: RTO and RPO, scenarios, safe execution and fixing what the drill reveals.
---

The recovery plan says "restore from backup in the secondary region". Nobody has done it, the credentials for the secondary account live on a laptop, and the backup tool changed its version last year. A plan that has not been exercised is a hope. Drills turn it into a capability and show the gaps while the stakes are low.

## What you will learn

- Recovery objectives: RTO, RPO and what they cost
- Types of exercises: tabletop, partial, and full failover
- Run a drill safely, with roles and a stop rule
- Turn findings into fixes

## Objectives first

**RTO** (recovery time objective) is how long you can be down. **RPO** (recovery point objective) is how much data you can lose, measured in time. A payment system may need an RTO of 15 minutes and an RPO of near zero, which needs replication and an automated failover. An internal report may accept an RTO of a day and an RPO of 24 hours, which a nightly backup can meet. Agree on objectives with the business per service, and write down what each one costs, because lower numbers mean more infrastructure and more practice.

## Kinds of exercises

Start small and grow:

1. **Tabletop**: a group talks through a scenario ("the primary region is gone") and follows the plan on paper. It finds missing steps, contacts and decisions cheaply.
2. **Component restore**: restore a database from backup into a clean environment, and check the data and the time taken.
3. **Partial failover**: move one non-critical service to the secondary region during working hours.
4. **Full failover**: switch real production traffic. Do this only when earlier steps are boring.

Run them regularly (for example once or twice a year for the important systems), and after big changes.

## Run it safely

Treat a drill like a change. Define the scenario and the success criteria (for example RTO 30 minutes, RPO 5 minutes), name a lead, a scribe and observers, and write down a **stop rule**: conditions under which you abort and go back. Announce the window to support and partners. During the drill, record timestamps for each step: detection, decision, start of recovery, first successful request, full service. Do not help the team with knowledge that a real responder would not have, or you will hide the gaps you came to find.

## Learn and fix

The most valuable output is a list of surprises: an expired credential, a missing DNS record, a runbook step that needs a person who is on holiday, a restore that took four hours not one. Write them up blamelessly, give each one an owner and a date, and repeat the exercise to prove the fixes. Track measured recovery time and data loss against the objectives over time. If you cannot meet an objective, either invest to improve the system or change the objective openly.

```predict
Q: A restore drill shows an RTO of 4 hours against a target of 1 hour. What are your options?
???
Improve the process or the design (automation, replication, faster storage) until it meets the target, or agree a new target with the business. Do not leave the gap undocumented.
> Objectives must match what you can actually do.
```

## Incident: The restore that took two days

> **Incident:** After a storage failure in a test environment, restoring the main database from backup took two days instead of the planned two hours.

```console
$ time pgbackrest --stanza=main restore
...
real    1612m41s
$ pgbackrest info | grep "database size"
database size: 4.1TB
```

The plan had been written when the database was 300 GB. It had grown to 4.1 TB, and the restore went through a single slow link. The team added regional restore targets with faster disks, switched to incremental backups with delta restore, and introduced a quarterly timed restore with an alert if it grows beyond 80 percent of the RTO. They also moved the credentials for the secondary account into the secret manager that works during a primary region outage.

## Common mistakes

- Never exercising the plan
- Success criteria that are not measurable
- Helping the team during the drill so gaps stay hidden
- Not fixing the findings, or not repeating the test

```quiz
Q: What does RPO measure?
+ How much data you can afford to lose, expressed as time
- How long you can be down :: That is RTO.
- How many servers you need :: Not an objective.
- How fast the network is :: Unrelated.
> RPO is about data loss.

Q: Which exercise is the cheapest way to find missing steps?
+ A tabletop discussion
- A full production failover :: It is expensive and risky.
- Nothing, trust the plan :: The plan is untested.
- Rebuilding the data centre :: Far too costly.
> Start with conversations and small restores.

Q: What is a stop rule?
+ A condition that tells the team to abort the drill and return to normal
- A rule that stops monitoring :: Monitoring stays on.
- A ban on drills :: The opposite.
- A way to delete backups :: It has nothing to do with backups.
> Safety conditions come before the drill.

Q: What is the best output of a drill?
+ A list of surprises with owners and dates, followed by a repeat test
- A successful press release :: It does not improve recovery.
- No findings :: A drill without findings is suspicious.
- A bigger budget :: Budget is not the output.
> Fix and prove it again.
```

```cards
RTO :: how long you can be down
RPO :: how much data you can lose
Exercise ladder :: tabletop, restore, partial failover, full failover
Before the drill :: success criteria and a stop rule
After the drill :: fix findings and repeat
```
