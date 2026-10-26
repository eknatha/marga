## The cleanup script that deleted too much
module: bash
level: Intermediate
minutes: 6
lesson: bash/safe-automation
summary: A nightly cleanup script removed files it should not have. Contain the damage, find the bug and make the script safe.
intro: At 07:30 you are on call. The data team reports that the folder of daily reports on the shared server is empty. A cleanup script runs from cron at 03:00 and is the main suspect.

### s1
text: Reports from the last month are missing from /srv/reports. The cron job runs /opt/scripts/cleanup.sh every night. What do you do first?
- Disable the cron job so it cannot run again, then investigate => s2 | 2 | Stopping further damage comes first, and disabling a job is easy to reverse.
- Run the script again to see what it does => end-fail | 0 | Running a suspect destructive script on a damaged system can destroy even more.
- Edit the script right away to fix it => s3 | 1 | You may fix it, but if the cause is unclear you risk another mistake. Stop the job first.

### s2
text: The cron job is disabled. You open the script. The key line is: rm -rf $BASE_DIR/$SUBDIR/* where BASE_DIR and SUBDIR come from a config file that was changed yesterday. What do you check next?
- Read the config file and the script log for what the variables held => s4 | 2 | You need to know what the variables were last night to confirm the cause.
- Ask the data team to recreate the reports => s3 | 0 | You cannot recreate them until you know what happened and whether it could happen again.
- Assume it is a cron fault => s3 | 0 | Cron ran the job as set. The problem is more likely in what the script did.

### s3
text: Time is passing and the data team is waiting. You still do not know what the variables contained. How do you proceed?
- Look at the config change and the log => s4 | 2 | The facts are in the config history and the log.
- Restore a backup immediately, without understanding => s5 | 1 | Restoring is useful, but if the script runs again the data is lost again.

### s4
text: The log shows: removing /srv/reports//*. The SUBDIR variable was renamed in the config, so the script used an empty value. Combined with the missing quotes, the pattern covered the whole reports folder. What is the lesson for the script?
- Quote variables, check that they are not empty, and run with set -u so unset variables stop the script => s6 | 2 | These three habits would have prevented this failure.
- Add more logging only => s6 | 1 | Logging helps with investigation but does not prevent the deletion.
- Nothing needs to change, the config was wrong => end-fail | 0 | The script was unsafe: a wrong config should never be able to delete everything.

### s5
text: You restored last night's backup of /srv/reports and the files are back. The data team can work. The script is still disabled. What next?
- Find the cause in the script and fix it before re-enabling => s4 | 2 | Understand and fix the cause first.
- Re-enable the job, since the data is back => end-fail | 0 | The same bug will delete the reports again tonight.

### s6
text: You rewrite the line to check the variables, add a dry run and a maximum number of files to delete. How do you test it before turning it on?
- Run it with the dry run option against a copy of the folder and read the list => s7 | 2 | A dry run on a copy shows what would be deleted without risk.
- Test it on the real folder => end-fail | 0 | Testing a destructive script on real data is how this incident started.

### s7
text: The dry run lists only files older than 30 days. You enable the job again. What else do you put in place?
- A check in the script that refuses to run if the target path is shorter than a minimum or equals the base folder, and a backup before deleting => end-win | 2 | Extra guards and a backup make a second mistake much less costly.
- Nothing else, the script is fixed => end-ok | 1 | The script is better, but one more config error could still cause damage without guards.

### end-win
end: win
text: The reports are restored, and the cleanup script now quotes variables, stops on unset values, refuses suspicious paths and supports a dry run. A second mistake would not do the same harm.
takeaway: Destructive scripts need quoted variables, set -u, path checks, dry runs and backups. Disable the job first, then investigate.

### end-ok
end: ok
text: The immediate problem is fixed and the data is back. The script has no guard against another unexpected value, so a similar mistake is still possible.
takeaway: Fixing the bug is good, but defence in depth makes the next mistake harmless.

### end-fail
end: fail
text: The cleanup ran again or a risky action destroyed more data. The team spent the next days recovering files and trust.
takeaway: Stop the damage, find the cause, test on a copy, and never run a destructive script on real data to find out what it does.
