---
title: Virtualization operations: libvirt and KVM day-two work
minutes: 13
summary: Run KVM hosts with libvirt day to day: inspect and change guests, take snapshots and backups safely, patch hosts with live migration, and keep configuration consistent.
---

After the first guests are running, the work is routine and risky in equal parts: adding disks, changing memory, taking snapshots before changes, patching the host without downtime and keeping many hosts consistent. These tasks have safe, repeatable procedures.

## What you will learn

- Inspect and adjust guests with `virsh`
- Snapshots and backups, and their limits
- Patching hosts with live migration
- Keeping host configuration consistent

## Know the state

```console
$ virsh list --all
$ virsh dominfo vm-web-01
$ virsh domblklist vm-web-01
$ virsh dumpxml vm-web-01 | head -40
$ virsh pool-list --details
$ virsh net-list --all
```

The domain XML is the source of truth for a guest: CPUs, memory, disks, NICs, devices. Treat it as configuration: keep copies, change it with `virsh edit` or an automation tool, and know that some changes apply only after a guest restart (use `--config` for persistent changes and `--live` for the running guest).

```console
$ virsh setmem vm-web-01 4G --config --live
$ virsh attach-disk vm-web-01 /var/lib/libvirt/images/data2.qcow2 vdb --persistent --subdriver qcow2
```

## Snapshots and backups

A snapshot captures a guest's disk state (and optionally memory) at a moment. Internal snapshots live in the qcow2 file, external ones create an overlay file. Snapshots are good for short-term protection before a change, but long chains slow I/O and are fragile, and a snapshot on the same storage is not a backup.

```console
$ virsh snapshot-create-as vm-web-01 pre-upgrade --disk-only --atomic --quiesce
$ virsh snapshot-list vm-web-01
$ virsh blockcommit vm-web-01 vda --active --pivot
```

`--quiesce` asks the guest agent to freeze the filesystem for a consistent image, which needs `qemu-guest-agent` in the guest. After the change is confirmed, merge the overlay back (blockcommit) and delete old snapshot metadata. For real backups, copy consistent images or use backup APIs to a separate system, and test restoring a guest on another host.

## Patching a host without downtime

1. Check capacity: the other hosts must have room for the guests on this one.
2. Mark the host unavailable for new guests (in a cloud layer, disable the compute service).
3. **Live migrate** guests away.
4. Patch and reboot, check, and put the host back.

```console
$ virsh migrate --live --persistent --undefinesource vm-web-01 qemu+ssh://kvm02/system
$ virsh domjobinfo vm-web-01
```

Live migration needs compatible CPU models, shared or migratable storage, a stable network between hosts and enough bandwidth to copy dirty memory faster than the guest changes it. Guests with very high write rates may not converge; use auto-converge or post-copy options, or migrate in a quiet period.

## Consistent hosts

Manage hosts as code: the same kernel and QEMU versions per pool, the same network and storage definitions, one source for libvirt networks and pools. Drift between hosts is the root of failed migrations ("works on kvm01, fails on kvm02").

```predict
Q: A live migration to a patched host fails with a CPU feature error. What is the likely cause?
???
The destination host's CPU model or features differ from the source. Use a common CPU model for guests in a pool, or keep hosts of one generation together.
> Migration needs compatible CPUs.
```

## Incident: The snapshot chain

> **Incident:** A database guest became slower every week, and finally froze when its datastore filled.

```console
$ virsh snapshot-list db-prod-02 --tree | head
pre-upgrade-1
  |
  +- pre-upgrade-2
       |
       +- pre-patch
            |
            +- pre-schema-change
$ qemu-img info --backing-chain /var/lib/libvirt/images/db-prod-02.pre-schema-change | grep -c "image:"
9
```

Each change had added a snapshot "just in case" and nobody merged them. Reads had to walk nine layers, writes created large overlays, and the datastore ran out of space. The team merged the chain in a maintenance window, wrote a rule that snapshots live for 72 hours at most with an owner and a ticket, and added an alert on chain depth and datastore free space.

## Common mistakes

- Treating a snapshot on the same storage as a backup
- Leaving snapshots for months
- Changing the running guest without `--config`
- Live-migrating without checking CPU compatibility and capacity

```quiz
Q: What does --config do in virsh commands?
+ Makes the change persistent for the next boot
- Deletes the guest :: Not what it does.
- Disables logging :: Not what it does.
- Speeds up the guest :: Not what it does.
> Use --live for now and --config for later.

Q: Why install the guest agent for snapshots?
+ It lets libvirt freeze the filesystem for a consistent image
- It encrypts the disk :: Not its purpose.
- It adds vCPUs :: Not its purpose.
- It restarts the host :: Not its purpose.
> Quiesce gives consistent snapshots.

Q: What problem do long snapshot chains cause?
+ Slower I/O, fragile merges and wasted space
- Faster disks :: Opposite.
- Better backups :: Not true.
- No change :: They add overhead.
> Keep snapshots short-lived.

Q: Before patching a host, what must you check?
+ That other hosts have capacity for its guests
- That the host has many tags :: Irrelevant.
- That nobody is watching :: Irrelevant.
- That DNS TTLs are long :: Unrelated.
> Capacity makes evacuation possible.
```

```cards
Domain XML :: source of truth for a guest's configuration
--live and --config :: running guest and persistent configuration
Snapshot :: short-term safety net, not a backup
Live migration :: needs CPU compatibility, storage access and bandwidth
Drift :: host differences that break migrations
```
