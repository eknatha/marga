---
title: Versioning, artifacts and release management
minutes: 14
summary: Build once and promote the same artifact through environments, version with SemVer, store artifacts and caches properly, and keep a changelog and rollback path.
---

The package you test must be the package you deploy. If staging runs one build and production runs another built later from the same source, you have tested something else. Artifacts, versions and promotion rules make releases predictable and reversible.

## What you will learn

- Build once, promote everywhere
- Semantic versioning and build metadata
- Storing artifacts and caching dependencies
- Changelogs, release notes and rollback

## Build once, promote the artifact

A pipeline should produce an **immutable artifact** (a container image, a package, a binary) exactly once. Later stages deploy that same artifact, changing only configuration.

```text
commit -> build artifact (shop-api:1.8.2-b457) -> test -> staging -> approve -> production
                              |                                         ^
                              +--------- same artifact promoted --------+
```

Environment differences belong in configuration: values, environment variables, secrets and manifests. If you rebuild per environment, a different dependency version or timestamp can sneak in, and "it passed in staging" stops meaning anything.

## Semantic versioning

SemVer uses `MAJOR.MINOR.PATCH`: increase **MAJOR** for incompatible changes, **MINOR** for backward-compatible features and **PATCH** for backward-compatible fixes. Pre-release and build information go after: `2.1.0-rc.1`, `2.1.0+b457`.

```console
$ VERSION=$(cat VERSION)
$ BUILD=${BUILD_NUMBER:-0}
$ TAG="${VERSION}-b${BUILD}"
$ echo "building ${TAG}"
$ docker build --build-arg VERSION="$VERSION" -t registry.example.com/shop/api:"$TAG" .
$ docker push registry.example.com/shop/api:"$TAG"
```

Services that only talk to your own clients often use a build number or date instead. What matters is that every deployed artifact has a **unique, traceable identifier** that maps back to the exact source revision, so you can answer "what is running in production" in seconds.

## Recording what was built

Store metadata with the artifact: source revision, build number, build time, test results and scan results. Embed the version in the application so it can report it.

```yaml
build:
  script:
    - docker build -t registry.example.com/shop/api:${BUILD_ID}
        --label org.opencontainers.image.revision=${SOURCE_REV}
        --label org.opencontainers.image.version=${VERSION} .
    - docker push registry.example.com/shop/api:${BUILD_ID}
  artifacts:
    paths:
      - sbom.json
      - test-report.xml
    expire_in: 90 days
```

```console
$ docker inspect registry.example.com/shop/api:457 --format '{{json .Config.Labels}}'
$ curl -fsS https://shop.example.com/version
```

A `/version` endpoint, or a metric like `app_build_info{version="1.8.2"}`, lets monitoring show which version served each request and correlate errors with releases.

## Caches and artifact storage

Dependency downloads dominate build time. Cache them keyed on the lock file so the cache refreshes only when dependencies change.

```yaml
cache:
  key:
    files: [requirements.txt]
  paths:
    - .cache/pip
```

Use a proper artifact repository for packages and images, with retention rules. Keep release artifacts long enough to roll back and to satisfy audit needs, and delete short-lived branch builds quickly. Never rely on a build agent's local disk as the only copy.

## Changelog and rollback

Automate release notes from the changes included, and require a rollback plan for risky ones. The simplest rollback is redeploying the previous artifact, which is only possible if:

- the previous artifact still exists in the registry
- database changes were backward compatible (expand, then contract)
- configuration for the old version is still available

```console
$ kubectl rollout history deployment/shop-api -n shop
$ kubectl rollout undo deployment/shop-api -n shop --to-revision=12
$ kubectl rollout status deployment/shop-api -n shop
```

## Incident: nobody knows what is in production

> **Incident:** A customer reports a bug that was fixed last week. Support says the fix is released. Engineers cannot tell whether production runs the fix because images are tagged `prod` and the pipeline rebuilt from the main branch during the last deployment.

Without a unique version on the running artifact there is no way to answer. The recovery path and prevention:

```console
$ kubectl get deploy shop-api -n shop -o jsonpath='{.spec.template.spec.containers[0].image}'
registry.example.com/shop/api:prod
$ kubectl get pods -n shop -o jsonpath='{.items[0].status.containerStatuses[0].imageID}'
```

Resolve the digest to a build, then to a source revision via the labels. From now on, tag with a unique build identifier, never rebuild for promotion, and surface the version in the UI footer and metrics.

## Common mistakes

- Rebuilding the artifact for each environment
- Mutable tags such as `prod` or `latest` as release identifiers
- Cleaning up old artifacts so a rollback is impossible
- Breaking database compatibility so the previous version cannot run
- Keeping the only copy of an artifact on a build agent

```quiz
Q: What does "build once, promote" mean?
- Build separately for each environment
+ Build a single artifact and deploy that same artifact through every environment
- Build only in production
- Build manually
> Promotion keeps what you test identical to what you ship.

Q: Under SemVer, a backward-compatible bug fix increments which number?
- MAJOR
- MINOR
+ PATCH
- None
> PATCH is for compatible fixes; MINOR for compatible features; MAJOR for breaking changes.

Q: Why must database changes be backward compatible for safe rollback?
- Databases cannot change
+ The previous application version must still work with the current schema
- It makes migrations faster
- It is required by Kubernetes
> Expand first, switch, then contract later.

Q: How do you find which source revision a running container was built from?
- Ask the team
+ Read labels or metadata attached to the artifact at build time
- Restart the container
- Guess from the date
> Recording the revision with the artifact makes production auditable.
```

```cards
Why not rebuild per environment? :: The result may differ, so staging results no longer describe production
Format of SemVer? :: MAJOR.MINOR.PATCH
What should every artifact have? :: A unique identifier traceable to the exact source revision
Expand and contract migrations? :: Add new schema first, migrate, then remove old schema after the old code is gone
```
