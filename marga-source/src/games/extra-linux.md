## The server that would not reboot
module: linux
level: Intermediate
minutes: 7
lesson: linux/boot-and-kernel
summary: After a kernel update the server hangs at boot. Use the console, the boot menu and logs to get it back.
intro: It is 23:40. You updated the kernel on a production web server and rebooted. It does not answer on the network, and monitoring shows it down.

### s1
text: The host is down after a reboot. What do you check first?
- Open the out-of-band console and watch the boot messages => s2 | 2 | The console shows where boot stops, and does not depend on the network. Example: The console shows a message about not finding the root filesystem, which points at the new kernel or its initial ramdisk.
- Reboot again and hope it works this time => s2 | 0 | Repeating the same boot gives the same result and wastes the outage window. Example: A second reboot hangs at the same line, and ten more minutes pass.
- Reinstall the operating system => end-fail | 0 | A full rebuild throws away data and time when a smaller fix is likely. Example: Reinstalling loses local data and takes an hour when choosing the old kernel would have taken a minute.

### s2
text: The console shows the boot menu with two kernels. What now?
- Boot the previous kernel that worked => s3 | 2 | The old kernel is a known good state, which restores service quickly. Example: Choosing the 5.15 entry instead of 5.19 brings the server up in a minute.
- Edit the boot line and remove all options => s3 | 0 | Changing boot parameters blindly can make boot worse and hides the real cause. Example: Removing quiet and root= options leaves the kernel without a root device.
- Wait ten more minutes in case it finishes => s3 | 1 | Waiting rarely helps when the console already shows a stop, but it is not harmful. Example: A hung boot at a fixed message does not resolve by itself.

### s3
text: The server is back on the old kernel. What do you do before the morning?
- Read the boot log of the failed attempt and note the error => s4 | 2 | Evidence of the failure is needed to fix it properly, and it is still in the journal. Example: journalctl -b -1 shows the failed boot and a missing storage driver in the initial ramdisk.
- Leave it running and decide later => s4 | 1 | Service is restored, but the cause stays unknown and the next update will fail again. Example: The same update runs automatically next week and takes the server down again.
- Remove the new kernel package and forget it => s4 | 1 | That hides the problem without learning what broke. Example: Later a security fix needs the newer kernel, and the same fault appears.

### s4
text: What change keeps the next kernel update safe?
- Keep two kernels, test updates on a staging host and reboot with someone watching the console => end-win | 2 | A tested path and a known good fallback make updates routine. Example: Staging runs the same update first and shows the missing driver before production does.
- Disable all kernel updates => end-fail | 0 | You stop receiving security fixes, which is a worse risk. Example: A year later the server is behind on fixes for known kernel flaws.
- Update only on Fridays at night => end-ok | 1 | Timing does not remove the risk, it only changes who is awake for it. Example: A Friday update that fails means a weekend of reduced service.

### end-win
end: win
text: The server is back on the known good kernel in minutes, the cause is found in the log, and the update is tested on staging next.
takeaway: Keep a fallback kernel, have console access and read the failed boot log before changing anything.

### end-ok
end: ok
text: Service is back, but the cause is still unknown, so the same failure waits for the next update.
takeaway: Recovery is only half the job. Read the evidence and fix the cause.

### end-fail
end: fail
text: The outage lasted far longer because the response guessed instead of reading the console.
takeaway: Look at the console first, then choose the smallest change that restores service.

## The cron job that never ran
module: linux
level: Beginner
minutes: 6
lesson: linux/cron-and-timers
summary: A nightly backup job works by hand but leaves no backup. Find out why cron did nothing.
intro: The weekly review shows no backup file for four nights. The script runs fine when you type its name in a shell.

### s1
text: The script works by hand but not from cron. What is your first suspicion?
- The environment differs: cron has a minimal PATH and no profile => s2 | 2 | Cron does not load your login settings, so commands found in your shell may be missing. Example: A script that calls pg_dump without a full path works in your shell and fails under cron.
- Cron is broken on this machine => s2 | 0 | Cron is rarely broken. The job usually runs and fails for a reason you can read. Example: Other jobs on the same host run normally, so cron itself is fine.
- The disk is full => s2 | 1 | Possible, but you can check it quickly and it does not explain why only this job fails. Example: df shows 40 percent used, so the disk is not the cause.

### s2
text: Where do you look for evidence that cron ran the job?
- The system log or journal for the cron entry, plus the job output => s3 | 2 | The log shows whether the job started and what it printed. Example: journalctl -u cron shows the job started at 02:00, and the output file shows pg_dump: command not found.
- Guess and edit the schedule => s3 | 0 | Changing the schedule does not help if the job already starts but fails. Example: Moving it to 03:00 gives the same error one hour later.
- Ask the team if anyone changed it => s3 | 1 | Useful context, but the log answers faster and with certainty. Example: Nobody remembers a change, and the log shows the real failure.

### s3
text: The log says the command was not found. How do you fix the job?
- Use absolute paths, set PATH in the crontab and send output to a log file => s4 | 2 | Explicit paths and logs make the job independent of a shell profile. Example: The crontab line sets PATH=/usr/bin:/bin and calls /usr/bin/pg_dump, writing to /var/log/backup.log.
- Add the job to your own profile so it loads => s4 | 0 | Profiles load only for login shells, so cron would still not see them. Example: Editing .bashrc changes nothing for a cron job.
- Run it in a loop with sleep => end-fail | 0 | A loop is a fragile replacement for a scheduler and hides failures. Example: A sleep loop dies on reboot and nobody notices.

### s4
text: How do you make sure a missed backup is noticed next time?
- Alert if the backup file is missing or old, and test a restore => end-win | 2 | Alerting on absence catches silent failures that error alerts miss. Example: A check that fails when the newest backup is older than 26 hours would have fired on the first night.
- Read the log every morning => end-ok | 1 | It works only while someone remembers to do it. Example: On a holiday week nobody reads the log, and the gap returns.
- Do nothing, the job is fixed => end-fail | 0 | The same silent failure can happen again for another reason. Example: A full disk next month stops the backup again, and nobody knows.

### end-win
end: win
text: The job runs with an explicit environment and logs its output, and a missing-backup alert means a silent failure cannot last four days again.
takeaway: Scheduled jobs need absolute paths, logs and an alert on missing results.

### end-ok
end: ok
text: The job works now, but without an alert on absence the next silent failure could run for days.
takeaway: Fixing the job is not enough. Monitor the result, not only the error.

### end-fail
end: fail
text: The job still fails quietly, and backups remain missing.
takeaway: Read the log and the job output before changing the schedule.

