---
title: systemd in depth: overrides, targets and dependencies
minutes: 14
summary: Change a service safely with drop-in overrides, understand ordering and dependencies, and use targets and resource settings.
---

You need one extra environment variable for a packaged service. Editing the file under /usr/lib works until the next package update replaces it, and then the service quietly loses the setting. systemd has a clean answer, the drop-in override, and a few concepts that explain why services start in the order they do.

## What you will learn

- Edit a unit safely with `systemctl edit` and drop-in files
- Order and dependencies: After, Requires, Wants
- Targets and what happens at boot
- Restart policies and resource limits in a unit

## Where unit files live and who wins

Packages install units in `/usr/lib/systemd/system/`. Your changes belong in `/etc/systemd/system/`, which has priority and is never touched by package updates.

```console
$ systemctl cat shop.service
# /usr/lib/systemd/system/shop.service
[Service]
ExecStart=/usr/bin/shop
$ sudo systemctl edit shop.service
```

`systemctl edit` opens an empty file at `/etc/systemd/system/shop.service.d/override.conf`. Put only the lines you want to change there:

```ini
[Service]
Environment=SHOP_MODE=production
Restart=on-failure
RestartSec=5
```

After saving, systemd reloads the configuration for you. To clear a list setting such as `ExecStart`, set it to empty first, then set the new value. `systemctl cat` shows the original and all drop-ins together, which is the first thing to read when a service behaves unexpectedly.

## Ordering is not the same as dependency

Two ideas are often confused:

- **Ordering** (`After=`, `Before=`) says which unit starts first if both are being started.
- **Dependency** (`Requires=`, `Wants=`) says that starting this unit pulls in another.

`Wants=` is a soft dependency: if the other unit fails, this one still starts. `Requires=` is hard: failure of the other stops this unit. A common, correct pair is `Wants=network-online.target` together with `After=network-online.target`, so the service starts after the network is really up.

```ini
[Unit]
Description=Shop API
Wants=network-online.target postgresql.service
After=network-online.target postgresql.service
```

If you write only `After=` the other unit is not started for you, and if you write only `Wants=` the two may start at the same moment. You usually need both.

## Targets and boot

A **target** is a named group of units, a goal for boot. `multi-user.target` is the usual server state (no graphical session), and `graphical.target` adds a desktop. `systemctl enable` makes a symlink so that a unit is pulled in by a target, usually `multi-user.target`, through the `WantedBy=` line in `[Install]`.

```console
$ systemctl get-default
multi-user.target
$ systemctl list-dependencies multi-user.target | head
$ systemd-analyze blame | head -5
$ systemd-analyze critical-chain
```

`systemd-analyze blame` shows which units took the most time to start, and `critical-chain` shows the chain that decided the total boot time. Use them when a server boots slowly.

## Restarts and limits

A unit can describe how it should behave when things go wrong, so that you do not need a separate watchdog script.

```ini
[Service]
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=300
StartLimitBurst=5
MemoryMax=1G
CPUQuota=150%
LimitNOFILE=65536
ProtectSystem=strict
NoNewPrivileges=true
```

`StartLimit*` stops a crash loop after five tries in five minutes, and the unit then shows `failed` instead of hiding the problem. `MemoryMax` and `CPUQuota` use cgroups, so one service cannot starve the others. The `Protect*` and `NoNewPrivileges` lines reduce what a compromised service can do, and `systemd-analyze security shop.service` scores them.

```predict
Q: You change a drop-in file by hand with a text editor and the service ignores it. What did you forget?
???
Run `sudo systemctl daemon-reload` so systemd re-reads the files, then restart the service.
> systemctl edit reloads for you, but a manual edit does not. Check the result with systemctl cat and systemctl show.
```

## Incident: The setting that vanished

> **Incident:** After a routine package update, the shop service started failing at 03:00 because a database password variable was missing.

```console
$ systemctl cat shop.service | head -4
# /usr/lib/systemd/system/shop.service
[Service]
ExecStart=/usr/bin/shop
$ ls /etc/systemd/system/shop.service.d/
ls: cannot access ...: No such file or directory
```

Someone had added `Environment=` lines straight into the packaged file under /usr/lib. The package update replaced the file, and the variable was gone. The fix was a drop-in override in /etc, plus an `EnvironmentFile=` with strict permissions for the secret. The team also added a check to the weekly review that lists services with local changes by running systemd-delta.

## Common mistakes

- Editing files in /usr/lib/systemd/system instead of using an override
- Writing After= without Wants=, so the dependency never starts
- Forgetting daemon-reload after a manual edit
- Using Restart=always with no start limit, which hides crash loops

```quiz
Q: Where should local changes to a packaged unit go?
+ A drop-in file under /etc/systemd/system/NAME.service.d/
- Directly in /usr/lib/systemd/system :: A package update will overwrite your change.
- In /tmp :: It is cleared on reboot.
- In the home directory :: systemd does not read units from there.
> Drop-ins survive package updates and are easy to review.

Q: What does After=network-online.target do on its own?
+ Orders this unit after the target, but does not start the target
- Starts the network :: That needs Wants= or Requires=.
- Makes the unit fail if the network fails :: That would be Requires=.
- Nothing at all :: It does affect start order.
> Ordering and dependency are separate settings.

Q: Which command shows which unit slowed the boot most?
+ systemd-analyze blame
- systemctl status :: It shows a single unit.
- journalctl -f :: It follows new log lines.
- systemd-delta :: It lists overridden files.
> blame lists units by start time; critical-chain shows the decisive chain.

Q: What is the benefit of StartLimitBurst?
+ A unit that keeps crashing stops after a few tries and shows as failed
- It makes the service faster :: It does not affect speed.
- It limits memory :: MemoryMax does that.
- It hides errors :: The opposite: it makes the failure visible.
> A visible failed state beats an endless silent restart loop.
```

```cards
See the original file and all overrides :: systemctl cat NAME
Edit an override safely :: sudo systemctl edit NAME
Soft versus hard dependency :: Wants versus Requires
Show slow boot units :: systemd-analyze blame
Score a unit security settings :: systemd-analyze security NAME
```
