---
title: Networking in the kernel: sockets, queues and conntrack
minutes: 14
summary: Understand sockets, listen queues, TCP states and connection tracking, and use ss and conntrack to find connection problems.
---

When a service drops connections, applications often see only timeouts. The truth is in the kernel: full accept queues, sockets stuck in TIME_WAIT, exhausted ports, or a connection table that is full. A small set of commands shows these structures directly, and a few kernel parameters control them.

## What you will learn

- Sockets, ports and the listen and accept queues
- Read ss output and TCP states
- Port exhaustion, TIME_WAIT and keepalives
- Netfilter and conntrack, and what happens when the table fills

## Sockets and queues

A **socket** is the kernel object behind a connection. A server calls `listen`, and incoming connections wait in a queue until the application calls `accept`. If the application is slow, the queue fills (its size is limited by the backlog argument and `net.core.somaxconn`), and new connections are dropped or delayed, so clients see timeouts although the server appears fine.

```bash
ss -ltn
State   Recv-Q  Send-Q  Local Address:Port
LISTEN  129     128     0.0.0.0:8080
```

For listening sockets, `Recv-Q` is the current accept queue length and `Send-Q` its maximum. Here 129 is above 128: the queue is overflowing.

## TCP states with ss

```bash
ss -s
ss -tan state established | wc -l
ss -tan state time-wait | wc -l
ss -tanp | grep :5432 | head
ss -ti dst 10.0.1.20
```

`ss` replaces `netstat`. States to know: `ESTABLISHED` (active), `SYN-SENT` (connecting, no answer yet), `SYN-RECV`, `TIME-WAIT` (closed connection kept briefly to catch late packets; large numbers are normal on busy clients) and `CLOSE-WAIT` (the remote side closed but **your application has not closed the socket**: a bug when it piles up). `-p` shows the process, `-i` shows TCP internals such as retransmissions and round-trip time.

## Ports and timeouts

A client uses one local port per connection to the same destination. The range comes from `net.ipv4.ip_local_port_range` (often about 28,000 ports). A client making many short connections to one server can run out, giving `Cannot assign requested address`. The cure is connection reuse (keep-alive, pooling), not simply a bigger range. Keepalive settings (`net.ipv4.tcp_keepalive_time`) control how long idle connections are probed; load balancers and NAT devices drop idle connections silently, so applications should use their own keepalive or shorter timeouts.

## Netfilter and conntrack

Firewall rules and NAT (iptables, nftables, Kubernetes service routing) rely on **connection tracking**: the kernel remembers every flow in a table.

```bash
sudo conntrack -L | head
sudo conntrack -C
sysctl net.netfilter.nf_conntrack_max
dmesg -T | grep conntrack
```

If `conntrack -C` approaches `nf_conntrack_max`, new connections are dropped with `table full` in the kernel log. Fixes: raise the limit (it costs memory), shorten timeouts for UDP and closed flows, avoid tracking traffic that does not need it, and reduce connection churn. On busy NAT gateways and Kubernetes nodes this is a classic cause of mysterious packet loss.

```predict
Q: ss -ltn shows Recv-Q 129 and Send-Q 128 on port 8080. What is happening?
???
The accept queue is full: the application is not calling accept fast enough, so connections are dropped or delayed. Look at app threads, CPU and the backlog.
> Recv-Q above Send-Q on a listener means overflow.
```

## Incident: Thousands of CLOSE_WAIT

> **Incident:** A service gradually stopped accepting new work and file descriptors ran out.

```console
$ ss -tan state close-wait | wc -l
28450
$ ls /proc/$(pidof orders)/fd | wc -l
65530
$ ss -tanp state close-wait | head -2
CLOSE-WAIT 1 0 10.0.2.15:41222 10.0.9.3:5432 users:(("orders",pid=4121,fd=311))
```

The application did not close database connections after errors, so the sockets stayed in CLOSE_WAIT until the process ran out of file descriptors. The fix closed connections in a finally block, used a pool with limits and idle timeouts, and added alerts on CLOSE_WAIT count and open descriptors.

## Common mistakes

- Blaming the network for application accept delays
- Treating TIME_WAIT as a bug
- Ignoring CLOSE_WAIT build-up
- Raising conntrack limits without checking memory

```quiz
Q: What does a growing number of CLOSE_WAIT sockets suggest?
+ The application is not closing sockets after the peer closed them
- The network cable is bad :: No.
- DNS is down :: No.
- The firewall is off :: No.
> A bug in the application.

Q: What does Recv-Q mean for a LISTEN socket in ss?
+ Connections waiting in the accept queue
- Bytes sent :: No.
- Packets lost :: No.
- DNS cache :: No.
> Compare with Send-Q; the lesson section explains why.

Q: Which kernel log message shows connection tracking is overloaded?
+ nf_conntrack: table full, dropping packet
- EXT4-fs error :: Filesystem.
- Out of memory :: Memory.
- link up :: Network link.
> Raise limits or reduce churn.

Q: How do you avoid ephemeral port exhaustion?
+ Reuse connections with keep-alive or pooling
- Reboot often :: No.
- Disable TCP :: No.
- Use bigger logs :: No.
> Fewer new connections; the lesson section explains why.
```

```cards
Listeners and queues :: ss -ltn
Socket summary :: ss -s
Per state :: ss -tan state close-wait
Process for socket :: ss -tanp
Tracked flows :: conntrack -L / -C
Table limit :: sysctl net.netfilter.nf_conntrack_max
```
