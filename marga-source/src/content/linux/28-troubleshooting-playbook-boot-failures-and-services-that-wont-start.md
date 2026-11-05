---
title: Troubleshooting playbook: boot failures and services that will not start
minutes: 12
summary: Diagnose failed units with systemctl and journalctl, find slow or broken boot steps, and recover from emergency mode caused by mounts and configuration mistakes.
---

A reboot is the moment hidden mistakes appear: an unmounted disk, a config file with a typo, a service that depended on something that no longer starts first. Linux gives clear evidence if you know where to look.

## What you will learn

- Read `systemctl status` and `journalctl` for a failing unit
- Use `systemd-analyze` to find slow or blocked boot steps
- Recover from emergency mode caused by `fstab` errors
- Prevent repeat failures with ordering, timeouts and `nofail`

## A service will not start

```console
$ systemctl status payments.service
$ journalctl -u payments.service -b --no-pager | tail -40
$ systemctl cat payments.service
$ systemctl list-dependencies payments.service
$ systemd-analyze verify /etc/systemd/system/payments.service
```

`status` shows the state, the last exit code and recent log lines. `journalctl -u UNIT -b` gives the full log for this boot. `systemctl cat` shows the unit with all drop-ins, which is where surprising overrides hide. Typical causes: a missing file or permission, a port already in use, a wrong user, an environment variable that is not set, and a dependency that is not ready (`After=` and `Requires=` describe order and need separately).

## What slowed the boot

```console
$ systemd-analyze
$ systemd-analyze blame | head
$ systemd-analyze critical-chain
```

`blame` lists units by the time they took, and `critical-chain` shows the sequence that actually decided boot time. A unit waiting for a network mount or a DNS name is a common culprit, and the fix is a sensible timeout or a dependency on `network-online.target` only where it is really needed.

## Emergency mode and fstab

If a filesystem in `/etc/fstab` cannot be mounted, systemd may drop to emergency mode and wait at a prompt. Read the error, then fix the line:

```console
$ journalctl -xb -p err | head -20
$ findmnt --verify
$ blkid
$ systemctl daemon-reload
```

Use UUIDs from `blkid` instead of device names, which can change. For non-critical mounts add `nofail` and `x-systemd.device-timeout=10s`, so a missing disk does not block the whole system. For a broken kernel or boot loader, boot an older kernel entry from the boot menu, or use a rescue image, mount the root filesystem and repair it. On cloud instances, attach the disk to a helper instance when the console is not available.

## Before you reboot

Validate changes before the reboot that will test them: `findmnt --verify` for mounts, `systemd-analyze verify` for units, `sshd -t` for SSH config, `nginx -t` for web configs. Keep a working console or out-of-band access open, and make sure a rollback exists.

```predict
Q: After a reboot the server waits at an emergency shell and the journal mentions a missing data disk. What is the likely fix?
???
Correct the fstab entry for that disk, and add nofail with a short device timeout if the disk is not essential for boot. Then reload and mount.
> A bad mount line blocks boot.
```

## Incident: The extra disk that stopped the boot

> **Incident:** After a routine kernel patch and reboot, a server did not come back on the network.

```console
$ journalctl -xb -p err | head -5
Dependency failed for /data.
You are in emergency mode.
$ grep data /etc/fstab
/dev/sdc1  /data  ext4  defaults  0  2
```

A data disk had been detached weeks earlier, and its device name had been reused by a different disk. The mount failed and systemd chose emergency mode, so SSH never started. After console access, the team replaced the line with a UUID-based entry with `nofail`, and added a pre-reboot check of `findmnt --verify` to the patching runbook.

## Common mistakes

- Rebooting with unvalidated changes and no console access
- Using device names like `/dev/sdc1` in fstab
- Making every mount essential for boot
- Reading only `status` and never the full journal for that boot

```quiz
Q: Which command shows the full log of a unit for this boot?
+ journalctl -u UNIT -b
- systemctl enable UNIT :: That changes startup, not logs.
- df -h :: Disk space only.
- ls /etc :: Lists files.
> The journal has the details.

Q: What does the nofail option do in fstab?
+ Boot continues even if that filesystem fails to mount
- It deletes the filesystem :: It does not delete.
- It speeds up the disk :: Not its purpose.
- It encrypts the mount :: Not its purpose.
> Non-critical mounts should not block boot.

Q: How do you see which units made boot slow?
+ systemd-analyze blame and critical-chain
- uptime :: Only shows load.
- free -m :: Memory only.
- ss -s :: Sockets only.
> These show time per unit.

Q: What should you do before a risky reboot?
+ Validate mounts and configs and keep console access ready
- Reboot first and see :: This risks a long outage.
- Disable logging :: Removes evidence.
- Delete the old kernel :: Removes your rollback.
> Test the change before the restart.
```

```cards
systemctl status :: state, exit code and recent log lines
journalctl -u UNIT -b :: complete log of one unit for this boot
systemd-analyze blame :: units sorted by start time
fstab safety :: use UUIDs and add nofail for non-critical mounts
Pre-reboot checks :: findmnt --verify, systemd-analyze verify, config tests
```
