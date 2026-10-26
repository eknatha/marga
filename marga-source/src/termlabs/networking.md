## Fix a name that will not resolve
id: net-dns
module: networking
level: Beginner
minutes: 15
lesson: networking/dns
engine: Simulated network and shell
summary: Follow a failing web request down to a dead DNS server, and repoint the resolver.
@@ story
`curl http://shop.example.com/` fails with "Could not resolve host", yet the shop server is up. Find out why the name does not resolve, and fix it on this machine. The working DNS server in this network is 10.0.0.2.
@@ goals
- Find the cause with `cat /etc/resolv.conf`, `dig shop.example.com` and `dig @10.0.0.2 shop.example.com`.
- Make /etc/resolv.conf use the nameserver 10.0.0.2 only.
- `curl -s http://shop.example.com/` prints the shop page.
@@ hints
- Run `curl -sS http://shop.example.com/` and then `echo $?`. Exit code 6 means the name could not be resolved.
- `dig` shows which server it asked. A message such as "communications error ... timed out" points to a dead server.
- `dig @10.0.0.2 shop.example.com` asks one specific server. If that works, the problem is your resolver setting.
- Writing to /etc needs root: `echo 'nameserver 10.0.0.2' | sudo tee /etc/resolv.conf`.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "gateway": "10.0.0.1", "dns": {"10.0.0.99": {"up": false}, "10.0.0.2": {"up": true, "records": {"shop.example.com": "10.0.0.50"}}}, "hosts": {"10.0.0.50": {"up": true, "rtt": 2, "ports": {"80": "open"}, "http": {"/": {"status": 200, "body": "Welcome to the shop\n"}}}}}}
@@ file /etc/resolv.conf mode=644 owner=root
nameserver 10.0.0.99
@@ checks
[
 {"t": "contains", "path": "/etc/resolv.conf", "re": "^nameserver 10\\.0\\.0\\.2$", "label": "resolv.conf points to 10.0.0.2"},
 {"t": "contains", "path": "/etc/resolv.conf", "re": "10\\.0\\.0\\.99", "not": true, "label": "the dead server 10.0.0.99 is gone"},
 {"t": "cmd", "run": "dig +short shop.example.com", "code": 0, "out": "^10\\.0\\.0\\.50$", "label": "dig resolves shop.example.com to 10.0.0.50"},
 {"t": "cmd", "run": "curl -s http://shop.example.com/", "code": 0, "out": "Welcome to the shop", "label": "curl reaches the shop by name"}
]
@@ solution
dig shop.example.com
dig @10.0.0.2 shop.example.com
cat /etc/resolv.conf
echo 'nameserver 10.0.0.2' | sudo tee /etc/resolv.conf
curl -s http://shop.example.com/
@@ explain
The server was fine; the machine asked the wrong DNS server. When a name fails, test the layers one at a time: the name (dig), the path (ping the IP), the service (curl). Comparing `dig` with `dig @server` separates a bad record from a bad resolver setting.

