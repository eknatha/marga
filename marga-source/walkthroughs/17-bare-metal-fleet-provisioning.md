# A bare-metal fleet from rack to ready
level: Advanced
modules: baremetal
lessons: baremetal/provisioning-pxe-dhcp-and-images, baremetal/operating-a-fleet-failures-lifecycle-and-capacity
summary: How a new rack of servers becomes usable machines without anyone typing at a console, and how the fleet stays healthy afterwards.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Bring hundreds of new servers from the loading dock to a known, patched state
- Make every step repeatable so a replaced server ends up identical
- Detect failing hardware before it hurts customers
- Know which machine is which, where it is and what it runs

## The big picture

```diagram
title: Bare-metal provisioning reference design
node: crew | Rack and cable crew | 0 | 1 | Racks servers, connects power and network, scans asset tags. | A wrong cable creates a fault that is hard to find later.
node: inv | Inventory database | 1 | 0 | Records serial, MAC address, rack position and role. | If it is wrong, automation configures the wrong machine.
node: bmc | Management network (BMC) | 1 | 2 | Out-of-band control: power, console, sensors. | If it is exposed or shares a flat network, it becomes an entry point.
node: dhcp | DHCP and PXE server | 2 | 1 | Answers the first boot request and points to the installer. | If it is down, new machines cannot start.
node: img | Image and config server | 3 | 1 | Serves the OS image, kickstart or cloud-init, and firmware. | A bad image is installed on every machine it touches.
node: burn | Burn-in and checks | 4 | 0 | Stress tests memory, disks and CPUs before release. | Skipping it ships weak hardware into production.
node: mon | Fleet monitoring | 4 | 2 | Collects BMC sensors, SMART data and logs. | Without it, failures are found by customers.
edge: crew | inv
edge: inv | dhcp
edge: bmc | dhcp
edge: dhcp | img
edge: img | burn
edge: burn | mon
edge: bmc | mon
```

## A request, step by step

1. The crew scans each server asset tag, and the inventory records its serial number, MAC address and rack position.
2. The server is powered on through its BMC and sends a DHCP request on the provisioning network.
3. The DHCP server matches the MAC address to the inventory and answers with an address and a boot file.
4. The server loads the installer over PXE, which downloads the OS image and the answer file for its role.
5. The installer partitions the disks, installs the OS, sets the network and registers the machine with configuration management.
6. A burn-in job stresses memory and disks for several hours. A server that passes is marked ready, and one that fails goes to repair.
7. Monitoring reads BMC sensors, SMART data and kernel logs, and alerts when a disk or fan starts to fail.

## Why the design looks like this

- **Out-of-band management** lets people reach a machine with no working OS, so reinstalls and power cycles need no site visit.
- **Inventory as the source of truth** means roles, addresses and rack positions come from one place that tools can read.
- **Image-based installs** give identical machines, so a replacement is the same as the original.
- **Burn-in before release** finds early-life hardware failures when they are cheap to fix.
- **Separate provisioning and management networks** keep installers and BMCs away from production traffic.

## Scaling decisions

1. Start with a script, a DHCP server and one image for one hardware model.
2. Add an inventory database and generate DHCP entries from it.
3. Add roles, so the same image becomes a web node or a database node by configuration.
4. Automate burn-in and sort servers into ready and repair queues.
5. Add lifecycle tracking for warranty, firmware and retirement.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| DHCP server down | New or reinstalled servers cannot boot | Two DHCP servers, monitored, with the same data from inventory |
| Inventory is wrong | A machine gets the wrong role or address | Verify serial and MAC at first contact, and audit regularly |
| Bad firmware or image | Every new machine inherits the problem | Test on a canary rack and keep versions pinned |
| BMC exposed | An attacker controls power and console | Isolated management network, strong credentials, regular firmware updates |
| Silent disk wear | A disk fails during a busy day | SMART alerts, spare disks and RAID with tested rebuilds |
| No spares | A failed part takes a server out for weeks | Spare stock sized to failure rate and delivery time |

## Trade-offs

- Automation is faster and safer than hand work, and it takes time to build. Start where the pain is greatest.
- Burn-in delays release and prevents expensive failures later.
- Strict standard hardware simplifies operations and reduces the choice of machines.

```predict
Q: A new server boots, gets an address, and then fails to find a boot file. Which two things should you check first?
???
That the DHCP entry for its MAC address includes the next-server and boot file name, and that the TFTP or HTTP boot server is reachable from the provisioning network.
> PXE needs both an address and a pointer to the boot file; either missing leaves the server waiting at the network boot screen.
```
