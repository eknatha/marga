---
title: Autoscaling: HPA, VPA, KEDA and the cluster autoscaler
minutes: 15
summary: Scale Pods on CPU, memory and custom metrics with HPA, right-size with VPA, scale to zero with event-driven autoscaling, and add nodes when Pods cannot be scheduled.
---

Traffic is never flat. Autoscaling adds capacity when demand rises and removes it when demand falls, so you neither fail under load nor pay for idle machines. Kubernetes has several autoscalers that work at different levels, and they must be configured to cooperate.

## What you will learn

- The Horizontal Pod Autoscaler and its formula
- The Vertical Pod Autoscaler and when to use it
- Event-driven scaling and scale-to-zero with KEDA
- The cluster autoscaler or Karpenter for nodes

## Horizontal Pod Autoscaler

The **HPA** changes the replica count of a Deployment based on observed metrics. The core rule is:

`desiredReplicas = ceil(currentReplicas x currentMetric / targetMetric)`

If three Pods run at 90 percent CPU against a 60 percent target, the HPA wants ceil(3 x 90 / 60) = 5 replicas.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: shop-api
  namespace: shop
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: shop-api
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 25
          periodSeconds: 60
```

CPU utilisation is measured **relative to the Pod's CPU request**, so the Deployment must set requests or the HPA reports `<unknown>`. The `behavior` block slows scale-down to avoid flapping: here the HPA waits five minutes and removes at most a quarter of the Pods per minute.

```console
$ kubectl get hpa -n shop
$ kubectl describe hpa shop-api -n shop | sed -n '/Metrics/,/Events/p'
$ kubectl top pods -n shop
$ kubectl get events -n shop --field-selector involvedObject.kind=HorizontalPodAutoscaler
```

Requires the metrics server for CPU and memory. For request rate or queue depth, use a custom metrics adapter such as the Prometheus adapter. CPU is a poor signal for many applications; requests per second or latency often predicts load better.

## Vertical Pod Autoscaler

The **VPA** adjusts container requests and limits. In `Off` mode it only recommends values, which is a safe way to right-size a workload.

```console
$ kubectl get vpa shop-api -n shop -o jsonpath='{.status.recommendation.containerRecommendations[0]}'
```

Do not let HPA and VPA both act on CPU for the same workload, since they fight. A common pattern is VPA in recommendation mode for sizing and HPA for scaling out.

## Event-driven scaling with KEDA

**KEDA** scales workloads from external event sources such as queue length, Kafka lag or a cron schedule, and can scale to **zero**.

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: invoice-worker
  namespace: billing
spec:
  scaleTargetRef:
    name: invoice-worker
  minReplicaCount: 0
  maxReplicaCount: 30
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.eu-west-1.amazonaws.com/123456789012/invoices
        queueLength: "20"
        awsRegion: eu-west-1
```

One worker per twenty queued messages, and none when the queue is empty. Scale-to-zero suits batch consumers; avoid it for services where cold-start latency would hurt users.

## Scaling nodes

Pod autoscaling only helps if nodes exist to hold the new Pods. The **cluster autoscaler** (or **Karpenter** on AWS) watches for Pods that are `Pending` because nothing fits and adds nodes, then removes underused nodes.

```console
$ kubectl get pods -A --field-selector=status.phase=Pending
$ kubectl get nodes -L node.kubernetes.io/instance-type
$ kubectl -n kube-system logs deploy/cluster-autoscaler | tail -5
```

New nodes take minutes to start, so keep some headroom and use PodDisruptionBudgets so scale-down does not remove too many replicas of one service at once.

## Incident: the HPA that could not scale

> **Incident:** A marketing email triples traffic. Latency climbs, but the HPA stays at 3 replicas. `kubectl get hpa` shows `cpu: <unknown>/60%` and the team sees no scaling events.

The HPA had no metric to act on. Find out why:

```console
$ kubectl describe hpa shop-api -n shop | tail -8
Warning  FailedGetResourceMetric  missing request for cpu
$ kubectl get deploy shop-api -n shop -o jsonpath='{.spec.template.spec.containers[0].resources}'
{}
```

The Deployment had no CPU request, so utilisation could not be computed. Set a request, confirm `kubectl get hpa` shows a number, load-test before the next campaign, and alert when an HPA reports unknown metrics or sits at its maximum.

## Common mistakes

- Using the HPA with no CPU request set
- HPA and VPA both controlling CPU on the same workload
- A maximum replica count that exceeds node capacity or quota
- Scaling on CPU for an I/O-bound application
- No scale-down stabilisation, causing flapping

```quiz
Q: How does the HPA compute CPU utilisation?
- As a percentage of the node
+ Relative to the container's CPU request
- As an absolute number of cores only
- From the limit
> Without a request the percentage cannot be computed.

Q: What does the cluster autoscaler do?
- Adds replicas to Deployments
+ Adds or removes nodes based on unschedulable Pods and underused nodes
- Changes container limits
- Restarts failed Pods
> It scales infrastructure, while the HPA scales Pods.

Q: When is KEDA a good fit?
- For static web pages
+ For workloads driven by events such as queue length, including scale to zero
- For node upgrades
- For storage expansion
> KEDA scales on external event sources.

Q: Why avoid HPA and VPA both managing CPU for one workload?
- They are incompatible with Deployments
+ They react to each other's changes and can fight
- VPA only works with memory
- HPA cannot read requests
> Use VPA recommendations for sizing and HPA for scale-out.
```

```cards
HPA scale formula? :: ceil(currentReplicas x currentMetric / targetMetric)
Why is the HPA showing unknown? :: Missing requests, or the metrics server or adapter is unavailable
VPA Off mode? :: Produces recommendations without changing Pods
Why add a PodDisruptionBudget? :: To keep enough replicas available while nodes are removed
```
