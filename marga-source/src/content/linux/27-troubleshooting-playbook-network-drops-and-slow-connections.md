---
title: Troubleshooting playbook: network drops and slow connections on a host
minutes: 13
summary: Check a Linux host's network path in layers: interface errors, MTU, retransmits, DNS delay and connection tracking, then capture packets only when you need proof.
---

"The network is slow" is a claim, not a diagnosis. On a single host you can check each layer in a few minutes and either find the fault or hand the network team evidence that it is not on the host.

## What you will learn

- Check interface counters, link speed and drops
- Spot retransmits and MTU problems
- Separate DNS delay from connection delay
- Take a focused packet capture

## Layer by layer

Work from the bottom up. First the link and the interface:

```console
$ ip -s link show eth0
$ ethtool eth0 | grep -E 'Speed|Duplex|Link detected'
$ ethtool -S eth0 | grep -i -E 'err|drop|miss'
$ ip route get 10.0.8.5
```

Growing `errors`, `dropped` or `overruns` counters point to a cable, driver, ring buffer or overloaded interface. A link negotiated at 100 Mb/s instead of 10 Gb/s is a classic hidden fault. `ip route get` shows which interface and gateway the kernel will really use.

## Retransmits and MTU

```console
$ nstat -az | grep -i -E 'retrans|listendrops'
$ ss -ti dst 10.0.8.5 | head
$ ping -M do -s 1472 -c 3 10.0.8.5
```

A rising retransmit count means packets are lost somewhere on the path. The `ping -M do -s 1472` test forbids fragmentation: if it fails while small pings work, the path MTU is smaller than expected (tunnels, VPNs and overlay networks often reduce it), so large responses hang while small ones succeed. The fix is to set the right MTU or clamp the TCP MSS, not to retry.

## Is it DNS?

Measure the phases separately. `curl` can print timings:

```console
$ curl -s -o /dev/null -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} total=%{time_total}\n' https://api.example.com/
dns=5.003 connect=5.021 tls=5.080 total=5.150
```

Here five seconds went to the name lookup, and the rest was fast. Check `/etc/resolv.conf` (unreachable first nameserver, long search list, timeouts), and compare `dig` against each resolver. A fixed 5-second delay is a typical resolver timeout followed by a retry.

## Connection tracking and capture

Run `conntrack -C` against `nf_conntrack_max`, and check `dmesg` for `nf_conntrack: table full`. When you need proof, capture a narrow slice:

```console
$ sudo tcpdump -i eth0 -nn -c 200 host 10.0.8.5 and port 443 -w /tmp/case.pcap
```

Filter by host and port, limit the count, and write to a file for analysis in Wireshark. Keep captures short and delete them afterwards, because they can contain sensitive data.

```predict
Q: Small requests work, but large responses hang. ping -M do -s 1472 fails. What is the likely cause?
???
A path MTU problem: packets larger than the path allows are dropped. Fix the MTU or clamp the TCP MSS.
> Test with the do-not-fragment flag.
```

## Incident: Five seconds, every time

> **Incident:** A service made calls to an internal API that took exactly five seconds now and then, while the API itself answered in 20 ms.

```console
$ curl -s -o /dev/null -w 'dns=%{time_namelookup} total=%{time_total}\n' http://billing.internal/health
dns=5.002 total=5.030
$ cat /etc/resolv.conf
nameserver 10.0.0.2
nameserver 10.0.0.3
```

The first nameserver had been decommissioned. Every lookup waited five seconds for it to time out, then used the second one. The team removed the dead address, added the resolver health to their checks and set `options timeout:1 attempts:2` as a safety net. No network change was needed.

## Common mistakes

- Blaming the network without measuring DNS, connect and TLS time
- Ignoring MTU on tunnels and overlays
- Capturing everything and filling the disk
- Leaving packet captures with sensitive data lying around

```quiz
Q: What does a rising retransmit counter suggest?
+ Packets are being lost on the path
- The disk is full :: Unrelated.
- A wrong time zone :: Unrelated.
- Too many users :: Not directly.
> Lost packets are resent.

Q: Which test finds a path MTU problem?
+ ping with the do-not-fragment flag and a large size
- ping with the default size :: It may pass.
- df -h :: Disk only.
- uptime :: Unrelated.
> A big packet that cannot fragment shows the limit.

Q: A request shows dns=5.0 seconds and everything else fast. Where is the fault?
+ In name resolution, such as a dead nameserver
- In the TLS certificate :: The TLS time was small.
- In the web server code :: Total time after DNS was fast.
- In the disk :: Unrelated.
> Time the phases separately.

Q: How should you take a packet capture?
+ Narrow by host and port, limit the size, and delete it afterwards
- Capture all traffic indefinitely :: It fills the disk and exposes data.
- Share it publicly :: It may contain secrets.
- Skip filters :: Too much noise.
> Targeted and temporary.
```

```cards
ip -s link :: interface errors and drops
MTU test :: ping -M do -s 1472 host
curl -w timings :: split dns, connect, tls and total
resolv.conf trap :: a dead first nameserver adds timeouts
tcpdump :: filter by host and port, write to a file
```