## Wrong subnet mask, no gateway
id: net-gw-mask
module: networking
level: Intermediate
minutes: 20
lesson: networking/ip-addressing-and-subnets
engine: Simulated network and shell
summary: A server cannot reach its default gateway because the mask on its address is too small. Read the numbers and fix them.
@@ story
After a rebuild, this server (192.168.10.20) cannot reach anything outside its own small network, and not even its neighbour 192.168.10.100. The network team says the subnet is 192.168.10.0/24 and the gateway is 192.168.10.254. Find the mistake in the interface settings.
@@ goals
- Explain to yourself why 192.168.10.254 is not reachable with the current mask (`ip -br addr`, `ip route`).
- Give eth0 the address 192.168.10.20/24 and remove the wrong /26 address.
- `ping -c 1 192.168.10.100` and `curl -s http://203.0.113.10/` both work.
@@ hints
- `ip -br addr` shows the address with its prefix. A /26 network holds 64 addresses: 192.168.10.0 to 192.168.10.63.
- A gateway must be inside your own network. 192.168.10.254 is outside 192.168.10.0/26, so the default route cannot be used.
- Add the right address first, then remove the wrong one: `sudo ip addr add 192.168.10.20/24 dev eth0`, then `sudo ip addr del 192.168.10.20/26 dev eth0`.
- Check the result with `ip route get 203.0.113.10`. This change is not permanent on a real server; the saved network configuration must be corrected too.
@@ world
{"net": {"iface": {"name": "eth0", "ip": "192.168.10.20", "prefix": 26}, "gateway": "192.168.10.254", "hosts": {"192.168.10.100": {"up": true, "rtt": 0.8}, "203.0.113.10": {"up": true, "rtt": 24, "ports": {"80": "open"}, "http": {"/": {"status": 200, "body": "gateway ok\n"}}}}}}
@@ checks
[
 {"t": "cmd", "run": "ip -br addr", "out": "192\\.168\\.10\\.20/24", "label": "eth0 has 192.168.10.20/24"},
 {"t": "cmd", "run": "ip -br addr", "notOut": "/26", "label": "the /26 address is removed"},
 {"t": "cmd", "run": "ping -c 1 192.168.10.100", "code": 0, "label": "the neighbour 192.168.10.100 answers"},
 {"t": "cmd", "run": "curl -s -m 3 http://203.0.113.10/", "code": 0, "out": "gateway ok", "label": "the outside server answers through the gateway"}
]
@@ solution
ip -br addr
ip route get 203.0.113.10
sudo ip addr add 192.168.10.20/24 dev eth0
sudo ip addr del 192.168.10.20/26 dev eth0
ip -br addr
ping -c 1 192.168.10.100
curl -s http://203.0.113.10/
@@ explain
A host sends traffic to a gateway only if the gateway is in the host's own network. The mask decides where that network ends, so one wrong digit in the prefix can cut a server off while the rest of the configuration looks correct.

## Open a port for one network only
id: net-ufw
module: networking
level: Intermediate
minutes: 20
lesson: networking/firewalls-and-load-balancing
engine: Simulated network and shell
summary: A firewall blocks a web app. Allow one client network and keep everyone else out.
@@ story
The app `webapp` listens on port 8080, but the firewall denies everything except SSH. The team's machines are in 10.0.1.0/24 (for example `client1`, 10.0.1.50). `client2` (10.0.9.9) is in another network and must stay blocked. In this simulator `from MACHINE curl ...` runs curl as another machine so you can test from outside.
@@ goals
- `from client1 curl -s -m 3 http://10.0.1.15:8080/` prints `webapp ok`.
- `from client2 curl -s -m 3 http://10.0.1.15:8080/` still times out (exit status 28).
- The existing SSH rule for port 22 stays in place.
@@ hints
- `sudo ufw status` lists the rules. The default for incoming traffic is deny.
- Test first from both machines: `from client1 curl -s -m 3 http://10.0.1.15:8080/; echo $?`.
- A rule can name a source network: `sudo ufw allow from 10.0.1.0/24 to any port 8080 proto tcp`.
- Avoid `sudo ufw allow 8080`. It would open the port for the whole world, and client2 would get in.
@@ world
{"net": {"iface": {"ip": "10.0.1.15", "prefix": 24}, "gateway": "10.0.1.1", "clients": {"client1": {"ip": "10.0.1.50"}, "client2": {"ip": "10.0.9.9"}}, "ufw": {"active": true, "default": "deny", "rules": [{"port": 22, "proto": "tcp", "action": "allow", "from": "any"}]}}, "procs": [{"pid": 812, "user": "webapp", "cmd": "/opt/webapp/bin/webapp --port 8080", "cpu": 1.1, "mem": 2.0, "ports": [8080], "http": {"/": {"status": 200, "body": "webapp ok\n"}}}]}
@@ checks
[
 {"t": "cmd", "run": "from client1 curl -s -m 3 http://10.0.1.15:8080/", "code": 0, "out": "webapp ok", "label": "client1 (10.0.1.50) can use the app"},
 {"t": "cmd", "run": "from client2 curl -s -m 3 http://10.0.1.15:8080/", "code": 28, "label": "client2 (10.0.9.9) is still blocked"},
 {"t": "cmd", "as": "root", "run": "ufw status", "out": "22/tcp\\s+ALLOW", "label": "the SSH rule is still there"},
 {"t": "cmd", "as": "root", "run": "ufw status", "notOut": "8080/tcp\\s+ALLOW\\s+Anywhere", "label": "port 8080 is not open to everyone"}
]
@@ solution
sudo ufw status
from client1 curl -s -m 3 http://10.0.1.15:8080/
sudo ufw allow from 10.0.1.0/24 to any port 8080 proto tcp
from client1 curl -s -m 3 http://10.0.1.15:8080/
from client2 curl -s -m 3 http://10.0.1.15:8080/
@@ explain
A good firewall rule names a port and who may use it. Default deny plus narrow allow rules keeps the exposed surface small. Always test both sides: that the right client gets in, and that the wrong one does not.

