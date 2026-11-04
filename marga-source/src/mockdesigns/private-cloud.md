# Model answer: a private cloud on bare metal
prompt: private-cloud
summary: Provision servers automatically, run a cloud control plane on top, and give teams quotas and self-service.

## The answer in one minute

Treat hardware as cattle: inventory, PXE provisioning and burn-in create ready nodes; OpenStack or Kubernetes with a virtualization layer provides APIs; Ceph provides storage; quotas, networking and monitoring make it safe for many teams to share.

## The design

```diagram
title: Private cloud on bare metal design
node: inv | Inventory and provisioning | 0 | 1 | PXE, images, burn-in. | Wrong inventory means wrong roles.
node: ctl | Control plane | 1 | 0 | APIs, scheduler, identity. | Three controllers minimum.
node: cmp | Compute nodes | 2 | 1 | KVM hosts or Kubernetes workers. | Failures need evacuation.
node: sto | Storage cluster | 2 | 2 | Ceph for volumes and images. | Full cluster blocks writes.
node: net | Leaf-spine network | 3 | 1 | Bonded links, VLANs, VXLAN. | Oversubscription hurts east-west.
node: pol | Quotas and policy | 4 | 0 | Per-team limits and roles. | No quota, no fairness.
node: mon | Monitoring and capacity | 4 | 2 | Hardware, cloud and cost. | Capacity surprises.
edge: inv | ctl
edge: ctl | cmp
edge: cmp | sto
edge: cmp | net
edge: net | pol
edge: sto | mon
```

## Every component, explained

### Provisioning pipeline

A new server is racked, PXE booted, installed from an image, burn-in tested and added to the pool without hand work.

Example: Forty new servers are in production in one afternoon.

### Control plane

API services, identity, scheduler, database and queue run on three nodes so a node loss does not stop the cloud.

Example: Losing one controller leaves the API working.

### Leaf-spine fabric

Each rack switch connects to every spine, giving short, even paths and easy growth by adding racks.

Example: Adding a rack means cabling it to every spine, not redesigning the network.

### Shared storage

Ceph spreads replicas across hosts so a disk or host failure loses no data and guests can restart elsewhere.

Example: A host dies and its guests restart on others with the same disks.

### Quotas and chargeback

Each team has limits on cores, memory and volumes, and sees its usage.

Example: Team A is capped at 200 cores and gets a monthly usage report.

## Numbers to say out loud

- 100 compute nodes with 64 cores and an allocation ratio of 4 gives 25600 schedulable vCPUs.
- Keep capacity for losing one rack or the largest node.
- Network oversubscription of 3 to 1 at the leaf is common; storage racks often need 1 to 1.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Controller loss | API down | Three or more with tested failover |
| Rack power loss | Many nodes down | Two feeds, spread replicas across racks |
| Capacity exhaustion | No valid host | Forecast and buy early |
| Bad image | Every new node affected | Canary rack |
| Noisy tenant | Latency | Quotas and QoS |

## Follow-up questions to expect

- Buy or build, what is the break-even?
- How do you upgrade without downtime?
- Where does Kubernetes fit?
