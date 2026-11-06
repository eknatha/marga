---
title: VM backup, replication and recovery
minutes: 12
summary: Back up virtual machines with snapshots and agents, replicate to another site and test restores against recovery objectives.
---

Virtual machines make copying easy and recovery tempting to take for granted. The details of consistency, storage location and restore speed decide whether a backup actually saves you.

## What you will learn

- Snapshots versus backups
- Application-consistent backups and guest agents
- Replication and failover to a second site
- Restore testing and retention

## Snapshots and backups

A **snapshot** records a VM's disk state at a moment and stores changes separately. It lives on the same storage and slows down as it grows, so use it for short-lived rollback points before a change. A **backup** is a copy on separate storage with retention, and it survives loss of the primary storage.

```bash
virsh snapshot-create-as web-01 pre-upgrade --disk-only --atomic
virsh snapshot-list web-01
virsh blockcommit web-01 vda --active --pivot     # merge the snapshot back when done
```

## Consistency

A crash-consistent copy is like pulling the power: filesystems usually recover, but databases may need repair. For **application-consistent** backups, use the guest agent to freeze the filesystem or tell the application to flush data.

```bash
virsh domfsfreeze web-01
# take the storage snapshot or copy
virsh domfsthaw web-01
```

Keep the freeze short, and use database-native backups for large critical databases.

## Replication

Replicate changed blocks to another site on a schedule or continuously, so that a failover boots a recent copy. Know your **RPO**, set by replication lag, and **RTO**, set by how fast the copy can boot and the network can be reconfigured.

## Restore tests

Schedule restores into an isolated network, boot the VM, check that the service answers and record the time. Keep retention tiers such as daily, weekly and monthly, and protect some copies from deletion, for example with immutable storage.

## Incident: The snapshot that filled the datastore

> **Incident:** A long-lived snapshot grew until it filled storage.

```console
datastore: 100% used
web-01 snapshot delta: 1.2 TB, snapshot age 71 days
VMs paused: 38
```

Someone had used a snapshot as a backup before an upgrade and forgot to remove it. The delta grew until the datastore filled and VMs paused. The team limited snapshot age by policy, added alerts and moved to scheduled backups on separate storage.

## Common mistakes

- Using snapshots as backups
- Backups on the same storage as the VMs
- Never testing a restore
- Ignoring application consistency

```quiz
Q: What is the difference between snapshot and backup?
+ A backup lives on separate storage
- They are the same :: No.
- Snapshots last forever :: No.
- Backups are faster only :: No.
> Failure domains differ.

Q: What does a guest agent help with?
+ Application-consistent copies
- Billing :: No.
- DNS :: No.
- Cooling :: No.
> It freezes or flushes data.

Q: What determines RPO in replication?
+ Replication lag
- CPU speed :: No.
- Image size :: No.
- VM name :: No.
> Data loss is bounded by lag.

Q: How know a backup works?
+ Restore it and test the service
- Check the job status only :: No.
- Trust the logs :: No.
- Count files :: No.
> Restore tests prove it.
```

```cards
Snapshot :: Short-lived point-in-time disk state
Application-consistent :: Backup that flushes application data first
Replication :: Copying changes to another site
Immutable backup :: Backup that cannot be altered or deleted
```
