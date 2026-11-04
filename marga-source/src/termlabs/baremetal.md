## The server that shut itself off
id: bm-overheat-power-on
module: baremetal
level: Beginner
minutes: 10
lesson: baremetal/servers-racks-and-remote-management
engine: Simulated BMC with ipmitool
summary: A server is powered off. Read the BMC event log, record the cause and power it back on.
@@ story
The monitoring page says web-30 is down and SSH times out. You are not at the datacentre, but you can reach its BMC. Find out why it stopped, write the cause in a short report, and bring it back.
@@ goals
- Check the power state with ipmitool.
- Read the event log and find the first event.
- Write one line with the cause in /home/user/report.txt and power the server on.
@@ hints
- `ipmitool chassis power status` shows whether it is on or off. `ipmitool sel list` shows the event log.
- The first event in the list happened before the temperature alarm and the power off.
- `echo "cause: fan failure" > report.txt`, then `ipmitool chassis power on`.
@@ world
{"cwd": "/home/user", "more": {"hw": {"bmc": {"power": "off", "sel": [{"date": "11/03/2026", "time": "09:41:02", "sensor": "Fan #0x31", "event": "Lower Critical going low", "dir": "Asserted"}, {"date": "11/03/2026", "time": "09:44:17", "sensor": "Temperature #0x07", "event": "Upper Critical going high", "dir": "Asserted"}, {"date": "11/03/2026", "time": "09:45:30", "sensor": "Power Unit #0x01", "event": "Power off/down", "dir": "Asserted"}], "sensors": [["Fan1", "0", "RPM", "cr"], ["CPU Temp", "96", "degrees C", "cr"]]}}}}
@@ file /home/user/report.txt


@@ checks
[
 {
  "t": "cmd",
  "run": "ipmitool chassis power status",
  "code": 0,
  "label": "the server is on",
  "out": "is on"
 },
 {
  "t": "contains",
  "path": "/home/user/report.txt",
  "label": "the report names the fan as the cause",
  "re": "[Ff]an"
 }
]
@@ explain
The event log is in time order, so the first event shows where the chain started. A failed fan raised the temperature, and the server shut itself down to protect the hardware. Power it on only after you know the cause, and ask for the fan to be replaced.
@@ solution
ipmitool chassis power status
ipmitool sel list
echo "cause: fan failure then overheating" > /home/user/report.txt
ipmitool chassis power on
ipmitool chassis power status


## Which DIMM is failing?
id: bm-find-bad-dimm
module: baremetal
level: Intermediate
minutes: 10
lesson: baremetal/operating-a-fleet-failures-lifecycle-and-capacity
engine: Simulated BMC with ipmitool
summary: A server reboots about once a week. Find the memory slot that reports the errors and write it in a ticket.
@@ story
db-8 reboots about once a week with no application error. Before anyone swaps parts at random, read what the hardware has recorded. Two memory slots appear in the log, but only one is the problem.
@@ goals
- Read the event log with ipmitool.
- Decide which slot is failing by how often it reports.
- Write the slot name in /home/user/ticket.txt as the part to replace, without naming the healthy slot.
@@ hints
- `ipmitool sel elist` lists every event, `ipmitool sel list | grep ECC` narrows it.
- One slot shows five events; the other shows one.
- `echo "replace DIMM_B2" > ticket.txt` once you know which slot repeats.
@@ world
{"cwd": "/home/user", "more": {"hw": {"bmc": {"power": "on", "sel": [{"date": "11/02/2026", "time": "03:14:22", "sensor": "DIMM_B2", "event": "Correctable ECC", "dir": "Asserted"}, {"date": "11/02/2026", "time": "03:41:09", "sensor": "DIMM_B2", "event": "Correctable ECC", "dir": "Asserted"}, {"date": "11/02/2026", "time": "09:02:44", "sensor": "DIMM_A1", "event": "Correctable ECC", "dir": "Asserted"}, {"date": "11/03/2026", "time": "01:12:10", "sensor": "DIMM_B2", "event": "Correctable ECC", "dir": "Asserted"}, {"date": "11/03/2026", "time": "02:30:01", "sensor": "DIMM_B2", "event": "Correctable ECC", "dir": "Asserted"}, {"date": "11/03/2026", "time": "04:02:55", "sensor": "DIMM_B2", "event": "Correctable ECC", "dir": "Asserted"}], "sensors": [["CPU Temp", "54", "degrees C", "ok"]]}}}}
@@ file /home/user/ticket.txt


