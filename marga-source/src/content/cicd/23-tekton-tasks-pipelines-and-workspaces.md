---
title: Tekton: tasks, pipelines and workspaces
minutes: 14
summary: Build Tekton Tasks and Pipelines, pass data with params, results and workspaces and run them with TaskRuns and PipelineRuns.
---

Tekton is a Kubernetes-native CI and delivery framework. Everything is a custom resource, so pipelines are applied with kubectl, scheduled as pods and observable with the same tools as any other workload.

## What you will learn

- Writing a Task with steps and params
- Linking tasks into a Pipeline
- Sharing data with workspaces and results
- Running with TaskRun and PipelineRun

## Task

```yaml
apiVersion: tekton.dev/v1
kind: Task
metadata:
  name: build-image
spec:
  params:
    - name: image
      type: string
  workspaces:
    - name: source
  results:
    - name: digest
  steps:
    - name: build
      image: gcr.io/kaniko-project/executor:latest
      args:
        - --context=$(workspaces.source.path)
        - --destination=$(params.image)
        - --digest-file=$(results.digest.path)
```

A **Task** runs as one pod, and each **step** is a container in it. Steps share the pod's files and run in order. Params are inputs, results are small outputs and a **workspace** is a mounted directory for larger data.

## Pipeline

```yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: ci
spec:
  params:
    - name: image
  workspaces:
    - name: shared
  tasks:
    - name: build
      taskRef:
        name: build-image
      params:
        - name: image
          value: $(params.image)
      workspaces:
        - name: source
          workspace: shared
    - name: scan
      runAfter: [build]
      taskRef:
        name: scan-image
```

A **Pipeline** lists tasks and orders them with `runAfter` or by using another task's result. Tasks run as separate pods, possibly on different nodes, so data between them must travel through a workspace or a result.

## Running

```bash
tkn pipeline start ci --param image=registry.example.com/app:1.4 \
  --workspace name=shared,claimName=ci-cache --showlog
kubectl get pipelineruns,taskruns
```

A **PipelineRun** supplies real params and volumes and creates one TaskRun per task. Inspect logs with `tkn pipelinerun logs`, and use `kubectl describe` to see scheduling and volume problems.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Tekton: tasks, pipelines and workspaces fits together
node: n1 | Task | 0 | 0 | A Task runs as one pod, and each step is a container in it. | Using large results instead of workspaces. | process
node: n2 | Pipeline | 1 | 1 | A Pipeline lists tasks and orders them with runAfter or by using another task's result. | Assuming tasks share a filesystem. | queue
node: n3 | Running | 2 | 0 | A PipelineRun supplies real params and volumes and creates one TaskRun per task. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: The task that could not see the source

> **Incident:** A second task found an empty directory because tasks run in separate pods.

```console
scan-image: no such file or directory: /workspace/src
build-image: success
scan-image: failed
```

The author assumed that all tasks shared one disk. Each task ran in its own pod. The pipeline was changed to bind one persistent volume claim as a shared workspace, and the build task now writes the image digest to a result so the scan task does not depend on local files at all.

## Common mistakes

- Assuming tasks share a filesystem
- Using large results instead of workspaces
- Unpinned step images
- Leaving finished runs in the cluster forever

```quiz
Q: What runs as one pod in Tekton?
+ A TaskRun
- A whole cluster :: No.
- A namespace :: No.
- A repository :: No.
> Each Task run creates a pod with its steps.

Q: How do separate tasks share large files?
+ A workspace backed by a volume
- Results :: No.
- Params :: No.
- Labels :: No.
> Workspaces mount storage.

Q: What does runAfter do?
+ Orders one task after another
- Deletes a task :: No.
- Sets a timeout :: No.
- Creates a workspace :: No.
> It builds the task graph.

Q: What creates a run from a Pipeline?
+ A PipelineRun
- A ConfigMap :: No.
- A Namespace :: No.
- A Node :: No.
> The run object holds real values.
```

```cards
Task :: A set of steps run as one pod
Pipeline :: An ordered graph of tasks
Workspace :: A mounted volume shared with a task
Result :: A small value a task passes on
PipelineRun :: A resource that starts a pipeline with real inputs
```
