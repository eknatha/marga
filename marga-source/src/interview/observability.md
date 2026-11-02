## What is the difference between monitoring and observability?
level: junior
Monitoring watches known conditions with predefined checks and alerts. Observability is the ability to ask new questions about a system from its outputs, using metrics, logs and traces with enough detail and context to explain unexpected behaviour. You need monitoring to detect problems and observability to understand them.

## What are the three pillars and what is each best at?
level: junior
Metrics are numbers over time, cheap to store and ideal for dashboards and alerting. Logs are detailed event records that explain what happened. Traces follow one request through many services and show where time is spent. They work best linked together by shared identifiers such as trace IDs.

## Explain the four golden signals.
level: mid
Latency, traffic, errors and saturation. Latency is how long requests take (separate successes and failures). Traffic is demand, such as requests per second. Errors are the rate of failed requests. Saturation is how full the system is, such as queue depth, CPU or connection pools. Together they cover most user-facing health.

## How does Prometheus collect data, and what are its metric types?
level: mid
Prometheus scrapes HTTP endpoints at intervals (a pull model) and stores time series with labels. Counters only increase, gauges go up and down, histograms count observations in buckets, and summaries compute quantiles on the client. Query with PromQL, for example `rate(http_requests_total[5m])`. Use `rate` on counters and avoid high-cardinality labels.

## What is high cardinality and why is it a problem?
level: mid
Cardinality is the number of unique label combinations. Labels such as user ID or request ID create millions of series, which blow up memory and storage in Prometheus and indexing costs in Loki. Keep labels to bounded values such as service, route and status code, and put unbounded identifiers in logs or traces.

## How would you set up alerting for a service?
level: mid
Alert on symptoms users feel, such as error rate and latency against an SLO, using burn-rate alerts across short and long windows. Keep cause-based alerts for diagnosis in dashboards or low-severity channels. Each page should be urgent, actionable and linked to a runbook. Review alerts regularly and delete the noisy ones.

## What is OpenTelemetry and why use it?
level: mid
OpenTelemetry is a vendor-neutral standard and set of libraries for generating traces, metrics and logs, plus a Collector for processing and routing them. Instrumenting with it avoids lock-in to one vendor, lets you change backends, and standardises names and context propagation across services. The Collector adds central control over sampling, redaction and routing.

## How do you monitor from the user's point of view?
level: senior
Add blackbox and synthetic checks from outside your infrastructure that exercise public endpoints and key journeys, measure availability and latency, and check certificate expiry. Combine them with real user monitoring and SLIs measured at the load balancer. Probes inside the failure domain miss DNS, CDN and routing faults, so run them from independent locations.
