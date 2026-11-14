## A Service with no endpoints
level: junior
Requests to a Service time out.

```text
$ kubectl get svc web -o wide
web ClusterIP 10.96.12.4 80/TCP SELECTOR app=web
$ kubectl get endpointslices -l kubernetes.io/service-name=web
NAME ADDRESSTYPE PORTS ENDPOINTS
web-x7k IPv4 80 <unset>
```
? What is the most likely cause?
+ The selector matches no ready pods because of a label mismatch or failing readiness
- kube-proxy is not installed
- The DNS server is down
- The node has no disk
why: An empty endpoint list means the Service has no ready pods behind it. Compare the selector with the pod labels and check readiness probes.

## Slow external lookups
level: mid
An app resolves external names slowly.

```text
$ kubectl exec app -- cat /etc/resolv.conf
search prod.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
$ kubectl exec app -- time getent hosts api.example.com
0m 2.1s
```
? What explains the delay and what helps?
+ ndots 5 causes several failed lookups first; use fully qualified names or lower ndots
- The external server is down
- The Service has too many ports
- The pod needs more memory
why: A name with fewer than five dots is tried with every search domain first. A trailing dot or a lower ndots avoids the failed lookups.

## Default deny and DNS
level: mid
After a policy was applied every app lost name resolution.

```text
$ kubectl get networkpolicy -n prod
default-deny-egress Ingress,Egress
$ kubectl exec web -- nslookup kubernetes.default
;; connection timed out; no servers could be reached
```
? What is missing?
+ An egress rule allowing port 53 to the DNS pods in kube-system
- An ingress rule on port 80
- A larger MTU
- A new Service type
why: Default deny egress also blocks DNS. Allow UDP and TCP port 53 to the cluster DNS pods in the same change.

## Ingress without an address
level: junior
An Ingress was created an hour ago.

```text
$ kubectl get ingress web
NAME CLASS HOSTS ADDRESS PORTS
web <none> shop.example.com 80
```
? What do you check first?
+ Whether an ingress class is set and a controller for that class is running
- The pod CPU limit
- The kubelet version
- The etcd size
why: An Ingress is only a request. A controller for its class must exist and the class must be set or defaulted.

## Pods cannot reach each other across nodes
level: senior
Pods on the same node talk, but not across nodes.

```text
$ kubectl exec a -- ping -c1 10.244.2.7
100% packet loss
$ ip link show vxlan.calico | grep mtu
mtu 1500
$ ip link show eth0 | grep mtu
mtu 1500
```
? What is a likely cause given the overlay?
+ The overlay adds headers so its MTU must be lower than the node interface MTU
- The pod has the wrong label
- The Service has no selector
- CoreDNS is slow
why: Encapsulation adds bytes. If the overlay and node MTU are equal, larger packets are dropped, which shows as hangs on big transfers.
