## How does a Kubernetes Service find its pods?
level: junior
A Service has a label selector. Ready pods whose labels match become its endpoints. kube-proxy or the CNI programs rules on each node so traffic to the ClusterIP goes to one of those endpoints, and CoreDNS gives the Service a name. If the endpoints list is empty, I compare the selector with the pod labels first.

## Why does a NetworkPolicy sometimes do nothing?
level: junior
A NetworkPolicy is only a rule. The CNI plugin has to enforce it. On a CNI that does not support policy, such as plain Flannel, the objects are accepted and nothing is blocked. I test by trying a connection that should be blocked.

## What is a service mesh and what does it give you?
level: junior
A mesh is a layer, usually a proxy beside each service and a control plane, that handles calls between services. It gives mutual TLS, traffic routing, retries and timeouts, and metrics for every call without changing application code. It also adds cost and complexity, so I use it for a clear need.

## Explain sidecar versus ambient mode.
level: mid
In sidecar mode every pod has its own proxy, which is simple and gives per-pod control but costs memory and CPU in every pod and needs restarts to upgrade. Ambient mode uses a shared per-node component for encryption and basic policy and an optional per-namespace proxy for HTTP features, which lowers the per-pod cost.

## How do you roll out mTLS safely?
level: mid
I enable injection and restart workloads so every pod has a sidecar, set PeerAuthentication to PERMISSIVE and check that all traffic is already using mTLS in the metrics, then switch to STRICT per namespace. I keep a quick rollback to PERMISSIVE because a caller without a sidecar will break.

## How would you do a canary release with a mesh?
level: mid
I define subsets for the old and new versions in a DestinationRule and route a small weight, such as 5 percent, to the new one with a VirtualService. I watch error rate and latency per version, raise the weight in steps and roll back by setting it to zero. Weights must add up to 100.

## Requests fail with 503 after a mesh change. Walk me through it.
level: senior
I find the first failing hop from the trace or access logs, then read the response flag. UF with a recent mTLS change suggests a plain text caller against a strict destination. UH means no healthy endpoints. NR means no route. I check istioctl proxy-status for stale config and istioctl analyze for mistakes, then endpoints and policies, and finally call the pod directly to see if the app is at fault.

## How do retries and timeouts go wrong in a mesh?
level: senior
If several layers retry, one slow backend gets multiplied load, a retry storm that turns a slowdown into an outage. I keep retries at one layer, set a per-try timeout shorter than the overall timeout, cap total attempts or use a retry budget, and add outlier detection so a failing pod is ejected.

