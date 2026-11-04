---
title: Virtual disks, snapshots and templates
minutes: 14
summary: Learn disk image formats, thin provisioning, how snapshot chains grow, and how templates and clones save time.
---

A virtual machine's disk is a file or a volume on the host. How that file is stored decides speed, space use and what happens when you take a snapshot.

## What you will learn

- Common image formats: raw, qcow2, VMDK, VHDX
- Thin and thick provisioning
- How a snapshot works and why long chains cause trouble
- Templates, clones and cloud-init

## Image formats

| Format | Used by | Notes |
|---|---|---|
| raw | KVM, many clouds | Simple and fast, no features of its own |
| qcow2 | KVM and QEMU | Thin provisioning, snapshots, compression |
| VMDK | VMware | Thin or thick, snapshots as delta files |
| VHDX | Hyper-V | Dynamic or fixed |

```console
$ qemu-img info web-01.qcow2
image: web-01.qcow2
file format: qcow2
virtual size: 100 GiB (107374182400 bytes)
disk size: 8.2 GiB
```

The **virtual size** is what the guest sees. The **disk size** is what the file takes on the host. That gap is **thin provisioning**: space is taken only as the guest writes. It saves space and lets you promise more than you have, which is another kind of overcommit. If every guest fills its disk, the storage pool runs out and guests fail with write errors.

## Snapshots

A snapshot freezes the disk at a point in time. New writes go to a separate file, called a delta or overlay, and the original becomes read-only. Rolling back means discarding the delta.

```console
$ virsh snapshot-create-as web-01 before-upgrade
Domain snapshot before-upgrade created
$ virsh snapshot-list web-01
 Name             Creation Time               State
------------------------------------------------------
 before-upgrade   2026-11-02 10:14:09 +0000   shutoff
```

A snapshot is not a backup. It lives on the same storage as the disk, so losing the storage loses both. Each snapshot adds a layer: reads may have to look through several files, which slows the guest, and every delta uses space. A **chain** of dozens of snapshots can fill a pool and make deleting them slow because deltas must be merged.

Use snapshots for short-lived safety, such as before an upgrade, and delete them when the change is accepted.

## Templates and clones

A **template** is a prepared guest image with the operating system installed and cleaned. A **full clone** copies the disk. A **linked clone** uses the template as a read-only base and stores only the differences, so it is fast and small, but depends on the base.

**cloud-init** configures a guest at first boot from user data: host name, users, SSH keys, packages. It lets one generic template serve many roles.

## Incident: The pool that filled overnight

> **Incident:** A pool that was 60 percent full on Friday reached 100 percent on Sunday and every guest paused.

```console
$ virsh pool-info vmstore
Capacity:       500.00 GiB
Allocation:     499.98 GiB
Available:      0.02 GiB
$ virsh snapshot-list db-01 | wc -l
42
```

A backup tool created a snapshot of `db-01` every hour and never removed them. Forty snapshots each held the changes of an hour of database writes. Deleting the old snapshots merged the files and freed 180 GiB, and the guests resumed. The team added a retention rule and an alert at 80 percent pool use.

```wrongpath
@goal Keep a snapshot of the database VM for safety, forever.
@wrong
virsh snapshot-create-as db-1 before-upgrade
# ... six months later, still there
@result
$ virsh pool-info default
Available: 3.2 GiB
error: Write error on db-1: No space left on device
@why A snapshot is not a backup. Every write after it lands in a growing overlay, reads get slower along the chain and the pool eventually fills, which pauses every guest.
@right
virsh snapshot-list db-1
virsh snapshot-delete db-1 before-upgrade
# use real backups for protection
virsh domblklist db-1
@after Delete snapshots when the change is verified, and take backups with a tool built for it.
```

## Common mistakes

- Treating snapshots as backups
- Leaving snapshots for weeks
- Overcommitting thin disks with no alert on pool free space
- Cloning a guest without changing its host name, machine id and SSH host keys

```quiz
Q: What is the difference between virtual size and disk size of a qcow2 image?
+ Virtual size is what the guest sees, disk size is what the file uses on the host
- They are always the same :: Thin provisioning makes them differ.
- Disk size is the guest limit :: That is virtual size.
- Virtual size is compressed size :: It is not.
> Thin provisioning means files grow with writes.

Q: Why is a snapshot not a backup?
+ It sits on the same storage as the disk, so losing the storage loses both
- It cannot be restored :: It can be rolled back.
- It is encrypted :: It is not related to encryption.
- It only works for Windows :: It works for any guest.
> A backup lives somewhere else.

Q: What is a linked clone?
+ A clone that reads from a template base and stores only its changes
- A full copy of the disk :: That is a full clone.
- A guest with no disk :: It has a disk overlay.
- A copy of the XML only :: The disk is the point.
> Small and fast, but it depends on the base.

Q: What is cloud-init used for?
+ Configuring a guest at first boot, such as users, keys and host name
- Migrating a guest live :: That is live migration.
- Resizing a pool :: It does not manage pools.
- Merging snapshots :: It does not.
> One template can serve many roles.
```

```cards
Thin provisioning :: disk space is used only as the guest writes
Snapshot :: frozen disk state with later writes in a delta
Delta or overlay :: file holding changes since a snapshot
Template :: prepared image used to create guests
Linked clone :: clone that depends on a base image
cloud-init :: first-boot guest configuration
```
