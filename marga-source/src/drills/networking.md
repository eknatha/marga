## Name does not resolve but the address works
level: junior
A server cannot reach an internal API by name. It can reach the same host by IP address.

```text
$ curl -sS https://api.corp.example/health
curl: (6) Could not resolve host: api.corp.example

$ curl -sS https://10.20.4.15/health -k
{"status":"ok"}

$ dig api.corp.example
;; ->>HEADER<<- opcode: QUERY, status: SERVFAIL
;; SERVER: 10.20.0.2#53(10.20.0.2)
```
? Where should you look first?
+ The DNS resolver at 10.20.0.2 and the zone for corp.example
- The TLS certificate of the API
- The API process, because it is down
- The default route on the server
why: The IP address works, so routing and the service are fine. The name fails with SERVFAIL from the configured resolver, which points to a resolver or zone problem. Test with another resolver (`dig @8.8.8.8` or the authoritative server), check the forwarders and the zone, and look at the resolver logs.

## Connection refused or timed out
level: mid
A health check from another server fails. The team is not sure whether to blame the firewall.

```text
$ curl -sS --max-time 5 http://10.20.4.15:8080/health
curl: (7) Failed to connect to 10.20.4.15 port 8080: Connection refused

# on 10.20.4.15
$ ss -tlnp | grep 8080
LISTEN 0 511 127.0.0.1:8080  0.0.0.0:*  users:(("app",pid=991,fd=7))
```
? What is the cause?
+ The application listens only on 127.0.0.1, so it must bind to an address reachable from other hosts
- A firewall is silently dropping packets
- DNS is returning the wrong address
- The network cable is unplugged
why: A refusal means the host answered and nothing accepted the connection on that address. A firewall that drops packets usually shows a timeout instead. `ss` shows the service is bound to the loopback address only. Change the bind address to 0.0.0.0 or the private interface, and then check the firewall rules.

## Certificate chain error
level: mid
Browsers accept a site but a command-line client and a Java service reject it.

```text
$ curl https://shop.example.com
curl: (60) SSL certificate problem: unable to get local issuer certificate

$ openssl s_client -connect shop.example.com:443 -servername shop.example.com </dev/null 2>/dev/null | grep -E "^ ?[0-9] s:|verify"
 0 s:CN = shop.example.com
Verify return code: 21 (unable to verify the first certificate)
```
? What is the likely fix?
+ Configure the server to send the full chain, including the intermediate certificate
- Turn off certificate verification in the clients
- Renew the certificate with a shorter validity
- Change the TLS port
why: Only the leaf certificate (depth 0) is sent. Browsers can fetch missing intermediates, but many clients cannot. Install the certificate file that contains the leaf followed by the intermediate(s), and test again with `openssl s_client`. Disabling verification removes the protection that TLS gives.

## Name resolves in one place and not another
level: mid
A service reaches a database by name from a laptop, but not from a server in the cloud network.

```text
laptop$ dig +short db.internal.example.com
10.20.4.15

server$ dig db.internal.example.com
status: NXDOMAIN
server$ cat /etc/resolv.conf
nameserver 8.8.8.8
```
? What is the most likely cause?
+ The server uses a public resolver which does not know the private zone. Point it at the resolver for the private network
- The database is down
- The port is blocked by a firewall
- The certificate has expired
why: NXDOMAIN is an answer from a resolver that does not know the name. The laptop uses the corporate resolver, which serves the internal zone. The server asks 8.8.8.8, which cannot. In the cloud, use the VPC resolver or a private hosted zone that is associated with the network.

## Intermittent timeouts through a load balancer
level: senior
Some requests to a service time out after exactly 60 seconds. Short requests are fine.

```text
$ curl -sS -m 120 https://api.example.com/export
curl: (52) Empty reply from server   (after 60.0 s)

Load balancer idle timeout: 60 s
Backend processing time for /export: 90 s
```
? What is the best fix?
+ Make long work asynchronous, or send data in the connection before 60 seconds, or raise the idle timeout above the processing time on purpose
- Add more backend servers
- Disable TLS
- Reduce the DNS TTL
why: The load balancer closes a connection that has had no traffic for 60 seconds, and the export is silent for 90 seconds. More servers do not change that. The cleaner design is to start the job and let the client poll or receive a callback. Otherwise raise the idle timeout, and make sure the backend timeout is longer than the one on the balancer.
