---
title: VM disks, DataVolumes and CDI
minutes: 13
summary: Provide VM disks with PersistentVolumeClaims, import images with the Containerized Data Importer and DataVolumes, and clone golden images.
---

A VM disk is a block of data presented to the guest. In KubeVirt that data lives in a PVC. CDI is the helper that gets an operating system image into that PVC.

## What you will learn

- Disk and volume types
- DataVolumes and the CDI import flow
- Golden images and cloning
- Uploading your own image

## Disks and volumes

In the VM spec, a **disk** is what the guest sees (bus, boot order) and a **volume** is where the data comes from. Common volume types: `persistentVolumeClaim` for durable disks, `dataVolume` for a CDI-managed PVC, `containerDisk` for a read-only image pulled from a registry (changes are lost at restart), and `cloudInitNoCloud` for first-boot configuration.

## DataVolumes

```yaml
apiVersion: cdi.kubevirt.io/v1beta1
kind: DataVolume
metadata:
  name: fedora-golden
spec:
  source:
    http:
      url: https://download.example.com/fedora-cloud.qcow2
  storage:
    resources:
      requests:
        storage: 20Gi
```

CDI starts an importer pod that downloads the image, converts it to raw, and writes it into the PVC. The DataVolume goes through phases such as `ImportScheduled`, `ImportInProgress` and `Succeeded`.

```diagram
title: From image to VM disk
node: src | Image source | 0 | 1 | An http URL, a registry image or an uploaded file. | An unreachable URL leaves the import failing. | external
node: cdi | CDI importer pod | 1 | 1 | Downloads, converts to raw and writes into the PVC. | Large images need enough scratch space. | process
node: gold | Golden PVC | 2 | 0 | The prepared base image kept in one namespace. | Changing it silently affects every later clone. | store
node: clone | VM disk PVC | 2 | 2 | A clone created for one VM from the golden PVC. | Cloning across StorageClasses is slower. | store
node: vm | VirtualMachine | 3 | 1 | Boots from its own PVC. | A full clone uses the full disk size. | service
edge: src | cdi
edge: cdi | gold
edge: gold | clone
edge: clone | vm
```

## Golden images and clones

Import an operating system image once into a PVC. Create each VM disk with a DataVolume whose source is that PVC. With a CSI driver that supports snapshots or clones, CDI uses a fast copy. `DataImportCron` keeps golden images fresh from a registry on a schedule.

## Uploading

For a disk image on your laptop, `virtctl image-upload dv my-disk --size=20Gi --image-path=./disk.qcow2` sends it through the CDI upload proxy into a new DataVolume.

## Incident: The import that never finished

> **Incident:** A DataVolume stayed in ImportInProgress for an hour.

```console
$ kubectl get dv fedora-golden
NAME            PHASE              PROGRESS   RESTARTS
fedora-golden   ImportInProgress   3.20%      6
$ kubectl logs importer-fedora-golden | tail -n 2
E1107 08:14:02 data-processor.go: failed to write: no space left on device
```

The scratch space for converting the qcow2 image was smaller than the image. A StorageClass with enough room for scratch data fixed it, and the import finished in a few minutes.

## Common mistakes

- Downloading the same image for every VM
- Using containerDisk for data that must survive a restart
- Cloning a golden image across different storage backends without checking speed
- Not sizing the PVC larger than the image

```quiz
Q: What does CDI do?
+ Imports and clones disk images into PVCs
- Schedules pods :: No.
- Manages DNS :: No.
- Encrypts secrets :: No.
> Containerized Data Importer fills PVCs.

Q: Which volume type loses changes at restart?
+ containerDisk
- persistentVolumeClaim :: No.
- dataVolume :: No.
- pvc clone :: No.
> containerDisk is ephemeral.

Q: What keeps golden images fresh on a schedule?
+ DataImportCron
- A Service :: No.
- A NetworkPolicy :: No.
- virtctl console :: No.
> It re-imports from a registry.

Q: Why use a golden PVC?
+ Clones start faster than downloading again
- It removes the need for storage :: No.
- It speeds up the guest CPU :: No.
- It replaces backups :: No.
> Cloning stays inside the cluster.
```

```cards
DataVolume :: A resource that creates and fills a PVC through CDI
CDI :: The Containerized Data Importer
containerDisk :: A read-only VM disk pulled from a container registry
Golden image :: A prepared base disk that other VMs clone
Importer pod :: The pod that downloads and writes an image into a PVC
```
