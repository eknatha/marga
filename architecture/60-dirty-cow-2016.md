# Dirty COW kernel vulnerability, 2016
company: Linux kernel project
date: October 2016
modules: linux, devsecops, docker
calc: redundancy
source: Public site describing CVE-2016-5195 | https://dirtycow.ninja/
summary: A race condition in copy-on-write handling had existed for years and let local users write to read-only memory mappings, and attacks in the wild were reported.

## Before you read on
If a bug lets a normal user write to memory that should be read-only, how many servers in your estate run an affected kernel, and how fast can you update them?

## The system
Copy-on-write lets processes share memory pages until one of them writes. The kernel copies the page at that moment. The code involved is old and heavily used.

## Timeline as reported
- A security researcher found evidence of an attack in the wild and reported the race condition.
- The flaw, tracked as CVE-2016-5195, had been present in the kernel for about nine years.
- A local attacker could win a race between memory operations and write to read-only mappings, and so gain root access.
- Fixes were released for the supported kernel series in October 2016.
- Distributions and cloud providers rolled out updated kernels and many hosts needed a reboot.

## Root cause
A race condition in the memory management code, in the handling of the copy-on-write step for read-only mappings.

## What changed
- The fix changed how the kernel handles write faults on such mappings.
- Many teams improved their kernel patching and reboot procedures.

## Lessons learned
- Know your kernel versions, and how fast you can reboot the fleet.
- Old code can hide serious bugs, so do not assume age means safety.
- Detect privilege escalation with auditing and file integrity monitoring.
- Limit local access on shared systems to people and workloads that need it.

## Trade-offs to weigh
- **Reboot windows against exposure time.** Waiting for a window prolongs the risk.
- **Rapid rollout against testing.** Fast rollout uses staged groups.
- **Detailed monitoring against noise.** More detection finds attacks and creates more alerts.

## Try the calculators
In the redundancy calculator, see how fleet-wide shared flaws defeat redundancy.
