---
title: What OpenStack is and its core services
minutes: 14
summary: See how OpenStack builds a private cloud from separate services, and how each one maps to something you know from AWS.
---

OpenStack is open-source software that turns a rack of servers into a private cloud. Teams get virtual machines, networks and disks on demand through an API, much like a public cloud, but on hardware the company owns. It suits organisations that need to keep data in their own buildings, control cost at large scale, or follow rules about where workloads run.

## What you will learn

- The core services and what each does
- Control plane and compute nodes
- The two things every service depends on: a database and a message queue
- How OpenStack names map to AWS

## The core services

| Service | Name | What it does | Closest AWS idea |
|---|---|---|---|
| Identity | Keystone | Users, projects, roles, tokens, service catalog | IAM |
| Compute | Nova | Creates and manages virtual machines | EC2 |
| Networking | Neutron | Networks, subnets, routers, security groups, floating IPs | VPC |
| Image | Glance | Stores VM images | AMIs |
| Block storage | Cinder | Volumes that attach to VMs | EBS |
| Object storage | Swift | Objects over HTTP | S3 |
| Orchestration | Heat | Templates that build stacks | CloudFormation |
| Dashboard | Horizon | Web interface | Console |
| Placement | Placement | Tracks resources and picks hosts | Part of the scheduler |

Every service has a REST API, and all of them accept the same token from Keystone. The `openstack` command line client talks to those APIs, and so does the dashboard.

## Control plane and compute

- **Controller nodes** run the API services, schedulers, the database and the message queue. They are the **control plane**. Run three for high availability.
- **Compute nodes** run the hypervisor (usually KVM through libvirt) and the Nova compute agent. This is where virtual machines run.
- **Storage nodes** serve volumes (often Ceph) or objects.
- **Network nodes** (or the compute nodes themselves) run the Neutron agents.

## What they all depend on

Two pieces of shared infrastructure sit under almost every service:

- A **database** (MariaDB or MySQL) that stores state: which servers exist, which networks, which users.
- A **message queue** (RabbitMQ) through which services send each other requests. When you ask Nova to boot a server, the API writes to the database and sends a message to the scheduler, which sends one to a compute node.

If the queue or database is unhealthy, many services fail together, with strange symptoms. When many different services show errors at once, look at these two first.

## What a first request looks like

```console
$ openstack token issue -c expires -c project_id
+------------+----------------------------------+
| Field      | Value                            |
+------------+----------------------------------+
| expires    | 2026-11-03T18:00:00+0000         |
| project_id | 4b1c8a0f6d5e4f2bb0a1c2d3e4f5a6b7 |
+------------+----------------------------------+
$ openstack server list
+--------------------------------------+--------+--------+---------------------+-------+----------+
| ID                                   | Name   | Status | Networks            | Image | Flavor   |
+--------------------------------------+--------+--------+---------------------+-------+----------+
| 3f2a...                              | web-1  | ACTIVE | private=10.0.0.12   | ubuntu| m1.small |
+--------------------------------------+--------+--------+---------------------+-------+----------+
```

A successful `token issue` proves that Keystone works and your credentials are right. If that fails, nothing else will work.

## Why choose it, and what it costs

A private cloud gives control and predictable cost at scale. The price is operations: you run the control plane, plan upgrades every six months or so, and manage hardware. Many teams use a distribution or deployment tool (Kolla-Ansible, OpenStack-Ansible, vendor products) to reduce that work.

## Incident: Every service broke at once

> **Incident:** Nova, Neutron and Cinder all reported errors within the same minute.

```console
$ openstack compute service list
| nova-conductor | ctl-1 | internal | enabled | down |
| nova-scheduler | ctl-1 | internal | enabled | down |
$ sudo rabbitmqctl cluster_status | head -3
Error: unable to perform an operation on node 'rabbit@ctl-1'. Please see diagnostics information and suggestion below.
```

The services were healthy; the message queue on the controller had stopped after its disk filled with logs. Services could not talk to each other, so each reported its own error. Freeing the disk and restarting RabbitMQ brought everything back within minutes. The team added disk alerts for the queue and treats a burst of unrelated failures as a sign to look at shared dependencies.

```wrongpath
@goal Nova, Neutron and Cinder all report errors at the same time. Find the cause.
@wrong
# restart each service one by one
sudo systemctl restart nova-api neutron-server cinder-api
@result
$ openstack compute service list
| nova-conductor | ctl-1 | internal | enabled | down |
$ sudo journalctl -u nova-conductor -n 2
ERROR oslo.messaging: AMQP server on ctl-1:5672 is unreachable
@why The services were never the fault. They all depend on the message queue, which had stopped. Restarting clients cannot fix a broken shared dependency, and it adds load while they retry.
@right
sudo rabbitmqctl cluster_status
df -h /var/lib/rabbitmq
sudo systemctl restart rabbitmq-server
@after Check the shared dependencies first (queue, database, disk), then restart the clients only if they stay down.
```

## Common mistakes

- Treating each service as independent and ignoring the queue and database
- Running a single controller in production
- Expecting public-cloud features (such as managed databases) to exist without installing them
- Skipping upgrades until the gap is too big

```quiz
Q: Which OpenStack service creates virtual machines?
+ Nova
- Keystone :: Keystone is identity.
- Glance :: Glance stores images.
- Cinder :: Cinder provides volumes.
> Nova is the compute service.

Q: Which service is closest to AWS IAM?
+ Keystone
- Neutron :: Networking.
- Swift :: Object storage.
- Heat :: Orchestration.
> Keystone holds users, projects and roles.

Q: Many OpenStack services fail at the same time. What do you check first?
+ The message queue and the database
- The colour of the dashboard :: No.
- Each user password :: Not the first thing.
- The image names :: No.
> They are shared dependencies.

Q: Where do virtual machines actually run?
+ On compute nodes
- On controller nodes :: Controllers run APIs.
- In Horizon :: Horizon is a dashboard.
- In Glance :: Glance stores images.
> Compute nodes run the hypervisor.
```

```cards
Nova :: OpenStack compute service
Neutron :: OpenStack networking service
Keystone :: OpenStack identity service
Glance :: VM image service
Cinder :: block volume service
Control plane :: API services, database and queue
```
