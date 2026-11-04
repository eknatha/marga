---
title: Virtualization
summary: virsh, qemu-img, bridges and migration commands, with the checks that explain a guest that will not start or a host that is slow.
module: virtualization
---

## Guests

```bash
virsh list --all
virsh start web-1
virsh shutdown web-1        # clean, asks the guest OS
virsh destroy web-1         # power off, like pulling the plug
virsh dominfo web-1
virsh console web-1
virsh domstate web-1 --reason
```

> **Warning:** `destroy` does not delete the guest, but it is an abrupt power-off. Use `shutdown` first.

## Memory and CPU

```bash
virsh nodememstats
virsh setmem web-1 4G --live
virsh setvcpus web-1 4 --live
virsh vcpuinfo web-1
free -m
grep -E "steal|st" <(top -bn1 | head -4)
```

Steal time above a few percent means the host CPU is oversubscribed.

## Disks and snapshots

```bash
qemu-img info disk.qcow2
qemu-img create -f qcow2 -b base.qcow2 -F qcow2 overlay.qcow2
virsh pool-list
virsh pool-info default
virsh snapshot-list web-1
virsh snapshot-create-as web-1 before-upgrade
virsh snapshot-delete web-1 before-upgrade
```

> **Warning:** Never delete files in a pool by hand. Snapshot chains depend on their backing files.

## Network

```bash
virsh domiflist web-1
virsh net-list --all
ip link show type bridge
bridge link
bridge vlan show
```

## Migration

```bash
virsh migrate --live web-1 qemu+ssh://host2/system
virsh domjobinfo web-1
virsh domjobabort web-1
```

If dirty rate is above bandwidth, the migration will not converge.

## Quick diagnosis

| Symptom | First look |
|---|---|
| Guest will not start | error text, free host memory, pool space |
| Guest paused (ioerror) | pool full or storage fault |
| Everything slow | host swap, steal time, disk latency |
| No network | `domiflist`, bridge exists, VLAN allowed on the switch |

## Quick host checks

```bash
virsh list --all
virsh nodememstats
virsh domstats --cpu-total web-1
virsh pool-list --details
virsh domblklist web-1
```

## Cautions

> **Danger:** `virsh destroy` powers a guest off instantly, like pulling the plug. Use `virsh shutdown` first.

> **Warning:** Snapshots are not backups. They grow with every write and a full pool pauses all guests.

> **Caution:** Overcommitting memory works until every guest is busy at once. Keep a reserve on the host.