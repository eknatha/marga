---
title: Jenkins: build agents with Docker and Kubernetes
minutes: 13
summary: Run builds on throwaway agents: static nodes, Docker agents and the Kubernetes plugin with pod templates.
---

Where a build runs decides how repeatable it is. Machines that live for years collect leftover files, different tool versions and quiet changes. Jenkins can instead start a clean container per build, which is the same idea you use everywhere else.

## What you will learn

- Static agents and why they drift
- Running a build inside a Docker image
- Dynamic agents with the Kubernetes plugin and pod templates
- Sizing, cleanup and caching for ephemeral agents

## Three ways to get an agent

A **static agent** is a machine you set up once and connect over SSH or the inbound agent. It is simple but drifts. A **Docker agent** runs the pipeline inside an image you choose. A **Kubernetes agent** starts a pod for the build and deletes it when the build ends.

```groovy
pipeline {
  agent { docker { image 'node:20-alpine' } }
  stages { stage('Test') { steps { sh 'npm ci && npm test' } } }
}
```

## Kubernetes pod templates

With the Kubernetes plugin the controller talks to a cluster, creates a pod with a `jnlp` (inbound agent) container plus the tool containers you list, runs the stages inside them and removes the pod after.

```groovy
pipeline {
  agent {
    kubernetes {
      yaml '''
        apiVersion: v1
        kind: Pod
        spec:
          containers:
          - name: node
            image: node:20-alpine
            command: [sleep]
            args: [infinity]
            resources: { requests: { cpu: 500m, memory: 1Gi } }
      '''
    }
  }
  stages { stage('Test') { steps { container('node') { sh 'npm ci && npm test' } } } }
}
```

```diagram
title: A build on a Kubernetes agent
node: ctrl | Controller | 0 | 0 | Sees a queued build that needs a pod agent. | An unreachable cluster API leaves builds waiting.
node: api | Kubernetes API | 1 | 0 | Receives the pod request from the plugin. | Missing RBAC rights give a forbidden error and no pod.
node: pod | Agent pod | 2 | 0 | Starts the inbound agent and tool containers and connects back. | An image that cannot be pulled keeps the pod Pending.
node: build | Steps run | 2 | 1 | The stages run inside the tool containers. | No resource requests can starve neighbours or get the pod evicted.
node: gone | Pod deleted | 1 | 1 | The pod is removed when the build ends. | A hung build holds the pod; use a timeout. | process
edge: ctrl | api
edge: api | pod
edge: pod | build
edge: build | gone
```

## Practical rules

Pin image tags so a build today matches a build next month. Set resource requests and limits so one build cannot eat a node. Cache dependencies with a persistent volume or a registry mirror, because a fresh pod starts with an empty disk. Use a timeout and make the pod label unique so pods are easy to find when something is stuck.

## Incident: The agent pods that never started

> **Incident:** Builds queued for an hour because the pod could not pull its image from a private registry.

```console
$ kubectl get pods -n ci
build-81-x9k2   0/2   ImagePullBackOff   0   6m
Failed to pull image "registry.example.com/ci/node": unauthorized
Build #81 waiting for next available executor
```

The service account had no image pull secret. Adding the secret to the namespace fixed it, and the team added an alert for agent pods that stay Pending more than five minutes.

## Common mistakes

- Using latest for tool images
- Not setting resource requests on agent pods
- Forgetting that a new pod has an empty cache
- Running privileged Docker-in-Docker without understanding the risk

```quiz
Q: What is the main benefit of ephemeral agents?
+ Every build starts from a clean, defined environment
- Builds never fail :: No.
- No controller is needed :: No.
- Credentials are unnecessary :: No.
> Clean agents remove drift between builds.

Q: What does the Kubernetes plugin create for each build?
+ An agent pod that is deleted afterwards
- A permanent node :: No.
- A new Jenkins controller :: No.
- A Git branch :: No.
> Pods are created on demand and removed.

Q: A pod agent stays Pending with ImagePullBackOff. What is likely?
+ The image cannot be pulled, often a registry credential
- The Jenkinsfile has a typo :: No.
- The disk is full :: No.
- The test failed :: No.
> Check events for the pull error.

Q: Why pin image tags for agents?
+ So builds are repeatable over time
- To use less memory :: No.
- To skip tests :: No.
- To avoid pods :: No.
> A moving tag changes tools without notice.
```

```cards
Static agent :: A long-lived machine that connects to the controller
Pod template :: A definition of the containers used for a Kubernetes agent
Inbound agent :: The process that connects an agent back to the controller
Ephemeral agent :: An agent created for one build and discarded
Executor :: A slot that runs one build on an agent
```
