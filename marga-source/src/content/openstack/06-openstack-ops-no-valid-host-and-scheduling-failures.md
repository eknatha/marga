---
title: OpenStack operations: "No valid host" and scheduling failures
minutes: 13
summary: Trace a failed server build from the API through the scheduler and Placement, read the real reason for No valid host found, and fix quota, capacity and aggregate mismatches.
---

"No valid host was found" is the most common OpenStack build error, and it says almost nothing by itself. It means that no compute node passed every filter for this request. The skill is to find which filter rejected the hosts and why.

## What you will learn

- The path from boot request to compute node
- How Placement and the scheduler pick hosts
- Reading the real reason in the logs and instance faults
- Typical causes: capacity, flavor, aggregates, availability zones and cells

## The path of a request

`nova-api` accepts the request and stores the instance. `nova-conductor` coordinates. The `nova-scheduler` asks **Placement** for candidate resource providers that have enough VCPU, memory and disk (and any traits or resources the flavor requires), then applies filters (availability zone, aggregate matching, image properties, anti-affinity) and weighs the survivors. The chosen compute node builds the guest, asking Neutron for ports and Cinder for volumes. A failure at any step sends the instance to `ERROR`.

```console
$ openstack server show web-01 -c status -c fault
$ openstack server event list web-01
$ openstack flavor show m1.large
$ openstack compute service list
$ openstack hypervisor list
```

The `fault` field and the event list tell you the request ID, which you can search in the scheduler and conductor logs.

## Ask Placement

```console
$ openstack resource provider list
$ openstack resource provider usage show 7c6a1c2e-1111-4a8b-9ef2-0d7d5d5a0a11
$ openstack resource provider inventory list 7c6a1c2e-1111-4a8b-9ef2-0d7d5d5a0a11
$ openstack allocation candidate list --resource VCPU=8 --resource MEMORY_MB=32768 --resource DISK_GB=100
```

The candidate list answers: for this size, which providers fit? An empty list means a real capacity problem (including the allocation ratios) or a request that asks for something no node offers (a required trait, a very large flavor, PCI devices). If candidates exist but the build still fails, a scheduler filter rejected them: read the scheduler log with the request ID.

## Common causes

- **No capacity** at the configured allocation ratios, or hosts disabled or down (`compute service list` shows `State: down` or `Status: disabled`).
- **Flavor asks for too much** (extra specs for NUMA, huge pages, a trait) and few hosts match.
- **Aggregate or AZ mismatch**: the image or flavor targets an aggregate with no free hosts, or the AZ has none.
- **Anti-affinity**: a server group forbids placing on the few remaining hosts.
- **New hosts not mapped**: compute services exist, but `nova-manage cell_v2 discover_hosts` was not run, so the cell does not know them.
- **Quota** errors are different: they are rejected before scheduling, with a message about limits.

```predict
Q: allocation candidate list returns candidates, but the build still says No valid host. Where next?
???
A scheduler filter rejected the candidates. Search the scheduler log by the request ID for the filter and the count of hosts removed at each step.
> Placement says who has room; filters say who is allowed.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How OpenStack operations: "No valid host" and... fits together
node: n1 | The path of a request | 0 | 0 | nova-api accepts the request and stores the instance. | Not following the request ID across services. | client
node: n2 | Ask Placement | 1 | 1 | The candidate list answers: for this size, which providers fit? | Reading No valid host as a pure capacity problem. | process
node: n3 | Common causes | 2 | 0 | No capacity at the configured allocation ratios, or hosts disabled or down (compute service list shows State: down or Status: disabled). | Showing total capacity without breaking it down by flavor class. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: Plenty of room, nowhere to put it

> **Incident:** A project could not create instances of its new flavor, while the dashboard showed 40 percent free capacity.

```console
$ openstack flavor show m1.numa -c properties
properties | hw:cpu_policy='dedicated', hw:mem_page_size='large'
$ openstack allocation candidate list --resource VCPU=8 --resource MEMORY_MB=32768 --resource DISK_GB=50 | wc -l
0
$ openstack hypervisor list --long | head -4
```

The flavor needed dedicated cores and huge pages. Only two hosts in a small aggregate were configured for that, and both were full, while the free capacity was on general-purpose hosts. The operations team added hosts to the aggregate with the right configuration, made the dashboard show capacity per aggregate and per flavor class, and documented how special flavors map to host pools.

## Common mistakes

- Reading No valid host as a pure capacity problem
- Not following the request ID across services
- Forgetting host discovery after adding compute nodes
- Showing total capacity without breaking it down by flavor class

```quiz
Q: What does Placement provide?
+ An inventory and allocation service that finds hosts with enough resources
- A web console :: Not its role.
- Network ports :: That is Neutron.
- Block storage :: That is Cinder.
> It tracks resources and candidates.

Q: Which command shows whether any provider fits a requested size?
+ openstack allocation candidate list with resource requests
- openstack image list :: Lists images only.
- openstack user list :: Lists users only.
- ping :: Not relevant.
> Query candidates directly.

Q: After adding a new compute node, instances do not land on it. A likely missing step?
+ Host discovery in the cell with nova-manage cell_v2 discover_hosts
- Rebooting the dashboard :: Not relevant.
- Deleting all flavors :: Destructive and unrelated.
- Reducing quotas :: Unrelated.
> Cells need to know the host.

Q: How do you follow one failed build across services?
+ Search logs for the request ID from the instance fault or event
- Read every log from the start :: Inefficient.
- Restart each service :: Loses evidence.
- Ask users to retry :: Does not diagnose.
> The request ID ties the services together.
```

```cards
No valid host :: no node passed all filters, find which one
Placement :: tracks inventory, usage and candidates
Request ID :: follow the build across API, scheduler and conductor
Aggregate :: group of hosts targeted by flavor or image properties
discover_hosts :: maps new compute nodes into a cell
```
