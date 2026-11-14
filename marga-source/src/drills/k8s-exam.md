## Switching to the wrong cluster
level: junior
A task says to use context k8s-c2 and fix a deployment.

```text
$ kubectl config current-context
k8s-c1
$ kubectl get deploy -n web
No resources found in web namespace.
```
? What should you do first?
+ Run the use-context command from the task, then repeat the check
- Create the deployment in the current cluster
- Restart the first cluster
- Skip the task
why: Each task names a context. Changes in the wrong cluster score nothing, so paste the context command first every time.

## A pod that never starts
level: junior
A deployment shows no pods after an edit.

```text
$ kubectl get deploy web
NAME  READY  UP-TO-DATE  AVAILABLE
web   0/3    0           0
$ kubectl describe deploy web | grep -i selector -A1
Selector: app=web
Pod Template Labels: app=webapp
```
? What is wrong?
+ The selector and the pod template labels do not match
- The image is too large
- The node is out of disk
- The namespace is missing
why: A deployment only manages pods whose labels match its selector. Fix the label so they agree, then check the rollout.

## A snapshot that is empty
level: mid
An etcd backup task finished without an error message.

```text
$ ETCDCTL_API=3 etcdctl snapshot save /opt/backup.db
(waits, then times out)
$ ls -l /opt/backup.db
-rw------- 1 root root 0 /opt/backup.db
```
? Which command should have been used?
+ etcdctl with the endpoint, cacert, cert and key flags taken from the etcd manifest
- kubectl get etcd
- cp -r /var/lib/etcd /opt/backup.db
- systemctl stop etcd
why: etcd requires client certificates. Read the paths from the static pod manifest, run the snapshot with all four flags, then verify it with snapshot status.

## Forbidden on pod logs
level: mid
A user can list pods but not read their logs.

```text
$ kubectl auth can-i list pods -n dev --as jane
yes
$ kubectl logs web-1 -n dev --as jane
Error: pods "web-1" is forbidden: User "jane" cannot get resource "pods/log" in namespace "dev"
```
? What fixes it?
+ Add the pods/log subresource with the get verb to the role
- Make jane a cluster admin
- Restart the API server
- Delete the pod
why: Logs are the pods/log subresource, which the role did not include. The Forbidden message names the exact resource and verb.

## Pending because of a taint
level: mid
A pod will not schedule on any node.

```text
$ kubectl describe pod batch-1 | tail -4
Warning FailedScheduling  0/3 nodes are available:
1 node(s) had untolerated taint {dedicated: gpu}, 2 node(s) didn't match Pod's node selector.
```
? Which statement is correct?
+ The pod needs a matching toleration or a correct selector label for an available node
- The cluster needs more memory
- The image does not exist
- Scheduling is disabled for all clusters
why: FailedScheduling lists the reason per node. Read it before changing resource values, since the fix is usually a label or a toleration.

## DNS broke after a policy
level: mid
After a default deny egress policy, apps cannot resolve names.

```text
$ kubectl exec web-1 -- nslookup api
;; connection timed out; no servers could be reached
$ kubectl get networkpolicy
default-deny   <none>   Egress
```
? What should be added?
+ An egress rule that allows port 53 to the DNS pods in kube-system
- A rule that allows all ingress
- A new CoreDNS deployment per namespace
- Delete the nodes
why: Default deny egress also blocks DNS. Allow UDP and TCP 53 to the cluster DNS pods in the same change.

## A claim waiting for a pod
level: junior
A PersistentVolumeClaim stays Pending.

```text
$ kubectl get pvc data
NAME  STATUS   STORAGECLASS
data  Pending  fast
$ kubectl describe pvc data | tail -2
Normal WaitForFirstConsumer  waiting for first consumer to be created before binding
```
? What should you do?
+ Create the pod that uses the claim, then the volume binds
- Reinstall the storage provisioner
- Delete the storage class
- Change the access mode to ReadWriteMany
why: With WaitForFirstConsumer binding is delayed until a pod is scheduled. Pending can be normal.

## A node that is NotReady
level: mid
A worker node shows NotReady after a reboot.

```text
$ kubectl get nodes
worker-2   NotReady
$ ssh worker-2 systemctl status kubelet | head -3
Active: inactive (dead)
Loaded: loaded (disabled)
```
? What is the fix?
+ Start the kubelet and enable it so it survives reboots
- Drain and delete the whole cluster
- Edit the CoreDNS config
- Increase the pod limits
why: Check the lowest layer first. The kubelet was stopped and disabled, so starting and enabling it restores the node.

## A pod blocked by an AppArmor profile
level: senior
A pod with an AppArmor annotation starts on one node but not another.

```text
worker-1: Running
worker-2: Blocked  Cannot enforce AppArmor: profile "k8s-deny-write" is not loaded
$ ssh worker-2 aa-status | grep k8s-deny-write
(no output)
```
? What is the right fix?
+ Load the profile on every node where the pod can schedule
- Remove the annotation permanently
- Run the pod as privileged
- Disable AppArmor on the first node
why: Profiles are loaded per node. Load it everywhere the pod may land, ideally with configuration management.

## Secrets in a backup
level: senior
A reviewer finds a database password in plain text inside an etcd backup file.

```text
$ strings /backup/etcd.db | grep -i password
password=Sup3rS3cret
$ cat /etc/kubernetes/manifests/kube-apiserver.yaml | grep encryption
(no output)
```
? Which set of actions is right?
+ Enable encryption at rest, rewrite every secret, rotate the exposed password and restrict backup access
- Delete the backup and change nothing else
- Base64 encode the password again
- Make the file read only
why: Without encryption configuration secrets are stored readable. Enable it, rewrite so existing secrets are encrypted, and rotate what was exposed.

## A lookalike image name
level: senior
A pod pulled an unexpected image.

```text
image: nginx-internal:1.25
$ kubectl describe pod web-1 | grep Image:
Image: docker.io/library/nginx-internal@sha256:ab12...
allowed registry: registry.corp.example
```
? What control should enforce the policy?
+ An admission policy that allows only the internal registry prefix and requires digests
- A comment in the manifest
- A longer image tag
- Scanning the image once a year
why: Short names resolve to a public registry by default. Admission policy turns the rule into something enforced and not just documented.
