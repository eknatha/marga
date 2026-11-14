## How do you threat model a Kubernetes cluster?
level: junior
I follow the path of an attacker: a vulnerable app, then the container, the service account token, the API, the node and the cloud account. At each step I place a control such as image scanning, non-root, no token, least privilege RBAC, network policy and detection.

## How should workloads authenticate to the API?
level: mid
Each workload gets its own service account with projected, short lived, audience bound tokens, mounted only when needed. Humans use OIDC with short lived tokens and groups, not shared kubeconfigs.

## How do you review RBAC for escalation risk?
level: mid
I look for wildcards, secrets access, pods create and exec, and the escalate, bind and impersonate verbs. I use kubectl auth can-i with --list for key identities, and review bindings to groups not individuals.

## How do you roll out Pod Security standards?
level: mid
Label namespaces with warn and audit first, fix workloads from the warnings, then switch to enforce at baseline or restricted. Add admission policy for rules the standards do not cover.

## Are Kubernetes Secrets secure?
level: mid
Not by default: they are base64 in etcd. I enable encryption at rest, ideally with KMS, restrict who can read secrets or create pods, avoid environment variables where possible and use an external store with rotation for sensitive credentials.

## What do you do first when a pod is compromised?
level: senior
Contain it with a quarantine label and network policy and cordon the node, preserve evidence, rotate credentials it could reach, review audit logs, then rebuild from known good images and add detection. Deleting the pod alone loses evidence and leaves the cause.
