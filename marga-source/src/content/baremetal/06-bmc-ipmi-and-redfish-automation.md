---
title: BMC, IPMI and Redfish automation
minutes: 12
summary: Control servers out of band with the BMC, use IPMI and Redfish safely, and automate power, boot and sensor tasks at scale.
---

When a server hangs or has no operating system, you still need to reach it. The baseboard management controller, or BMC, is a separate chip with its own network port that gives you power control, console and hardware health without touching the host. Redfish is the modern, secure API on top of it.

## What you will learn

- What the BMC is and why it works when the host is off
- IPMI versus Redfish and their security differences
- Scripting power, boot device and sensor reads
- Keeping the management network safe

## IPMI and Redfish

**IPMI** is the older protocol. It is widely supported but has weak authentication and many known issues, so use it only on a locked management network. **Redfish** is a REST and JSON API over HTTPS that covers inventory, power, boot, firmware and sensors with modern authentication.

```bash
# IPMI over the LAN
ipmitool -I lanplus -H 10.20.0.15 -U admin -P "$BMC_PASS" chassis power status
ipmitool -I lanplus -H 10.20.0.15 -U admin -P "$BMC_PASS" chassis bootdev pxe options=efiboot

# Redfish: read power state and reset the system
curl -sk -u "admin:$BMC_PASS" https://10.20.0.15/redfish/v1/Systems/1 | jq '.PowerState,.Status'
curl -sk -u "admin:$BMC_PASS" -X POST -H 'Content-Type: application/json' \
  -d '{"ResetType":"GracefulRestart"}' \
  https://10.20.0.15/redfish/v1/Systems/1/Actions/ComputerSystem.Reset
```

## Automating a fleet

Keep an inventory that maps each server to its BMC address, and fetch credentials from a secrets manager instead of a file. Wrap actions in a small script that does one server at a time, logs who did what and has a dry-run mode. Common jobs are rebooting a hung node, setting one-time PXE boot before reinstall, reading temperature and fan sensors, and collecting the system event log when a node fails.

## Keeping it safe

Put every BMC on a separate **management network** with firewall rules that allow only a jump host. Change default accounts, disable unused services such as old IPMI cipher suites, update BMC firmware on a schedule and send BMC logs to your central logging system. A BMC compromise survives operating system reinstalls, so prevention matters.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How BMC, IPMI and Redfish automation fits together
node: n1 | IPMI and Redfish | 0 | 0 | IPMI is the older protocol. It is widely supported but has weak authentication and many known issues, so use it only on a locked management network. | Scripts that reboot many servers at once without a limit. | process
node: n2 | Automating a fleet | 1 | 1 | Keep an inventory that maps each server to its BMC address, and fetch credentials from a secrets manager instead of a file. | Leaving default BMC credentials in place. | process
node: n3 | Keeping it safe | 2 | 0 | Put every BMC on a separate management network with firewall rules that allow only a jump host. | Putting BMCs on the production network. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: The open management network

> **Incident:** Many BMCs were reachable on the office network with default logins.

```console
$ nmap -p 623,443 10.20.0.0/24 --open
10.20.0.15  623/udp open  asf-rmcp
10.20.0.15  login admin:admin accepted
```

An audit found that BMCs were on the same network as laptops and still used factory credentials. Anyone on the network could power machines off or mount a virtual disk. The team moved all BMCs to an isolated VLAN behind a jump host, rotated unique passwords from a vault and added alerts for new BMC logins.

## Common mistakes

- Leaving default BMC credentials in place
- Putting BMCs on the production network
- Never updating BMC firmware
- Scripts that reboot many servers at once without a limit

```quiz
Q: What does the BMC allow when the host is off?
+ Remote power, console and sensors
- Running applications :: No.
- Installing Kubernetes :: No.
- Serving web pages :: No.
> It is a separate controller.

Q: Which is the modern API for BMC control?
+ Redfish
- Telnet :: No.
- SMTP :: No.
- FTP :: No.
> Redfish is REST over HTTPS.

Q: Where should BMCs live?
+ A isolated management network
- The public internet :: No.
- The user VLAN :: No.
- Any open port :: No.
> They are a privileged backdoor.

Q: Why add a dry-run mode to fleet scripts?
+ To avoid accidental mass reboots
- To make it faster :: No.
- To skip logging :: No.
- To avoid credentials :: No.
> Safety limits blast radius.
```

```cards
BMC :: A management controller that works while the host is off
IPMI :: Older out-of-band management protocol
Redfish :: REST and JSON hardware management API
Management network :: Isolated network for BMCs and similar devices
```
