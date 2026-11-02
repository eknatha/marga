---
title: Installing charts and overriding values
minutes: 12
summary: Find charts, read their default values, override them safely with files and --set, and preview what will be installed.
---

Most of your first week with Helm is spent answering one question: how do I change this setting? Every chart exposes its options as values. Knowing how to read them, override them and preview the result before it touches the cluster is the core skill, and it also protects you from the most common mistake: installing with defaults that are not meant for production.

## What you will learn

- Search repositories and read a chart before installing
- Inspect default values with helm show values
- Override values with -f files and --set, and know the precedence
- Preview with helm template and --dry-run

## Look before you install

```bash
helm repo add acme https://charts.example.com
helm repo update
helm search repo acme --versions | head
helm show chart acme/web --version 2.4.1
helm show readme acme/web --version 2.4.1
helm show values acme/web --version 2.4.1 > defaults.yaml
```

Always pin `--version`, so a repository update does not change what you install. Read the readme and the defaults: look for the image tag, replica count, resource requests, service type, ingress settings and any "persistence" or "auth" section. A chart that enables a persistent volume or a public LoadBalancer by default may not be what you want.

## Override with a values file

Write only the keys you change, in a file under version control:

```yaml
# values-prod.yaml
replicaCount: 4
image:
  repository: registry.example.com/shop/web
  tag: "1.8.2"
ingress:
  enabled: true
  host: shop.example.com
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    memory: 512Mi
```

```bash
helm install shop-web acme/web --version 2.4.1 -n shop -f values-prod.yaml
```

Maps are merged key by key, but **lists are replaced whole**, so overriding one item of a list means supplying the entire list. Quote version-like strings (`"1.8.2"`, `"true"`) so YAML does not turn them into numbers or booleans.

## --set and precedence

For a one-off change use `--set`:

```bash
helm upgrade shop-web acme/web -n shop -f values-prod.yaml --set image.tag=1.8.3
helm upgrade shop-web acme/web -n shop --set-string podAnnotations.build=2026
helm upgrade shop-web acme/web -n shop --set "ingress.hosts[0]=shop.example.com"
```

From lowest to highest priority: the chart's `values.yaml`, parent chart values, files given with `-f` (later files win), then `--set`. Pipelines usually use files for everything stable and `--set image.tag=...` for the one value that changes on every release. Avoid long `--set` lists; they are hard to review and reproduce.

## Preview and verify

```bash
helm template shop-web acme/web --version 2.4.1 -f values-prod.yaml > rendered.yaml
helm install shop-web acme/web -n shop -f values-prod.yaml --dry-run --debug
helm get values shop-web -n shop -a        # all values in use
helm get manifest shop-web -n shop         # the YAML that was applied
```

`helm template` renders locally without a cluster, so you can lint it, run it through policy checks and review the diff in a pull request. After installing, `helm get values -a` and `helm get manifest` show what is really deployed. Review the rendered output for the things that matter: image tags, resource limits, security context and exposed services.

```predict
Q: You set `ingress.hosts[0]=a.example.com` with --set, but the chart default list had two hosts. What happens to the second?
???
Lists are replaced, not merged, so you must give the whole list you want; the second default host is not kept.
> Values merge by map key, but lists replace.
```

## Incident: The upgrade that reset the settings

> **Incident:** After a routine image bump, the production site lost its custom hostname and resource limits.

```console
$ helm upgrade shop-web acme/web -n shop --set image.tag=1.8.3
Release "shop-web" has been upgraded. Happy Helming!
$ helm get values shop-web -n shop
USER-SUPPLIED VALUES:
image:
  tag: 1.8.3
```

The engineer ran an upgrade with only --set and no values file, so Helm used the chart defaults for everything else: the earlier overrides were not carried over (--reuse-values would have kept them, with its own risks). The fix was a rule that every upgrade passes the same -f files plus the one changed value, stored in the repository, and a pipeline step that runs helm diff before applying.

## Common mistakes

- Installing with unread defaults
- Not pinning chart versions
- Upgrading with only --set and losing earlier overrides
- Using floating tags such as latest in values

```quiz
Q: Which has the highest priority?
+ --set on the command line
- The chart values.yaml :: Lowest priority.
- A parent chart value :: Lower than files.
- A comment in a file :: Comments do nothing.
> Defaults, then files, then --set.

Q: What happens to a list value you override?
+ The whole list is replaced
- It is merged item by item :: Lists replace.
- It is ignored :: It is applied.
- It is sorted :: Not done.
> Provide the full list; the lesson section explains why.

Q: How do you render templates without a cluster?
+ helm template
- helm status :: Needs a release.
- helm list :: Lists releases.
- helm rollback :: Rolls back a release.
> Good for reviews and policy checks.

Q: How do you see the values really in use?
+ helm get values RELEASE -a
- helm search repo :: Searches repositories.
- helm repo update :: Updates the index.
- helm lint :: Checks a chart.
> Verify after changes; the lesson section explains why.
```

```cards
Read defaults :: helm show values CHART --version V
Override :: -f values-prod.yaml
One change :: --set image.tag=1.8.3
Preview :: helm template / --dry-run --debug
See in use :: helm get values -a
Lists are :: replaced, not merged
```
