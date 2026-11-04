## What is the difference between a type 1 and a type 2 hypervisor, and where does KVM fit?
level: junior
A type 1 hypervisor runs directly on the hardware, a type 2 runs as an application on a normal operating system. KVM turns the Linux kernel itself into a type 1 hypervisor, with QEMU providing the device models and libvirt giving a management interface. In practice the label matters less than knowing who owns CPU, memory, disk and network for each guest.

## What happens when you overcommit memory or CPU?
level: junior
Overcommit means promising guests more than the host physically has, betting that they will not all use it at once. CPU overcommit shows up as steal time and slow guests when everyone is busy. Memory overcommit is riskier, because the host starts swapping or the kernel kills processes. I allow it for idle or bursty guests and avoid it for databases.

## Why is a snapshot not a backup?
level: junior
A snapshot records a point in time on the same storage and usually depends on the original disk, so losing the storage loses both. Snapshots also grow as the guest writes, which can fill the pool. I use them for short windows around changes and use real backups copied elsewhere for retention and recovery.

## How would you choose between a bridge, NAT and a VLAN-tagged network for guests?
level: mid
A bridge puts guests on the same layer-2 network as the host, which is what servers usually need. NAT hides guests behind the host and suits desktops or labs. VLAN tags separate traffic from several networks over one physical link, so I combine a VLAN-aware bridge or Open vSwitch with the switch configuration. I check the physical switch allows the tags before blaming the guest.

## A live migration never finishes. What do you do?
level: mid
I check whether the guest dirties memory faster than the link copies it, using the job statistics. Options are a faster or dedicated migration network, compression, auto-converge that slows the guest's CPU, or post-copy, accepting the risk that a failure during post-copy loses the guest. I also check shared storage, CPU model compatibility and bandwidth caps.

## How do you design capacity and high availability for a virtualization cluster?
level: senior
I plan for losing one host and still restarting its guests, so total memory and CPU must have that headroom. I use shared or replicated storage, fencing so a failed host is really off before guests restart elsewhere, and anti-affinity so redundant pairs do not share a host. I test failover on a schedule, because untested HA is a hope, not a design.
