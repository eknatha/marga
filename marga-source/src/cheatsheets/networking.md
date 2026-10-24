---
title: Networking
summary: Addressing, DNS, HTTP and TLS checks, and the order to troubleshoot connectivity.
module: networking
---

## Inspect your host

```bash
ip -br addr                          # interfaces and addresses
ip route                             # routing table
ip route get 10.20.20.15             # which route a destination uses
ss -tulpn                            # listening TCP/UDP ports and owners
ss -s                                # socket summary
```

## CIDR quick reference

| CIDR | Addresses | Mask |
|------|-----------|------|
| `/32` | 1 | 255.255.255.255 |
| `/30` | 4 | 255.255.255.252 |
| `/28` | 16 | 255.255.255.240 |
| `/24` | 256 | 255.255.255.0 |
| `/20` | 4,096 | 255.255.240.0 |
| `/16` | 65,536 | 255.255.0.0 |
| `/8` | 16,777,216 | 255.0.0.0 |

Private ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`. Cloud providers reserve a few addresses in every subnet.

## DNS

```bash
dig +short example.com A
dig +short example.com MX
dig @8.8.8.8 example.com            # ask a specific resolver
dig +trace example.com              # follow delegation from the root
dig -x 192.0.2.10                   # reverse lookup
getent hosts example.com            # what the system resolver returns
```

| Record | Holds |
|--------|-------|
| A / AAAA | IPv4 / IPv6 address |
| CNAME | Alias to another name |
| MX | Mail servers |
| TXT | Free text (SPF, verification) |
| NS | Name servers for the zone |

## HTTP and TLS

```bash
curl -sS -o /dev/null -w "%{http_code} %{time_total}s\n" https://example.com
curl -I https://example.com
curl -v --resolve example.com:443:192.0.2.10 https://example.com
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null | openssl x509 -noout -dates -subject
```

| Status | Meaning |
|--------|---------|
| 2xx | Success |
| 301 / 302 | Redirect (permanent / temporary) |
| 401 / 403 | Not authenticated / not allowed |
| 404 | Not found |
| 429 | Rate limited |
| 502 / 503 / 504 | Bad gateway / unavailable / gateway timeout |

## Connectivity tests

```bash
ping -c 3 192.0.2.10                 # reachability
traceroute -n 192.0.2.10             # path
mtr -rwc 20 192.0.2.10               # path with loss per hop
nc -zv -w 3 192.0.2.10 5432          # is a TCP port open
tcpdump -ni eth0 port 53 -c 20       # capture a few DNS packets
```

## Troubleshooting order

1. Name resolves to the expected address? (`dig`, `getent hosts`)
2. Route exists? (`ip route get`)
3. Host reachable? (`ping`, `mtr`)
4. Port open? (`nc -zv`) - timeout means dropped, refused means nothing listening
5. Firewall rules allow it, in both directions where stateless?
6. TLS valid and trusted? (`openssl s_client`)
7. Application responds correctly? (`curl -v`)

## Firewall quick reference

```bash
iptables -S                          # list rules
nft list ruleset                     # nftables rules
ufw status verbose
firewall-cmd --list-all
```

## Name resolution and routing

```bash
dig example.com A +short
dig @1.1.1.1 example.com MX
dig +trace example.com
dig -x 93.184.216.34 +short
resolvectl status
getent hosts example.com
nslookup example.com
ip route get 8.8.8.8
ip neigh
mtr -rwzc 20 example.com
```

> **Warning:** DNS answers are cached. After you change a record, old answers live until the TTL expires, so lower the TTL before a planned change, not during it.

## Connectivity and ports

```bash
nc -zv db.internal 5432
nc -l 8080
curl -v --connect-timeout 5 https://example.com
curl -I https://example.com
curl --resolve example.com:443:10.0.0.10 https://example.com/healthz
openssl s_client -connect example.com:443 -servername example.com </dev/null | openssl x509 -noout -dates -subject
ss -ltnp
ss -tn state established '( dport = :443 )' | wc -l
nmap -p 22,80,443 10.0.0.10
```

> **Warning:** Scan only hosts and networks that you own or have written permission to test. `nmap` against other networks can break rules and trigger security alarms.

> **Warning:** `curl -k` and `--insecure` turn off certificate checks. Use them only to find a problem, never in scripts.

## Firewall and packet capture

```bash
sudo iptables -S
sudo nft list ruleset
sudo ufw status verbose
sudo firewall-cmd --list-all
sudo tcpdump -ni any host 10.0.0.10 and port 443 -c 50 -w /tmp/cap.pcap
sudo tcpdump -nn -r /tmp/cap.pcap | head
ip -s link show eth0
ethtool eth0
```

> **Warning:** Changing firewall rules over SSH can lock you out. Add an allow rule for your own session first, keep a second session open, and schedule an automatic rollback.

> **Warning:** Packet captures can contain passwords, tokens and personal data. Store them securely and delete them when the work is done.

## Cautions for network changes

> **Warning:** Changing an IP address, route or MTU on a remote host with `ip addr`, `ip route` or `ip link set` can cut your connection. Use the console or an out-of-band path for risky changes.

> **Warning:** `ip route add default` with a wrong gateway breaks all outbound traffic. Check `ip route` before and after.

> **Warning:** Overlapping CIDR ranges between VPCs, VPNs and clusters cannot be peered later. Plan address space before you create networks.

> **Warning:** Disabling reverse path filtering or turning on `ip_forward` changes how the host handles traffic. Do it only on purpose and document it.
