---
title: Latency, bandwidth, MTU and network performance
minutes: 14
summary: Separate latency from bandwidth, understand TCP behaviour on slow or lossy links, find MTU problems and measure throughput with the right tools.
---

"The network is slow" can mean a long round trip, a small pipe, packet loss, or a packet size problem. Each looks different and has a different fix. Learning to separate them saves days of guessing, especially for traffic between regions, through VPNs and across tunnels.

## What you will learn

- The difference between latency, bandwidth and throughput
- Why a high round trip time limits a single TCP connection
- Packet loss and its effect
- MTU, fragmentation and "black hole" connections
- Tools: `ping`, `mtr`, `iperf3`, `ss -ti`, `curl` timings

## Latency and bandwidth

**Latency** is how long a packet takes; **round trip time (RTT)** is there and back. Light in fibre travels roughly 200 km per millisecond, so London to Singapore cannot be below about 85 ms RTT, whatever you pay for. **Bandwidth** is how much can be sent per second. A pipe can be wide and still slow to answer, like a motorway to a distant city.

A TCP connection can have only a window of data in flight at once. Throughput is roughly `window / RTT`. With a 64 KB window and 100 ms RTT, one connection reaches about 5 Mbit/s, even on a gigabit link. Modern systems scale windows automatically, but loss and small buffers still limit long-distance transfers. Remedies: multiple parallel connections, bigger buffers, a CDN or a closer endpoint, and protocols that need fewer round trips.

## Round trips add up

Opening a secure web request over a new connection costs a TCP handshake, a TLS handshake and then the request, several round trips before the first byte. At 150 ms RTT that is nearly half a second. Connection reuse (keep-alive, HTTP/2), TLS session resumption and HTTP/3 reduce this. Count round trips before you buy bandwidth.

## Loss

Even 1 percent packet loss can cut TCP throughput a lot, because the sender slows down at each loss. Find where loss starts:

```console
$ mtr -rwzc 100 api.example.com
HOST                Loss%  Snt  Last  Avg  Best  Wrst
1. gw.local          0.0%  100   1.0  1.1   0.9   2.3
4. isp-core-2        0.0%  100  12.1 12.4  11.8  20.1
7. transit-9        18.0%  100  88.0 90.2  85.0 210.5
9. api.example.com   0.0%  100  91.0 91.3  90.1  99.7
```

Loss on a middle hop that does not continue to the destination (hop 7 above, but hop 9 is clean) is usually routers limiting their own replies, not real loss. Loss that continues to the last hop is real.

## MTU

The maximum transmission unit is the largest packet a link carries, usually 1500 bytes. Tunnels, VPNs and some cloud networks add headers, so the usable size is smaller (for example 1420 for WireGuard, or 8900 on a jumbo-frame path). If a packet is too large and cannot be fragmented, a router should send back an ICMP message "fragmentation needed"; if that message is blocked, the connection hangs when large packets are sent: small requests work, large responses stall. This is an MTU black hole.

```bash
ping -M do -s 1472 -c 3 host    # 1472 + 28 header bytes = 1500; fails if the path is smaller
ip link show dev wg0            # see the interface MTU
ss -ti dst host                 # see rtt, cwnd, retransmits for live connections
iperf3 -c server -P 4 -t 10     # measure throughput with 4 parallel streams
curl -o /dev/null -sw 'dns %{time_namelookup} connect %{time_connect} tls %{time_appconnect} first byte %{time_starttransfer}\n' https://api.example.com/
```

The fix for MTU trouble is to allow the ICMP messages, lower the MTU on the tunnel, or clamp the TCP maximum segment size on the router.

```predict
Q: SSH logs in fine over a VPN, but the session freezes when you run a command that prints a lot of output. What do you suspect?
???
An MTU problem on the VPN path: small packets pass, large ones are dropped and the needed ICMP message is blocked.
> Test with ping -M do at different sizes and lower the tunnel MTU or clamp the MSS.
```

## Incident: the VPN that only worked for small requests

> **Incident:** After a new site-to-site VPN is set up, health checks pass but file downloads between offices stall at around 1 KB.

```console
$ ping -M do -s 1472 -c 2 10.20.0.5
ping: local error: message too long, mtu=1400
```

The tunnel's MTU was 1400 and a firewall dropped the ICMP messages that tell senders to use smaller packets. The team set the MTU on both ends to 1400, clamped the TCP MSS to 1360, allowed the required ICMP types, and added a large-packet test to the VPN checklist.

## Common mistakes

- Buying bandwidth to fix a latency problem
- Testing only with small pings
- Reading loss on a middle hop as the cause
- Blocking all ICMP

```quiz
Q: A transfer between two regions with 150 ms RTT is slow on one connection although the link is fast. What often limits it?
- DNS :: Not during a transfer.
+ The amount of data that can be in flight per round trip
- Disk colour :: Meaningless.
- CPU temperature :: Unrelated.
> Throughput is limited by window size divided by RTT, and by loss.

Q: What is an MTU black hole?
+ Large packets are dropped silently because needed ICMP messages are blocked
- A full disk :: Unrelated.
- A DNS loop :: Unrelated.
- An expired certificate :: That gives an error.
> Small requests work and large ones hang.

Q: Which command checks whether a 1500-byte packet fits the path without fragmentation?
- ping host :: The default size is small.
+ ping -M do -s 1472 host
- traceroute -n :: It shows hops.
- dig host :: It does DNS.
> 1472 bytes of data plus 28 bytes of headers makes 1500.

Q: In mtr, loss at a middle hop that disappears at the final hop usually means:
- The destination is down :: The last hop is fine.
+ That router limits replies to probes and the path is not really lossy
- The cable is cut :: Then later hops would also lose.
- DNS is broken :: Unrelated.
> Only loss that persists to the destination is real.
```

```cards
Latency versus bandwidth? :: Time per packet versus amount per second
Rough TCP limit per connection? :: Window divided by RTT
What is MTU? :: The largest packet a link carries
Tool for per-hop loss? :: mtr
Tool to measure throughput? :: iperf3
```
