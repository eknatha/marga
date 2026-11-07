---
title: OpenStack monitoring and capacity planning
minutes: 12
summary: Monitor the control plane and compute capacity, alert on API and message queue health and plan quotas and overcommit with real data.
---

OpenStack has many services with many failure modes, and users only see the symptoms: slow API calls, instances that never become active and volumes that hang. A small set of signals covers most of them.

## What you will learn

- Control plane signals: APIs, queue, database and Ceph
- Compute capacity and overcommit metrics
- Alerts that predict user-visible failure
- Forecasting capacity and setting quotas

## Control plane

- **API health:** request latency and 5xx rates per service, through HAProxy or exporters.
- **Message queue:** RabbitMQ queue depth, unacked messages and consumers. Growing queues mean a stuck service.
- **Database:** connections, slow queries and replication state of Galera.
- **Service heartbeats:** `openstack compute service list` and `network agent list` show down services.
- **Ceph:** health status, near-full pools and slow operations.

```bash
openstack compute service list --long | grep -v " up "
openstack network agent list | grep -v ":-)"
rabbitmqctl list_queues name messages consumers | sort -k2 -nr | head
ceph -s
```

## Capacity

```bash
openstack hypervisor stats show
openstack hypervisor list --long -c "Hypervisor Hostname" -c "vCPUs Used" -c "vCPUs" -c "Memory MB Used" -c "Memory MB"
```

Track vCPU and memory used against capacity per host aggregate, the **overcommit ratio** and the number of instances of each flavor that could still be scheduled. Also track storage pools, floating IPs and network ports, because they run out too.

## Alerts

Alert on service down for more than a few minutes, RabbitMQ queues rising, API error rates, Ceph warnings, compute hosts above a utilization threshold and failed instance builds. Keep a dashboard of **time to fit** the standard flavors.

## Plan

Use growth trends and upcoming projects to forecast when capacity runs out, and account for procurement lead time. Set project quotas so that the sum is consistent with the overcommit you accept, and review them regularly.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How OpenStack monitoring and capacity planning fits together
node: n1 | Control plane | 0 | 0 | API health: request latency and 5xx rates per service, through HAProxy or exporters. | No alert on queue depth. | process
node: n2 | Capacity | 1 | 1 | Track vCPU and memory used against capacity per host aggregate, the overcommit ratio and the number of instances of each flavor that could still be scheduled. | Ignoring storage and network capacity. | process
node: n3 | Alerts | 2 | 0 | Alert on service down for more than a few minutes, RabbitMQ queues rising, API error rates, Ceph warnings, compute hosts above a utilization threshold and failed... | Check the Common mistakes list below this diagram for what usually goes wrong here. | observe
node: n4 | Plan | 3 | 1 | Use growth trends and upcoming projects to forecast when capacity runs out, and account for procurement lead time. | Quotas that exceed physical capacity by a lot. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Instances stuck in scheduling

> **Incident:** A swollen message queue slowed every operation.

```console
rabbitmq: conductor queue messages 412000, consumers 0
instances in BUILD for over 20 minutes: 311
nova-conductor service: down since 02:14
```

A conductor service had crashed, and requests piled up in its queue. Once restarted and the queue drained, builds resumed. The team added alerts on queue depth and consumers, and an automatic restart with a page for repeated crashes.

## Common mistakes

- Watching only whether APIs respond
- No alert on queue depth
- Ignoring storage and network capacity
- Quotas that exceed physical capacity by a lot

```quiz
Q: What does a growing RabbitMQ queue suggest?
+ A stuck or slow consumer
- A DNS issue :: No.
- A full disk :: No.
- A bad flavor :: No.
> Messages are not processed.

Q: What does overcommit ratio show?
+ Virtual resources compared to physical
- Disk speed :: No.
- API speed :: No.
- Image size :: No.
> Capacity planning input.

Q: Which command lists down compute services?
+ openstack compute service list
- openstack image list :: No.
- ls :: No.
- ping :: No.
> Heartbeats show health.

Q: What else runs out besides CPU and memory?
+ Floating IPs, ports and storage pools
- Colours :: No.
- Names :: No.
- Tags :: No.
> Plan all resources. The lesson section above explains why.
```

```cards
Heartbeat :: Periodic signal that a service is alive
Overcommit ratio :: Allocated virtual resources versus physical
Queue depth :: Messages waiting to be processed
Host aggregate :: Group of hosts with shared properties
```
