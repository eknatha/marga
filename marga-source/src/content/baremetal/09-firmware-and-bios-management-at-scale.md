---
title: Firmware and BIOS management at scale
minutes: 12
summary: Keep BIOS, BMC, NIC and disk firmware consistent across a fleet with baselines, staged rollouts and drift checks.
---

Two identical servers can behave differently because of a firmware version or a single BIOS option. At fleet scale you need a baseline, a safe update process and a way to notice drift before users do.

## What you will learn

- What firmware lives in a server
- Defining baselines for versions and BIOS settings
- Rolling updates in waves with rollback
- Detecting and fixing drift

## What to manage

- **BIOS or UEFI settings:** power profile, hyperthreading, virtualization, boot mode
- **BMC firmware:** the management controller itself
- **NIC, HBA and RAID firmware:** often the cause of odd packet loss or disk resets
- **Drive firmware:** sometimes fixes known bugs or data-loss issues

## Baseline and inventory

```yaml
# baseline for one hardware model
model: dl-gen11
bios:
  version: "2.14.1"
  settings:
    PowerProfile: MaxPerformance
    Virtualization: Enabled
    BootMode: Uefi
bmc: "3.20"
nic:
  version: "22.31.6"
```

Read current values through Redfish, for example the `Bios` and `UpdateService` resources, or the vendor tool, and compare to the baseline. Store results with the server's asset record.

```bash
curl -sk -u "admin:$BMC_PASS" https://10.20.0.15/redfish/v1/Systems/1/Bios | jq '.Attributes.PowerProfile'
curl -sk -u "admin:$BMC_PASS" https://10.20.0.15/redfish/v1/UpdateService/FirmwareInventory | jq '.Members|length'
```

## Rolling out

Update one **canary** node per model, run burn-in and workload tests, then expand in small waves while watching error rates. Never update both members of a redundant pair at the same time, and drain workloads first. Keep the previous firmware image available, because some updates cannot be reverted and a rollback plan may mean replacing a part.

## Drift

Run a scheduled job that compares live values with the baseline and opens a ticket on mismatch. After repairs or part swaps, re-apply the baseline before the node rejoins the pool.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Firmware and BIOS management at scale fits together
node: n1 | What to manage | 0 | 0 | BIOS or UEFI settings: power profile, hyperthreading, virtualization, boot mode. | Skipping BIOS settings in the baseline. | process
node: n2 | Baseline and inventory | 1 | 1 | Read current values through Redfish, for example the Bios and UpdateService resources, or the vendor tool, and compare to the baseline. | Failing to re-apply the baseline after repairs. | process
node: n3 | Rolling out | 2 | 0 | Update one canary node per model, run burn-in and workload tests, then expand in small waves while watching error rates. | Updating all nodes of a redundant pair together. | process
node: n4 | Drift | 3 | 1 | Run a scheduled job that compares live values with the baseline and opens a ticket on mismatch. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The slow rack

> **Incident:** A group of nodes ran 30 percent slower after maintenance.

```console
$ lscpu | grep MHz
CPU MHz:  1196.000
BIOS PowerProfile: PowerSaving (baseline: MaxPerformance)
```

A mainboard swap reset the BIOS to defaults and nobody re-applied the baseline. CPUs sat at a low clock, and latency rose. The team added a post-repair step that applies and verifies the baseline and a weekly drift report across the fleet.

## Common mistakes

- Updating all nodes of a redundant pair together
- Skipping BIOS settings in the baseline
- Not keeping old firmware images
- Failing to re-apply the baseline after repairs

```quiz
Q: What belongs in a firmware baseline?
+ Versions and key BIOS settings per model
- Only the OS version :: No.
- User passwords :: No.
- Application logs :: No.
> Both versions and settings matter.

Q: Who should be updated first?
+ A canary node
- The busiest node :: No.
- All nodes :: No.
- Redundant pairs together :: No.
> Canaries catch problems early.

Q: How do you find drift?
+ Compare live values with the baseline regularly
- Wait for complaints :: No.
- Reboot nodes :: No.
- Replace all disks :: No.
> Automated comparison finds change.

Q: Why drain a node before a firmware update?
+ Updates may reboot or fail
- To save power :: No.
- To change DNS :: No.
- To rotate logs :: No.
> Protect workloads. The lesson section above explains why.
```

```cards
Baseline :: The approved versions and settings for a hardware model
Canary :: First node updated to catch problems
Drift :: Difference between live state and the baseline
Firmware inventory :: A list of versions across components
```
