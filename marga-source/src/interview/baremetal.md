## What is a BMC and why does it matter?
level: junior
The baseboard management controller is a small separate computer on the motherboard with its own network port. It lets me power a server on or off, read the hardware event log and open a console even when the host operating system is hung or off. I keep it on a separate management network with a changed password.

## A server stops answering SSH. What do you do?
level: junior
I check whether it is up with the BMC, read the system event log to see why, and only then power cycle if it is hung. I look at the log first so I learn the cause, such as memory errors or overheating, and I raise a ticket for the cause as well as the reboot.

## How does a server install itself over the network?
level: junior
The network card asks DHCP for an address, and the answer includes the next-server and a boot file. The firmware fetches the boot loader over TFTP or HTTP, which loads a kernel and an installer. The installer reads an answer file such as kickstart and installs without questions. If it fails I debug in that order: DHCP, file transfer, loader, installer.

## What is the difference between RAID and a backup?
level: mid
RAID keeps a server running when a disk fails. It does not protect against deleted files, bad updates, corruption written to every disk or a fire. A backup is a separate copy that lets me go back in time. I need both, and I test restores.

## An md array shows clean, degraded. What now?
level: mid
The array works but has no safety margin, so it is an incident. I confirm the failed disk with SMART, remove it from the array, add the replacement and watch the rebuild finish. Large arrays rebuild for hours, and a second failure during that time can lose data, so I use RAID 6 or RAID 10 for big disks.

## How would you design the network for a new row of racks?
level: mid
A leaf-spine fabric: a top-of-rack leaf in each rack, every leaf linked to every spine, with equal-cost routing. Servers use two uplinks in an LACP bond to separate leaves or one leaf, depending on the design. Management traffic and PXE run on separate VLANs. I plan oversubscription from the traffic mix and leave room to add spines.

## You must update firmware on 300 servers. How?
level: senior
I read the vendor release notes for ordering requirements, test on a few spare machines, then roll out in small waves starting with one canary. Between waves I check health, event logs and workload metrics. I keep a rollback and an out-of-band path, and I never update everything at once, since a bad BMC update can leave machines unreachable.

## How do you decide when a server is too old or too faulty to keep?
level: senior
I track failures by asset tag. A host with repeated hardware events, or a batch that fails faster than expected, is retired or sent back to the vendor. I weigh repair cost, warranty, power efficiency per unit of work and capacity needs. Retirement includes wiping disks and removing the machine from inventory, monitoring and DNS.

