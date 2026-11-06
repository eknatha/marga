---
title: HAProxy: frontends, backends and ACLs
minutes: 13
summary: Configure HAProxy with frontends, backends, ACL-based routing, stick tables and health checks, and read its statistics.
---

HAProxy is built for balancing. Its configuration is explicit and its runtime tooling is excellent. Learning its four section types and how ACLs route lets you read any HAProxy file.

## What you will learn

- The sections of an HAProxy configuration
- ACLs and routing with use_backend
- Health checks, rise and fall
- The stats page and runtime socket

## Sections

```haproxy
global
    maxconn 20000
    log /dev/log local0
defaults
    mode http
    timeout connect 3s
    timeout client  30s
    timeout server  30s
    option httplog
frontend web
    bind :443 ssl crt /etc/haproxy/certs/
    acl is_api path_beg /api/
    acl is_admin hdr(host) -i admin.example.com
    use_backend api  if is_api
    use_backend admin if is_admin
    default_backend site
backend site
    balance roundrobin
    option httpchk GET /healthz
    server s1 10.0.1.11:8080 check inter 2s rise 2 fall 3
    server s2 10.0.1.12:8080 check inter 2s rise 2 fall 3
backend api
    balance leastconn
    server a1 10.0.2.11:9000 check
```

`global` is process-wide, `defaults` sets shared values, `frontend` accepts connections and `backend` holds servers. An **ACL** is a named test (path starts with /api/, host equals admin.example.com); `use_backend ... if` applies it. `rise 2 fall 3` means two good checks to enter rotation and three bad ones to leave, which avoids flapping.

## Live state

The stats page shows each server's status, sessions, queue and error counts. The **runtime socket** lets you change state without a reload:

```console
$ echo "set server site/s1 state drain" | socat stdio /run/haproxy/admin.sock
$ echo "show servers state site" | socat stdio /run/haproxy/admin.sock
```

**Stick tables** store per-client counters (requests, errors) in memory, usable for rate limiting and stickiness.

```diagram
title: How HAProxy routes a request
node: bind | Frontend | 0 | 0 | Accepts the connection and terminates TLS. | A wrong bind or certificate path stops all traffic.
node: acl | ACLs | 1 | 0 | Name tests on host, path, header or source. | An ACL that is too broad sends traffic to the wrong backend.
node: be | Backend | 2 | 0 | Chooses a server using the balance method and health. | If all servers are down, requests get 503.
node: srv | Server | 3 | 0 | Answers the request. | A slow server fills the queue; watch queue depth.
node: stats | Stats and runtime socket | 2 | 1 | Show live status and allow drain without reload. | Expose it only to admins; it can change state. | observe
edge: bind | acl
edge: acl | be
edge: be | srv
edge: be | stats
```

## Incident: The 503 on every request

> **Incident:** After a deploy all servers failed health checks and HAProxy answered 503 for every request.

```console
$ echo "show servers state site" | socat stdio /run/haproxy/admin.sock
site s1 10.0.1.11 srv_op_state=0 (L7STS 404)
site s2 10.0.1.12 srv_op_state=0 (L7STS 404)
haproxy: backend site has no server available!
```

The new release moved the health endpoint from /health to /healthz, so the check got 404 and marked every server down. The fix was to update the check path, and the team added the health path to the release checklist and a canary server.

## Common mistakes

- Health check path that differs from the real endpoint
- Setting fall to 1, which causes flapping
- Exposing the admin socket or stats page publicly
- Reloading for a change the runtime socket can make

```quiz
Q: What does an ACL do?
+ Names a test used for routing decisions
- Starts a server :: No.
- Encrypts traffic :: No.
- Reads logs :: No.
> ACLs feed use_backend rules.

Q: What does rise 2 fall 3 mean?
+ Two good checks to enter, three bad to leave
- Two servers, three backends :: No.
- Two seconds, three seconds :: No.
- Two retries, three timeouts :: No.
> It dampens flapping.

Q: How can you drain a server without reload?
+ Use the runtime socket to set state drain
- Delete the config :: No.
- Reboot :: No.
- Change DNS :: No.
> The socket changes live state.

Q: What does a stick table store?
+ Per-client counters in memory
- TLS keys :: No.
- Logs on disk :: No.
- Backups :: No.
> Used for limits and stickiness.
```

```cards
Frontend :: An HAProxy section that accepts client connections
Backend :: An HAProxy section that holds servers
ACL :: A named test on a request
Stick table :: In-memory per-key counters
Runtime socket :: A control interface to change live state
```
