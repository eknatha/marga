---
title: Firewalls and load balancing
minutes: 16
summary: Write safe firewall rules, understand security groups, and diagnose load balancers that mark healthy servers as down.
---

Two jobs share one lesson because they sit in the same place: in front of your servers, deciding which traffic gets through and where it goes. A firewall rule that is one line out of order can lock you out of a machine. A load balancer health check that expects the wrong response can take a healthy service out of rotation. Both are easy to reason about once you see how they decide.

## What you will learn

- Stateful versus stateless filtering
- A safe order for host firewall rules
- How cloud security groups differ from network ACLs
- How load balancers choose backends and check their health

## Firewall basics

A firewall matches packets against rules and applies an action: accept, drop (silently discard) or reject (discard and tell the sender). Two ideas matter most.

- **Stateful** firewalls track connections. If you allow an outbound request, the reply is allowed automatically. Most host firewalls and cloud security groups work this way.
- **Stateless** filters evaluate each packet alone, so you must allow both directions explicitly. Cloud network ACLs behave like this.

Use **default deny**: block everything, then allow only what you need.

```bash
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT   # replies and related traffic
sudo iptables -A INPUT -i lo -j ACCEPT                                         # local loopback
sudo iptables -A INPUT -p tcp --dport 22  -j ACCEPT                            # SSH
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT                            # HTTPS
sudo iptables -P INPUT DROP                                                    # set default deny LAST
```

**Order matters.** Rules are checked from the top and the first match wins. The default policy `DROP` goes last so that you never close the door before you have allowed yourself back in. On Ubuntu, `ufw` expresses the same ideas more simply:

```bash
sudo ufw default deny incoming
sudo ufw allow 22/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

> **Warning:** When you change firewall rules over SSH, schedule an automatic rollback first, for example `echo 'sudo iptables-restore < /root/rules.good' | at now + 5 minutes`, and cancel it once you have confirmed you can still log in.

## Cloud equivalents

| Concept | AWS | Azure |
|---------|-----|-------|
| Instance-level, stateful rules | Security group | Network security group (NSG) on NIC or subnet |
| Subnet-level rules | Network ACL (stateless) | NSG attached to a subnet (stateful) |
| Rule evaluation | Security group: all allow rules together. NACL: numbered, lowest first | NSG: priority number, lowest first |

A common pattern is to reference **groups instead of addresses**: allow the database's port from "the app security group" rather than from an IP range. New app instances then get access automatically.

## Load balancers

A **load balancer** spreads requests over several backends and removes failed ones.

| Type | Works on | Good for |
|------|----------|----------|
| Layer 4 (TCP/UDP) | Addresses and ports | Raw speed, non-HTTP protocols |
| Layer 7 (HTTP) | Paths, headers, cookies | Routing `/api` and `/static` separately, TLS termination |

Common algorithms are round robin, least connections and hashing on the client address. **Health checks** are central: the balancer probes each backend and sends traffic only to those that pass.

A basic nginx reverse proxy shows the idea:

```nginx
upstream shop_api {
    least_conn;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=10s;
    server 10.0.1.12:8080 max_fails=3 fail_timeout=10s;
}

server {
    listen 443 ssl;
    server_name shop.example.com;

    location / {
        proxy_pass http://shop_api;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }
}
```

Because the balancer terminates TLS and forwards plain HTTP, backends see the balancer's address. `X-Forwarded-For` carries the original client address so logs and rate limits stay meaningful.

## Incident: all backends marked unhealthy after a release

> **Incident:** The load balancer reports 0 healthy targets and returns 503 to users. The application is running on both servers and serves real traffic directly.

Test the health check the way the balancer does it:

```console
$ curl -I http://10.0.1.11:8080/health
HTTP/1.1 301 Moved Permanently
Location: https://10.0.1.11:8080/health
```

The release added a rule redirecting all HTTP to HTTPS. The balancer's health check expects `200 OK` and treats the `301` as a failure, so it marked every backend down at once. The application itself was fine. Choose one of two fixes: configure the health check to use a path excluded from the redirect, or let the backend answer `/health` over plain HTTP. Then confirm:

```console
$ curl -s -o /dev/null -w '%{http_code}\n' http://10.0.1.11:8080/health
200
```

Two lessons carry over. Health checks should test **what the balancer can actually reach** with a simple, cheap endpoint, and they should **fail on real problems only**. A health endpoint that checks every dependency can take the whole fleet down when one dependency slows, so decide what "healthy" means on purpose.

## Common mistakes

- Setting the default policy to DROP before allowing SSH
- Allowing access by broad address ranges instead of by group
- Health checks that follow redirects or require authentication
- Losing the client IP because `X-Forwarded-For` is not passed through

```quiz
Q: Why should the default DROP policy be set last when building iptables rules over SSH?
- DROP rules are slower if added first
+ Setting it first would cut your own session before the allow rules exist
- iptables requires alphabetical order
- It makes the rules permanent
> Rules are processed in order. Allow SSH and established traffic first, then enable the default deny.

Q: What is the main difference between a stateful and a stateless firewall?
- Stateful firewalls are always faster
+ A stateful firewall tracks connections so replies are allowed automatically, while a stateless one needs rules for both directions
- Stateless firewalls cannot block anything
- Stateful firewalls only work with IPv6
> Connection tracking lets a stateful device allow return traffic for allowed requests.

Q: A health check receives 301 from every backend and marks them unhealthy. What is the best fix?
- Disable health checks
+ Point the check at a path that returns 200 without redirecting
- Increase the timeout to 10 minutes
- Restart the load balancer
> Health checks need a direct success response. A redirect is not a 200, so the backend fails the check.

Q: What does X-Forwarded-For carry?
- The backend's address
+ The original client's address, preserved by the proxy
- The TLS certificate
- The request method
> Without it, backends only see the proxy's address and cannot identify clients.
```

```cards
Default deny means? :: Block everything and allow only what is needed
What does stateful filtering do? :: Tracks connections so replies to allowed requests are allowed automatically
Layer 4 vs layer 7 load balancing? :: L4 routes on addresses and ports; L7 routes on HTTP details such as path and headers
What should a health check test? :: A simple, cheap endpoint that proves the backend can serve traffic
```
