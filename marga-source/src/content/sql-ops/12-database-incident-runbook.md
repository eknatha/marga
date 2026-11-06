---
title: A database incident runbook
minutes: 12
summary: Triage a database incident in order: confirm impact, check locks, connections, disk and replication, mitigate safely and write down what happened.
---

During an incident people guess. A written order of checks removes guessing, shortens the time to a diagnosis and leaves evidence for the review afterwards.

## What you will learn

- The order of checks: scope, connections, locks, resources, replication, changes
- Queries that reveal each cause
- Choosing the smallest safe mitigation
- Capturing evidence for the postmortem

## Runbook order

1. **Scope:** who is affected, since when, which endpoints
2. **Connections:** are we at the limit or waiting on a pool
3. **Long queries and locks:** who blocks whom
4. **Resources:** CPU, memory, disk space and I/O
5. **Replication:** lag, broken replica, stuck slot
6. **Changes:** deploys, migrations, config or traffic changes

```sql
-- connections by state
SELECT state, count(*) FROM pg_stat_activity GROUP BY 1 ORDER BY 2 DESC;

-- longest running queries
SELECT pid, now() - query_start AS runtime, wait_event_type, left(query, 70)
FROM pg_stat_activity WHERE state <> 'idle' ORDER BY runtime DESC LIMIT 5;

-- who blocks whom
SELECT pid, pg_blocking_pids(pid) AS blocked_by, left(query, 60)
FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

```bash
df -h /var/lib/postgresql
iostat -x 1 3
```

## Mitigate

Pick the smallest safe action: cancel a runaway query with `pg_cancel_backend`, terminate a blocker with `pg_terminate_backend`, pause a job, shed load or fail over if the server is truly unhealthy. A full disk may need removing old logs or WAL carefully, never deleting files in the data directory by hand. Restarting loses caches and hides evidence, so it is rarely the first step.

## Evidence

Before changing anything, save the output of the queries above with a timestamp. Note each action and its effect. This record turns a stressful hour into a clear timeline for the review.

## Incident: Afternoon latency spikes

> **Incident:** A report query held locks and used all connections each afternoon.

```console
active: 96 of 100 connections
pid 7314  runtime 00:41:12  report_daily_totals
54 queries blocked by pid 7314
```

An analyst's report ran in a transaction with an update, blocking the application. The on-call engineer cancelled it, saved the output, and the team moved reporting to a replica with a statement timeout and a lower connection limit for the reporting role.

## Common mistakes

- Restarting before collecting evidence
- Deleting WAL or data files to free space
- Killing queries without finding the blocker
- Skipping the review afterwards

```quiz
Q: What is the first runbook step?
+ Confirm scope and impact
- Restart the server :: No.
- Drop an index :: No.
- Upgrade PostgreSQL :: No.
> Know what users see.

Q: Which function lists blockers?
+ pg_blocking_pids
- pg_dump :: No.
- pg_basebackup :: No.
- pg_ctl :: No.
> It shows who blocks whom.

Q: What is a safer first action than a restart?
+ Cancel or terminate the blocking query
- Delete data files :: No.
- Disable backups :: No.
- Drop the database :: No.
> Smallest safe fix. The lesson section above explains why.

Q: Why save evidence first?
+ It supports the postmortem
- It speeds queries :: No.
- It frees disk :: No.
- It changes the plan :: No.
> You need a timeline.
```

```cards
pg_cancel_backend :: Cancels a running query
pg_terminate_backend :: Ends a session
Blocker :: A session holding a lock others wait for
Runbook :: Ordered checklist for handling an incident
```
