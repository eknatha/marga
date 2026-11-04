## Server unreachable
level: junior
A database server stopped answering SSH and ping. You are in another city.

```text
$ ssh ops@db-12
ssh: connect to host db-12 port 22: Connection timed out
$ ipmitool -H 10.20.0.52 chassis power status
Chassis Power is on
$ ipmitool -H 10.20.0.52 sel list | tail -2
 8 | 11/02/2026 | 02:11:09 | Memory #0x87 | Uncorrectable ECC | Asserted
```
? What does the evidence suggest?
+ The hardware is on but a memory error crashed the host, so plan a DIMM replacement after a power cycle
- The network cable has failed
- The BMC has failed
- The password was changed
why: Power is on and the event log shows an uncorrectable memory error. The host crashed from bad memory; power cycle it, then replace the DIMM.

## Degraded array
level: junior
An alert says a RAID array is degraded.

```text
$ sudo mdadm --detail /dev/md0 | grep -E "State|Failed|Active"
 State : clean, degraded
 Active Devices : 1
 Failed Devices : 1
```
? What is the right next step?
+ Confirm the failed disk, replace it and watch the rebuild
- Ignore it because the array is clean
- Reformat the array
- Reboot until the alert clears
why: The array works but has no redundancy. Replace the failed disk quickly.

## PXE boots but never installs
level: mid
A new server shows an offer in the DHCP log, but no file transfer follows.

```text
$ sudo journalctl -u dnsmasq -n 3
dnsmasq-dhcp: DHCPDISCOVER(eth0) 3c:ec:ef:12:34:56
dnsmasq-dhcp: DHCPOFFER(eth0) 10.20.1.77 3c:ec:ef:12:34:56
$ grep dhcp-boot /etc/dnsmasq.conf
dhcp-boot=pxelinux.0,pxe,10.20.9.9
```
? What do you check?
+ Whether the next-server address 10.20.9.9 is the real TFTP server
- The monitor cable
- The DNS cache
- The kernel version of the web server
why: The client received an offer but cannot fetch the loader, so the pointer to the TFTP server is probably wrong.

## Bond link keeps flapping
level: mid
A server loses connectivity for a few seconds every ten minutes.

```text
$ dmesg | grep -i bond | tail -2
bond0: link status definitely down for interface eno2, disabling it
bond0: link status definitely up for interface eno2, 10000 Mbps full duplex
```
? What is the most likely cause?
+ A physical fault on the eno2 cable, optic or switch port
- A DNS misconfiguration
- A full disk
- An expired certificate
why: Link status changes on one interface point to the physical layer. The bond hides it from users, so alert on link flaps.

## Sudden reboots
level: mid
A server reboots about once a week with no pattern in the application logs.

```text
$ ipmitool sel elist | grep -c "Correctable ECC"
214
$ ipmitool sel elist | grep -i memory | tail -1
 220 | 11/03/2026 | 04:02:55 | Memory #0x87 | Correctable ECC | Asserted
```
? What do you do?
+ Drain it and replace the DIMM that reports the errors
- Replace the disks
- Reinstall the operating system
- Increase the swap
why: Hundreds of correctable errors from one memory slot are a warning that the DIMM will fail. Replace the part the log names.

## Rack power limit
level: senior
Facilities say a rack with 20 servers keeps tripping. Each server draws 500 W and each feed is rated 7 kW.

```text
Feed A: 7 kW
Feed B: 7 kW
Servers: 20 x 500 W = 10 kW
Behaviour: when feed A is lost, feed B trips
```
? What is the design error?
+ One feed cannot carry the whole rack, so redundancy does not hold
- The servers should have one power supply
- The breakers are too new
- The rack is too cold
why: With redundant feeds, each must be able to carry the full load. 10 kW is above 7 kW.

## Nodes reinstall on reboot
level: senior
Running nodes reboot into the installer after a change to the PXE service.

```text
$ journalctl -u dnsmasq | grep "sent /srv/tftp" | tail -2
sent /srv/tftp/grubx64.efi to 10.20.1.12
sent /srv/tftp/grubx64.efi to 10.20.1.13
$ ipmitool chassis bootparam get 5 | grep Boot
Boot Device Selector: Force PXE
```
? Which two changes prevent a repeat?
+ Answer only nodes marked for build, and set disk as the normal boot device
- Turn off the BMC
- Add more RAM to the PXE server
- Delete the DHCP server
why: Machines in service should not be offered the installer, and their boot order should put the disk first.

