---
title: CI/CD
summary: Pipeline stages, a Jenkinsfile skeleton, deployment strategies, and declarative delivery commands.
module: cicd
---

## Terms

| Term | Meaning |
|------|---------|
| Continuous integration | Merge often; build and test every change automatically |
| Continuous delivery | Every passing change is releasable; a human chooses when |
| Continuous deployment | Every passing change is released automatically |

## Pipeline stages

1. Checkout the exact revision
2. Build the artifact once
3. Test: lint and unit tests first, then integration
4. Analyze: dependency, secret and image scans
5. Publish with an immutable tag
6. Deploy to a test environment and run smoke tests
7. Promote the same artifact to production and verify

Build once, deploy many. Order checks by speed.

## Jenkinsfile skeleton

```groovy
pipeline {
  agent { label 'docker' }
  options {
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }
  environment {
    IMAGE = "registry.example.com/shop-api"
    TAG   = "build-${env.BUILD_NUMBER}"
  }
  stages {
    stage('Test') {
      parallel {
        stage('Unit') { steps { sh 'make test' } }
        stage('Lint') { steps { sh 'make lint' } }
      }
    }
    stage('Build') {
      steps { sh 'docker build -t "$IMAGE:$TAG" .' }
    }
    stage('Push') {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(credentialsId: 'registry-creds',
                                          usernameVariable: 'U', passwordVariable: 'P')]) {
          sh 'echo "$P" | docker login registry.example.com -u "$U" --password-stdin'
          sh 'docker push "$IMAGE:$TAG"'
        }
      }
    }
  }
  post {
    always { echo 'done' }
  }
}
```

Use single quotes around shell commands that reference secrets, so the shell expands them and Groovy does not.

## Deployment strategies

| Strategy | Strength | Weakness |
|----------|----------|----------|
| Recreate | Simple | Downtime |
| Rolling | No downtime, no extra capacity | Slower rollback, mixed versions |
| Blue-green | Instant switch and rollback | Double capacity |
| Canary | Limits blast radius | Needs traffic control and metrics |

Feature flags separate deploy from release. Remove them when done.

## Database changes

1. Expand: add new schema compatibly
2. Migrate: write both, read new, backfill
3. Contract: drop the old schema in a later release

## Verification and rollback

```bash
kubectl rollout status deployment/shop-api -n shop --timeout=180s
kubectl rollout undo deployment/shop-api -n shop
curl -fsS https://shop.example.com/healthz/ready
```

## Delivery metrics

| Metric | Question |
|--------|----------|
| Deployment frequency | How often do we release? |
| Lead time for changes | Commit to production? |
| Change failure rate | Share of releases causing problems? |
| Time to restore | How fast do we recover? |

## Declarative delivery

```bash
argocd app list
argocd app diff shop-api-prod
argocd app sync shop-api-prod
argocd app history shop-api-prod
```

| Setting | Effect |
|---------|--------|
| `automated.prune` | Delete objects removed from configuration |
| `automated.selfHeal` | Revert manual cluster changes |

Pull model: credentials stay in the cluster, drift is detected, and rollback is a configuration revert.

## Pipeline security

- Secrets come from a secret store, never from files in the source
- Short-lived credentials via identity federation
- Separate plan or build permissions from deploy permissions
- Scan images and dependencies; fail on high severity
- Deploy only from the main branch after review

## Pipeline hygiene commands

```bash
yamllint .ci/pipeline.yml
actionlint
docker run --rm -v "$PWD":/src hadolint/hadolint hadolint /src/Dockerfile
shellcheck ci/*.sh
trivy image --severity HIGH,CRITICAL --exit-code 1 app:1.4
trivy fs --scanners vuln,secret .
syft app:1.4 -o spdx-json > sbom.json
cosign sign --key cosign.key registry.example.com/app@sha256:ABC123
cosign verify --key cosign.pub registry.example.com/app@sha256:ABC123
```

> **Warning:** Do not hide a failing scan with `|| true` or `--exit-code 0` to make the build green. If a finding is accepted, record it with an owner and an expiry date.

> **Warning:** Never print secrets in a pipeline log, and do not run `env` or `set -x` in a step that has secrets. Masking works only for values that the system knows as secrets.

## Build, test and promote

```bash
make test
pytest -q --maxfail=1 --junitxml=report.xml
npm ci && npm test
docker build --pull --cache-from app:cache -t app:$SHORT_SHA .
docker push registry.example.com/app:$SHORT_SHA
docker buildx imagetools inspect registry.example.com/app:$SHORT_SHA
curl -fsS https://staging.example.com/healthz
curl -fsS -o /dev/null -w '%{http_code}\n' https://staging.example.com/version
```

> **Warning:** Use `npm ci` or a lock file install in CI, not `npm install`. Unlocked installs make builds that cannot be repeated.

> **Warning:** Build once and promote the same artifact through environments. Rebuilding for production means that you ship something nobody tested.

## Deploy and rollback

```bash
kubectl set image deploy/api app=registry.example.com/app:$SHORT_SHA -n shop
kubectl rollout status deploy/api -n shop --timeout=180s
kubectl rollout undo deploy/api -n shop
helm upgrade --install api ./chart -n shop --atomic --timeout 5m
curl -fsS https://example.com/healthz || exit 1
```

> **Warning:** Do not let a pipeline deploy to production with admin credentials that live forever. Use short-lived credentials, a protected environment and a manual approval for risky changes.

> **Warning:** A rollback does not undo database changes. Make migrations backward compatible, and ship them before the code that needs them.

> **Warning:** Re-running an old pipeline can redeploy an old version over a newer one. Check the commit and the version before you press retry.
