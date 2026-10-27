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

## Find what is eating the disk
id: lx-find-big
module: linux
level: Beginner
minutes: 10
lesson: linux/disks-and-filesystems
engine: Simulated Linux shell
summary: Use find with size tests to list large files, without deleting anything.
@@ story
The upload server is running low on space. Before anyone deletes anything, the team wants a list of every file larger than 100 MB under /srv/uploads, including sub-folders.
@@ goals
- Write the full paths of all files over 100 MB into ~/big.txt, one per line, sorted alphabetically.
- Do not delete or change any file under /srv/uploads.
@@ hints
- `find /srv/uploads -type f` lists every file. Add `-size +100M` to keep only the large ones.
- `sort` puts the lines in alphabetical order. Redirect with `>` into a file.
- Check the result with `cat ~/big.txt`. Files of exactly 100 MB are not "over 100 MB".
@@ world
{}
@@ file /srv/uploads/a.iso mode=644 owner=root size=700M
iso
@@ file /srv/uploads/b.log mode=644 owner=root size=120M
log
@@ file /srv/uploads/c.txt mode=644 owner=root
small
@@ file /srv/uploads/d.bin mode=644 owner=root size=300M
bin
@@ file /srv/uploads/e.tmp mode=644 owner=root size=5M
tmp
@@ file /srv/uploads/exact.img mode=644 owner=root size=100M
img
@@ file /srv/uploads/sub/f.mp4 mode=644 owner=root size=900M
video
@@ checks
[
 {"t": "equals", "path": "/home/user/big.txt", "text": "/srv/uploads/a.iso\n/srv/uploads/b.log\n/srv/uploads/d.bin\n/srv/uploads/sub/f.mp4", "label": "big.txt lists exactly the four files over 100 MB, sorted"},
 {"t": "file", "path": "/srv/uploads/a.iso", "exists": true, "label": "a.iso is still there"},
 {"t": "file", "path": "/srv/uploads/sub/f.mp4", "exists": true, "label": "f.mp4 is still there"}
]
@@ solution
df -h
find /srv/uploads -type f -size +100M | sort > ~/big.txt
cat ~/big.txt
@@ explain
Find answers "which files" quickly and safely. Listing first and deleting later, after people have looked at the list, avoids the mistake of removing something that is still needed.

## Fix SSH key permissions
id: lx-ssh-perms
module: linux
level: Beginner
minutes: 10
lesson: linux/ssh-and-remote-access
engine: Simulated Linux shell
summary: SSH refuses keys whose files are readable by others. Set the permissions that sshd and ssh expect.
@@ story
Your SSH login fails with "Permissions are too open" for the private key, and the server ignores authorized_keys. The folder ~/.ssh and its files were copied from a backup with the wrong modes.
@@ goals
- ~/.ssh is mode 700.
- The private key id_ed25519 and authorized_keys are mode 600.
- The public key id_ed25519.pub stays readable (mode 644).
@@ hints
- `ls -la ~/.ssh` shows the current modes.
- Private material must be readable only by its owner: `chmod 600 FILE`. The folder needs `chmod 700 ~/.ssh`.
- The public key is meant to be shared, so 644 is fine.
@@ world
{}
@@ file /home/user/.ssh/id_ed25519 mode=644 owner=user
-----BEGIN KEY (lab placeholder, not a real key)-----
@@ file /home/user/.ssh/id_ed25519.pub mode=666 owner=user
ssh-ed25519 AAAA-lab-placeholder user@lab
@@ file /home/user/.ssh/authorized_keys mode=666 owner=user
ssh-ed25519 AAAA-lab-placeholder user@lab
@@ checks
[
 {"t": "mode", "path": "/home/user/.ssh", "mode": "700", "label": "~/.ssh is 700"},
 {"t": "mode", "path": "/home/user/.ssh/id_ed25519", "mode": "600", "label": "the private key is 600"},
 {"t": "mode", "path": "/home/user/.ssh/authorized_keys", "mode": "600", "label": "authorized_keys is 600"},
 {"t": "mode", "path": "/home/user/.ssh/id_ed25519.pub", "mode": "644", "label": "the public key is 644"}
]
@@ solution
ls -la ~/.ssh
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519 ~/.ssh/authorized_keys
chmod 644 ~/.ssh/id_ed25519.pub
ls -la ~/.ssh
@@ explain
SSH checks permissions on purpose: a private key that others can read is no longer private. The rule of thumb is 700 for the folder, 600 for private files and authorized_keys, and 644 for public keys.

