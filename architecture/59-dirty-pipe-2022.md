# Dirty Pipe kernel vulnerability, 2022
company: Linux kernel project
date: February and March 2022
modules: linux, devsecops, docker
calc: redundancy
source: Report by the researcher who found it | https://dirtypipe.cm4all.com/
summary: A flaw in the Linux pipe code let an unprivileged user overwrite data in read-only files, which could lead to full control of the machine.

## Before you read on
A user without privileges can write into files they can only read, through a kernel path nobody thought of. What does that mean for containers and for shared hosts?

## The system
Pipes pass data between processes. The kernel can move pages of file data into a pipe without copying, and flags on each pipe buffer say how it may be used.

## Timeline as reported
- In early 2022 a developer investigating corrupted download logs traced the problem to a kernel flaw and then recognised it as a security hole.
- The flaw, tracked as CVE-2022-0847, existed since kernel 5.8 and let an attacker overwrite parts of files in the page cache, including files opened read-only.
- It could be used to change files such as ones that grant privileges and so to become root.
- The researcher reported it to the kernel security team in February 2022.
- Fixed kernel versions were released in late February 2022 and distributions published updates.
- Containers were also affected, because they share the host kernel.

## Root cause
A buffer flag that says data may be merged was not reset in new code paths, so later writes could modify pages that belong to a file.

## What changed
- Kernel maintainers fixed the flag handling in the stable series.
- Distributions shipped updated kernels, and cloud providers updated managed images.

## Lessons learned
- Containers share the host kernel, so kernel flaws cross container boundaries.
- Keep a process for rolling kernel updates quickly, including reboots and live patching.
- Track kernel versions in your inventory so you know which hosts are exposed.
- Limit what untrusted users and workloads can run on shared hosts.

## Trade-offs to weigh
- **Shared kernel against stronger isolation.** Containers are light and share the kernel, while virtual machines isolate more.
- **Live patching against reboot.** Live patches avoid downtime and cover fewer cases.
- **Fast updates against stability.** Rapid kernel updates reduce exposure and need testing.

## Try the calculators
In the redundancy calculator, see why many containers on one kernel share one failure.
