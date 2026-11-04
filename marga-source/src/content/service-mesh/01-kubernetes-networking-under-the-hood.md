---
title: Kubernetes networking under the hood
minutes: 14
summary: Follow a packet from one pod to another: the pod network, CNI, Services, kube-proxy, CoreDNS, and how Ingress and the Gateway API bring traffic in.
---

Kubernetes promises that every pod can reach every other pod by IP address, without NAT. Something has to make that true. Knowing what that something is turns a mysterious timeout into a short list of places to look.

## What you will learn

- The four rules of the Kubernetes network model
- What a CNI plugin does
- How a Service, kube-proxy and endpoints turn a name into a pod
- How DNS works inside a cluster
- Ingress and the Gateway API for traffic coming from outside

## The model

1. Every pod gets its own IP address.
2. Pods can reach all other pods without NAT.
3. Agents on a node can reach all pods on that node.
4. A pod sees itself with the same IP address others see.

The cluster does not implement this itself. A **CNI plugin** (Container Network Interface), such as Calico, Cilium or Flannel, runs when a pod starts. It creates a virtual network device for the pod, assigns an address from the node's pod range and sets up the routes or tunnels that let other nodes reach it.

## From a Service name to a pod

Pods come and go, so their addresses change. A **Service** gives a stable virtual IP (the ClusterIP) and a name. The pieces:

- The Service has a **selector**. Pods whose labels match become its **endpoints**.
- **kube-proxy** on each node programs rules (iptables or IPVS) that rewrite traffic sent to the ClusterIP so it goes to one of the endpoint pod IPs.
- **CoreDNS** answers `web.shop.svc.cluster.local` with the ClusterIP.

```console
$ kubectl get svc,endpoints web -n shop
NAME          TYPE        CLUSTER-IP     PORT(S)
service/web   ClusterIP   10.96.14.20    80/TCP

NAME            ENDPOINTS                         AGE
endpoints/web   10.244.1.7:8080,10.244.2.4:8080   3d
```

If the **ENDPOINTS** column is empty, the selector matches no ready pods. That is the most common cause of "the Service does not work".

## DNS in the cluster

Pods get `/etc/resolv.conf` pointing at CoreDNS and a search path such as `shop.svc.cluster.local svc.cluster.local cluster.local`. So `web` resolves inside the `shop` namespace, and `web.other` reaches another namespace. A setting called `ndots:5` makes short names try the search path first, which can slow lookups for external names.

## Coming in from outside

- A **NodePort** opens a port on every node. A **LoadBalancer** Service asks the cloud (or MetalLB on bare metal) for an external IP.
- **Ingress** routes HTTP by host and path to Services, run by an ingress controller such as NGINX.
- The **Gateway API** is the newer, more expressive model: a `Gateway` for the listener, `HTTPRoute` for rules, with roles split between platform and application teams.

```wrongpath
@goal Clients get "connection refused" through a Service called web. Fix it.
@wrong
# restart the pods and the Service
kubectl rollout restart deployment/web -n shop
kubectl delete svc web -n shop && kubectl apply -f svc.yaml
@result
$ kubectl get endpoints web -n shop
NAME   ENDPOINTS   AGE
web    <none>      12s
# still no endpoints, and now there was an outage while the Service was deleted
@why Restarting changes nothing about labels. The Service selects app=web but the pods are labelled app=webapp, so no pod matches. Deleting the Service also removed its ClusterIP for a while.
@right
kubectl get svc web -n shop -o jsonpath='{.spec.selector}'
kubectl get pods -n shop --show-labels
# fix the selector or the label so they match
kubectl get endpoints web -n shop
@after Compare the selector with the pod labels first. A Service with empty endpoints is a label problem until proven otherwise.
```

## Incident: DNS slowed everything down

> **Incident:** Calls to an external API took five seconds, but only from pods.

```console
$ kubectl exec web-7d -- cat /etc/resolv.conf
search shop.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
```

The name `api.partner.com` has two dots, fewer than five, so the resolver tried each search suffix first and waited for failures. Ending the name with a dot (`api.partner.com.`) or lowering `ndots` cut the time to milliseconds.

## Common mistakes

- Blaming the app when the Service has no endpoints
- Forgetting that the selector and labels must match exactly
- Assuming DNS is always fast inside a cluster
- Using NodePort in production without a load balancer in front

```quiz
Q: What gives a Service its list of pods?
+ Its label selector, which creates the endpoints
- The pod name :: Names are not used.
- The node name :: Not used.
- The image tag :: Not used.
> Pods that match the selector and are ready become endpoints.

Q: What does a CNI plugin do?
+ Gives each pod a network device and address and sets up routes between nodes
- Builds container images :: No.
- Schedules pods :: That is the scheduler.
- Stores secrets :: No.
> CNI wires pods into the cluster network.

Q: A Service shows no endpoints. What is the most likely cause?
+ The selector matches no ready pods
- The cluster is too old :: Unlikely.
- DNS is off :: DNS would not empty the endpoints.
- The namespace is too long :: No.
> Check labels against the selector.

Q: Why can external names be slow inside a pod?
+ ndots:5 makes the resolver try search suffixes first
- Pods have no DNS :: They do.
- Containers block DNS :: No.
- CoreDNS only answers cluster names :: It forwards others.
> Short names with few dots trigger extra lookups.
```

```cards
CNI :: Plugin that wires pods into the network
ClusterIP :: Stable virtual IP for a Service
Endpoints :: The pod addresses behind a Service
kube-proxy :: Programs rules that send Service traffic to pods
CoreDNS :: The cluster DNS server
Gateway API :: Newer API for routing traffic into a cluster
```
