## A 403 from the API
level: junior
A developer reports an error when creating a deployment.

```text
$ kubectl create deploy web --image=nginx -n prod
Error from server (Forbidden): deployments.apps is forbidden: User "dev-ann" cannot create resource "deployments" in API group "apps" in the namespace "prod"
```
? Which stage rejected the request?
+ Authorization: the user was identified but has no permission
- Authentication, because the user is unknown
- Admission, because a webhook refused it
- Validation, because the schema is wrong
why: A 401 means authentication failed. A 403 Forbidden naming the user means they were identified and authorization said no.

## Webhook blocks every pod
level: mid
Pod creation fails across the whole cluster after a policy tool was installed.

```text
$ kubectl run t --image=nginx
Error from server (InternalError): Internal error occurred: failed calling webhook "validate.policy.example": Post "https://policy.svc:443/validate": no endpoints available for service "policy"
```
? What is the safest fix?
+ Restore the webhook backend, or scope or exclude system namespaces and review failurePolicy
- Delete all pods in the cluster
- Restart the API server repeatedly
- Disable authorization
why: A validating webhook with failurePolicy Fail blocks requests when it is unreachable. Fix or scope the webhook, and exclude namespaces it needs to start.

## A 409 conflict
level: junior
A script updates a ConfigMap and sometimes fails.

```text
$ kubectl replace -f cm.yaml
Error from server (Conflict): Operation cannot be fulfilled on configmaps "app": the object has been modified; please apply your changes to the latest version and try again
```
? What does the error mean and what should the script do?
+ Someone changed the object since it was read, so re-read and reapply or use server-side apply
- The API server is down, so wait an hour
- etcd is full, so delete a namespace
- The network dropped, so change the DNS
why: Every object has a resourceVersion. A 409 means yours is stale. Re-read, merge and retry, or use server-side apply which tracks field ownership.

## etcd space alarm
level: mid
Writes fail on a cluster that was fine yesterday.

```text
$ etcdctl alarm list
memberID:8e9e05c52164694d alarm:NOSPACE
$ etcdctl endpoint status -w table | cut -d"|" -f4,5
 3.1.8 | 8.6 GB
```
? What is the right order of actions?
+ Compact, defragment members one at a time, disarm the alarm, then find the writer
- Raise the quota and ignore the cause
- Delete the data directory
- Restart every member at once
why: Compaction frees revisions and defragmentation returns the space. Raising the quota only delays the next alarm, so find what writes so much.

## Pending with no events
level: mid
A pod has been Pending for ten minutes.

```text
$ kubectl describe pod web-1 | tail -4
Status: Pending
Events: <none>
$ kubectl -n kube-system get pods -l component=kube-scheduler
NAME READY STATUS
kube-scheduler-cp1 0/1 CrashLoopBackOff
```
? What is the likely cause?
+ The scheduler is down, so nothing has tried to place the pod
- The node has too little memory
- The image does not exist
- A taint blocks the pod
why: A FailedScheduling event would appear if the scheduler had tried. No events means it has not looked at the pod, so check the scheduler itself.
