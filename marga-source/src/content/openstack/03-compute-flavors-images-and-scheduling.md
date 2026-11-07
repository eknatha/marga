---
title: Compute: flavors, images and scheduling
minutes: 14
summary: Understand how Nova picks a host for a server, and diagnose servers stuck in ERROR with "No valid host was found".
---

Booting a server looks simple from the outside: pick a flavor and an image, press create. Inside, Nova has to find a compute node with enough room and then build the machine there. When it cannot, the server ends in ERROR.

## What you will learn

- Flavors, images and the boot sequence
- How the scheduler and Placement choose a host
- Server states and the fault field
- Overcommit ratios and host aggregates

## Flavors and images

A **flavor** defines size: vCPUs, RAM and root disk. An **image** (from Glance) is the starting disk. A server is a flavor plus an image plus a network. Cloud images use **cloud-init** to set up users and keys on first boot, using metadata that Nova provides.

```console
$ openstack flavor list -c Name -c RAM -c VCPUs -c Disk
+----------+-------+-------+------+
| Name     |   RAM | VCPUs | Disk |
+----------+-------+-------+------+
| m1.small |  2048 |     1 |   20 |
| m1.large |  8192 |     4 |   80 |
| m1.xlarge| 16384 |     8 |  160 |
+----------+-------+-------+------+
```

## The boot sequence

1. The API checks the request and your quota, and stores the server in the database.
2. The **scheduler** asks **Placement** which compute nodes have enough free resources, then applies filters (for example, the right availability zone or aggregate) and weighs the candidates.
3. The chosen compute node downloads the image, asks Neutron for a port and Cinder for volumes if needed, and starts the guest through libvirt.
4. The state moves from `BUILD` to `ACTIVE`.

Any step can fail. The server then shows `ERROR` and a **fault** message.

```console
$ openstack server show app-9 -c status -c fault
+--------+-------------------------------------------------------------------------+
| Field  | Value                                                                   |
+--------+-------------------------------------------------------------------------+
| status | ERROR                                                                   |
| fault  | {'code': 500, 'message': 'No valid host was found. There are not enough hosts available.'} |
+--------+-------------------------------------------------------------------------+
```

## "No valid host was found"

This is the scheduler saying that no compute node passed every check. It does not say which check failed. Work through the common reasons:

- **Not enough free RAM, vCPU or disk** on any one node for this flavor. A flavor larger than the biggest free slot cannot be placed even if the total free across the cloud is large.
- **The node is disabled or down.** `openstack compute service list` shows each nova-compute as `up` or `down`.
- **Wrong availability zone or aggregate**, or a flavor that requires special hardware properties that no node has.
- **Affinity rules** that cannot be satisfied.
- **Volume or network placement** that limits where the server can go.

```console
$ openstack compute service list --service nova-compute -c Host -c Status -c State
+---------+---------+-------+
| Host    | Status  | State |
+---------+---------+-------+
| cmp-1   | enabled | up    |
| cmp-2   | enabled | down  |
| cmp-3   | disabled| up    |
+---------+---------+-------+
$ openstack hypervisor stats show -c memory_mb_used -c memory_mb
```

The scheduler log (`nova-scheduler.log` on the controller) lists how many hosts each filter rejected. Reading it turns a vague error into a specific one.

## Overcommit

By default OpenStack allows more vCPUs than physical cores (the allocation ratio for CPU is 16 to 1) and some RAM overcommit (the default ratio is 1.5 to 1 in current releases). Operators change these ratios per cluster. Aggregates group hosts with different settings, such as a "gold" group at 1 to 1 for databases.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Compute: flavors, images and scheduling fits together
node: n1 | Flavors and images | 0 | 0 | A flavor defines size: vCPUs, RAM and root disk. | Changing flavors that live servers use. | process
node: n2 | The boot sequence | 1 | 1 | The API checks the request and your quota, and stores the server in the database. | Reading "No valid host" as meaning the cloud is full. | process
node: n3 | "No valid host was found" | 2 | 0 | This is the scheduler saying that no compute node passed every check. | Leaving failed ERROR servers around: they still count against quota. | process
node: n4 | Overcommit | 3 | 1 | By default OpenStack allows more vCPUs than physical cores (the allocation ratio for CPU is 16 to 1) and some RAM overcommit (the default ratio is 1.5 to 1 in current... | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: A big flavor and a half-empty cloud

> **Incident:** A team could not boot a 16 GB server even though the cloud showed 200 GB free.

```console
$ openstack server create --flavor m1.xlarge --image ubuntu db-1
$ openstack server show db-1 -c status -c fault -f value
ERROR
{'code': 500, 'message': 'No valid host was found. There are not enough hosts available.'}
$ openstack resource provider usage show cmp-1
MEMORY_MB used 61440 total 65536
```

Total free memory was spread as small gaps over many compute nodes: each node had under 8 GB free, so none could hold a 16 GB server. The cloud was fragmented, not full. The operators moved some servers to open up room on one node and, for the long term, reserved a set of large hosts in an aggregate for large flavors. Free space has to be free on one node.

```wrongpath
@goal No valid host found for a large flavor, so delete the error server and retry in a loop.
@wrong
while true; do openstack server create --flavor m1.xlarge --image ubuntu app; sleep 5; done
@result
Server in ERROR: No valid host was found
# 200 failed servers pile up and consume quota
@why The scheduler failed because no hypervisor had enough free memory in one piece. Retrying does not change capacity, and each failure uses quota and creates noise.
@right
openstack hypervisor stats show
openstack server show app -f value -c fault
openstack flavor list
@after Compare the flavor with free resources per host, then use a smaller flavor, free capacity or add a node.
```

## Common mistakes

- Reading "No valid host" as meaning the cloud is full
- Not checking whether compute services are up
- Changing flavors that live servers use
- Leaving failed ERROR servers around: they still count against quota

```quiz
Q: What defines the vCPU, RAM and disk size of a server?
+ The flavor
- The image :: The image is the starting disk.
- The network :: Networks connect servers.
- The project :: Projects own resources.
> Flavor equals size.

Q: What does No valid host was found mean?
+ No compute node passed all the scheduler checks
- The image is missing :: It would say so.
- The password is wrong :: That is 401.
- The dashboard is down :: No.
> It does not say which check failed.

Q: Which command shows whether nova-compute services are up?
+ openstack compute service list
- openstack token issue :: It tests Keystone.
- openstack flavor list :: It lists flavors.
- openstack image list :: It lists images.
> A down service takes its host out of scheduling.

Q: The cloud has 200 GB free RAM in total, but a 16 GB server fails to place. Why?
+ The free memory is spread over many nodes, and none has 16 GB free
- Memory cannot be added up :: Placement is per node.
- Flavors cannot exceed 8 GB :: They can.
- The image is too small :: No.
> Free space has to be on one node.
```

```cards
Flavor :: size of a server: vCPU, RAM, disk
Image :: starting disk for a server
Scheduler :: chooses a compute node
Placement :: tracks resource usage per host
Aggregate :: group of hosts with shared properties
Fault :: reason shown for a server in ERROR
```
