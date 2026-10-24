---
title: Registries, tags and image supply-chain security
minutes: 15
summary: Push and pull images from registries, tag and pin them correctly, scan for vulnerabilities, generate an SBOM and sign images before they reach production.
---

An image is software you did not write, built from a base you did not audit, running with the privileges you give it. Registries store and distribute images, and a handful of habits keep what you pull and push trustworthy.

## What you will learn

- How registries, repositories, tags and digests relate
- Tagging and pushing images, and why `latest` is a trap
- Scanning images and producing a software bill of materials (SBOM)
- Signing images and enforcing trust

## Names, tags and digests

A full image reference looks like `registry.example.com/team/shop-api:1.8.2`. The registry is the server, `team/shop-api` is the repository, and `1.8.2` is a **tag**, a movable label. A tag can be repointed to different content at any time. A **digest** (`@sha256:...`) is a hash of the image content and never changes.

```console
$ docker build -t registry.example.com/team/shop-api:1.8.2 .
$ docker login registry.example.com
$ docker push registry.example.com/team/shop-api:1.8.2
$ docker pull registry.example.com/team/shop-api:1.8.2
$ docker inspect --format '{{index .RepoDigests 0}}' registry.example.com/team/shop-api:1.8.2
$ docker images --digests | head -3
```

Deploy by digest when you need to be certain: `image: registry.example.com/team/shop-api@sha256:3b1c...`. Tag with the **version** and the **build identifier**, such as `1.8.2` and `1.8.2-b457`, and never deploy `latest`. It means "whatever was pushed last", so two nodes can run different code under the same name.

## Choosing and pinning base images

Prefer small, maintained bases: distroless, Alpine or a slim variant of an official image. Pin the version, and for stronger reproducibility the digest.

```dockerfile
FROM python:3.12-slim@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
RUN useradd --create-home app
WORKDIR /app
COPY requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt
COPY . .
USER app
CMD ["python", "main.py"]
```

Pinning means a rebuild gives the same base. It also means you must update the pin regularly, so use an automated dependency updater to propose new digests.

## Scanning and SBOMs

A scanner compares the packages inside an image against vulnerability databases. An **SBOM** (software bill of materials) lists everything in the image so you can answer "are we affected by this new CVE" in minutes.

```console
$ trivy image --severity HIGH,CRITICAL registry.example.com/team/shop-api:1.8.2
$ trivy image --exit-code 1 --severity CRITICAL registry.example.com/team/shop-api:1.8.2
$ syft registry.example.com/team/shop-api:1.8.2 -o spdx-json > sbom.spdx.json
$ grype sbom:sbom.spdx.json --fail-on high
```

Run a scan in the pipeline and fail the build on critical findings with a fix available. Scan again on a schedule, because new vulnerabilities are published for images that have not changed.

## Signing and verifying

Signing proves an image was built by your pipeline and has not been altered. Tools such as **cosign** (Sigstore) sign by digest and let the cluster verify before running.

```console
$ cosign sign --key cosign.key registry.example.com/team/shop-api@sha256:3b1c
$ cosign verify --key cosign.pub registry.example.com/team/shop-api@sha256:3b1c
```

On the cluster side, an admission policy (for example Kyverno or a policy controller) rejects images that are unsigned or come from an unapproved registry. Without enforcement, signing is only documentation.

## Registry hygiene

- Use a private registry or a pull-through cache for production
- Authenticate with short-lived credentials or workload identity, not shared passwords
- Apply retention rules to delete old untagged images
- Make production tags immutable so a tag cannot be overwritten
- Mirror critical base images, so a public outage does not stop your builds

## Incident: the same tag, two behaviours

> **Incident:** A hotfix is pushed over `shop-api:1.8` to fix a bug. Half the nodes already had the old layer cached and keep running it, the other half pull the new image. Customers report inconsistent behaviour, and rollback cannot be confirmed because both versions carry the same tag.

Mutable tags make deployments unpredictable. Find which digest each Pod runs and move to immutable references:

```console
$ kubectl get pods -n shop -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.containerStatuses[0].imageID}{"\n"}{end}'
$ kubectl set image deployment/shop-api api=registry.example.com/team/shop-api:1.8.3 -n shop
$ kubectl rollout status deployment/shop-api -n shop
```

Publish every build under a unique tag, enable tag immutability in the registry, and reference digests from the deployment manifest so the cluster can only run what the pipeline produced.

## Common mistakes

- Deploying `latest` or any mutable tag
- Never rebuilding images, so base-image vulnerabilities pile up
- Scanning once at build time and never again
- Signing images but not verifying them at admission
- Sharing a single registry password among all pipelines

```quiz
Q: What is the difference between a tag and a digest?
- They are the same thing
+ A tag is a movable label; a digest is an immutable hash of the content
- A digest can be changed by pushing again
- Tags are only for private registries
> Digests identify exact content, so they are the safest reference for production.

Q: Why avoid deploying the latest tag?
- It is slower to pull
+ It can point to different content over time, so nodes may run different code
- It is not supported by Kubernetes
- It disables caching
> Use unique version tags or digests so every node runs the same image.

Q: What is an SBOM?
- A signed Dockerfile
+ A list of all packages and components inside an image
- A kind of registry
- A vulnerability database
> It lets you quickly find which images contain an affected component.

Q: Why is image signing not enough by itself?
+ Something must verify signatures at deploy time, such as an admission policy
- Signatures expire immediately
- Signing deletes the tag
- Signed images cannot be scanned
> Enforcement turns a signature into a control.
```

```cards
Why pin base image versions? :: So rebuilds are reproducible and updates are deliberate
What does a vulnerability scanner compare? :: Packages in the image against known CVE databases
What does cosign do? :: Signs and verifies container images by digest
Why use tag immutability? :: So a published tag can never be overwritten with different content
```
