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
