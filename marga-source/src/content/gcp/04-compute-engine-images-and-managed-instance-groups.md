---
title: Compute Engine, images and managed instance groups
minutes: 13
summary: Create Compute Engine VMs, choose machine types and images, and run them in managed instance groups with autoscaling, health checks and rolling updates.
---

A VM you log into and fix by hand is a pet. Google Cloud gives you the tools to run herds: templates, groups and health checks that rebuild failed machines for you.

## What you will learn

- Machine types, images and disks
- Instance templates and managed instance groups
- Autohealing, autoscaling and rolling updates
- Spot VMs and cost control

## Creating a VM

```console
$ gcloud compute instances create web-1 --zone=europe-west1-b \
    --machine-type=e2-standard-2 --image-family=debian-12 --image-project=debian-cloud \
    --subnet=app-eu --no-address --service-account=web@acme-pay-prod.iam.gserviceaccount.com \
    --metadata=enable-oslogin=TRUE
```

Pick a machine family for the workload (E2 or N2 general, C for compute, M for memory, A or G for GPUs) or a custom size. Use **OS Login** to tie SSH access to IAM instead of copied keys.

## Instance templates and groups

An **instance template** records machine type, image, network and startup script. A **managed instance group (MIG)** keeps N copies of it running.

```console
$ gcloud compute instance-templates create web-v2 --machine-type=e2-standard-2 \
    --image-family=web-golden --subnet=app-eu --no-address
$ gcloud compute instance-groups managed create web --region=europe-west1 \
    --template=web-v2 --size=3
$ gcloud compute instance-groups managed set-autoscaling web --region=europe-west1 \
    --max-num-replicas=10 --target-cpu-utilization=0.6
```

A **regional** MIG spreads instances across zones. **Autohealing** recreates instances that fail an application health check. **Rolling updates** replace instances gradually (`max-surge`, `max-unavailable`) when you point the group at a new template.

## Cost

**Spot VMs** cost far less but can be stopped at any moment, so use them for batch and stateless work. Rightsizing recommendations and committed use discounts reduce steady cost.

```diagram
title: A self-healing group of VMs
node: img | Golden image | 0 | 0 | The built operating system and app. | A manual image drifts from the code.
node: tmpl | Instance template | 1 | 0 | Machine type, image, network and scripts. | Templates cannot be edited; make a new one. | process
node: mig | Regional MIG | 2 | 0 | Keeps the wanted number of instances in several zones. | A zone with no quota leaves it short.
node: hc | Health check | 3 | 0 | Tests the app; failing VMs are recreated. | A check that is too strict causes a restart loop. | observe
node: auto | Autoscaler | 2 | 1 | Adds or removes instances based on load. | Slow startup lets a spike pass unserved. | process
edge: img | tmpl
edge: tmpl | mig
edge: mig | hc
edge: auto | mig
```

## Incident: Restart loop

> **Incident:** Autohealing kept recreating instances because the health check timed out before the app started.

```console
$ gcloud compute instance-groups managed list-instances web --region=europe-west1
web-a1  RECREATING  UNHEALTHY
health check: initial delay 30s; app ready after 90s
```

The check started before the app was ready and declared the VM unhealthy. Raising the initial delay above the startup time stopped the loop.

## Common mistakes

- Hand-built VMs with no template
- Zonal groups for services that must survive a zone failure
- Health checks with no initial delay for slow starts
- Spot VMs for stateful services

```quiz
Q: What keeps N identical VMs running?
+ A managed instance group
- A snapshot :: No.
- A firewall rule :: No.
- A label :: No.
> MIGs maintain size and health.

Q: What does autohealing do?
+ Recreates instances that fail health checks
- Compresses disks :: No.
- Updates DNS :: No.
- Closes ports :: No.
> It replaces unhealthy VMs.

Q: Why use a regional MIG?
+ To survive a zone problem
- To save disk :: No.
- To use fewer templates :: No.
- To avoid health checks :: No.
> Instances spread across zones.

Q: What is a Spot VM best for?
+ Interruptible batch work
- A single database :: No.
- License servers :: No.
- Primary storage :: No.
> They can be stopped at any time.
```

```cards
Instance template :: A reusable definition of a VM
MIG :: A group that keeps a set of identical VMs running
Autohealing :: Replacing instances that fail a health check
Spot VM :: A discounted VM that can be preempted
OS Login :: IAM-based SSH access to VMs
```
