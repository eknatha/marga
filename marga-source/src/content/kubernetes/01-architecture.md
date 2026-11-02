---
title: Kubernetes architecture
minutes: 15
summary: Learn the control plane and node components, the declarative reconcile loop, and how to read cluster state with kubectl.
---

You run one container on one server and it works. Now you need ten copies across five servers, automatic replacement when one dies, and updates without downtime. Doing that by hand does not scale. Kubernetes is the system that does it for you: you describe what you want, and it keeps working until reality matches.

## What you will learn

- The components of the control plane and of a worker node
- The declarative model and the reconcile loop
- The core objects you will meet in every cluster
- The first kubectl commands to run on an unfamiliar cluster

## The components

A cluster is a set of machines called **nodes**. The **control plane** makes decisions; **worker nodes** run your containers.

| Component | Where | Job |
|-----------|-------|-----|
| `kube-apiserver` | Control plane | The front door. Every client and component talks to it. It validates and stores requests |
| `etcd` | Control plane | The database holding all cluster state. Back it up |
| `kube-scheduler` | Control plane | Chooses a node for each new Pod |
| `kube-controller-manager` | Control plane | Runs controllers that drive actual state toward desired state |
| `kubelet` | Every node | Starts and monitors the containers assigned to its node |
| `kube-proxy` | Every node | Maintains network rules so Services reach Pods |
| Container runtime | Every node | Actually runs containers (containerd or CRI-O) |

## Declarative and reconciling

You do not tell Kubernetes *how* to do something. You submit a **desired state**, for example "run 3 replicas of this image", and controllers repeatedly compare it with the **actual state** and act on the difference. If a node dies and a replica disappears, the controller notices 2 is not 3 and creates a replacement. This loop is why Kubernetes heals itself, and it is the most important idea in this module.

```console
$ kubectl create deployment web --image=nginx:1.27 --replicas=3
deployment.apps/web created
$ kubectl get pods -l app=web
NAME                   READY   STATUS    RESTARTS   AGE
web-7c5ddbdf54-4xk2p   1/1     Running   0          20s
web-7c5ddbdf54-9tq8m   1/1     Running   0          20s
web-7c5ddbdf54-zl6vh   1/1     Running   0          20s
$ kubectl delete pod web-7c5ddbdf54-4xk2p
pod "web-7c5ddbdf54-4xk2p" deleted
$ kubectl get pods -l app=web
```

After the delete, run the last command again and you will see three Pods once more, one of them brand new. You asked for 3, so Kubernetes made it so.

## Core objects

| Object | Purpose |
|--------|---------|
| **Pod** | One or more containers sharing a network and storage. The smallest unit you deploy |
| **Deployment** | Manages identical Pods, rolling updates and rollbacks |
| **Service** | A stable name and IP in front of a changing set of Pods |
| **ConfigMap / Secret** | Configuration and sensitive data, kept out of images |
| **Namespace** | A named partition of the cluster for teams or environments |
| **Node** | A machine in the cluster |

Objects are written as YAML with four top-level parts: `apiVersion`, `kind`, `metadata` and `spec`. You will write many in the coming lessons.

## First commands on any cluster

```console
$ kubectl config current-context
prod-eu-west
$ kubectl get nodes -o wide
$ kubectl get pods -A
$ kubectl describe node worker-2 | tail -15
$ kubectl api-resources | head
$ kubectl explain pod.spec.containers
```

Always check `current-context` first. Running a command against the wrong cluster is a classic and expensive mistake. `kubectl explain` documents any field from inside the terminal, which is also what you will rely on in an exam.

## Incident: kubectl is pointed at the wrong cluster

> **Incident:** You run `kubectl delete deployment web` to clean up a test, and an alert fires: the production website is down.

Your shell was still using the production context from earlier. Confirm and prevent:

```console
$ kubectl config get-contexts
CURRENT   NAME          CLUSTER       NAMESPACE
*         prod-eu-west  prod-eu-west  shop
          dev-sandbox   dev-sandbox   default
$ kubectl config use-context dev-sandbox
```

Restore service first by re-applying the Deployment manifest from your records (`kubectl apply -f web.yaml` on the production context), then fix the habit: show the context in your shell prompt, use a separate kubeconfig file per environment, and add `--context` explicitly in scripts. Role-based access (a later lesson) should also stop everyday accounts from deleting production workloads at all.

## Common mistakes

- Editing Pods directly instead of the Deployment that owns them
- Forgetting the namespace (`-n`) and concluding that a resource is missing
- Treating Pod IP addresses as stable
- Not backing up etcd on self-managed clusters

```quiz
Q: Which component stores all cluster state?
- kube-scheduler
- kubelet
+ etcd
- kube-proxy
> etcd is the consistent key-value store behind the API server. Losing it without a backup loses the cluster's configuration.

Q: You delete one Pod that belongs to a Deployment with 3 replicas. What happens?
- The Deployment is deleted
- Nothing, you must recreate it
+ A controller notices the difference and creates a replacement Pod
- The other Pods are also deleted
> Controllers continuously reconcile actual state with desired state.

Q: Which component decides which node a new Pod runs on?
+ kube-scheduler
- kube-proxy
- containerd
- kube-controller-manager
> The scheduler assigns unscheduled Pods to nodes; the kubelet then starts them.

Q: Which command shows the documentation of a field such as pod.spec.containers?
- kubectl describe pod
- kubectl api-versions
+ kubectl explain pod.spec.containers
- kubectl get --help
> kubectl explain reads the API schema, which makes it useful offline and in exams.
```

```cards
What is the declarative model? :: You submit desired state and controllers continuously work to make actual state match
Role of the kubelet? :: Runs on each node, starts and monitors the containers assigned to that node
Role of the API server? :: The front door to the cluster; validates requests and stores state in etcd
First command to run to avoid wrong-cluster mistakes? :: kubectl config current-context
```
