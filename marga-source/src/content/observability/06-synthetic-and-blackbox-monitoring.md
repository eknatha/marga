---
title: Blackbox probes and synthetic monitoring
minutes: 14
summary: Measure availability from the user's side with the Prometheus blackbox exporter and synthetic checks, probe HTTP, TCP, DNS and certificates, and alert on what users actually experience.
---

Whitebox monitoring reads metrics that the system reports about itself. If the load balancer, DNS or certificate is broken, the application may report that everything is fine because no requests reach it. **Blackbox monitoring** tests from the outside, the way a user would, and catches failures that internal metrics cannot see.

## What you will learn

- Whitebox versus blackbox monitoring
- Running the Prometheus blackbox exporter with HTTP, TCP, DNS and ICMP probes
- Certificate expiry monitoring
- Multi-step synthetic checks and where to run probes from

## Two viewpoints

| | Whitebox | Blackbox |
|---|----------|----------|
| Source | Metrics exposed by the app and its host | A probe acting as a client |
| Finds | Saturation, internal errors, slow queries | Outages, DNS and TLS problems, routing, CDN faults |
| Misses | Failures before the request reaches the app | Why something failed internally |
| Best for | Diagnosis | Detection and availability SLIs |

You need both. Blackbox tells you something is wrong right now; whitebox tells you why.

## The blackbox exporter

The exporter performs the probe on request. Prometheus passes the target as a parameter and scrapes the result.

```yaml
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      method: GET
      valid_status_codes: [200]
      fail_if_not_ssl: true
      preferred_ip_protocol: ip4
  http_json_ok:
    prober: http
    timeout: 5s
    http:
      fail_if_body_not_matches_regexp:
        - '"status":\s*"ok"'
  tcp_connect:
    prober: tcp
    timeout: 3s
  dns_a:
    prober: dns
    timeout: 3s
    dns:
      query_name: shop.example.com
      query_type: A
```

```yaml
scrape_configs:
  - job_name: blackbox-http
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://shop.example.com/healthz
          - https://api.example.com/v1/status
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter.observability:9115
```

Try a probe by hand to see the output:

```console
$ curl -s 'http://localhost:9115/probe?target=https://shop.example.com/healthz&module=http_2xx' | grep -E "^probe_(success|http_status_code|duration_seconds|ssl_earliest_cert_expiry)"
probe_success 1
probe_http_status_code 200
probe_duration_seconds 0.184
probe_ssl_earliest_cert_expiry 1.7615e+09
```

## Useful alerts

```promql
# the endpoint is failing from the outside
probe_success{job="blackbox-http"} == 0

# slow responses
probe_duration_seconds{job="blackbox-http"} > 1.5

# certificate expires within 21 days
(probe_ssl_earliest_cert_expiry - time()) / 86400 < 21

# availability over 30 days, a ready-made SLI
avg_over_time(probe_success{instance="https://shop.example.com/healthz"}[30d])
```

Use `for: 2m` so one failed probe does not page anyone. The certificate alert catches expiring certificates for any host, including those managed by systems you do not control. It would have prevented a large share of all famous outages.

## Synthetic journeys

A single GET shows the site responds. A **synthetic transaction** drives a real flow: log in, search, add to cart, check out in a test account. Tools such as Grafana k6, Playwright-based monitors and cloud services (CloudWatch Synthetics, Application Insights availability tests) run them on a schedule.

```text
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 1, duration: '30s', thresholds: { checks: ['rate>0.99'] } };

export default function () {
  const r = http.get('https://shop.example.com/api/products?limit=1');
  check(r, { 'status is 200': (res) => res.status === 200, 'has items': (res) => res.json('items').length > 0 });
  sleep(5);
}
```

Use dedicated test accounts and mark the traffic so analytics and billing ignore it. Keep the journey short and stable, because a flaky synthetic check teaches the team to ignore alerts.

## Where to probe from

A probe running inside the same cluster as the service cannot see an ingress, DNS or internet-path failure. Run probes from **outside** the failure domain: a second region, another cloud, or a hosted probing service with many locations. Alert when a majority of locations fail, to avoid paging for a problem on the probe's own network.

## Incident: green dashboards, dead website

> **Incident:** At 14:05 a certificate renewal job fails silently and the certificate expires. Browsers show a full-page warning. Internal dashboards stay green because the application and the load balancer health checks use an internal plain-HTTP endpoint.

Customers could not reach the site for 50 minutes. The blackbox probe would have flagged it in two:

```console
$ echo | openssl s_client -connect shop.example.com:443 -servername shop.example.com 2>/dev/null | openssl x509 -noout -enddate
notAfter=Jun  2 14:00:00 2025 GMT
$ curl -sS -m 5 -o /dev/null -w "%{http_code}\n" https://shop.example.com/
curl: (60) SSL certificate problem: certificate has expired
```

Renew and deploy the certificate, then add the `probe_ssl_earliest_cert_expiry` alert, an external HTTPS probe on the public hostname and a warning 21 days before expiry.

## Common mistakes

- Probing only an internal health endpoint
- Probes running in the same failure domain as the service
- Paging on a single failed probe
- Synthetic tests that use real customer data or are flaky
- Forgetting certificate expiry alerts

```quiz
Q: What can blackbox monitoring detect that whitebox often cannot?
- Slow SQL queries
+ DNS, TLS and routing failures that stop requests reaching the application
- Memory leaks
- Garbage collection pauses
> A probe experiences the service as a user does.

Q: Which metric shows whether a probe succeeded?
- up
+ probe_success
- node_cpu
- http_requests_total
> The blackbox exporter reports 1 for success and 0 for failure.

Q: Why run probes from outside the cluster or region?
- To save money
+ Probes inside the failure domain cannot see failures in the path users take
- Prometheus requires it
- To avoid TLS
> Independence from the monitored system makes the signal trustworthy.

Q: How early should a certificate-expiry alert fire?
- When it expires
+ Weeks ahead, for example 21 days, so renewal problems are fixed calmly
- Never
- After customers complain
> Early warning turns an outage into a ticket.
```

```cards
Blackbox versus whitebox? :: Outside-in probes versus metrics the system reports about itself
Metric for certificate expiry time? :: probe_ssl_earliest_cert_expiry
Why add for: 2m to a probe alert? :: To avoid paging on one transient failure
What is a synthetic transaction? :: A scripted user journey run on a schedule to verify a real flow
```
