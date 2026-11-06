---
title: Seeing the network with ss and tcpdump
minutes: 14
summary: List sockets with ss and capture packets with tcpdump to prove whether traffic leaves, arrives and gets an answer.
---

When a service is unreachable, guessing between DNS, firewalls, routes and the application wastes time. Two commands split the problem quickly: ss tells you what the machine is listening on, and tcpdump tells you what really crosses its network interface.

## What you will learn

- Reading ss output for listeners and connection states
- Writing a tcpdump filter for a host, port and TCP flags
- What a handshake, a refusal and a timeout look like in a capture
- Capturing safely and saving a file for later

## Is it listening?

```console
$ ss -ltnp
State   Recv-Q  Send-Q  Local Address:Port   Process
LISTEN  0       511     0.0.0.0:443          users:(("nginx",pid=812))
LISTEN  0       4096    127.0.0.1:5432       users:(("postgres",pid=640))
```

`0.0.0.0:443` accepts connections on every interface; `127.0.0.1:5432` only from this machine, so a remote client can never reach that database. Flags: `-l` listening, `-t` TCP, `-n` numbers instead of names, `-p` process. For connections use `ss -tn state established`, and watch `Recv-Q` or `Send-Q` growing, which means a slow reader or writer.

## Do the packets arrive?

```console
$ sudo tcpdump -ni eth0 'host 10.0.0.9 and tcp port 5432' -c 6
10.0.0.9.51022 > 10.0.0.5.5432: Flags [S], seq 1001
10.0.0.9.51022 > 10.0.0.5.5432: Flags [S], seq 1001      (retransmit)
10.0.0.9.51022 > 10.0.0.5.5432: Flags [S], seq 1001      (retransmit)
```

A normal handshake is `[S]`, then `[S.]` from the server, then `[.]`. Repeated `[S]` with no answer means the packet is dropped before the program sees it. `[R.]` back means the port is closed and the host refused. Many retransmissions of data packets means loss somewhere on the path.

```diagram
title: Splitting a connection problem
node: client | Client sends SYN | 0 | 0 | A connection attempt leaves the client. | If nothing leaves, the problem is on the client or its route.
node: wire | tcpdump on server | 1 | 0 | Shows whether the SYN reaches the server interface. | No packet means the network path or a firewall upstream drops it. | observe
node: fw | Host firewall | 2 | 0 | Rules may drop or reject the packet before the service sees it. | A DROP rule gives silence; a REJECT gives a refusal. | security
node: listen | ss listener | 3 | 0 | Shows the service bound to the right address and port. | Bound to 127.0.0.1 only, so remote clients are refused.
node: reply | SYN-ACK back | 3 | 1 | The server answers and the handshake completes. | No reply with a listener present points at the firewall.
edge: client | wire
edge: wire | fw
edge: fw | listen
edge: listen | reply
```

## Capturing safely

Always filter: a busy interface produces thousands of packets a second. Use `-c` to limit the count, and `-w file.pcap` to save a capture that you can open in Wireshark. Do not capture on a host that handles private data unless you are allowed to, because packets contain it. TLS traffic shows addresses and sizes but not content.

## Incident: The database nobody could reach

> **Incident:** An application could not connect to a new database host, and everyone suspected the database.

```console
$ ss -ltn | grep 5432
LISTEN 0 4096 0.0.0.0:5432
$ tcpdump -ni eth0 port 5432
IP 10.0.0.9.51022 > 10.0.0.5.5432: Flags [S]   (6 times, no reply)
```

The database was listening and the SYN packets arrived, but nothing replied. A host firewall rule allowed only the old subnet. Adding the application subnet fixed the connection in a minute.

## Common mistakes

- Capturing without a filter and drowning in packets
- Testing from the same machine and trusting that remote clients behave the same
- Reading a closed port and a dropped packet as the same failure
- Leaving a capture file with private data on a shared disk

```quiz
Q: What does a listener on 127.0.0.1 mean?
+ Only local connections can reach it
- It listens on every interface :: No.
- It is UDP only :: No.
- It is a client :: No.
> Loopback is not reachable from other hosts.

Q: Repeated SYN packets with no reply suggest what?
+ The packet is dropped before the service answers
- The password is wrong :: No.
- DNS failed :: No.
- The disk is full :: No.
> A closed port would answer with RST.

Q: What does a RST reply mean?
+ The port is closed and the connection was refused
- The packet was dropped silently :: No.
- The server is overloaded :: No.
- TLS failed :: No.
> A host answers RST when nothing listens.

Q: Why use -c and a filter with tcpdump?
+ To keep the capture small and relevant
- To encrypt traffic :: No.
- To speed up DNS :: No.
- To close ports :: No.
> Unfiltered captures are huge.
```

```cards
ss :: Command that lists sockets and their states
Listener :: A socket waiting for incoming connections
SYN :: The first packet of a TCP handshake
RST :: A TCP reply that resets or refuses a connection
pcap :: A file format for saved packet captures
```
