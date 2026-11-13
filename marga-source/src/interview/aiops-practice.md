## How do you decide what an automation may do without approval?
level: mid
I classify actions by blast radius and reversibility. Read-only work is automatic. Low-risk reversible actions such as restarting one pod run automatically within limits and logging. Rollbacks and drains need a person to approve with the evidence shown. Anything touching data or a whole region is done by a person. Each action has preconditions, a rate limit, a timeout and an undo, and starts in log-only mode before it is allowed to act.

## How do you verify that an automatic fix worked?
level: mid
I verify the symptom with the same query that triggered the action, after a settling time and over a window, not the exit code. I add guard metrics for side effects such as database connections, and if either check fails I undo the change when that is safe and page a person with the evidence. I also test the undo path and count repeated fixes on the same target.

## What controls would you put around an AI agent in operations?
level: senior
Narrow typed tools, a read-only start, structured proposals, a human gate that shows the exact action, a narrow short-lived identity, step and time limits, egress allowlists, secrets kept out of the model context, and a full transcript in an audit log the agent cannot edit. I enforce policy in the host code, not the prompt, and I test with hostile input in a sandbox.

## How would you test an AIOps detector before trusting it?
level: mid
I build a labelled incident set that includes quiet periods, replay the detector over history, and count incidents caught, lead time and false alarms per week. I hold some incidents out for honest testing, run in shadow mode beside production, compare with what responders actually did, and only then show suggestions to one team with written gates for moving on.

## How would you decide between building and buying an AIOps tool?
level: senior
I look at where the value comes from. Logic specific to our systems, such as change correlation, I build. Generic capability that lives inside a platform we already use, I buy. I test vendors on our own redacted incidents in shadow mode against targets set in advance, count total cost including tuning and false positives, check data export and a kill switch, and show return from a measured baseline.

## How do AIOps systems fail over time?
level: senior
Quietly. Inputs drift and detectors go stale, feedback loops mean the tool learns only from what it flagged, noisy services get more attention than quiet critical ones, and an automatic fix can hide a cause by clearing the symptom. I monitor the tools themselves, with weekly precision and recall, rollback share and repeat fixes, sample unflagged periods, and run exercises without the tool.
