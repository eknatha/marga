## Share a directory with your team
id: lx-shared-dir
module: linux
level: Beginner
minutes: 15
lesson: linux/users-groups-permissions
engine: Simulated Linux shell
summary: A shared folder that only the right people can use: group ownership, permission bits and group membership.
@@ story
The `dev` team keeps its release notes in `/srv/shared`. Right now only root can change anything in it, and you (user `user`) are not in the `dev` group, so the plan file is read-only for everyone. `alice` is in `dev`. `bob` is not and must stay locked out.
@@ goals
- The directory /srv/shared belongs to the group `dev` and has mode 770, so the group can enter and write and nobody else can do anything.
- The file /srv/shared/plan.txt is readable and writable by the group `dev`, and not accessible to others.
- You (`user`) are a member of `dev`.
- `alice` can append to plan.txt. `bob` cannot read it.
@@ hints
- Start with `ls -ld /srv/shared` and `ls -l /srv/shared`. Read the owner, group and permission string.
- `chgrp dev PATH` changes the group. `chmod 770 PATH` sets the bits. Both need `sudo` here.
- To add yourself to a group without removing the others: `sudo usermod -aG dev user`. Check with `id user` or `groups user`.
- On a real server, a group change only applies to new login sessions. This simulator applies it at once to keep the lab short.
@@ world
{"users": {"alice": {"groups": ["dev"]}, "bob": {}}, "groups": ["dev"], "dirs": [{"p": "/srv/shared", "m": "755", "o": "root", "g": "root"}]}
@@ file /srv/shared/plan.txt mode=644 owner=root group=root
Release plan
- 2026-01-12 cut release 4.2
@@ checks
[
 {"t":"owner","path":"/srv/shared","group":"dev","label":"/srv/shared belongs to group dev"},
 {"t":"mode","path":"/srv/shared","mode":"770","label":"/srv/shared has mode 770"},
 {"t":"owner","path":"/srv/shared/plan.txt","group":"dev","label":"plan.txt belongs to group dev"},
 {"t":"group","user":"user","group":"dev","label":"you are in group dev"},
 {"t":"cmd","as":"alice","run":"echo ok >> /srv/shared/plan.txt","code":0,"label":"alice can append to plan.txt"},
 {"t":"cmd","as":"bob","run":"cat /srv/shared/plan.txt","code":1,"label":"bob cannot read plan.txt"}
]
@@ solution
sudo chgrp -R dev /srv/shared
sudo chmod 770 /srv/shared
sudo chmod 660 /srv/shared/plan.txt
sudo usermod -aG dev user
@@ explain
Linux checks three sets of bits in order: owner, then group, then everyone else. A shared folder works when the group owns it, the group bits allow what the team needs, and the other bits are empty. Directories also need the execute bit for anyone who wants to enter them, which is why 770 and not 660.

## Free a full disk without breaking the app
id: lx-disk-full
module: linux
level: Beginner
minutes: 15
lesson: linux/disks-and-filesystems
engine: Simulated Linux shell
summary: Find what fills the disk with df and du, then empty a log that a running program still writes to.
@@ story
The root disk is almost full and the app has started to fail with "No space left on device". The app keeps `/var/log/app/debug.log` open while it runs, so deleting that file would not even free the space on a real server. The data file `/var/lib/app/data.db` must not be touched.
@@ goals
- Find the biggest consumers of space with `df -h` and `du`.
- Get disk usage below 70 percent.
- Keep /var/log/app/debug.log in place, but empty it (size 0).
- Leave /var/lib/app/data.db exactly as it is.
@@ hints
- `df -h` shows which filesystem is full. `du -h --max-depth=1 /var | sort -h` shows which folder is big.
- A file that a program holds open should be emptied, not deleted: `sudo truncate -s 0 FILE` or `sudo sh -c ': > FILE'`.
- Old backups that nobody needs can be removed with `sudo rm`. Check the dates in the file names first.
@@ world
{"disks": [{"fs": "/dev/sda1", "mount": "/", "size": "20G", "base": "5G"}], "procs": [{"pid": 912, "user": "app", "cmd": "/opt/app/bin/app --log /var/log/app/debug.log", "cpu": 4.0, "mem": 2.1, "ports": [8000], "holds": ["/var/log/app/debug.log"]}]}
@@ file /var/log/app/debug.log size=8G
debug output started
@@ file /var/log/app/app.log size=120M
INFO app started
@@ file /var/backups/db-2025-03.tar.gz size=2G
x
@@ file /var/lib/app/data.db size=900M
sqlite-data-placeholder
@@ checks
[
 {"t":"disk","mount":"/","below":70,"label":"the root disk is below 70 percent full"},
 {"t":"file","path":"/var/log/app/debug.log","exists":true,"label":"debug.log still exists"},
 {"t":"cmd","run":"test ! -s /var/log/app/debug.log","code":0,"label":"debug.log is empty"},
 {"t":"unchanged","path":"/var/lib/app/data.db","label":"data.db was not touched"}
]
@@ solution
df -h
du -h --max-depth=1 /var | sort -h
sudo truncate -s 0 /var/log/app/debug.log
@@ explain
`df` reports per filesystem, `du` adds up folders, and together they point to the culprit. A log file that a program has open is emptied with truncate (or `: > file`) so the program keeps a valid file handle. Removing it would leave the space allocated until the program exits.

