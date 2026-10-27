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

## Which ports are open?
id: nw-port-scan
module: networking
level: Beginner
minutes: 10
lesson: networking/troubleshooting-toolkit
engine: Simulated network and shell
summary: Probe a list of ports with nc and record the ones that accept connections.
@@ story
You are checking a database host, 10.0.0.30, before a change. The runbook says only SSH, HTTPS and the database port should be open. Probe these ports: 22 80 443 3306 5432 8080, and write down which ones answer.
@@ goals
- Write ~/open-ports.txt with the open ports, one per line, in the order you probed them.
- Do not change anything on the host; this is a read-only check.
@@ hints
- `nc -z -w1 10.0.0.30 22` tests one port without sending data. Exit status 0 means open.
- Loop over the list: `for p in 22 80 443 3306 5432 8080; do ... done`.
- Print the port only when the test succeeds: `nc -z -w1 10.0.0.30 $p 2>/dev/null && echo $p`.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "gateway": "10.0.0.1", "hosts": {"10.0.0.30": {"up": true, "rtt": 1, "ports": {"22": "open", "80": "open", "443": "open", "3306": "open", "5432": "closed", "8080": "filtered"}}}}}
@@ checks
[
 {"t": "equals", "path": "/home/user/open-ports.txt", "text": "22\n80\n443\n3306", "label": "open-ports.txt lists 22, 80, 443 and 3306"}
]
@@ solution
for p in 22 80 443 3306 5432 8080; do nc -z -w1 10.0.0.30 $p 2>/dev/null && echo $p; done > ~/open-ports.txt
cat ~/open-ports.txt
@@ explain
Open, closed and filtered mean different things: open accepts connections, closed answers "refused", and filtered gives no answer at all, which usually means a firewall. Here port 80 and 3306 are open although the runbook does not expect them, and that is the finding to report.

## Which endpoints are failing?
id: nw-curl-status
module: networking
level: Beginner
minutes: 10
lesson: networking/troubleshooting-toolkit
engine: Simulated network and shell
summary: Use curl to print only the HTTP status code and list the endpoints that return server errors.
@@ story
The API at 10.0.0.40 has four endpoints: /users, /orders, /payments and /search. Customers report errors but nobody knows which endpoints. Check each one and list those that return a status of 500 or higher.
@@ goals
- Write ~/failing.txt with the failing paths (for example `/orders`), one per line, in the order you checked them.
- Only list paths that returned a status of 500 or higher.
@@ hints
- `curl -s -o /dev/null -w "%{http_code}" http://10.0.0.40/users` prints only the status code.
- Loop over the four paths, store the code in a variable and compare: `[ "$code" -ge 500 ]`.
- Print the path when the test is true.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "gateway": "10.0.0.1", "hosts": {"10.0.0.40": {"up": true, "rtt": 2, "ports": {"80": "open"}, "http": {"/users": {"status": 200, "body": "[]\n"}, "/orders": {"status": 500, "body": "error\n"}, "/payments": {"status": 503, "body": "unavailable\n"}, "/search": {"status": 404, "body": "not found\n"}}}}}}
@@ checks
[
 {"t": "equals", "path": "/home/user/failing.txt", "text": "/orders\n/payments", "label": "failing.txt lists /orders and /payments"}
]
@@ solution
for p in /users /orders /payments /search; do code=$(curl -s -o /dev/null -w '%{http_code}' http://10.0.0.40$p); echo "$p $code"; [ "$code" -ge 500 ] && echo $p >> ~/failing.txt; done
cat ~/failing.txt
@@ explain
The first digit of an HTTP status tells you who is at fault: 4xx means the request was wrong (here /search is simply not found), 5xx means the server failed. Alerts and runbooks usually care about 5xx.

## No default route
id: nw-no-default-route
module: networking
level: Intermediate
minutes: 15
lesson: networking/ip-addressing-and-subnets
engine: Simulated network and shell
summary: The machine reaches its own network but nothing beyond it. Add the missing default route.
@@ story
After a network restart this machine can reach its neighbours but not the internet. `curl http://203.0.113.9/` says the network is unreachable. The router for this network is 10.0.0.1.
@@ goals
- The routing table has a default route via 10.0.0.1.
- `curl -s http://203.0.113.9/` prints the page.
@@ hints
- `ip route` shows the routing table. A working one has a line starting with `default via`.
- `ip route get 203.0.113.9` asks which route would be used.
- Add it as root: `sudo ip route add default via 10.0.0.1`.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "hosts": {"10.0.0.1": {"up": true, "rtt": 1}, "10.0.0.22": {"up": true, "rtt": 1}, "203.0.113.9": {"up": true, "rtt": 25, "ports": {"80": "open"}, "http": {"/": {"status": 200, "body": "public site ok\n"}}}}}}
@@ checks
[
 {"t": "cmd", "run": "ip route", "code": 0, "out": "default via 10\\.0\\.0\\.1", "label": "a default route via 10.0.0.1 exists"},
 {"t": "cmd", "run": "curl -s http://203.0.113.9/", "code": 0, "out": "public site ok", "label": "the public site is reachable"}
]
@@ solution
ip route
ip route get 203.0.113.9
sudo ip route add default via 10.0.0.1
ip route
curl -s http://203.0.113.9/
@@ explain
A machine only knows its own network until it has a route to everything else. The default route sends all other traffic to the gateway. Routes added with ip route are lost at reboot, so in real life you also set them in the network configuration.

