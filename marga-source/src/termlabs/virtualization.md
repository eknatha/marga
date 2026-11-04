## The guest will not start: no memory
id: vt-start-memory
module: virtualization
level: Intermediate
minutes: 10
lesson: virtualization/cpu-memory-and-overcommit
engine: Simulated libvirt and KVM host
summary: A new database guest fails to start because the KVM host has no free memory. Free it from the right place and start the guest.
@@ story
You must start db-3, a 16 GB guest. virsh start fails with a memory error. The host has 72 GB, and the running guests already use 64 GB of it. One of the running guests is a throw-away test batch that nobody needs this week. Production guests must stay up.
@@ goals
- Read the error and the memory in use.
- Shut down only the test guest.
- Start db-3 and keep the production guests running.
@@ hints
- `virsh list --all` shows guests. `virsh dominfo NAME` shows the memory each uses.
- The guest named test-batch is the only one not serving users.
- `virsh shutdown test-batch`, then `virsh start db-3`.
@@ world
{"more": {"virsh": {"host": {"cpus": 16, "memMiB": 73728}, "pools": [{"name": "default", "capGiB": 2000, "allocGiB": 900}], "domains": [{"name": "web-1", "state": "running", "vcpus": 2, "memMiB": 8192, "pool": "default", "disk": "/var/lib/libvirt/images/web-1.qcow2", "snapshots": []}, {"name": "api-1", "state": "running", "vcpus": 2, "memMiB": 8192, "pool": "default", "disk": "/var/lib/libvirt/images/api-1.qcow2", "snapshots": []}, {"name": "cache-1", "state": "running", "vcpus": 2, "memMiB": 4096, "pool": "default", "disk": "/var/lib/libvirt/images/cache-1.qcow2", "snapshots": []}, {"name": "reporting", "state": "running", "vcpus": 2, "memMiB": 16384, "pool": "default", "disk": "/var/lib/libvirt/images/reporting.qcow2", "snapshots": []}, {"name": "db-1", "state": "running", "vcpus": 2, "memMiB": 16384, "pool": "default", "disk": "/var/lib/libvirt/images/db-1.qcow2", "snapshots": []}, {"name": "test-batch", "state": "running", "vcpus": 2, "memMiB": 12288, "pool": "default", "disk": "/var/lib/libvirt/images/test-batch.qcow2", "snapshots": []}, {"name": "db-3", "state": "shutoff", "vcpus": 2, "memMiB": 16384, "pool": "default", "disk": "/var/lib/libvirt/images/db-3.qcow2", "snapshots": []}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "virsh list",
  "code": 0,
  "label": "db-3 is running",
  "out": "db-3\\s+running"
 },
 {
  "t": "cmd",
  "run": "virsh list",
  "code": 0,
  "label": "web-1 is still running",
  "out": "web-1\\s+running"
 },
 {
  "t": "cmd",
  "run": "virsh list",
  "code": 0,
  "label": "db-1 is still running",
  "out": "db-1\\s+running"
 },
 {
  "t": "cmd",
  "run": "virsh list --all",
  "code": 0,
  "label": "test-batch is shut off",
  "out": "test-batch\\s+shut off"
 }
]
@@ explain
Guest memory comes from the host unless you rely on overcommit, so a start can fail even when the dashboard looks calm. Compare what the running guests hold with the host total, then free it from the least important place. Never trade production for a test guest, and record the capacity limit so it does not surprise the next person.
@@ solution
virsh start db-3
virsh list --all
virsh shutdown test-batch
virsh start db-3
virsh list


## The storage pool is full of old snapshots
id: vt-snapshot-pool
module: virtualization
level: Intermediate
minutes: 12
lesson: virtualization/virtual-disks-snapshots-and-templates
engine: Simulated libvirt and KVM host
summary: A storage pool has almost no free space because of old snapshots. Remove the stale ones, keep the latest, and start the waiting guest.
@@ story
The default pool is 98 percent full, and db-9 will not start because of it. Last month's upgrade left two large snapshots on web-7 that nobody needs. The newest snapshot, nightly, is the one you keep. Free the space in the safe way, with virsh and not by deleting files.
@@ goals
- Look at the pool and the snapshots on web-7.
- Delete only the two old upgrade snapshots with virsh.
- Start db-9 and keep the nightly snapshot.
@@ hints
- `virsh pool-info default` shows capacity and available space. `virsh snapshot-list web-7` lists snapshots.
- The names before-upgrade-1 and before-upgrade-2 are the old ones.
- `virsh snapshot-delete web-7 before-upgrade-1`, and the same for -2, then `virsh start db-9`.
@@ world
{"more": {"virsh": {"host": {"cpus": 16, "memMiB": 65536}, "pools": [{"name": "default", "capGiB": 500, "allocGiB": 499.98}], "domains": [{"name": "web-7", "state": "running", "vcpus": 2, "memMiB": 4096, "pool": "default", "disk": "/var/lib/libvirt/images/web-7.qcow2", "snapshots": [{"name": "before-upgrade-1", "created": "2026-10-06 09:00:00 +0000", "sizeGiB": 150}, {"name": "before-upgrade-2", "created": "2026-10-13 09:00:00 +0000", "sizeGiB": 120}, {"name": "nightly", "created": "2026-11-02 02:00:00 +0000", "sizeGiB": 3}]}, {"name": "db-9", "state": "shutoff", "vcpus": 2, "memMiB": 8192, "pool": "default", "disk": "/var/lib/libvirt/images/db-9.qcow2", "snapshots": [], "needsSpace": true}]}}}
@@ checks
[
 {
  "t": "cmd",
  "run": "virsh snapshot-list web-7",
  "code": 0,
  "label": "the old snapshots are gone",
  "notOut": "before-upgrade"
 },
 {
  "t": "cmd",
  "run": "virsh snapshot-list web-7",
  "code": 0,
  "label": "the nightly snapshot is kept",
  "out": "nightly"
 },
 {
  "t": "cmd",
  "run": "virsh list",
  "code": 0,
  "label": "db-9 is running",
  "out": "db-9\\s+running"
 }
]
@@ explain
A snapshot keeps the old state of a disk and grows as the guest writes, so old ones quietly eat the pool. Delete them with the hypervisor tools, which merge or drop the chain correctly. Removing the files by hand breaks guests. Use backups for history and keep snapshots for short windows around changes.
@@ solution
virsh pool-info default
virsh snapshot-list web-7
virsh snapshot-delete web-7 before-upgrade-1
virsh snapshot-delete web-7 before-upgrade-2
virsh pool-info default
virsh start db-9


## A guest asks for more vCPUs than the host has
id: vt-vcpu-oversub
module: virtualization
level: Intermediate
minutes: 10
lesson: virtualization/cpu-memory-and-overcommit
engine: Simulated Linux shell with configuration files
summary: Cut a guest definition that has 16 vCPUs on an 8-core host to a sensible number.
@@ story
The reporting guest feels slow, and its definition asks for 16 vCPUs on an 8-core host that also runs other guests. Steal time on the host is high. Set the guest to 4 vCPUs in its definition file.
@@ goals
- Read host.txt and reporting.xml.
- Set the vcpu count to 4.
- Leave the memory setting unchanged.
@@ hints
- `cat host.txt` shows the host has 8 cores.
- The element is <vcpu>16</vcpu> in reporting.xml.
- `sed -i 's#<vcpu>16</vcpu>#<vcpu>4</vcpu>#' reporting.xml`
@@ world
{"cwd": "/home/user/vms"}
@@ file /home/user/vms/host.txt
cores: 8
guests: 6
steal time at peak: 31%

@@ file /home/user/vms/reporting.xml
<domain type="kvm">
  <name>reporting</name>
  <memory unit="GiB">16</memory>
  <vcpu>16</vcpu>
</domain>

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/vms/reporting.xml",
  "label": "the guest has 4 vCPUs",
  "re": "<vcpu>4</vcpu>"
 },
 {
  "t": "contains",
  "path": "/home/user/vms/reporting.xml",
  "label": "memory is unchanged",
  "re": "<memory unit=\"GiB\">16</memory>"
 }
]
@@ explain
More vCPUs than physical cores make the guest wait in the host run queue, which shows as steal time. A guest rarely needs more vCPUs than its work can use at once, so start small and measure.
@@ solution
cat host.txt
cat reporting.xml
sed -i 's#<vcpu>16</vcpu>#<vcpu>4</vcpu>#' reporting.xml
cat reporting.xml