@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/ticket.txt",
  "label": "the ticket names the failing slot",
  "re": "DIMM_B2"
 },
 {
  "t": "contains",
  "path": "/home/user/ticket.txt",
  "label": "the ticket does not name the healthy slot",
  "re": "DIMM_A1",
  "not": true
 }
]
@@ explain
A single correctable error is normal. The slot that repeats is the one that is likely to fail. Counting events per slot gives the part to replace and avoids swapping healthy memory.
@@ solution
ipmitool sel elist
ipmitool sel elist | grep -c DIMM_B2
echo "replace DIMM_B2" > /home/user/ticket.txt


## Replace the failed mirror member
id: bm-raid-replace
module: baremetal
level: Intermediate
minutes: 12
lesson: baremetal/disks-raid-firmware-and-burn-in
engine: Simulated mdadm and smartctl
summary: A RAID 1 array is degraded. Confirm the failed disk, replace it with the spare and bring the array back to clean.
@@ story
db-4 reports /dev/md0 as clean, degraded. The mirror has /dev/sda and /dev/sdb, and a new empty disk /dev/sdc is installed and ready. Replace the failed member without touching the healthy one.
@@ goals
- Check the array and the health of both disks.
- Remove the faulty disk from the array.
- Add /dev/sdc and confirm the array is clean with no failed devices.
@@ hints
- `mdadm --detail /dev/md0` shows which member is faulty. `smartctl -H /dev/sdb` shows the disk health.
- `mdadm /dev/md0 --remove /dev/sdb` removes a faulty member.
- `mdadm /dev/md0 --add /dev/sdc`, then `mdadm --detail /dev/md0` should read clean.
@@ world
{"cwd": "/home/user", "more": {"hw": {"disks": {"/dev/sda": {"model": "ST4000", "serial": "A1", "health": "PASSED", "realloc": 0, "pending": 0, "hours": 18000}, "/dev/sdb": {"model": "ST4000", "serial": "B2", "health": "FAILED", "realloc": 120, "pending": 8, "hours": 43000}, "/dev/sdc": {"model": "ST4000", "serial": "C3", "health": "PASSED", "realloc": 0, "pending": 0, "hours": 2}}, "md": {"level": "raid1", "size": "3.64 TiB", "total": 2, "state": "clean, degraded", "devices": [{"dev": "/dev/sda", "state": "active sync"}, {"dev": "/dev/sdb", "state": "faulty"}]}, "avail": ["/dev/sdc"]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "mdadm --detail /dev/md0",
  "code": 0,
  "label": "the array is clean",
  "out": "State : clean\\s*\\n"
 },
 {
  "t": "cmd",
  "run": "mdadm --detail /dev/md0",
  "code": 0,
  "label": "no failed devices",
  "out": "Failed Devices : 0"
 },
 {
  "t": "cmd",
  "run": "mdadm --detail /dev/md0",
  "code": 0,
  "label": "the healthy disk is still a member",
  "out": "/dev/sda"
 },
 {
  "t": "cmd",
  "run": "mdadm --detail /dev/md0",
  "code": 0,
  "label": "the new disk is in the array",
  "out": "/dev/sdc"
 }
]
@@ explain
A mirror survives one failed disk, but only until a second one fails. Confirm which disk is bad before you act, remove it, add the new one and wait for the rebuild. A degraded array is an incident until it reads clean.
@@ solution
mdadm --detail /dev/md0
smartctl -H /dev/sdb
mdadm /dev/md0 --remove /dev/sdb
mdadm /dev/md0 --add /dev/sdc
mdadm --detail /dev/md0


## PXE offers the wrong server
id: bm-pxe-next-server
module: baremetal
level: Intermediate
minutes: 12
lesson: baremetal/provisioning-pxe-dhcp-and-images
engine: Simulated Linux with a DHCP and TFTP configuration
summary: New servers get a DHCP offer but never fetch the boot loader. Correct the next-server in the DHCP configuration.
@@ story
Ten new servers arrived. Each shows an offer in the DHCP log and then stops. The TFTP server that holds the boot files is 10.20.1.5, as the notes say. The DHCP configuration points somewhere else.
@@ goals
- Read the PXE notes and the dnsmasq configuration.
- Point dhcp-boot at the real TFTP server.
- Leave every other line unchanged.
@@ hints
- `cat /home/user/pxe/NOTES` names the TFTP server. `grep dhcp-boot /home/user/pxe/dnsmasq.conf` shows the setting.
- The setting is dhcp-boot=pxelinux.0,pxe,ADDRESS, and the address is wrong.
- `sed -i "s/10.20.9.9/10.20.1.5/" /home/user/pxe/dnsmasq.conf`.
@@ world
{"cwd": "/home/user"}
@@ file /home/user/pxe/NOTES
The TFTP server with the boot files is 10.20.1.5.
The old build server 10.20.9.9 was retired last month.

@@ file /home/user/pxe/dnsmasq.conf
interface=eth0
dhcp-range=10.20.1.100,10.20.1.200,12h
enable-tftp
dhcp-boot=pxelinux.0,pxe,10.20.9.9

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/pxe/dnsmasq.conf",
  "label": "dhcp-boot points at the real TFTP server",
  "re": "dhcp-boot=pxelinux\\.0,pxe,10\\.20\\.1\\.5"
 },
 {
  "t": "contains",
  "path": "/home/user/pxe/dnsmasq.conf",
  "label": "the old address is gone",
  "re": "10\\.20\\.9\\.9",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/pxe/dnsmasq.conf",
  "label": "the DHCP range is unchanged",
  "re": "dhcp-range=10\\.20\\.1\\.100,10\\.20\\.1\\.200"
 }
]
@@ explain
The DHCP answer tells a PXE client where to fetch its boot file. If that address does not hold the file, the client gets an offer and then waits. Fix the pointer in one place and every new server benefits.
@@ solution
cat /home/user/pxe/NOTES
grep dhcp-boot /home/user/pxe/dnsmasq.conf
sed -i "s/10.20.9.9/10.20.1.5/" /home/user/pxe/dnsmasq.conf
grep dhcp-boot /home/user/pxe/dnsmasq.conf


