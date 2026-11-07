---
title: Ceph failures, recovery and health warnings
minutes: 13
summary: Read Ceph health output, handle failed disks and servers, understand backfill and recovery, and fix nearfull, slow ops, clock skew and inconsistent placement groups.
---

In Ceph, status is information. Most warnings are the cluster telling you it is healing. A few mean data is at risk or writes are about to stop. Learn to tell them apart.

## What you will learn

- Reading ceph -s and health detail
- Disk and host failures
- Planned maintenance with noout
- Capacity thresholds, slow ops and inconsistent PGs

## Where to look

```bash
ceph -s
ceph health detail
ceph osd tree
ceph pg stat
ceph osd df
```

`ceph -s` shows health, daemons and PG states. `ceph health detail` explains each warning with the affected daemons. Healthy PGs are `active+clean`. States such as `degraded`, `undersized`, `backfilling` and `remapped` show work in progress. `inactive` or `incomplete` means IO is blocked and is urgent.

## Failures

When an OSD stops, its PGs run with fewer copies (degraded) but keep serving IO as long as min_size is met. After the down-to-out timeout, Ceph rebuilds the missing copies on other OSDs. If you replace a failed disk, remove the old OSD and create a new one; data flows back by backfill.

```diagram
title: Handling a failed disk
node: fail | OSD goes down | 0 | 1 | Its PGs are degraded but still served. | Two failures in the same PG are the danger. | observe
node: out | Marked out after timeout | 1 | 0 | The cluster starts rebuilding copies. | Recovery load can slow clients. | process
node: swap | Replace the disk | 1 | 2 | Remove the old OSD and add a new one. | Zap the right disk. | process
node: back | Backfill | 2 | 1 | Data flows to the new OSD. | Watch the progress in ceph -s. | process
node: ok | active+clean | 3 | 1 | All PGs have full copies again. | Only then move to the next change. | store
edge: fail | out
edge: out | back
edge: fail | swap
edge: swap | back
edge: back | ok
```

## Planned maintenance

Run `ceph osd set noout` before rebooting a host so its OSDs are not marked out and rebuilt unnecessarily. Reboot one host, wait for the OSDs to rejoin and PGs to return to clean, then `ceph osd unset noout`.

## Common warnings

| Warning | Meaning | Action |
|---------|---------|--------|
| nearfull (85%) | An OSD is almost full | Add capacity or delete data now |
| backfillfull (90%) | Backfill to that OSD stops | Free space before more failures |
| full (95%) | Writes are blocked | Emergency: add space or delete |
| slow ops | Requests wait on slow OSDs or network | Check disks and network |
| clock skew | Monitors disagree on time | Fix NTP or chrony |
| inconsistent PG | Scrub found a mismatch | Investigate, then `ceph pg repair` |

## Incident: Three reboots in a row

> **Incident:** Rebooting hosts one after another made data unavailable.

```console
$ ceph pg stat
2048 pgs: 188 active+undersized+degraded, 31 down, 1829 active+clean
$ ceph health detail | head -n 3
HEALTH_ERR Reduced data availability: 31 pgs inactive, 31 pgs down
```

The operator rebooted the second and third hosts before recovery from the first had finished. Some PGs then had only one copy, below min_size. Bringing a host back restored IO. The team wrote a rule: set noout, one host at a time, wait for HEALTH_OK.

## Common mistakes

- Rebooting several storage hosts at once
- Ignoring nearfull until the cluster is full
- Running repair before understanding why a PG is inconsistent
- Forgetting to unset noout

```quiz
Q: What does active+clean mean?
+ The PG is healthy
- The PG is lost :: No.
- The OSD is full :: No.
- The monitor is down :: No.
> All copies are present.

Q: What does noout do?
+ Stops OSDs being marked out during maintenance
- Blocks writes :: No.
- Deletes data :: No.
- Adds monitors :: No.
> It prevents unnecessary rebuilds.

Q: What happens at the full threshold?
+ Writes are blocked
- Reads stop :: No.
- Monitors restart :: No.
- PGs double :: No.
> The cluster protects itself.

Q: What causes a clock skew warning?
+ Monitors disagree on time
- Full disks :: No.
- A slow image :: No.
- Short names :: No.
> Time sync is needed.
```

```cards
active+clean :: The healthy state of a placement group
Degraded :: Some copies of the data are missing
Backfill :: Copying data to a new or returned OSD
noout :: A flag that stops OSDs from being marked out
Nearfull :: A warning that an OSD is almost full
```
