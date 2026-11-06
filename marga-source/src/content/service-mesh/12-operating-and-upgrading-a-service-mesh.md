---
title: Operating and upgrading a service mesh
minutes: 12
summary: Upgrade a mesh with canary control planes, revision tags and staged proxy restarts, and know how to roll back and what to monitor.
---

The mesh sits in front of every request, so a bad upgrade can look like an outage everywhere. Staged, reversible upgrades and good health signals make it a routine operation.

## What you will learn

- Version skew between control plane and proxies
- Canary upgrades with revisions
- Rolling proxies in waves and rolling back
- What to monitor during an upgrade

## Revisions

```bash
istioctl install --set revision=1-24 -y
kubectl get pods -n istio-system -l app=istiod
kubectl label namespace shop istio.io/rev=1-24 --overwrite
kubectl rollout restart deployment -n shop
istioctl proxy-status
```

With **revisions** you install a second control plane beside the first. Each namespace points at one revision, so you move a test namespace first, then others. Proxies pick up the new version when their pods restart.

## Skew and order

Control plane versions can usually be at most one minor version ahead of proxies. Upgrade the control plane first, then proxies, then gateways. Read release notes for removed APIs and changed defaults. Keep infrastructure code in Git so you can review the diff.

## Rollback

Rolling back is relabeling the namespace to the old revision and restarting the workloads. Do not delete the old control plane until the new one has run healthy for a full business cycle.

## Monitor

- Request success rate and p99 latency by service
- Control plane config push errors and rejected configuration
- Proxy and control plane restarts and memory
- Certificate issuance and expiry
- Gateway error rates

Define a go or no-go check for each wave, and schedule upgrades outside peak windows.

## Incident: Proxies that could not read the new config

> **Incident:** An in-place upgrade left old proxies with unsupported configuration.

```console
istiod: pushing config to 812 proxies
proxy: unknown field in Listener
412 proxies rejected configuration (NACK)
```

The control plane was upgraded in place two versions at once, which broke compatibility. The team rolled back, moved to one-minor-version upgrades with revisions, and added a pre-upgrade check and a canary namespace to every plan.

## Common mistakes

- Skipping minor versions
- Upgrading in place without a rollback path
- Not restarting workloads after changing revisions
- Upgrading during peak traffic

```quiz
Q: What does a revision allow?
+ Two control planes side by side
- Two clusters merged :: No.
- Deleting proxies :: No.
- Skipping testing :: No.
> Move namespaces gradually.

Q: Which is upgraded first?
+ The control plane
- Application code only :: No.
- Every proxy at once :: No.
- The nodes :: No.
> Control plane then data plane.

Q: How do you roll back?
+ Relabel to the old revision and restart
- Delete the cluster :: No.
- Edit nodes :: No.
- Reboot :: No.
> The old revision is still there.

Q: What should you watch during upgrade?
+ Error rate, latency and config push health
- Only CPU :: No.
- Image size :: No.
- Pod names :: No.
> Detect problems early.
```

```cards
Revision :: A named installable version of the control plane
Version skew :: Difference between component versions
NACK :: A proxy rejecting a configuration push
Canary namespace :: First namespace moved to a new version
```
