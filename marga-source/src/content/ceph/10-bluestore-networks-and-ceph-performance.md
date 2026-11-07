---
title: BlueStore, networks and Ceph performance
minutes: 13
summary: Find and fix Ceph performance limits: media choices, DB and WAL placement, public and cluster networks, benchmarks with rados and rbd, and recovery throttling.
---

A Ceph write travels from the client to a primary OSD, then to its replicas over the network, and is acknowledged only when all have it. Anything slow along that path slows the write.

## What you will learn

- Choosing media and where the DB and WAL go
- Public and cluster networks
- Benchmarking before and after a change
- Keeping recovery from hurting clients

## Media

NVMe gives the best latency for RBD databases. SSD suits general VM storage. Hard drives suit capacity for object data, with DB and WAL on flash. Use enterprise drives with power loss protection, because Ceph asks drives to flush data safely. Plan memory: the default `osd_memory_target` is 4 GiB per OSD.

## Networks

Client traffic uses the **public network**. Replication, recovery and heartbeats can use a separate **cluster network**. Because each client write becomes two further replica writes, cluster traffic is roughly twice the client load, plus recovery. Use at least 25 GbE for dense nodes, and make sure MTU matches on every switch if you use jumbo frames.

```diagram
title: A replicated write
node: cli | Client | 0 | 1 | Sends the write to the primary OSD. | A slow client link caps throughput. | client
node: pri | Primary OSD | 1 | 1 | Writes locally and forwards to replicas. | One slow disk delays every write that uses it. | store
node: r1 | Replica OSD 2 | 2 | 0 | Writes the copy and acknowledges. | Cluster network congestion slows it. | store
node: r2 | Replica OSD 3 | 2 | 2 | Writes the copy and acknowledges. | A busy recovery competes for the same disk. | store
node: ack | Acknowledge | 3 | 1 | Sent to the client after all copies are safe. | Latency is the slowest replica. | process
edge: cli | pri
edge: pri | r1
edge: pri | r2
edge: r1 | ack
edge: r2 | ack
```

## Benchmarks

```bash
rados bench -p testpool 30 write --no-cleanup
rados bench -p testpool 30 seq
rbd bench --io-type write --io-size 4K --io-threads 16 rbd/test
fio --name=t --filename=/dev/rbd0 --rw=randwrite --bs=4k --iodepth=32 --runtime=60 --direct=1
```

Run the same test before and after each change, and run it from more than one client. A single client may hit its own limit.

## Recovery and scrub

Recovery and backfill compete with clients. The **mClock** scheduler lets you choose a profile such as `high_client_ops`. Schedule scrubs outside business hours.

## Incident: Latency spikes after every disk swap

> **Incident:** Replacing a failed disk made VMs slow for hours.

```console
$ ceph -s | grep -E 'recovery|client'
    client:   220 MiB/s rd, 90 MiB/s wr
    recovery: 780 MiB/s, 190 objects/s
$ ceph config get osd osd_mclock_profile
high_recovery_ops
```

The cluster had been left on the high_recovery_ops profile after an earlier rebuild, so recovery used most of the disk bandwidth. Switching to balanced kept clients responsive while data healed.

## Common mistakes

- Using consumer SSDs without power loss protection
- Changing several settings at once
- Benchmarking from one client only
- Leaving recovery at maximum priority

```quiz
Q: Where does client traffic flow?
+ The public network
- Only the cluster network :: No.
- The monitor only :: No.
- The MDS only :: No.
> Clients use the public network.

Q: When is a replicated write acknowledged?
+ After all copies are written
- After the first copy :: No.
- Before writing :: No.
- Never :: No.
> Latency follows the slowest replica.

Q: What does mClock help with?
+ Balancing client and recovery IO
- Creating pools :: No.
- Adding monitors :: No.
- Changing DNS :: No.
> It prioritises operations.

Q: What should DB and WAL go on for HDD OSDs?
+ Flash
- Another HDD :: No.
- A USB stick :: No.
- Tape :: No.
> Flash speeds metadata and small writes.
```

```cards
Public network :: The network clients use to reach Ceph
Cluster network :: A network for replication and recovery traffic
mClock :: A scheduler that balances client and background IO
rados bench :: A tool that measures raw object performance
osd_memory_target :: The memory target for each OSD
```
