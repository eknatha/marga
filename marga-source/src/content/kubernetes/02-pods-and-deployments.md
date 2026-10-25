---
title: Pods, Deployments and probes
minutes: 17
summary: Write a production-shaped Deployment with resource requests, health probes and a safe rolling update, and roll it back when it fails.
---

A Deployment that merely "runs the container" is a Deployment that will hurt you. It will receive traffic before it is ready, hog or starve its neighbours, and roll out a broken version to every replica. Resource settings, probes and an update strategy turn a demo into something you can operate.

## What you will learn

- The anatomy of a Pod and a Deployment
- Requests and limits, and what each does
- Readiness, liveness and startup probes
- Rolling updates, rollbacks and rollout status

## A production-shaped Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop-api
  namespace: shop
spec:
  replicas: 3
  selector:
    matchLabels:
      app: shop-api
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    metadata:
      labels:
        app: shop-api
    spec:
      containers:
        - name: api
          image: registry.example.com/shop-api:1.8.2
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              memory: 256Mi
          readinessProbe:
            httpGet:
              path: /healthz/ready
              port: 8080
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /healthz/live
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
```

The `selector` must match the Pod template's labels; that link is how the Deployment knows which Pods it owns. Apply it with `kubectl apply -f shop-api.yaml`.

## Requests and limits

| Setting | Meaning | Effect |
|---------|---------|--------|
| `requests` | What the container is guaranteed | The scheduler uses it to place the Pod |
| `limits.memory` | A hard ceiling | Exceeding it gets the container killed (OOMKilled) |
| `limits.cpu` | A throttle | Exceeding it slows the container; it is not killed |

Set a memory request near typical use and a memory limit with headroom. Many teams omit CPU limits to avoid throttling while still setting CPU requests. Without requests the scheduler is guessing, and nodes become overcommitted.

## Probes

Probes let Kubernetes ask your application how it is doing. They answer three different questions:

| Probe | Question | Failure action |
|-------|----------|----------------|
| **Readiness** | Can you take traffic right now? | Pod removed from Service endpoints, not restarted |
| **Liveness** | Are you stuck beyond recovery? | Container restarted |
| **Startup** | Have you finished starting? | Holds off the other probes until it passes |

> **Warning:** Do not make a liveness probe depend on a database or another service. If the database is slow, every Pod fails its liveness check, all restart together, and a partial slowdown becomes a full outage. Liveness should only check the process itself.

## Rolling updates and rollbacks

With `maxUnavailable: 0` and `maxSurge: 1`, Kubernetes starts one new Pod, waits until it is **ready**, then removes one old Pod, and repeats. Readiness probes are therefore what stop a broken version from replacing a working one.

```console
$ kubectl set image deployment/shop-api api=registry.example.com/shop-api:1.9.0 -n shop
$ kubectl rollout status deployment/shop-api -n shop
Waiting for deployment "shop-api" rollout to finish: 1 out of 3 new replicas have been updated...
$ kubectl rollout history deployment/shop-api -n shop
$ kubectl rollout undo deployment/shop-api -n shop
deployment.apps/shop-api rolled back
```

## Incident: a bad release stalls halfway

> **Incident:** After deploying 1.9.0, `rollout status` hangs. Users are fine, but the release never finishes.

```console
$ kubectl get pods -n shop -l app=shop-api
NAME                        READY   STATUS    RESTARTS   AGE
shop-api-6d8f7c9b5-aaaaa    1/1     Running   0          2d
shop-api-6d8f7c9b5-bbbbb    1/1     Running   0          2d
shop-api-6d8f7c9b5-ccccc    1/1     Running   0          2d
shop-api-84c6b7d4f-ddddd    0/1     Running   0          4m
$ kubectl describe pod shop-api-84c6b7d4f-ddddd -n shop | tail -5
  Warning  Unhealthy  3m  kubelet  Readiness probe failed: HTTP probe failed with statuscode: 503
```

The new Pod runs but never becomes ready, so the rollout cannot continue. This is the strategy working as designed: the three healthy old Pods keep serving and users noticed nothing. Look at its logs (`kubectl logs shop-api-84c6b7d4f-ddddd -n shop`), find the cause, then either ship a fix or abandon the release with `kubectl rollout undo`. After a failed attempt, `kubectl rollout status` returns an error once the progress deadline passes, which your pipeline can use to fail the deploy automatically.

## Predict the rollout

```predict
Q: A Deployment has 3 replicas, maxUnavailable 1 and maxSurge 1. You update the image. How many pods can be unavailable at one time?
???
At most one.
> maxUnavailable caps pods that are not ready during the rollout. maxSurge allows one extra pod, so up to four can exist.
```

```predict
Q: A pod's readiness probe fails. Is the pod restarted?
readinessProbe:
  httpGet: {path: /ready, port: 8080}
???
No. It is removed from Service endpoints until it passes.
> A failing readiness probe stops traffic. A failing liveness probe is what causes a restart.
```

## Common mistakes

- No readiness probe, so traffic arrives before the app can handle it
- Liveness probes that check dependencies
- No memory limit, or a limit equal to average use
- Using `latest` tags so a rollback cannot go back to anything
- Selector and template labels that do not match

```quiz
Q: A new Pod fails its readiness probe. What does Kubernetes do?
- Restarts the container
+ Stops sending it traffic and, in a rolling update, does not continue the rollout
- Deletes the Deployment
- Ignores the probe
> Readiness controls whether a Pod receives traffic. Liveness controls restarts.

Q: Which setting makes a container get OOMKilled when exceeded?
- requests.memory
- limits.cpu
+ limits.memory
- requests.cpu
> Memory is not compressible: exceeding the limit gets the container killed. CPU is throttled instead.

Q: Why should a liveness probe not check the database?
- Databases cannot be checked over HTTP
+ A database problem would make every Pod restart at once and worsen the outage
- It uses too much CPU
- Liveness probes cannot use HTTP
> Liveness should detect a stuck process only. Dependency checks belong in readiness at most.

Q: Which command reverts a Deployment to its previous revision?
- kubectl rollout restart deployment/shop-api
+ kubectl rollout undo deployment/shop-api
- kubectl delete rollout shop-api
- kubectl scale deployment/shop-api --replicas=0
> rollout undo returns to the previous ReplicaSet revision.
```

```cards
Requests vs limits? :: Requests are guaranteed and used for scheduling; limits are ceilings (memory kills, CPU throttles)
Readiness vs liveness? :: Readiness controls traffic; liveness triggers restarts
What does maxUnavailable: 0 guarantee? :: No existing Pod is removed until a new one is ready
Command to watch a rollout? :: kubectl rollout status deployment/NAME
```
