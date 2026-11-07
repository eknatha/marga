---
title: Deploying Ceph with cephadm
minutes: 12
summary: Bootstrap a cluster with cephadm, add hosts and OSDs, deploy services with the orchestrator, and read cluster status.
---

Cephadm is the standard way to deploy Ceph on bare metal or VMs. It needs a container runtime, systemd, time sync and Python, and gives you one command to bootstrap and an orchestrator for everything after.

## What you will learn

- Prerequisites for a healthy first cluster
- Bootstrapping the first host
- Adding hosts, OSDs and services
- Reading status and finding what is wrong

## Prerequisites

Each host needs a supported Linux, systemd, a container runtime (Podman or Docker), LVM2, Python 3, time synchronisation and DNS or hosts entries. Use a separate network for cluster traffic if you can. Disks for OSDs should be empty with no partitions or file systems.

## Bootstrap

```bash
cephadm bootstrap --mon-ip 10.0.0.11
ceph orch host add ceph2 10.0.0.12
ceph orch host add ceph3 10.0.0.13
ceph orch apply osd --all-available-devices
ceph orch ls
```

Bootstrap creates the first monitor and manager, a dashboard, and an admin keyring. The orchestrator then places daemons on hosts you add.

```diagram
title: How cephadm builds a cluster
node: boot | cephadm bootstrap | 0 | 1 | Creates the first MON and MGR and the admin keyring. | Use the right monitor IP; it is hard to change later. | process
node: orch | Orchestrator | 1 | 1 | Runs in the manager and places daemons. | If the manager is down, orchestration pauses. | service
node: hosts | Added hosts | 2 | 0 | Receive monitors, managers and OSDs by label. | Wrong labels place daemons in one rack. | edge
node: osds | OSDs on free disks | 2 | 2 | Created from empty devices. | A disk with old data is skipped. | store
node: spec | Service specification | 1 | 0 | A YAML file that describes the wanted daemons. | An unreviewed spec can change production. | store
edge: boot | orch
edge: spec | orch
edge: orch | hosts
edge: orch | osds
```

## Service specifications

```yaml
service_type: mon
placement:
  count: 5
  label: mon
---
service_type: osd
service_id: hdd_with_nvme_db
placement:
  host_pattern: 'osd*'
spec:
  data_devices:
    rotational: 1
  db_devices:
    rotational: 0
```

Apply with `ceph orch apply -i spec.yaml`. A drive group like this puts the OSD data on hard drives and their DB on flash.

## Reading status

`ceph -s` gives health and services. `ceph orch ps` lists daemons and their state. `ceph health detail` explains each warning. `cephadm logs --name osd.3` shows a daemon's log.

## Incident: The disk that was skipped

> **Incident:** A new disk never became an OSD.

```console
$ ceph orch device ls
HOST   PATH      AVAILABLE  REJECT REASONS
osd4   /dev/sdc  No         Has partitions, LVM detected
$ ceph orch device zap osd4 /dev/sdc --force
zap successful for /dev/sdc on osd4
```

The disk had an old partition table from a previous use, so cephadm refused it to protect data. The team confirmed the disk was unused, zapped it, and the orchestrator created the OSD automatically.

## Common mistakes

- Skipping time synchronisation on hosts
- Running ad hoc commands that are not recorded
- Zapping a disk without checking what is on it
- Putting all monitors on the same switch

```quiz
Q: What does cephadm run each daemon in?
+ A container
- A VM :: No.
- A Helm chart :: No.
- A chroot :: No.
> Containers keep daemons consistent.

Q: What does ceph orch apply osd --all-available-devices do?
+ Creates OSDs on empty disks
- Deletes pools :: No.
- Starts a monitor :: No.
- Upgrades Ceph :: No.
> It claims unused devices.

Q: Why keep a spec in Git?
+ To rebuild the same cluster
- To hide secrets :: No.
- To speed the network :: No.
- To avoid monitors :: No.
> Specs make deployments repeatable.

Q: Which command explains warnings?
+ ceph health detail
- ceph osd tree :: No.
- rbd ls :: No.
- ceph fs ls :: No.
> It lists each warning.
```

```cards
cephadm :: The tool that deploys and manages Ceph in containers
Orchestrator :: The module that places and manages daemons
Service specification :: A file that declares wanted daemons
Drive group :: A rule that picks devices for OSDs
Bootstrap :: Creating the first monitor and manager
```
