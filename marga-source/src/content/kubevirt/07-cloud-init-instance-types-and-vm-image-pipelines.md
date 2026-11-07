---
title: Cloud-init, instance types and VM image pipelines
minutes: 13
summary: Configure a VM on first boot with cloud-init, size VMs with instance types and preferences, and build a repeatable image pipeline.
---

A VM you configured by hand is a pet. A VM built from an image, an instance type and a cloud-init file can be recreated at any time.

## What you will learn

- Cloud-init volumes and what they can set
- Instance types and preferences
- Building and testing golden images
- Keeping secrets out of userData

## Cloud-init

Most Linux cloud images run cloud-init at first boot. In KubeVirt, a `cloudInitNoCloud` volume carries the data as a small disk. Typical settings are a user, an SSH key, package installs and commands.

```yaml
      volumes:
        - name: cloudinit
          cloudInitNoCloud:
            userData: |
              #cloud-config
              users:
                - name: ops
                  ssh_authorized_keys:
                    - ssh-ed25519 AAAAC3Nza... ops@example
              package_update: true
              packages:
                - qemu-guest-agent
              runcmd:
                - systemctl enable --now qemu-guest-agent
```

Install `qemu-guest-agent` in every image. KubeVirt uses it for the guest IP, clean shutdown and filesystem freeze for snapshots.

## Instance types and preferences

```yaml
apiVersion: instancetype.kubevirt.io/v1beta1
kind: VirtualMachineClusterInstancetype
metadata:
  name: medium
spec:
  cpu:
    guest: 4
  memory:
    guest: 8Gi
```

A VM references it with `spec.instancetype.name: medium`. A `VirtualMachinePreference` sets device defaults such as the disk bus and network model. Changing sizes then means choosing another type, not editing CPU and memory in every VM.

```diagram
title: A VM assembled from reusable parts
node: image | Golden image | 0 | 1 | The operating system disk, built and tested once. | An untested image breaks every VM cloned from it. | store
node: type | Instance type | 1 | 0 | CPU and memory such as medium. | Changing it affects VMs created later, not running ones. | process
node: pref | Preference | 1 | 2 | Disk bus, NIC model and other device defaults. | A wrong bus can stop Windows booting. | process
node: ci | Cloud-init data | 2 | 1 | Users, keys and first-boot commands. | Secrets in userData are readable by anyone who can read the VM. | security
node: vm | VirtualMachine | 3 | 1 | The result: a consistent, repeatable VM. | Drift returns if people log in and change it by hand. | service
edge: image | vm
edge: type | vm
edge: pref | vm
edge: ci | vm
```

## Image pipelines

Build images with a tool such as Packer or a CI job: start from a vendor cloud image, apply updates, install the guest agent, test boot in a throwaway VM, then publish the disk to a registry or PVC. Version the images and keep the last few.

## Secrets

Do not put passwords or tokens in `userData`. Use a Secret referenced by `userDataSecretRef`, or fetch secrets at runtime from a manager such as Vault.

## Incident: Fifty different sizes

> **Incident:** A capacity review found VMs with 3, 5 and 7 CPUs and no pattern.

```console
$ kubectl get vm -o custom-columns=NAME:.metadata.name,CPU:.spec.template.spec.domain.cpu.cores
NAME    CPU
app01   3
app02   5
app03   7
```

Every VM was created by copying a nearby manifest and editing numbers. The team defined small, medium and large instance types, migrated VMs to them at their next restart, and sizing reviews became a single table.

## Common mistakes

- Building images by logging in and installing things
- Leaving qemu-guest-agent out of the image
- Putting secrets in userData
- Expecting an instance type change to resize a running VM

```quiz
Q: What does cloud-init do?
+ Configures a VM at first boot
- Schedules pods :: No.
- Creates a StorageClass :: No.
- Encrypts disks :: No.
> It sets users, keys and packages.

Q: Why install qemu-guest-agent?
+ KubeVirt uses it for IP, shutdown and snapshot freeze
- It speeds CPU :: No.
- It removes cloud-init :: No.
- It opens ports :: No.
> The agent connects guest and host.

Q: What is an instance type?
+ A reusable CPU and memory size
- A disk image :: No.
- A network :: No.
- A node pool :: No.
> VMs reference it by name.

Q: Where should passwords for first boot go?
+ In a Secret, not plain userData
- In the image name :: No.
- In the VM label :: No.
- In a ConfigMap :: No.
> Secrets keep them out of readable manifests.
```

```cards
cloud-init :: A first-boot configuration system for cloud images
Instance type :: A named CPU and memory size for VMs
Preference :: Device defaults that go with an operating system
qemu-guest-agent :: A helper in the guest that talks to the host
Image pipeline :: A repeatable process that builds and tests VM images
```
