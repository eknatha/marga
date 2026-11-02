## kubectl cannot connect
level: junior
Every command times out.

```text
Unable to connect to the server: net/http: request canceled
[-]etcd failed: reason withheld
```
? Which component is the likely cause?
+ etcd or the API server's access to it
- The scheduler
- A pod
- The CNI plugin of one node
why: The API server depends on etcd. Check etcd health and disk latency.

## Pod stays Pending
level: junior
New replicas never start.

```text
0/5 nodes are available: 5 node(s) had untolerated taint {dedicated: gpu}
```
? What does this mean?
+ Pods lack a toleration for the nodes' taint
- The image is missing
- DNS failed
- The quota is zero
why: Taints repel pods without a matching toleration.

## Drain hangs
level: mid
Node maintenance does not finish.

```text
Cannot evict pod as it would violate the pod's disruption budget
api MIN AVAILABLE 3 ALLOWED DISRUPTIONS 0
```
? What do you change?
+ Add a replica or lower the budget so one pod may be evicted
- Force delete the node
- Disable the scheduler
- Ignore it
why: A budget that allows zero disruptions blocks drains.

## OOMKilled
level: mid
A container restarts repeatedly.

```text
Last State: Terminated Reason: OOMKilled Exit Code: 137
```
? What happened?
+ The container exceeded its memory limit
- The node ran out of disk
- DNS failed
- The image is old
why: Memory limits are hard. Raise the limit from measurements or fix the leak.

## Certificate expired
level: mid
All commands fail one morning.

```text
x509: certificate has expired or is not yet valid
admin.conf Mar 01, 2025 <invalid>
```
? What do you do and what prevents it?
+ Renew certificates and monitor expiry
- Restart the node only
- Delete etcd
- Change the namespace
why: Cluster certificates expire. Monitor and renew them.

## Forbidden for a controller
level: mid
A controller crashes.

```text
secrets is forbidden: User system:serviceaccount:ops:cert-sync cannot list resource secrets in namespace shop
```
? What is the narrowest fix?
+ A Role and binding allowing list on secrets in that namespace
- Bind cluster-admin
- Delete the controller
- Disable RBAC
why: The message names subject, verb and resource. Grant exactly that.

## Backup that cannot restore
level: senior
A snapshot file is empty.

```text
etcdutl snapshot status: file is corrupt or truncated
-rw-r--r-- 1 root root 0 etcd-2024-05-13.db
```
? What process was missing?
+ Verifying each snapshot and drilling restores
- Taking fewer backups
- Larger disks
- A faster network
why: An unverified backup is only a hope. Verify and rehearse.

## No network boundaries
level: senior
A compromised pod reached the database.

```text
nc -zv db.shop.svc 5432 open
No resources found in shop namespace (networkpolicy)
```
? What control is missing?
+ Default-deny network policies with narrow allows
- More replicas
- A bigger node
- A new ingress
why: By default every pod can reach every pod. Add policy and confirm the plugin enforces it.