## Restore a website with the right owner
id: lx-restore-owner
module: linux
level: Intermediate
minutes: 15
lesson: linux/users-groups-permissions
engine: Simulated Linux shell
summary: A restore left everything owned by root. Fix ownership and modes, and keep a secret file private.
@@ story
A site was restored from backup as root. The web server runs as `www-data` and cannot write uploads or read its files. The config file holds a database password and must not be readable by everyone.
@@ goals
- Everything under /var/www/site belongs to www-data (user and group).
- Directories are mode 755, ordinary files are 644, except uploads (775) and config.php (640).
@@ hints
- `ls -lR /var/www/site` shows the owners and modes.
- `sudo chown -R www-data:www-data /var/www/site` fixes the owner in one step.
- Set modes by type: `sudo find /var/www/site -type d -exec chmod 755 {} \;` and the same with `-type f` and 644. Then handle the two exceptions.
@@ world
{"users": {"www-data": {}}}
@@ file /var/www/site/index.php mode=600 owner=root
<?php echo "hello";
@@ file /var/www/site/config.php mode=644 owner=root
<?php $pw = "lab-secret";
@@ file /var/www/site/assets/style.css mode=600 owner=root
body{}
@@ file /var/www/site/uploads/.keep mode=600 owner=root

@@ checks
[
 {"t": "owner", "path": "/var/www/site/index.php", "owner": "www-data", "group": "www-data", "label": "index.php belongs to www-data"},
 {"t": "owner", "path": "/var/www/site/uploads", "owner": "www-data", "group": "www-data", "label": "uploads belongs to www-data"},
 {"t": "mode", "path": "/var/www/site/index.php", "mode": "644", "label": "index.php is 644"},
 {"t": "mode", "path": "/var/www/site/assets", "mode": "755", "label": "assets is 755"},
 {"t": "mode", "path": "/var/www/site/uploads", "mode": "775", "label": "uploads is 775"},
 {"t": "mode", "path": "/var/www/site/config.php", "mode": "640", "label": "config.php is 640 (not readable by others)"}
]
@@ solution
ls -lR /var/www/site
sudo chown -R www-data:www-data /var/www/site
sudo find /var/www/site -type d -exec chmod 755 {} \;
sudo find /var/www/site -type f -exec chmod 644 {} \;
sudo chmod 775 /var/www/site/uploads
sudo chmod 640 /var/www/site/config.php
ls -lR /var/www/site
@@ explain
Ownership and modes are separate questions. First decide who owns the tree, then give directories and files the modes they need, then tighten the few secrets. Using find with -type keeps directories executable and files plain.

