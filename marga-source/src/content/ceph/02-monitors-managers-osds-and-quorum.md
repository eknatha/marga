---
title: Monitors, managers, OSDs and quorum
minutes: 13
summary: Learn how monitors reach quorum, what managers and OSDs do, how BlueStore stores data, and how to read daemon status.
---

Four words explain most Ceph status output: quorum, up, down and in. Learn what each one means and what BlueStore does under an OSD.

## What you will learn

- Quorum and why monitors come in odd numbers
- Manager and its modules
- OSD states: up, down, in and out
- BlueStore, the DB and WAL devices

## Quorum

Monitors keep the authoritative cluster map: who the monitors and OSDs are, where they are, and how data is placed. They agree on changes by majority vote. With three monitors you can lose one; with five you can lose two. Two monitors tolerate nothing, since losing one leaves no majority. Without quorum clients can no longer find data.

## Managers

The **manager** daemon collects metrics, runs the dashboard and Prometheus exporter, and hosts modules such as the PG autoscaler and the orchestrator. Run at least two: one active, one standby.

## OSD states

An OSD has two independent states. **Up or down** says whether the daemon is running and talking. **In or out** says whether it takes part in data placement. A crashed OSD becomes down; after a timeout (10 minutes by default) it is marked out, and the cluster starts re-creating its data elsewhere.

```diagram
title: What happens when an OSD fails
node: up | OSD up and in | 0 | 1 | Serves reads and writes for its placement groups. | Hardware errors may appear before it fails. | store
node: down | OSD down | 1 | 0 | The daemon stopped answering; data is still on the disk. | Short outages heal quickly when it returns. | observe
node: out | OSD out | 2 | 1 | After the timeout the cluster stops waiting for it. | Recovery now copies data to other OSDs. | process
node: rec | Recovery and backfill | 3 | 0 | Other OSDs rebuild the missing copies. | Heavy recovery traffic can slow clients. | process
edge: up | down
edge: down | out
edge: out | rec
edge: down | up
```

## BlueStore

BlueStore manages the raw device itself. Object data goes to the main device; metadata goes to RocksDB; a write-ahead log makes writes safe. For hard drives, place the DB and WAL on an SSD or NVMe to speed up metadata and small writes. Size the DB at roughly 1 to 4 percent of the data device.

```bash
ceph -s
ceph osd tree
ceph osd stat
ceph mon stat
```

## Incident: Lost quorum in one rack

> **Incident:** A power cut stopped all storage IO.

```console
$ ceph -s
  cluster:
    health: HEALTH_ERR
            1/3 mons down, quorum a
  services:
    mon: 3 daemons, quorum a (age 4m)
```

When the power dropped, two monitors failed together because they shared a rack. The one survivor could not form a majority. After power returned, the team spread monitors across three racks.

## Common mistakes

- Running an even number of monitors
- Placing all monitors in one failure domain
- Confusing down with out
- Putting DB and WAL for many OSDs on one small SSD

```quiz
Q: How many monitors can a five monitor cluster lose?
+ Two
- Four :: No.
- None :: No.
- Five :: No.
> A majority of three is still needed.

Q: What does out mean for an OSD?
+ It no longer takes part in placement
- It is faster :: No.
- It is encrypted :: No.
- It is a monitor :: No.
> Data is rebuilt elsewhere.

Q: What stores metadata inside BlueStore?
+ RocksDB
- A MySQL table :: No.
- The monitor :: No.
- The manager :: No.
> RocksDB holds the metadata.

Q: Why run two managers?
+ One active and one standby
- To double capacity :: No.
- To avoid monitors :: No.
- To use S3 :: No.
> The standby takes over.
```

```cards
Quorum :: A majority of monitors that agree on the cluster map
Up and down :: Whether an OSD daemon is running and reachable
In and out :: Whether an OSD takes part in data placement
BlueStore :: Ceph's storage backend that writes directly to the device
Manager :: The daemon for metrics, dashboard and modules
```
