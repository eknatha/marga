---
title: The control plane in depth
minutes: 13
summary: Know what each control plane component does, how a request flows through it, and which failures matter most.
---

Using Kubernetes means writing manifests. Running it means keeping the control plane healthy. When you operate clusters you need to know exactly what the API server, etcd, scheduler and controller manager do, how they depend on each other, and what breaks when each one fails. This knowledge is what lets you stay calm when `kubectl` stops answering.

## What you will learn

- Trace a request through the API server
- Explain what etcd stores and why it matters most
- Describe the scheduler and controller manager roles
- Predict the effect of each component failing

## The API server

Every read and write goes through the **API server**. It authenticates the caller, authorises the request (RBAC), runs admission controllers that can mutate or reject objects, validates the object, and stores it in etcd. Nothing else writes to etcd. Kubelets, controllers and users are all clients of this one gateway. It is stateless and can run as several replicas behind a load balancer.

## etcd

**etcd** is a consistent key-value store holding all cluster state: every object you create. It uses a consensus protocol and needs a majority of members to work, so three or five members are typical. It is sensitive to slow disks and network latency: slow writes show up as slow API calls. If etcd is lost with no backup, the cluster state is lost, although running containers continue for a while.

## Scheduler and controllers

The **scheduler** watches for pods with no node and picks one by filtering (resources, taints, affinity) and scoring. The **controller manager** runs control loops: the Deployment controller creates ReplicaSets, the ReplicaSet controller creates pods, the node controller marks unreachable nodes, and many more. Each loop compares desired with actual state and acts to close the gap. The cloud controller manager does the same for cloud load balancers and routes.

## On each node

The **kubelet** receives pod specs for its node, asks the container runtime to run them, runs probes and reports status. **kube-proxy** (or an alternative network layer) implements service routing. A node can keep running existing pods if the control plane is down, but nothing new is scheduled and nothing is repaired.

## What breaks when

API server down: no changes and no `kubectl`; existing pods keep running. etcd down or slow: the API server fails or lags. Scheduler down: new pods stay Pending. Controller manager down: no scaling, no replacement of failed pods. Kubelet down on a node: that node goes NotReady and its pods are rescheduled after a timeout.

```predict
Q: The scheduler is down for ten minutes. A Deployment is scaled from 3 to 6. What do you see?
???
Three new pods are created but stay Pending without a node, until the scheduler returns.
> Controllers create, the scheduler places.
```

## Incident: kubectl hangs

> **Incident:** Engineers could not run any kubectl command and the dashboard timed out.

```console
$ kubectl get nodes
Unable to connect to the server: net/http: request canceled (Client.Timeout exceeded)
$ curl -sk https://10.0.0.10:6443/livez?verbose | tail -3
[-]etcd failed: reason withheld
livez check failed
```

The health endpoint pointed at etcd. Disk latency on the etcd members had risen after a noisy neighbour job. Moving etcd to dedicated fast disks and alerting on write latency restored the API; running workloads had stayed up the whole time.

## Common mistakes

- Treating the control plane as an afterthought
- Running etcd on slow shared disks
- Single API server in production
- No monitoring of control plane latency

```quiz
Q: Who writes to etcd?
+ Only the API server
- Every pod :: No.
- kubectl directly :: It goes through the API server.
- The scheduler directly :: It uses the API server.
> One gateway. Re-read the matching lesson section for the full reasoning.

Q: What does the scheduler do?
+ Assigns pending pods to nodes
- Starts containers :: The kubelet does.
- Stores data :: etcd does.
- Routes traffic :: Services do.
> Filter then score. Re-read the matching lesson section for the full reasoning.

Q: What happens to running pods if the API server is down?
+ They keep running but nothing changes
- They stop at once :: False.
- They double :: False.
- They move :: False.
> Data plane continues. Re-read the matching lesson section for the full reasoning.

Q: Why use 3 or 5 etcd members?
+ A majority is needed to agree
- For speed only :: No.
- For colours :: No.
- Because 2 is illegal :: Not the reason.
> Quorum. Re-read the matching lesson section for the full reasoning.
```

```cards
API server :: gateway: authn, authz, admission, store
etcd :: all cluster state, needs quorum
Scheduler :: picks a node
Controller manager :: reconcile loops
Kubelet :: runs pods on a node
Quorum :: majority of etcd members
```
