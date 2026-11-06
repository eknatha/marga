---
title: Storage benchmarking with fio
minutes: 12
summary: Measure disks and volumes with fio using realistic block sizes, queue depths and read-write mixes, and read latency percentiles correctly.
---

Disks are described by throughput numbers that rarely match application behavior. A database does small random reads and writes, while backups stream large files. fio lets you reproduce both and see the difference.

## What you will learn

- What IOPS, bandwidth and latency mean
- Writing fio jobs for common workloads
- Reading percentile latency
- Safe testing practices

## The basics

**IOPS** counts operations per second, **bandwidth** is bytes per second and **latency** is the time per operation. They depend on block size and queue depth. Small random operations stress IOPS and latency, while large sequential operations stress bandwidth.

## Jobs for real workloads

```text
; db-like.fio  - random 8k, 70% reads, queue depth 32
[db-like]
filename=/mnt/scratch/fio.dat
size=4G
direct=1
ioengine=libaio
rw=randrw
rwmixread=70
bs=8k
iodepth=32
numjobs=4
time_based=1
runtime=60
group_reporting=1
```

```bash
fio db-like.fio
fio --name=seqread --filename=/mnt/scratch/fio.dat --size=4G --direct=1 \
    --rw=read --bs=1M --iodepth=8 --runtime=30 --time_based
```

`direct=1` bypasses the page cache, otherwise you measure memory. Match `bs`, `iodepth` and the read-write mix to your application. Run longer than the time a burst allowance lasts on cloud volumes.

## Reading the result

```console
read: IOPS=11.2k, BW=87.5MiB/s
  clat percentiles (usec):
   | 50.00th=[  620], 95.00th=[ 1860], 99.00th=[ 7300], 99.90th=[21100]
```

Look at the **percentiles**, especially the 99th and 99.9th. Averages hide the slow tail that users feel. Compare results with the limits of the volume type, and watch `iostat -x` during the test.

## Safety

Never run write tests on a device holding data. Use a scratch file or a new volume, and delete it afterwards. Test during maintenance windows on shared storage, since heavy tests affect neighbours.

## Incident: Fast in the test, slow in production

> **Incident:** A sequential test hid poor random latency.

```console
seqread: BW=1.2GiB/s
randread 4k, iodepth=1: p99 latency 14ms
database commit latency: 19ms
```

The team had chosen a throughput-optimized volume after a large-file test. The database needed low-latency random I/O. They switched to a volume type designed for IOPS and confirmed it with a random test that matched the database settings.

## Common mistakes

- Testing without direct I/O
- Only measuring sequential throughput
- Reading averages and ignoring the tail
- Writing to a device that holds data

```quiz
Q: What does direct=1 do?
+ Bypasses the page cache
- Deletes the file :: No.
- Increases RAM :: No.
- Encrypts data :: No.
> You measure the device.

Q: Which metric shows the slow tail?
+ 99th percentile latency
- Average bandwidth :: No.
- File size :: No.
- Block size :: No.
> Tail latency hurts users.

Q: What stresses IOPS?
+ Small random operations
- Large sequential reads :: No.
- Idle disks :: No.
- Compression :: No.
> Block size matters. The lesson section above explains why.

Q: Where run write tests?
+ On a scratch volume
- On production data disks :: No.
- On boot disks :: No.
- Anywhere :: No.
> Avoid data loss. The lesson section above explains why.
```

```cards
IOPS :: Input and output operations per second
Queue depth :: Number of outstanding I/O operations
Percentile latency :: Latency that a given share of operations beats
Direct I/O :: I/O that bypasses the page cache
```
