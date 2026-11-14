## How does PostgreSQL streaming replication work?
level: mid
Standbys replay the primary write ahead log over a connection. It can be asynchronous for speed or synchronous for no loss. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you avoid split brain?
level: senior
Use a consensus store for the leader key, fencing or a watchdog, and make the old primary rejoin only after a rewind or rebuild. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## What does a good backup strategy include?
level: mid
Base backups and WAL archiving for PITR, offsite encrypted copies, retention, alerts and regular restore tests against RPO and RTO. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## Why use PgBouncer?
level: mid
To share a small number of backend connections between many clients, cutting memory and context switching, with care for session features. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you migrate a schema safely?
level: mid
Expand and contract in small steps, concurrent index builds, lock timeouts, batched backfills and a rollback plan. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you run a database incident?
level: mid
Confirm impact, check health, find the blocker or the resource at its limit, take safe actions one at a time and update the runbook. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.
