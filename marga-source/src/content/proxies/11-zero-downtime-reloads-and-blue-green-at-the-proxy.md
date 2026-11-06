---
title: Zero-downtime reloads and blue-green at the proxy
minutes: 12
summary: Change proxy configuration and shift traffic between versions without dropping requests, using graceful reloads, weighted routing and drain.
---

The front door should never be closed for maintenance. Reloads, weights and drains let you change both the proxy and the services behind it while users keep working.

## What you will learn

- What a graceful reload does
- Blue-green switching and rollback
- Canary routing by weight, header or cookie
- Draining and readiness during deploys

## Graceful reload

`nginx -s reload` (or `systemctl reload nginx`) parses the new config. If it is valid, new workers start with it and old workers stop accepting new connections and exit when their current requests finish. If the new config is invalid, the old workers keep running. A **restart** would drop everything, so use reload for changes.

## Blue-green

Run two complete environments, blue (live) and green (new). Test green privately, then switch the proxy's upstream in one reload. Rollback is switching back.

```nginx
upstream app_live { server 10.0.1.11:8080; server 10.0.1.12:8080; }  # blue
upstream app_next { server 10.0.2.11:8080; server 10.0.2.12:8080; }  # green
map $http_x_canary $pool { default app_live; "1" app_next; }
server { location / { proxy_pass http://$pool; } }
```

The header route lets testers reach green through the real proxy before anyone else does.

## Canary by weight

```nginx
split_clients "${remote_addr}${http_user_agent}" $pool {
    5%  app_next;
    *   app_live;
}
```

Send 5 percent to the new version, watch error rate and latency, then 25, 50 and 100. Roll back by setting the share to zero.

```diagram
title: Shifting traffic safely
node: live | Blue (live) | 0 | 0 | The current version serving everyone. | It must stay healthy until the new version is proven.
node: next | Green (new) | 0 | 1 | The new version, tested privately first. | An untested green receives real users at the switch.
node: proxy | Proxy | 1 | 0 | A reload switches or weights the upstream. | Restarting instead of reloading drops connections.
node: watch | Error rate and latency | 2 | 0 | Compare the new version with the old at each step. | No comparison means no signal to roll back. | observe
node: back | Rollback | 2 | 1 | Return the share to blue in one reload. | A rollback that was never tested may fail when needed.
edge: proxy | live
edge: proxy | next
edge: proxy | watch
edge: watch | back
```

## Drain and readiness

Remove a server from rotation, wait for current requests to finish, then stop it. A new server should join only after its readiness check passes. In Kubernetes this is what readiness probes and preStop hooks do for you; on plain hosts you do it with the proxy's drain or weight controls.

## Incident: The restart that dropped uploads

> **Incident:** A config change applied with a service restart cut every open connection during business hours.

```console
$ systemctl restart nginx
access.log: 1042 requests ended with status 499
client: net::ERR_CONNECTION_RESET
```

Users lost uploads in progress. The team switched to nginx -t and reload for every change, and moved risky changes to a canary share first. Restart is reserved for upgrades, and happens only after drain.

## Common mistakes

- Restarting instead of reloading
- Switching all traffic at once with no way back
- Stopping a server before its requests finish
- Sending traffic to a server before it is ready

```quiz
Q: What happens to old workers on reload?
+ They finish current requests and exit
- They are killed at once :: No.
- They keep running forever :: No.
- They restart the host :: No.
> Reload is graceful. The lesson section above explains why.

Q: What is blue-green?
+ Two environments with a switch between them
- Two certificates :: No.
- Two DNS servers :: No.
- Two log files :: No.
> One is live, one is new.

Q: What does a canary share do?
+ Sends a small part of traffic to the new version first
- Doubles all traffic :: No.
- Disables TLS :: No.
- Compresses responses :: No.
> It limits the blast radius.

Q: What should happen before stopping a server?
+ Drain it
- Delete its logs :: No.
- Change DNS :: No.
- Raise the timeout :: No.
> Let requests finish.
```

```cards
Graceful reload :: Applying new config while old workers finish their requests
Blue-green :: Two environments with an atomic switch of traffic
Canary :: Sending a small share of traffic to a new version
Drain :: Stop new requests and let existing ones finish
Rollback :: Returning to the previous known good version
```
