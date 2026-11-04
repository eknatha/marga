---
title: Bare metal and datacenter
summary: Remote management, provisioning, disks and RAID, bonding and the first checks on a sick server.
module: baremetal
---

## Talk to the BMC

```bash
ipmitool -H BMC_IP -U USER -P PASS chassis power status
ipmitool -H BMC_IP -U USER -P PASS chassis power cycle
ipmitool -H BMC_IP -U USER -P PASS sel elist
ipmitool -H BMC_IP -U USER -P PASS sensor list
```

> **Warning:** `power cycle` and `power off` cut power at once. Drain the host first unless it is already hung.

## Check disks

```bash
lsblk -f
sudo smartctl -H /dev/sda
sudo smartctl -a /dev/sda | grep -E "Reallocated|Pending|Power_On"
cat /proc/mdstat
sudo mdadm --detail /dev/md0
```

## Replace a failed RAID member

```bash
sudo mdadm /dev/md0 --fail /dev/sdb
sudo mdadm /dev/md0 --remove /dev/sdb
sudo mdadm /dev/md0 --add /dev/sdc
watch cat /proc/mdstat
```

## Network and bonding

```bash
cat /proc/net/bonding/bond0
ip -s link show bond0
ethtool eno1 | grep -E "Speed|Link detected"
dmesg | grep -i bond
```

## PXE problems

```bash
sudo journalctl -u dnsmasq -f
grep -E "dhcp-boot|next-server|filename" /etc/dnsmasq.conf
sudo tcpdump -ni eth0 port 67 or port 68 or port 69
```

## A sick server checklist

1. Drain the workloads.
2. Read the BMC event log, SMART, kernel log and switch counters.
3. Decide which part is at fault. Do not swap parts at random.
4. Change one thing, test, record it by asset tag.

## Quick inventory

```bash
lscpu | head -5
free -h
lsblk -o NAME,SIZE,MODEL,SERIAL
dmidecode -s system-serial-number
ip -br link
```

## Cautions

> **Danger:** `ipmitool chassis power off` and `power cycle` cut power with no clean shutdown. Drain the workload first, and check you have the right BMC address.

> **Warning:** Never run `mdadm --zero-superblock` or `--create` on a disk that still holds data. Check `mdadm --detail` and `lsblk` first.

> **Warning:** A BMC on a shared or routable network is an entry point to the machine. Keep it on an isolated management network and change default passwords.

> **Caution:** Replacing a failed disk starts a rebuild that reads every other disk. Confirm the backup works before you pull the disk.