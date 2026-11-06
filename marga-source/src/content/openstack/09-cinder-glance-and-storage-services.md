---
title: Cinder, Glance and OpenStack storage
minutes: 12
summary: Understand block volumes with Cinder, images with Glance and how they connect to Ceph, and fix common volume and image problems.
---

Compute gets the attention, but most day-to-day OpenStack problems involve storage: volumes that will not attach, images that are slow to boot and snapshots that fill pools.

## What you will learn

- Cinder volumes, types, snapshots and backups
- Glance images, properties and formats
- How Ceph connects both services
- Troubleshooting attach and boot problems

## Cinder

```bash
openstack volume type list
openstack volume create --size 100 --type ssd db-data
openstack server add volume db-1 db-data
openstack volume snapshot create --volume db-data db-data-before-upgrade
openstack volume backup create --name db-backup-1 db-data
```

A **volume type** maps to a backend and its settings, such as performance tier. A **snapshot** is a point-in-time copy on the same backend and is not a backup. A **backup** is stored in a separate service such as object storage.

## Glance

```bash
openstack image create --file jammy.qcow2 --disk-format qcow2 --container-format bare \
  --property hw_scsi_model=virtio-scsi --property os_type=linux --public jammy-2026-11
openstack image list --status active
```

Image **properties** control hardware and scheduling, such as disk bus and required features. With Ceph, store images as **raw** so they can be cloned without conversion.

## With Ceph

When Glance, Cinder and Nova all use Ceph RBD, creating a volume from an image is a copy-on-write clone in the same cluster, and instances can boot from volume without copying data over the network.

## Troubleshooting

```bash
openstack volume show db-data -c status -c attachments
cinder-manage volume list 2>/dev/null | head
grep -i error /var/log/cinder/cinder-volume.log | tail
rbd -p volumes ls | head
```

Typical states: **error_attaching** (compute or iSCSI or RBD access problem), **stuck in deleting** (a snapshot still exists), **creating** for a long time (backend full or the scheduler found no valid backend). Check quotas, backend capacity and the volume service logs, and reset states only after confirming the real state on the backend.

## Incident: Volume stuck in error_attaching

> **Incident:** A database volume would not attach after a compute host replacement.

```console
status: error_attaching
libvirt: failed to open rbd volumes/volume-9c1f: Permission denied
ceph client.nova lacks access to pool volumes
```

The new host had a different Ceph key that lacked permission on the volumes pool. Once the capabilities were corrected and the secret defined on the host, the attach worked. The team added the Ceph credentials to the host build checks.

## Common mistakes

- Treating snapshots as backups
- Resetting volume states without checking the backend
- Converting images on every boot
- Ignoring pool capacity

```quiz
Q: What does Cinder provide?
+ Block volumes
- Images :: No.
- Networks :: No.
- Identity :: No.
> Persistent disks for instances.

Q: What does Glance store?
+ Images
- Volumes :: No.
- Floating IPs :: No.
- Flavors :: No.
> Boot images with properties.

Q: Why use raw images with Ceph?
+ Fast copy-on-write clones
- Smaller files :: No.
- Encryption :: No.
- Better logs :: No.
> No conversion needed.

Q: What is a snapshot not?
+ A backup in another failure domain
- A point-in-time copy :: No.
- A volume child :: No.
- A quick copy :: No.
> It shares the backend.
```

```cards
Cinder :: OpenStack block storage service
Glance :: OpenStack image service
Volume type :: Maps a volume to a backend and settings
RBD :: Ceph block device
```
