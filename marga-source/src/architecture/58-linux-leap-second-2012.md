# Linux kernel leap second bug, June 2012
company: Many internet services
date: 30 June to 1 July 2012
modules: linux, sre, observability
calc: redundancy
source: Kernel mailing list patch posting by the timekeeping developer | https://lkml.iu.edu/hypermail/linux/kernel/1207.0/00026.html
summary: A leap second exposed a kernel timekeeping bug that sent some Linux servers into high CPU load, and a simple workaround cleared it.

## Before you read on
A planned extra second is added to the clock. A service that waits on timers suddenly burns all its CPU on many servers at once. What would you check first?

## The system
Many sites ran Linux servers with network time synchronisation. Applications such as databases and Java programs rely on timers and futexes, which depend on kernel time handling.

## Timeline as reported
- At the end of 30 June 2012 a leap second was inserted into UTC.
- Soon after, many Linux servers reported sharply raised CPU use, in programs such as MySQL and Java processes.
- Several well known sites reported disruption at the same time.
- Engineers found that running the date command to set the time to its current value cleared the problem.
- A kernel developer posted a patch the next day, explaining that the kernel had not told its timer subsystem about the clock change when the leap second was applied.
- Kernels with the fix were released afterwards.

## Root cause
When the leap second was applied by the kernel, the high resolution timers were not told that the clock had changed, so timers expired repeatedly and processes spun on the CPU.

## What changed
- The kernel developers patched how a leap second is applied.
- Operators learned to test time changes and some chose to smear the extra second over a long period instead of adding it at once.

## Lessons learned
- Rare time events need rehearsal, such as testing a leap second in staging.
- Identical software on all servers fails at the same moment, so stagger changes where you can.
- Keep simple workarounds in runbooks, such as resetting the clock, with the risk explained.
- Monitor CPU anomalies across the fleet and not only per server.

## Trade-offs to weigh
- **Exact time against stable time.** Inserting a second is correct and risky, and smearing avoids a jump.
- **Uniform fleet against diversity.** One kernel is easy to manage and fails together.
- **Quick workaround against root cause.** A reset clears the symptom and needs a patch to fix the bug.

## Try the calculators
In the redundancy calculator, see how many identical servers fail together when the cause is shared.