## Add a hosts entry for an internal name
id: nw-hosts-entry
module: networking
level: Beginner
minutes: 10
lesson: networking/dns
engine: Simulated network and shell
summary: Give a name to an address locally with /etc/hosts when DNS has no record.
@@ story
The new reporting database lives at 10.0.0.70, but the DNS team has not created a record yet. The application expects the name `reports-db.internal`. Until DNS catches up, map the name on this machine.
@@ goals
- `reports-db.internal` resolves to 10.0.0.70 on this machine.
- The existing entry for localhost stays in /etc/hosts.
@@ hints
- `cat /etc/hosts` shows the current entries. Each line is an address followed by one or more names.
- Append with `echo "10.0.0.70 reports-db.internal" | sudo tee -a /etc/hosts`. The `-a` keeps the old lines.
- Test with `ping -c 1 reports-db.internal`.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "gateway": "10.0.0.1", "dns": {"10.0.0.2": {"up": true, "records": {}}}, "hosts": {"10.0.0.70": {"up": true, "rtt": 1, "ports": {"5432": "open"}}}}}
@@ file /etc/resolv.conf mode=644 owner=root
nameserver 10.0.0.2
@@ file /etc/hosts mode=644 owner=root
127.0.0.1 localhost
@@ checks
[
 {"t": "contains", "path": "/etc/hosts", "re": "^10\\.0\\.0\\.70\\s+reports-db\\.internal", "label": "/etc/hosts maps reports-db.internal to 10.0.0.70"},
 {"t": "contains", "path": "/etc/hosts", "re": "^127\\.0\\.0\\.1\\s+localhost", "label": "the localhost entry is still there"},
 {"t": "cmd", "run": "nc -z reports-db.internal 5432", "code": 0, "label": "the database port answers through the new name"}
]
@@ solution
dig +short reports-db.internal
echo '10.0.0.70 reports-db.internal' | sudo tee -a /etc/hosts
nc -z reports-db.internal 5432 && echo reachable
@@ explain
The hosts file is checked before DNS, so it is a quick local override. It is also easy to forget, which is how stale entries cause confusing outages later. Treat it as a temporary measure and remove the entry once DNS has the record.

