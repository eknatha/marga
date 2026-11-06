---
title: Jenkins: shared libraries and reusable pipelines
minutes: 13
summary: Share pipeline code across many repositories with Jenkins shared libraries, global variables and versioned releases.
---

Jenkinsfiles are copied easily and updated badly. A shared library turns the repeated parts of your pipelines into one place with versions, so a fix reaches every project without fifty pull requests.

## What you will learn

- The layout of a shared library
- Calling a library step from a Jenkinsfile
- Versioning and testing a library
- What belongs in a library and what does not

## Layout

```text
(library repository)
vars/
  buildImage.groovy     # a global step: buildImage(name: 'api')
  deployTo.groovy
src/org/shop/Util.groovy  # helper classes
resources/                # templates and files
```

A file in `vars/` becomes a step with the same name. It defines a `call` method.

```groovy
// vars/buildImage.groovy
def call(Map cfg) {
  sh "docker build -t ${cfg.name}:${env.GIT_COMMIT.take(7)} ."
  if (cfg.push) { sh "docker push ${cfg.name}:${env.GIT_COMMIT.take(7)}" }
}
```

```groovy
// Jenkinsfile in a project
@Library('shop-pipeline@v2.3.0') _
pipeline {
  agent any
  stages { stage('Build') { steps { buildImage(name: 'registry/shop/api', push: env.BRANCH_NAME == 'main') } } }
}
```

```diagram
title: How a library reaches a pipeline
node: lib | Library repository | 0 | 0 | Holds vars/ steps and src/ helpers, tagged by version. | An untested change to main breaks every project that tracks it.
node: cfg | Library configuration | 1 | 0 | Controller setting that names the repository and default version. | An implicit load of the default branch gives surprise changes. | security
node: jf | Jenkinsfile | 2 | 0 | Declares @Library with a pinned version and calls steps. | An unpinned library changes behaviour with no commit in your repository.
node: run | Pipeline run | 3 | 0 | Loads the library at the pinned version and runs the steps. | A step that hides secrets in logs or runs arbitrary code is a risk.
node: test | Sandbox job | 1 | 1 | A job that tests a new library version before it is tagged. | Without it the first test is production. | observe
edge: lib | cfg
edge: cfg | jf
edge: jf | run
edge: lib | test
```

## Good habits

Tag releases (`v2.3.0`) and let each project upgrade on its own schedule. Keep steps small and named for what they do. Never put secrets in the library; read them from credentials at run time. Give a library an owner, a changelog and a test job that runs the steps against a sample repository.

## Incident: The library change that broke forty pipelines

> **Incident:** A change on the main branch of the library renamed a parameter and all projects that tracked main failed at once.

```console
groovy.lang.MissingPropertyException: No such property: imageName for class: buildImage
Finished: FAILURE
40 jobs failed within 10 minutes
```

Every project loaded the library at its latest main. After the incident, projects pinned @Library to a tag, the library gained a sandbox job and breaking changes needed a new major version.

## Common mistakes

- Tracking the library's main branch from every project
- Putting credentials or tokens in the library
- Making one huge step that does everything
- No tests or changelog for the library

```quiz
Q: What does a file in vars/ become?
+ A global pipeline step
- A new agent :: No.
- A credential :: No.
- A plugin :: No.
> The file name is the step name.

Q: How should projects reference a library in production pipelines?
+ Pinned to a tagged version
- Always the newest main branch :: No.
- By copying the code in :: No.
- Without a version :: No.
> Pinning prevents surprise breakage.

Q: What belongs in a shared library?
+ Reusable pipeline behaviour
- Passwords :: No.
- Build artifacts :: No.
- The Jenkins home directory :: No.
> Share behaviour, not secrets.

Q: How do you check a library change safely?
+ Run a sandbox job against the new version first
- Merge and see :: No.
- Edit it on the controller :: No.
- Skip tests :: No.
> Test before you tag.
```

```cards
Shared library :: A versioned repository of pipeline code used by many Jenkinsfiles
vars directory :: Holds global steps, one per file
@Library :: The annotation that loads a library at a version
Pinning :: Fixing a dependency to a specific version
Sandbox job :: A job used to test changes before release
```
