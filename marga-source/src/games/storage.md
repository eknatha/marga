## The disk that is full but empty
module: storage
level: Intermediate
minutes: 7
lesson: storage/performance-backups-and-troubleshooting
summary: df says a volume is full, but du cannot find the files. Find the space and free it without a reboot.
intro: A log volume reports 100 percent used. Someone already deleted 40 GB of old logs, yet df has not changed. The application is about to stop writing.

### s1
text: df still shows 100 percent after deleting logs. What do you check?
- Compare df with du, then look for deleted files that are still open with lsof +L1 => s2 | 2 | A deleted file keeps its space until every process closes it. Example: lsof +L1 /var/log shows java holding /var/log/app/app.log (deleted) at 38 GB.
- Delete more files => s3 | 1 | More deletions may not help and can destroy useful data. Example: Another 5 GB of logs is removed and the free space does not move.
- Format the volume => end-fail | 0 | Formatting destroys everything and does not explain the cause. Example: The application loses its data directory and the incident gets worse.

### s2
text: The service has the deleted log open and keeps writing to it. How do you free the space?
- Truncate the open file through /proc, or restart the service in a controlled window, then fix log rotation => s4 | 2 | Truncating releases blocks without stopping the process; a restart closes the handle. Example: truncate -s 0 /proc/1432/fd/5 returns 38 GB, and df drops to 41 percent.
- Reboot the whole server => s3 | 1 | It works but is disruptive and teaches nothing. Example: Every service on the host restarts for one log file.
- Delete the process's directory in /proc => s3 | 0 | You cannot delete /proc entries and it would not free space. Example: rm reports permission errors and nothing changes.

### s3
text: Space is back. What was the real cause? Think about what the evidence shows.
- Log rotation moved the file by removing it while the application kept the old handle open => s4 | 2 | The writer needs to reopen the log after rotation, for example by signal or copytruncate. Example: logrotate removed app.log but the application was never told to reopen it.
- The disk is too small => s3 | 1 | It might be, but the missing space was in a hidden file. Example: A bigger disk would have filled just the same.
- The kernel has a bug => s3 | 0 | Behaviour is documented and normal. Example: Unix keeps data until the last handle closes.

### s4
text: What change do you make so it does not return?
- Configure rotation to signal the service or use copytruncate, and alert on usage and on deleted-but-open files => end-win | 2 | The fix is in the rotation contract and in the alert. Example: postrotate sends SIGHUP and an alert fires at 80 percent used.
- Add a cron job that reboots monthly => end-ok | 1 | It hides the problem on a timer. Example: Reboots land during a busy week.
- Delete logs more aggressively => end-fail | 0 | It does not address open handles. Example: The same file stays open and the space is still lost.

### end-win
end: win
text: Space is recovered without a reboot and rotation now signals the service.
takeaway: Deleted files hold space until closed. Compare df and du, and use lsof +L1.

### end-ok
end: ok
text: The immediate problem is gone, but the same trap remains.
takeaway: Fixing the symptom without the rotation contract means a repeat.

### end-fail
end: fail
text: The volume was reformatted and data was lost.
takeaway: Destructive steps before diagnosis turn a warning into an outage.


## The server that stopped booting after a mount change
module: storage
level: Intermediate
minutes: 7
lesson: storage/filesystems-ext4-xfs-and-mounts
summary: After editing fstab and rebooting, a server drops into emergency mode. Recover with care.
intro: You added a new data disk to /etc/fstab and rebooted. The server does not come up; the console shows emergency mode and a prompt asking for the root password.

### s1
text: You are at the emergency prompt. What do you read first?
- journalctl -xb and systemctl --failed to see which mount failed => s2 | 2 | The boot log names the unit and the reason. Example: journalctl -xb shows: Dependency failed for /data. A start job failed for dev-disk-by\x2duuid-...
- Reinstall the server => end-fail | 0 | A reinstall loses configuration and does not teach the cause. Example: Two days of work replace a one-line fix.
- Keep rebooting until it works => s3 | 0 | It will fail the same way each time. Example: The console shows the same emergency message ten times.

### s2
text: The log shows the UUID for /data does not exist. What is the likely cause?
- The UUID in fstab was typed or copied wrongly, so the device is not found => s4 | 2 | blkid shows the real UUID and fstab must match it. Example: blkid /dev/sdb1 shows UUID=7c1d... but fstab has 7c1b...
- The disk is too fast => s3 | 0 | Speed is not the issue. Example: The disk is detected normally in lsblk.
- The filesystem was formatted with the wrong block size => s3 | 1 | That would not stop a mount by UUID. Example: A different block size still mounts.

### s3
text: How do you fix it from the emergency shell?
- Remount root read-write, correct the UUID in fstab, run mount -a to test and reboot => s4 | 2 | mount -a proves the file before you reboot. Example: mount -o remount,rw / ; vi /etc/fstab ; mount -a returns no error.
- Delete /etc/fstab => end-fail | 0 | The system loses its root and swap entries. Example: Boot fails again, now with no root mount.
- Comment out every line => end-ok | 1 | It might boot, but nothing is mounted as designed. Example: Services start without their data volumes and write to the wrong place.

### s4
text: How do you avoid this next time? Think about what the evidence shows.
- Use nofail for non-essential data mounts, test with mount -a before rebooting and keep the console available => end-win | 2 | A bad optional mount should not stop the machine. Example: fstab line has defaults,nofail and the change is tested with mount -a.
- Never edit fstab => end-ok | 1 | Unrealistic, and mounts are needed. Example: People edit it anyway, with no process.
- Reboot first and check later => end-fail | 0 | This causes the same outage. Example: The next change takes down production again.

### end-win
end: win
text: The server boots, the data volume is mounted by the correct UUID and a bad entry no longer stops boot.
takeaway: Test fstab with mount -a before rebooting, and mark optional mounts nofail.

### end-ok
end: ok
text: The server boots but nothing is mounted as designed.
takeaway: Do not hide the problem. Restore the intended state.

### end-fail
end: fail
text: The server was rebuilt and configuration was lost.
takeaway: A one-line fix should not become a reinstall.


