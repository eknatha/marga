# A shared storage platform with Ceph
level: Advanced
modules: storage
lessons: storage/network-storage-nfs-iscsi-and-ceph, storage/performance-backups-and-troubleshooting
summary: How one storage cluster serves block volumes, files and objects to many teams and survives disk and host failures.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Offer block, file and object storage from one cluster
- Survive a disk or host failure with no data loss
- Grow capacity by adding nodes
- Give each team a quota and visibility

## The big picture

```diagram
title: Ceph storage platform reference design
node: cl | Clients (VMs, pods, apps) | 0 | 1 | Use RBD volumes, CephFS and S3. | A noisy client can saturate shared disks.
node: mon | Monitors | 1 | 0 | Keep the cluster map and quorum. | Losing quorum stops the whole cluster.
node: crush | CRUSH placement | 1 | 2 | Decides which OSDs hold each object, by failure domain. | A bad failure-domain rule puts replicas on one host.
node: osd | OSDs on storage nodes | 2 | 1 | Daemons that store data on disks. | Failed disks start long recovery traffic.
node: net | Public and cluster networks | 3 | 0 | Client traffic and replication traffic on separate links. | A shared slow link makes recovery hurt clients.
node: gw | S3 and file gateways | 3 | 2 | RGW and MDS provide object and file access. | A single gateway is a bottleneck.
node: mon2 | Monitoring and capacity plan | 4 | 1 | Usage, slow ops, recovery, near-full alarms. | Near-full states block writes.
edge: cl | mon
edge: cl | osd
edge: mon | crush
edge: crush | osd
edge: osd | net
edge: cl | gw
edge: gw | osd
edge: osd | mon2
```

## A request, step by step

1. A client asks for a write. It computes the placement with CRUSH and contacts the primary OSD directly.
2. The primary writes locally and sends the data to the replica OSDs on other hosts.
3. Once all replicas acknowledge, the primary confirms the write.
4. If an OSD fails, monitors mark it down and CRUSH computes new homes for its data.
5. Recovery copies the affected placement groups to other OSDs in the background, throttled to protect clients.
6. The operator replaces the disk and the cluster rebalances.

## Why the design looks like this

- **Placement by algorithm** removes a central lookup table.
- **Replicas across failure domains** survive host or rack loss.
- **Separate cluster network** keeps recovery away from clients.
- **Quotas and pools** give each team a boundary.
- **Alerts well before full** leave time to add capacity.

## Scaling decisions

1. Start with three nodes, three monitors and replication of three.
2. Add nodes and let the cluster rebalance.
3. Use erasure coding for large cold data.
4. Separate fast and slow pools by device class.
5. Plan upgrades and expansion each quarter.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Disk failure | Recovery traffic for hours | Throttle recovery, keep spare capacity |
| Host failure | Many OSDs down at once | Failure domain at host or rack, enough nodes |
| Monitor quorum lost | Cluster unavailable | Odd number, separate hosts |
| Near full | Writes blocked | Alerts at 70 and 80 percent |
| Slow disk | Slow ops across clients | SMART alerts, latency monitoring, replace early |
| Network flap | Cascading OSD down events | Redundant links, tuned heartbeat grace |

## Trade-offs

- Replication is simple and uses more space than erasure coding.
- Erasure coding saves space and costs CPU and write latency.
- A shared cluster is efficient and spreads failure impact.

```predict
Q: A cluster shows slow ops after one host reboots. Why, and how do you limit the impact?
???
Recovery and backfill traffic compete with client I/O. Throttle recovery, use a separate cluster network and avoid rebooting several hosts at once.
> Failure handling consumes the same disks and links that clients use.
```
