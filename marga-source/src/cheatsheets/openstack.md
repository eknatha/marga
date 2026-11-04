---
title: OpenStack and private cloud
summary: The openstack client commands and checks for identity, compute, networking, volumes and troubleshooting a private cloud.
module: openstack
---

## Sign in and check the basics

```bash
env | grep ^OS_
openstack token issue
openstack catalog list
openstack project list
openstack quota show
```

A working `token issue` proves Keystone and your credentials are good.

## Compute

```bash
openstack server list
openstack server show app-9 -c status -c fault
openstack server create --flavor m1.small --image ubuntu --network private app-9
openstack server reboot app-9
openstack server delete app-9
openstack flavor list
openstack image list
openstack console log show app-9
```

> **Warning:** Servers in ERROR still count against your quota. Delete them.

## Scheduling and health

```bash
openstack compute service list
openstack hypervisor list
openstack hypervisor stats show
openstack resource provider usage show PROVIDER_ID
```

Capacity is per node. A big flavor can fail even when the total free memory is large.

## Networking

```bash
openstack network list
openstack subnet list
openstack port list --server app-9
openstack security group list
openstack security group rule list web --long
openstack security group rule create --proto tcp --dst-port 22 --remote-ip 203.0.113.7/32 web
openstack floating ip create public
openstack server add floating ip app-9 203.0.113.45
```

## Volumes

```bash
openstack volume list
openstack volume create --size 20 data
openstack server add volume app-9 data
openstack volume service list
```

## Troubleshooting

| Symptom | First look |
|---|---|
| HTTP 401 | credentials, domain names, token expiry, clock |
| HTTP 403 | role and policy, or quota |
| ERROR, no valid host | service state, per-node free resources, scheduler log |
| Cannot reach server | console log, security group, floating IP, router |
| Many services fail at once | RabbitMQ, database, disk space |
| Stuck state | compare hypervisor with database before reset |

Follow one request through logs with its request id (`req-...`).

## Quick health checks

```bash
openstack compute service list
openstack network agent list
openstack volume service list
openstack hypervisor stats show
openstack server show NAME -c status -c fault
```

## Cautions

> **Danger:** `openstack server delete` removes the server and its ephemeral disk. Check for volumes and snapshots you need first.

> **Warning:** A security group rule open to 0.0.0.0/0 on every port exposes every server that uses the group.

> **Warning:** Evacuate a node only after it is fenced or powered off, or two copies of a server can run at once.

> **Caution:** Back up the database before any upgrade. Many migrations cannot be reversed.