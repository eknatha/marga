## Quorum lost
level: mid
The whole cluster stopped serving IO after a power event.

```text
$ ceph -s
health: HEALTH_ERR 2/3 mons down, no quorum
```
? What is the best explanation?
+ Two of three monitors failed together so no majority exists
- The OSDs are encrypted
- The pool has too many PGs
- The balancer is off
why: Monitors need a majority. Spread them across failure domains.

## Inactive placement groups
level: mid
After a host failed some data became unavailable.

```text
$ ceph health detail
HEALTH_ERR 12 pgs inactive
$ ceph osd crush rule dump replicated_rule | grep type
"type": "osd"
```
? What is the cause?
+ Copies were allowed on the same host because the rule used an OSD failure domain
- The cluster has too few monitors
- The network MTU is wrong
- Scrubbing is disabled
why: Use a host or rack failure domain so copies are on different hardware.

## Disk skipped
level: junior
A newly added disk never becomes an OSD.

```text
$ ceph orch device ls
osd4 /dev/sdc AVAILABLE No  Has partitions, LVM detected
```
? What do you do?
+ Confirm the disk is unused, zap it, and let the orchestrator create the OSD
- Reboot all monitors
- Increase pg_num
- Disable cephadm
why: cephadm refuses disks with existing data. Zapping is safe only after you confirm the disk is spare.

## Clients slow during recovery
level: senior
Latency doubles after each disk replacement.

```text
$ ceph -s
client: 220 MiB/s rd
recovery: 780 MiB/s
$ ceph config get osd osd_mclock_profile
high_recovery_ops
```
? What fixes the latency?
+ Switch to a balanced or high_client_ops profile so recovery yields to clients
- Add more monitors
- Make pools erasure coded
- Turn off the public network
why: The profile gave recovery most of the bandwidth. Prioritise client IO.

## Unsafe maintenance
level: senior
An operator wants to reboot three storage hosts quickly.

```text
Plan: reboot host1, host2, host3 one right after another.
```
? What should be the plan instead?
+ Set noout, reboot one host, wait for HEALTH_OK, then continue
- Reboot all three at once
- Unset noout first
- Delete the pools first
why: Waiting for recovery avoids having PGs with fewer copies than min_size.

## Pool full at 82 percent
level: senior
Writes stopped after a host failure.

```text
$ ceph df
TOTAL 300 TiB used 88.7%
$ ceph health
HEALTH_ERR 3 full osd(s)
```
? Why did a healthy 82 percent become full?
+ Recovery of the lost host filled the surviving OSDs because there was no headroom
- Monitors ran out of space
- The balancer deleted data
- RGW used all the CPU
why: Plan capacity for a host failure, not for the healthy day.
