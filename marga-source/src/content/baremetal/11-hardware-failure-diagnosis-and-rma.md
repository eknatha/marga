---
title: Hardware failure diagnosis and RMA
minutes: 12
summary: Diagnose memory, disk, CPU and power faults from logs and sensors, and run a clean return-merchandise process with the vendor.
---

Most hardware failures leave clues before the outage. The skill is knowing where to look, which counters matter and how to hand the vendor enough proof to approve a replacement quickly.

## What you will learn

- Reading the system event log, ECC counters and SMART data
- Telling memory, disk, CPU and power problems apart
- Collecting evidence for an RMA
- Verifying and recording the repair

## Where the clues are

```bash
ipmitool sel elist | tail -5
edac-util -v
dmesg -T | grep -iE "mce|edac|machine check|i/o error"
smartctl -a /dev/sda | grep -E "Reallocated|Pending|Uncorrectable|Power_On"
sensors
```

- **Memory:** corrected ECC errors that keep rising on one DIMM, then uncorrected errors and machine check events
- **Disks:** reallocated or pending sectors, I/O errors, long command timeouts
- **CPU and board:** machine check exceptions, thermal throttling, random reboots
- **Power:** PSU failure events, voltage warnings, losing redundancy

## Diagnosis method

Drain the workload first. Read the SEL for the first error, not just the last, and note the slot or serial. Run the vendor's diagnostic or a memory test to reproduce the fault, and swap the suspected part only after the evidence points at it. Changing many parts at once hides the cause.

## RMA

Vendors want the serial number, the diagnostic output, the SEL and the exact error. Attach them to one ticket, request an advance replacement when downtime matters and label the failed part for return. After the swap, run burn-in, re-apply the firmware and BIOS baseline, and record the part serial against the server.

```bash
smartctl -x /dev/sda > /var/tmp/sda-smart.txt
ipmitool sel list > /var/tmp/sel.txt
dmidecode -t memory | grep -E "Locator|Serial|Size"
```

## Incident: The weekly crash

> **Incident:** A server crashed once a week until one DIMM was replaced.

```console
EDAC MC0: 1 CE memory read error on CPU_SrcID#0_Channel#2_DIMM#1
EDAC MC0: 14 CE memory read errors on the same DIMM
mce: [Hardware Error]: uncorrected memory error
```

Nobody watched corrected error counts. They grew for weeks and then became an uncorrectable fault that crashed the kernel. After the swap the team added an alert on corrected errors per DIMM and a policy to replace modules before uncorrected errors appear.

## Common mistakes

- Replacing several parts at once
- Ignoring corrected errors
- Sending the vendor vague descriptions
- Skipping burn-in after a repair

```quiz
Q: What do rising corrected ECC errors suggest?
+ A DIMM that may fail soon
- A network loop :: No.
- A DNS issue :: No.
- A full disk :: No.
> The trend is a warning.

Q: What should you do before diagnosing a node in service?
+ Drain the workload
- Delete logs :: No.
- Update the firmware :: No.
- Rename the host :: No.
> Protect running work.

Q: What helps a vendor approve an RMA?
+ Serial numbers and diagnostic output
- A phone call only :: No.
- A screenshot of the dashboard :: No.
- No details :: No.
> Evidence speeds approval.

Q: Why change one part at a time?
+ It shows which part caused the fault
- It is cheaper :: No.
- It avoids logs :: No.
- It is required by law :: No.
> Isolation finds the cause.
```

```cards
SEL :: The BMC's system event log
ECC :: Error-correcting memory that fixes single-bit errors
RMA :: Return merchandise authorization for a faulty part
SMART :: Disk self-monitoring data
```
