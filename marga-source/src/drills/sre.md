## The budget is spent
level: junior
A team has a 99.9% availability SLO over 30 days. The release calendar is full.

```text
SLO:            99.9% over 30 days
Error budget:   43.2 minutes
Downtime so far this window:  51 minutes (a bad deploy and a database failover)
Days left in window: 12
```
? What should the team do according to a sensible error budget policy?
+ Slow or pause risky feature releases and spend the time on reliability work until the budget recovers
- Ignore the number because the SLO is only internal
- Raise the SLO to 99.99% immediately
- Release faster to make up for lost time
why: The budget is overspent by about eight minutes. An error budget policy agreed in advance says what happens in that case, usually a freeze of risky changes and priority for fixes that prevent repeat failures. The aim is not to punish anyone but to share an evidence-based rule about the balance of speed and stability.

## Five people, five changes
level: mid
During an outage, several engineers are trying fixes at the same time in the incident channel.

```text
10:02 anna:  restarting the api pods
10:03 raj:   rolling back the last deploy
10:03 mei:   scaling the database up
10:04 sam:   flushing the cache
10:05 anna:  errors are lower? or is it raj's rollback?
```
? What is the best way to improve the response?
+ Name an incident commander, assign roles, and make one change at a time with a record of what was done
- Let everyone keep trying changes, since more attempts find the fix sooner
- Wait for the manager to arrive before doing anything
- Stop communicating until the cause is known
why: Parallel, unrecorded changes make it impossible to know what helped or hurt. An incident commander coordinates, an operator makes the change, and a scribe keeps the timeline. Prefer reversible mitigation, such as rollback, first and confirm its effect before the next step. This also makes the postmortem much easier.

## Which action item is good
level: mid
A postmortem for a deployment outage lists these follow-up actions.

```text
1. Engineers should be more careful when deploying.
2. Add a canary stage that stops rollout when the error rate rises (owner: platform team, due: 15 Nov).
3. Remind everyone to read the runbook.
4. Discuss deployment safety at the next team meeting.
```
? Which action is the strongest?
+ Action 2, because it is specific, owned, dated and changes the system
- Action 1, because people cause outages
- Action 3, because documentation always prevents problems
- Action 4, because discussion is enough
why: Good actions remove or reduce the risk by changing the system, and have an owner and a date. "Be more careful" blames people and cannot be checked. A canary with an automatic stop turns a human worry into a safeguard. Track actions to completion, since postmortems that do not change anything repeat the incident.

## Burn rate alert after a bad deploy
level: mid
An SLO of 99.9 percent over 30 days is in place. Right after a release, the error rate jumps.

```text
SLO: 99.9% success over 30 days (error budget: 43.2 minutes)
Error rate since 14:00: 3% for 40 minutes
Budget used this window: 78%
```
? What should the team do first?
+ Roll back or stop the release to protect the remaining budget, then investigate, and pause risky changes if the budget runs out
- Raise the SLO to 99.99 percent
- Hide the dashboard until the end of the month
- Add more alerts and keep deploying
why: A 3 percent error rate is 30 times the allowed 0.1 percent rate, so the budget burns fast. Mitigation comes before diagnosis: roll back or turn off the change. The error budget policy then guides the rest, for example freezing feature work until reliability recovers.

## Postmortem blames a person
level: mid
A draft postmortem for an outage says that an engineer ran the wrong command and should be more careful.

```text
Root cause: Engineer typed the wrong cluster name.
Action items:
  1. Remind everyone to double check commands.
```
? How should the document be improved?
+ Describe how the system allowed the mistake, for example a lookalike name and no confirmation, and add action items that change tooling, with owners and dates
- Keep the draft and add the engineer's name in bold
- Delete the document to keep the team calm
- Add more reminders to double check
why: People will always make mistakes, so a reminder is not a control. A blameless review asks why the action was easy and the consequence large. Good action items change the system: guard rails for production contexts, confirmations, smaller blast radius, and a faster rollback, each with an owner and a date.

## Alert fires but nothing is wrong
level: mid
An alert pages the on-call every night at 02:00 and resolves itself.

```text
Alert: DiskUsageHigh on batch-3 (> 85%)
Pattern: fires at 02:00 during the nightly job, falls to 40% at 02:30
Pages in last 30 days: 29, actions taken: 0
```
? What is the best change?
+ Remove the page. Use a forecast or a rate-based alert on time until full, or a ticket for the nightly peak, and fix the cause if the job is wasteful
- Ask the on-call to ignore it
- Raise the threshold to 99 percent
- Add a second person to the rotation
why: An alert that fires with no action is toil and trains people to ignore pages. The disk does recover, so a better signal is whether it will fill before cleanup. Review alerts regularly and delete or downgrade ones that do not need a human.

## Release causes a latency regression
level: mid
After a release, the p99 latency doubles but errors stay at zero.

```text
SLO: 99% of requests under 800 ms over 28 days
Before: p99 610 ms   After release v3.4: p99 1290 ms
Error budget used this week: 62%
```
? What should the team do first?
+ Roll back or pause the rollout to protect the budget, then find the cause. Latency counts against the SLO even with no errors
- Wait to see if it improves
- Change the SLO to 99 percent under 2 seconds
- Remove the dashboard
why: A latency SLO is about user experience, so slow successes burn the budget. Reduce impact first by rolling back. Then bisect the changes, check dependencies and database queries, and decide through the error budget policy whether to freeze other releases.
