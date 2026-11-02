---
title: Debugging network problems layer by layer
minutes: 15
summary: Work up the stack from link to DNS, routing, ports and TLS with ping, dig, curl, ss and traceroute, so you can say exactly which layer is broken.
---

"The network is down" is rarely true. Usually one layer fails while the others work: a name does not resolve, a port is filtered, a certificate has expired, or a route is missing. Testing one layer at a time turns a vague complaint into a specific finding.

## What you will learn

- A bottom-up checklist: link, address, route, DNS, port, TLS, application
- What each of `ip`, `ping`, `dig`, `traceroute`, `ss`, `curl` and `tcpdump` proves
- How to separate "cannot resolve" from "cannot connect" from "connected but wrong answer"

## The ladder

| Layer | Question | Command |
|-------|----------|---------|
| Link and address | Do I have an address? | `ip addr`, `ip link` |
| Route | Is there a path out? | `ip route`, `traceroute -n host` |
| Name | Does the name resolve? | `dig +short host`, `resolvectl query host` |
| Port | Can I reach the port? | `nc -vz host 443`, `curl -v telnet://host:443` |
| TLS | Is the certificate valid? | `openssl s_client -connect host:443 -servername host` |
| Application | Does it answer correctly? | `curl -sv https://host/health` |

## One request, step by step

```console
$ dig +short api.example.com
203.0.113.25
$ nc -vz 203.0.113.25 443
Connection to 203.0.113.25 443 port [tcp/https] succeeded!
$ curl -sv https://api.example.com/health -o /dev/null 2>&1 | grep -E "subject|expire|HTTP/"
*  subject: CN=api.example.com
*  expire date: Oct  3 00:00:00 2026 GMT
< HTTP/2 503
```

The name resolves, the port opens, the certificate is valid, and the server answers 503. The network is healthy; the application behind it is not. Without the ladder you might have spent an hour on firewalls.

## Reading failures

- **Could not resolve host** means DNS. Check `/etc/resolv.conf`, try `dig @8.8.8.8`, and compare.
- **Connection timed out** usually means a firewall or security group silently drops packets, or no route exists.
- **Connection refused** means the host answered and nothing listens on that port.
- **Certificate errors** mean expiry, wrong name, or a missing intermediate certificate.

## Look at the packets

```bash
sudo tcpdump -ni any host 203.0.113.25 and port 443 -c 20
ss -tan state syn-sent         # connections stuck waiting for a reply
ss -ltnp                       # what is listening locally, and which process owns it
```

Many `SYN-SENT` entries with no reply point to filtering or a dead target. A server that shows `LISTEN` on `127.0.0.1:8080` only will refuse outside traffic even though the service is "up".

```predict
Q: curl to a host shows "Connection refused" immediately, while another host shows "Connection timed out" after 30 seconds. Which one has a firewall dropping packets?
???
The timeout. A refusal means a reachable host rejected the port; a timeout means packets were dropped or lost.
> A reset is a reply, so the path works. Silence is what a dropping firewall, security group or missing route looks like.
```

```diagram
title: Debugging order for a failing connection
node: addr | Address and link | 0 | 1 | ip addr shows whether the host has an address and the interface is up. | No address means DHCP or interface trouble, and everything above fails.
node: route | Route | 1 | 1 | ip route and traceroute show the path toward the target. | A missing default route or wrong gateway sends packets nowhere.
node: dns | DNS | 2 | 0 | dig turns the name into an address. | A wrong or stale answer sends clients to the wrong place.
node: port | Port and firewall | 2 | 2 | nc and ss show whether the port answers. | Security groups and filters drop packets, producing timeouts.
node: tls | TLS | 3 | 1 | openssl s_client checks the certificate and name. | An expired or mismatched certificate fails after the connection opens.
node: app | Application | 4 | 1 | curl shows the real status code and body. | The network may be fine while the service returns errors.
edge: addr | route
edge: route | dns
edge: route | port
edge: dns | tls
edge: port | tls
edge: tls | app
```

## Incident: DNS that worked for some

> **Incident:** After a migration, half of the users reach the new service and half still land on the old one.

```console
$ dig +short shop.example.com @ns1.example.net
203.0.113.40
$ dig +short shop.example.com @8.8.8.8
198.51.100.9
$ dig shop.example.com | grep -A1 "ANSWER SECTION"
shop.example.com.   86400  IN  A  198.51.100.9
```

The authoritative server had the new address, but the record carried a 24-hour TTL, so resolvers kept serving the old one. The team lowered the TTL a day before the next migration, and verified with both authoritative and public resolvers.

## Common mistakes

- Testing only with `ping`, which may be blocked while the service works
- Forgetting that the service might listen on localhost only
- Ignoring DNS caches and TTL
- Changing firewall rules before proving which layer fails

```quiz
Q: "Connection refused" tells you which of these?
- Packets were silently dropped :: Silent drops produce a timeout, not a refusal.
+ The host answered, but nothing accepts connections on that port
- DNS failed :: DNS failure gives "could not resolve host".
- The certificate expired :: That error appears after a connection is made.
> A refusal is an active reset from the target, so the path works.

Q: Which command shows what is listening on local ports and which process owns them?
- dig :: dig queries DNS.
- traceroute :: It shows hops, not local listeners.
+ ss -ltnp
- curl :: curl is a client and does not list listeners.
> ss -ltnp lists listening TCP sockets and their processes.

Q: Users report that some reach the old service after a DNS change. What is the most likely cause?
- A broken cable :: A cable fault would affect everyone.
+ Resolvers are caching the old record until its TTL expires
- TLS is disabled :: TLS does not decide which address is returned.
- The CPU is overloaded :: Load does not split users between addresses.
> Cached answers live as long as the TTL allows, so lower it before planned moves.

Q: A curl to a host times out after 30 seconds. What is the most useful next step?
- Reinstall curl :: The client is not the problem.
- Restart the browser :: It would not change a dropped packet.
+ Check routes and firewall or security group rules, and test with nc or tcpdump
- Clear the DNS cache :: A timeout after resolution is not a DNS failure.
> Timeouts point to filtering or routing, so test the path and port directly.
```

```cards
Refused versus timed out? :: Refused: host replied no. Timed out: nothing came back
Which command checks a certificate from the shell? :: openssl s_client -connect host:443 -servername host
How do you query one DNS server directly? :: dig name @server
What does a service on 127.0.0.1 mean? :: Only local clients can reach it
Debug order? :: Address, route, DNS, port, TLS, application
```
