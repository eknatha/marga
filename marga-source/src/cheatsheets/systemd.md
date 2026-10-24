---
title: systemd and services
summary: Manage services, write unit files, read the journal, schedule with timers and harden services.
module: linux
---

## Service control

```bash
systemctl status nginx
systemctl start nginx
systemctl stop nginx
systemctl restart nginx
systemctl reload nginx                 # reload config without a full restart
systemctl enable --now nginx           # start now and at boot
systemctl disable nginx
systemctl is-active nginx
systemctl is-enabled nginx
systemctl list-units --type=service --state=running
systemctl list-units --failed
systemctl daemon-reload                # after editing unit files
```

## A service unit

```ini
[Unit]
Description=Shop API
After=network-online.target
Wants=network-online.target

[Service]
User=shop
Group=shop
WorkingDirectory=/opt/shop
EnvironmentFile=/etc/shop/shop.env
ExecStart=/opt/shop/bin/server --port 8080
Restart=on-failure
RestartSec=3
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Save as `/etc/systemd/system/shop.service`, then run `systemctl daemon-reload` and `systemctl enable --now shop`.

| Setting | Meaning |
|---------|---------|
| `After=` | Start order only |
| `Wants=` / `Requires=` | Soft / hard dependency |
| `Restart=on-failure` | Restart after a crash |
| `Type=simple` | Default: the main process is `ExecStart` |
| `EnvironmentFile=` | Load variables from a file |

## Overrides without editing vendor files

```bash
systemctl edit nginx                   # creates a drop-in override
systemctl cat nginx                    # show the effective unit
systemctl show nginx -p MainPID,ActiveState,MemoryCurrent
```

## Journal

```bash
journalctl -u shop                      # one service
journalctl -u shop -f                   # follow
journalctl -u shop --since "1 hour ago"
journalctl -u shop -p err               # errors and worse
journalctl -b                           # this boot
journalctl -b -1                        # previous boot
journalctl --disk-usage
journalctl --vacuum-time=7d             # trim old entries
journalctl -o json-pretty -n 1 -u shop
```

## Timers (a modern alternative to cron)

```ini
# /etc/systemd/system/backup.timer
[Unit]
Description=Nightly backup

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

```bash
systemctl enable --now backup.timer
systemctl list-timers --all
systemd-analyze calendar "Mon *-*-* 03:00"   # test a schedule
```

`Persistent=true` runs a missed job after the machine was off.

## Hardening options

```ini
[Service]
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/shop
CapabilityBoundingSet=
MemoryMax=512M
```

```bash
systemd-analyze security shop.service     # exposure score and suggestions
```

## Troubleshooting a failing service

1. `systemctl status NAME` for state, exit code and the last log lines
2. `journalctl -u NAME -b` for the full log of this boot
3. `systemctl cat NAME` to confirm which unit file and overrides apply
4. Run the `ExecStart` command by hand as the service user
5. Check permissions on files, the working directory and ports
6. `systemctl daemon-reload` if you edited the unit and nothing changed

| Symptom | Likely cause |
|---------|--------------|
| `status=203/EXEC` | Wrong path or not executable |
| `status=217/USER` | User does not exist |
| `status=200/CHDIR` | Missing working directory |
| Restart loop | App crashes; read the journal; check `RestartSec` |
| `start-limit-hit` | Too many rapid restarts; fix cause, then `systemctl reset-failed NAME` |

## Inspect units and boot

```bash
systemctl status nginx --no-pager -l
systemctl is-active nginx; systemctl is-enabled nginx
systemctl list-units --failed
systemctl list-timers --all
systemctl cat nginx
systemctl show nginx -p ExecStart -p Restart -p MainPID
systemctl list-dependencies multi-user.target --reverse | head
systemd-analyze blame | head
systemd-analyze critical-chain
systemd-analyze verify /etc/systemd/system/app.service
systemd-analyze security app.service
```

## Change units safely

```bash
sudo systemctl edit app.service
sudo systemctl daemon-reload
sudo systemctl restart app.service
sudo systemctl reload nginx
sudo systemctl enable --now app.service
sudo systemctl disable --now app.service
sudo systemctl mask unwanted.service
sudo systemctl revert app.service
sudo systemctl set-property app.service MemoryMax=1G
```

> **Danger:** Do not edit files under `/usr/lib/systemd/system`: a package update overwrites them. Use `systemctl edit` to create a drop-in.

> **Warning:** `restart` stops and starts the service, so users see an interruption. Use `reload` when the program supports it, and test the config first (for example `nginx -t`).

> **Warning:** Always run `daemon-reload` after changing unit files, and check `systemctl status` for the result. A broken unit can leave a service down.

> **Warning:** `systemctl mask` makes a unit impossible to start, even as a dependency. `isolate`, `poweroff`, `reboot` and `rescue` change the state of the whole machine, so confirm the host with `hostname` first.

## Logs with journalctl

```bash
journalctl -u app.service -f
journalctl -u app.service --since "1 hour ago" -p err
journalctl -b -1 -p err
journalctl -k --since today
journalctl --list-boots
journalctl _PID=1234
journalctl -o json-pretty -n 1 -u app.service
journalctl --disk-usage
sudo journalctl --vacuum-time=14d
```

> **Danger:** `journalctl --vacuum-*` deletes old logs for good. Keep what you need for audits and postmortems, and check `Storage=persistent` if logs must survive a reboot.

## Timers and unit templates

```ini
[Unit]
Description=Nightly cleanup
[Service]
Type=oneshot
ExecStart=/usr/local/bin/cleanup.sh
[Install]
WantedBy=multi-user.target
```

```ini
[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true
RandomizedDelaySec=300
[Install]
WantedBy=timers.target
```

```ini
[Service]
Restart=on-failure
RestartSec=5
StartLimitBurst=5
StartLimitIntervalSec=60
NoNewPrivileges=true
ProtectSystem=strict
PrivateTmp=true
```

> **Warning:** `Restart=always` with no limit can hide a crash loop that burns CPU and fills logs. Set `RestartSec` and the start limits, and alert on restarts.

> **Warning:** A unit that runs as root with no sandbox options has full access. Use a dedicated user and options such as `NoNewPrivileges` and `ProtectSystem`.
