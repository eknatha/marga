## What are the rules of the Kubernetes network model?
level: junior
Every pod gets its own IP, all pods can reach all other pods without NAT, and agents on a node can reach pods on that node. The CNI plugin implements those rules.

## How does a ClusterIP Service work?
level: junior
The ClusterIP is a virtual address. kube-proxy on each node programs rules in iptables, IPVS or nftables that rewrite traffic to one of the ready pod IPs from the EndpointSlices.

## A Service times out. What do you check?
level: mid
First endpoints: does the selector match ready pods. Then reach a pod IP directly, check the target port, a network policy, and finally kube-proxy rules and conntrack on the node.

## Why can DNS be slow for external names?
level: mid
Pods use ndots 5, so a name with fewer than five dots is tried with each search domain first. Use fully qualified names with a trailing dot or lower ndots, and consider NodeLocal DNSCache.

## How do you write a default deny network policy safely?
level: mid
Apply a deny for ingress and egress to a namespace, then allow DNS and each required flow. Test one allowed and one denied flow. Remember selectors in the same list item are ANDed.

## When would you choose the Gateway API over Ingress?
level: senior
When several teams share entry points and need separate ownership, or when you need richer routing like header matches and traffic splitting without controller specific annotations.
