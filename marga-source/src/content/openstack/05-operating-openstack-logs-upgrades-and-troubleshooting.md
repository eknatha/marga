---
title: Operating OpenStack: logs, upgrades and troubleshooting
minutes: 15
summary: Find the right log fast, recover stuck servers and volumes, and plan upgrades and capacity for a private cloud.
---

Running a private cloud is an operations job. Most days it is routine, and the skill is knowing where to look when it is not.

## What you will learn

- Where each service logs and how to follow a request
- Stuck states and safe ways to reset them
- Health checks for the shared dependencies
- Upgrades, backups and capacity

## Following a request

Every API request has a **request id** that appears in the logs of each service it touches. When a user reports a failed server creation, get the request id and search for it.

```console
$ openstack --debug server create --flavor m1.small --image ubuntu t1 2>&1 | grep -i "x-openstack-request-id" | head -1
x-openstack-request-id: req-6b9f2a5c-1d1e-4a63-a1f0-2d9a8cb7e411
$ sudo grep req-6b9f2a5c /var/log/nova/*.log | cut -c1-140
nova-api.log:  req-6b9f... POST /v2.1/servers  status: 202
nova-conductor.log: req-6b9f... Failed to schedule instances: NoValidHost_Remote
nova-scheduler.log: req-6b9f... Filter ComputeFilter returned 0 hosts
```

The trail leads from the API to the scheduler, which names the filter that rejected every host. Log paths vary by deployment: `/var/log/nova/` on package installs, `/var/log/kolla/nova/` or container logs for Kolla-based ones. Each service has its own: nova-api, nova-scheduler, nova-conductor, nova-compute, neutron-server, cinder-volume and so on.

## Health of the shared parts

```console
$ openstack compute service list -c Binary -c Host -c State
$ openstack network agent list -c "Agent Type" -c Host -c Alive
$ openstack volume service list -c Binary -c Host -c State
$ sudo rabbitmqctl list_queues name messages | sort -k2 -n -r | head -3
$ mysql -e "SHOW STATUS LIKE 'wsrep_cluster_size';"
```

A down agent means that host's part of the service is gone. A queue with thousands of waiting messages means consumers are not keeping up or have stopped. A Galera database that has lost members may have lost quorum and refuse writes.

## Stuck states

Servers can stay in `BUILD`, `DELETING` or `ERROR`. Volumes can stay in `attaching` or `error_deleting`. Usually the cause is that a message was lost or an agent was down at the time. Steps:

1. Read the fault and the logs: do not reset blindly.
2. Check that the target compute or storage service is healthy now.
3. For servers, `openstack server set --state active <id>` (admin) corrects the database record, but does not start anything. For volumes, `openstack volume set --state available <id>`.
4. Then retry the real operation, and confirm in the hypervisor (`virsh list`) that the truth matches the record.

Resetting state only edits the database. If the guest is really running or the volume is really attached, a wrong reset creates a second copy or corrupts data. Compare reality first.

## Upgrades and backups

OpenStack releases about every six months. Upgrading means moving service by service, with database migrations, usually from one release to the next (some releases support skipping). Practise in a test cloud with a copy of the real data. Always:

- Back up the databases and configuration before every step, and prove a restore works.
- Read the release notes for removed settings.
- Upgrade the control plane before compute nodes, which can run older agents for a short time.
- Keep the plan reversible where possible.

## Capacity

Watch the ratio of used to allocatable vCPU, RAM and storage, with headroom to lose a compute node and still re-run its servers. Track the number of ERROR servers, failed API requests, queue depth and database size. A cloud that is at 90 percent in one flavor class will fail large requests even when totals look fine.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Operating OpenStack: logs, upgrades and... fits together
node: n1 | Following a request | 0 | 0 | Every API request has a request id that appears in the logs of each service it touches. | Check the Common mistakes list below this diagram for what usually goes wrong here. | client
node: n2 | Health of the shared parts | 1 | 1 | A down agent means that host's part of the service is gone. | No alert on queue depth or Galera cluster size. | process
node: n3 | Stuck states | 2 | 0 | Servers can stay in BUILD, DELETING or ERROR. | Resetting states without checking the hypervisor. | store
node: n4 | Upgrades and backups | 3 | 1 | OpenStack releases about every six months. | Upgrading without a tested restore of the database. | store
node: n5 | Capacity | 4 | 0 | Watch the ratio of used to allocatable vCPU, RAM and storage, with headroom to lose a compute node and still re-run its servers. | Treating a three-controller cluster as safe while one node is down and unnoticed. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
```

## Incident: The volume that would not detach

> **Incident:** A volume stuck in `detaching` blocked a database migration.

```console
$ openstack volume show data-vol -c status -c attachments
| status      | detaching |
| attachments | [{'server_id': '3f2a', 'device': '/dev/vdb'}] |
$ sudo virsh domblklist instance-0000004a
 vdb   /dev/rbd/volumes/volume-91c2
$ openstack compute service list --service nova-compute -c Host -c State | grep cmp-7
| cmp-7 | down |
```

The compute node cmp-7 was down, so nothing could complete the detach. The operators first confirmed that the server was not running on any other host, so it was safe, then restored cmp-7. After it came up, they retried the detach. Had they only reset the volume to `available` while the guest still had it attached, two writers could have corrupted the data. They now have a runbook that starts with "check the compute service, then compare the hypervisor with the database".

## Common mistakes

- Resetting states without checking the hypervisor
- Upgrading without a tested restore of the database
- No alert on queue depth or Galera cluster size
- Treating a three-controller cluster as safe while one node is down and unnoticed

```quiz
Q: What helps you follow one failed request across services?
+ The request id in the logs
- The server flavor :: No.
- The image checksum :: No.
- The project name :: Too broad.
> Search each log for the same req- id.

Q: What does openstack server set --state active do?
+ Edits the database record; it does not start anything
- Boots the guest :: It does not.
- Deletes the server :: No.
- Resizes the flavor :: No.
> Compare with the hypervisor first.

Q: Why compare the hypervisor with the database before resetting a state?
+ Resetting a state while the guest is really attached or running can cause duplicate writers
- The hypervisor stores the quota :: No.
- It makes the reset faster :: No.
- It is optional with no risk :: There is risk.
> Reality must match the record.

Q: What should be done before every upgrade step?
+ Back up the databases and prove a restore
- Delete old flavors :: No.
- Disable monitoring :: No.
- Remove all quotas :: No.
> A rollback needs a tested backup.
```

```cards
Request id :: identifier that appears in every log for one API call
Agent :: service process on a node, for example Neutron OVS agent
Galera :: multi-master MariaDB cluster
Stuck state :: record that no longer matches reality
Release :: six-monthly OpenStack version
Headroom :: spare capacity for failure
```
