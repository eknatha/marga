---
title: OpenStack operations: maintenance, evacuation and a day-two runbook
minutes: 12
summary: Take compute hosts out of service safely with live migration and evacuation, handle host failures, and keep a runbook with checks for upgrades and capacity.
---

A private cloud has hundreds of moving parts, and hardware fails every week at scale. The difference between a calm operations team and a stressed one is a short set of practiced procedures: drain a host, recover from a dead host, patch without downtime and check health before and after any change.

## What you will learn

- Draining a compute host for planned maintenance
- Evacuating instances from a failed host
- Pre-change and post-change health checks
- What belongs in a day-two runbook

## Planned maintenance: drain

1. Check that other hosts in the aggregate have capacity (N+1).
2. Stop new placements on the host by disabling its compute service.
3. Live migrate instances away (or cold migrate those that cannot move live).
4. Do the work, reboot and verify.
5. Enable the service again and watch placement.

```console
$ openstack compute service set --disable --disable-reason "kernel patch 2026-03-05" compute-12 nova-compute
$ openstack server list --all-projects --host compute-12 -c ID -c Name -c Status
$ openstack server migrate --live-migration --block-migration 5d2c7e1a-0000-4c11-9d0a-3f4e8a1b2c3d
$ openstack server migration list --status running
$ openstack compute service set --enable compute-12 nova-compute
```

Live migration fails when the destination has an incompatible CPU model, a different network or storage setup, or when the guest changes memory too quickly. Migrate in small batches, check each one finishes, and keep an eye on the network. Instances using local storage need block migration, which is slower. Pinned or SR-IOV guests may require cold migration with a short downtime that you plan with their owners.

## Host failure: evacuate

If a host dies, instances on it are stuck in their last state. Make sure the host is really down and **fenced** (powered off or isolated), because rebuilding an instance elsewhere while the old one still runs against shared storage can corrupt data.

```console
$ openstack compute service list --service nova-compute
$ openstack server list --host compute-12 --all-projects
$ openstack server evacuate 5d2c7e1a-0000-4c11-9d0a-3f4e8a1b2c3d
```

Evacuation rebuilds the instance on another host using shared or boot-from-volume storage. Instances with local ephemeral disks lose that data, which is a good reason to prefer boot from volume for anything important. Some deployments automate this with a high-availability service; test it regularly, with clear rules about when it triggers.

## Health checks around every change

Before: all compute services up, all network agents alive, Ceph `HEALTH_OK`, no running migrations, no active alerts, recent backups of the database and configuration. After: the same checks, plus a canary test that creates a server, attaches a volume, assigns a floating IP, pings it and deletes it. Automate the canary and run it continuously.

```bash
#!/usr/bin/env bash
set -euo pipefail
openstack compute service list --service nova-compute -f value -c State | grep -vq down
openstack network agent list -f value -c Alive | grep -vq False
ceph health | grep -q HEALTH_OK
echo "preflight ok"
```

## The day-two runbook

Keep it short, versioned and tested: contact and escalation list, architecture map, how to drain and evacuate, how to restart each service safely, how to find logs, upgrade steps with rollback points, capacity thresholds and who approves changes. Review after every incident, and link each alert to its runbook section.

```predict
Q: A compute host loses power, and you want to evacuate its instances immediately. What must you confirm first?
???
That the host is really down and fenced, so the old instances cannot still write to shared storage. Then evacuate.
> Avoid two copies of one instance.
```

## Incident: The evacuation that created duplicates

> **Incident:** A compute host lost its network but kept running, an operator evacuated its instances, and several databases wrote to the same volumes from two hosts.

```console
$ openstack compute service list --service nova-compute | grep compute-12
| compute-12 | nova-compute | nova | enabled | down |
$ ping -c 2 compute-12-ipmi
2 packets transmitted, 2 received
```

The service showed down, but the host was alive and still running its guests. The evacuation started new copies elsewhere while the originals were still running, and two instances held the same volume. The team recovered from backups and wrote a rule: confirm power state through the out-of-band controller and power the host off (fencing) before any evacuation. They later automated that check inside the evacuation tool.

## Common mistakes

- Evacuating without fencing the failed host
- Draining a host without checking spare capacity
- Using local ephemeral disks for important data
- Skipping the canary test after a change

```quiz
Q: What should you do before migrating instances off a host?
+ Disable the compute service for new placements and check capacity elsewhere
- Delete the instances :: Destructive.
- Disable monitoring :: Removes visibility.
- Reboot all hosts :: Causes outage.
> Stop new placements, then drain.

Q: Why fence a failed host before evacuation?
+ To prevent two copies of an instance from writing to the same storage
- To save power only :: Not the main reason.
- To rename the host :: Unrelated.
- To free IP addresses :: Unrelated.
> Fencing protects data integrity.

Q: Why prefer boot from volume?
+ Instances can be rebuilt on another host with their data intact
- It uses no storage :: Opposite.
- It removes the need for backups :: Not true.
- It disables migration :: Opposite.
> Data lives outside the host.

Q: What does a canary test verify after a change?
+ That servers, volumes and networking work end to end
- That the dashboard has a new theme :: Unrelated.
- That quotas are zero :: Unrelated.
> It exercises the whole workflow.
```

```cards
Drain :: disable service, migrate guests, patch, enable
Evacuate :: rebuild instances from a dead host elsewhere
Fencing :: make sure the failed host cannot run or write
Canary :: automated create, attach, ping and delete test
Runbook :: short, versioned, tested procedures
```
