---
title: OpenStack operations: Neutron and Ceph troubleshooting
minutes: 13
summary: Trace a missing network path through agents, bridges and namespaces, and read Ceph health to understand slow or stuck volumes and degraded placement groups.
---

Two subsystems cause most deep OpenStack incidents: virtual networking, where a packet crosses several software devices, and storage, usually Ceph, where cluster health decides whether volumes respond. Each can be traced step by step.

## What you will learn

- The path of a packet from a guest to the outside
- Checking agents, ports and flows with the standard tools
- Reading `ceph -s` and health details
- Fixes for slow requests, full OSDs and degraded data

## Neutron: follow the packet

First check the control plane: are the agents alive, and is the port bound and active?

```console
$ openstack network agent list
$ openstack port list --server web-01
$ openstack port show 3f1a2b4c-0000-4d5e-9aaa-111122223333 -c status -c binding_vif_type -c binding_host_id
$ openstack floating ip list
$ openstack security group rule list web-sg
```

A port with status `DOWN` or a binding failure points to the agent or driver on that host. Missing security group rules are a common cause of "can't connect" even when everything else is fine. Then trace the data path on the compute host (shown for Open vSwitch):

```console
$ sudo ovs-vsctl show
$ sudo ovs-ofctl dump-flows br-int | head
$ sudo ip netns list
$ sudo ip netns exec qrouter-0a1b2c3d ip addr
$ sudo tcpdump -i tap3f1a2b4c-00 -nn icmp
```

Capture at each hop: the guest's tap device, the bridge, the tunnel or VLAN interface, and the router or DHCP namespace on the network node. The first hop where packets appear but then vanish tells you which rule, MTU or link to fix. Tunnels (VXLAN or Geneve) reduce the effective MTU, so large packets failing while small ones work usually means an MTU mismatch between guest, tunnel and physical network.

## Ceph: read the health

```console
$ ceph -s
$ ceph health detail
$ ceph osd tree
$ ceph osd df
$ ceph pg stat
$ ceph osd perf
```

`ceph -s` shows overall health, monitor quorum, OSDs up and in, and placement group (PG) states. `HEALTH_OK` is the goal. `HEALTH_WARN` with `degraded` or `misplaced` PGs means data is being recovered; the cluster serves I/O but with less protection and extra load. Watch for:

- **Slow ops** and a high `commit_latency` in `osd perf`: a failing disk, a saturated network or a recovery that is competing with client traffic.
- **Near full OSDs**: Ceph stops writes when OSDs reach the full ratio. Add capacity, rebalance, or delete data before it happens; never ignore the nearfull warning.
- **OSDs down**: check the host, the disk and the service. A single failed disk is routine; many at once suggests network or power.

Recovery speed can be tuned (`osd_max_backfills` and recovery settings) to balance speed against client impact, which is useful during business hours.

## From the OpenStack side

Cinder volumes and Nova ephemeral disks backed by RBD are slow or stuck when the Ceph pool is unhealthy. If an instance freezes on I/O, check Ceph health before restarting anything, and use `rbd` to inspect images and locks:

```console
$ rbd ls volumes | head
$ rbd status volumes/volume-0a1b2c3d
$ rbd info volumes/volume-0a1b2c3d
```

```predict
Q: Pings between two guests on different hosts work, but large file transfers hang. What do you test?
???
The path MTU. Overlay tunnels reduce MTU. Test with ping and the do-not-fragment flag, and align the guest, tunnel and physical MTUs.
> Small works, large hangs: think MTU.
```

## Incident: The cluster that stopped accepting writes

> **Incident:** At 14:00 many instances froze, and Cinder operations timed out.

```console
$ ceph health detail
HEALTH_ERR 3 full osd(s); 1 pool(s) full
osd.12 is full at 95%
$ ceph osd df | sort -k17 -nr | head -3
12  hdd  ... 96.20
```

Several OSDs on one host had filled up faster than the others because of an uneven placement and a large batch import. At the full ratio Ceph blocks writes to protect data. The operators temporarily raised the full ratio a little, deleted old snapshots to free space, rebalanced with the balancer module, and then added disks. They created alerts at 70 and 80 percent and a capacity forecast, so nearfull would never again be a surprise.

## Common mistakes

- Restarting instances before checking Ceph health
- Ignoring nearfull warnings
- Capturing packets at only one point
- Forgetting overlay overhead when setting MTUs

```quiz
Q: What does an agent in the DOWN state suggest?
+ The service on that host is not reporting, so ports there may not be wired
- The cloud is perfectly healthy :: Not true.
- Flavors are missing :: Unrelated.
- Quotas are exceeded :: Unrelated.
> Check agent health first.

Q: What happens when Ceph OSDs reach the full ratio?
+ Writes are blocked to protect the data
- Reads become faster :: Not true.
- Data is deleted automatically :: Not true.
- The cluster doubles in size :: Not true.
> Full OSDs stop writes.

Q: Which command gives a quick overall view of Ceph?
+ ceph -s
- ls /tmp :: Unrelated.
- ip addr :: Network only.
- openstack flavor list :: Not Ceph.
> It shows health, quorum, OSDs and PGs.

Q: Why capture at several points in the virtual network path?
+ To find the hop where packets stop appearing
- To fill the disk :: Not a goal.
- To change the MTU automatically :: It does not.
- To avoid agents :: Unrelated.
> Narrow the failing segment.
```

```cards
Agent list :: first check of Neutron control plane health
Network namespaces :: qrouter and qdhcp isolate routers and DHCP
Overlay MTU :: tunnels reduce the usable packet size
ceph -s :: cluster health, quorum, OSDs and PG states
Nearfull :: act at 70 to 80 percent, not at 95
```