## Guest on the wrong VLAN
id: vt-vlan-tag
module: virtualization
level: Intermediate
minutes: 10
lesson: virtualization/virtual-networking-bridges-and-vlans
engine: Simulated Linux shell with configuration files
summary: A guest NIC is on VLAN 10 but must be on VLAN 20. Fix the network definition.
@@ story
The new payments guest cannot reach its gateway. Its NIC definition tags VLAN 10, but the payments network uses VLAN 20. Change the tag and keep the bridge name.
@@ goals
- Read nic.xml and the network note.
- Change the VLAN tag to 20.
- Keep the bridge br0.
@@ hints
- `cat network-note.txt` says payments is VLAN 20.
- Edit the tag id line in nic.xml.
- `sed -i 's#<tag id="10"/>#<tag id="20"/>#' nic.xml`
@@ world
{"cwd": "/home/user/vms"}
@@ file /home/user/vms/network-note.txt
payments network: VLAN 20, gateway 10.20.0.1
user network: VLAN 10

@@ file /home/user/vms/nic.xml
<interface type="bridge">
  <source bridge="br0"/>
  <vlan><tag id="10"/></vlan>
  <model type="virtio"/>
</interface>

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/vms/nic.xml",
  "label": "the tag is 20",
  "re": "<tag id=\"20\"/>"
 },
 {
  "t": "contains",
  "path": "/home/user/vms/nic.xml",
  "label": "the bridge is still br0",
  "re": "bridge=\"br0\""
 }
]
@@ explain
A tagged port only talks to others on the same VLAN. The guest was alive but on the wrong network, so it could never see its gateway. Always compare the tag with the network plan.
@@ solution
cat network-note.txt
cat nic.xml
sed -i 's#<tag id="10"/>#<tag id="20"/>#' nic.xml
cat nic.xml


