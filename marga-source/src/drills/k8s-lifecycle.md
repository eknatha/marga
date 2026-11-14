## Certificates expired
level: mid
All kubectl commands fail on a cluster that nobody has upgraded for a year.

```text
$ kubectl get nodes
Unable to connect to the server: x509: certificate has expired or is not yet valid
$ kubeadm certs check-expiration | head -4
apiserver  Jan 12, 2026 09:00 UTC  <invalid>
```
? What is the fix?
+ Run kubeadm certs renew all, restart the control plane static pods and update the kubeconfig
- Reinstall the cluster
- Disable TLS on the API server
- Delete the admin kubeconfig
why: kubeadm leaf certificates last one year. Renew them, restart the static pods so they load the new files and copy the new admin kubeconfig.

## A drain that hangs
level: junior
A node drain does not finish.

```text
$ kubectl drain node-3 --ignore-daemonsets --delete-emptydir-data
error when evicting pods/"api-1" -n prod: Cannot evict pod as it would violate the pod's disruption budget.
```
? Why is it stuck?
+ A PodDisruptionBudget allows no further disruption, so add replicas or fix the budget
- The node is broken
- Drain needs the force flag only
- The pod is a DaemonSet pod
why: Eviction respects PodDisruptionBudgets. A budget with zero allowed disruptions blocks the drain until capacity is added or the budget is corrected.

## Skipping a version
level: junior
An engineer plans to upgrade from 1.29 straight to 1.31.

```text
$ kubeadm upgrade plan
[upgrade/versions] Cluster version: v1.29.4
[upgrade/versions] Target version: v1.31.0
error: unable to upgrade more than one minor version at a time
```
? What is the correct plan?
+ Upgrade to 1.30 first, then to 1.31, one minor version at a time
- Use the force flag to skip
- Upgrade only the kubelets first
- Delete the old API objects
why: Kubernetes supports upgrades by one minor version. Skipping breaks version skew rules and removed APIs surprise you.

## The empty backup
level: mid
A restore drill finds the newest snapshot is old.

```text
$ ls -l /backup/etcd
-rw-r--r-- 1 root root 41M Feb  3 02:00 snap-0203.db
$ date
Tue Oct 14 10:05 UTC 2025
```
? What is the real problem and fix?
+ Snapshots stopped silently, so alert on snapshot age and rehearse restores
- Backups are fine because the file exists
- Delete older backups only
- Run snapshots less often
why: A backup that stopped months ago looks fine until a restore. Alert on missing or old snapshots and test restores on a schedule.

## Join token expired
level: junior
A new worker cannot join the cluster.

```text
$ kubeadm join 10.0.0.10:6443 --token abcdef.0123456789abcdef --discovery-token-ca-cert-hash sha256:ab12
error: token id "abcdef" is invalid or has expired
```
? What should you do?
+ Create a new token with kubeadm token create --print-join-command and use it
- Disable the token check
- Reuse the old command more times
- Copy the certificates by hand
why: Bootstrap tokens expire after 24 hours by default. Create a fresh join command when you need one.