## Close the database to the world
id: nw-ufw-db
module: networking
level: Intermediate
minutes: 15
lesson: networking/firewalls-and-load-balancing
engine: Simulated network and shell
summary: Replace an open firewall rule with one that allows only the application subnet.
@@ story
A scan showed that the database port 5432 on this server is open to everyone. Only the application servers in 10.0.1.0/24 need it. `client1` (10.0.1.50) is an application server and `client2` (10.0.9.9) is somewhere else.
@@ goals
- `from client1 nc -z 10.0.1.15 5432` succeeds.
- `from client2 nc -z 10.0.1.15 5432` fails.
- The SSH rule for port 22 stays.
@@ hints
- `sudo ufw status` lists the rules. One of them allows 5432 from Anywhere.
- Remove it: `sudo ufw delete allow 5432/tcp`.
- Add a narrow rule: `sudo ufw allow from 10.0.1.0/24 to any port 5432 proto tcp`.
@@ world
{"net": {"iface": {"ip": "10.0.1.15", "prefix": 24}, "gateway": "10.0.1.1", "clients": {"client1": {"ip": "10.0.1.50"}, "client2": {"ip": "10.0.9.9"}}, "ufw": {"active": true, "default": "deny", "rules": [{"port": 22, "proto": "tcp", "action": "allow", "from": "any"}, {"port": 5432, "proto": "tcp", "action": "allow", "from": "any"}]}}, "procs": [{"pid": 900, "user": "postgres", "cmd": "/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main", "cpu": 1.0, "mem": 3.0, "ports": [5432]}]}
@@ checks
[
 {"t": "cmd", "run": "from client1 nc -z -w1 10.0.1.15 5432", "code": 0, "label": "client1 can reach the database"},
 {"t": "cmd", "run": "from client2 nc -z -w1 10.0.1.15 5432", "code": 1, "label": "client2 is blocked"},
 {"t": "cmd", "as": "root", "run": "ufw status", "out": "22/tcp\\s+ALLOW", "label": "the SSH rule is still there"},
 {"t": "cmd", "as": "root", "run": "ufw status", "notOut": "5432/tcp\\s+ALLOW\\s+Anywhere", "label": "5432 is not open to everyone"}
]
@@ solution
sudo ufw status
sudo ufw delete allow 5432/tcp
sudo ufw allow from 10.0.1.0/24 to any port 5432 proto tcp
sudo ufw status
from client1 nc -z -w1 10.0.1.15 5432 && echo client1-ok
from client2 nc -z -w1 10.0.1.15 5432 || echo client2-blocked
@@ explain
Databases should almost never be open to the whole internet. Removing the broad rule and adding a narrow one is two steps, and doing only the second leaves the exposure in place, so always read the rule list again afterwards.

## Plan four subnets
id: nw-subnet-plan
module: networking
level: Intermediate
minutes: 15
lesson: networking/ip-addressing-and-subnets
engine: Simulated network and shell
summary: Split a /24 into four equal subnets and record the network, first and last usable address of each.
@@ story
You were given 192.168.50.0/24 for a new site and want four equal subnets: web, app, data and management. Work out the ranges and write them down for the change ticket.
@@ goals
- Write ~/plan.txt with four lines, one per subnet, in the form `NETWORK/PREFIX FIRST-USABLE LAST-USABLE`, in ascending order.
- Use the prefix /26 for every subnet.
@@ hints
- Four equal parts need 2 extra bits, so the new prefix is /26 and each subnet has 64 addresses.
- Networks start at .0, .64, .128 and .192.
- The first usable address is the network plus 1; the last usable is the broadcast minus 1 (for example 192.168.50.62 for the first).
@@ world
{}
@@ checks
[
 {"t": "equals", "path": "/home/user/plan.txt", "text": "192.168.50.0/26 192.168.50.1 192.168.50.62\n192.168.50.64/26 192.168.50.65 192.168.50.126\n192.168.50.128/26 192.168.50.129 192.168.50.190\n192.168.50.192/26 192.168.50.193 192.168.50.254", "label": "plan.txt has the four /26 subnets with correct usable ranges"}
]
@@ solution
printf '%s\n' '192.168.50.0/26 192.168.50.1 192.168.50.62' '192.168.50.64/26 192.168.50.65 192.168.50.126' '192.168.50.128/26 192.168.50.129 192.168.50.190' '192.168.50.192/26 192.168.50.193 192.168.50.254' > ~/plan.txt
cat ~/plan.txt
@@ explain
Each extra prefix bit halves the block. A /26 has 64 addresses, of which the first (network) and last (broadcast) are not usable by hosts, leaving 62. Writing the ranges down before configuring anything catches overlaps early.

