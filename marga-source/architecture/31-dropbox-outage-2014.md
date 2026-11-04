# Dropbox outage during a routine upgrade, January 2014
company: Dropbox
date: 10 January 2014
modules: linux, bash, sre
calc: recovery, redundancy
source: Dropbox tech blog: Outage post-mortem | https://dropbox.tech/infrastructure/outage-post-mortem
summary: A script meant to upgrade the operating system on a few servers also ran on machines holding live databases, and the service was down for hours.

## Before you read on
A maintenance script is given a list of target servers by a pattern. How would you make sure it can only touch the machines you meant?

## The system
Dropbox stored file metadata in many MySQL database servers, each with replicas. Operators used scripts to apply operating system upgrades and to reinstall servers, with the help of a tool that applied commands to groups of machines.

## Timeline as reported
- On the Friday evening, an engineer started a routine maintenance on a set of servers, in order to upgrade the operating system.
- As reported, a bug in the script meant it ran on active machines, among them database masters and some replicas, instead of only the planned ones.
- The affected machines were reinstalled, so the data on them was lost, and the service went offline.
- The data was safe because backups existed, but restoring many large databases from backups and rebuilding replication took many hours.
- The service came back in stages over the weekend, and the company posted an explanation to its customers.

## Root cause
A maintenance tool applied a destructive action to machines that were not on the intended list, and the target list was not verified against what was running on them.

## What changed
- Dropbox said it would add checks so that the script refuses to act on a machine that is serving production traffic.
- It also planned to speed up recovery of the databases, and to review how maintenance commands are rolled out to groups of servers.

## Lessons learned
- Make destructive tools check the state of the target, and refuse to run on a host that is serving traffic.
- Run maintenance on one or two machines first, and wait before going on.
- Practise restoring from backup at full size, and time it, so recovery goals are real.
- Keep database masters and replicas apart in the groups that maintenance tools see.

## Trade-offs to weigh
- **Pattern based targeting against explicit lists.** A pattern is quick to write. An explicit list is easier to review.
- **Single command for many hosts against small batches.** Large batches finish early. Small batches stop a mistake after the first few.
- **Backups against restore speed.** Having a backup is not enough, because a restore of terabytes takes hours.

## Try the calculators
In the backup, RTO and RPO calculator, enter a data size and a restore speed and see how many hours a restore needs. In the redundancy calculator, ask whether more replicas would help against a script that touches all of them.
