## CrashLoopBackOff with exit code 137
level: junior
A Pod restarts again and again after a new release.

```text
$ kubectl get pod api-7d9f-x2k
NAME          READY  STATUS             RESTARTS
api-7d9f-x2k  0/1    CrashLoopBackOff   9

$ kubectl describe pod api-7d9f-x2k | grep -A6 "Last State"
    Last State:  Terminated
      Reason:    OOMKilled
      Exit Code: 137
    Limits:
      memory:  256Mi
```
? What does this tell you?
+ The container used more memory than its limit, so check usage and raise the limit or fix the leak
- The image cannot be pulled
- The liveness probe path is wrong
- The node has no free CPU
why: `OOMKilled` and exit code 137 show the kernel stopped the container for exceeding its memory limit. Compare real usage with `kubectl top pod`, look at what changed in the release, and set requests and limits from measurements. A limit that is too tight causes loops like this one.

## Pod stuck in Pending
level: junior
A new deployment never starts.

```text
$ kubectl get pod
NAME         READY  STATUS   RESTARTS
batch-5c-9z  0/1    Pending  0

$ kubectl describe pod batch-5c-9z | tail -4
Events:
  Warning  FailedScheduling  0/3 nodes are available: 3 Insufficient cpu.
$ kubectl get pod batch-5c-9z -o jsonpath='{.spec.containers[0].resources.requests}'
{"cpu":"8"}
```
? What is the likely cause?
+ The Pod requests 8 CPUs, and no node has that much unreserved CPU
- The cluster DNS is down
- The image pull secret is missing
- The Service has no endpoints
why: The scheduler places Pods by their requests. "Insufficient cpu" means no node has enough unreserved CPU for the 8 requested. Reduce the request to a realistic value, free capacity, or add nodes of a larger size or let the autoscaler add them. Check nodes with `kubectl describe node` and look at the allocated resources.

## Service with no endpoints
level: mid
Requests to a Service fail even though the Pods are Running.

```text
$ kubectl get svc web -o jsonpath='{.spec.selector}'
{"app":"web"}

$ kubectl get pods --show-labels
NAME         READY  STATUS   LABELS
webapp-6f-1  1/1    Running  app=webapp,pod-template-hash=6f

$ kubectl get endpointslices -l kubernetes.io/service-name=web
NAME        ADDRESSTYPE  PORTS  ENDPOINTS
web-abc12   IPv4         8080   <unset>
```
? How do you fix it?
+ Make the Service selector match the Pod labels, here app=webapp
- Restart the kube-proxy on every node
- Increase the replica count
- Change the Service type to NodePort
why: A Service sends traffic only to Pods whose labels match its selector and which are Ready. The selector is `app=web` and the Pods are labelled `app=webapp`, so the endpoints are empty. Fix the selector or the labels. If labels match, check that the Pods pass their readiness probe and that the namespace is the same.

## Pods stay Pending
level: junior
A new deployment never starts. Every pod stays in Pending.

```text
$ kubectl get pods
NAME            READY   STATUS    RESTARTS
api-6d9c-x2     0/1     Pending   0

$ kubectl describe pod api-6d9c-x2
Events:
  Warning  FailedScheduling  0/4 nodes are available:
  4 Insufficient memory.
```
? What is the best next step?
+ Compare the pod memory request with node capacity, then lower the request, add nodes, or free capacity
- Delete the namespace
- Restart the kubelet on one node
- Change the image pull policy
why: The scheduler places pods using the requests, not the actual use. The event says no node has enough unreserved memory. Check the request in the pod spec, and what the nodes have left with kubectl describe node. Right-sizing the request or adding capacity solves it.

## Rolling update stalls with failing readiness
level: mid
After a release, new pods start but never become ready, and the old pods keep serving.

```text
$ kubectl rollout status deploy/web
Waiting for deployment "web" rollout to finish: 1 out of 3 new replicas have been updated...

$ kubectl describe pod web-7b-q9
Readiness probe failed: HTTP probe failed with statuscode: 404
$ kubectl logs web-7b-q9
GET /healthz 404
```
? What happened?
+ The new version no longer serves the path the readiness probe checks. The rollout is correctly holding back, so fix the probe path or the app and redeploy, or roll back
- Kubernetes is broken and needs an upgrade
- The service has no selector
- The pods need more CPU
why: A rolling update only removes old pods when new ones report ready. Here the probe gets a 404, so the new pods never become ready and the old ones stay. This is the safety feature working. Check what changed in the release, and use kubectl rollout undo to go back if users are affected.

## Service has no endpoints
level: junior
Requests to a Service fail, though the pods are running.

```text
$ kubectl get endpoints web -n shop
NAME   ENDPOINTS   AGE
web    <none>      3d
$ kubectl get svc web -n shop -o jsonpath='{.spec.selector}'
{"app":"web-app"}
$ kubectl get pods -n shop --show-labels
web-6d4c-x2   1/1  Running  app=web
```
? What is wrong?
+ The Service selector app=web-app does not match the pod label app=web, so no endpoints are created
- The pods need more memory
- The node is out of disk
- The ingress controller is down
why: A Service finds pods through label selectors. If they do not match, the endpoint list is empty. Fix the selector or the labels, then check that the endpoints list the pod IPs.

## Pod is OOMKilled after a traffic spike
level: mid
A pod restarts during peak traffic with no errors in its log.

```text
$ kubectl describe pod api-5f | grep -A4 "Last State"
Last State:  Terminated
  Reason:    OOMKilled
  Exit Code: 137
Limits: memory 256Mi   Requests: memory 128Mi
```
? What should you do?
+ Check the real memory peak with metrics, raise the limit and request to match, and add a horizontal autoscaler if load is the cause
- Remove all resource limits
- Delete the node
- Change the restart policy to Never
why: The kernel killed the container for passing its 256 MiB limit, so the process had no chance to log. Measure peak use, set the limit with headroom, and keep requests near typical use so scheduling stays accurate.
