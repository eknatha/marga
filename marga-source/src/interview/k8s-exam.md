## How do you spend the first minutes of a CKA task?
level: junior
I set the context named in the task, check the namespace, then work out the smallest change that meets the requirement. I use imperative commands or dry-run YAML, verify the end state with get and describe, and move on when a task is over its time budget, returning to it later.

## How do you back up and restore etcd on a kubeadm cluster?
level: mid
Read the endpoint and certificate paths from the etcd static pod manifest, run etcdctl snapshot save with the endpoints, cacert, cert and key flags, and verify it with snapshot status. To restore, run snapshot restore into a new data directory, then edit the manifest volume to point at it and wait for the kubelet to recreate the pod.

## How do you upgrade a kubeadm cluster?
level: mid
Upgrade one minor version at a time. On the control plane: upgrade kubeadm, run plan and apply, then drain, upgrade kubelet and kubectl, restart and uncordon. For each worker: drain, upgrade kubeadm and run upgrade node, upgrade the kubelet, restart and uncordon. Check nodes and system pods after each step.

## A pod is Pending. How do you find out why?
level: junior
Describe the pod and read the events. FailedScheduling lists the reason per node, such as untolerated taints, selector mismatch, insufficient resources or an unbound volume claim. For a claim, check its events and storage class binding mode before changing anything.

## Name the main controls you would apply to harden a cluster for CKS.
level: senior
Run kube-bench and fix findings, disable anonymous API and kubelet access, use RBAC and Node authorization, apply default deny network policies, enforce Pod Security standards, drop capabilities and block privilege escalation, use AppArmor and seccomp, encrypt secrets at rest, scan and pin images, restrict registries and enable audit logging and runtime detection.

## How would you investigate a suspicious container using Falco and audit logs?
level: senior
Use Falco alerts to find the container and the rule that fired, read the audit log for API calls from the pod's service account, inspect the container read only and keep evidence before deleting. Then remove the cause, rotate any exposed credentials, tighten the profile or policy and add a detection rule so it is caught earlier.