## Stop a runaway process
id: lx-runaway
module: linux
level: Beginner
minutes: 10
lesson: linux/processes-and-services
engine: Simulated Linux shell
summary: Find the process that burns the CPU, record it, and stop it with the right signal without harming the others.
@@ story
The server feels slow. One process owned by the `batch` user is using almost all of a CPU, and it ignores the polite stop signal. nginx and postgres must keep running.
@@ goals
- Find the PID of the process using the most CPU.
- Write that PID on a line by itself in ~/culprit.txt.
- Stop that process. Leave nginx and postgres running.
@@ hints
- `ps aux --sort=-%cpu | head` lists the busiest processes first.
- Processes of other users need `sudo kill PID`. The default signal (TERM) asks politely.
- If the process is still there after a polite request, `kill -9` cannot be ignored. Use it last.
@@ world
{"procs": [{"pid": 611, "user": "root", "cmd": "/usr/sbin/nginx -g daemon off;", "cpu": 1.2, "mem": 0.8, "ports": [80]}, {"pid": 702, "user": "postgres", "cmd": "/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main", "cpu": 2.3, "mem": 4.9, "ports": [5432]}, {"pid": 3105, "user": "batch", "cmd": "/usr/bin/python3 /opt/reports/export.py", "cpu": 97.4, "mem": 3.1, "ignoreTerm": true}]}
@@ checks
[
 {"t":"contains","path":"/home/user/culprit.txt","re":"^3105$","label":"culprit.txt contains the PID 3105"},
 {"t":"proc","cmd":"export\\.py","present":false,"label":"the export.py process is gone"},
 {"t":"proc","cmd":"nginx","present":true,"label":"nginx is still running"},
 {"t":"proc","cmd":"postgres","present":true,"label":"postgres is still running"}
]
@@ solution
ps aux --sort=-%cpu | head -5
echo 3105 > ~/culprit.txt
sudo kill 3105
sudo kill -9 3105
@@ explain
`kill` sends a signal, and the default (TERM) can be caught or ignored by the program. `kill -9` (KILL) is handled by the kernel and always works, but it gives the program no chance to clean up, so try the polite signal first.

## Fix a service that will not start
id: lx-systemd-unit
module: linux
level: Intermediate
minutes: 20
lesson: linux/processes-and-services
engine: Simulated Linux shell
summary: Read the status and the journal, then fix three separate faults in a unit file and its files, one at a time.
@@ story
The `reports` service is in the failed state after a deployment. There is more than one fault, and each one only shows up after you fix the one before it. After you edit a unit file, systemd must be told with `daemon-reload`.
@@ goals
- Make `reports` active (running).
- Make it start at boot (enabled).
- The unit file must still run as the user `reports` and start /opt/reports/bin/server.
@@ hints
- `systemctl status reports` and `journalctl -u reports -n 10` show the last error. Fix only that one, then try again.
- Paths in `ExecStart=` must exist and the file must have the execute bit (`ls -l`, `chmod +x`).
- `User=` must name an account that exists. Check `getent passwd reports`.
- After every unit edit: `sudo systemctl daemon-reload`, then `sudo systemctl start reports`.
@@ world
{"users": {"reports": {}}, "services": {"reports": {"unit": "/etc/systemd/system/reports.service", "state": "failed", "enabled": false, "desc": "Reports API", "port": 9000, "result": "exec", "http": {"/": {"status": 200, "body": "reports ok\\n"}}}}, "journal": {"reports": ["Jan 05 09:58:11 lab-host reports[1]: Starting Reports API...", "Jan 05 09:58:11 lab-host reports[1]: Failed to execute /opt/reports/bin/serve: No such file or directory", "Jan 05 09:58:11 lab-host reports[1]: Failed with result 'exec'."]}}
@@ file /etc/systemd/system/reports.service mode=644 owner=root
[Unit]
Description=Reports API
After=network.target

