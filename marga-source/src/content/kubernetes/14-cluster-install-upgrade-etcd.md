---
title: Building, upgrading and backing up a cluster
minutes: 18
summary: Bootstrap a cluster with kubeadm, upgrade it one minor version at a time, back up and restore etcd, and manage certificates and node maintenance.
---

Managed services hide this work, but exams, on-premises clusters and many incidents depend on it. If you understand how a cluster is built, upgraded and recovered, you can reason about any Kubernetes environment.

## What you will learn

- Node prerequisites and a `kubeadm` bootstrap
- The safe upgrade order for control plane and workers
- Backing up and restoring etcd
- Certificate expiry and node drain and maintenance

## Preparing nodes

Each node needs a container runtime, the kubelet, kubeadm and kubectl at compatible versions, swap disabled, the right kernel modules and sysctl settings, and unique hostnames and MAC addresses.

```console
$ sudo swapoff -a
$ sudo sed -i '/ swap / s/^/#/' /etc/fstab
$ printf 'overlay\nbr_netfilter\n' | sudo tee /etc/modules-load.d/k8s.conf
$ printf 'net.bridge.bridge-nf-call-iptables = 1\nnet.ipv4.ip_forward = 1\n' | sudo tee /etc/sysctl.d/k8s.conf
$ sudo sysctl --system
$ sudo apt-mark hold kubelet kubeadm kubectl
```

Holding the Kubernetes packages stops a routine `apt upgrade` from moving the cluster to a new version unannounced.

## Bootstrapping with kubeadm

```console
$ sudo kubeadm init --pod-network-cidr=10.244.0.0/16 --control-plane-endpoint=k8s-api.example.com
$ mkdir -p $HOME/.kube && sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
$ sudo chown "$(id -u):$(id -g)" $HOME/.kube/config
$ kubectl get nodes
$ kubectl apply -f cni-manifest.yaml
$ sudo kubeadm token create --print-join-command
$ sudo kubeadm join k8s-api.example.com:6443 --token abcdef.0123456789abcdef --discovery-token-ca-cert-hash sha256:1234
```

`kubeadm init` generates certificates, writes static Pod manifests for the API server, controller manager, scheduler and etcd into `/etc/kubernetes/manifests/`, and starts the kubelet. Nodes stay `NotReady` until a CNI plugin is installed. Use a stable DNS name or load balancer for the control-plane endpoint so you can add more control-plane nodes later.

## Upgrading

Kubernetes supports upgrading **one minor version at a time** (for example 1.30 to 1.31, never 1.29 to 1.31). Read the release notes and deprecation list first, check API versions your manifests use, and back up etcd before you start.

Order matters: the control plane first, then the workers, with components never newer than the API server.

```console
$ sudo apt-mark unhold kubeadm && sudo apt-get install -y kubeadm=1.31.2-1.1 && sudo apt-mark hold kubeadm
$ sudo kubeadm upgrade plan
$ sudo kubeadm upgrade apply v1.31.2
$ kubectl drain cp-1 --ignore-daemonsets --delete-emptydir-data
$ sudo apt-get install -y kubelet=1.31.2-1.1 kubectl=1.31.2-1.1
$ sudo systemctl daemon-reload && sudo systemctl restart kubelet
$ kubectl uncordon cp-1
```

On each worker: upgrade kubeadm, run `sudo kubeadm upgrade node`, drain the node, upgrade the kubelet, restart it and uncordon. Do one node at a time, and respect PodDisruptionBudgets so an application keeps enough replicas during the drain.

## Backing up etcd

etcd stores every object in the cluster. Losing it without a backup means losing the cluster's state.

```console
$ sudo ETCDCTL_API=3 etcdctl snapshot save /backup/etcd-$(date +%F).db \
    --endpoints=https://127.0.0.1:2379 \
    --cacert=/etc/kubernetes/pki/etcd/ca.crt \
    --cert=/etc/kubernetes/pki/etcd/server.crt \
    --key=/etc/kubernetes/pki/etcd/server.key
$ sudo ETCDCTL_API=3 etcdutl snapshot status /backup/etcd-2025-06-02.db -w table
```

Store snapshots off the node, encrypt them (they contain Secrets), and schedule them. A backup you have never restored is a hope, not a backup.

```console
$ sudo systemctl stop kubelet
$ sudo etcdutl snapshot restore /backup/etcd-2025-06-02.db --data-dir /var/lib/etcd-restore
$ sudo sed -i 's#/var/lib/etcd#/var/lib/etcd-restore#' /etc/kubernetes/manifests/etcd.yaml
$ sudo systemctl start kubelet
$ kubectl get nodes
```

The restore writes a new data directory, and you point the etcd static Pod at it.

## Certificates and maintenance

kubeadm certificates expire after a year unless renewed, and upgrades renew them. An expired certificate makes the API server unreachable.

```console
$ sudo kubeadm certs check-expiration
$ sudo kubeadm certs renew all
$ kubectl cordon worker-2
$ kubectl drain worker-2 --ignore-daemonsets --delete-emptydir-data --grace-period=60
$ kubectl uncordon worker-2
```

`cordon` stops new Pods landing on a node; `drain` also evicts the existing ones safely; `uncordon` returns it to service.

## Incident: kubectl stops working one year after install

> **Incident:** On a Monday morning every `kubectl` command fails with `x509: certificate has expired or is not yet valid`. The cluster was built exactly a year ago and nobody upgraded it since.

The control-plane certificates expired. Workloads keep running, but nothing can be managed.

```console
$ sudo kubeadm certs check-expiration | head -6
$ sudo kubeadm certs renew all
$ sudo crictl ps | grep -E "kube-apiserver|etcd"
$ sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
$ kubectl get nodes
```

Renew the certificates, restart the static Pods (move their manifests out and back, or restart the kubelet), refresh the admin kubeconfig and verify. Add a calendar alert and a Prometheus rule on certificate expiry, and upgrade the cluster at least yearly.

## Common mistakes

- Skipping minor versions during an upgrade
- Upgrading workers before the control plane
- No tested etcd restore procedure
- Ignoring certificate expiry dates
- Draining without PodDisruptionBudgets for critical services

```quiz
Q: In which order should a kubeadm cluster be upgraded?
- Workers first, then control plane
+ Control plane first, then workers one at a time
- All nodes at once
- Only the workers
> Node components must not be newer than the API server.

Q: How many minor versions can you skip when upgrading?
+ None, upgrade one minor version at a time
- Up to three
- Any number
- Two
> Skipping minor versions is unsupported.

Q: Why encrypt etcd snapshots?
- To make restore faster
+ They contain every object in the cluster, including Secrets
- etcd requires it
- To reduce size
> A stolen snapshot exposes cluster credentials and data.

Q: What does kubectl drain do?
- Deletes the node
+ Cordons the node and safely evicts its Pods
- Upgrades the kubelet
- Restarts etcd
> Draining prepares a node for maintenance.
```

```cards
Command to create a join command? :: kubeadm token create --print-join-command
Where are control-plane static Pod manifests? :: /etc/kubernetes/manifests
Command to check certificate expiry? :: kubeadm certs check-expiration
How to snapshot etcd? :: etcdctl snapshot save with the endpoint and the CA, cert and key
```