## Sweep a range for live hosts
id: nw-ping-sweep
module: networking
level: Beginner
minutes: 10
lesson: networking/troubleshooting-toolkit
engine: Simulated network and shell
summary: Ping a short address range in a loop and list the machines that answer.
@@ story
The change ticket says six servers, 10.0.0.21 to 10.0.0.26, should be online. Find which ones answer ping right now so the team knows what is missing.
@@ goals
- Write ~/alive.txt with the addresses that reply, one per line, in order.
- Only 10.0.0.21 to 10.0.0.26 are checked.
@@ hints
- `ping -c 1 -W 1 10.0.0.21` sends one probe and waits one second. Exit status 0 means it replied.
- Loop: `for i in 21 22 23 24 25 26; do ... done`.
- Print the address only on success: `ping -c 1 -W 1 10.0.0.$i > /dev/null && echo 10.0.0.$i`.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "gateway": "10.0.0.1", "hosts": {"10.0.0.21": {"up": true, "rtt": 1}, "10.0.0.22": {"up": true, "rtt": 1}, "10.0.0.23": {"up": false}, "10.0.0.24": {"up": true, "rtt": 2}, "10.0.0.25": {"up": false}, "10.0.0.26": {"up": true, "rtt": 1}}}}
@@ checks
[
 {"t": "equals", "path": "/home/user/alive.txt", "text": "10.0.0.21\n10.0.0.22\n10.0.0.24\n10.0.0.26", "label": "alive.txt lists the four hosts that answer"}
]
@@ solution
for i in 21 22 23 24 25 26; do ping -c 1 -W 1 10.0.0.$i > /dev/null && echo 10.0.0.$i; done > ~/alive.txt
cat ~/alive.txt
@@ explain
A ping sweep shows which machines are reachable, but silence does not prove a host is down, because many networks block ping. Treat the result as a lead and confirm with another check, such as an open service port.

## Which certificate has expired?
id: nw-tls-expired
module: networking
level: Intermediate
minutes: 15
lesson: networking/troubleshooting-toolkit
engine: Simulated network and shell
summary: Use curl exit codes to find which HTTPS sites have a certificate problem.
@@ story
Three internal sites use HTTPS: shop.internal, api.internal and admin.internal. Customers report a certificate warning on one of them. Test each and write the names whose certificate fails.
@@ goals
- Write ~/bad-certs.txt with the names that fail certificate validation, one per line, in the order given above.
- Do not use curl -k to ignore the problem.
@@ hints
- `curl -sS https://shop.internal/ -o /dev/null; echo $?` prints the exit code. Code 60 means the certificate could not be verified.
- Read the message too: it says whether the certificate has expired, is self-signed, or names another host.
- Loop over the three names and print the name when curl does not succeed.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "gateway": "10.0.0.1", "dns": {"10.0.0.2": {"up": true, "records": {"shop.internal": "10.0.0.31", "api.internal": "10.0.0.32", "admin.internal": "10.0.0.33"}}}, "hosts": {"10.0.0.31": {"up": true, "rtt": 1, "ports": {"443": "open"}, "tls": {}, "http": {"/": {"status": 200, "body": "shop\n"}}}, "10.0.0.32": {"up": true, "rtt": 1, "ports": {"443": "open"}, "tls": {"expired": true}, "http": {"/": {"status": 200, "body": "api\n"}}}, "10.0.0.33": {"up": true, "rtt": 1, "ports": {"443": "open"}, "tls": {"wrongName": true}, "http": {"/": {"status": 200, "body": "admin\n"}}}}}}
@@ file /etc/resolv.conf mode=644 owner=root
nameserver 10.0.0.2
@@ checks
[
 {"t": "equals", "path": "/home/user/bad-certs.txt", "text": "api.internal\nadmin.internal", "label": "bad-certs.txt lists api.internal and admin.internal"}
]
@@ solution
for h in shop.internal api.internal admin.internal; do curl -sS https://$h/ -o /dev/null || echo $h >> ~/bad-certs.txt; done
curl -sS https://api.internal/ -o /dev/null
curl -sS https://admin.internal/ -o /dev/null
cat ~/bad-certs.txt
@@ explain
curl returns 60 when it cannot trust a certificate, and the message says why: expired, self-signed or wrong name. Each cause has a different fix, so read the text. Turning verification off with -k hides the problem and should only be a temporary test.

