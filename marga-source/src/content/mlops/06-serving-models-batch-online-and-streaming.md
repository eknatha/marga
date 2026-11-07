---
title: Serving models: batch, online and streaming
minutes: 15
summary: Choose how predictions are produced and size the service for latency, throughput and cost.
---

There are several ways to turn a model into predictions, and the right one depends on how fast an answer is needed. Overnight scoring, a request-response API and a stream of events each have different costs and failure modes. This lesson helps you pick one, and shows what to measure so the service stays fast and affordable.

## What you will learn

- Choose between batch, online and streaming serving
- Reason about latency, throughput and batching
- Scale and protect a model service
- Handle slow, large or failing model calls

## Batch

Batch scoring runs the model over a large table on a schedule, then stores the results for other systems to read. It is cheap and simple, and it suits recommendations refreshed daily or risk scores for reports. The cost is staleness: the answer is as old as the last run.

## Online

Online serving answers one request at a time through an API, usually in tens to hundreds of milliseconds. It suits fraud checks, search ranking and anything that depends on the latest event. It needs capacity for peaks, health checks, timeouts and a fallback when the model is down.

## Streaming

Streaming scores events as they arrive from a queue. It sits between the two: near real-time, high volume and decoupled from the caller. You must plan for ordering, duplicates, backlog and what happens when the model is slower than the incoming rate.

## Latency and batching

Model inference often runs much faster per item when several requests are grouped. Dynamic batching waits a few milliseconds to collect requests and then runs them together. It raises throughput but adds a little delay, so set a maximum wait that fits your latency budget.

## Scale and protect

Autoscale on a signal that reflects load, such as queue depth or concurrent requests, not only CPU. GPU services start slowly because models are large, so keep a warm minimum. Set timeouts, limit concurrency, and return a safe default or an older cached answer when the model cannot respond.

## A model service with sensible limits

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: {name: churn-model}
spec:
  replicas: 3
  selector: {matchLabels: {app: churn-model}}
  template:
    metadata: {labels: {app: churn-model}}
    spec:
      containers:
      - name: server
        image: registry.example.com/churn@sha256:4f2a1c
        resources:
          requests: {cpu: "2", memory: 4Gi}
          limits: {memory: 6Gi}
        readinessProbe:
          httpGet: {path: /ready, port: 8080}
          initialDelaySeconds: 20
        env:
        - {name: MAX_BATCH_SIZE, value: "16"}
        - {name: MAX_BATCH_WAIT_MS, value: "8"}
        - {name: REQUEST_TIMEOUT_MS, value: "250"}
```

The readiness probe waits for the model to load. Batching is capped at eight milliseconds and a request timeout protects callers. Set these from your latency budget, not by guesswork.

## How it fails

A model takes minutes to load, so new pods receive traffic too early. Batching waits too long and breaks the latency budget. A traffic spike overloads the service and callers pile up retries. No fallback exists when the model is down.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Serving models: batch, online and streaming fits together
node: n1 | Batch | 0 | 0 | Batch scoring runs the model over a large table on a schedule, then stores the results for other systems to read. | CPU-only autoscaling for a GPU model. | process
node: n2 | Online | 1 | 1 | Online serving answers one request at a time through an API, usually in tens to hundreds of milliseconds. | Online serving for something that needs no freshness. | process
node: n3 | Streaming | 2 | 0 | Streaming scores events as they arrive from a queue. | Serving traffic before the model has loaded. | queue
node: n4 | Latency and batching | 3 | 1 | Model inference often runs much faster per item when several requests are grouped. | No timeout or fallback for the model call. | process
node: n5 | Scale and protect | 4 | 0 | Autoscale on a signal that reflects load, such as queue depth or concurrent requests, not only CPU. | Set timeouts, limit concurrency, and return a safe default or an older cached answer when the model cannot respond. | process
node: n6 | A model service with sensible limits | 5 | 1 | The readiness probe waits for the model to load. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
edge: n5 | n6
```

## Incident: Retries that finished the job

> **Incident:** A model service slowed down under load. Callers timed out and retried, which doubled the load and made it slower still, until the service stopped answering. The team had no concurrency limit and no fallback.

```console
$ kubectl top pod -l app=churn-model
NAME            CPU    MEMORY
churn-model-0   3980m  5.1Gi
$ curl -s -o /dev/null -w "%{http_code} %{time_total}\n" localhost:8080/predict
503 4.201
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration of a retry storm. A concurrency limit, a retry budget with backoff on callers, and a cheap fallback answer keep a slow model from taking down everything that depends on it.

## Interview question

"Batch or online for a recommendation feature?" Ask how fresh the answer must be. If daily is fine, batch is cheaper and simpler. If it must react to the last click, use online with a fallback to the batch result.

## Common mistakes

- Online serving for something that needs no freshness
- CPU-only autoscaling for a GPU model
- Serving traffic before the model has loaded
- No timeout or fallback for the model call

```quiz
Q: When is batch scoring the best fit?
+ When results can be a few hours old and volume is large
- When every answer needs the latest event :: That needs online.
- When there is no data :: Nothing to score.
- When you want sub-second answers :: Batch is not for that.
> Correct: When results can be a few hours old and volume is large. Re-read the matching lesson section for the full reasoning.

Q: What does dynamic batching trade?
+ A little added delay for higher throughput
- Accuracy for speed :: The model output is unchanged.
- Memory for disk :: Not the trade.
- Security for cost :: Unrelated.
> Correct: A little added delay for higher throughput. Re-read the matching lesson section for the full reasoning.

Q: Why use a readiness probe for a model service?
+ The model may take time to load and should not get traffic before it is ready
- To make the model smaller :: Not its purpose.
- To disable autoscaling :: Unrelated.
- To record metrics :: Not its purpose.
> Correct: The model may take time to load and should not get traffic before it is ready. Re-read the matching lesson section for the full reasoning.

Q: What helps prevent a retry storm?
+ A concurrency limit, retry budget with backoff and a fallback
- Unlimited retries :: That makes it worse.
- Longer model names :: Irrelevant.
- Removing timeouts :: Callers would hang.
> Correct: A concurrency limit, retry budget with backoff and a fallback. Re-read the matching lesson section for the full reasoning.
```

```cards
batch scoring :: run the model on a table on a schedule
online serving :: answer each request through an API
dynamic batching :: group requests briefly to raise throughput
fallback :: a safe default answer when the model cannot respond
```
