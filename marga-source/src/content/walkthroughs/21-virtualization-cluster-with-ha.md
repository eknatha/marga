# A virtualization cluster with live migration and HA
level: Intermediate
modules: virtualization, storage
lessons: virtualization/live-migration-ha-and-troubleshooting, virtualization/virtual-networking-bridges-and-vlans
summary: How a small group of hosts runs many guests, moves them without downtime and restarts them after a host failure.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Run mixed workloads on shared hardware
- Move guests between hosts for maintenance with no downtime
- Restart guests automatically after a host failure
- Keep networks and storage isolated by team

## The big picture

```diagram
title: Virtualization cluster reference design
node: mgr | Cluster manager | 0 | 1 | Holds the inventory, schedules guests, drives HA. | If it fails, guests keep running but cannot be managed.
node: h1 | Host 1 | 1 | 0 | Runs KVM and libvirt with guests. | Memory overcommit risks pressure during a failure.
node: h2 | Host 2 | 1 | 2 | Same configuration as host 1 with spare capacity. | If it has no spare, HA restarts cannot fit.
node: net | Network fabric with VLANs | 2 | 0 | Bridges and bonded uplinks carry tagged VLANs. | A trunk missing a VLAN isolates a guest.
node: sto | Shared storage | 2 | 2 | Ceph or a SAN holds the guest disks. | Storage loss stops every guest.
node: fence | Fencing device | 3 | 1 | Cuts power to a host that stops answering. | Without fencing, HA risks two copies of a guest.
node: mon | Monitoring and alerts | 4 | 1 | Host load, steal time, pool space, migration status. | Missing pool alerts lead to pauses.
edge: mgr | h1
edge: mgr | h2
edge: h1 | net
edge: h2 | net
edge: h1 | sto
edge: h2 | sto
edge: mgr | fence
edge: mgr | mon
```

## A request, step by step

1. An admin starts a migration of a guest from host 1 to host 2 for maintenance.
2. Memory pages are copied while the guest runs, and changed pages are copied again.
3. When the remaining set is small, the guest is paused for a few milliseconds and its state moves.
4. Host 2 resumes the guest, the network learns the new location and users see no interruption.
5. Later host 1 loses power. The manager stops getting heartbeats and fences it.
6. The manager restarts the affected guests on host 2 using the shared disks.

## Why the design looks like this

- **Shared storage** lets any host start any guest.
- **Fencing** makes it safe to restart a guest elsewhere.
- **Spare capacity** must exist for HA to have somewhere to restart guests.
- **Tagged VLANs on bonded uplinks** give isolation and redundancy on few cables.
- **Pool and steal-time alerts** show trouble before users do.

## Scaling decisions

1. Start with two hosts and shared storage.
2. Add a third host so a failure and maintenance can overlap.
3. Group guests with anti-affinity so replicas never share a host.
4. Track steal time and set a safe vCPU ratio.
5. Add automation and templates for common guests.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Migration never converges | Guest stays on the source for long | Auto-converge, more bandwidth, quieter time |
| Pool full | Guests pause with I/O errors | Alerts and snapshot expiry |
| No spare capacity | HA cannot restart all guests | Reserve capacity equal to the largest host |
| Split brain | Two copies of one guest | Fencing before restart |
| VLAN missing on trunk | Guest cannot reach its gateway | Check tagging on host and switch |
| Overcommit too high | Swapping and steal time | Limits per host and a memory reserve |

## Trade-offs

- Overcommit raises density and lowers the safety margin.
- Shared storage adds flexibility and a shared failure point.
- Frequent migration helps maintenance and uses network capacity.

```predict
Q: A host fails but its guests are not restarted. Name two possible reasons.
???
Fencing failed, so the manager would not risk a second copy, or the remaining hosts have no free memory for the guests.
> HA is only safe with confirmed fencing and enough spare capacity.
```
