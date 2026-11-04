---
title: Disks, RAID, firmware and burn-in
minutes: 14
summary: Understand drive types, software and hardware RAID, SMART health, firmware and the burn-in tests that catch bad hardware before it carries data.
---

Disks are the part of a server that wears out. On bare metal you choose them, protect them and replace them, so you need to know how they fail.

## What you will learn

- SATA, SAS and NVMe, and what each costs and delivers
- RAID levels and the difference between software and hardware RAID
- Reading SMART data and acting on it
- Firmware and BIOS settings that matter
- Burn-in: testing a new machine before it carries load

## Drive types

- **SATA** is cheap and fine for capacity. **SAS** is built for servers: dual path, better error handling.
- **NVMe** connects directly over PCIe. It is far faster and handles many requests at once, which suits databases.
- Drives are rated for **endurance** (how many times you can rewrite the whole disk per day). A write-heavy database on a read-optimised drive wears it out early.

## RAID in short

| Level | What it does | Survives |
|---|---|---|
| 0 | Stripes data for speed | Nothing |
| 1 | Mirrors two disks | One disk |
| 5 | Stripes with one parity | One disk |
| 6 | Stripes with two parity | Two disks |
| 10 | Mirrored pairs, striped | One per pair |

RAID protects against a **disk failing**. It does not protect against deleting a file, a bad application update, or a fire. You still need backups.

Linux can do RAID in software with `mdadm`. Hardware RAID cards do it in firmware. Software RAID is easier to inspect and move between machines; hardware RAID often has a battery-backed write cache that helps write speed.

```console
$ sudo mdadm --detail /dev/md0 | grep -E "State|Failed|Active"
             State : clean, degraded
    Active Devices : 1
    Failed Devices : 1
```

**Degraded** means the array works but has lost its safety margin. Until the replacement finishes rebuilding, a second failure loses data.

## SMART: the disk's own report

Disks monitor themselves. `smartctl` reads that report.

```console
$ sudo smartctl -H /dev/sdb
SMART overall-health self-assessment test result: FAILED!
$ sudo smartctl -a /dev/sdb | grep -E "Reallocated|Pending|Power_On"
  5 Reallocated_Sector_Ct   098   098   010    120
  9 Power_On_Hours          090   090   000    43000
197 Current_Pending_Sector  100   100   000    8
```

Rising **reallocated** or **pending** sectors mean the disk is running out of spare space. Replace it before it fails completely.

## Firmware and BIOS

Disks, NICs, the BMC and the BIOS all have firmware. Out-of-date firmware causes strange bugs and sometimes data loss. Update in a controlled order, one node at a time, and keep a record. Check BIOS settings such as boot mode (UEFI), power profile (performance, not power saving, for latency-sensitive work) and virtualisation support.

## Burn-in

New hardware fails early more often than old hardware. A **burn-in** run for a day or two catches it before real data lands there:

- Memory test (`memtester` or the vendor tool)
- CPU stress (`stress-ng`)
- Disk write and read of the whole surface (`fio` or `badblocks`)
- Check the event log and SMART afterwards for any new errors

```wrongpath
@goal /dev/md0 is degraded after a disk failed. Restore redundancy.
@wrong
# pull the failed disk out and put it back to see if it comes back
# then wait without checking
@result
$ mdadm --detail /dev/md0 | grep State
             State : clean, degraded
# a week later the second disk fails during a heavy job
mdadm: /dev/md0 has failed, data is unavailable
@why A disk that was kicked out of an array is not trustworthy, and a reseat only hides the fault. The array stayed degraded for a week, so the second failure had nothing to protect against.
@right
sudo smartctl -H /dev/sdb
sudo mdadm /dev/md0 --fail /dev/sdb
sudo mdadm /dev/md0 --remove /dev/sdb
sudo mdadm /dev/md0 --add /dev/sdc
sudo mdadm --detail /dev/md0
@after Confirm the disk is really bad, replace it, and watch the rebuild finish. A degraded array is an incident until it shows clean.
```

## Incident: Two disks, one batch

> **Incident:** A RAID 5 array lost a second disk during the rebuild after the first one failed.

All the disks came from the same batch, were installed on the same day and had the same hours on them. When the first failed, the rebuild put heavy load on the others, and the second failed within hours. After this the team used RAID 6 for large arrays, mixed batches, and made rebuild time part of their capacity plan.

## Common mistakes

- Treating RAID as a backup
- Ignoring a degraded array for days
- Skipping burn-in and finding bad memory in production
- Updating firmware on every node at once

```quiz
Q: What does RAID 1 do?
+ Mirrors data across two disks, surviving one failure
- Stripes for speed with no safety :: That is RAID 0.
- Doubles capacity :: No, it halves usable space.
- Replaces backups :: No.
> RAID 1 keeps a full copy on each disk.

Q: An array shows State: clean, degraded. What does that mean?
+ It works but has lost its redundancy until the replacement rebuilds
- It is fully healthy :: No.
- It has lost all data :: No.
- It needs to be reformatted :: No.
> A second failure while degraded can lose data.

Q: Which SMART values suggest a disk is dying?
+ Rising reallocated and pending sector counts
- A low power-on hours count :: That means a young disk.
- A cool temperature :: That is good.
- A short serial number :: Not relevant.
> Growing reallocated or pending sectors mean spare space is being used up.

Q: Why run a burn-in on new hardware?
+ New hardware fails early more often, so test before real data arrives
- To wear out the warranty :: No.
- To save power :: No.
- Because the BMC requires it :: No.
> Early failures are cheap to catch before production load.
```

```cards
RAID :: Combining disks for safety or speed
Degraded array :: Works but has lost redundancy
SMART :: A disk self-report of its health
NVMe :: Fast storage connected over PCIe
Burn-in :: Stress testing new hardware
Rebuild :: Copying data onto a replacement disk
```
