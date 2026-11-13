---
title: Change correlation: linking incidents to deploys
minutes: 14
summary: Most outages follow a change. Build a change feed, match it to incident start times and rank suspects, so responders see what changed before they start guessing.
---

If you could ask only one question at the start of an incident, ask what changed. Studies of outages keep finding that a large share follow a deploy, a configuration edit, a flag flip or an infrastructure change. A change correlator answers that question in seconds and is often the highest-value AIOps feature you can build.

## What you will learn

- What belongs in a change feed and how to collect it
- How to match changes to an incident by time and by scope
- How to rank suspects and show the evidence
- How to avoid blaming the most recent deploy by default

## Build the change feed

Gather every change into one stream with the same fields: time, type, system, version or diff link, author, and the service or environment it touched. Sources include CI/CD, delivery and sync tools, feature flag services, infrastructure as code runs, database migrations, certificate rotations, autoscaler and node pool changes, and cloud provider maintenance notices. Changes you do not record cannot be correlated.

## Match by time

Take the estimated start of the incident, from a change-point detector rather than the page time, and look back over a window such as 30 minutes. Include a short window after it too, because clocks differ and rollouts take time to reach every pod. Rank by closeness, but do not stop there.

## Match by scope

A change only explains an incident if it can reach the failing system. Use service ownership and dependency data: a deploy of the image service is a weak suspect for a login failure unless login depends on it. Score a change higher when it touches the failing service, one of its direct dependencies, or shared infrastructure the service runs on.

## Rank with evidence

Combine the signals into a score and show the reasons, not just a number: "deployed 4 minutes before the error rate rose, same service, changed a timeout setting". Responders trust a hint they can check. Include a link to the diff and a one-click path to the rollback.

```python
from datetime import datetime, timedelta

def rank(changes, incident_start, service, deps, window=timedelta(minutes=30)):
    scored = []
    for c in changes:
        gap = (incident_start - c["time"]).total_seconds() / 60
        if gap < -5 or gap > window.total_seconds() / 60:
            continue
        score = 3.0 / (1.0 + max(gap, 0))
        if c["service"] == service:
            score += 2.0
        elif c["service"] in deps:
            score += 1.0
        if c["type"] in ("config", "flag"):
            score += 0.5
        scored.append((round(score, 2), c["id"], c["type"], c["service"]))
    return sorted(scored, reverse=True)

t0 = datetime(2026, 11, 3, 14, 3)
changes = [
    {"id": "d-881", "time": t0 - timedelta(minutes=4), "type": "deploy", "service": "checkout"},
    {"id": "f-102", "time": t0 - timedelta(minutes=22), "type": "flag", "service": "search"},
]
print(rank(changes, t0, "checkout", {"payments", "inventory"}))
```

The scoring is deliberately simple and explainable. You can tune the weights against past incidents.

## Beware the latest-deploy bias

The most recent change is not always the cause. A change from three days ago can start misbehaving when traffic grows. A flag flipped by a vendor, an expired certificate or a cloud maintenance event can matter more than any of your deploys. Keep a "no recent change found" result as a valid answer, and do not force a suspect.

## Close the loop

When the incident ends, record which change was the cause, if any. That label is training data for tuning the weights and the best test of whether the correlator is helping.

```diagram
title: Linking an incident to its likely change
node: feed | Change feed | 0 | 0 | Deploys, config, flags, infrastructure and vendor events. | Changes that never reach the feed. | store
node: start | Incident start | 0 | 2 | Estimated from a change-point detector. | Using the page time, which lags. | observe
node: time | Time match | 1 | 1 | Changes shortly before the start, with a margin after it. | Clock skew between systems. | process
node: scope | Scope match | 2 | 1 | Does the change reach the failing service or a dependency? | Stale ownership or dependency data. | process
node: rank | Ranked suspects | 3 | 1 | A short list with reasons, diff links and rollback. | A bare score nobody can check. | service
node: label | Outcome label | 4 | 1 | Record the real cause for tuning. | Never recorded, so the model never improves. | store
edge: feed | time
edge: start | time
edge: time | scope
edge: scope | rank
edge: rank | label
```

## Incident: The flag nobody deployed

> **Incident:** Checkout errors began at 14:03. There had been no deploys that afternoon, and the on-call engineer spent twenty minutes checking infrastructure.

```console
$ changes --around 14:03 --window 30m --service checkout
14:01  flag     enable_new_tax_api   set by pricing-team   scope: checkout
13:40  config   db-pool-size         unchanged
(this is a simulated illustration, not a real incident)
```

A pricing team had switched on a feature flag two minutes earlier. The flag service was not in the change feed, so no tool had linked it. Once flags were added as a source, the correlator listed the flag first, and the next similar incident was resolved in minutes by turning it off.

## Common mistakes

- Leaving feature flags and vendor events out of the feed
- Matching on the page time instead of the estimated start
- Blaming the latest change without checking scope
- Showing a score without the reasons
- Never recording the real cause

```quiz
Q: Why add feature flags to the change feed?
+ A flag flip changes behaviour without a deploy
- Flags are faster than deploys :: Not the reason.
- Flags are not changes :: They are.
- It reduces storage :: Unrelated.
> Many incidents follow a flag or config change, not a deploy.

Q: What time should you search around?
+ The estimated start of the problem, with a margin after it
- The time the page was sent :: It lags the problem.
- Midnight :: Arbitrary.
- The last deploy only :: Biased.
> Use the start time from a detector and allow for clock skew.

Q: What does scope matching add?
+ It checks the change can reach the failing service
- It makes the list shorter at random :: It is reasoned.
- It replaces time matching :: Both are used.
- It deletes unrelated changes :: It only ranks them lower.
> A change that cannot affect the system is a weak suspect.

Q: When should the tool say no recent change was found?
+ When nothing plausible matches, instead of forcing a suspect
- Never :: A forced guess misleads.
- Only on weekends :: Arbitrary.
- When the score is high :: That is the opposite.
> An honest empty result sends responders to other causes.
```

```cards
Change feed :: One stream of every deploy, config, flag and infrastructure change
Scope match :: Checking that a change can affect the failing system
Suspect ranking :: Ordering changes by how likely they caused an incident
Outcome label :: The recorded real cause used to tune a correlator
Latest-deploy bias :: Blaming the most recent change without evidence
```
