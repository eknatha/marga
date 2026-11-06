---
title: Helm security and supply chain
minutes: 12
summary: Review third-party charts, scan rendered manifests, avoid risky hooks and values and enforce policy so Helm cannot deploy unsafe workloads.
---

Helm makes it easy to install complex software with one command. That convenience hides how much power a chart has, from RBAC to hooks to default privileges. A few habits keep that power under control.

## What you will learn

- Reviewing third-party charts before use
- Scanning rendered manifests and images
- Controlling what Helm may create
- Secrets and values hygiene

## Review before you install

```bash
helm pull oci://registry.example.com/vendor/redis --version 19.2.1 --untar
helm template cache ./redis -f my-values.yaml > rendered.yaml
grep -nE "privileged|hostNetwork|hostPath|ClusterRole|ClusterRoleBinding" rendered.yaml
```

Read the rendered output, not only the values. Look for privileged containers, host access, cluster-wide RBAC, hooks that run jobs and images from unknown registries. Pin both the chart version and image tags or digests.

## Scan

```bash
trivy config rendered.yaml
trivy image --severity HIGH,CRITICAL registry.example.com/vendor/redis:7.2.4
kubeconform -strict rendered.yaml
```

Scan manifests for misconfiguration and images for vulnerabilities in CI, and fail on agreed severities.

## Limit the blast radius

Run Helm with credentials limited to the target namespace. Disallow cluster-scoped objects for most teams, and let a platform team install those. Enforce **Pod Security Standards** and policies such as Kyverno or OPA Gatekeeper at admission, so a chart cannot create a privileged pod even if you forget to check.

## Secrets

Do not put secrets in values files committed to Git. Use an external secret operator or encrypted values. Remember that Helm stores release data, including values, in cluster Secrets, so restrict who can read them.

```bash
kubectl get secrets -n shop -l owner=helm
helm get values shop -n shop
```

## Incident: The chart that wanted root

> **Incident:** An untrusted chart defaulted to privileged containers.

```console
securityContext: privileged: true
hostPath: /var/run/docker.sock
ClusterRoleBinding to cluster-admin
```

The team had installed the chart with defaults to try it quickly. A scan of the rendered output showed three dangerous settings. They overrode them in values, restricted the install credentials and added admission policies that block privileged pods.

## Common mistakes

- Installing charts with default values unseen
- Unpinned chart and image versions
- Secrets in committed values files
- Using cluster-admin for Helm installs

```quiz
Q: What should you read before installing a chart?
+ The rendered manifests
- Only the README :: No.
- The logo :: No.
- The tags :: No.
> Rendering shows what is created.

Q: What stops privileged pods even if a chart asks for them?
+ Admission policy
- A comment :: No.
- A label :: No.
- Nothing :: No.
> Enforce at the cluster.

Q: Where does Helm store release data?
+ Secrets in the cluster
- Only local files :: No.
- Git :: No.
- DNS :: No.
> Restrict access. The lesson section above explains why.

Q: How limit Helm credentials?
+ To the target namespace
- To cluster-admin :: No.
- To all clusters :: No.
- To none :: No.
> Least privilege. The lesson section above explains why.
```

```cards
Rendered manifest :: YAML produced from a chart and values
Pod Security Standards :: Kubernetes baseline for pod settings
Admission policy :: Rule enforced when objects are created
Pinning :: Using fixed versions or digests
```
