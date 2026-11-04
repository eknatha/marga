---
title: Monitoring and debugging GPU workloads
minutes: 15
summary: Read nvidia-smi, use DCGM metrics, and diagnose out-of-memory errors, throttling, hung multi-GPU jobs and failed cards.
---

GPU problems look like application problems until you look at the GPU. A few tools and patterns find most of them.

## What you will learn

- Reading nvidia-smi
- DCGM and the metrics worth alerting on
- The usual faults: out of memory, throttling, XID errors, hangs
- A debugging order

## nvidia-smi

```console
$ nvidia-smi
| GPU  Name              Persistence-M | Bus-Id       Disp.A | Volatile Uncorr. ECC |
| Fan  Temp   Perf       Pwr:Usage/Cap |         Memory-Usage | GPU-Util  Compute M. |
|   0  NVIDIA A100-SXM4-80GB        Off | 00000000:07:00.0 Off |                    0 |
| N/A   71C    P0     392W / 400W |  78410MiB / 81920MiB |     99%      Default |
| Processes:
|  GPU  PID    Type  Process name                              GPU Memory Usage |
|    0  18211  C     /usr/bin/python3                                  78120MiB |
```

- **Memory-Usage** is the first thing to check for out-of-memory problems. The **Processes** list says which program holds it.
- **GPU-Util** is the share of time at least one kernel was running. It is not a measure of how efficient the work is.
- **Temp** and **Pwr** near the cap can lead to throttling.
- **ECC errors** (the "Volatile Uncorr. ECC" column) above zero point to a failing memory.
- `nvidia-smi dmon` streams utilization, and `nvidia-smi -q` prints everything.

## DCGM and metrics

In Kubernetes, the **DCGM exporter** publishes GPU metrics for Prometheus. Useful ones include GPU utilization, framebuffer memory used, temperature, power, SM clock and XID errors. Alert on:

- Memory used close to total for several minutes
- Temperature or power at limits with clocks dropping (throttling)
- Any XID error or growing ECC error count
- Utilization near zero on a pod that holds a GPU (an idle reservation that costs money)

## Common faults

**Out of memory (OOM).** The message names the sizes:

```console
torch.OutOfMemoryError: CUDA out of memory. Tried to allocate 2.00 GiB.
GPU 0 has a total capacity of 79.15 GiB of which 1.12 GiB is free.
```

Check which process holds the memory (another model on the same card is common), reduce the batch size or context length, lower `--gpu-memory-utilization`, quantize, or split across GPUs. A leftover process from a crashed job can hold memory: find it in `nvidia-smi` and stop it.

**Throttling.** The GPU lowers its clocks when hot or at a power limit, and speed drops without an error. Check temperature, fan or cooling, and clock values. A card that is slow only in the afternoon often points to cooling.

**XID errors.** The driver writes them to the kernel log:

```console
$ dmesg | grep -i xid
NVRM: Xid (PCI:0000:07:00): 79, pid=18211, GPU has fallen off the bus.
```

XID 79 means the GPU has fallen off the bus: usually a hardware, power or seating fault. Drain the node, move the work, and have the hardware checked. Other codes have their own meanings in NVIDIA's documentation; look each one up.

**Hung multi-GPU jobs.** Training or tensor-parallel serving uses NCCL for communication. If one rank dies or the network between nodes fails, the others wait forever and show 100 percent utilization while doing nothing. Set `NCCL_DEBUG=INFO` to see where it stops, set timeouts, and check that all ranks started and the network interfaces are right.

**Driver and CUDA mismatches.** A container's CUDA version must be supported by the host driver. Errors such as "CUDA driver version is insufficient for CUDA runtime version" mean the driver needs updating or the image needs an older CUDA.

## Debugging order

1. Is the GPU visible? `nvidia-smi`, then inside the container.
2. Is memory full, and who holds it?
3. Are temperature, power and clocks normal?
4. Does the kernel log show XID errors?
5. For multi-GPU work, did every rank start and can they talk?
6. Do driver and library versions match?

## Incident: The job that ran at 100 percent and did nothing

> **Incident:** A four-GPU training job showed full utilization for six hours and no progress.

```console
$ kubectl logs trainer-2 | tail -2
[rank2] NCCL WARN Net : Connect to 10.0.4.17<45214> failed : Connection timed out
$ kubectl get pods -l job=train -o wide | grep -c Running
3
```

Only three of four workers were running. The fourth had been evicted from its node, and the other three waited for it inside a collective operation, which keeps the GPU shown as busy. Utilization was a misleading signal. The team added a job-level timeout so the group failed fast, restarts from checkpoints, and alerts when the number of running workers is below the expected count. A busy GPU is not the same as progress.

## Common mistakes

- Using GPU-Util as a measure of useful work
- Ignoring the kernel log for XID errors
- Running two memory-hungry processes on one card
- No timeouts on collective operations

```quiz
Q: Which tool shows GPU memory use and which process holds it?
+ nvidia-smi
- df -h :: It shows disk space.
- ping :: It tests the network.
- lsblk :: It lists disks.
> The Processes section names the holders.

Q: What does XID 79, GPU has fallen off the bus, usually indicate?
+ A hardware, power or seating problem
- A full disk :: No.
- A slow network :: No.
- A wrong model name :: No.
> Drain the node and check the hardware.

Q: Why can a hung multi-GPU job show 100 percent utilization?
+ GPUs wait inside a collective operation for a missing worker
- The job is almost finished :: No.
- The cards are overclocked :: No.
- The scheduler boosts them :: No.
> Busy is not progress.

Q: What is a first step for CUDA out of memory?
+ See which process holds the memory and reduce batch or context
- Reinstall the OS :: Not a first step.
- Disable ECC :: No.
- Add more CPUs :: No.
> Memory is usually the limit.
```

```cards
DCGM :: NVIDIA data centre GPU monitoring
XID :: driver error code in the kernel log
ECC :: error correcting memory
Throttling :: clocks lowered by heat or power
NCCL :: library for GPU communication
OOM :: out of memory
```
