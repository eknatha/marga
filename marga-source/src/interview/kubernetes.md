## Describe the Kubernetes architecture.
level: junior
The control plane runs the API server (the only entry point), etcd (the datastore), the scheduler (places Pods on nodes) and controller managers (reconcile desired and actual state). Each worker node runs the kubelet (starts and monitors Pods), a container runtime and kube-proxy or an equivalent for Service networking. Everything talks to the API server, and etcd holds the cluster state.

## What is the difference between a Pod, a ReplicaSet and a Deployment?
level: junior
A Pod is the smallest unit: one or more containers sharing network and storage. A ReplicaSet keeps a set number of identical Pods running. A Deployment manages ReplicaSets to provide rolling updates and rollbacks. You normally create Deployments, not bare Pods or ReplicaSets.

## A Pod is in CrashLoopBackOff. How do you debug it?
level: mid
Run `kubectl describe pod` for events and the last state and exit code, and `kubectl logs --previous` for the crashed container's output. Common causes are application errors, missing configuration or secrets, failing probes, wrong commands, and OOM kills (exit code 137). Reproduce with `kubectl run` or by overriding the command, fix the cause, and check readiness and liveness probe settings.

## What is the difference between liveness, readiness and startup probes?
level: mid
Liveness tells the kubelet when to restart a stuck container. Readiness controls whether the Pod receives Service traffic. Startup delays the other probes for slow-starting applications. Using liveness probes that depend on external services is a classic mistake, since a dependency outage then restarts healthy Pods.

## What happens when a Service has no endpoints?
level: mid
Traffic to it fails. The usual causes are a selector that does not match the Pod labels, Pods that are not Ready, or Pods in a different namespace. Check `kubectl get endpointslices -l kubernetes.io/service-name=NAME`, compare `kubectl get pods --show-labels` with the selector, and confirm readiness probes pass.

## Explain requests and limits and what happens when they are exceeded.
level: mid
Requests are what the scheduler reserves; limits are the runtime maximum. Exceeding a CPU limit throttles the container, while exceeding a memory limit gets it OOM-killed. QoS classes (Guaranteed, Burstable, BestEffort) derive from these and set eviction order under node pressure. The scheduler uses requests, not live usage, so over-requesting can leave a cluster full on paper and idle in reality.

## How does RBAC work in Kubernetes?
level: mid
Roles (namespaced) and ClusterRoles define allowed verbs on resources. RoleBindings and ClusterRoleBindings attach them to users, groups or service accounts. Permissions are additive; there are no deny rules. Follow least privilege, give each workload its own service account, and test with `kubectl auth can-i --as=...`.

## How do you perform a zero-downtime deployment?
level: mid
Use a Deployment with a rolling update, readiness probes so only ready Pods get traffic, `maxUnavailable: 0` with a surge, a PodDisruptionBudget, a preStop hook or graceful shutdown handling, and enough replicas across zones. Test rollback with `kubectl rollout undo`. For higher risk use canary or blue-green with a controller such as Argo Rollouts.

## How would you upgrade a production cluster?
level: senior
Read release notes and check deprecated APIs, back up etcd, and upgrade one minor version at a time. Upgrade the control plane first, then nodes one at a time using cordon and drain, respecting PodDisruptionBudgets. Test in staging, keep an eye on workloads during the process, and have a rollback plan. On managed services, upgrade the control plane then the node groups, ideally with surge nodes.

## What is an operator and when would you use one?
level: senior
An operator is a custom controller with CustomResourceDefinitions that encodes operational knowledge for an application, such as provisioning, backup, failover and upgrade. You use one for stateful or complex software like databases or certificate management. Check the maturity of the operator, how upgrades and backups work, and what RBAC it needs, and remember that deleting a CRD deletes its objects.
