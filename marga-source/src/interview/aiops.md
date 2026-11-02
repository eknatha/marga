## What is AIOps and what problems does it solve?
level: junior
AIOps applies statistics and machine learning to operations data. Typical jobs are anomaly detection on metrics, grouping related alerts, hinting at root causes and assisting remediation. It helps where humans cannot keep up with volume, but it depends on good telemetry and change records.

## Why is a seasonal baseline better than a fixed threshold?
level: junior
Normal traffic changes with the hour and the day of the week. A fixed limit either fires during every busy period or misses faults at quiet times. Comparing with the same time on earlier weeks removes the pattern and cuts false alarms.

## How do you reduce alert noise during an outage?
level: mid
I make sure alerts have stable labels, deduplicate them, group by service and cluster, use dependency data to show the likely source, and add inhibition rules so downstream alerts are folded under the cause. I track alerts per incident and prune alerts that are mostly ignored.

## How can logs be used to find a cause faster?
level: mid
Cluster lines into templates, list templates that are new since a release or whose rate jumped, split counts by version and host, and overlay deployments and config changes. Traces then show which step of the request became slow.

## Would you let an AI assistant act during an incident?
level: senior
It can summarise the timeline, search runbooks and rank hints with evidence, but people make decisions and approve any change to production. I log every query and answer, restrict the data it sees, and score its hints against real causes after each incident to decide how far to trust it.

## How do you introduce auto-remediation safely?
level: senior
I start with frequent, low-risk, easily verified fixes. Each rule has preconditions, a cap on actions per hour, a cooldown, a verify step that escalates to a person on failure, an audit log and a global kill switch. I move from suggestion to one-click approval to unattended mode only after a run of correct decisions.
