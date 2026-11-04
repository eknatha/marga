## Service with no endpoints
level: junior
Clients get connection refused through a Service called web.

```text
$ kubectl get endpoints web -n shop
NAME   ENDPOINTS   AGE
web    <none>      4m
$ kubectl get svc web -n shop -o jsonpath='{.spec.selector}'
{"app":"web"}
$ kubectl get pods -n shop --show-labels
web-7d9f-x2  1/1  Running  app=webapp
```
? What is wrong?
+ The Service selector app=web does not match the pod label app=webapp
- The pod image is too old
- CoreDNS is down
- The node has no disk
why: Empty endpoints mean no ready pod matches the selector. Fix the label or the selector.

## Policy that does nothing
level: junior
A NetworkPolicy exists but the database is still reachable from every namespace.

```text
$ kubectl get networkpolicy -n shop
NAME           POD-SELECTOR   AGE
default-deny   <none>         2d
$ kubectl get cm -n kube-system | grep -E "flannel|calico|cilium"
kube-flannel-cfg   2   200d
```
? Why is it not enforced?
+ The CNI is Flannel, which does not enforce NetworkPolicy
- The policy has a typo in its name
- The database is too fast
- Policies only work on weekdays
why: A NetworkPolicy is only a rule on paper. It needs a CNI plugin that enforces it, and flannel alone does not, so switch to Calico or Cilium.

## Slow external calls from pods
level: mid
Calls to api.partner.com take five seconds from pods but not from nodes.

```text
$ kubectl exec web-7d -- cat /etc/resolv.conf
search shop.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
```
? What explains the delay?
+ ndots:5 makes the resolver try search suffixes before the real name
- The partner API is down
- The pod has too little memory
- TLS is disabled
why: Names with fewer than five dots are tried with each suffix first. Use a trailing dot or lower ndots.

## Canary returns 503
level: mid
After applying a VirtualService for a canary, ten percent of calls fail.

```text
$ istioctl analyze -n shop
Error [IST0101] (VirtualService shop/reviews) Referenced host+subset in destinationrule not found: "reviews+v2"
```
? What is missing?
+ A DestinationRule that defines the v2 subset
- More replicas of v1
- A bigger node
- A new namespace
why: Subsets are defined in a DestinationRule. Create it before the VirtualService.

## Proxy config is stale
level: mid
Edits to a route do not take effect for one service.

```text
$ istioctl proxy-status
NAME            CDS     LDS     EDS     RDS
reviews-9a.shop SYNCED  STALE   SYNCED  SYNCED
```
? What does STALE mean?
+ The proxy has not received or accepted the latest listener configuration
- The pod is deleted
- The route is perfect
- The cluster has no DNS
why: Check the control plane and the proxy logs for rejected configuration.

## 503 after STRICT mTLS
level: senior
The storefront returns 503 right after PeerAuthentication was set to STRICT.

```text
$ kubectl logs reviews-5c -c istio-proxy | tail -1
"GET /reviews HTTP/1.1" 503 UF upstream_reset_before_response_started{connection_termination}
$ kubectl get pods -n shop
web-7d9f-x2   1/1   Running
```
? What is the likely cause and the fastest safe fix?
+ web has no sidecar and calls in plain text; set PERMISSIVE, then restart web so it gets a sidecar
- Scale reviews to 10 replicas
- Delete the namespace
- Disable DNS
why: UF right after a STRICT change with a 1/1 caller means plain text meets mTLS only.

## Retry storm
level: senior
A slow database leads to a complete outage across services.

```text
storefront: retries 3
orders: retries 3
inventory: retries 3
database queries per user request: 27
```
? What change helps most?
+ Retry at one layer only, with per-try timeouts, a retry budget and outlier detection
- Increase every retry count to 5
- Remove all timeouts
- Add more layers of retries
why: Retries multiply across layers and overload the struggling dependency.