## List what is listening
id: nw-listeners
module: networking
level: Beginner
minutes: 10
lesson: networking/troubleshooting-toolkit
engine: Simulated network and shell
summary: Collect the TCP ports this server listens on, as a sorted list for the firewall review.
@@ story
A firewall review asks which TCP ports this server accepts connections on. Produce the list, one port per line, lowest first, without duplicates.
@@ goals
- Write ~/ports.txt with the listening TCP ports, numerically sorted, one per line.
- Include each port once, even if two programs share it.
@@ hints
- `ss -ltn` lists listening TCP sockets. The fourth column is address:port.
- `awk 'NR>1 {n=split($4,a,":"); print a[n]}'` skips the header and keeps the port.
- `sort -n | uniq` sorts numerically and removes duplicates.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "gateway": "10.0.0.1"}, "procs": [{"pid": 611, "user": "root", "cmd": "/usr/sbin/nginx -g daemon off;", "cpu": 0.5, "mem": 0.8, "ports": [80, 443]}, {"pid": 702, "user": "postgres", "cmd": "/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main", "cpu": 1.5, "mem": 4.0, "ports": [5432]}, {"pid": 810, "user": "root", "cmd": "/usr/sbin/sshd -D", "cpu": 0.1, "mem": 0.2, "ports": [22]}, {"pid": 955, "user": "app", "cmd": "/opt/app/bin/app --port 8080", "cpu": 2.0, "mem": 3.0, "ports": [8080, 9100]}]}
@@ checks
[
 {"t": "equals", "path": "/home/user/ports.txt", "text": "22\n80\n443\n5432\n8080\n9100", "label": "ports.txt lists the six ports in numeric order"}
]
@@ solution
ss -ltn
ss -ltn | awk 'NR>1 {n=split($4,a,":"); print a[n]}' | sort -n | uniq > ~/ports.txt
cat ~/ports.txt
@@ explain
Knowing what listens is the base of any exposure review: every open port is an entry point. Sort numerically (sort -n), because plain sorting puts 443 before 80.

## Fail over to the backup gateway
id: nw-backup-gateway
module: networking
level: Intermediate
minutes: 15
lesson: networking/ip-addressing-and-subnets
engine: Simulated network and shell
summary: The main gateway is down. Replace the default route with the backup router.
@@ story
The default gateway 10.0.0.1 stopped answering. A backup router at 10.0.0.2 is up and has the same connections. Point the default route to it, and leave no route to the dead one.
@@ goals
- `ip route` shows `default via 10.0.0.2` and no mention of 10.0.0.1.
- `ping -c 1 10.0.0.2` works and `curl -s http://203.0.113.9/` prints the page.
@@ hints
- `ping -c 1 10.0.0.1` fails and `ping -c 1 10.0.0.2` works: that confirms which router is alive.
- `sudo ip route replace default via 10.0.0.2` changes the existing default route in one step.
- `ip route` shows the result. A second default line would be a mistake.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "gateway": "10.0.0.1", "hosts": {"10.0.0.1": {"up": false}, "10.0.0.2": {"up": true, "rtt": 1}, "203.0.113.9": {"up": true, "rtt": 24, "ports": {"80": "open"}, "http": {"/": {"status": 200, "body": "public site ok\n"}}}}}}
@@ checks
[
 {"t": "cmd", "run": "ip route", "code": 0, "out": "default via 10\\.0\\.0\\.2", "label": "the default route uses 10.0.0.2"},
 {"t": "cmd", "run": "ip route", "code": 0, "notOut": "10\\.0\\.0\\.1 ", "label": "nothing points to the dead gateway"},
 {"t": "cmd", "run": "curl -s http://203.0.113.9/", "code": 0, "out": "public site ok", "label": "the public site is reachable"}
]
@@ solution
ping -c 1 10.0.0.1
ping -c 1 10.0.0.2
ip route
sudo ip route replace default via 10.0.0.2
ip route
curl -s http://203.0.113.9/
@@ explain
ip route replace changes a route in place, which is safer than deleting and adding because there is no moment without a default route. In production you would also fix the route in the persistent network configuration, and decide whether the dead gateway should ever come back as the first choice.

