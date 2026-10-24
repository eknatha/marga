---
title: Building a pipeline with a Jenkinsfile
minutes: 17
summary: Write a declarative Jenkinsfile with build, test, scan and deploy stages, handle credentials safely and read failures.
---

Theory becomes useful when you can write the pipeline. This lesson builds a complete declarative Jenkins pipeline for a containerized service. The ideas carry over directly to other CI systems: stages, steps, environment, credentials, conditions and post-actions exist everywhere under different names.

## What you will learn

- The structure of a declarative pipeline
- Credentials, parameters and conditions
- Parallel stages and post actions
- How to debug a failing build

## A complete pipeline

```groovy
pipeline {
  agent { label 'docker' }

  options {
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  environment {
    REGISTRY = 'registry.example.com'
    IMAGE    = "${REGISTRY}/shop-api"
    TAG      = "build-${env.BUILD_NUMBER}"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Test') {
      parallel {
        stage('Unit tests') {
          steps { sh 'make test' }
        }
        stage('Lint') {
          steps { sh 'make lint' }
        }
      }
    }

    stage('Build image') {
      steps {
        sh 'docker build -t "$IMAGE:$TAG" .'
      }
    }

    stage('Scan image') {
      steps {
        sh 'trivy image --severity HIGH,CRITICAL --exit-code 1 "$IMAGE:$TAG"'
      }
    }

    stage('Push') {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(credentialsId: 'registry-creds',
                                          usernameVariable: 'REG_USER',
                                          passwordVariable: 'REG_PASS')]) {
          sh 'echo "$REG_PASS" | docker login "$REGISTRY" -u "$REG_USER" --password-stdin'
          sh 'docker push "$IMAGE:$TAG"'
        }
      }
    }

    stage('Deploy to staging') {
      when { branch 'main' }
      steps {
        sh 'kubectl --context staging set image deployment/shop-api api="$IMAGE:$TAG" -n shop'
        sh 'kubectl --context staging rollout status deployment/shop-api -n shop --timeout=180s'
      }
    }
  }

  post {
    failure {
      echo "Build ${env.BUILD_NUMBER} failed"
    }
    always {
      sh 'docker logout "$REGISTRY" || true'
    }
  }
}
```

## Reading it

| Part | What it does |
|------|--------------|
| `agent` | Which worker runs the job |
| `options` | Timeout, one build at a time, log retention |
| `environment` | Variables for all stages. The image tag is unique per build, so every image is traceable to one run |
| `stages` and `steps` | The ordered work. `parallel` runs independent stages at the same time |
| `when` | Condition. Push and deploy happen only on the main branch |
| `withCredentials` | Injects secrets for the block only and masks them in logs |
| `post` | Runs after the stages: `always`, `failure`, `success` |

Notice the single quotes around shell commands that use `$IMAGE`. With single quotes, the *shell* expands the variable, so Jenkins never interpolates a secret into the command string. With double quotes, Groovy interpolates first and credentials can leak into the build log or process list.

> **Warning:** Do not put credentials in the pipeline file, in environment variables defined in the file, or in the image. Store them in the CI system's credential store and reference them by ID. Give the registry credential push rights only to the repository it needs.

## Habits that keep pipelines healthy

- Keep the pipeline file small by moving logic into scripts (`make test`, `./ci/deploy.sh`) that developers can run locally the same way.
- Fail fast with `set -euo pipefail` in scripts, as in the scripting module.
- Cache dependencies carefully and key the cache on the lock file.
- Archive test reports and keep logs, so failures can be diagnosed afterward.
- Verify after deploy. `rollout status` makes the pipeline fail if the new version never becomes ready.

## Incident: the build passes locally but fails in CI

> **Incident:** `make test` passes on your laptop. In the pipeline the Test stage fails with `ModuleNotFoundError: No module named 'psycopg2'`.

The console log shows the exact command and the environment it ran in:

```console
[Pipeline] sh
+ make test
python -m pytest
ModuleNotFoundError: No module named 'psycopg2'
make: *** [test] Error 1
```

Your laptop has the package installed globally from months ago; the clean CI worker does not. The pipeline had no step that installs the declared dependencies, so it relied on an accident. The cure is to make the build self-contained: install from the lock file in an isolated environment, and ideally run tests inside the same container image you build.

```bash
python -m venv .venv
. .venv/bin/activate
pip install --require-hashes -r requirements.lock
python -m pytest
```

A good rule: if a step only works on one machine, the pipeline has found an undeclared dependency. That is a feature of CI, not an annoyance.

## Common mistakes

- Using double-quoted shell strings with secrets
- No timeout, so a hung step blocks the agent forever
- Deploying from any branch instead of only the main branch
- Tests that depend on tools installed manually on the worker

```quiz
Q: Why use single quotes around sh commands that reference secret variables in a Jenkinsfile?
- Single quotes make commands faster
+ The shell expands the variable, so Groovy does not interpolate the secret into the command text
- Double quotes are not valid Groovy
- Jenkins requires it for all commands
> Groovy interpolation of secrets can expose them in logs and process lists.

Q: What does a when { branch 'main' } condition do?
- Skips the whole pipeline
+ Runs that stage only for builds on the main branch
- Merges the branch
- Forces a deploy
> Conditions restrict stages, such as push and deploy, to the right branch.

Q: How should a pipeline obtain a registry password?
- From a variable in the Jenkinsfile
+ From the CI credential store, injected with withCredentials
- From the Docker image
- By asking in the log
> Credentials are stored centrally, injected only where needed and masked.

Q: What does the post { always { ... } } block do?
- Runs only if the build succeeds
+ Runs after the stages regardless of the outcome
- Runs before checkout
- Retries the build
> It is used for cleanup and notifications.
```

```cards
What does parallel do in a pipeline? :: Runs independent stages at the same time to save time
Why add a timeout option? :: So a hung step cannot hold an agent forever
What does rollout status add after a deploy? :: A check that fails the pipeline if the new version never becomes ready
Why keep logic in scripts? :: They can be run locally the same way and are easier to test
```
