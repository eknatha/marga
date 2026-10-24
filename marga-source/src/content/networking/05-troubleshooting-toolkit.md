---
title: A layered troubleshooting toolkit
minutes: 16
summary: Debug "service A cannot reach service B" in order, and learn why "connection refused" and "timed out" point to different causes.
---

The orders service cannot reach its database. The error says only "connection failed". You can guess for an hour, or you can test one layer at a time and know at each step what is working. This lesson gives you the order and the tools.

## What you will learn

- A fixed order for testing connectivity
- The difference between refused, timed out and unreachable
- How to test a TCP port without a client library
- How to confirm packet loss with `tcpdump`

## Work from the bottom up

Test each layer and stop at the first failure. Everything above a failure is irrelevant until it is fixed.

| Step | Question | Tool |
|------|----------|------|
| 1 | Does my host have an address and a route? | `ip addr`, `ip route get` |
| 2 | Can I resolve the name? | `dig +short`, `getent hosts` |
| 3 | Can I reach the host at all? | `ping`, `mtr` |
| 4 | Is the port open on that host? | `nc -zv`, `ss -tlnp` on the server |
| 5 | Does the application answer? | `curl -v`, the real client |

Note that `ping` uses ICMP, which firewalls often block even when real traffic works. A failed ping is a hint, not proof. A successful ping proves less than you think, because it says nothing about the port your application uses.

## Refused, timed out, unreachable

These three results mean different things, and recognizing them saves hours.

| Result | What happened | Likely cause |
|--------|---------------|--------------|
| **Connection refused** | The host answered with a reset | The host is up but nothing listens on that port, or it was rejected explicitly |
| **Connection timed out** | No reply at all | A firewall or security group silently dropped the packets, or the route is wrong |
| **No route to host** / **Network unreachable** | The path is not known or an intermediate router reported failure | Routing or subnet configuration |

A firewall that **drops** packets produces a timeout. A firewall that **rejects** them, or a closed port, produces a quick refusal. So *fast failure* usually means "reachable but closed" and *slow failure* usually means "blocked".

## Testing a port

```console
$ nc -zv -w 3 10.0.2.15 5432
nc: connect to 10.0.2.15 port 5432 (tcp) failed: Connection timed out
$ nc -zv -w 3 10.0.2.15 22
Connection to 10.0.2.15 22 port [tcp/ssh] succeeded!
```

`-z` scans without sending data, `-v` is verbose and `-w 3` times out after three seconds. This is sample output. Here SSH works but PostgreSQL does not, and the failure is a timeout. If `nc` is missing, Bash can test too: `timeout 3 bash -c '</dev/tcp/10.0.2.15/5432' && echo open`.

On the **server**, confirm what is actually listening:

```console
$ sudo ss -tlnp | grep 5432
LISTEN 0 244 10.0.2.15:5432 0.0.0.0:* users:(("postgres",pid=845,fd=6))
```

The database listens on `10.0.2.15:5432`, so it is not the problem. The `Local Address` column matters: a service bound to `127.0.0.1` cannot be reached from another machine whatever the firewall says.

## Watch the packets

When tools disagree, look at the wire. `tcpdump` on the **server** shows whether packets arrive.

```console
$ sudo tcpdump -ni eth0 'tcp port 5432 and host 10.0.1.12' -c 4
10:41:07.118 IP 10.0.1.12.51522 > 10.0.2.15.5432: Flags [S], seq 2812554981, win 64240, length 0
10:41:08.121 IP 10.0.1.12.51522 > 10.0.2.15.5432: Flags [S], seq 2812554981, win 64240, length 0
10:41:10.125 IP 10.0.1.12.51522 > 10.0.2.15.5432: Flags [S], seq 2812554981, win 64240, length 0
```

`[S]` is a SYN, the first packet of a TCP connection. The client keeps retrying and the server never answers with `[S.]` (SYN-ACK). If the packets show up on the server but get no reply, the **host firewall** is dropping them. If they never show up on the server at all, something *between* the machines (a network firewall, security group or routing rule) is blocking them.

## Incident: app cannot reach the database after a network change

> **Incident:** After the platform team moved the database to a new subnet, the orders app logs `connection timed out` to `10.0.2.15:5432`.

Apply the layers:

1. **Route:** `ip route get 10.0.2.15` shows a path through the gateway, so routing exists.
2. **Name:** the app uses an IP, so DNS is not involved.
3. **Port:** `nc -zv 10.0.2.15 5432` times out. A timeout, not a refusal, suggests packets are dropped.
4. **Server side:** `ss -tlnp` shows PostgreSQL listening on `10.0.2.15:5432`, so the service is healthy.
5. **Wire:** `tcpdump` on the database host shows **no SYN packets** arriving.

The packets never reach the server, so the block is between the subnets. The new database subnet's firewall rule allowed only the old application subnet. Add an allow rule from `10.0.1.0/24` to port 5432, then retest:

```console
$ nc -zv -w 3 10.0.2.15 5432
Connection to 10.0.2.15 5432 port [tcp/postgresql] succeeded!
```

You did not need to touch the application or restart anything. Writing down the evidence from each layer also gives the network team exactly what they need, so the conversation takes minutes rather than days.

## Common mistakes

- Treating a failed ping as proof the host is down
- Debugging the application before checking the network path
- Forgetting that a service listening on `127.0.0.1` is unreachable from other hosts
- Testing from your laptop instead of from the machine that has the problem

```quiz
Q: A TCP connection attempt fails immediately with "connection refused". What is the most likely cause?
- A firewall silently dropped the packets
+ The host is reachable but nothing is listening on that port
- DNS failed to resolve the name
- The TLS certificate expired
> A refusal is an active reset from the host, which means the packets arrived but the port is closed or explicitly rejected.

Q: nc -zv to a database port times out, while SSH to the same host works. What does this suggest?
- The host is powered off
+ Traffic to that port is being dropped somewhere, such as a firewall or security group
- The database password is wrong
- The DNS record is missing
> The host is reachable (SSH works), and a timeout rather than a refusal means packets to that port are silently dropped.

Q: On the server, tcpdump shows repeated SYN packets from the client and no replies. Where is the block most likely?
- On the client's DNS resolver
+ On the server itself, such as its host firewall, because the packets arrive but are not answered
- In the client application
- At the certificate authority
> Packets reaching the server prove the network path works. No answer means the server's firewall or service is not responding.

Q: A service listens on 127.0.0.1:5432. Can another machine connect to it?
- Yes, if the firewall allows it
+ No, it only accepts connections from the same machine
- Yes, but only over TLS
- Only with root
> 127.0.0.1 is the loopback address. A service bound to it is unreachable from other hosts.
```

```cards
Refused vs timed out? :: Refused means the host answered with a reset; timed out means packets were dropped with no reply
Command to test a TCP port? :: nc -zv -w 3 HOST PORT
Command to see what a server listens on? :: ss -tlnp
What does a SYN with no SYN-ACK suggest? :: The connection request arrives but is not accepted, or it is blocked on the way
```
