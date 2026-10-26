---
title: Namespaces and cgroups: what a container really is
minutes: 15
summary: Understand the two kernel features behind every container, namespaces that limit what a process can see and cgroups that limit what it can use, and inspect them with plain Linux tools.
---

A container is not a small virtual machine. It is an ordinary Linux process that the kernel has been told to treat in two special ways: it sees a restricted view of the system, and it may use only a limited amount of resources. Both features are in the kernel itself, and you can use them without Docker. Knowing this makes container behaviour, limits and escapes much easier to reason about.

## What you will learn

- The main namespace types and what each isolates
- How cgroups limit CPU, memory and process counts
- How to look at both for any running process
- Why memory limits kill processes, and why "container root" is still root

## Namespaces: a restricted view

| Namespace | Isolates | Effect |
|-----------|----------|--------|
| pid | Process ids | The first process inside is pid 1 and cannot see host processes |
| net | Network devices, addresses, routes | Its own interfaces and ports |
| mnt | Mount points | Its own filesystem view |
| uts | Hostname | Its own hostname |
| ipc | Shared memory and queues | No sharing with other groups |
| user | User and group ids | Root inside can be a normal user outside |
| cgroup | The cgroup tree | Hides the host's resource layout |

```console
$ sudo unshare --pid --fork --mount-proc --uts bash
# hostname lab && ps aux
USER  PID %CPU %MEM COMMAND
root    1  0.0  0.1 bash
root    8  0.0  0.0 ps aux
```

Inside the new shell only two processes exist, because the pid namespace hides the rest. Every process has links to its namespaces in `/proc`:

```bash
ls -l /proc/$$/ns            # namespace ids of the current shell
sudo nsenter -t 4321 -n ip a # run `ip a` inside the network namespace of process 4321
lsns                         # list namespaces on the host
```

`nsenter` is the way to debug a container that has no tools: run the host's tools inside the container's namespaces.

## cgroups: a limited budget

Control groups account for and limit resources of a set of processes. On modern systems (cgroup v2) they appear as files:

```bash
cat /sys/fs/cgroup/system.slice/shop.service/memory.max     # memory limit in bytes
cat /sys/fs/cgroup/system.slice/shop.service/memory.current # use right now
cat /sys/fs/cgroup/system.slice/shop.service/cpu.max        # quota and period, e.g. 50000 100000 = half a CPU
cat /sys/fs/cgroup/system.slice/shop.service/pids.max
```

Memory is a hard limit: when a group goes over `memory.max` and cannot free memory, the kernel kills a process in it (an OOM kill, exit code 137). CPU is a throttle: a group over its quota is paused until the next period, which shows up as latency, not as a crash. Check `cpu.stat` for `nr_throttled`.

systemd uses cgroups too: `systemctl set-property shop.service MemoryMax=512M CPUQuota=50%` sets limits on a service with no containers at all.

## What this means in practice

- A container shares the host kernel, so a kernel bug affects every container. This is the main difference from a virtual machine.
- Root in a container is real root unless a user namespace maps it. Drop capabilities, run as non-root, and use seccomp profiles.
- Tools inside a container may show the host's memory or CPU count, not the limit, so applications must read cgroup values to size themselves.

```predict
Q: A container has a CPU limit of 0.5 CPU and an application that wants a full core. What does the application experience?
???
It is throttled: it runs for part of each scheduling period and waits for the rest, so requests become slower, but it is not killed.
> CPU is a rate limit. Memory is the resource that causes kills. Look at nr_throttled in cpu.stat to confirm throttling.
```

## Incident: the Java service that kept dying

> **Incident:** A service in a container with a 1 GB limit is killed every few hours with exit code 137, while its own heap setting looks safe.

```console
$ cat /sys/fs/cgroup/memory.max
1073741824
$ cat /sys/fs/cgroup/memory.events
oom_kill 7
```

The runtime saw the host's 64 GB and sized its heap and thread stacks for that, so total process memory (heap plus native memory) went past 1 GB. The team set the heap as a percentage of the container limit, left room for native memory, and alerted on `memory.current` approaching `memory.max`.

## Common mistakes

- Thinking a container is a virtual machine
- Reading `free` inside a container and trusting it as the limit
- Setting a memory limit equal to the heap size
- Giving containers capabilities "to make it work"

```quiz
Q: What does a pid namespace do?
- Limits CPU time :: That is a cgroup job.
+ Gives a process group its own view of process ids
- Encrypts memory :: Namespaces do not encrypt.
- Creates a new kernel :: All containers share one kernel.
> A pid namespace hides other processes, and the first inside sees itself as pid 1.

Q: Which kernel feature limits how much memory a container may use?
- Namespaces :: They limit what can be seen, not used.
+ cgroups
- iptables :: It filters packets.
- chroot :: It changes the visible root directory only.
> cgroups account for and cap CPU, memory, process counts and I/O.

Q: What happens when a cgroup exceeds its CPU quota?
- The process is killed :: Memory limits kill; CPU limits throttle.
+ It is paused until the next period, so it runs slower
- The host reboots :: No such behaviour.
- The limit is ignored :: The quota is enforced by the scheduler.
> Throttling shows up as latency and as a rising nr_throttled counter.

Q: How can you run host tools inside a container's network namespace?
- docker prune :: It removes unused objects.
+ nsenter -t PID -n command
- chmod :: It changes permissions.
- mount :: It attaches filesystems.
> nsenter joins the namespaces of another process, so you can debug images that ship no tools.
```

```cards
What does a namespace limit? :: What a process can see
What does a cgroup limit? :: What a process can use
Exit code for an OOM kill? :: 137
Why is a container not a VM? :: It shares the host kernel
Which command lists namespaces? :: lsns
```
