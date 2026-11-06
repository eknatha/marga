---
title: eBPF and bpftrace: ask live questions of a running system
minutes: 14
summary: Understand what eBPF is and use bpftrace one-liners and ready-made tools to answer live questions about files, processes and latency.
---

strace follows one program. eBPF lets you ask a question of the whole machine: who opens files, which processes start, how long do disk requests take. It is the modern way to observe Linux, and it is how many monitoring and networking tools work under the hood.

## What you will learn

- What eBPF is and why the kernel can run it safely
- Probes: tracepoints, kprobes and uprobes
- Useful bpftrace one-liners
- Ready-made tools and their cost

## What eBPF is

eBPF is a way to load small programs into the kernel. Before one runs, the kernel's **verifier** checks that it cannot crash or loop forever. The program attaches to an event, counts or times it, and stores results in a **map** that user space reads. No kernel module, no reboot, and no change to the application.

## Probes

| Probe | Fires when |
|---|---|
| `tracepoint:` | A stable kernel event happens, such as `syscalls:sys_enter_openat` |
| `kprobe:` | A kernel function is called |
| `uprobe:` | A function in a user program or library is called |
| `interval:` | Every N seconds, to print results |

## One-liners

```console
$ sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { @[comm] = count(); }'
^C
@[node]: 120
@[backup-tool]: 98213

$ sudo bpftrace -e 'tracepoint:sched:sched_process_exec { printf("%s -> %s\n", comm, str(args->filename)); }'
$ sudo bpftrace -e 'kprobe:vfs_read { @bytes = hist(arg2); }'
```

The first counts file opens per process name: `backup-tool` stands out. The second prints every program that starts. The third shows a histogram of read sizes.

Ready-made tools from the BCC and bpftrace collections cover common questions: `execsnoop` (new processes), `opensnoop` (file opens), `biolatency` (disk latency histogram), `tcpconnect` (outgoing connections), `runqlat` (CPU scheduling delay).

```diagram
title: How an eBPF question is answered
node: you | Your question | 0 | 0 | For example: which process opens the most files. | A vague question gives a flood of output.
node: bt | bpftrace script | 1 | 0 | Compiles the one-liner into a small kernel program. | A wrong probe name fails at load time, which is safe.
node: ver | Kernel verifier | 2 | 0 | Rejects programs that could crash or loop forever. | Without it, tracing could take down the host. | security
node: probe | Probe in the kernel | 3 | 0 | Runs on each matching event and updates a map. | A very hot probe adds overhead; keep programs small.
node: out | Results | 2 | 1 | The map is read and printed when you stop. | Remember to stop the trace; it keeps running until you do. | observe
edge: you | bt
edge: bt | ver
edge: ver | probe
edge: probe | out
```

## Care and limits

eBPF needs a fairly recent kernel and root (or specific capabilities). Overhead is usually small, but a probe on a very busy function adds up, so stop traces when finished and test on a quiet host first. Output names a process by `comm`, which is only 15 characters; use PID when names collide. In containers, you see the host's processes unless you filter by cgroup.

## Incident: The process nobody could name

> **Incident:** A host spent most of its time reading tiny files, and top showed many processes at low use each.

```console
$ sudo bpftrace -e 'tracepoint:syscalls:sys_enter_openat { @[comm] = count(); }'
@[backup-tool]: 98213
@[node]: 120
@[sshd]: 14
```

The backup tool scanned a directory with hundreds of thousands of small files every minute. The team changed it to run hourly with a list of changed files, and file-open counts dropped to normal.

## Common mistakes

- Leaving a trace running after the question is answered
- Tracing a hot kernel function on a busy production host without testing
- Trusting comm names when two programs share a name
- Using eBPF when a simple log line would answer the question

```quiz
Q: What does the verifier do?
+ Checks an eBPF program is safe before it runs
- Compiles C code :: No.
- Encrypts maps :: No.
- Starts containers :: No.
> It prevents crashes and infinite loops.

Q: Which probe type attaches to a stable kernel event?
+ tracepoint
- uprobe on a library :: No.
- interval :: No.
- map :: No.
> Tracepoints are stable interfaces.

Q: When is eBPF better than strace?
+ When you do not know which process to look at
- When you have one known process :: No.
- When no kernel exists :: No.
- When you only need one file :: No.
> It observes the whole machine.

Q: What is one risk of eBPF tracing?
+ Overhead on very busy probes
- Deleting files :: No.
- Opening ports :: No.
- Changing the kernel version :: No.
> Keep probes small and stop traces after use.
```

```cards
eBPF :: A way to run small verified programs inside the Linux kernel
bpftrace :: A short scripting language for eBPF tracing
Tracepoint :: A stable instrumentation point in the kernel
kprobe :: A probe on any kernel function
Map :: A kernel data structure used to pass results to user space
```
