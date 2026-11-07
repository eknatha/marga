---
title: Troubleshooting playbook: method and the first five minutes
minutes: 12
summary: Triage a slow or failing Linux server in order: ask what changed, check each resource for use, saturation and errors, and narrow the cause before you touch anything.
---

A page says "the server is slow". Most people open `top`, see something odd and start changing settings. A playbook replaces that habit with a fixed order of questions, so you find the cause faster and do not make things worse. This lesson is the front door to the playbook lessons that follow.

## What you will learn

- Ask the questions that narrow the problem before you run commands
- Apply the USE method: utilization, saturation and errors for each resource
- Run a first-five-minutes command set and read the results
- Record what you saw so a handover or post-mortem is easy

## Start with questions, not commands

Before the shell, spend one minute on: **What is the symptom, exactly?** (errors, latency, a crash). **Since when?** **What changed** (a deploy, a config change, a certificate, a traffic spike, a kernel update)? **Who is affected** (one host, one region, everyone)? **Is it getting worse?** A recent change is the cause far more often than a random failure, and "only one host" points to the host, while "everyone" points to a shared dependency.

## The USE method

For every resource (CPU, memory, disks, network, and also queues and locks) check three things:

- **Utilization**: how busy is it, as a percentage of time or capacity
- **Saturation**: is work waiting, such as a run queue, swap activity or an I/O queue
- **Errors**: counts of faults, such as disk errors, packet drops or OOM kills

Saturation is the signal people forget. A CPU at 100 percent with no queue is working hard but healthy. A disk at 60 percent with a long queue is already hurting users.

```console
$ uptime
$ dmesg -T | tail -20
$ vmstat 1 5
$ mpstat -P ALL 1 3
$ pidstat 1 3
$ iostat -xz 1 3
$ free -m
$ ss -s
```

Read them in this order: `uptime` gives load trend, `dmesg` shows kernel errors (OOM kills, disk and network faults), `vmstat` shows run queue (`r`), blocked (`b`), swap (`si`, `so`) and CPU split, `mpstat` shows whether one core is stuck, `pidstat` names the busy process, `iostat` shows disk `await` and `%util`, `free` shows available memory, and `ss -s` summarizes sockets.

## Narrow and then confirm

Pick the resource with the clearest saturation or error, find the process or workload behind it, and form one hypothesis. Test it with a read-only command first. Change one thing at a time, and write down the time and the change. If a fix does not help, undo it, so that you never stack unknown changes.

```predict
Q: A host shows load average 40 on 8 CPUs, but mpstat shows 90 percent idle. What do you check next?
???
Load counts tasks in uninterruptible sleep too. Look at the blocked column in vmstat and at iostat or NFS latency: processes are probably waiting on I/O, not on CPU.
> Load is not the same as CPU use.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Troubleshooting playbook: method and the first... fits together
node: n1 | Start with questions, not commands | 0 | 0 | Before the shell, spend one minute on: What is the symptom, exactly? | Reading only utilization and ignoring queues and errors. | process
node: n2 | The USE method | 1 | 1 | For every resource (CPU, memory, disks, network, and also queues and locks) check three things. | Skipping dmesg, where the kernel often already named the problem. | process
node: n3 | Narrow and then confirm | 2 | 0 | Pick the resource with the clearest saturation or error, find the process or workload behind it, and form one hypothesis. | Changing settings before you know the resource that is saturated. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: The nightly slowdown

> **Incident:** Every night at 02:10 an API on one server became slow for about 15 minutes, and the team blamed the new release.

```console
$ iostat -xz 1 3
Device  r/s   w/s   await  %util
sda     12    480   310.2  99.8
$ pidstat -d 1 3 | sort -k5 -nr | head -3
```

The release was innocent. A log compression job started by cron at 02:10 wrote heavily to the same disk, and disk wait time rose to 310 ms. The fix was to move the job to a separate volume and run it with `ionice -c3`. The team also added disk wait to the dashboard so the next slowdown would show the real resource.

## Common mistakes

- Changing settings before you know the resource that is saturated
- Reading only utilization and ignoring queues and errors
- Skipping `dmesg`, where the kernel often already named the problem
- Making several changes at once and losing track of what helped

```quiz
Q: What does the USE method check for each resource?
+ Utilization, saturation and errors
- Users, sessions and endpoints :: These are not resource measures.
- Upgrades, security and encryption :: Not the method.
- Uptime, speed and energy :: Not the method.
> Every resource gets the same three questions.

Q: Why ask "what changed" first?
+ Recent changes cause most incidents, so it narrows the search quickly
- Because logs are always empty :: Logs are usually useful.
- Because commands are slow :: Speed of commands is not the reason.
- To find someone to blame :: The aim is the cause, not blame.
> A change is the best first suspect.

Q: A disk is 60 percent utilized with a long request queue. How healthy is it?
+ Not healthy: queued requests mean saturation that users feel
- Healthy, because utilization is below 100 percent :: Saturation matters more here.
- Healthy, because queues are normal :: A long queue means delay.
- Broken, and must be replaced :: Not proven by a queue alone.
> Check saturation, not only utilization.

Q: A fix does not help. What should you do?
+ Undo it, then test the next hypothesis
- Add a second change on top :: You lose track of causes.
- Leave it and reboot :: That destroys evidence.
- Ignore it :: The problem remains.
> One change at a time, always reversible.
```

```cards
USE method :: utilization, saturation, errors for each resource
First question :: what changed, and since when
Saturation :: work waiting, such as a run queue or I/O queue
First commands :: uptime, dmesg, vmstat, mpstat, pidstat, iostat, free, ss
Discipline :: one hypothesis and one change at a time
```
