---
title: Writing Kubernetes clients and controllers in Go
minutes: 13
summary: Use client-go to list and watch resources, understand informers and work queues, and write a small, safe reconcile loop.
---

Many Kubernetes extensions are small Go programs following one idea: watch objects, compare desired and actual state, and make a change. Understanding the pieces helps you write them and read the ones you operate.

## What you will learn

- A client with client-go and in-cluster configuration
- Informers, caches and work queues
- A reconcile loop that is idempotent
- Operating controllers: leader election, RBAC and metrics

## A simple client

```go
cfg, err := rest.InClusterConfig()
if err != nil {
	cfg, err = clientcmd.BuildConfigFromFlags("", os.Getenv("KUBECONFIG"))
}
if err != nil {
	log.Fatal(err)
}
cs := kubernetes.NewForConfigOrDie(cfg)

pods, err := cs.CoreV1().Pods("shop").List(ctx, metav1.ListOptions{LabelSelector: "app=web"})
```

In a cluster the program uses the service account token automatically, so RBAC must allow exactly the verbs it needs.

## Informers and queues

```go
factory := informers.NewSharedInformerFactoryWithOptions(cs, 10*time.Minute, informers.WithNamespace("shop"))
podInformer := factory.Core().V1().Pods()
queue := workqueue.NewTypedRateLimitingQueue(workqueue.DefaultTypedControllerRateLimiter[string]())

podInformer.Informer().AddEventHandler(cache.ResourceEventHandlerFuncs{
	AddFunc: func(obj interface{}) {
		if key, err := cache.MetaNamespaceKeyFunc(obj); err == nil {
			queue.Add(key)
		}
	},
})
factory.Start(stopCh)
cache.WaitForCacheSync(stopCh, podInformer.Informer().HasSynced)
```

The **informer** keeps a local cache updated by one watch, so reads do not hit the API server. Events add object **keys** to a **work queue**, which removes duplicates and retries with backoff.

## Reconcile

```go
func (c *Controller) reconcile(ctx context.Context, key string) error {
	ns, name, _ := cache.SplitMetaNamespaceKey(key)
	pod, err := c.podLister.Pods(ns).Get(name)
	if apierrors.IsNotFound(err) {
		return nil // already gone, nothing to do
	}
	if err != nil {
		return err
	}
	return c.ensureDesiredState(ctx, pod) // compare and fix; safe to run again
}
```

The function looks at the **current** state and makes it match the desired state. It must be safe to run repeatedly and in any order.

## Operate

Use **controller-runtime** or Kubebuilder for custom resources. Run two replicas with **leader election**, give the service account minimal RBAC, expose metrics for queue depth and reconcile errors, and set resource limits.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Writing Kubernetes clients and controllers in Go fits together
node: n1 | A simple client | 0 | 0 | In a cluster the program uses the service account token automatically, so RBAC must allow exactly the verbs it needs. | Broad RBAC for controllers. | client
node: n2 | Informers and queues | 1 | 1 | The informer keeps a local cache updated by one watch, so reads do not hit the API server. | Informers and queues The informer keeps a local cache updated by one watch, so reads do not hit the API server. | queue
node: n3 | Reconcile | 2 | 0 | The function looks at the current state and makes it match the desired state. | Reconcile functions that are not idempotent. | process
node: n4 | Operate | 3 | 1 | Use controller-runtime or Kubebuilder for custom resources. | Running a single controller replica without leader election. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Polling the API every second

> **Incident:** A script listing all pods in a loop slowed the control plane.

```console
verb=LIST resource=pods user-agent=pod-watcher-script
60 requests per minute from one client
API p99 latency increased 4x
```

The script listed all pods every second across many clusters. Replacing it with an informer reduced requests to a single watch and made the program react faster. The team also added a review rule against polling in controllers.

## Common mistakes

- Polling instead of watching
- Reconcile functions that are not idempotent
- Running a single controller replica without leader election
- Broad RBAC for controllers

```quiz
Q: What does an informer provide?
+ A local cache fed by a watch
- A new cluster :: No.
- A backup :: No.
- A DNS record :: No.
> It reduces API load.

Q: What does a work queue do?
+ Deduplicates and retries keys
- Stores logs :: No.
- Scales nodes :: No.
- Encrypts data :: No.
> It smooths processing.

Q: What should reconcile do?
+ Make actual state match desired state
- React to one event only :: No.
- Delete everything :: No.
- Change names :: No.
> Level-triggered. The lesson section above explains why.

Q: Why use leader election?
+ Only one active controller makes changes
- To speed pods :: No.
- To add nodes :: No.
- To hide logs :: No.
> Avoid conflicting actions.
```

```cards
Informer :: Cache and event source built on watch
Work queue :: Queue of object keys to process
Reconcile :: Make actual state match desired state
Leader election :: Choosing one active replica
```