## The bond that hurts throughput
id: bm-bond-mode
module: baremetal
level: Advanced
minutes: 12
lesson: baremetal/datacenter-networking-leaf-spine-and-bonding
engine: Simulated Linux with a network configuration file
summary: A database server joined its two links in round-robin mode and got slower. Switch the bond to LACP, which the switch already runs.
@@ story
db-6 has two 25 Gbit/s links in bond0. Throughput is lower than with one link, with many retransmits. The switch ports are in an LACP port channel, so the server should use 802.3ad with fast LACP and a layer 3 plus 4 hash.
@@ goals
- Read the bond configuration and the notes about the switch.
- Change the mode to 802.3ad.
- Add lacp_rate=fast and xmit_hash_policy=layer3+4 and keep miimon=100.
@@ hints
- `cat /home/user/net/ifcfg-bond0` shows the options. `cat /home/user/net/SWITCH` says what the switch runs.
- The line to change is BONDING_OPTS.
- `sed -i` can replace the whole line: `sed -i 's/^BONDING_OPTS=.*/BONDING_OPTS="mode=802.3ad miimon=100 lacp_rate=fast xmit_hash_policy=layer3+4"/' /home/user/net/ifcfg-bond0`.
@@ world
{"cwd": "/home/user"}
@@ file /home/user/net/SWITCH
Switch ports Eth1/10 and Eth1/11 are in port-channel 10, LACP active, fast timers.

@@ file /home/user/net/ifcfg-bond0
DEVICE=bond0
ONBOOT=yes
BOOTPROTO=none
IPADDR=10.20.2.10
PREFIX=24
BONDING_OPTS="mode=balance-rr miimon=100"

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/net/ifcfg-bond0",
  "label": "mode is 802.3ad",
  "re": "mode=802\\.3ad"
 },
 {
  "t": "contains",
  "path": "/home/user/net/ifcfg-bond0",
  "label": "LACP rate is fast",
  "re": "lacp_rate=fast"
 },
 {
  "t": "contains",
  "path": "/home/user/net/ifcfg-bond0",
  "label": "the hash policy is layer3+4",
  "re": "xmit_hash_policy=layer3\\+4"
 },
 {
  "t": "contains",
  "path": "/home/user/net/ifcfg-bond0",
  "label": "round-robin is gone",
  "re": "balance-rr",
  "not": true
 },
 {
  "t": "contains",
  "path": "/home/user/net/ifcfg-bond0",
  "label": "link monitoring is kept",
  "re": "miimon=100"
 }
]
@@ explain
Round-robin spreads packets of a single connection over both links, so they arrive out of order and TCP slows down. LACP keeps each connection on one link and spreads many connections across both, and it needs both the server and the switch to agree.
@@ solution
cat /home/user/net/ifcfg-bond0
cat /home/user/net/SWITCH
sed -i 's/^BONDING_OPTS=.*/BONDING_OPTS="mode=802.3ad miimon=100 lacp_rate=fast xmit_hash_policy=layer3+4"/' /home/user/net/ifcfg-bond0
cat /home/user/net/ifcfg-bond0

