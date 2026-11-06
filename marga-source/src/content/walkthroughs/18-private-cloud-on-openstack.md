# A private cloud on OpenStack
level: Advanced
modules: openstack, baremetal
lessons: openstack/what-openstack-is-and-core-services, openstack/neutron-networking-security-groups-and-floating-ips
summary: How a company offers self-service servers, networks and volumes to its teams on its own hardware, and what holds the pieces together.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Let teams create servers, networks and volumes themselves in minutes
- Isolate teams from each other and limit what each can use
- Keep the control plane available when a node fails
- Upgrade without stopping running workloads

## The big picture

```diagram
title: OpenStack private cloud reference design
node: user | Teams and tools | 0 | 1 | Use the API, CLI or dashboard with Terraform. | Without quotas one team can use everything.
node: api | API endpoints behind a load balancer | 1 | 1 | Nova, Neutron, Cinder, Glance, Keystone and others, run on three controllers. | If the load balancer is single, the whole cloud looks down.
node: ks | Keystone (identity) | 2 | 0 | Authenticates users and issues scoped tokens. | If it is slow, every call is slow.
node: db | Database and message queue | 2 | 2 | MariaDB cluster and RabbitMQ carry state and messages between services. | A split in either brings the control plane to a halt.
node: comp | Compute nodes | 3 | 1 | Run guests with KVM and report resources to Placement. | A failed node takes its guests with it.
node: net | Network nodes and fabric | 4 | 0 | Routers, floating IPs and provider networks. | A single network node is a single point of failure.
node: sto | Storage (Ceph) | 4 | 2 | Volumes, images and ephemeral disks. | A full cluster blocks every new volume.
edge: user | api
edge: api | ks
edge: api | db
edge: db | comp
edge: comp | net
edge: comp | sto
edge: api | net
```

## A request, step by step

1. A user asks for a server with an image, a flavor and a network. The API authenticates the token with Keystone.
2. Nova checks the project quota and asks Placement for hosts that can hold the request.
3. The scheduler picks a compute node and sends a message over the queue.
4. The node asks Neutron for a port and Cinder or Ceph for the disk, and downloads the image from Glance if needed.
5. Libvirt starts the guest and the server reports ACTIVE.
6. The user attaches a floating IP, which the router maps to the private address, and security groups decide which traffic is allowed.

## Why the design looks like this

- **Three controllers** keep the API available when one fails.
- **A shared message queue** lets services stay loosely coupled and survive restarts.
- **Quotas per project** stop one team from taking the capacity of the others.
- **Ceph as the storage layer** gives volumes, images and live migration without a separate array.
- **Scoped tokens** make each call carry only the permissions it needs.

## Scaling decisions

1. Begin with a small cluster of three controllers and a few compute nodes.
2. Add compute nodes in racks, and watch the scheduler and Placement data.
3. Separate network nodes or use distributed routing when traffic grows.
4. Add availability zones and host aggregates for different hardware.
5. Automate upgrades and run them on a staging cloud first.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Database split | Services disagree and writes stall | Odd number of nodes, tested failover, regular backups |
| Queue overload | API calls time out waiting for replies | Monitor queue depth, size consumers, avoid log floods |
| Compute node dies | Guests are lost until evacuated | Fencing, evacuate runbook, anti-affinity for critical sets |
| Quota too high | One project drains capacity | Review quotas against real capacity |
| Ceph nearly full | New volumes fail and writes slow | Alerts at 70 percent, plan expansion early |
| Upgrade breaks a service | API errors during or after a change | Rolling upgrade, tested rollback, read the notes |

## Trade-offs

- A private cloud gives control and cost at scale, and it needs a team to run it.
- More services add features and more things to upgrade.
- Overcommit raises utilisation and risks noisy neighbours.

```predict
Q: A user reports ERROR No valid host was found after asking for a large flavor. What do you compare?
???
The requested flavor against the free memory and CPU of each hypervisor, and the quota and allocation ratios used by the scheduler.
> The scheduler only picks a host that can hold the whole request, so fragmentation across nodes can block a large flavor even when the total is free.
```
