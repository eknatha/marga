## The cluster that filled after one failure
module: ceph
level: Advanced
minutes: 7
lesson: ceph/capacity-planning-upgrades-and-operating-ceph
summary: A single storage host fails and soon the whole Ceph cluster refuses writes. Work out why and recover safely.
intro: Overnight a storage host lost its power supply. By morning applications report write errors, and ceph -s shows HEALTH_ERR with full OSDs. The cluster was at 82 percent before the failure.
### s1
text: Writes are failing and the cluster shows full OSDs. What do you check first?
- Run ceph health detail and ceph osd df to see which OSDs are full and what recovery is doing => s2 | 2 | These show which devices are full and whether recovery is the cause. Example: ceph osd df shows survivors at 93 to 95 percent after taking in data from the failed host.
- Restart all OSDs to clear the full flag => end-fail | 0 | Restarting does not free space and can add recovery load. Example: After the restart the OSDs are still at 95 percent and several fail to rejoin quickly.
- Delete a large pool to make space immediately => end-fail | 0 | Deleting a pool destroys data and may not be what is needed. Example: A pool of backups is removed and the application team loses six months of data.
### s2
text: Recovery from the failed host has pushed the survivors over the full ratio. What is the safest first action?
- Bring the failed host back or add capacity, and temporarily free space from data you can safely remove => s3 | 2 | More capacity or the returning host lets recovery finish. Example: Powering the host back on lets its OSDs rejoin, and recovery traffic stops.
- Raise the full ratio to its maximum and carry on => s4 | 1 | A small, temporary increase can unblock deletes but is dangerous if left. Example: Raising the full ratio from 0.95 to 0.96 allows deletes to run, then it must be reverted.
- Wait and hope recovery finishes by itself => end-fail | 0 | Recovery cannot finish without free space. Example: The cluster stays full for hours while applications fail.
### s3
text: The host is back and OSDs are rejoining. What do you do while the cluster heals?
- Watch ceph -s until PGs are active+clean and keep client changes minimal => s5 | 2 | Letting recovery finish is the priority. Example: ceph -s shows misplaced objects falling from 22 percent to 0 over two hours.
- Start a large data migration to use the quiet time => end-fail | 0 | New load slows recovery and risks filling again. Example: A 20 TB import makes the OSDs full again within the hour.
### s4
text: You raised the full ratio slightly. What must you do next?
- Free space or add capacity quickly, and set the ratio back to its normal value => s5 | 2 | The raised ratio is a short loan, not a fix. Example: ceph osd set-full-ratio 0.95 is restored once usage is under 85 percent.
- Leave the higher ratio as the new normal => end-fail | 0 | There is then no safety margin for recovery. Example: The next failure fills OSDs completely and they stop.
### s5
text: The cluster is healthy again. How do you prevent a repeat?
- Plan headroom for a failed host, alert on capacity at 65 and 75 percent, and add hardware before the cluster is full => end-win | 2 | It sizes for failure, not for the healthy day. Example: A 12 host cluster is kept below 70 percent so 11 hosts can absorb one failure.
- Buy more disks but keep the old alert thresholds => end-ok | 1 | Capacity helps, but without alerts it fills again. Example: Six months later the cluster is at 80 percent with no warning.
- Turn off nearfull warnings to reduce noise => end-fail | 0 | Warnings are the early signal. Example: The cluster goes from quiet to full with no notice.
### end-win
end: win
text: The cluster is healthy, capacity is monitored, and a host failure no longer threatens writes.
takeaway: Size for the failure you must survive and alert before the thresholds.
### end-ok
end: ok
text: The cluster works again but the same risk remains.
takeaway: Capacity without monitoring only delays the next incident.
### end-fail
end: fail
text: The cluster stays full or data was lost.
takeaway: Do not delete data or restart daemons blindly; read the state and restore capacity.
