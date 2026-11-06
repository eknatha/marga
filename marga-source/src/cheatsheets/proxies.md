---
title: Reverse proxies and load balancers
summary: nginx and HAProxy basics, the status codes you will see, timeouts, health checks and a debugging order for 502 and 504.
module: proxies
---

## Test and reload safely

```bash
nginx -t                       # syntax and file check, never reload without it
nginx -T | less                # print the full effective configuration
nginx -s reload                # graceful reload, old workers finish their requests
tail -f /var/log/nginx/error.log
```

## A minimal reverse proxy

```nginx
upstream app {
    server 10.0.2.14:8080 max_fails=3 fail_timeout=10s;
    server 10.0.2.15:8080;
    keepalive 32;
}
server {
    listen 443 ssl;
    server_name shop.example.com;
    location / {
        proxy_pass http://app;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 3s;
        proxy_read_timeout 30s;
    }
}
```

## Status codes from the proxy

| Code | Meaning | First check |
|------|---------|-------------|
| 502 | No valid answer from the upstream | Error log: connection refused or reset |
| 503 | No healthy upstream or limit reached | Health checks, connection limits |
| 504 | Upstream too slow | Backend latency, database, timeouts |
| 429 | Rate limit applied | Limit settings and client behaviour |

## Look from outside and inside

```bash
curl -sI https://shop.example.com | head -5
curl -s -o /dev/null -w '%{http_code} %{time_connect} %{time_starttransfer}\n' https://shop.example.com/
ss -ltnp | grep -E ':80|:443|:8080'
openssl s_client -connect shop.example.com:443 -servername shop.example.com </dev/null | openssl x509 -noout -dates
```

## HAProxy essentials

```bash
haproxy -c -f /etc/haproxy/haproxy.cfg     # validate configuration
echo "show stat" | socat stdio /run/haproxy/admin.sock | cut -d, -f1,2,18
```

## Debugging order

1. Read the error log line and note the upstream address and error text.
2. Connect to the backend from the proxy host with curl.
3. Check backend health, CPU, database and connection pools.
4. Review the last change: deploy, configuration, certificate.
5. Turn off risky retries, add limits, fix the slow dependency, then tune timeouts.

## Safe changes

```bash
nginx -t && nginx -s reload
```

```bash
curl -sv -H 'Host: app.example.com' http://127.0.0.1/ -o /dev/null
```

```bash
curl -sI https://app.example.com | grep -i 'strict-transport\|server'
```

```bash
haproxy -c -f /etc/haproxy/haproxy.cfg
```

> **Warning:** Always run `nginx -t` before a reload. A bad config makes the reload fail, and a restart instead of a reload drops live connections.

> **Warning:** A trailing slash in `proxy_pass` changes the path sent to the backend. Test one URL by hand after every change.

> **Danger:** Never cache responses that carry cookies or `Authorization` headers without a key that separates users. One user can see another user's page.

> **Warning:** Retrying non-idempotent requests (POST) on a timeout can charge or create twice. Limit `proxy_next_upstream` to safe methods.
