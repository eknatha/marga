---
title: Jenkins: declarative pipelines and the Jenkinsfile
minutes: 14
summary: Write a declarative Jenkinsfile with stages, steps, environment, conditions and post actions, and read a failed run.
---

A Jenkinsfile is Jenkins' answer to pipeline as code. It is read from the repository on every run, reviewed like any other change and versioned with the code it builds. The declarative form is the one to learn first because its structure is checked before anything runs.

## What you will learn

- The parts of a declarative pipeline
- Stages, steps, environment and post actions
- Conditions, parallel stages and options
- Reading a failed build log

## A first Jenkinsfile

```groovy
pipeline {
  agent { label 'linux-docker' }
  options { timeout(time: 20, unit: 'MINUTES'); disableConcurrentBuilds() }
  environment { IMAGE = "registry.example.com/shop/api:${env.GIT_COMMIT.take(7)}" }
  stages {
    stage('Test')  { steps { sh 'make test' } }
    stage('Build') { steps { sh 'docker build -t $IMAGE .' } }
    stage('Push')  {
      when { branch 'main' }
      steps { sh 'docker push $IMAGE' }
    }
  }
  post {
    failure { echo 'Build failed' }
    always  { junit 'reports/*.xml' }
  }
}
```

## The structure

`pipeline` is the root. `agent` says where to run, `environment` sets variables, `stages` holds a list of `stage` blocks and each stage has `steps`. `post` runs after the stages and can react to `success`, `failure`, `unstable` or `always`. Jenkins checks this shape before it starts, so a typo in a directive fails in seconds, not after twenty minutes.

```diagram
title: The life of a declarative run
node: scm | Checkout | 0 | 0 | Jenkins fetches the repository and reads the Jenkinsfile. | A Jenkinsfile on the wrong branch gives a different pipeline than you expect.
node: test | Test stage | 1 | 0 | Runs the test command on the chosen agent. | A flaky test fails the whole run; fix it or quarantine it.
node: build | Build stage | 2 | 0 | Builds the image or artifact. | Without a pinned base image the result can change between runs.
node: push | Push stage | 3 | 0 | Pushes only on the main branch because of the when condition. | A missing condition publishes images from every branch.
node: post | Post actions | 2 | 1 | Publishes reports and notifies, whatever the outcome. | Skipping always {} loses test reports on failure.
edge: scm | test
edge: test | build
edge: build | push
edge: push | post
```

## Controlling the flow

Use `when` to run a stage only for a branch, a tag or a changed path. Use `parallel` to run independent stages at once, and `options` for `timeout`, `retry` and `buildDiscarder`. Avoid `script { }` blocks except for small bits of logic; if you need loops and functions, move them into a script file or a shared library.

## Reading a failed run

Open the build, then Console Output, and search for the first `ERROR` or the stage marked red in the stage view. The steps before it are context; the first failure is the cause.

## Incident: The pipeline that published every branch

> **Incident:** A missing when condition pushed an image from a feature branch over the production tag.

```console
stage 'Push' ran on branch feature/login
$ docker push registry/shop/api:latest
latest: digest: sha256:9f2c1e size: 1572
Finished: SUCCESS
```

Production pulled the new image on its next restart and served half-finished login code. The team added when { branch 'main' }, tagged images with the commit hash instead of latest, and made the push stage require a protected branch.

## Common mistakes

- Putting long shell scripts inline in the Jenkinsfile
- Pushing images on every branch
- Using latest as the only tag
- Forgetting a timeout so a hung build holds an executor

```quiz
Q: Why keep the Jenkinsfile in the repository?
+ It is versioned, reviewed and survives a rebuilt controller
- It runs faster :: No.
- It avoids needing agents :: No.
- It removes the need for tests :: No.
> Pipeline as code is reviewable and reproducible.

Q: What does a when condition do?
+ Runs a stage only if the condition is true
- Delays the build :: No.
- Sets an environment variable :: No.
- Encrypts the log :: No.
> when gates a stage, for example on a branch.

Q: When does the post section run?
+ After the stages, with blocks for success, failure or always
- Before the checkout :: No.
- Only on the controller :: No.
- Only on a manual run :: No.
> post is for cleanup, reports and notifications.

Q: How do you find the cause of a failed build?
+ Find the first error in the console output or the red stage
- Read the last line only :: No.
- Restart the controller :: No.
- Delete the workspace :: No.
> The first failure is the cause; later lines are consequences.
```

```cards
Declarative pipeline :: A structured Jenkinsfile with pipeline, agent, stages and post blocks
Stage :: A named phase of a pipeline such as Test or Build
Step :: A single action inside a stage, such as sh 'make test'
post :: A block that runs after the stages, by outcome
when :: A condition that decides whether a stage runs
```
