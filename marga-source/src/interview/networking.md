## Explain the OSI model and the TCP/IP model briefly.
level: junior
The OSI model has seven layers: physical, data link, network, transport, session, presentation and application. The TCP/IP model groups them into four: link, internet (IP), transport (TCP and UDP) and application. For troubleshooting, think in layers: is the link up, does the host have an address and route, can it reach the port, and does the application respond correctly.

## What happens when you type a URL into a browser?
level: mid
The browser checks caches, then resolves the hostname through DNS to an IP address. It opens a TCP connection (three-way handshake) to port 443, performs a TLS handshake to verify the certificate and agree on keys, then sends an HTTP request. The server, often behind a load balancer or CDN, returns a response, and the browser renders it, making further requests for assets. Each step is a place a failure can hide.

## What is the difference between TCP and UDP?
level: junior
TCP is connection-oriented and reliable: it orders data, retransmits lost packets and controls congestion, at the cost of latency. UDP is connectionless with no delivery guarantee, so it is lighter and faster, which suits DNS queries, streaming and VoIP, or protocols like QUIC that build their own reliability on top.

## How does a subnet mask work? How many hosts are in a /24 and a /26?
level: junior
The mask splits an address into a network part and a host part. A /24 has 8 host bits, so 256 addresses and 254 usable hosts (network and broadcast addresses excluded). A /26 has 6 host bits, so 64 addresses and 62 usable. In clouds, some addresses are also reserved: AWS keeps five per subnet, so a /24 gives 251 usable.

## A user cannot reach a service. How do you troubleshoot step by step?
level: mid
Work up the layers. Check the address and route (`ip addr`, `ip route get`), name resolution (`dig`), reachability of the port (`nc -vz host port` or `curl -v`), then TLS (`openssl s_client`) and the application response. Compare from several places to separate client, network and server problems, and check firewalls, security groups and load balancer health at each hop. `tcpdump` settles disputes about what really crossed the wire.

## What is NAT and what problems can it cause?
level: mid
NAT rewrites addresses as packets cross a device. Source NAT lets many private hosts share one public address; destination NAT forwards inbound traffic to private hosts. Problems include broken inbound connections without rules, the connection-tracking table filling up, many clients appearing as one address to rate limiters, and protocols that embed addresses in their payloads.

## Explain how TLS provides security and how a certificate is verified.
level: mid
TLS gives encryption, integrity and server authentication. The server presents a certificate; the client checks that it is signed by a trusted certificate authority, that the hostname matches, and that it is within its validity dates and not revoked. Then both sides agree on session keys using key exchange. Common failures are expired certificates, missing intermediate certificates, wrong hostnames and clients with outdated trust stores.

## How would you design the networking for a VPC with public, private and database tiers?
level: senior
Use several availability zones, each with a public subnet for load balancers and NAT gateways, a private subnet for application servers, and an isolated subnet for databases. Route private subnets to the internet via NAT gateways, give the database subnets no internet route, and restrict traffic with security groups that reference each other (load balancer to app, app to database). Plan CIDR ranges that will not overlap with other networks you may connect later, and use endpoints to reach cloud services privately.