## Which addresses are in the subnet?
id: nw-cidr-contains
module: networking
level: Intermediate
minutes: 15
lesson: networking/ip-addressing-and-subnets
engine: Simulated network and shell
summary: Decide which addresses fall inside 10.8.4.0/22, and write them down.
@@ story
The firewall rule allows the network 10.8.4.0/22 and nothing else. Six client addresses reported problems: 10.8.3.250, 10.8.4.1, 10.8.5.77, 10.8.7.254, 10.8.8.1 and 10.8.6.0. Work out which of them the rule covers.
@@ goals
- Write ~/inside.txt with the addresses inside 10.8.4.0/22, one per line, in the order given above.
- Keep the addresses in the order they were given.
@@ hints
- A /22 has 1024 addresses, which is four /24 blocks. Starting at 10.8.4.0 it covers the third octet 4, 5, 6 and 7.
- So the range is 10.8.4.0 to 10.8.7.255. Check each address against that range.
- Use `echo` or `printf` to write the lines.
@@ world
{}
@@ checks
[
 {"t": "equals", "path": "/home/user/inside.txt", "text": "10.8.4.1\n10.8.5.77\n10.8.7.254\n10.8.6.0", "label": "inside.txt lists the four addresses in 10.8.4.0/22"}
]
@@ solution
printf '%s\n' 10.8.4.1 10.8.5.77 10.8.7.254 10.8.6.0 > ~/inside.txt
cat ~/inside.txt
@@ explain
The prefix length tells you how many bits are fixed. A /22 leaves 10 host bits, which is 1024 addresses, so it spans four consecutive /24 blocks. The network starts at 10.8.4.0 because 4 is a multiple of 4, the block size in the third octet.

## Check a list of names against DNS
id: nw-dns-batch
module: networking
level: Beginner
minutes: 10
lesson: networking/dns
engine: Simulated network and shell
summary: Resolve several names in a loop and report the ones that have no record.
@@ story
Before a migration you must know which of four service names still exist in DNS. Check each one and write the result for the ticket.
@@ goals
- Write ~/dns-report.txt with one line per name, in the order below: `NAME ADDRESS` when it resolves, or `NAME MISSING` when it does not.
- Names to check: www.example.org, api.example.org, old.example.org, mail.example.org.
@@ hints
- `dig +short NAME` prints the address, or nothing when the name does not exist.
- Store it in a variable: `ip=$(dig +short $n)`, then test `[ -n "$ip" ]`.
- Loop over the four names and print either `$n $ip` or `$n MISSING`.
@@ world
{"net": {"iface": {"ip": "10.0.0.15", "prefix": 24}, "gateway": "10.0.0.1", "dns": {"10.0.0.2": {"up": true, "records": {"www.example.org": "10.0.0.41", "api.example.org": "10.0.0.42", "mail.example.org": "10.0.0.44"}}}, "hosts": {}}}
@@ file /etc/resolv.conf mode=644 owner=root
nameserver 10.0.0.2
@@ checks
[
 {"t": "equals", "path": "/home/user/dns-report.txt", "text": "www.example.org 10.0.0.41\napi.example.org 10.0.0.42\nold.example.org MISSING\nmail.example.org 10.0.0.44", "label": "dns-report.txt has three addresses and one MISSING"}
]
@@ solution
for n in www.example.org api.example.org old.example.org mail.example.org; do ip=$(dig +short $n); if [ -n "$ip" ]; then echo "$n $ip"; else echo "$n MISSING"; fi; done > ~/dns-report.txt
cat ~/dns-report.txt
@@ explain
An empty answer is information too. A report that lists missing names explicitly is easier to act on than one that silently skips them, and it records exactly what you checked.
