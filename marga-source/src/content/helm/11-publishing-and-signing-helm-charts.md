---
title: Publishing and signing Helm charts
minutes: 12
summary: Publish charts to an OCI registry, sign and verify them and control who may release or consume charts.
---

A chart is deployed into production, so the registry that serves it is part of your supply chain. A few steps make releases reproducible and verifiable.

## What you will learn

- Packaging and pushing to an OCI registry
- Signing charts and verifying signatures
- Immutable versions and promotion
- Access control for publishing

## Package and push

```bash
helm package ./web --version 2.5.0 --app-version 1.9.0
echo "$REGISTRY_TOKEN" | helm registry login registry.example.com -u ci --password-stdin
helm push web-2.5.0.tgz oci://registry.example.com/charts
helm show chart oci://registry.example.com/charts/web --version 2.5.0
```

Charts are stored as OCI artifacts next to container images. The version in `Chart.yaml` identifies a release, and it must change for every release.

## Sign and verify

```bash
cosign sign --yes registry.example.com/charts/web:2.5.0
cosign verify registry.example.com/charts/web:2.5.0 \
  --certificate-identity-regexp 'https://ci.example.com/.*' \
  --certificate-oidc-issuer https://ci.example.com
```

Signing with an identity from CI ties the chart to a specific pipeline. Helm also supports provenance files with `helm package --sign`. Verification is useful only if consumers actually check it, so verify in the deployment pipeline before install.

## Immutable versions and promotion

Configure the registry so tags cannot be overwritten. Publish to a development repository, test, then **promote** the same artifact to a production repository, instead of rebuilding. Record the digest in release notes.

## Access

Allow only the CI identity to push to the release repository. Give consumers read-only access, scan charts for misconfiguration and keep an inventory of which charts and versions are used where.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Publishing and signing Helm charts fits together
node: n1 | Package and push | 0 | 0 | Charts are stored as OCI artifacts next to container images. | Mutable chart versions. | process
node: n2 | Sign and verify | 1 | 1 | Signing with an identity from CI ties the chart to a specific pipeline. | Pushing from laptops. | observe
node: n3 | Immutable versions and promotion | 2 | 0 | Configure the registry so tags cannot be overwritten. | Rebuilding for production instead of promoting. | process
node: n4 | Access | 3 | 1 | Allow only the CI identity to push to the release repository. | Check the Common mistakes list below this diagram for what usually goes wrong here. | security
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The overwritten version

> **Incident:** A chart version was replaced with different content.

```console
helm pull web --version 2.4.1
digest sha256:aa10...   (earlier: sha256:73fe...)
production templates changed with no new release
```

Mutable tags let someone push a fix over an existing version. Deployments that were reinstalled picked up the changed content. The team turned on immutable tags, required signed releases from CI and verified signatures before every production install.

## Common mistakes

- Mutable chart versions
- Pushing from laptops
- Signing but never verifying
- Rebuilding for production instead of promoting

```quiz
Q: Where are charts stored in modern Helm?
+ OCI registries
- Only HTTP repos :: No.
- Databases :: No.
- Pods :: No.
> OCI artifacts are supported.

Q: Why make tags immutable?
+ Content stays identical for a version
- To save space :: No.
- To rename charts :: No.
- To skip signing :: No.
> Reproducibility. The lesson section above explains why.

Q: Who should push release charts?
+ The CI pipeline identity
- Everyone :: No.
- Anonymous users :: No.
- Laptops :: No.
> Restrict writes. The lesson section above explains why.

Q: What does verification need?
+ A check before install
- Nothing :: No.
- A bigger chart :: No.
- A new tag :: No.
> Signatures matter only if checked.
```

```cards
OCI registry :: Storage for container images and charts
helm push :: Uploads a packaged chart
cosign :: Tool to sign and verify artifacts
Promotion :: Moving the same artifact to a later environment
```