[Service]
User=report
WorkingDirectory=/opt/reports
ExecStart=/opt/reports/bin/serve --port 9000
Restart=on-failure

[Install]
WantedBy=multi-user.target
@@ file /opt/reports/bin/server mode=644 owner=root
#!/bin/sh
echo reports api
@@ checks
[
 {"t":"service","name":"reports","state":"active","label":"reports is active"},
 {"t":"service","name":"reports","enabled":true,"label":"reports is enabled"},
 {"t":"contains","path":"/etc/systemd/system/reports.service","re":"^User=reports$","label":"the unit still runs as user reports"},
 {"t":"contains","path":"/etc/systemd/system/reports.service","re":"^ExecStart=/opt/reports/bin/server","label":"ExecStart points to bin/server"}
]
@@ solution
sudo sed -i 's#bin/serve #bin/server #' /etc/systemd/system/reports.service
sudo sed -i 's/^User=report$/User=reports/' /etc/systemd/system/reports.service
sudo chmod +x /opt/reports/bin/server
sudo systemctl daemon-reload
sudo systemctl start reports
sudo systemctl enable reports
@@ explain
systemd runs the file it loaded at the last reload, not the file on disk, so `daemon-reload` comes after every edit. Start faults are usually small: a wrong path, a missing execute bit, a user that does not exist. Read one error at a time.

