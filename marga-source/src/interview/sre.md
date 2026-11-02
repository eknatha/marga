## What is the difference between SLI, SLO and SLA?
level: junior
An SLI is a measurement of service behaviour, such as the proportion of successful requests. An SLO is the internal target for that measurement, such as 99.9 percent over 30 days. An SLA is an external agreement with customers that includes consequences, such as credits, when it is not met. SLOs should be stricter than SLAs.

## What is an error budget and how is it used?
level: mid
It is the amount of unreliability the SLO allows: a 99.9 percent target over 30 days permits about 43 minutes of failure. While budget remains, the team can ship changes and take risks; when it is nearly spent, they slow releases and prioritise reliability work. It turns the conflict between features and stability into an agreed, measurable rule.

## Walk me through how you would handle a major production incident.
level: mid
Acknowledge the page, assess impact and severity, open a dedicated channel and name an incident commander. Mitigate first with a rollback, failover or feature flag rather than debugging live. Keep one change at a time, communicate on a regular schedule with impact, status and next steps, and keep a timeline. After recovery, confirm metrics, hand over, and hold a blameless postmortem with tracked actions.

## What makes a good blameless postmortem?
level: mid
It describes what happened with a factual timeline, impact, contributing factors and what went well, without blaming individuals. It asks why the system allowed the mistake to cause harm. Actions must be specific, owned and tracked, such as new alerts, safer defaults or automation, and the document is shared widely so others learn.

## What is toil and how do you reduce it?
level: junior
Toil is manual, repetitive, automatable work that scales with service growth and brings no lasting value, such as restarting services or handling routine requests. Measure it, cap the share of time spent on it (often around 50 percent), and automate the biggest sources first. Eliminating toil frees time for engineering that improves reliability.

## How do you design on-call to be sustainable?
level: mid
Use a rotation large enough to share the load, with primary and secondary roles, clear handoffs and fair compensation. Page only on urgent, actionable, symptom-based alerts, link each to a runbook, review every page weekly and fix or remove noisy alerts. Track pages per shift and aim for a small number of incidents each shift.

## How do you do capacity planning?
level: senior
Measure peak demand and growth, load-test to find the throughput per unit at the SLO, and size for peak plus headroom and N+1 or zone-loss redundancy. Consider lead times and quotas, test shared dependencies such as databases as well as the stateless tier, and tie forecasts to business events. Review utilisation regularly for both risk and cost.

## What is chaos engineering and how do you start safely?
level: senior
It is running controlled experiments to learn how a system behaves under failure. Define steady state, state a hypothesis, limit the blast radius, set an abort condition and announce the test, then inject a failure such as killing a Pod or adding latency and observe. Start in staging, then a small part of production, and fix the weaknesses found. Game days extend the practice to people and process.
