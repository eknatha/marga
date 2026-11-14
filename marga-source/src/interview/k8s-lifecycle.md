## Why do production clusters use three control plane nodes?
level: junior
Three nodes keep etcd quorum after one failure and let the API server keep serving while one node is updated. They should sit in separate failure domains, with a load balancer in front for a stable endpoint.

## What is the difference between stacked and external etcd?
level: mid
Stacked etcd runs on the control plane nodes, which is simpler to set up and operate. External etcd runs on its own nodes, which isolates failure domains and resources at the cost of more machines and more to manage.

## How do you upgrade a cluster safely?
level: mid
Read the release notes, scan for removed APIs, take an etcd snapshot and check add-on compatibility. Upgrade one minor version at a time, control plane first and then workers one by one: drain, upgrade, restart kubelet, uncordon. Verify after each node.

## How do you handle certificate expiry?
level: mid
Check with kubeadm certs check-expiration and alert at thirty days. Renew with kubeadm certs renew all, restart the control plane static pods and update kubeconfigs. Regular minor upgrades also renew the certificates.

## How do you know your etcd backups work?
level: senior
I alert on snapshot age and size, copy them off the node, and rehearse a restore into a scratch cluster on a schedule. The restore time is compared with the recovery time objective.

## What does Cluster API give you?
level: senior
It manages clusters through Kubernetes objects from a management cluster. Upgrades and scaling become version or replica edits and controllers roll machines, which reduces drift between clusters but needs careful rollout limits.