## A live migration that never finishes
id: vt-migrate-flags
module: virtualization
level: Advanced
minutes: 10
lesson: virtualization/live-migration-ha-and-troubleshooting
engine: Simulated Linux shell with configuration files
summary: Add auto-converge and a downtime limit to a migration script for a busy guest.
@@ story
Migrating the busy database guest never completes, because it changes memory faster than the link copies it. Edit the script so it uses auto-converge and a maximum downtime of 500 ms.
@@ goals
- Read migrate.sh and the log.
- Add --auto-converge.
- Add --timeout 600 so it gives up cleanly.
@@ hints
- The log says the migration stays at 99 percent.
- Add --auto-converge to the virsh migrate command.
- Also add --timeout 600 so it stops trying forever.
@@ world
{"cwd": "/home/user/vms"}
@@ file /home/user/vms/migrate.log
iteration 40: dirty 3.1 GB/s, link 1.2 GB/s
progress 99%
migration did not converge

@@ file /home/user/vms/migrate.sh
#!/bin/sh
virsh migrate --live db-1 qemu+ssh://host2/system

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/vms/migrate.sh",
  "label": "auto-converge is used",
  "re": "--auto-converge"
 },
 {
  "t": "contains",
  "path": "/home/user/vms/migrate.sh",
  "label": "a timeout is set",
  "re": "--timeout\\s+\\d+"
 }
]
@@ explain
When the guest dirties memory faster than the link, every round is as big as the last. Auto-converge throttles the guest so the copy can catch up, and a timeout stops a migration that cannot finish.
@@ solution
cat migrate.log
cat migrate.sh
sed -i 's#--live db-1#--live --auto-converge --timeout 600 db-1#' migrate.sh
cat migrate.sh

