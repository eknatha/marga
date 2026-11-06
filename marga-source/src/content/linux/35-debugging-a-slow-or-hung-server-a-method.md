---
title: Debugging a slow or hung server: a method
minutes: 14
summary: Combine the earlier tools into a repeatable method: define the symptom, find the saturated resource, find the process and confirm the cause.
---

You now have tools for system calls, the network, open files, resources and the kernel log. The skill is the order in which you use them. A method keeps you from jumping to a favourite tool, and from changing three things at once so you cannot tell which one helped.

## What you will learn

- Stating the symptom precisely before touching anything
- The USE walk: utilisation, saturation and errors per resource
- Narrowing from resource to process to call
- Changing one thing at a time and writing it down

## 1. State the symptom

"Slow" is not a symptom. Write: *the checkout page takes 8 seconds since 14:05; the API is fine; one of three servers is affected.* Add when it started, how many users are affected and what changed (a deploy, a config change, a traffic spike).

## 2. Walk the resources (USE)

For each resource ask three questions: **U**tilisation (how busy), **S**aturation (is work waiting), **E**rrors (anything failing).

| Resource | Utilisation | Saturation | Errors |
|---|---|---|---|
| CPU | `top`, `mpstat` | Run queue (`vmstat r`) | Throttling, `dmesg` |
| Memory | `free -m` | Swap activity, OOM | OOM kills |
| Disk | `iostat %util` | `await`, queue size | `dmesg`, SMART |
| Network | `sar -n DEV` | Drops, retransmits (`ss -ti`) | Interface errors (`ip -s link`) |

## 3. Narrow to a process, then a call

`top` or `pidstat` names the process. `strace -p` shows its blocked call, `lsof -p` its files and sockets, `ss -tnp` its connections, `journalctl -u` its log. If the host looks fine, check dependencies: DNS, a remote database, an NFS mount.

## 4. One change, then measure

Form a single hypothesis, change one thing, measure the same numbers again and record the result. If the numbers do not move, undo the change.

```diagram
title: The debugging loop
node: sym | State the symptom | 0 | 0 | Who, what, since when and what changed. | A vague symptom sends you to the wrong tool.
node: use | USE walk | 1 | 0 | Check CPU, memory, disk and network for use, saturation and errors. | Skipping a resource leaves the real cause unseen. | observe
node: proc | Find the process | 2 | 0 | top, pidstat, ss and lsof name who is responsible. | Blaming the busiest process can hide the one that is blocked.
node: call | Find the call or line | 3 | 0 | strace, logs and traces show what it waits for. | Heavy tools on production can add load.
node: fix | Change one thing | 3 | 1 | Apply one fix, then re-measure the same numbers. | Several changes at once teach you nothing.
edge: sym | use
edge: use | proc
edge: proc | call
edge: call | fix
edge: fix | use
```

## Write it down

Keep a short log: time, what you ran, what you saw, what you changed. It helps the incident channel, the postmortem and you in six months.

## Incident: The one-hour guessing game

> **Incident:** A team restarted services and resized the instance while the real problem was a hung NFS mount.

```console
$ ps -eo stat,comm | grep -c '^D'
41
$ dmesg -T | tail -2
nfs: server files.internal not responding, still trying
load average: 38.0, 35.2, 30.1
```

Processes in uninterruptible sleep (state D) were all waiting on the unreachable NFS server, so load was high and CPU idle. Fixing the file server restored the host. The team added the NFS mount to their dependency checklist.

## Common mistakes

- Changing several settings at once
- Starting with a restart that destroys the evidence
- Skipping the symptom statement and chasing the loudest graph
- Not recording the steps taken

```quiz
Q: What does the USE method check per resource?
+ Utilisation, saturation and errors
- Users, servers and errors :: No.
- Uptime, speed and energy :: No.
- Upgrades, security and email :: No.
> USE is a fixed set of three questions.

Q: Why change only one thing at a time?
+ So you know which change had the effect
- To save time typing :: No.
- To avoid backups :: No.
- To keep logs short :: No.
> Multiple changes hide the cause.

Q: High load, idle CPU and many D-state processes suggest what?
+ Processes blocked on I/O such as a hung mount
- A CPU bottleneck :: No.
- A DNS error :: No.
- A full inbox :: No.
> State D is uninterruptible sleep, usually I/O.

Q: What should you write while debugging?
+ Time, command, result and change made
- Only the final fix :: No.
- Nothing until it is solved :: No.
- Passwords :: No.
> A log helps the team and the postmortem.
```

```cards
USE method :: Check utilisation, saturation and errors for each resource
D state :: Process state for uninterruptible sleep, often waiting on I/O
Hypothesis :: A single testable guess about the cause
Saturation :: Work waiting because a resource is fully used
Baseline :: Normal numbers to compare against when something changes
```
