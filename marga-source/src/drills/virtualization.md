## Guest pauses with I/O error
level: mid
A guest on a KVM host pauses every few minutes and the console shows an I/O error.

```text
$ virsh domstate web-7 --reason
paused (ioerror)
$ virsh pool-info default | grep -E 'Capacity|Available'
Capacity:       500.00 GiB
Available:      0.00 GiB
```
? What is the most likely cause?
+ The storage pool is full, so writes to the virtual disk fail
- The guest has too many vCPUs
- The network bridge is down
- The guest kernel is too old
why: A full pool makes writes fail and the hypervisor pauses the guest to protect data. Free space, then resume.

## Host swapping under guests
level: mid
Guests are slow and the host load is high although guest CPU is idle.

```text
$ free -m
              total   used   free   shared  buff/cache  available
Mem:          64000  63500    200      100         300        150
Swap:          8192   8100     92
$ vmstat 1 2 | tail -1
 6  8 8300000 200 300 700 3500 4100 120 90 1200 3000 3 8 40 49 0
```
? What is happening?
+ The host is out of memory and swapping guest memory, so guests wait on disk
- The guests need more vCPUs
- The network is saturated
- The disk is encrypted
why: High si and so with almost no available memory means the host is thrashing. Reduce overcommit or move guests.

## Live migration stalls
level: senior
A live migration to another host runs for ten minutes and then fails.

```text
$ virsh domjobinfo db-2
Job type:         Unbounded
Data processed:   182 GiB
Data remaining:   14 GiB
Memory dirty rate: 1.4 GiB/s
Memory bandwidth: 1.1 GiB/s
```
? Why will it not finish?
+ The guest dirties memory faster than the network can copy it
- The destination has no disk
- The guest has no network card
- The hypervisor is too new
why: Migration copies memory while the guest changes it. If it changes faster than it is copied, it never converges. Use a faster link, auto-converge or post-copy.

## Guest has no network
level: junior
A new guest boots but cannot reach the network.

```text
$ virsh domiflist app-1
Interface  Type    Source   Model   MAC
-          bridge  br9      virtio  52:54:00:aa:bb:cc
$ ip link show br9
Device "br9" does not exist.
```
? What is wrong?
+ The guest is attached to a bridge that does not exist on this host
- virtio is not a valid model
- The MAC address is too long
- The guest needs more memory
why: The definition points to br9 but the host has no such bridge. Attach to the right bridge or create it.

## Template clone has duplicate identity
level: mid
Two guests cloned from one template fight for the same address.

```text
$ ssh app-1 cat /etc/machine-id
3c9a1f0e2b8d4a7aa1d0f0c2e1b34455
$ ssh app-2 cat /etc/machine-id
3c9a1f0e2b8d4a7aa1d0f0c2e1b34455
```
? What should have been done before the template was saved?
+ Remove machine-specific identity such as machine-id and SSH host keys so each clone generates its own
- Give the guests more memory
- Disable the network
- Use a smaller disk
why: Clones share whatever the template contains. Generalise the template first, for example with virt-sysprep.

