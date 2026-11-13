---
title: Debugging a misbehaving AIOps pipeline
minutes: 14
summary: A step-by-step method to find out why an AIOps system flagged the wrong thing, missed an incident or acted badly, by walking back through data, detection, correlation and action.
---

When an AIOps tool is wrong, the first reaction is often to tune the model. Most of the time the fault is earlier in the chain: missing data, a wrong label, a stale topology. A fixed order of checks finds it quickly.

## What you will learn

- A five-stage method: data, detection, correlation, explanation, action
- What to check at each stage
- How to reproduce a bad decision from the audit trail
- How to turn a fix into a test

## Start from the decision record

Pull the record for the bad decision: the inputs the tool saw, the version of the rule or model, the output and the time. If you cannot reconstruct what it saw at that moment, you cannot debug it. This is the strongest argument for the audit trail from earlier lessons. Reproduce the decision by replaying the same inputs through the same version.

## Stage 1: Data

Was the data present, fresh and correctly labelled? Check source freshness, missing series, duplicated series, label changes (a renamed service), unit changes and time zone problems. Many "model failures" are a metric that vanished for ten minutes or a label that changed after a deploy.

## Stage 2: Detection

Given correct data, did the detector behave as designed? Replay the series and look at the baseline, the threshold, the minimum duration and the seasonality window. Check for a recent restart or deploy that shifted the baseline, a holiday not in the calendar, or a window too short for a weekly pattern.

## Stage 3: Correlation

Were events grouped and linked correctly? Check the fingerprint, the grouping keys and window, the topology edges used and the change feed. Common faults: a missing dependency edge, a change that was never recorded, two services merged because of a shared label.

## Stage 4: Explanation

If an assistant or ranker gave the wrong cause, check what it retrieved and which signals scored highest. Did retrieval return a deprecated runbook? Was the true cause outside the data it could see? Did a tool call fail and the model carry on with partial results? Read the tool transcript.

## Stage 5: Action

If an automation acted wrongly, check the trigger, preconditions, scope, rate limits and verification. Was a precondition missing? Did verification measure the right query? Did a guard exist? Look at the audit record for the approval and the evidence shown.

## Binary search the pipeline

At each boundary ask: is the output correct for the input it was given? Work from the end backwards until you find the first stage whose output is wrong for a correct input. That stage owns the bug.

```bash
# Rebuild what the tool saw at the time of a bad decision
aiopsctl decision show dec-77120 --json > /tmp/decision.json
aiopsctl replay --decision dec-77120 --stage data       --diff
aiopsctl replay --decision dec-77120 --stage detection  --diff
aiopsctl replay --decision dec-77120 --stage correlation --diff
aiopsctl replay --decision dec-77120 --stage action     --diff
```

Replaying each stage with the recorded input and comparing with the recorded output shows exactly where the answer first went wrong.

## Fix, then protect

Fix the root cause, not just the symptom: restore the label, add the topology edge, add the change source, add the precondition. Then add the case to the regression suite so the same mistake is caught automatically. Record the finding in a short note in the tool's changelog.

## Communicate

Tell the people who saw the wrong output what happened and what changed. Trust in these tools is built by honest explanations, not by silence.

```diagram
title: Walking back through the pipeline
node: rec | Decision record | 0 | 1 | Inputs, version and output of the bad decision. | Nothing recorded to replay. | store
node: data | Data | 1 | 0 | Fresh, labelled, complete. | A renamed label after a deploy. | observe
node: det | Detection | 2 | 0 | Baseline, threshold and window correct? | Seasonality window too short. | process
node: cor | Correlation | 3 | 0 | Grouping, topology and changes. | A missing dependency edge. | process
node: exp | Explanation | 3 | 2 | Retrieval and tool results. | A failed tool call ignored. | service
node: act | Action | 4 | 1 | Trigger, preconditions and verification. | Verification checks the wrong query. | security
node: fix | Fix and regression test | 5 | 1 | Repair the first wrong stage and keep a test. | A fix with no test. | external
edge: rec | data
edge: data | det
edge: det | cor
edge: cor | exp
edge: exp | act
edge: act | fix
```

## Incident: The wrong team paged

> **Incident:** An outage in the search service paged the payments team, who spent twenty minutes on a problem that was not theirs.

```console
$ aiopsctl replay --decision dec-77120 --stage correlation --diff
input:  alert SearchLatencyHigh service=search
output: routed_team = payments   expected = discovery
cause:  catalog alias "search" -> payments-search (stale)
(this is a simulated illustration, not a real incident)
```

Data and detection were correct. The routing step used a catalog entry that still mapped the name `search` to a retired payments component. Fixing the catalog entry was the repair, and the team added a test that every routed team exists and owns the service.

## Common mistakes

- Retuning the model before checking the data
- No decision record to replay
- Debugging the final stage first and stopping there
- Fixing without adding a regression case
- Not telling people what went wrong

```quiz
Q: What should you do first when a tool made a bad decision?
+ Retrieve the record of what it saw and replay it
- Retrain the model :: Premature.
- Disable all alerts :: Unsafe.
- Ask the vendor to fix it :: Skips diagnosis.
> You need to reproduce the decision to find its cause.

Q: How do you locate the faulty stage?
+ Check each stage's output against its input from the end backwards
- Guess the likeliest model :: Unreliable.
- Rebuild everything :: Wasteful.
- Wait for it to happen again :: Slow.
> The first stage that gives a wrong output for correct input owns the bug.

Q: What is a common cause of apparent model failure?
+ Missing or relabelled data
- Too much documentation :: Not a cause.
- A short title :: Irrelevant.
- A fast network :: Irrelevant.
> Check data before tuning.

Q: What follows a fix?
+ A regression test for the case
- Nothing :: The mistake can return.
- Deleting the record :: Loses learning.
- Disabling the feature :: Overreaction.
> Tests keep fixes in place.
```

```cards
Decision record :: Saved inputs, version and output of an automated decision
Replay :: Re-running a recorded input through the same version
Stage boundary :: The point between pipeline steps where output can be checked
Regression case :: A saved example that must keep working after changes
Stale mapping :: An outdated link between names, services or teams
```
