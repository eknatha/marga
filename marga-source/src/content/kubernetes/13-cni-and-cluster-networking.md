---
title: CNI, Pod networking and network policies
minutes: 16
summary: Understand how Pods get IP addresses and reach each other across nodes, what a CNI plugin does, how kube-proxy implements Services, and how to isolate traffic with NetworkPolicy.
---

Every Pod gets its own IP address and can talk to every other Pod without NAT. That promise sounds simple, but a plugin has to deliver it on real networks. Knowing how makes the difference between guessing and diagnosing when connections fail.

## What you will learn

- The Kubernetes network model and its three rules
- What a CNI plugin does and how Calico, Cilium and Flannel differ
- How a Service becomes iptables or IPVS rules via kube-proxy
- Default-deny NetworkPolicy and how to test it

## The network model

1. Every Pod gets a unique, cluster-wide IP address
2. Pods can communicate with all other Pods without NAT
3. Agents on a node can communicate with all Pods on that node

Service addresses are **virtual**: no interface owns a ClusterIP. Traffic to it is rewritten to a healthy backend Pod's IP.

```console
$ kubectl get pods -n shop -o wide
$ kubectl get svc shop-api -n shop
$ kubectl get endpointslices -n shop -l kubernetes.io/service-name=shop-api
$ kubectl cluster-info dump | grep -m1 -E "cluster-cidr|service-cluster-ip-range"
```

## The CNI plugin

The **Container Network Interface (CNI)** is a standard that lets the kubelet ask a plugin to give a new Pod a network interface and an address. Popular plugins differ in how they carry traffic between nodes:

| Plugin | Approach | Notable features |
|--------|----------|------------------|
| Flannel | Simple VXLAN overlay | Minimal, no NetworkPolicy |
| Calico | Routed (BGP) or overlay | Mature NetworkPolicy, scalable |
| Cilium | eBPF dataplane | Fast, rich policy, observability, can replace kube-proxy |
| Cloud CNIs (AWS VPC CNI, Azure CNI) | Pods get real VPC or VNet addresses | Native routing, but consume subnet addresses |

An **overlay** wraps Pod traffic in another packet (VXLAN or similar) to cross nodes, which works anywhere but adds overhead. **Routed** designs advertise Pod CIDRs so the underlying network delivers them directly. Choose at cluster creation: switching plugins later is disruptive.

```console
$ ls /etc/cni/net.d/
$ kubectl get pods -n kube-system -o wide | grep -E "calico|cilium|flannel|aws-node"
$ kubectl get nodes -o custom-columns=NAME:.metadata.name,PODCIDR:.spec.podCIDR
$ ip route | grep -E "cali|cilium|vxlan|flannel"
```

If new Pods hang in `ContainerCreating` with "network plugin not ready" or "failed to set up sandbox", the CNI plugin on that node is not healthy. Check its DaemonSet Pod.

## How Services work

**kube-proxy** runs on every node, watches Services and EndpointSlices, and programs the kernel (iptables or IPVS rules, or nothing at all when Cilium replaces it) to rewrite ClusterIP traffic to a backend.

```console
$ sudo iptables -t nat -L KUBE-SERVICES -n | head -8
$ sudo ipvsadm -Ln | head
$ kubectl get cm kube-proxy -n kube-system -o jsonpath='{.data.config\.conf}' | grep mode
$ kubectl run nettest --rm -it --image=busybox:1.36 --restart=Never -- wget -qO- -T 3 http://shop-api.shop.svc.cluster.local
```

A Service with no endpoints usually means its selector does not match any Pod labels or the Pods are not Ready.

## NetworkPolicy

By default every Pod can reach every other Pod. A **NetworkPolicy** restricts that, but only if the CNI enforces it (Flannel alone does not). Start with default deny, then open what is needed.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: shop
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api
  namespace: shop
spec:
  podSelector:
    matchLabels:
      app: shop-api
  policyTypes: ["Ingress", "Egress"]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: orders-db
      ports:
        - port: 5432
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - port: 53
          protocol: UDP
```

Notice the DNS egress rule. After a default-deny on egress, forgetting DNS breaks name resolution for every Pod.

## Incident: everything times out after the security hardening

> **Incident:** A security sprint adds a default-deny NetworkPolicy to the `shop` namespace. Minutes later the API reports `Temporary failure in name resolution` and checkout stops working.

Egress to CoreDNS was blocked along with everything else.

```console
$ kubectl exec deploy/shop-api -n shop -- nslookup orders-db
;; connection timed out; no servers could be reached
$ kubectl get networkpolicy -n shop
$ kubectl describe networkpolicy default-deny -n shop | tail -6
```

Add an egress rule allowing UDP and TCP port 53 to the DNS Pods, and then rules for each real dependency. Roll out policies in staging first, watch for denied flows with the CNI's observability tools, and keep a tested rollback.

## Common mistakes

- Writing NetworkPolicies on a CNI that does not enforce them
- Default-deny egress without allowing DNS
- Pod CIDR that overlaps with VPC or on-premises ranges
- Running out of subnet addresses with a VPC-native CNI
- Confusing a Service with no endpoints for a network problem

```quiz
Q: What does a CNI plugin do?
- Schedules Pods
+ Gives Pods network interfaces and addresses and connects them across nodes
- Stores images
- Manages RBAC
> The kubelet calls the plugin whenever a Pod sandbox is created.

Q: What does kube-proxy do?
+ Programs node rules so Service virtual IPs reach backend Pods
- Provides DNS
- Pulls images
- Encrypts traffic
> ClusterIPs are virtual; kube-proxy or an eBPF dataplane makes them work.

Q: What is true about NetworkPolicy by default?
- Pods are isolated until a policy allows traffic
+ Without policies all Pods can talk to each other, and enforcement needs a supporting CNI
- It blocks all external traffic
- It only affects nodes
> Isolation starts only once a policy selects a Pod.

Q: After applying a default-deny egress policy, what is commonly forgotten?
- Logging
+ An egress rule allowing DNS to CoreDNS
- Labels
- Resource limits
> Without DNS egress, name resolution fails for the whole namespace.
```

```cards
Three Kubernetes network rules? :: Unique Pod IPs, Pod-to-Pod without NAT, node agents reach local Pods
Overlay versus routed networking? :: Overlay encapsulates Pod traffic; routed advertises Pod CIDRs on the underlying network
What does an empty podSelector select? :: All Pods in the namespace
Why a Service has no endpoints? :: Selector mismatch or Pods not Ready
```
