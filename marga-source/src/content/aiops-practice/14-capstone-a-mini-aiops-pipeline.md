---
title: Capstone: build a mini AIOps pipeline
minutes: 20
summary: Put the whole tree together in one small project: ingest a metric stream and a change feed, detect a shift, link it to a deploy, rank a cause, and propose a gated remediation with an audit record.
---

This lesson is a build, not a lecture. The goal is a small pipeline of about 60 lines that does what a commercial platform does at toy scale: sees a problem, explains it, proposes an action and keeps a record. Every piece is something you met earlier.

## What you will learn

- How the stages connect in a working loop
- How to simulate data so you can test without production
- How to keep the final action gated and auditable
- How to extend the capstone toward real tools

## The project

Simulate a service called `checkout` with a latency series and a list of changes. Introduce a regression at a known time, after a deploy. Your pipeline should:

1. Read the latency series and detect a lasting shift with CUSUM.
2. Estimate the start time of the shift.
3. Look up changes in the 30 minutes before the start and rank them by time and scope.
4. Build an evidence summary.
5. Propose a rollback as a Tier 2 action, and write an audit record. It must not run it.

## Step 1: Data

Generate one point per minute for three hours. Latency sits near 120 ms with noise, then steps up to about 180 ms at minute 120. Create a change feed with three changes, one of which is a deploy of `checkout` at minute 117.

## Step 2: Detect and date

Use the CUSUM function from the change-point lesson. It returns the alarm index and the estimated start. The start should land within a couple of minutes of 120.

## Step 3: Correlate

Use the ranking function from the change correlation lesson, with a dependency list for `checkout`. The deploy should rank first because it is close in time and touches the same service.

## Step 4: Propose and record

Produce a structured proposal and an audit record. Never run the rollback from the pipeline. Print what a human would see.

```python
import json
import random
from datetime import datetime, timedelta, timezone

random.seed(7)
t0 = datetime(2026, 11, 3, 12, 0, tzinfo=timezone.utc)
series = [random.gauss(120, 4) if i < 120 else random.gauss(180, 4) for i in range(180)]
changes = [
    {"id": "d-881", "minute": 117, "type": "deploy", "service": "checkout", "link": "diff/4.18.1...4.18.2"},
    {"id": "f-102", "minute": 95, "type": "flag", "service": "search", "link": "flags/102"},
    {"id": "c-310", "minute": 40, "type": "config", "service": "payments", "link": "cfg/310"},
]

def cusum(xs, target, slack, limit):
    pos, start = 0.0, None
    for i, x in enumerate(xs):
        pos = max(0.0, pos + (x - target - slack))
        if pos == 0.0:
            start = None
        elif start is None:
            start = i
        if pos > limit:
            return i, start
    return None, None

def rank(minute, service, deps):
    out = []
    for c in changes:
        gap = minute - c["minute"]
        if gap < -5 or gap > 30:
            continue
        score = 3.0 / (1.0 + max(gap, 0))
        score += 2.0 if c["service"] == service else (1.0 if c["service"] in deps else 0.0)
        out.append((round(score, 2), c))
    return sorted(out, key=lambda x: -x[0])

alarm, start = cusum(series, target=120, slack=4, limit=60)
ranked = rank(start, "checkout", {"payments", "inventory"})
top = ranked[0][1] if ranked else None

proposal = {
    "kind": "proposal",
    "tier": 2,
    "action": "rollback",
    "target": top["service"] if top else None,
    "evidence": {
        "shift_start": (t0 + timedelta(minutes=start)).isoformat(),
        "alarm_at": (t0 + timedelta(minutes=alarm)).isoformat(),
        "suspect": top["id"] if top else None,
        "diff": top["link"] if top else None,
    },
    "requires_approval": True,
    "executed": False,
}
print(json.dumps(proposal, indent=2))
```

Running it should print a proposal naming `d-881`, a shift start close to 14:00, `executed: false` and `requires_approval: true`.

## Extensions

Replace the simulated series with a Prometheus query. Add a verification step that polls the real metric after approval. Add the kill switch check and a rate limit. Put a small assistant on top that retrieves a runbook for `checkout` and cites it. Add an injection test string to the change summary and confirm nothing leaves. Finally, write three more simulated incidents with different causes and measure top-1 accuracy.

## What to check

Detection lead time, whether the true cause ranks first on all your simulated cases, whether the audit record has every field from the audit lesson, and whether the pipeline refuses to propose anything when no change is found.

```diagram
title: The capstone pipeline end to end
node: ser | Metric series | 0 | 0 | Latency per minute for checkout. | Seasonality not removed. | store
node: chg | Change feed | 0 | 2 | Deploys, flags and config with times. | A source missing from the feed. | store
node: det | Detect and date | 1 | 0 | CUSUM finds a lasting shift and its start. | Using the alarm time as the start. | process
node: rank | Rank suspects | 2 | 1 | Time and scope scoring with reasons. | Forcing a suspect when none fits. | process
node: prop | Proposal | 3 | 1 | Tier 2 rollback with evidence and rollback plan. | Running it without approval. | service
node: aud | Audit record | 4 | 1 | Time, evidence, action, approver and outcome. | Records the pipeline could edit. | security
edge: ser | det
edge: chg | rank
edge: det | rank
edge: rank | prop
edge: prop | aud
```

## Incident: The capstone that proposed nothing

> **Incident:** A learner's pipeline detected the shift but proposed no suspect, even though a deploy had caused it.

```console
$ python3 capstone.py
shift start: 2026-11-03T14:00:00+00:00
changes in window: 0
suspect: none
(this is a simulated illustration, not a real incident)
```

The change feed stored times as local time while the metric used UTC, so the deploy appeared five and a half hours earlier and fell outside the window. The learner normalised both to UTC at ingestion and added a test that every record has a timezone.

## Common mistakes

- Mixing time zones between the feed and the metric
- Running the rollback instead of only proposing it
- Using the alarm time instead of the estimated start
- Forcing a suspect when none matches
- Testing on only one simulated incident

```quiz
Q: Why must the capstone pipeline only propose the rollback?
+ A Tier 2 action needs human approval with the evidence shown
- Rollbacks are impossible to script :: They can be scripted.
- The proposal runs faster :: Not the reason.
- Audit records are optional :: They are required.
> Moderate-risk actions go through an approval gate.

Q: Which time should the correlator use?
+ The estimated start of the shift
- The time the dashboard was opened :: Arbitrary.
- The last deploy time :: Biased.
- Midnight UTC :: Arbitrary.
> The alarm lags the change, so use the start.

Q: What should happen when no change is found?
+ Report no suspect and leave the decision to people
- Pick the nearest change anyway :: Misleads.
- Roll back everything :: Dangerous.
- Delete the record :: Loses evidence.
> An honest empty result is valid.

Q: What proves the pipeline works?
+ Several simulated incidents with measured detection and top-1 accuracy
- One passing demo :: Too little.
- A confident log message :: Not evidence.
- A longer script :: Not a measure.
> Measure on a set, not a single case.
```

```cards
Capstone :: A project that combines the skills of a course
Simulation :: Generated data used to test a pipeline safely
Proposal :: A prepared action that has not yet run
Time normalisation :: Converting all timestamps to one zone, usually UTC
Evidence summary :: The facts shown to a human who approves an action
```
