---
title: MAAS and Ironic: provisioning bare metal as a service
minutes: 13
summary: See how MAAS and OpenStack Ironic discover, enroll, commission and deploy physical servers through an API like cloud instances.
---

Racking a server is not the end of the work. You must register it, test it, install an operating system and later wipe it. MAAS and Ironic automate that lifecycle so bare metal can be requested like a virtual machine.

## What you will learn

- The lifecycle: enroll, commission, allocate, deploy, release
- What commissioning and testing collect
- How deployment uses PXE, images and cloud-init
- Choosing between MAAS and Ironic

## Lifecycle

1. **Enroll:** the machine PXE boots or is added with its BMC details.
2. **Commission:** a small ephemeral OS boots, inventories CPU, memory, disks and NICs and runs tests.
3. **Ready and allocate:** the server joins a pool and is reserved by a user or system.
4. **Deploy:** an image is written, networking is configured and cloud-init applies user data.
5. **Release:** the machine is wiped and returned to the pool.

```bash
maas admin machines read | jq '.[]|{hostname,status_name,power_state}'
maas admin machines allocate cpu_count=32 tags=gpu
maas admin machine deploy "$SYSTEM_ID" distro_series=jammy user_data="$(base64 -w0 cloud-init.yaml)"
```

## Ironic

**Ironic** is the OpenStack bare metal service. It exposes servers as Nova flavors, so users boot a physical machine with the same API as a virtual one. It supports drivers for IPMI and Redfish, deploys over iPXE or virtual media and can perform automated cleaning between tenants.

```bash
openstack baremetal node list
openstack server create --flavor baremetal-large --image jammy --network prod bm-web-01
```

## Choosing

Choose **MAAS** when you want a focused tool for datacenter provisioning with a simple web UI and API. Choose **Ironic** when you already run OpenStack and want bare metal and virtual machines under one control plane. Both rely on a reliable network boot setup and correct BMC credentials.

## Incident: The server that kept the last tenant's data

> **Incident:** A released machine was reallocated without cleaning.

```console
$ lsblk
sda  1.8T  part /data/customer-a
released node 17 reused for tenant B without clean
```

Cleaning was disabled to make release faster. The next tenant could read old data from the disk. The team enabled automated cleaning, verified it with a check after release and added a policy that a node may not return to the pool until wipe and firmware checks pass.

## Common mistakes

- Skipping cleaning between users
- Not testing hardware during commissioning
- Weak BMC credentials in the controller
- Relying on manual DHCP changes

```quiz
Q: What happens during commissioning?
+ The machine is inventoried and tested
- Applications are deployed :: No.
- The database is backed up :: No.
- The network is deleted :: No.
> It collects facts and runs tests.

Q: Which service exposes bare metal in OpenStack?
+ Ironic
- Cinder :: No.
- Glance :: No.
- Horizon :: No.
> Ironic manages physical nodes.

Q: Why clean disks on release?
+ To protect data between users
- To save power :: No.
- To rename hosts :: No.
- To patch the kernel :: No.
> Prevents data leakage.

Q: What often starts a deploy?
+ PXE or virtual media boot
- A DNS change :: No.
- A cron job only :: No.
- A firewall rule :: No.
> The BMC controls power and boot.
```

```cards
Commissioning :: Inventory and tests of a newly enrolled machine
Ironic :: OpenStack service for provisioning bare metal
MAAS :: Metal as a Service from Canonical
Cleaning :: Wiping a node between uses
```
