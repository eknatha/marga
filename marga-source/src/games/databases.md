## The database that ran out of disk at 3 a.m.
module: databases
level: Advanced
minutes: 7
lesson: databases/debugging-database-problems
summary: The primary database stops accepting writes because its disk is full. Recover without losing data.
intro: You are on call. At 03:10 the shop cannot take orders. The primary PostgreSQL server reports it cannot write because the data disk is 100 percent full. A replica exists, and last night's backup is recent.

### s1
text: The server reports no space left on the data disk. What is your first move?
- Delete the oldest files in the pg_wal directory to free space => end-fail | 0 | Removing log files by hand can destroy crash recovery and replication. The database may never start again.
- Look at what is using the space without changing anything => s2 | 2 | Correct. Look before you act, so the fix matches the cause.
- Restart the database to see if it clears => s3 | 0 | A restart on a full disk may fail to start and hides evidence.

### s2
text: You find that the pg_wal directory holds 400 GB, and a replication slot named replica_old is inactive. What does that tell you?
- The slot is making the primary keep logs for a replica that is no longer reading them => s4 | 2 | Exactly. Inactive slots retain write-ahead logs indefinitely.
- The data tables are corrupted => s3 | 0 | The symptoms point at retained logs, not corruption.
- The backup job is writing there => s3 | 0 | Backups write elsewhere, and the slot is the clue.

### s3
text: You lost some time and the disk is still full. What do you do?
- Go back to inspecting disk usage and replication slots => s2 | 2 | Evidence first, then act on the cause.
- Drop the largest table to make space => end-fail | 0 | That destroys data to solve a space problem.

### s4
text: Before you drop the slot, you ask yourself whether it is safe. What is true?
- Yes, after confirming that replica_old was decommissioned and no consumer uses it => s5 | 2 | Check that nothing needs it, then drop it with the proper function.
- Yes, it is just a name, drop every slot to be sure => end-fail | 0 | Dropping an active slot can break a live replica.
- No, wait for a vendor to confirm => s5 | 1 | Cautious, but you know the replica was removed and writes are down.

### s5
text: You drop the slot. Space frees slowly as old logs are recycled. Writes resume. What next?
- Check replication to the live replica, disk trend and error rate, then add alerts on free space and slot lag => s6 | 2 | You confirm health and prevent a repeat.
- Go back to sleep, writes work again => end-ok | 1 | Service is back, but the cause is unguarded and the live replica was not checked.

### s6
text: In the morning review, what is the best lasting action?
- Add alerts, a checklist item to drop slots when removing replicas, and test the restore procedure => end-win | 2 | Alerts, process and practice make the next incident short or avoided entirely.
- Blame the engineer who removed the replica => end-ok | 0 | Blame does not stop it recurring.

### end-win
end: win
text: Orders flow again in under twenty minutes, no data was lost and the team now has alerts for the exact cause.
takeaway: Look first, fix the cause with the database's own commands, and leave guards behind.

### end-ok
end: ok
text: Service is restored, but the underlying risk is still there.
takeaway: Recovery is only half the job. Add detection and prevention before closing the incident.

### end-fail
end: fail
text: The database no longer starts cleanly, and you are restoring from last night's backup. Hours of orders are lost.
takeaway: Never delete files inside the data directory, and never destroy data to solve a space problem.
