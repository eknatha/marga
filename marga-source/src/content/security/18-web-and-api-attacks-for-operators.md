---
title: Web and API attacks every operator should know
minutes: 13
summary: Recognize injection, broken access control, SSRF and abuse of APIs from logs and defend with input handling, authorization checks and edge controls.
---

You do not need to write exploits to defend against them. Knowing how the common attacks work tells you what to look for in logs, what to harden and what to ask of the code.

## What you will learn

- Injection and parameterized queries
- Broken access control and IDOR
- Server-side request forgery and cloud metadata
- Logs, rate limits and edge controls

## Injection

```python
# unsafe: user input becomes SQL
cur.execute(f"SELECT * FROM users WHERE email = '{email}'")

# safe: parameters are data, never code
cur.execute("SELECT * FROM users WHERE email = %s", (email,))
```

In logs it looks like requests containing quotes, `UNION SELECT`, `../` or shell characters. Prevent it with parameterized queries, input validation and least-privilege database accounts.

## Broken access control

The most common serious flaw is a missing check that a user may access an object. In an **IDOR**, changing `/api/orders/1041` to `/api/orders/1042` returns someone else's order. Every request must check on the server that the caller is allowed to access that object. Look for one account requesting many sequential identifiers.

## SSRF

A feature that fetches a URL for the user, such as image import or webhooks, can be abused to reach internal services and the cloud metadata address `169.254.169.254`.

```bash
# require the metadata token on AWS and block links that point to it from workloads
aws ec2 modify-instance-metadata-options --instance-id i-0abc --http-tokens required --http-put-response-hop-limit 1
```

Validate destinations against an allowlist, block private and link-local ranges after DNS resolution, and limit outbound traffic with egress rules.

## Operate

```bash
awk '$9==401||$9==403 {print $1}' access.log | sort | uniq -c | sort -nr | head
grep -E "(union.*select|\.\./|<script)" -i access.log | head
```

Apply rate limits, a web application firewall in front of the application, strong authentication and monitoring of authorization failures. Treat repeated 401 and 403 responses from one source as a signal.

## Incident: Sequential order numbers

> **Incident:** One account downloaded thousands of other customers' orders.

```console
GET /api/orders/20411 200 user=acct-882
GET /api/orders/20412 200 user=acct-882
3400 sequential requests in 9 minutes
```

The API checked that the user was logged in but not that the order belonged to them. A log alert on one account reading many identifiers caught it. The team added an ownership check in the data layer, tests for object access and per-account rate limits.

## Common mistakes

- Checking authentication but not object ownership
- Building queries by string concatenation
- Letting servers fetch any URL
- No alerts on repeated authorization failures

```quiz
Q: What prevents SQL injection best?
+ Parameterized queries
- Longer passwords :: No.
- More servers :: No.
- Hiding errors :: No.
> Input is treated as data.

Q: What is an IDOR?
+ Accessing objects by changing an identifier
- A DNS flaw :: No.
- A slow query :: No.
- A port scan :: No.
> Missing ownership checks.

Q: What can SSRF reach?
+ Internal services and metadata
- Only the browser :: No.
- Only the CDN :: No.
- Nothing :: No.
> The server makes the request.

Q: What helps detect abuse?
+ Rate limits and log alerts
- Bigger logs :: No.
- No monitoring :: No.
- Shorter tokens :: No.
> Visibility and limits.
```

```cards
Injection :: Untrusted input interpreted as code
IDOR :: Insecure direct object reference
SSRF :: Server-side request forgery
WAF :: Web application firewall
```
