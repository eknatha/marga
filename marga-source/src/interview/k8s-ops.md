## What are the main control plane components?
level: junior
The API server is the gateway that authenticates, authorises and stores objects. etcd holds all cluster state. The scheduler places pods on nodes, and the controller manager runs reconciliation loops. Each node runs a kubelet and a network proxy. Running pods continue if the control plane is briefly down.

## What does cordon and drain do?
level: junior
Cordon marks a node unschedulable without touching running pods. Drain evicts pods so they are recreated elsewhere, respecting disruption budgets, and uncordon makes the node schedulable again. I check spare capacity and budgets first so maintenance does not leave pods Pending.

## What does a PodDisruptionBudget do?
level: junior
It limits how many replicas of an application may be unavailable during voluntary disruptions such as node drains. A drain waits instead of violating it. A budget that allows zero disruptions blocks maintenance, so I review budgets alongside replica counts.

## How do you back up and restore a cluster?
level: mid
I take verified etcd snapshots on a schedule, encrypt them and copy them off the node, and also back up persistent volumes and the PKI directory. A restore stops the API servers, restores every member from the same snapshot, then checks health. I rehearse restores because untested backups are only a hope.

## How do you upgrade Kubernetes safely?
level: mid
One minor version at a time, control plane first, then nodes by cordon, drain, upgrade and uncordon. Before starting I read release notes, scan for removed APIs, check plugin compatibility, take an etcd snapshot, rehearse in staging and use disruption budgets. The real rollback plan is a tested snapshot restore.

## How do you design RBAC for a shared cluster?
level: mid
Narrow Roles per namespace bound to groups from the identity provider, own service accounts per application with minimal verbs, no routine cluster-admin, and regular review of bindings. I use kubectl auth can-i to test and avoid wildcards and powerful verbs such as impersonate or escalate.

## A node is NotReady. How do you investigate?
level: senior
I read node conditions and events, then check the kubelet service and journal, the container runtime, disk space and inodes, memory pressure, certificates and the network plugin. I change one thing at a time, record the timeline and add an alert so the cause is detected earlier next time.

## How do you limit blast radius in a multi-tenant cluster?
level: senior
Namespaces with quotas and limit ranges, default-deny network policies, Pod Security Standards, separate service accounts, admission policies for rules beyond the built-ins, node pools with taints for sensitive workloads, and audit logging. For strong isolation I would separate clusters.
