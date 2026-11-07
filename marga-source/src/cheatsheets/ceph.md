---
title: Ceph
summary: Daemons, status commands, pools, placement groups, cephadm, RBD, health warnings and a safe maintenance routine.
module: ceph
---
## Status

```bash
ceph -s
ceph health detail
ceph osd tree
ceph osd df tree
ceph df
ceph pg stat
```

> **Warning:** Healthy placement groups are `active+clean`. `inactive` or `incomplete` means IO is blocked and is urgent.

## Daemons

| Daemon | Job |
|--------|-----|
| MON | Cluster map and quorum, run 3 or 5 |
| MGR | Metrics, dashboard, modules |
| OSD | Stores data on one disk |
| MDS | CephFS metadata |
| RGW | S3 and Swift gateway |

## Pools

```bash
ceph osd pool create vms 128
ceph osd pool set vms size 3
ceph osd pool set vms min_size 2
ceph osd pool application enable vms rbd
ceph osd pool autoscale-status
```

> **Danger:** Never set `min_size 1`. A pool can then accept writes that exist as a single copy.

## cephadm

```bash
cephadm bootstrap --mon-ip 10.0.0.11
ceph orch host add ceph2 10.0.0.12
ceph orch apply osd --all-available-devices
ceph orch ps
ceph orch upgrade start --ceph-version 18.2.4
```

> **Warning:** Zap a disk only after you confirm it is spare. `ceph orch device zap` destroys its data.

## RBD

```bash
rbd create rbd/db1 --size 100G
rbd du rbd/db1
rbd snap create rbd/db1@before-upgrade
rbd snap ls rbd/db1
```

> **Warning:** Old snapshots keep growing. Delete them on a schedule and watch `rbd du`.

## Maintenance

```bash
ceph osd set noout
ceph osd unset noout
ceph pg repair 7.3
```

> **Danger:** Reboot one host at a time and wait for HEALTH_OK. Several at once can drop PGs below min_size.

## Capacity thresholds

| Level | Meaning |
|-------|---------|
| 85% nearfull | Warning, act now |
| 90% backfillfull | Backfill to that OSD stops |
| 95% full | Writes are blocked |

## Quick health sweep

```bash
ceph -s
ceph health detail
ceph osd tree
ceph df
ceph osd pool ls detail
```