## Who owns port 5000?
id: lx-port-owner
module: linux
level: Beginner
minutes: 10
lesson: linux/processes-and-services
engine: Simulated Linux shell
summary: Find the process that listens on a port, record its pid, and stop only that process.
@@ story
A new service cannot start because port 5000 is already in use. Several processes run on this machine, and only one of them is the stray test server a colleague left behind.
@@ goals
- Write the pid of the process listening on port 5000 into ~/killed-pid.txt.
- Stop that process, and no other.
- The web server (nginx) and the database must keep running.
@@ hints
- `ss -ltnp` lists listening sockets with the program and pid. Filter with `grep :5000`.
- `ps aux` shows the full command line, which tells you what it is.
- `kill PID` asks it to stop. Check with `ss -ltnp` again.
@@ world
{"procs": [{"pid": 611, "user": "root", "cmd": "/usr/sbin/nginx -g daemon off;", "cpu": 0.5, "mem": 0.8, "ports": [80]}, {"pid": 702, "user": "postgres", "cmd": "/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main", "cpu": 1.5, "mem": 4.0, "ports": [5432]}, {"pid": 2201, "user": "user", "cmd": "python3 -m http.server 5000", "cpu": 0.1, "mem": 0.4, "ports": [5000]}]}
@@ checks
[
 {"t": "equals", "path": "/home/user/killed-pid.txt", "text": "2201", "label": "killed-pid.txt contains 2201"},
 {"t": "proc", "cmd": "http\\.server", "present": false, "label": "the stray test server is stopped"},
 {"t": "proc", "cmd": "nginx", "present": true, "label": "nginx is still running"},
 {"t": "proc", "cmd": "postgres", "present": true, "label": "the database is still running"}
]
@@ solution
ss -ltnp
ss -ltnp | grep :5000
echo 2201 > ~/killed-pid.txt
kill 2201
ss -ltnp
@@ explain
Always identify a process before you stop it. A port number leads to a pid, and the pid leads to a command line that tells you whether it is safe to stop. Recording the pid makes your action easy to review.

## Find the attacker in auth.log
id: lx-failed-logins
module: linux
level: Intermediate
minutes: 15
lesson: linux/logs-and-troubleshooting
engine: Simulated Linux shell
summary: Count failed SSH logins per address and list the addresses that tried three times or more.
@@ story
The security team asked which addresses repeatedly failed to log in over SSH today. The log has failed and successful logins and some noise. Produce a list they can paste into a blocklist.
@@ goals
- Write ~/offenders.txt with one line per address that has 3 or more failed password attempts, in the form `ADDRESS COUNT`, most failures first.
- Do not change /var/log/auth.log.
@@ hints
- Failed attempts contain `Failed password`. The address follows the word `from`.
- `grep -o "from [0-9.]*"` prints only that part; `awk "{print \$2}"` keeps the address.
- `sort | uniq -c | sort -rn` counts and ranks. Then use `awk "\$1 >= 3 {print \$2, \$1}"` to filter and reorder the columns.
@@ world
{}
@@ file /var/log/auth.log mode=644 owner=root
Jan  5 10:01:01 web sshd[101]: Failed password for root from 203.0.113.7 port 40001 ssh2
Jan  5 10:01:04 web sshd[101]: Failed password for root from 203.0.113.7 port 40002 ssh2
Jan  5 10:01:09 web sshd[102]: Failed password for invalid user admin from 203.0.113.7 port 40003 ssh2
Jan  5 10:02:01 web sshd[103]: Failed password for invalid user test from 198.51.100.9 port 51000 ssh2
Jan  5 10:02:05 web sshd[103]: Failed password for root from 198.51.100.9 port 51001 ssh2
Jan  5 10:02:07 web sshd[104]: Accepted password for alice from 192.0.2.20 port 52000 ssh2
Jan  5 10:03:00 web sshd[105]: Failed password for root from 203.0.113.7 port 40004 ssh2
Jan  5 10:03:03 web sshd[105]: Failed password for root from 203.0.113.7 port 40005 ssh2
Jan  5 10:03:10 web sshd[106]: Failed password for bob from 192.0.2.77 port 53000 ssh2
Jan  5 10:04:00 web sshd[107]: Failed password for root from 198.51.100.9 port 51002 ssh2
Jan  5 10:04:30 web CRON[200]: pam_unix(cron:session): session opened for user root
@@ checks
[
 {"t": "equals", "path": "/home/user/offenders.txt", "text": "203.0.113.7 5\n198.51.100.9 3", "label": "offenders.txt lists 203.0.113.7 (5) and 198.51.100.9 (3)"},
 {"t": "unchanged", "path": "/var/log/auth.log", "label": "auth.log was not changed"}
]
@@ solution
grep 'Failed password' /var/log/auth.log | grep -o 'from [0-9.]*' | awk '{print $2}' | sort | uniq -c | sort -rn | awk '$1 >= 3 {print $2, $1}' > ~/offenders.txt
cat ~/offenders.txt
@@ explain
Log analysis is a small pipeline: select the lines, extract the field, count, rank, filter. Build it one stage at a time and look at the output after each step.

