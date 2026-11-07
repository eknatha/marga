## VM stuck in Scheduling
level: junior
A new VM has been in Scheduling for ten minutes.

```text
$ kubectl describe pod virt-launcher-db1
Warning FailedScheduling 0/6 nodes are available: 6 Insufficient devices.kubevirt.io/kvm
```
? What does the event tell you?
+ No node offers the kvm device, so hardware virtualization is missing or not exposed
- The image is too large
- The DNS record is wrong
- The VM name is too long
why: The scheduler could not find a node with the kvm device. Check that nodes have /dev/kvm or use bare-metal nodes.

## Node drain blocked
level: mid
A drain stops with a VM that refuses to move.

```text
$ kubectl get vmi web01 -o jsonpath='{.status.conditions[?(@.type=="LiveMigratable")].message}'
cannot migrate VMI which does not use a shared ReadWriteMany PVC
```
? What is the cause?
+ The disk uses ReadWriteOnce storage so it cannot attach to two nodes
- The guest has too much memory
- The VM has no cloud-init
- The node has no taint
why: Live migration needs shared RWX storage. Move the disk to an RWX class or plan a stop.

## Edits that vanish
level: junior
Memory was raised on a running VMI, but after a restart it is back to the old value.

```text
$ kubectl edit vmi web01   # memory guest 8Gi
$ virtctl restart web01
$ kubectl get vmi web01 -o jsonpath='{.spec.domain.memory.guest}'
4Gi
```
? Why did the change disappear?
+ The VirtualMachine template is the source of truth and still says 4Gi
- Restart always resets memory
- The guest ignores memory
- The CRD is broken
why: A VMI is built from the VM at each start. Edit the VirtualMachine instead.

## Import never completes
level: mid
A DataVolume stays at a few percent.

```text
$ kubectl logs importer-fedora-golden | tail -n 1
E data-processor.go: failed to write: no space left on device
```
? What should you change?
+ Provide more scratch or target space for the import
- Delete the VM
- Switch the run strategy to Halted
- Add a Multus network
why: The importer ran out of space converting the image. Increase the PVC or the scratch space.

## OOMKilled launcher
level: mid
A healthy VM restarts at night.

```text
$ kubectl describe pod virt-launcher-app01 | grep Reason
Reason: OOMKilled
limits.memory: 8Gi  (guest memory: 8Gi)
```
? What is the likely cause?
+ The pod limit equals guest memory and leaves no room for QEMU overhead
- The guest has a virus
- The disk is full
- DNS failed
why: The pod needs memory for QEMU and libvirt in addition to guest memory. Raise the limit.

## VM lost its VLAN after migration
level: senior
A VM on a Multus bridge network lost connectivity after a live migration.

```text
$ ssh node3 'ip link show br100'
Device "br100" does not exist.
```
? What went wrong?
+ The destination node does not have the bridge the network definition uses
- Migration deletes IP addresses
- The VM was too large
- virtctl is out of date
why: A secondary bridge must exist on every node a VM can run on.