## Port already in use
id: net-port-conflict
module: networking
level: Intermediate
minutes: 15
lesson: networking/troubleshooting-toolkit
engine: Simulated network and shell
summary: A service refuses to start because another process holds its port. Find the holder and free the port.
@@ story
The `webapp` service fails to start and the journal says the address is in use. A developer left a test web server running. Find which process listens on port 8080, stop only that process, and start the service.
@@ goals
- Find the process that owns port 8080.
- Stop it (it is yours; the real service must not be changed).
- `webapp` is active and `curl -s http://localhost:8080/` answers `webapp ok`.
@@ hints
- `sudo systemctl status webapp` and `journalctl -u webapp` show why the start failed.
- `ss -ltnp` lists listening sockets with the process and its pid.
- `kill PID` asks the process to stop. Check again with `ss -ltnp`.
- Then `sudo systemctl start webapp`. Do not change the port in the unit file; other systems expect 8080.
@@ world
{"services": {"webapp": {"unit": "/etc/systemd/system/webapp.service", "state": "failed", "enabled": true, "desc": "Web app", "port": 8080, "result": "exit-code", "http": {"/": {"status": 200, "body": "webapp ok\n"}}}}, "journal": {"webapp": ["Jan 05 10:02:11 lab-host webapp[1]: Starting Web app...", "Jan 05 10:02:11 lab-host webapp[1]: bind() to 0.0.0.0:8080 failed (98: Address already in use)", "Jan 05 10:02:11 lab-host webapp[1]: Failed with result 'exit-code'."]}, "procs": [{"pid": 4410, "user": "user", "cmd": "python3 -m http.server 8080", "cpu": 0.1, "mem": 0.4, "ports": [8080], "http": {"/": {"status": 200, "body": "Directory listing for /\n"}}}]}
@@ file /etc/systemd/system/webapp.service mode=644 owner=root
[Unit]
Description=Web app

[Service]
ExecStart=/opt/webapp/bin/webapp --port 8080
Restart=on-failure

[Install]
WantedBy=multi-user.target
@@ file /opt/webapp/bin/webapp mode=755 owner=root
#!/bin/sh
echo webapp
@@ checks
[
 {"t": "service", "name": "webapp", "state": "active", "label": "webapp is active"},
 {"t": "proc", "cmd": "http\\.server", "present": false, "label": "the stray test server is stopped"},
 {"t": "cmd", "run": "curl -s http://localhost:8080/", "code": 0, "out": "webapp ok", "label": "port 8080 now answers with the real app"},
 {"t": "contains", "path": "/etc/systemd/system/webapp.service", "re": "--port 8080$", "label": "the unit still uses port 8080"}
]
@@ solution
sudo systemctl status webapp
ss -ltnp
kill 4410
sudo systemctl start webapp
curl -s http://localhost:8080/
@@ explain
Only one process can listen on an address and port. Before you restart anything, find out who holds the port, and stop the right one. Changing the service's port would hide the problem and break every client that expects 8080.

