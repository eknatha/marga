---
title: Debugging cluster and node problems
minutes: 14
summary: Find the cause of NotReady nodes, Pending pods, evictions and a slow API server using an ordered checklist.
---

Cluster problems feel dramatic, but they respond to an ordered method: confirm the symptom, find the layer (workload, node, control plane, network), gather evidence, change one thing, and verify. This lesson gives you the checks and commands for the failures you will meet most.

## What you will learn

- Triage from workload to node to control plane
- Diagnose a NotReady node
- Diagnose Pending pods and evictions
- Check the control plane and API server health

## Order of checks

Start at the symptom. A pod problem: `kubectl describe pod` (events), `kubectl logs --previous`. If the pod is fine, look at the node: `kubectl get nodes`, `kubectl describe node`. If several nodes or the API misbehave, look at the control plane. Resist changing things before you know which layer is at fault.

## NotReady nodes

`kubectl describe node` shows conditions: Ready, MemoryPressure, DiskPressure, PIDPressure, NetworkUnavailable. On the node, check `systemctl status kubelet`, `journalctl -u kubelet -n 100`, the container runtime (`crictl ps`, `systemctl status containerd`), disk space and inodes (`df -h`, `df -i`), memory, and the network plugin pods. Common causes: full disk, a stopped kubelet or runtime, expired certificates, or lost network.

## Pending and evicted pods

A Pending pod shows the reason in events: insufficient CPU or memory, node selector or affinity mismatch, untolerated taints, unbound volume claims. Evicted pods usually indicate node pressure (often ephemeral storage or memory); look at which pods use the most and at requests. CrashLoopBackOff and ImagePullBackOff are workload-level problems, not node-level.

## Control plane health

Check `kubectl get --raw=/readyz?verbose`, API server logs, etcd health and disk latency, and certificate expiry (`kubeadm certs check-expiration`). A slow API often comes from etcd latency, an overloaded API server due to a misbehaving client making huge list calls, or admission webhooks that time out and block writes.

## Close the loop

Record the timeline, the cause, the fix and a prevention (an alert on disk usage or certificate expiry, a quota, a runbook). Practise these in a test cluster so the first time is not production.

```predict
Q: A node is NotReady and kubelet logs say "no space left on device". What do you check next?
???
Disk usage and inodes on the node, especially image storage and logs, then free space or resize.
> Common cause.
```

## Incident: Certificates expired

> **Incident:** All kubectl commands failed with a certificate error one morning.

```console
$ kubectl get nodes
Unable to connect to the server: x509: certificate has expired or is not yet valid
$ sudo kubeadm certs check-expiration | head -4
CERTIFICATE  EXPIRES  RESIDUAL TIME
admin.conf   Mar 01, 2025 02:11 UTC  <invalid>
```

The cluster certificates, issued a year earlier, had expired. The team renewed them with kubeadm, restarted the control plane components, then added a monitor on expiry dates and an annual upgrade schedule that renews them automatically.

## Common mistakes

- Restarting things before looking at events
- Ignoring node conditions
- No monitoring of certificate expiry
- Debugging the wrong layer

```quiz
Q: Where do you start for a failing pod?
+ kubectl describe and logs
- Reinstall the cluster :: Extreme.
- Delete all nodes :: Extreme.
- Reboot the load balancer :: Random.
> Events first. Re-read the matching lesson section for the full reasoning.

Q: What shows node pressure?
+ Node conditions in kubectl describe node
- kubectl top only :: Partial.
- DNS :: No.
- Ingress :: No.
> Memory, disk, PID. Re-read the matching lesson section for the full reasoning.

Q: Why might the API server be slow?
+ etcd latency, heavy clients or slow webhooks
- Too many labels :: Unlikely.
- Wrong colour :: No.
- Low temperature :: No.
> Check each. Re-read the matching lesson section for the full reasoning.

Q: What prevents an expiry outage?
+ Monitoring and renewal of certificates
- Hope :: No.
- Longer passwords :: No.
- More pods :: No.
> Alert early. Re-read the matching lesson section for the full reasoning.
```

```cards
Triage :: pod, node, control plane
Events :: kubectl describe
Node conditions :: Ready, pressure, network
kubelet logs :: journalctl -u kubelet
readyz :: API health
Expiry :: kubeadm certs check-expiration
```
