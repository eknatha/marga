---
title: GPU failures, Xid errors and recovery
minutes: 12
summary: Read GPU error codes, tell memory, thermal, link and driver faults apart, and drain, reset and replace GPUs safely.
---

GPU hardware is dense, hot and heavily used, so failures are normal. The kernel and NVIDIA tools report what went wrong, if you know where to look and what to do next.

## What you will learn

- Reading Xid messages and ECC counters
- Thermal, power and link problems
- Draining a node and resetting or replacing a GPU
- Automating detection and isolation

## Where to look

```bash
dmesg -T | grep -i "NVRM: Xid"
nvidia-smi -q -d ECC | grep -E "Uncorrectable|Correctable" | head
nvidia-smi --query-gpu=index,temperature.gpu,power.draw,clocks_throttle_reasons.active --format=csv
dcgmi diag -r 2
```

An **Xid** is an error code from the driver. Some point to an application bug, such as an illegal memory access, but others point to hardware: uncorrectable memory errors, a GPU that fell off the bus or repeated link errors. Look up the code in NVIDIA's table before acting.

## Fault families

- **Memory:** rising uncorrectable ECC errors or row remapping failures mean the GPU should be retired.
- **Thermal and power:** throttling reasons, high temperature and power capping point to cooling or power limits in the rack.
- **Link:** NVLink or PCIe errors can come from a seating problem, a cable or a failing board.
- **Driver and software:** hangs after upgrades or container mismatches are fixed by matching driver and CUDA versions.

## Respond

```bash
kubectl cordon gpu-node-7
kubectl drain gpu-node-7 --ignore-daemonsets --delete-emptydir-data
nvidia-smi --gpu-reset -i 3      # only if no process uses the GPU
```

Cordon and drain before touching hardware. A reset can clear transient faults, but repeated Xid errors or ECC failures mean replacement. Record the serial number and evidence for the vendor.

## Automate

Run DCGM health checks as a daemon set, export metrics to Prometheus and alert on Xid counts. A controller can taint a failing node automatically so new jobs avoid it.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How GPU failures, Xid errors and recovery fits together
node: n1 | Where to look | 0 | 0 | An Xid is an error code from the driver. | Touching hardware before draining the node. | process
node: n2 | Fault families | 1 | 1 | Memory: rising uncorrectable ECC errors or row remapping failures mean the GPU should be retired. | Treating every Xid as a software bug. | process
node: n3 | Respond | 2 | 0 | Cordon and drain before touching hardware. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n4 | Automate | 3 | 1 | Run DCGM health checks as a daemon set, export metrics to Prometheus and alert on Xid counts. | No alert on Xid or ECC counters. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: A GPU that fell off the bus

> **Incident:** A node lost one GPU in the middle of a job.

```console
NVRM: Xid (PCI:0000:3b:00): 79, GPU has fallen off the bus.
nvidia-smi: Unable to determine the device handle for GPU 3
job failed at step 18402
```

Xid 79 meant the card disappeared from the PCIe bus. A reboot brought it back briefly, but the error returned under load. The team drained the node, reseated and then replaced the GPU, and added an automatic taint on Xid 79 and 48 so jobs no longer landed there.

## Common mistakes

- Treating every Xid as a software bug
- Resetting repeatedly instead of replacing
- Touching hardware before draining the node
- No alert on Xid or ECC counters

```quiz
Q: What is an Xid?
+ A driver error code
- A pod label :: No.
- A cluster name :: No.
- A DNS record :: No.
> It reports GPU problems.

Q: What do rising uncorrectable ECC errors suggest?
+ A failing GPU memory
- A DNS issue :: No.
- A bad image :: No.
- A full disk :: No.
> Plan replacement. The lesson section above explains why.

Q: What should you do before servicing a GPU node?
+ Cordon and drain it
- Delete the cluster :: No.
- Disable logs :: No.
- Restart DNS :: No.
> Protect workloads. The lesson section above explains why.

Q: How automate isolation?
+ Taint nodes on bad health signals
- Ignore errors :: No.
- Add more pods :: No.
- Change the password :: No.
> New jobs avoid the node.
```

```cards
Xid :: NVIDIA driver error code
DCGM :: Data Center GPU Manager for health and metrics
ECC :: Error-correcting memory
Cordon :: Mark a node unschedulable
```
