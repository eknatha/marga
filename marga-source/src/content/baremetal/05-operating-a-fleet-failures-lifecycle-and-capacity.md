---
title: Operating a fleet: failures, lifecycle and capacity
minutes: 15
summary: Diagnose common hardware failures, plan the life of a server from rack to retirement, and keep enough spare capacity and parts.
---

With hundreds of servers, hardware failure is routine, not exceptional. Operating bare metal well means finding faults quickly, replacing parts safely and planning ahead.

## What you will learn

- Reading hardware events: ECC memory, disks, fans, power
- A repeatable method for a sick server
- The lifecycle: receive, rack, provision, run, repair, retire
- Spares, warranty and capacity
- How bare metal and the cloud differ in who fixes what

## Common hardware failures

| Sign | Likely cause | First check |
|---|---|---|
| Random reboots | Failing memory or power supply | BMC event log |
| Correctable ECC errors | A DIMM starting to fail | Which slot, how often |
| Slow disk, many retries | Disk with bad sectors | `smartctl -a` |
| Fan or temperature alarms | Failed fan, blocked airflow | `ipmitool sensor list` |
| Network errors | Bad cable, optic or port | `ip -s link`, switch counters |

**ECC memory** corrects single-bit errors silently. A few correctable errors are normal. A DIMM that keeps reporting them is likely to produce an **uncorrectable** error soon, which crashes the machine. Replace it at the first maintenance window.

```console
$ ipmitool sel elist | grep -i ecc
 3 | 11/02/2026 | 03:14:22 | Memory #0x87 | Correctable ECC | Asserted
 4 | 11/02/2026 | 03:41:09 | Memory #0x87 | Correctable ECC | Asserted
 5 | 11/02/2026 | 04:02:55 | Memory #0x87 | Correctable ECC | Asserted
```

The same sensor three times in an hour points at one DIMM slot.

## A method for a sick server

1. **Drain** it: move workloads away so repair is safe.
2. **Read** the evidence: BMC log, SMART, kernel log, switch counters.
3. **Decide** the part: do not swap parts at random.
4. **Replace** one thing, then test.
5. **Record** it, so a repeat failure on the same machine shows up.
6. Return it to service only after it passes a short burn-in.

## Lifecycle

A server goes through receiving (check against the order and asset tag), racking, provisioning, service, repair and retirement. Retirement includes **wiping disks securely** and removing the machine from inventory, monitoring, DNS and the configuration database. Forgotten machines keep drawing power and keep old credentials alive.

## Spares and warranty

- Keep spare drives, DIMMs, power supplies and cables on site, since shipping can take days.
- Know the warranty terms. Vendors usually ship the part but you replace it, unless you buy on-site service.
- Track **mean time between failures** across your fleet. If one batch fails faster, ask the vendor early.

## Capacity

Plan for losing a rack and a feed. Leave room so that when machines are out for repair, the rest still carry the load. Order lead times for hardware can be weeks or months, so plan quarters ahead, not days.

```wrongpath
@goal A server crashes about once a week. Stop the crashes.
@wrong
# reboot it each time and replace the disk "just in case"
sudo reboot
@result
$ ipmitool sel elist | grep -c ECC
214
# the disk change changes nothing, the crashes continue
@why Rebooting clears the symptom and the disk was never the cause. The event log shows hundreds of correctable memory errors from one slot. The fault was a DIMM that grew worse until it caused an uncorrectable error.
@right
ipmitool sel elist | grep -i memory
# note the slot, drain the host, replace that DIMM, run a memory test
ipmitool sel clear
@after Use the evidence the hardware already collects. Replace the part it points to, and clear the log only after you have saved it.
```

## Incident: A fleet-wide reboot loop after a firmware update

> **Incident:** After a firmware update across 120 servers, 30 would not come back.

The update was pushed to every host at once. A batch with an older BMC version needed an intermediate firmware first, and without it the BMC hung. With no BMC, the team had to visit the datacentre. Afterwards updates went in waves of five, starting with one canary, with a check that each host was healthy before the next wave.

## Common mistakes

- Replacing parts at random
- Updating firmware everywhere at once
- Forgetting to wipe disks and remove retired servers from inventory
- Having no spares and waiting days for a cable

```quiz
Q: A DIMM reports correctable ECC errors several times in an hour. What should you do?
+ Plan to replace that DIMM soon, since it is likely to fail
- Ignore it, they are corrected :: Rising errors often precede a crash.
- Reboot every hour :: Not a fix.
- Replace the CPU :: The log points at memory.
> Repeated correctable errors from one slot are an early warning.

Q: What should you do first with a failing server that carries workloads?
+ Drain it so the repair is safe
- Pull the plug :: Risky.
- Reinstall at once :: You lose the evidence.
- Wait for it to fail :: Not a plan.
> Moving work away first makes repair safe and unhurried.

Q: Why roll out firmware in small waves?
+ So a bad update affects a few servers, not the whole fleet
- It is faster :: Not faster.
- It is cheaper :: Not the reason.
- Vendors require it :: Not the reason.
> A canary and small waves limit the blast radius.

Q: What does retiring a server involve besides unracking it?
+ Wiping its disks and removing it from inventory, monitoring and DNS
- Nothing else :: Stale entries cause problems.
- Only unplugging it :: Data and credentials remain.
- Only changing its hostname :: Not enough.
> Retirement must remove data and records.
```

```cards
ECC :: Memory that corrects single-bit errors
Drain :: Move workloads off a host
Canary :: A first small test before a wider rollout
RMA :: Return of a faulty part to the vendor
MTBF :: Mean time between failures
Asset tag :: Label that identifies a machine in inventory
```
