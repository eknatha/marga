## The disk that filled overnight
module: linux
level: Beginner
minutes: 7
lesson: linux/disks-and-filesystems
summary: A disk is full, yet du cannot find the files. Learn why a deleted log can still use space.
intro: At 06:10 the on-call phone rings. The app on app-02 fails with "No space left on device". Someone says they already deleted the big log file last night, but nothing improved.

### s1
text: You log in. Writes fail. What do you check first?
- Run df -h to see which filesystem is full and how full => s2 | 2 | df shows the filesystem view, which is what the failing write sees. Example: df -h reports /var at 100 percent, so you know to look under /var and not elsewhere.
- Reboot the server to clear it => s2 | 0 | A reboot closes all open files, so it can free the space, but it causes downtime and destroys evidence about what held the space. Example: the same log would fill the disk again next week and nobody would know why.
- Delete files in /tmp at random => s2 | 1 | It may free a little, but you are guessing and may delete something in use. Example: removing a lock file from /tmp can make a running job fail in a new way.

### s2
text: df -h says /var is 100 percent full. du -sh /var/* adds up to only 12 GB, but the filesystem is 50 GB. What does the gap suggest?
- Space is held by deleted files that a process still has open => s3 | 2 | On Linux, a deleted file keeps using space until every process closes it. Example: you ran rm app.log while the app kept writing; the name is gone but the 38 GB are still allocated.
- The disk is faulty, so order a new one => end-fail | 0 | A mismatch between df and du is common and usually software, not hardware. Example: replacing the disk would take days and the same open deleted file would reappear on the new one.
- du is wrong, ignore it => s3 | 1 | du only counts files that still have names, so it is correct for what it measures. Example: du cannot see a deleted file, but lsof can.

### s3
text: You want to find the process holding the deleted file. Which command helps?
- lsof +L1 or lsof | grep deleted => s4 | 2 | lsof lists open files, and +L1 lists files with fewer than one link, meaning deleted but open. Example: the output shows java, pid 4121, holding /var/log/app/app.log (deleted) at 38 GB.
- ls -la /var/log => s4 | 1 | ls shows only names that exist, so the deleted file is not listed. Example: you see only the new, small app.log and conclude all is well.
- free -m => s4 | 0 | free reports memory, not disk. Example: it would show plenty of RAM and send you in the wrong direction.

### s4
text: lsof shows the app (pid 4121) holding the 38 GB deleted file. Restarting the app would release it, but it is the live checkout service. What do you do?
- Truncate the file through /proc/4121/fd/N, or schedule a graceful restart => s5 | 2 | Truncating the open descriptor releases the space without stopping the process. Example: running : > /proc/4121/fd/7 sets the size to zero and df drops from 100 to 24 percent at once.
- kill -9 the app now => end-fail | 0 | A hard kill releases the space but drops in-flight requests and may corrupt state. Example: orders being written at that moment fail or are lost.
- Do nothing and wait for it to clear => s5 | 1 | It will not clear, because the process keeps the file as long as it runs. Example: the next log line still fails to write at 100 percent.

### s5
text: Space is free again. What do you do before closing the incident?
- Add log rotation, a disk alert at 80 percent, and note that logs must be rotated, not deleted => end-win | 2 | Rotation tells the process to reopen a new file, so space is really freed. Example: logrotate with copytruncate or a postrotate reload, plus an alert at 80 percent, gives hours of warning.
- Close the incident => end-ok | 1 | Service is back but the cause remains. Example: the log grows again and the same page arrives in a month.
- Delete more logs to be safe => end-fail | 0 | Deleting open logs repeats the original mistake. Example: the space does not return and you lose useful history.

### end-win
end: win
text: The disk is at 31 percent. Logs rotate weekly, and an alert fires at 80 percent. Nobody gets paged at 06:10 again.
takeaway: Deleting a file does not free its space while a process holds it open. Compare df with du, find holders with lsof, and rotate or truncate instead of removing.

### end-ok
end: ok
text: Service returned and space is free, but the cause was left. The same log fills the disk again in three weeks.
takeaway: Recovery without prevention is a postponed incident. Add rotation and alerting.

### end-fail
end: fail
text: The server restarted with the space still held or the evidence gone, and the disk filled again within hours.
takeaway: Do not reboot or delete blindly. Measure with df, du and lsof first.

## Locked out of SSH after a hardening change
module: linux
level: Intermediate
minutes: 7
lesson: linux/ssh-and-remote-access
summary: A security change closes the only way into a server. Learn to change SSH safely and keep a way back.
intro: A security ticket asks you to disable password logins on a production server. You edit /etc/ssh/sshd_config over your current SSH session.

### s1
text: You are connected over SSH and about to change sshd_config. What is the safest way to start?
- Keep this session open, make the change, and test with a second session before closing the first => s2 | 2 | An open session survives a daemon reload, so it is your way back if the change is wrong. Example: you edit, run sshd -t, reload, then open a second terminal and log in with your key before logging out of the first.
- Edit, restart sshd and log out to test => s2 | 0 | If the new config is wrong you have no session left to repair it. Example: a typo in the config stops sshd from starting and you cannot reach the machine.
- Edit and reboot to apply => s2 | 1 | A reboot is unnecessary for sshd and removes your safety net. Example: if the new config breaks key login you only find out after the machine is down.

### s2
text: You set PasswordAuthentication no. Before reloading, what check do you run?
- sshd -t to test the config syntax, then confirm your public key is in authorized_keys => s3 | 2 | sshd -t catches syntax errors, and a key in place is the condition for key-only login. Example: sshd -t prints nothing, and cat ~/.ssh/authorized_keys shows your key.
- Nothing, the change is small => end-fail | 0 | Small config changes cause large outages when they are wrong. Example: a stray character makes the file invalid and sshd refuses to reload.
- Check that port 22 is open in the firewall => s3 | 1 | That helps for connectivity, but it does not test the config or the key. Example: the port is open and login still fails because no key is installed.

### s3
text: You reload sshd. A second session with your key works. A colleague then says they cannot log in at all. Why?
- They log in with a password, which is now disabled, and have no key installed => s4 | 2 | Turning off passwords locks out anyone who relies on them. Example: the colleague has no key in authorized_keys, so every login attempt ends with Permission denied (publickey).
- The server crashed => s4 | 0 | The server is up, since your session works. Example: ping and your second login both succeed.
- The network is down => s4 | 1 | If the network were down your session would fail too. Example: the error text says Permission denied, which means the server answered.

### s4
text: Three more people have no keys. A manager asks you to turn passwords back on "just for today". What do you do?
- Help them create keys and add them, keep passwords off, and use a short written exception only if required => s5 | 2 | Fixing the root cause keeps the security gain. Example: ssh-keygen on their laptops and ssh-copy-id take five minutes each.
- Turn passwords back on permanently => s5 | 1 | It resolves the complaints and undoes the purpose of the change. Example: brute-force attempts in auth.log keep succeeding against weak passwords.
- Share one private key with the whole team => end-fail | 0 | A shared key has no owner and cannot be revoked for one person. Example: when someone leaves you must replace the key for everyone.

### s5
text: Everyone has keys and the change is stable. What do you record?
- Update the runbook, add a break-glass console access path, and test it once => end-win | 2 | A tested way in that does not depend on SSH protects you from future lockouts. Example: the cloud serial console works even when sshd is stopped.
- Nothing, it works now => end-ok | 1 | It works today, and the next engineer repeats the same risk. Example: the next change to sshd happens at night with no notes.
- Remove the second session habit => end-fail | 0 | The second-session habit is what saved you. Example: dropping it makes the next typo an outage.

### end-win
end: win
text: Passwords are off, everyone uses keys, and a tested console path exists. The change shipped without an outage.
takeaway: Change remote-access settings with a session left open, test the config, and keep a way in that does not depend on the thing you are changing.

### end-ok
end: ok
text: The server is safer and people are unhappy about the cost of the change. The process left gaps that cause friction.
takeaway: Security changes work best when users are prepared and a safe fallback exists.

### end-fail
end: fail
text: A broken config or a lockout needed console access or a rebuild. Hours were lost.
takeaway: Never cut the branch you are sitting on. Keep one working session until a second one proves the change.

