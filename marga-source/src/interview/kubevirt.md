## What is KubeVirt and why would a team use it?
level: junior
KubeVirt is an add-on that runs virtual machines as Kubernetes workloads. Each VM runs inside a virt-launcher pod that holds libvirt and QEMU. Teams use it to keep legacy or non-containerisable software on the same platform as their containers, to use one set of tools for scheduling, RBAC, delivery pipelines and monitoring, and to leave a costly hypervisor platform gradually.

## What is the difference between a VirtualMachine and a VirtualMachineInstance?
level: junior
A VirtualMachine is the durable definition that survives stops and restarts. A VirtualMachineInstance is one running copy created from it, and it disappears when the VM stops. Permanent changes belong in the VirtualMachine template; edits to a VMI are lost at the next start.

## Why does live migration need ReadWriteMany storage?
level: mid
During migration the source and the target virt-launcher pods both attach the same disk, so the storage must allow access from two nodes at once. Ceph RBD in block mode and many SAN drivers do. A ReadWriteOnce disk cannot be attached to two nodes, so the VMI's LiveMigratable condition becomes False and a node drain would have to stop the VM.

## A migration never finishes. What do you look at?
level: mid
Check the VirtualMachineInstanceMigration status and the launcher logs for the dirty rate against the transfer rate. A busy guest can change memory faster than the network copies it. Options are higher bandwidth, auto-converge to throttle the guest, post-copy, or migrating at a quieter time. Also check CPU model differences, a passthrough device, and cluster limits on parallel migrations.

## How do you network a VM that needs a fixed address on a VLAN?
level: mid
Keep the pod network with masquerade for cluster access and add a secondary network with Multus. A NetworkAttachmentDefinition points at a Linux bridge on the VLAN, and the VM uses bridge binding to get a real layer 2 connection. The bridge and VLAN must exist on every node that can run the VM, or migration will leave it without a network.

## How do you back up KubeVirt VMs?
level: senior
Use VirtualMachineSnapshot with CSI volume snapshots and the guest agent for a consistent copy, but treat snapshots as an undo button because they usually sit on the same storage. For real backups add Velero with the KubeVirt plugin and a CSI data mover to copy data to object storage in another failure domain, and run restore tests on a schedule.
