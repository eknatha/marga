---
title: Network policies and pod security
minutes: 13
summary: Restrict pod-to-pod traffic with network policies and restrict what containers may do with Pod Security Standards.
---

By default every pod can talk to every other pod, and a container can ask for powers it should not have. Two features close those gaps: NetworkPolicies limit traffic, and Pod Security Admission limits what pods can request. Together they contain damage when something is compromised.

## What you will learn

- Write a default-deny NetworkPolicy and add allowances
- Know that a policy needs a network plugin that enforces it
- Apply Pod Security Standards by namespace
- Harden containers with a security context

## Default deny, then allow

A NetworkPolicy selects pods and lists allowed ingress and egress. Once any policy selects a pod for a direction, only listed traffic is allowed in that direction.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: shop
spec:
  podSelector: {}
  policyTypes: ["Ingress", "Egress"]
```

Then add narrow policies, for instance letting the web pods reach the API pods on one port, and allowing DNS egress. Remember DNS or everything breaks.

## Enforcement

Policies are enforced by the network plugin (such as Calico or Cilium). If your plugin does not support them, the objects are accepted but do nothing. Test with a pod that should be blocked and confirm it is.

## Pod Security Standards

Three profiles: **privileged** (no limits), **baseline** (blocks known escalations such as privileged containers and host namespaces) and **restricted** (current hardening practice: non-root, no privilege escalation, dropped capabilities, seccomp). Pod Security Admission applies them per namespace with labels in modes enforce, audit and warn.

```bash
kubectl label namespace shop pod-security.kubernetes.io/enforce=baseline pod-security.kubernetes.io/warn=restricted
```

## Security context

Set it on pods and containers: `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, `capabilities: { drop: ["ALL"] }` and a seccomp profile. Avoid `hostNetwork`, `hostPID`, `hostPath` and privileged mode. Add policy engines such as Kyverno or OPA Gatekeeper for rules beyond the built-in profiles.

```predict
Q: You apply a default-deny egress policy and every pod stops resolving names. What did you forget?
???
An allowance for DNS egress to the cluster DNS pods.
> Allow DNS.
```

## Incident: Lateral movement

> **Incident:** A compromised front-end pod scanned the cluster and reached the database pods directly.

```console
$ kubectl exec web-5d -- nc -zv db.shop.svc 5432
db.shop.svc (10.96.14.7:5432) open
$ kubectl get networkpolicy -n shop
No resources found in shop namespace.
```

There were no policies, so every pod could reach the database. The team added default deny, allowed only the API pods to reach the database on its port, enabled the restricted profile for new namespaces, and tested that web pods are now blocked.

## Common mistakes

- Assuming policies work without a supporting plugin
- Forgetting DNS in egress rules
- Running containers as root
- Privileged pods for convenience

```quiz
Q: What is the effect of a pod being selected by an ingress policy?
+ Only listed ingress is allowed to it
- Everything is allowed :: No.
- Nothing is enforced :: No.
- Egress is blocked :: Not by itself.
> Allow list. Re-read the matching lesson section for the full reasoning.

Q: What enforces NetworkPolicies?
+ The network plugin
- kubectl :: No.
- The scheduler :: No.
- The kubelet only :: No.
> Check support. Re-read the matching lesson section for the full reasoning.

Q: Which profile is strictest?
+ Restricted
- Privileged :: Least strict.
- Baseline :: Middle.
- Open :: Not a profile.
> Hardened. Re-read the matching lesson section for the full reasoning.

Q: Which setting prevents gaining more privileges?
+ allowPrivilegeEscalation: false
- hostNetwork: true :: Opens up.
- privileged: true :: Opens up.
- runAsRoot :: Not a setting.
> Harden. Re-read the matching lesson section for the full reasoning.
```

```cards
Default deny :: start closed
Allow DNS :: do not forget
Plugin :: must enforce policies
PSS :: privileged, baseline, restricted
Security context :: non-root, drop capabilities
Test :: confirm blocked traffic is blocked
```
