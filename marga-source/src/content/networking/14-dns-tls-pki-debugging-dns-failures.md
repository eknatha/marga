---
title: DNS, TLS and PKI: debugging DNS failures
minutes: 12
summary: Tell NXDOMAIN, SERVFAIL and timeouts apart, test each resolver in the path, and find search-domain and Kubernetes ndots problems that multiply lookups.
---

When "the app cannot connect", the name lookup is the first thing to prove or rule out. A few dig commands tell you whether the name exists, which server is wrong, and whether the client is the cause.

## What you will learn

- Read the status in a DNS answer
- Test the stub, the recursive resolver and the authoritative server in turn
- Spot search domains, `ndots` and split-horizon effects
- Debug name resolution inside a Kubernetes pod

## Read the status

```console
$ dig www.example.com | grep -E 'status|ANSWER'
$ dig www.example.com AAAA +short
$ dig @1.1.1.1 www.example.com +short
$ resolvectl query www.example.com
```

- `NOERROR` with an answer: the name resolved
- `NOERROR` with no answer (NODATA): the name exists but not this record type
- `NXDOMAIN`: the name does not exist (typo, missing record, wrong zone)
- `SERVFAIL`: the resolver could not get a valid answer, often a broken delegation, an unreachable authoritative server or a DNSSEC failure
- No reply (timeout): a network, firewall or dead-server problem

## Test each hop

1. The host's own view: `getent hosts name` uses the same libraries as applications, including `/etc/hosts` and search domains.
2. The configured resolver: `dig @ip name`.
3. A different public resolver: if it works there, your resolver is the issue.
4. The authoritative server: `dig @ns name`.

A `dig` that works while the application fails often means the application uses a different resolver path (a container, a VPN, a proxy or a cached negative result).

## Search domains and ndots

`/etc/resolv.conf` can hold a `search` list and `options ndots:N`. A name with fewer than N dots is tried with each search suffix first. In Kubernetes pods `ndots` is 5 by default, so a lookup for `api.example.com` (two dots) first tries `api.example.com.default.svc.cluster.local`, then `.svc.cluster.local`, and so on before the real name, causing several extra queries and delays when they time out. A trailing dot (`api.example.com.`) marks a fully qualified name and skips the search list; lowering `ndots` for the workload is another fix.

```console
$ kubectl exec -it deploy/web -- cat /etc/resolv.conf
$ kubectl exec -it deploy/web -- getent hosts payments.prod.svc
$ kubectl -n kube-system logs deploy/coredns --tail=20
```

## Split-horizon and private zones

Internal and external users may get different answers for the same name. A cloud private zone, a company resolver or a VPN can return private addresses that a public resolver would never return. When debugging, always test from the same network position as the failing client.

```predict
Q: dig @8.8.8.8 returns the right IP, but the application on your server cannot resolve the name. What differs?
???
The server uses another resolver or search path (resolv.conf, VPC resolver, split-horizon zone). Test with getent hosts and dig against the configured resolver.
> Test from where the client really is.
```

## Incident: Slow everything after a DNS change

> **Incident:** After a platform upgrade, API calls from pods got slow, and the DNS servers showed ten times more queries than before.

```console
$ kubectl exec -it deploy/api -- sh -c 'time getent hosts payments.vendor.example.com'
real    0m5.012s
$ kubectl exec -it deploy/api -- cat /etc/resolv.conf
search prod.svc.cluster.local svc.cluster.local cluster.local corp.example.com
options ndots:5
```

An extra search domain from the company network had been added, and with `ndots:5` every external name was tried with four suffixes first. One suffix hit a slow forwarder that answered after five seconds. The team set `ndots:2` for the workloads that call outside, used fully qualified names in configs and deployed a node-local DNS cache. Query volume fell by 80 percent.

## Common mistakes

- Testing only with a public resolver
- Treating SERVFAIL as "name does not exist"
- Ignoring the search list and ndots in containers
- Forgetting that private zones differ from public DNS

```quiz
Q: What does NXDOMAIN mean?
+ The name does not exist
- The server is overloaded :: That would be a timeout or SERVFAIL.
- The record is empty but the name exists :: That is NODATA.
- DNSSEC is disabled :: Unrelated.
> The resolver says the name is absent.

Q: Which command shows what applications on the host see, including /etc/hosts?
+ getent hosts name
- dig name :: dig bypasses the system libraries.
- ping -f :: Not a lookup test.
- traceroute :: Tests paths, not names.
> Use the same library path as the app.

Q: Why does ndots:5 cause extra lookups in Kubernetes?
+ Names with fewer than five dots are tried with each search suffix first
- It disables caching :: Not the effect.
- It limits TTLs :: Unrelated.
- It blocks IPv6 :: Unrelated.
> Use fully qualified names or lower ndots.

Q: dig works from your laptop, but a pod fails to resolve an internal name. What is a likely cause?
+ A private zone or split-horizon answer only visible from the cluster network
- A bad laptop keyboard :: Unrelated.
- A full disk :: Unrelated.
- An old kernel :: Unlikely.
> Test from the client's network position.
```

```cards
NXDOMAIN :: the name does not exist
SERVFAIL :: resolver could not get a valid answer
getent hosts :: lookup through the system's own resolver path
ndots :: dots needed before the search list is skipped
Trailing dot :: marks a fully qualified name
```