## A stale hosts entry beats DNS
id: net-hosts-stale
module: networking
level: Intermediate
minutes: 15
lesson: networking/dns
engine: Simulated network and shell
summary: One tool shows the right address and another goes to the wrong server. Find the old line that overrides DNS.
@@ story
`dig api.internal.example` says 10.0.0.61, yet `curl http://api.internal.example/` fails. Somebody added a temporary line for the name months ago. Find it, remove only that line, and keep every other entry.
@@ goals
- Explain the difference: `dig` asks DNS only. `curl` uses the system resolver, which reads /etc/hosts first.
- Remove the line for api.internal.example from /etc/hosts.
- Keep the other entries (localhost and build.internal.example).
- `curl -s http://api.internal.example/` prints `api v2 ok`.
@@ hints
- Compare `dig +short api.internal.example` with `ping -c 1 api.internal.example`. The two addresses differ.
- `cat /etc/hosts` shows the override. Lines starting with # are comments.
- Delete one line by pattern: `sudo sed -i '/api\.internal\.example/d' /etc/hosts`.
- Check that the other lines are still there with `cat /etc/hosts`.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "gateway": "10.0.0.1", "dns": {"10.0.0.2": {"up": true, "records": {"api.internal.example": "10.0.0.61"}}}, "hosts": {"10.0.0.61": {"up": true, "rtt": 1.5, "ports": {"80": "open"}, "http": {"/": {"status": 200, "body": "api v2 ok\n"}}}, "10.0.0.17": {"up": false}}}}
@@ file /etc/hosts mode=644 owner=root
127.0.0.1	localhost
127.0.1.1	lab-host
# temporary, remove after migration
10.0.0.17	api.internal.example
10.0.0.30	build.internal.example
@@ checks
[
 {"t": "contains", "path": "/etc/hosts", "re": "api\\.internal\\.example", "not": true, "label": "no line for api.internal.example is left in /etc/hosts"},
 {"t": "contains", "path": "/etc/hosts", "re": "^10\\.0\\.0\\.30\\s+build\\.internal\\.example$", "label": "the build.internal.example entry is kept"},
 {"t": "contains", "path": "/etc/hosts", "re": "^127\\.0\\.0\\.1\\s+localhost$", "label": "the localhost entry is kept"},
 {"t": "cmd", "run": "curl -s http://api.internal.example/", "code": 0, "out": "api v2 ok", "label": "curl reaches the new API by name"}
]
@@ solution
dig +short api.internal.example
cat /etc/hosts
sudo sed -i '/api\.internal\.example/d' /etc/hosts
cat /etc/hosts
curl -s http://api.internal.example/
@@ explain
The order of name lookup on Linux is set in nsswitch.conf; by default /etc/hosts comes before DNS. `dig` skips that and talks to DNS only, so it can be right while applications are wrong. When tools disagree, ask which source each one uses.

## Find the slow hop
id: net-slow-hop
module: networking
level: Intermediate
minutes: 20
lesson: networking/latency-mtu-and-network-performance
engine: Simulated network and shell
summary: Read a traceroute, find where the delay starts, and record the evidence for the network team.
@@ story
Users say that `reports.example.com` is very slow. The server itself is healthy. Use traceroute to find the first hop where the time jumps, and write two lines into ~/slow-hop.txt for the network team: the hop's IP address, and the IP address that `dig` returns for the name.
@@ goals
- Line 1 of ~/slow-hop.txt: the IP of the first hop whose time is above 100 ms.
- Line 2: the address returned by `dig +short reports.example.com`.
- Only those two lines in the file.
@@ hints
- `traceroute reports.example.com` prints one line per hop with three times in milliseconds.
- Look for the line where the time jumps from a few ms to hundreds. The delay starts at that hop, not at the end of the path.
- You can read it by eye, or filter it: `traceroute reports.example.com | awk '$3+0 > 100 {print $2; exit}'`.
- Append the second value: `dig +short reports.example.com >> ~/slow-hop.txt`.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "gateway": "10.0.0.1", "dns": {"10.0.0.2": {"up": true, "records": {"reports.example.com": "10.20.0.80"}}}, "hosts": {"10.20.0.80": {"up": true, "rtt": 320, "ports": {"443": "open"}, "path": [{"ip": "10.0.0.1", "ms": 1.1}, {"ip": "172.16.12.1", "ms": 310}, {"ip": "172.16.40.1", "ms": 312}]}}}}
@@ checks
[
 {"t": "equals", "path": "/home/user/slow-hop.txt", "text": "172.16.12.1\n10.20.0.80", "label": "slow-hop.txt has the hop 172.16.12.1 and the address 10.20.0.80"}
]
@@ solution
traceroute reports.example.com
traceroute reports.example.com | awk '$3+0 > 100 {print $2; exit}' > slow-hop.txt
dig +short reports.example.com >> slow-hop.txt
cat slow-hop.txt
@@ explain
Latency is added somewhere along the path, and every hop after it inherits it. The first hop where the time jumps is where to look, and it is the evidence the network team needs. Real traceroute output has more detail and can differ from this simulation.
