---
title: CNI, network policy and eBPF
minutes: 13
summary: Choose a CNI, understand what a NetworkPolicy allows and denies, and see where eBPF changes how Kubernetes networking works.
---

By default every pod can talk to every other pod. That is convenient for a small cluster and risky for a shared one. Network policies and the right CNI let you say who may talk to whom.

## What you will learn

- How CNIs differ: overlay, routed, eBPF
- What a NetworkPolicy does and the default-deny pattern
- Why a policy does nothing without support from the CNI
- What eBPF changes in Cilium
- How to test a policy

## Choosing a CNI

- **Flannel**: simple overlay networking, no policy support.
- **Calico**: routed or overlay networking with strong policy and BGP options.
- **Cilium**: built on **eBPF**, with policy, observability and optional replacement of kube-proxy.
- Cloud CNIs (AWS VPC CNI, Azure CNI) give pods addresses from the cloud network.

An **overlay** wraps pod traffic in tunnels (VXLAN) between nodes, which is easy but adds a small overhead. **Routed** designs advertise pod ranges to the network, which is faster and easier to debug with ordinary tools.

## What a NetworkPolicy says

A NetworkPolicy selects pods and lists the traffic **allowed** to or from them. Policies are additive: if no policy selects a pod, everything is allowed; once any policy selects it for a direction, only what is listed in some policy is allowed.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: shop
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: web-from-ingress
  namespace: shop
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes: [Ingress]
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - port: 8080
```

The first policy selects every pod and allows nothing: **default deny**. The second allows only the ingress controller to reach `web` on 8080. Remember to allow DNS (port 53 to CoreDNS) when you deny egress, or lookups break.

## Policy needs enforcement

A NetworkPolicy is only a rule. The **CNI** has to enforce it. Applying one on a cluster running Flannel is accepted without error and does nothing, which is a dangerous silent failure.

## What eBPF changes

**eBPF** lets small, checked programs run inside the Linux kernel. Cilium uses it to:

- Enforce policy by identity (labels), not by IP address
- Replace long iptables chains with fast hash lookups, which matters with thousands of Services
- Show who talks to whom, with tools like Hubble

```console
$ cilium status --brief
OK
$ kubectl exec -n shop deploy/web -- curl -s -m 2 http://db.shop:5432
curl: (28) Connection timed out after 2001 milliseconds
```

A timeout where you expect a refusal often means a policy is silently dropping the packets.

```wrongpath
@goal Lock down the shop namespace so only the ingress controller can reach the web pods.
@wrong
# apply a default-deny policy and nothing else, in production, on a Friday
kubectl apply -f default-deny.yaml -n shop
@result
$ kubectl exec -n shop deploy/web -- nslookup db.shop
;; connection timed out; no servers could be reached
# every pod lost DNS and all traffic stopped, including health checks
@why Default deny with Egress included blocks DNS and every other call. Nothing was allowed first, so the whole namespace went dark at once.
@right
# 1. observe real traffic first (Hubble or flow logs)
# 2. write allow rules: ingress to web, web to db, all pods to kube-dns on 53
# 3. test in a staging namespace
# 4. apply default-deny last
kubectl apply -f allow-dns.yaml -f allow-web.yaml -n shop
kubectl apply -f default-deny.yaml -n shop
@after Add the allows before the deny, test them, and keep a rollback command ready.
```

## Incident: The policy that did nothing

> **Incident:** A security review found the database reachable from any namespace, despite a NetworkPolicy.

```console
$ kubectl get cm -n kube-system | grep -E "flannel|calico|cilium"
kube-flannel-cfg   2   200d
```

The cluster used plain Flannel, which does not enforce NetworkPolicy. The policy objects existed, but nothing applied them. The team moved to a CNI with enforcement and added a test that tries a blocked connection in CI.

## Common mistakes

- Assuming a policy is enforced without testing it
- Denying egress without allowing DNS
- Using IP addresses in policy instead of labels
- Applying default-deny without first learning the real traffic

```quiz
Q: If no NetworkPolicy selects a pod, what traffic is allowed?
+ All traffic
- None :: Not by default.
- Only from the same node :: No.
- Only DNS :: No.
> Kubernetes allows everything until a policy selects the pod.

Q: What can make a NetworkPolicy do nothing?
+ A CNI that does not enforce policies, such as plain Flannel
- A long name :: No.
- Using YAML :: No.
- Having two policies :: No.
> The CNI must enforce policies.

Q: Why allow DNS when you deny egress?
+ Without it pods cannot resolve names and calls fail
- DNS is a security risk :: No.
- Policy requires it by law :: No.
- To speed up pulls :: No.
> Lookups go to CoreDNS on port 53.

Q: What does Cilium use to enforce policy by identity?
+ eBPF programs in the kernel
- Only iptables :: Cilium can replace many iptables rules.
- Hardware firewalls :: No.
- Browser extensions :: No.
> eBPF runs checked programs in the kernel.
```

```cards
NetworkPolicy :: Rules for which pods may talk to which
Default deny :: Policy that blocks everything not allowed
eBPF :: Small programs that run safely inside the kernel
Overlay :: Network that wraps traffic in tunnels
VXLAN :: A common tunnelling method
Hubble :: Cilium tool to see network flows
```
