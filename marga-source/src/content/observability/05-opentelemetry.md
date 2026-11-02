---
title: Instrumenting with OpenTelemetry
minutes: 16
summary: Emit traces, metrics and logs with a vendor-neutral standard, add auto and manual instrumentation, route data through the Collector and keep context across services.
---

Every monitoring vendor used to ship its own agents and libraries, and switching meant re-instrumenting every service. **OpenTelemetry** (OTel) is the open standard that fixed this. You instrument once, then send the data to any compatible backend: Prometheus, Jaeger, Tempo, Grafana, Datadog and many others.

## What you will learn

- The OTel building blocks: API, SDK, exporters and the Collector
- Automatic and manual instrumentation
- Context propagation across services
- Collector pipelines, sampling and resource attributes

## Building blocks

- **API and SDK**: libraries in your language. The API is what code calls, and the SDK implements it
- **Signals**: traces, metrics and logs share common naming and context
- **Exporter**: sends data out, usually using the OTLP protocol
- **Collector**: a separate service that receives, processes and forwards telemetry
- **Semantic conventions**: standard attribute names such as `http.request.method` and `service.name`

Sending data to a Collector rather than directly to a vendor lets you change backends, add filtering and control cost without redeploying applications.

## Automatic instrumentation

For common frameworks, auto-instrumentation wraps HTTP servers, clients and database drivers with no code change.

```console
$ python -m pip install opentelemetry-distro opentelemetry-exporter-otlp
$ opentelemetry-bootstrap -a install
$ export OTEL_SERVICE_NAME=shop-api
$ export OTEL_RESOURCE_ATTRIBUTES=deployment.environment=prod,service.version=1.8.2
$ export OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector.observability:4317
$ opentelemetry-instrument python main.py
```

Within minutes you get a trace for each request with spans for the HTTP handler, outgoing calls and database queries. Always set `service.name`, `service.version` and `deployment.environment`: they are how you filter and compare across releases.

## Manual instrumentation

Add spans around business operations that frameworks cannot know about.

```python
from opentelemetry import trace

tracer = trace.get_tracer("shop.checkout")

def place_order(cart):
    with tracer.start_as_current_span("place_order") as span:
        span.set_attribute("cart.items", len(cart.items))
        span.set_attribute("customer.tier", cart.customer.tier)
        try:
            charge(cart)
        except PaymentError as exc:
            span.record_exception(exc)
            span.set_status(trace.Status(trace.StatusCode.ERROR))
            raise
        reserve_stock(cart)
```

Attributes should help you answer questions during an incident. Avoid putting personal data or secrets in them, and avoid unbounded values (full URLs with IDs) as metric dimensions.

## Context propagation

For a trace to cross services, each service passes the trace context to the next, normally in the W3C `traceparent` header.

```text
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             ver  trace-id (32 hex)               parent span (16 hex) flags
```

HTTP clients and servers handle this automatically once instrumented. It breaks at queues, batch jobs and custom protocols unless you inject and extract the context yourself. A trace that stops at a message broker is the most common gap.

## The Collector

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 400
  batch:
    timeout: 5s
  attributes/redact:
    actions:
      - key: http.request.header.authorization
        action: delete
  probabilistic_sampler:
    sampling_percentage: 10

exporters:
  otlp/tempo:
    endpoint: tempo.observability:4317
    tls:
      insecure: true
  prometheusremotewrite:
    endpoint: http://mimir.observability/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, attributes/redact, probabilistic_sampler, batch]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheusremotewrite]
```

A pipeline connects receivers, processors and exporters. `memory_limiter` protects the Collector, `batch` improves efficiency and the redaction processor removes sensitive attributes. Run it as an agent on each node and as a gateway deployment for central processing.

## Sampling

Storing every trace is expensive. **Head sampling** decides when the trace starts (simple, but may drop the interesting ones). **Tail sampling** decides after the trace completes, so you can keep every trace with an error or high latency and sample the rest.

```console
$ kubectl logs deploy/otel-collector -n observability --tail=20
$ curl -s localhost:8888/metrics | grep -E "otelcol_(receiver_accepted|exporter_sent|exporter_send_failed)"
```

Monitor the Collector itself: dropped or failed exports mean you have blind spots.

## Incident: traces stop at the queue

> **Incident:** Slow checkouts are reported. The trace for a slow order shows the API call taking 80 ms, then ends. The delay is somewhere afterwards, in a worker that processes the payment queue, but the trace has no spans from it.

Context was lost at the message queue. The producer must inject the context into the message and the consumer must extract it.

```python
from opentelemetry import trace, propagate

def publish(queue, payload):
    headers = {}
    propagate.inject(headers)
    queue.send(payload, attributes=headers)

def handle(message):
    ctx = propagate.extract(message.attributes)
    tracer = trace.get_tracer("shop.worker")
    with tracer.start_as_current_span("process_payment", context=ctx):
        charge_card(message.body)
```

With propagation in place the worker's spans join the original trace, and the slow step (a 6 second call to the payment provider) is visible immediately. Add this pattern to your service template so every new queue consumer does it.

## Common mistakes

- Skipping `service.name`, so everything appears as "unknown_service"
- Sending directly to a vendor from every application
- Sampling away error traces
- Putting personal data into span attributes
- Not monitoring the Collector

```quiz
Q: What problem does OpenTelemetry solve?
- It stores logs
+ It provides a vendor-neutral standard for instrumenting and exporting telemetry
- It replaces Kubernetes
- It encrypts traffic
> Instrument once, choose or change backends freely.

Q: What does the Collector add?
- A database
+ A central place to receive, process, filter and route telemetry
- A load balancer
- A firewall
> You can change backends, redact data and control sampling without touching applications.

Q: How does a trace cross from one service to another?
+ The trace context is propagated, normally in the traceparent header
- The services share a database
- It cannot
- By matching timestamps
> Instrumented HTTP clients and servers do this automatically.

Q: Why use tail sampling?
- It is easier
+ Decisions can keep all error and slow traces after seeing the whole trace
- It lowers latency
- It disables spans
> Head sampling decides blindly at the start of the trace.
```

```cards
Default OTLP ports? :: 4317 for gRPC and 4318 for HTTP
Which attributes should every service set? :: service.name, service.version and deployment.environment
Name the W3C trace header :: traceparent
Why monitor the Collector? :: Failed or dropped exports silently create blind spots
```