## Onboard a teammate
id: lx-new-teammate
module: linux
level: Intermediate
minutes: 15
lesson: linux/users-groups-permissions
engine: Simulated Linux shell
summary: Create an account with a home folder, a shell and the right group, and give the group access to a shared folder.
@@ story
A new engineer, `dana`, starts today. She needs an account with a home folder and the bash shell, membership in the group `devs`, and write access to /srv/app through that group. She must not get administrator rights.
@@ goals
- User `dana` exists with home /home/dana and shell /bin/bash.
- `dana` is a member of `devs`, and is not in the group `sudo`.
- /srv/app belongs to group `devs` with mode 2775 (group can write, new files keep the group).
@@ hints
- `sudo useradd -m -s /bin/bash -G devs dana` creates the user, the home folder, the shell and the group membership in one command.
- Check with `id dana` and `getent passwd dana`.
- `sudo chgrp devs /srv/app` and `sudo chmod 2775 /srv/app`. The leading 2 is the setgid bit.
@@ world
{"groups": ["devs"], "dirs": [{"p": "/srv/app", "m": "755", "o": "root", "g": "root"}]}
@@ checks
[
 {"t": "cmd", "run": "getent passwd dana", "code": 0, "out": "/home/dana:/bin/bash", "label": "dana has the home /home/dana and the shell /bin/bash"},
 {"t": "cmd", "run": "id dana", "code": 0, "out": "devs", "label": "dana is in devs"},
 {"t": "cmd", "run": "id dana", "notOut": "sudo", "label": "dana is not in the sudo group"},
 {"t": "owner", "path": "/srv/app", "group": "devs", "label": "/srv/app belongs to group devs"},
 {"t": "mode", "path": "/srv/app", "mode": "2775", "label": "/srv/app has mode 2775"}
]
@@ solution
sudo useradd -m -s /bin/bash -G devs dana
id dana
getent passwd dana
sudo chgrp devs /srv/app
sudo chmod 2775 /srv/app
ls -ld /srv/app
@@ explain
Give people the least access that lets them work. Group membership is how permissions scale, and the setgid bit on a shared directory keeps new files in the team group so everyone can use them.