## Read the logs and name the cause
id: lx-read-logs
module: linux
level: Beginner
minutes: 15
lesson: linux/logs-and-troubleshooting
engine: Simulated Linux shell
summary: Turn two raw log files into facts: who sees the most errors, and which backend is down.
@@ story
Customers see 502 errors. nginx writes an access log and an error log. Your job is to read them and write the two facts that the on-call engineer needs into ~/findings.txt.
@@ goals
- Line 1 of ~/findings.txt: the client IP address that received the most 502 responses.
- Line 2: the port of the backend (upstream) that nginx cannot connect to.
- Do not change the log files.
@@ hints
- In the access log the status code is the 9th field: `awk '$9 == 502 {print $1}' FILE`.
- Count with `sort | uniq -c | sort -rn | head -1`.
- In error.log search for `upstream` and read the address in quotes. `grep -o` can print only the matching part.
@@ world
{}
@@ file /var/log/nginx/access.log mode=644 owner=root
203.0.113.50 - - [05/Jan/2026:09:50:01 +0000] "GET /api/users HTTP/1.1" 200 240
198.51.100.23 - - [05/Jan/2026:09:50:02 +0000] "GET /api/orders HTTP/1.1" 502 644
192.0.2.44 - - [05/Jan/2026:09:50:03 +0000] "GET /api/orders HTTP/1.1" 502 548
192.0.2.44 - - [05/Jan/2026:09:50:04 +0000] "GET /api/orders HTTP/1.1" 404 288
203.0.113.7 - - [05/Jan/2026:09:50:05 +0000] "GET /api/cart HTTP/1.1" 200 895
203.0.113.7 - - [05/Jan/2026:09:50:06 +0000] "GET /api/cart HTTP/1.1" 502 470
198.51.100.99 - - [05/Jan/2026:09:50:07 +0000] "GET /api/users HTTP/1.1" 404 275
203.0.113.50 - - [05/Jan/2026:09:50:08 +0000] "GET /api/cart HTTP/1.1" 200 620
198.51.100.23 - - [05/Jan/2026:09:50:09 +0000] "GET /api/orders HTTP/1.1" 502 551
203.0.113.7 - - [05/Jan/2026:09:50:10 +0000] "GET /api/cart HTTP/1.1" 304 160
198.51.100.23 - - [05/Jan/2026:09:50:11 +0000] "GET /api/orders HTTP/1.1" 502 804
198.51.100.23 - - [05/Jan/2026:09:50:12 +0000] "GET /api/orders HTTP/1.1" 502 199
203.0.113.7 - - [05/Jan/2026:09:50:13 +0000] "GET /api/cart HTTP/1.1" 200 691
198.51.100.23 - - [05/Jan/2026:09:50:14 +0000] "GET /api/orders HTTP/1.1" 502 706
203.0.113.7 - - [05/Jan/2026:09:50:15 +0000] "GET /health HTTP/1.1" 404 441
203.0.113.7 - - [05/Jan/2026:09:50:16 +0000] "GET /api/cart HTTP/1.1" 502 468
192.0.2.44 - - [05/Jan/2026:09:50:17 +0000] "GET /api/orders HTTP/1.1" 502 831
203.0.113.7 - - [05/Jan/2026:09:50:18 +0000] "GET /api/orders HTTP/1.1" 404 478
203.0.113.7 - - [05/Jan/2026:09:50:19 +0000] "GET /api/users HTTP/1.1" 200 728
198.51.100.23 - - [05/Jan/2026:09:50:20 +0000] "GET /api/cart HTTP/1.1" 200 628
203.0.113.7 - - [05/Jan/2026:09:50:21 +0000] "GET /api/orders HTTP/1.1" 304 713
192.0.2.44 - - [05/Jan/2026:09:50:22 +0000] "GET /api/users HTTP/1.1" 304 587
203.0.113.7 - - [05/Jan/2026:09:50:23 +0000] "GET /api/cart HTTP/1.1" 200 190
203.0.113.7 - - [05/Jan/2026:09:50:24 +0000] "GET /api/cart HTTP/1.1" 200 215
203.0.113.50 - - [05/Jan/2026:09:50:25 +0000] "GET /api/users HTTP/1.1" 200 396
198.51.100.99 - - [05/Jan/2026:09:50:26 +0000] "GET /api/orders HTTP/1.1" 200 605
203.0.113.7 - - [05/Jan/2026:09:50:27 +0000] "GET /api/cart HTTP/1.1" 502 833
203.0.113.50 - - [05/Jan/2026:09:50:28 +0000] "GET /api/cart HTTP/1.1" 304 800
@@ file /var/log/nginx/error.log mode=644 owner=root
2026/01/05 09:50:12 [error] 811#811: *100 connect() failed (111: Connection refused) while connecting to upstream, client: 198.51.100.23, server: shop.example.com, request: "GET /api/orders HTTP/1.1", upstream: "http://127.0.0.1:8081/api/orders", host: "shop.example.com"
2026/01/05 09:50:31 [error] 811#811: *101 connect() failed (111: Connection refused) while connecting to upstream, client: 198.51.100.23, server: shop.example.com, request: "GET /api/orders HTTP/1.1", upstream: "http://127.0.0.1:8081/api/orders", host: "shop.example.com"
2026/01/05 09:50:40 [warn] 811#811: *104 upstream server temporarily disabled while connecting to upstream, upstream: "http://127.0.0.1:8081/api/cart"
2026/01/05 09:51:02 [error] 811#811: *102 connect() failed (111: Connection refused) while connecting to upstream, client: 198.51.100.23, server: shop.example.com, request: "GET /api/orders HTTP/1.1", upstream: "http://127.0.0.1:8081/api/orders", host: "shop.example.com"
2026/01/05 09:51:20 [notice] 811#811: signal process started
2026/01/05 09:51:40 [error] 811#811: *103 connect() failed (111: Connection refused) while connecting to upstream, client: 198.51.100.23, server: shop.example.com, request: "GET /api/orders HTTP/1.1", upstream: "http://127.0.0.1:8081/api/orders", host: "shop.example.com"
2026/01/05 09:52:18 [error] 811#811: *104 connect() failed (111: Connection refused) while connecting to upstream, client: 198.51.100.23, server: shop.example.com, request: "GET /api/orders HTTP/1.1", upstream: "http://127.0.0.1:8081/api/orders", host: "shop.example.com"
2026/01/05 09:53:05 [error] 811#811: *105 connect() failed (111: Connection refused) while connecting to upstream, client: 198.51.100.23, server: shop.example.com, request: "GET /api/orders HTTP/1.1", upstream: "http://127.0.0.1:8081/api/orders", host: "shop.example.com"
@@ checks
[
 {"t":"cmd","run":"sed -n 1p /home/user/findings.txt","out":"^198\\.51\\.100\\.23$","label":"line 1 is the client with the most 502 responses"},
 {"t":"cmd","run":"sed -n 2p /home/user/findings.txt","out":"^8081$","label":"line 2 is the failing backend port"},
 {"t":"unchanged","path":"/var/log/nginx/access.log","label":"access.log is unchanged"},
 {"t":"unchanged","path":"/var/log/nginx/error.log","label":"error.log is unchanged"}
]
@@ solution
awk '$9 == 502 {print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -3
grep upstream /var/log/nginx/error.log | head -3
awk '$9 == 502 {print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | awk 'NR == 1 {print $2}' > ~/findings.txt
grep -o 'upstream: "http://127.0.0.1:[0-9]*' /var/log/nginx/error.log | grep -o '[0-9]*$' | sort -u >> ~/findings.txt
@@ explain
Logs answer questions when you reduce them: filter the lines you care about, extract one field, count, sort. The same pipeline works on any line-based log. The error log says what failed (connection refused); the access log says who noticed.

