---
title: Processes and services with systemd
minutes: 15
summary: Inspect and control processes, send the right signals, and manage services with systemd units and journalctl.
---

After a deploy, the new service will not stay up. `systemctl status` says "activating (auto-restart)" over and over. You cannot fix a crash loop by restarting it harder. You need to read why it exits. This lesson covers the process basics and the systemd workflow you will use daily.

## What you will learn

- How to list and inspect processes
- What signals are and why `kill -9` is a last resort
- How a systemd unit file describes a service
- How to read a failing service's logs and exit codes

## Processes in practice

A process is a running program with a process ID (PID), an owner and a parent. The kernel starts one process, PID 1, and every other process descends from it. On most modern distributions PID 1 is **systemd**.

```console
$ ps -eo pid,ppid,user,%cpu,%mem,etime,cmd --sort=-%mem | head -4
    PID    PPID USER     %CPU %MEM     ELAPSED CMD
   2211     1 deploy    3.1 18.4  3-02:11:09 /opt/shop/current/bin/server --port 8080
    845     1 postgres  0.4  6.2 12-01:02:44 /usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main
   1032     1 root      0.0  0.9 12-01:03:10 /usr/sbin/nginx -g daemon on; master_process on;
```

This is sample output. `ps -eo` lets you choose columns, and `--sort=-%mem` puts the biggest memory users first. `pgrep -a shop` finds processes by name, and `top` or `htop` shows a live view.

## Signals

Signals are messages sent to a process. The ones you will use:

| Signal | Number | Meaning |
|--------|--------|---------|
| `SIGTERM` | 15 | Ask the process to shut down cleanly (the default for `kill`) |
| `SIGINT` | 2 | Same as pressing Ctrl+C |
| `SIGHUP` | 1 | Many daemons reload configuration on this |
| `SIGKILL` | 9 | Force-stop immediately; the process cannot catch it or clean up |

```bash
kill 2211          # SIGTERM: lets the app finish requests and close files
kill -HUP 1032     # nginx reloads its configuration
kill -9 2211       # last resort: no cleanup, can leave locks and half-written data
```

Try `SIGTERM` first and wait. Reach for `SIGKILL` only when a process ignores `SIGTERM`.

## Services with systemd

A **unit file** tells systemd how to run a service. Custom units go in `/etc/systemd/system/`.

```ini
[Unit]
Description=Shop API
After=network-online.target
Wants=network-online.target

[Service]
User=deploy
WorkingDirectory=/opt/shop/current
ExecStart=/opt/shop/current/bin/server --port 8080
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

`ExecStart` must be an absolute path. `Restart=on-failure` restarts after a crash but not after a normal stop. `WantedBy` decides when the service starts at boot.

```bash
sudo systemctl daemon-reload      # required after editing a unit file
sudo systemctl enable --now shop  # start now and at every boot
sudo systemctl status shop        # state, recent log lines, exit code
sudo systemctl restart shop
journalctl -u shop -f             # follow the service's logs
```

> **Tip:** `systemctl status` shows the last few log lines, but `journalctl -u shop -n 50 --no-pager` shows more context. Combine `-p err` to show only errors.

## Incident: the service restarts every five seconds

> **Incident:** After a release, `shop.service` never becomes active. Users get connection refused.

```console
$ systemctl status shop
● shop.service - Shop API
     Loaded: loaded (/etc/systemd/system/shop.service; enabled)
     Active: activating (auto-restart) (Result: exit-code) since Sat 2026-10-24 02:31:18 UTC; 3s ago
    Process: 4410 ExecStart=/opt/shop/current/bin/server --port 8080 (code=exited, status=203/EXEC)
$ journalctl -u shop -n 3 --no-pager
Oct 24 02:31:18 app01 systemd[1]: shop.service: Failed at step EXEC spawning /opt/shop/current/bin/server: No such file or directory
Oct 24 02:31:18 app01 systemd[1]: shop.service: Main process exited, code=exited, status=203/EXEC
Oct 24 02:31:18 app01 systemd[1]: shop.service: Failed with result 'exit-code'.
```

Exit status `203/EXEC` means systemd could not even start the binary. The message names the path, so check it:

```console
$ ls -l /opt/shop/current/bin/
total 4
-rwxr-xr-x 1 deploy deploy 1873 Oct 24 02:29 start.sh
```

The new release ships `start.sh`, but the unit still points at `bin/server`. Update `ExecStart`, run `daemon-reload`, restart, and confirm:

```console
$ sudo systemctl daemon-reload && sudo systemctl restart shop
$ systemctl is-active shop
active
```

The pattern is general: read the **exit code** and the **first error line**, not the restart loop. Common codes are `203/EXEC` (cannot execute the binary), `200/CHDIR` (bad `WorkingDirectory`), and `217/USER` (the `User=` does not exist).

## Common mistakes

- Editing a unit file and forgetting `systemctl daemon-reload`
- Using relative paths in `ExecStart`
- Using `kill -9` as the first step
- Reading only `systemctl status` and missing earlier errors in `journalctl`

```quiz
Q: What does kill 2211 send by default?
- SIGKILL
+ SIGTERM
- SIGHUP
- SIGSTOP
> kill sends SIGTERM (15) unless you choose another signal. It asks the process to shut down cleanly.

Q: Why is kill -9 a last resort?
- It is slower than other signals
+ The process cannot catch it, so it gets no chance to clean up and may leave locks or partial data
- It only works for root
- It restarts the process
> SIGKILL is handled by the kernel. The process cannot run shutdown code.

Q: You edited /etc/systemd/system/shop.service. What must you run before restarting?
- systemctl enable shop
+ systemctl daemon-reload
- systemctl mask shop
- reboot
> systemd caches unit definitions. daemon-reload makes it read your changes.

Q: A service exits with status=203/EXEC. What does that mean?
- The service ran out of memory
- The network was unavailable
+ systemd could not execute the ExecStart binary, often a wrong path or missing execute permission
- The service was stopped by an administrator
> 203/EXEC is an exec failure. Check the path in ExecStart, that the file exists and that it is executable.
```

```cards
Signal 15 vs signal 9? :: 15 (SIGTERM) asks for a clean shutdown; 9 (SIGKILL) forces an immediate stop with no cleanup
Command to follow a service's logs? :: journalctl -u SERVICE -f
What does systemctl enable --now do? :: Starts the service immediately and at every boot
Exit status 203/EXEC means? :: systemd could not run the ExecStart program
```