## Write a log rotation rule
id: lx-logrotate
module: linux
level: Intermediate
minutes: 15
lesson: linux/logs-and-troubleshooting
engine: Simulated Linux shell
summary: Create a logrotate rule so an application log cannot grow without limit.
@@ story
The app writes /var/log/shop/app.log and nobody rotates it, so it grew to several gigabytes last month. Create a rotation rule in /etc/logrotate.d/shop. The file must name the log, rotate weekly, keep 4 old copies, compress them, and not fail when the log is missing.
@@ goals
- /etc/logrotate.d/shop exists and is readable by everyone (mode 644).
- It rotates /var/log/shop/app.log weekly, keeps 4 copies, compresses, and uses missingok.
@@ hints
- Look at an existing rule for the format: `cat /etc/logrotate.d/nginx`.
- The shape is: the log path, then a block in braces with one setting per line.
- Settings you need: `weekly`, `rotate 4`, `compress`, `missingok`. Write the file with `sudo tee`.
@@ world
{}
@@ file /etc/logrotate.d/nginx mode=644 owner=root
/var/log/nginx/*.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
}
@@ file /var/log/shop/app.log mode=644 owner=root
2025-01-05 started
@@ checks
[
 {"t": "mode", "path": "/etc/logrotate.d/shop", "mode": "644", "label": "the rule file is mode 644"},
 {"t": "contains", "path": "/etc/logrotate.d/shop", "re": "/var/log/shop/app\\.log", "label": "it names the application log"},
 {"t": "contains", "path": "/etc/logrotate.d/shop", "re": "^\\s*weekly$", "label": "it rotates weekly"},
 {"t": "contains", "path": "/etc/logrotate.d/shop", "re": "^\\s*rotate 4$", "label": "it keeps 4 copies"},
 {"t": "contains", "path": "/etc/logrotate.d/shop", "re": "^\\s*compress$", "label": "it compresses old copies"},
 {"t": "contains", "path": "/etc/logrotate.d/shop", "re": "^\\s*missingok$", "label": "it tolerates a missing log"}
]
@@ solution
cat /etc/logrotate.d/nginx
sudo tee /etc/logrotate.d/shop > /dev/null <<'EOF'
/var/log/shop/app.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
EOF
sudo chmod 644 /etc/logrotate.d/shop
cat /etc/logrotate.d/shop
@@ explain
Rotation turns an unbounded file into a bounded set of files. Always set a count, because old logs that are never removed fill the disk just as the single big file did.

## Let one user restart one service
id: lx-sudoers-drop
module: linux
level: Advanced
minutes: 20
lesson: linux/users-groups-permissions
engine: Simulated Linux shell
summary: Grant a narrow sudo rule in a drop-in file instead of giving full administrator rights.
@@ story
The user `deploy` must be able to restart the `shop` service without a password, and nothing else. Do not edit /etc/sudoers itself. Add a drop-in file named /etc/sudoers.d/deploy.
@@ goals
- /etc/sudoers.d/deploy exists with mode 440 and owner root.
- It lets `deploy` run /usr/bin/systemctl restart shop without a password, and does not contain ALL=(ALL) ALL.
@@ hints
- Drop-in files in /etc/sudoers.d are read after the main file. Sudo ignores files with unsafe modes, so use 440.
- A rule has the form: `USER HOST=(RUNAS) NOPASSWD: /full/path/to/command args`.
- Write it as: `deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart shop`.
@@ world
{"dirs": [{"p": "/etc/sudoers.d", "m": "755", "o": "root", "g": "root"}]}
@@ file /etc/sudoers mode=440 owner=root
Defaults env_reset
root ALL=(ALL:ALL) ALL
%sudo ALL=(ALL:ALL) ALL
@includedir /etc/sudoers.d
@@ checks
[
 {"t": "mode", "path": "/etc/sudoers.d/deploy", "mode": "440", "label": "the drop-in file is mode 440"},
 {"t": "owner", "path": "/etc/sudoers.d/deploy", "owner": "root", "label": "it is owned by root"},
 {"t": "contains", "path": "/etc/sudoers.d/deploy", "re": "^deploy\\s+ALL=\\(root\\)\\s+NOPASSWD:\\s+/usr/bin/systemctl restart shop$", "label": "it allows exactly that one command without a password"},
 {"t": "contains", "path": "/etc/sudoers.d/deploy", "re": "ALL=\\(ALL\\)\\s+ALL", "not": true, "label": "it does not grant full rights"},
 {"t": "unchanged", "path": "/etc/sudoers", "label": "/etc/sudoers itself was not changed"}
]
@@ solution
echo 'deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart shop' | sudo tee /etc/sudoers.d/deploy
sudo chown root:root /etc/sudoers.d/deploy
sudo chmod 440 /etc/sudoers.d/deploy
ls -l /etc/sudoers.d/deploy
cat /etc/sudoers.d/deploy
@@ explain
Least privilege applies to sudo as well. A drop-in file is easy to review and remove, and naming the exact command and arguments means a stolen deploy account cannot become full root. In real life you check the file with visudo -c before leaving it in place, because a syntax error can lock out sudo.

## Switch a release with a symlink
id: lx-release-switch
module: linux
level: Intermediate
minutes: 15
lesson: linux/filesystem-and-navigation
engine: Simulated Linux shell
summary: Point the current symlink at a new release and understand why this makes rollback instant.
@@ story
The app runs from /srv/app/current, which is a symbolic link to a release folder. Release 2 is ready in /srv/app/releases/2. Switch to it. Do not copy or move any files.
@@ goals
- /srv/app/current points to /srv/app/releases/2.
- Both release folders still exist, so you could roll back by pointing the link at 1.
@@ hints
- `ls -l /srv/app` shows where `current` points today.
- `ln -sfn /srv/app/releases/2 /srv/app/current` replaces the link. The -n stops it from creating a link inside the old target.
- Check with `readlink /srv/app/current`.
@@ world
{"links": [{"path": "/srv/app/current", "to": "/srv/app/releases/1"}]}
@@ file /srv/app/releases/1/version.txt mode=644 owner=root
1
@@ file /srv/app/releases/2/version.txt mode=644 owner=root
2
@@ checks
[
 {"t": "cmd", "run": "readlink /srv/app/current", "code": 0, "out": "^/srv/app/releases/2$", "label": "current points at release 2"},
 {"t": "file", "path": "/srv/app/releases/1/version.txt", "exists": true, "label": "release 1 is still there for rollback"},
 {"t": "cmd", "run": "cat /srv/app/current/version.txt", "code": 0, "out": "^2$", "label": "the app sees the new version"}
]
@@ solution
ls -l /srv/app
readlink /srv/app/current
sudo ln -sfn /srv/app/releases/2 /srv/app/current
readlink /srv/app/current
cat /srv/app/current/version.txt
@@ explain
Deploying into a new folder and switching a link makes the change one quick step, and rolling back is the same step in reverse. The -n flag matters: without it, ln follows the old link and puts the new one inside the old release.

## Count errors for one service
id: lx-journal-errors
module: linux
level: Beginner
minutes: 10
lesson: linux/logs-and-troubleshooting
engine: Simulated Linux shell
summary: Read the journal for one unit, filter errors and save the count and the last message.
@@ story
The `shop` service restarted several times today. Find how many error lines it logged and what the last one said, so the on-call engineer can read it without opening the journal.
@@ goals
- ~/errors.txt has two lines: the number of lines from the shop journal that contain `error` (any case), then the text of the last such line.
- Only the shop unit counts; ignore other services.
@@ hints
- `journalctl -u shop --no-pager` prints the unit log.
- `grep -i error` keeps the error lines. `wc -l` counts, `tail -1` keeps the last.
- Build the file in two steps: `... | wc -l > ~/errors.txt` then `... | tail -1 >> ~/errors.txt`.
@@ world
{"services": {"shop": {"unit": "/etc/systemd/system/shop.service", "state": "active", "enabled": true, "desc": "Shop", "port": 8080, "http": {"/": {"status": 200, "body": "ok\n"}}}}, "journal": {"shop": ["Jan 05 10:00:01 host shop[1]: Starting Shop...", "Jan 05 10:00:02 host shop[1]: ERROR cannot open /var/lib/shop/data.db: permission denied", "Jan 05 10:00:03 host shop[1]: Started Shop.", "Jan 05 11:15:09 host shop[1]: warning: slow query 2.1s", "Jan 05 12:30:40 host shop[1]: error: upstream payments timed out", "Jan 05 13:05:12 host shop[1]: Error: connection pool exhausted", "Jan 05 13:05:13 host shop[1]: Restarting Shop..."]}}
@@ checks
[
 {"t": "equals", "path": "/home/user/errors.txt", "text": "3\nJan 05 13:05:12 host shop[1]: Error: connection pool exhausted", "label": "errors.txt has the count 3 and the last error line"}
]
@@ solution
journalctl -u shop --no-pager | grep -i error | wc -l > ~/errors.txt
journalctl -u shop --no-pager | grep -i error | tail -1 >> ~/errors.txt
cat ~/errors.txt
@@ explain
Writing the answer into a file turns a one-off investigation into something others can use. The case-insensitive match matters because applications spell errors in different ways.

## List the login users
id: lx-passwd-users
module: linux
level: Beginner
minutes: 10
lesson: linux/users-groups-permissions
engine: Simulated Linux shell
summary: Read /etc/passwd with awk to find real people who can log in.
@@ story
An audit asks: which accounts are real people with a login shell? In /etc/passwd these have a user id of 1000 or more and a shell that is not /usr/sbin/nologin or /bin/false. Produce the list.
@@ goals
- Write ~/people.txt with one user name per line, sorted alphabetically.
- /etc/passwd must not be changed.
@@ hints
- Fields in /etc/passwd are separated by colons: name:x:uid:gid:comment:home:shell.
- `awk -F: '$3 >= 1000 && $7 !~ /nologin|false/ {print $1}' /etc/passwd` selects them.
- Add `| sort > ~/people.txt`.
@@ world
{}
@@ file /etc/passwd mode=644 owner=root
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
user:x:1000:1000:Lab User:/home/user:/bin/bash
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
maya:x:1001:1001:Maya:/home/maya:/bin/bash
svc-backup:x:1002:1002:Backup:/var/backups:/bin/false
alex:x:1003:1003:Alex:/home/alex:/bin/zsh
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
@@ checks
[
 {"t": "equals", "path": "/home/user/people.txt", "text": "alex\nmaya\nuser", "label": "people.txt lists alex, maya and user"},
 {"t": "unchanged", "path": "/etc/passwd", "label": "/etc/passwd was not changed"}
]
@@ solution
awk -F: '$3 >= 1000 && $7 !~ /nologin|false/ {print $1}' /etc/passwd | sort > ~/people.txt
cat ~/people.txt
@@ explain
System accounts exist so services can own files without a person behind them. Separating them by user id and shell is the standard way to answer who can really log in, and it is also the first step of an access review.

## Stop a service from starting at boot
id: lx-disable-service
module: linux
level: Beginner
minutes: 10
lesson: linux/processes-and-services
engine: Simulated Linux shell
summary: Stop and disable an unused service, and confirm it stays off.
@@ story
The security scan found `telnet-legacy` listening on port 2323. Nobody uses it any more. Stop it now and make sure it does not start again after a reboot. The shop service must keep running.
@@ goals
- telnet-legacy is stopped and disabled.
- The shop service is still active.
@@ hints
- `systemctl status telnet-legacy` shows state and whether it is enabled.
- `sudo systemctl disable --now telnet-legacy` stops it and removes it from boot in one step.
- Confirm with `systemctl is-enabled telnet-legacy` and `ss -ltn`.
@@ world
{"services": {"telnet-legacy": {"unit": "/etc/systemd/system/telnet-legacy.service", "state": "active", "enabled": true, "desc": "Legacy telnet", "port": 2323}, "shop": {"unit": "/etc/systemd/system/shop.service", "state": "active", "enabled": true, "desc": "Shop", "port": 8080}}}
@@ file /etc/systemd/system/telnet-legacy.service mode=644 owner=root
[Unit]
Description=Legacy telnet
[Service]
ExecStart=/usr/sbin/telnet-legacy
[Install]
WantedBy=multi-user.target
@@ file /etc/systemd/system/shop.service mode=644 owner=root
[Unit]
Description=Shop
[Service]
ExecStart=/usr/bin/shop
[Install]
WantedBy=multi-user.target
@@ checks
[
 {"t": "service", "name": "telnet-legacy", "state": "inactive", "label": "telnet-legacy is stopped"},
 {"t": "service", "name": "telnet-legacy", "enabled": false, "label": "telnet-legacy is disabled"},
 {"t": "service", "name": "shop", "state": "active", "label": "shop is still running"}
]
@@ solution
systemctl status telnet-legacy
sudo systemctl disable --now telnet-legacy
systemctl is-enabled telnet-legacy
ss -ltn
systemctl status shop
@@ explain
Stopping and disabling are different. A stopped but enabled service comes back at the next reboot, which is how forgotten services reappear. Removing what you do not use is the cheapest security control.