## Make a cron job that really runs
id: lx-cron
module: linux
level: Intermediate
minutes: 15
lesson: linux/cron-and-timers
engine: Simulated Linux shell
summary: A script that works in your shell often fails under cron. Fix the permissions, the path and the schedule.
@@ story
Your nightly archive script works when you run it by hand, but it has never run from cron. Cron starts jobs with a small environment (PATH is only /usr/bin:/bin) and it runs the file you name, so the file must be executable. The simulator has one extra command, `cron-tick`, which runs your crontab jobs once, right now, the way cron would.
@@ goals
- /opt/scripts/backup.sh must be executable.
- Install a crontab for your user that runs it every day at 02:30 and appends its output to /var/backups/app/cron.log.
- `cron-tick` must run the job with exit status 0 and the script must write to /var/backups/app/backup.log.
@@ hints
- `ls -l /opt/scripts` shows the permission bits. `chmod +x` adds execute.
- Cron fields: minute hour day-of-month month day-of-week. Every day at 02:30 is `30 2 * * *`.
- `crontab -l` shows your jobs. Install from a file with `crontab FILE` (write the file with printf or a here-document).
- Run `cron-tick` and read the output. If a command is not found, cron's PATH is the reason: use the full path in the script, or set `PATH=` at the top of the crontab.
@@ world
{"dirs": [{"p": "/var/backups/app", "m": "755", "o": "user", "g": "user"}, {"p": "/var/log/app", "m": "755", "o": "root", "g": "root"}]}
@@ file /opt/scripts/backup.sh mode=644 owner=user
#!/bin/bash
# nightly log archive
cd /var/log/app || exit 1
archive-logs /var/log/app "/var/backups/app/logs-$(date +%F).txt"
echo "done $(date +%T)" >> /var/backups/app/backup.log
@@ file /usr/local/bin/archive-logs mode=755 owner=root
#!/bin/bash
cat "$1"/*.log > "$2"
@@ file /var/log/app/app.log mode=644 owner=root
INFO app started
@@ checks
[
 {"t":"cmd","run":"test -x /opt/scripts/backup.sh","code":0,"label":"backup.sh is executable"},
 {"t":"cron","re":"^30 2 \\* \\* \\* .*backup\\.sh","label":"crontab runs backup.sh at 02:30 every day"},
 {"t":"cron","re":"cron\\.log","label":"the job output goes to /var/backups/app/cron.log"},
 {"t":"cmd","run":"cron-tick","code":0,"out":"exit 0","label":"cron-tick runs the job with exit status 0"},
 {"t":"cmd","run":"cron-tick > /dev/null; test -s /var/backups/app/backup.log","code":0,"label":"the script wrote backup.log"}
]
@@ solution
chmod +x /opt/scripts/backup.sh
printf 'PATH=/usr/local/bin:/usr/bin:/bin\n30 2 * * * /opt/scripts/backup.sh >> /var/backups/app/cron.log 2>&1\n' > /tmp/mycron
crontab /tmp/mycron
crontab -l
cron-tick
@@ explain
Cron is not your shell: small PATH, no profile, no tty. Use absolute paths or set PATH in the crontab, make the script executable, and send output to a file so you can read what happened.
