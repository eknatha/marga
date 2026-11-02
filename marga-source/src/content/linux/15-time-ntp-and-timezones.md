---
title: Time, NTP and time zones
minutes: 12
summary: Keep server clocks correct with NTP, understand UTC versus local time, and diagnose failures that come from clock drift.
---

A login token is rejected as "not yet valid", a certificate seems to expire a day early, and logs from two servers cannot be lined up. All three problems have the same cause: the servers do not agree on the time. Time looks like a small topic until it breaks authentication, replication and every investigation that relies on timestamps.

## What you will learn

- The difference between the hardware clock, the system clock and a time zone
- How NTP keeps clocks in step and how to check that it works
- Why servers should log and run in UTC
- How clock drift breaks tokens, certificates and logs

## Clocks and zones

Linux keeps a **system clock** that counts time since 1970 in UTC. A **time zone** only decides how that number is shown to people. The **hardware clock** (RTC) keeps time while the machine is off, and is read at boot.

```console
$ date
Tue Jan  6 10:02:11 UTC 2026
$ timedatectl
               Local time: Tue 2026-01-06 10:02:11 UTC
           Universal time: Tue 2026-01-06 10:02:11 UTC
                 Time zone: Etc/UTC (UTC, +0000)
System clock synchronized: yes
              NTP service: active
```

The two lines to watch are `System clock synchronized` and `NTP service`. Set the zone with `sudo timedatectl set-timezone Etc/UTC`. For servers, UTC is the best choice: no daylight saving changes, and logs from every region sort in one order.

## How NTP keeps time

The **Network Time Protocol** asks several time servers for the time, estimates the network delay, and adjusts the local clock. Small errors are corrected by *slewing*, which runs the clock slightly faster or slower. Large errors may cause a *step*, a sudden jump, which can upset software that measures durations.

On most distributions the client is `systemd-timesyncd` or `chrony`. Chrony is the usual choice on servers because it recovers quickly and works well on virtual machines.

```console
$ chronyc tracking
Reference ID    : A9FEA97B (169.254.169.123)
Stratum         : 4
System time     : 0.000012345 seconds fast of NTP time
Last offset     : +0.000008123 seconds
$ chronyc sources -v
```

The `System time` line is the current error. Milliseconds are normal; seconds are a problem. In a cloud, prefer the provider's own time source (for example the link-local address shown above), which is close and reliable.

## What breaks when time is wrong

Many systems trust the clock more than you might expect:

| Feature | What goes wrong with a wrong clock |
|---------|------------------------------------|
| TLS certificates | A certificate looks "not yet valid" or "expired" |
| Signed tokens (JWT, cloud API signatures) | Requests rejected, often with a clock skew message |
| Kerberos | Logins fail when skew is more than a few minutes |
| Databases and clusters | Replication ordering and leases misbehave |
| Logs and metrics | Events from two hosts appear in the wrong order |

A cloud API that says the signature has expired, when the key is correct, is a classic sign of drift of more than five minutes.

## Fixing and checking drift

Check first, then fix the cause, not only the symptom.

```bash
timedatectl status
chronyc tracking
sudo systemctl enable --now chrony
sudo chronyc makestep      # step the clock once, now
```

If a virtual machine drifts after it was paused or migrated, enable the guest time-sync feature or point chrony at the hypervisor or cloud time source. Never set the clock by hand on a production server as a lasting fix. It hides the problem and the drift returns. Add a monitoring alert on the offset (for example, over 100 ms) so that you hear about drift before users do.

```predict
Q: A server shows `System clock synchronized: no`. Name two things you check before changing anything.
???
Check that the time service is running (systemctl status chrony) and that it can reach a time source (chronyc sources). Then look at firewall rules for UDP port 123.
> Synchronization needs a running client and a reachable source. NTP uses UDP port 123, which strict outbound firewalls often block.
```

## Incident: Tokens rejected after a restore

> **Incident:** After a virtual machine was restored from a snapshot, every call from it to the cloud API fails with "signature expired", although the credentials are valid.

```console
$ date -u
Mon Jan  5 08:15:40 UTC 2026
$ curl -sI https://api.example.com | grep -i ^date
date: Tue, 06 Jan 2026 10:02:05 GMT
$ chronyc tracking | grep "System time"
System time     : 93815.2 seconds slow of NTP time
```

The restored machine woke up with the time of the snapshot, a day behind, and the time client was disabled in the image. Cloud APIs reject signatures that differ from their own clock by more than a few minutes. The fix was `chronyc makestep` and enabling the chrony service, and the team added a start-up check that waits for synchronization before the application starts, plus an alert on clock offset.

## Common mistakes

- Setting the clock by hand and not fixing the time service
- Using local time with daylight saving on servers, so logs repeat or skip an hour
- Forgetting that a restored or paused virtual machine may start with an old clock
- Blocking UDP port 123 on a firewall and not noticing for months

```quiz
Q: Which time zone is the best default for servers?
+ UTC, so logs from all regions line up and there are no daylight saving jumps
- The time zone of the head office :: Servers in other regions then log in a different zone from your logs.
- A different zone for each application :: Mixed zones make logs hard to compare.
- The zone with the fewest holidays :: Holidays have nothing to do with it.
> UTC removes the ambiguity from logs and schedules.

Q: What does NTP do?
+ Adjusts the system clock using time servers, correcting errors by slewing or stepping
- Encrypts network traffic :: That is TLS or a VPN.
- Distributes files :: NTP only carries time.
- Sets the time zone :: The zone is a separate setting.
> NTP synchronizes clocks, usually with small adjustments.

Q: Which symptom most suggests clock drift?
+ Valid credentials rejected with a signature expired or not yet valid message
- A full disk :: A full disk gives write errors.
- A high load average :: Load is about work, not time.
- A slow DNS lookup :: DNS has its own symptoms.
> Signed requests and certificates depend on an accurate clock.

Q: Which port does NTP use?
+ UDP 123
- TCP 80 :: That is HTTP.
- TCP 22 :: That is SSH.
- UDP 53 :: That is DNS.
> A firewall that blocks UDP 123 can stop synchronization.
```

```cards
Command that shows sync status :: timedatectl
Command that shows chrony offset :: chronyc tracking
Best server time zone :: UTC
Port used by NTP :: UDP 123
Why not set the clock by hand :: The drift returns and the cause stays hidden
```
