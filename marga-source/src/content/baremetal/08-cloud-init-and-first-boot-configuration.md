---
title: cloud-init and first-boot configuration
minutes: 12
summary: Configure a new machine on its first boot with cloud-init user data, and debug why a node came up without its settings.
---

Building a new image for every server does not scale. Instead you build one image and let cloud-init configure each machine the first time it boots, using data supplied by the platform, a metadata service or a small seed disk.

## What you will learn

- Datasources, metadata and user data
- Writing a cloud-config file
- The stages cloud-init runs through
- Debugging a first boot that did not apply

## cloud-config

```yaml
#cloud-config
hostname: web-014
users:
  - name: ops
    groups: [sudo]
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3Nza... ops@example.com
package_update: true
packages:
  - chrony
  - nginx
write_files:
  - path: /etc/motd
    content: |
      Managed by platform team
runcmd:
  - [systemctl, enable, --now, chrony]
```

The file starts with `#cloud-config` and uses modules such as users, packages, write_files and runcmd. It is handed to the machine as **user data**, while **metadata** such as instance ID and hostname comes from the datasource: a cloud metadata service, a config drive or a NoCloud seed.

## Stages

cloud-init runs in order: **local** (find the datasource), **network** (get metadata and user data), **config** (run configuration modules) and **final** (package installs and scripts). Most per-instance work runs only once, keyed by instance ID, so rebooting does not repeat it.

## Debugging

```bash
cloud-init status --long
cloud-init schema --system
journalctl -u cloud-init -b
less /var/log/cloud-init.log
less /var/log/cloud-init-output.log
```

Check that the datasource was found, that the YAML is valid and which module failed. To re-test on a throwaway machine, run `cloud-init clean --logs` and reboot. Never do that on a node that already serves traffic.

## Incident: The node with no keys

> **Incident:** A fresh server booted but nobody could log in.

```console
cloud-init[611]: Failed to fetch metadata: connection timed out
cloud-init[611]: no datasource found
status: error
```

The network interface took longer than usual to come up, so cloud-init timed out and fell back to defaults without the SSH key. The team added a retry setting for the datasource, a post-boot health check that fails the node if cloud-init status is not done, and a rescue procedure through the BMC.

## Common mistakes

- Putting secrets in user data that others can read
- Assuming cloud-init runs every boot
- Not validating the YAML schema
- Baking per-server details into the image

```quiz
Q: What does cloud-init mostly run on?
+ The first boot of an instance
- Every minute :: No.
- Only at shutdown :: No.
- Only on containers :: No.
> Per-instance modules run once.

Q: What is user data?
+ Configuration you supply to the instance
- A password manager :: No.
- A kernel module :: No.
- A DNS record :: No.
> cloud-config usually arrives as user data.

Q: Which command shows cloud-init health?
+ cloud-init status --long
- ls -l :: No.
- top :: No.
- ssh-keygen :: No.
> It reports done or error.

Q: Why keep images generic?
+ So one image serves many roles
- To increase size :: No.
- To avoid testing :: No.
- To skip patches :: No.
> Differences come from data.
```

```cards
Datasource :: Where cloud-init finds metadata and user data
User data :: Per-instance configuration supplied at boot
Metadata :: Facts about the instance such as ID and hostname
cloud-config :: YAML format for cloud-init modules
```
