---
title: Servers, racks and remote management
minutes: 13
summary: Learn what is inside a rack server, how racks are powered and cooled, and how to manage a machine from far away through its BMC.
---

A virtual machine is a slice of someone else's server. On bare metal you own the whole machine, and you also own everything that surrounds it: the rack, the power, the cooling and the cable to the switch. This lesson shows the parts and the one tool that lets you manage them without being in the room.

## What you will learn

- The parts of a rack server and how racks are laid out
- Power, cooling and why a rack has a limit
- The BMC: the small computer that manages the big one
- IPMI and Redfish, and the commands you use every week

## What is in the box

A rack server is measured in **rack units**: 1U is 4.45 cm tall. Most fleets use 1U or 2U servers. Inside you find:

- **CPUs** and **DIMMs** (memory sticks), usually in pairs per channel
- **Drives**: SATA, SAS or NVMe, in front bays or inside
- **Network cards** (NICs), often two or four ports
- **Power supplies**, normally two, each fed from a different power line
- **Fans**, which pull air from the front (cold aisle) to the back (hot aisle)
- A **BMC**, the baseboard management controller, a tiny separate computer on the motherboard

## Power and cooling set the limit

A rack is not full when it runs out of space. It is full when it runs out of **power** or **cooling**. A rack with a 7 kW feed cannot hold twenty servers that each draw 500 W, even though they fit.

- Two power supplies on two separate feeds (A and B) mean one feed can fail and the server stays up, **but only if each feed alone can carry the whole rack**.
- Cold air enters at the front. Blanking panels in empty slots stop hot air from looping back round.
- A hot spot at the top of a rack is usually a gap in the panels or a failed fan.

## The BMC: a computer inside the computer

The BMC has its own network port, its own address and its own power, so it works when the main server is off or hung. You talk to it with **IPMI** (older, widely supported) or **Redfish** (newer, a REST API with JSON). Vendors brand it as iDRAC, iLO or IPMI/BMC.

With it you can power the server on or off, read the hardware event log, check temperatures and open a remote console, all without going near the machine.

```console
$ ipmitool -H 10.20.0.50 -U admin -P secret chassis power status
Chassis Power is off
$ ipmitool -H 10.20.0.50 -U admin -P secret sel list
 1   | 11/02/2026 | 03:14:22 | Power Unit #0x01 | Power off/down | Asserted
 2   | 11/02/2026 | 03:14:25 | Temperature #0x31 | Upper Critical going high | Asserted
$ ipmitool -H 10.20.0.50 -U admin -P secret chassis power on
Chassis Power Control: Up/On
```

The **system event log** (SEL) is the first place to look. Here the server shut itself down because it overheated, which points at cooling and not at software.

## Keep the BMC safe

The BMC can power-cycle a server and open a console, so treat its network as a management network: separate from production, not reachable from the internet, with its default password changed on day one.

```wrongpath
@goal A server in a rack is hung and not answering SSH. You are in another city.
@wrong
# ask someone on site to press the power button
# or just keep trying to SSH
ssh ops@db-12
@result
ssh: connect to host db-12 port 22: Connection timed out
$ ping -c1 db-12
1 packets transmitted, 0 received, 100% packet loss
# two hours later, still no news from site
@why SSH needs the operating system, and the operating system is the thing that has hung. Waiting for a person to travel turns a ten-minute fix into hours. The BMC runs on its own and answers even when the host is dead.
@right
ipmitool -H 10.20.0.52 -U admin -P "$BMC_PASS" chassis power status
ipmitool -H 10.20.0.52 -U admin -P "$BMC_PASS" sel list | tail -5
ipmitool -H 10.20.0.52 -U admin -P "$BMC_PASS" chassis power cycle
@after Read the event log first so you know why it hung, then power cycle through the BMC. Raise a ticket for the cause, not just the reboot.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Servers, racks and remote management fits together
node: n1 | What is in the box | 0 | 0 | A rack server is measured in rack units: 1U is 4.45 cm tall. | Filling a rack by space and ignoring power and cooling. | process
node: n2 | Power and cooling set the limit | 1 | 1 | A rack is not full when it runs out of space. | Plugging both power supplies into the same feed. | process
node: n3 | The BMC: a computer inside the | 2 | 0 | The BMC has its own network port, its own address and its own power, so it works when the main server is off or hung. | Leaving the BMC on the production network with the default password. | process
node: n4 | Keep the BMC safe | 3 | 1 | The BMC can power-cycle a server and open a console, so treat its network as a management network: separate from production, not reachable from the internet, with its... | Having no way in but SSH, so a hung host needs a trip to the datacentre. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: The rack that tripped at noon

> **Incident:** Four servers in one rack went off within a minute at 12:04.

```console
$ ipmitool -H 10.20.0.61 sel list | tail -2
 9   | 11/02/2026 | 12:04:11 | Power Supply #0x62 | Power Supply AC lost | Asserted
10   | 11/02/2026 | 12:04:12 | Power Unit #0x01 | Redundancy Lost | Asserted
```

One power feed failed, as the design allows. But the extra servers added over the year had pushed the load so that feed B alone could not carry the rack. When A dropped, B tripped too. The fix was to add up the load on one feed and to stop adding servers to a rack once one feed cannot carry it alone.

## Common mistakes

- Filling a rack by space and ignoring power and cooling
- Leaving the BMC on the production network with the default password
- Plugging both power supplies into the same feed
- Having no way in but SSH, so a hung host needs a trip to the datacentre

```quiz
Q: What is the BMC?
+ A small separate computer on the motherboard that manages the server remotely
- The main CPU :: No, it is a separate controller.
- The network switch :: No.
- A kind of hard disk :: No.
> The BMC has its own power and network port, so it works even when the host is off or hung.

Q: A rack has space for 20 servers but one feed can carry only 7 kW. Each server draws 500 W. How many can it safely hold if one feed must carry the whole rack?
+ 14
- 20 :: Space is not the limit; power is.
- 10 :: That is conservative; 7000 divided by 500 is 14.
- 7 :: That would waste half the feed.
> 7000 W divided by 500 W is 14 servers.

Q: Which log is the first place to look when a server shut itself off?
+ The BMC system event log (SEL)
- The web server access log :: The host may be off and cannot write logs.
- The git history :: Not relevant.
- The DNS cache :: Not relevant.
> The SEL records hardware events such as power loss and overheating.

Q: Why do servers have two power supplies on separate feeds?
+ So one feed or supply can fail without the server stopping
- To double the speed :: They do not add speed.
- To save electricity :: They do not.
- Because one is for the BMC :: Both feed the whole server.
> Redundancy only works if each feed alone can carry the load.
```

```cards
BMC :: Management controller on the motherboard
IPMI :: Older protocol to manage a server through its BMC
Redfish :: REST API to manage servers
SEL :: System event log kept by the BMC
1U :: One rack unit, 4.45 cm tall
Hot aisle :: The side where servers blow out warm air
```
