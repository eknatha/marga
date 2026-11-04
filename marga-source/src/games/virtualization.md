## The guest that will not start
module: virtualization
level: Intermediate
minutes: 7
lesson: virtualization/cpu-memory-and-overcommit
summary: A new virtual machine fails to start with a memory error although the host seems to have room. Read the host, not the guest.
intro: You ask a KVM host to start db-3, a 16 GB guest. libvirt answers with an error and the guest stays shut off. The dashboard says the host has 64 GB of RAM, so a colleague suggests rebooting it.

### s1
text: The start fails. What do you look at first?
- The error text and the host's real free memory with free -m and virsh nodememstats => s2 | 2 | The error names the limit that was hit, and the host numbers show whether the memory is actually free. Example: error: internal error: process exited while connecting to monitor: cannot set up guest memory 'pc.ram': Cannot allocate memory, while free -m shows 9 GB available.
- Reboot the host => s3 | 0 | A reboot interrupts every running guest and does not explain the failure. Example: Eleven other guests restart, and db-3 fails again with the same error.
- Delete and recreate the guest => s3 | 1 | A new definition has the same memory request and will fail the same way. Example: The new db-3 also asks for 16 GB, and the start fails again.

### s2
text: Other guests already use 52 GB of the 64 GB host. What does that tell you?
- The host does not have 16 GB free, so the request cannot be met without freeing memory or choosing another host => s4 | 2 | Guest memory is real host memory unless you rely on overcommit, so the numbers decide. Example: free -m shows 9 GB available; 16 GB cannot fit, and swapping a database guest would make it slow.
- Add swap to the host so the guest fits => s3 | 1 | Swap lets the start succeed but puts guest memory on disk, which hurts performance badly. Example: The guest starts, then the database stalls whenever the host swaps.
- Set the guest memory to 128 GB so it has plenty => s3 | 0 | A bigger request makes the failure certain, not less likely. Example: The start fails at once because 128 GB is more than the host has in total.

### s3
text: You need db-3 running today. What is a sensible way forward?
- Move or shut down a lower priority guest, or start db-3 on a host with room, then record the capacity limit => end-win | 2 | You use the capacity you actually have and make the constraint visible. Example: virsh shutdown test-batch frees 12 GB, db-3 starts, and a ticket adds memory alerts at 85 percent.
- Enable heavy memory overcommit on every guest => end-ok | 1 | Overcommit can work for idle guests but is risky for databases. Example: The guest starts, but a busy afternoon pushes the host into the out-of-memory killer.
- Start the guest with the host memory check disabled by hand-editing system files => end-fail | 0 | Bypassing limits does not create memory. Example: The host kernel kills processes, including a guest, when memory runs out.

### s4
text: Before you finish, what do you add to the process?
- A placement check before every start, host memory alerts and a documented overcommit policy => end-win | 2 | The next person sees the limit before the failure. Example: A script compares requested memory against MemAvailable and refuses to start when it will not fit.
- Nothing, the guest is running => end-ok | 1 | The same failure will return when the next large guest starts. Example: Another 16 GB guest fails next month and the team repeats this investigation.
- Tell people not to create large guests => end-fail | 0 | A rule without visibility or enforcement is ignored. Example: Someone creates a 32 GB guest on Friday afternoon.

### end-win
end: win
text: db-3 is running, the host has headroom alerts, and the team knows how much guest memory the host can promise.
takeaway: Guest memory comes from the host. Read the host numbers, free capacity honestly, and alert before the limit.

### end-ok
end: ok
text: db-3 runs, but the host has no alert and relies on guests staying idle.
takeaway: Overcommit is a bet about behaviour. Make it a measured, documented decision.

### end-fail
end: fail
text: The host is in memory trouble, guests are being killed, and nobody knows why.
takeaway: Bypassing the limit moves the failure to a worse moment.


## Snapshots that filled the pool
module: virtualization
level: Intermediate
minutes: 7
lesson: virtualization/virtual-disks-snapshots-and-templates
summary: A storage pool is 98 percent full and guests are pausing. Find what is using the space and recover safely.
intro: At 02:10 three guests pause with I/O errors. virsh pool-info default shows 98 percent used. Last week someone took a snapshot before a risky change on each of 12 guests.

### s1
text: Guests are pausing. What first? Think about what the evidence shows.
- Check pool free space and which guests have snapshots, with virsh pool-info and virsh snapshot-list => s2 | 2 | A full pool pauses guests, and snapshots grow as the guest writes. Example: pool-info shows Available: 12 GiB; snapshot-list web-7 shows three snapshots from last Tuesday.
- Restart libvirtd => s3 | 0 | The daemon is fine; the disk is full. Example: After the restart the guests are still paused for the same reason.
- Resume the guests => s3 | 1 | Resuming without free space only pauses them again. Example: virsh resume works for seconds and then the guest pauses on the next write.

### s2
text: Snapshot chains from last week are the largest users of space. What do you know?
- Each guest writes changes into the overlay, so old snapshots keep growing until they are merged or deleted => s4 | 2 | A snapshot is a point to return to, not a backup, and its cost grows over time. Example: web-7 has a 6 GB base and 41 GB of snapshot data after a week of logging.
- Snapshots are free so the cause must be elsewhere => s3 | 0 | Snapshots store changed blocks and grow with writes. Example: Deleting logs inside guests frees nothing because the overlay still holds the old blocks.
- Snapshots only use space when you revert => s3 | 1 | They use space as the guest writes. Example: The guest only logged normally, and the overlay still grew.

### s3
text: You have confirmed the changes behind each snapshot are complete. How do you free space safely?
- Delete or merge the oldest snapshots one guest at a time, after checking a backup exists, and watch the pool => s4 | 2 | Merging takes I/O and space while it works, so go gradually. Example: virsh snapshot-delete web-7 before-upgrade, then pool-info shows 31 GiB available.
- Delete the files in the pool directory by hand => end-fail | 0 | Removing overlay files breaks the chain and corrupts guests. Example: web-7 can no longer boot because its backing file is gone.
- Delete every snapshot on every guest at once => end-ok | 1 | It may work but loads the disks and risks a second incident. Example: Merge I/O makes databases slow for an hour during business time.

### s4
text: How do you stop this happening again? Think about what the evidence shows.
- Set a snapshot expiry, alert on pool usage at 80 percent and use backups for retention => end-win | 2 | Snapshots are for short windows, backups for history. Example: A weekly job lists snapshots older than three days, and the pool alert fires at 80 percent.
- Ask people to remember to delete snapshots => end-ok | 1 | Manual reminders fail. Example: In two months the pool fills again.
- Disable snapshots completely => end-fail | 0 | You lose a useful safety net before upgrades. Example: The next risky change has no quick undo.

### end-win
end: win
text: Space is recovered, guests run and snapshot expiry plus alerts prevent a repeat.
takeaway: A snapshot is a short-lived safety net. Merge it after the change, and use backups to keep history.

### end-ok
end: ok
text: The pool has space again, but nothing stops snapshots piling up.
takeaway: Fixing symptoms without a rule means the page returns.

### end-fail
end: fail
text: A chain was broken by hand and a guest cannot boot.
takeaway: Never touch overlay and backing files outside the hypervisor tools.


