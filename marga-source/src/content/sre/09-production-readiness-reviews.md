---
title: Production readiness reviews and launch checklists
minutes: 13
summary: Check that a service is ready for real users before launch, covering ownership, SLOs, monitoring, capacity, failure modes, rollout, runbooks and security, with a lightweight review that teams value.
---

Many incidents are not surprises. They come from services that launched without alerts, without a rollback plan, without anyone who knew how to restart them, or without ever being load tested. A production readiness review (PRR) is a structured conversation that looks for those gaps before users find them. Done well, it helps teams; done badly, it becomes a hated form.

## What you will learn

- What a PRR is and when to hold one
- A practical checklist by area
- How to run the review so it helps
- Launch criteria and follow-up
- Keeping a service ready after launch

## When

Hold a review before a new service takes production traffic, before a big change in traffic or architecture, and when ownership moves between teams. Start early, since findings are cheaper to fix when the design is still flexible. Keep it proportional: a small internal tool needs a light check; a payment service needs a thorough one.

## Checklist by area

**Ownership and support**
- A named owning team and an on-call rotation with an escalation path
- A service catalogue entry with contacts, repository, dashboards and runbooks
- Agreed support hours and severity definitions

**Reliability targets**
- SLIs and SLOs written down, with an error budget policy
- Known dependencies, and what happens when each one fails (timeouts, fallbacks, circuit breakers)

**Monitoring and alerting**
- Dashboards with traffic, errors, latency and saturation
- Alerts on symptoms users feel, each with a runbook link
- Logs and traces with request ids

**Capacity and performance**
- Load test results against expected peak plus headroom
- Autoscaling tested; limits and quotas checked
- Behaviour under overload: shed load or degrade, not collapse

**Change and release**
- Automated build and deploy, with canary or staged rollout
- Rollback tested and fast; database changes backwards compatible
- Feature flags for risky behaviour

**Failure and recovery**
- Backups exist and a restore has been tried
- Single points of failure listed with decisions
- Behaviour on zone loss known; recovery steps documented

**Security and data**
- Least-privilege access, secrets in a manager, dependencies scanned
- Data classification, retention and privacy requirements met
- Audit logs for sensitive actions

**Documentation**
- Architecture diagram, runbooks for the top failure modes, and a launch plan with a rollback trigger

## Running the review

Make it a conversation of an hour or two with the team and one or two experienced reviewers from outside, using the checklist as prompts. Ask "what happens when X fails?" rather than "do you have X?". Record findings with an owner and severity: must fix before launch, should fix within a month, or accepted risk (with the name of who accepted it). Share the checklist ahead of time so the team can prepare, and treat the review as help, not an audit.

## After launch

Readiness decays. Re-review yearly, after major incidents, and when the service changes a lot. Use postmortem actions to update the checklist: every incident that a review could have found is a missing question.

```predict
Q: A team says "we have monitoring". What question reveals whether it is useful?
???
"Which alert would fire first if the database became slow, and what would the on-call person do?"
> Scenario questions test the whole chain from detection to action.
```

## Incident: the launch that nobody could roll back

> **Incident:** A new recommendation service launches on a Friday and doubles page latency. The team cannot roll back because the database migration removed a column the old version needs.

```console
$ ./deploy rollback recs
error: migration 0042 is not reversible
```

No review had asked how to roll back. The team restored the column from a backup, which took five hours. Afterwards they added "rollback tested" and "migrations compatible" to the checklist, required a launch plan with a rollback trigger, and stopped Friday launches without a reviewed plan.

## Common mistakes

- Treating the review as paperwork
- Reviewing too late to change anything
- No owner for follow-up items
- Never revisiting after launch

```quiz
Q: When is the best time to start a production readiness review?
- After the first incident :: Too late.
+ Early, while the design can still change
- Never :: Risky.
- During the incident :: Too late.
> Early findings are cheaper to fix.

Q: Which question is more useful in a review?
- Do you have alerts? :: A yes hides quality.
+ What happens when your main dependency becomes slow?
- Is the code pretty? :: Not the aim.
- Who wrote the code? :: Not the aim.
> Scenario questions find real gaps.

Q: What should happen with a finding that the team decides not to fix?
+ It is recorded as an accepted risk with an owner's name
- It is deleted :: Information is lost.
- It is hidden :: Dangerous.
- It blocks forever :: Not practical.
> Accepting risk should be explicit.

Q: Why re-review a service after launch?
+ Systems and traffic change, and readiness decays
- To change the logo :: Unrelated.
- To meet a quota :: Not the aim.
- To rename the service :: Unrelated.
> Keep the checklist alive.
```

```cards
What is a PRR? :: A review that checks a service is ready for production
Review timing? :: Before launch, early enough to change design
Record for unfixed findings? :: Accepted risk with an owner
Good review question style? :: What happens when X fails?
Rollback must be what? :: Tested and fast
```
