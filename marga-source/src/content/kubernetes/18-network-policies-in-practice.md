---
title: Network policies in practice
minutes: 13
summary: Restrict which pods can talk to which, starting from default deny, and test the rules.
---

By default every pod in a Kubernetes cluster can talk to every other pod. A compromised pod in one namespace can reach the database in another. Network policies are the firewall rules of the cluster. They are simple, but they are easy to get wrong in ways that either break the application or protect nothing.

## What you will learn

- The default is open, and what a NetworkPolicy changes
- Default deny for ingress and egress
- Allow rules with pod selectors, namespace selectors and ports
- Test policies, and remember DNS

## What a policy does

A NetworkPolicy selects pods with labels and says which traffic is allowed to or from them. Two facts matter first. Policies are **additive allow rules**: once any policy selects a pod for a direction, only traffic that some policy allows is permitted in that direction. And policies are enforced by the **network plugin**; if your plugin does not support them, the objects exist and do nothing. Calico, Cilium and several cloud plugins support them.

## Start with default deny

Begin each namespace with a policy that denies all ingress to all pods, then add what is needed.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: shop
spec:
  podSelector: {}
  policyTypes: ["Ingress"]
```

The empty `podSelector` selects every pod in the namespace. With no ingress rules listed, nothing is allowed in. Do the same for egress later, once you know what each workload needs to reach.

## Allow what is needed

Add policies that name the exact paths. This one lets only the `api` pods connect to the `db` pods on the database port:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-from-api
  namespace: shop
spec:
  podSelector:
    matchLabels: { app: db }
  policyTypes: ["Ingress"]
  ingress:
    - from:
        - podSelector:
            matchLabels: { app: api }
      ports:
        - { protocol: TCP, port: 5432 }
```

To allow traffic from another namespace, use a `namespaceSelector` (namespaces need labels, for example `kubernetes.io/metadata.name`). Be careful: putting `podSelector` and `namespaceSelector` in the same list item means *both must match*, while two separate items mean *either*.

## Egress, DNS and testing

If you restrict egress, remember DNS. Pods must reach the cluster DNS service on port 53 (UDP and TCP), or every name lookup fails and the application looks broken for no visible reason.

```console
$ kubectl -n shop run probe --rm -it --image=busybox:1.36 --restart=Never -- \
    wget -qO- -T 3 http://db:5432
$ kubectl -n shop get networkpolicy
$ kubectl -n shop describe networkpolicy db-from-api
```

Test both directions: the path that must work, and a path that must be blocked. Keep policies in version control next to the application manifests, and review them in the same pull request as the workload change.

```predict
Q: You add a default deny egress policy and your pods stop resolving names. What did you forget?
???
An egress rule that allows DNS (port 53 to the cluster DNS pods).
> Egress deny blocks DNS queries too.
```

## Incident: Lateral movement in one hop

> **Incident:** A vulnerable image in the `marketing` namespace was exploited, and the attacker connected straight to the payments database.

```console
$ kubectl get networkpolicy -A
No resources found
$ kubectl -n marketing exec web-6d9 -- nc -zv payments-db.payments 5432
payments-db.payments (10.96.14.8:5432) open
```

The cluster had no network policies, so any pod could reach any other. The incident review led to default deny policies in every namespace, explicit allow rules for the payments database from the payments namespace only, and an admission policy that rejects a new namespace until it has a default deny. A weekly test job tries a blocked connection from a canary pod and alerts if it succeeds.

## Common mistakes

- Assuming policies work without a plugin that enforces them
- Forgetting DNS when restricting egress
- Mixing up selector lists, so a rule is far wider than intended
- Writing policies once and never testing the blocked paths

```quiz
Q: What is the default behaviour without any NetworkPolicy?
+ All pods can talk to all other pods
- All traffic is denied :: That is the result after a default deny.
- Only pods in the same namespace can talk :: Namespaces are not network boundaries by default.
- Only pods with services can talk :: Services do not restrict it.
> Kubernetes networking is open by default.

Q: Which object enforces NetworkPolicy rules?
+ The network plugin (CNI), such as Calico or Cilium
- The scheduler :: It places pods.
- etcd :: It stores objects.
- kubectl :: It is a client.
> Without an enforcing plugin, policies do nothing.

Q: What does an empty podSelector select?
+ Every pod in the namespace
- No pods :: It is the opposite.
- Only pods with no labels :: It selects all of them.
- Pods in all namespaces :: A policy is namespaced.
> Use it for default deny.

Q: Why test a blocked path?
+ A rule that blocks nothing looks the same as one that works until you try
- Blocked paths are faster :: Speed does not matter.
- To fill the logs :: Not the purpose.
- Kubernetes needs it :: It is not required.
> Verify intent in both directions.
```

```cards
Select all pods :: podSelector: {}
Default deny :: policyTypes with no rules
Namespace label for selectors :: kubernetes.io/metadata.name
Remember when restricting egress :: DNS on port 53
Needed to enforce policies :: a CNI plugin that supports them
```
