---
title: VM templates, cloud-init and image pipelines
minutes: 13
summary: Build clean, patched VM images in a pipeline, use cloud-init for per-instance settings and avoid hand-built templates that drift.
---

Every VM starts from an image. If the image is a mystery, every VM is a mystery. Treat images like software: built from source, tested and versioned.

## What you will learn

- Why hand-built templates drift
- Building images with Packer and configuration management
- Cleaning, hardening and scanning images
- Publishing, versioning and retiring images

## A pipeline

```hcl
source "qemu" "ubuntu" {
  iso_url          = "https://releases.ubuntu.com/24.04/ubuntu-24.04-live-server-amd64.iso"
  iso_checksum     = "sha256:REPLACE_WITH_CHECKSUM"
  output_directory = "output"
  disk_size        = "20G"
  ssh_username     = "builder"
  ssh_private_key_file = "~/.ssh/builder"
}

build {
  sources = ["source.qemu.ubuntu"]
  provisioner "ansible" {
    playbook_file = "playbooks/base-image.yml"
  }
  provisioner "shell" {
    script = "scripts/cleanup.sh"
  }
}
```

```bash
packer init . && packer validate . && packer build .
```

Pin the ISO checksum and run the build in CI with a clean builder. Use the same configuration management tool you use on servers, so images and running hosts follow one standard.

## Clean and harden

```bash
cloud-init clean --logs --seed
truncate -s 0 /etc/machine-id
rm -f /etc/ssh/ssh_host_* /root/.bash_history
apt-get clean && fstrim -av
```

Remove machine IDs, SSH host keys, logs and history so clones do not share identity. Apply a security baseline, disable unused services and scan the image for vulnerabilities and misconfiguration. Do not include secrets or personal SSH keys.

## Identity at boot

Use **cloud-init** to set hostname, users, keys, network and join configuration on first boot, so one image serves every role.

## Publish and retire

Test each image by booting it, checking that cloud-init completes and running a few smoke tests. Name images with a date or version, record the build commit and package list and keep only a few recent versions. Set a maximum age and rebuild monthly or when critical patches land.

## Incident: Two hundred clones with the same host keys

> **Incident:** Cloned VMs shared SSH host keys because the template was not cleaned.

```console
web-01 host key SHA256:q1xA...
web-02 host key SHA256:q1xA...
identical host key on 212 hosts
```

The template had been converted without removing SSH host keys, so every clone kept them. Clients could not tell the hosts apart, and one compromised key mattered everywhere. The pipeline now cleans identity data, and a test checks that two instances never share a host key.

## Common mistakes

- Templates edited by hand
- Leaving machine-specific data in images
- Never rebuilding for patches
- No smoke test for new images

```quiz
Q: What should a pipeline build images from?
+ Code and pinned sources
- Memory :: No.
- A running VM :: No.
- A guess :: No.
> Reproducibility. The lesson section above explains why.

Q: What must be removed before cloning?
+ SSH host keys and machine ID
- Kernel :: No.
- Packages :: No.
- Network cards :: No.
> Prevent shared identity.

Q: What sets per-instance settings at boot?
+ cloud-init
- Packer :: No.
- The ISO :: No.
- A bootloader :: No.
> First-boot configuration.

Q: How keep images fresh?
+ Rebuild on a schedule
- Never change :: No.
- Edit running VMs :: No.
- Use old ISOs :: No.
> Patches need new images.
```

```cards
Packer :: Tool for building machine images from code
Golden image :: A standard base image for new VMs
Machine ID :: Unique identifier that must differ per host
Smoke test :: Quick check that a build basically works
```
