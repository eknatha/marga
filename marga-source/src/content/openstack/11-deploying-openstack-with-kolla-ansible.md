---
title: Deploying OpenStack with Kolla-Ansible
minutes: 13
summary: See how containerized OpenStack is deployed with Kolla-Ansible, configure inventory and globals, and run upgrades and reconfiguration safely.
---

Installing OpenStack service by service by hand is slow and error prone. Kolla packages each service as a container, and Kolla-Ansible deploys and manages them across your servers.

## What you will learn

- The inventory and globals files
- The deployment workflow and prechecks
- Overriding service configuration
- Reconfigure and upgrade

## Files

```text
# multinode inventory (excerpt)
[control]
ctl-01
ctl-02
ctl-03
[network]
ctl-01
ctl-02
ctl-03
[compute]
cmp-01
cmp-02
[storage]
sto-01
```

```yaml
# /etc/kolla/globals.yml (excerpt)
kolla_base_distro: ubuntu
openstack_release: "2025.1"
network_interface: eth0
neutron_external_interface: eth1
kolla_internal_vip_address: 10.20.0.250
enable_cinder: "yes"
enable_haproxy: "yes"
```

`globals.yml` holds cluster-wide choices. `passwords.yml` holds generated secrets and must be protected and backed up. Both belong in a private repository, with secrets encrypted.

## Workflow

```bash
kolla-genpwd
kolla-ansible -i multinode bootstrap-servers
kolla-ansible -i multinode prechecks
kolla-ansible -i multinode deploy
kolla-ansible -i multinode post-deploy
```

**Prechecks** catch missing interfaces, wrong addresses, port conflicts and missing packages before anything changes. Fix every failure first.

## Override configuration

Place files under `/etc/kolla/config/<service>/` to add or override service settings, for example `nova.conf`. Run `kolla-ansible reconfigure` to apply.

```bash
kolla-ansible -i multinode reconfigure --tags nova
docker ps --format 'table {{.Names}}\t{{.Status}}' | head
```

## Upgrade

Upgrade one release at a time, read the release notes, back up databases and configuration, run `pull` to fetch images ahead of time and then `upgrade`. Test the procedure in a staging cloud that mirrors production.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Deploying OpenStack with Kolla-Ansible fits together
node: n1 | Files | 0 | 0 | globals.yml holds cluster-wide choices. passwords.yml holds generated secrets and must be protected and backed up. | Losing passwords.yml. | process
node: n2 | Workflow | 1 | 1 | Prechecks catch missing interfaces, wrong addresses, port conflicts and missing packages before anything changes. | Skipping prechecks. | queue
node: n3 | Override configuration | 2 | 0 | Place files under /etc/kolla/config/<service>/ to add or override service settings, for example nova.conf. | Hand-editing files inside containers. | process
node: n4 | Upgrade | 3 | 1 | Upgrade one release at a time, read the release notes, back up databases and configuration, run pull to fetch images ahead of time and then upgrade. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: A precheck that saved the day

> **Incident:** Prechecks found a wrong interface name before a deploy.

```console
TASK [neutron : Checking neutron_external_interface]
fatal: [ctl-02]: FAILED! interface eth1 not found
PLAY RECAP: ctl-02 failed=1
```

One controller had a different network card name. The precheck failed before any change was made. The team fixed the name in the inventory host variables, added a hardware check to server provisioning and reran the deploy successfully.

## Common mistakes

- Skipping prechecks
- Losing passwords.yml
- Hand-editing files inside containers
- Upgrading several releases at once

```quiz
Q: What does globals.yml hold?
+ Cluster-wide deployment settings
- Only passwords :: No.
- Logs :: No.
- Images :: No.
> Main configuration. The lesson section above explains why.

Q: What do prechecks do?
+ Find problems before deploying
- Delete containers :: No.
- Upgrade :: No.
- Backup :: No.
> Fail early. The lesson section above explains why.

Q: Where do per-service overrides go?
+ /etc/kolla/config/<service>/
- Inside running containers :: No.
- In DNS :: No.
- In logs :: No.
> Applied by reconfigure.

Q: How upgrade releases?
+ One release at a time with backups
- Skip releases :: No.
- During outages :: No.
- Without notes :: No.
> Reduce risk. The lesson section above explains why.
```

```cards
Kolla :: Builds OpenStack service containers
Kolla-Ansible :: Deploys Kolla containers with Ansible
globals.yml :: Main Kolla-Ansible configuration
Precheck :: Validation before deployment
```
