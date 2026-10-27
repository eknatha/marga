## The cleanup script that deleted too much
module: bash
level: Intermediate
minutes: 6
lesson: bash/safe-automation
summary: A nightly cleanup script removed files it should not have. Contain the damage, find the bug and make the script safe.
intro: At 07:30 you are on call. The data team reports that the folder of daily reports on the shared server is empty. A cleanup script runs from cron at 03:00 and is the main suspect.

### s1
text: Reports from the last month are missing from /srv/reports. The cron job runs /opt/scripts/cleanup.sh every night. What do you do first?
- Disable the cron job so it cannot run again, then investigate => s2 | 2 | Stopping further damage comes first, and disabling a job is easy to reverse. Example: crontab -e and a leading # on the cleanup line, or 'systemctl disable --now cleanup.timer', stops tonight's run in seconds and can be undone by removing the #.
- Run the script again to see what it does => end-fail | 0 | Running a suspect destructive script on a damaged system can destroy even more. Example: Re-running the cleanup script on the damaged folder can remove what is left of the reports, since you still do not know what path it uses.
- Edit the script right away to fix it => s3 | 1 | You may fix it, but if the cause is unclear you risk another mistake. Stop the job first. Example: Editing the script before knowing the cause is guessing. You could fix the symptom and miss that the config now sets REPORT_DIR to an empty value.

### s2
text: The cron job is disabled. You open the script. The key line is: rm -rf $BASE_DIR/$SUBDIR/* where BASE_DIR and SUBDIR come from a config file that was changed yesterday. What do you check next?
- Read the config file and the script log for what the variables held => s4 | 2 | You need to know what the variables were last night to confirm the cause. Example: cat /etc/cleanup.conf shows REPORT_DIR= (empty) after last week's edit, and the script log shows 'removing /*' as the working path.
- Ask the data team to recreate the reports => s3 | 0 | You cannot recreate them until you know what happened and whether it could happen again. Example: The data team cannot rebuild a month of reports until you can tell them the cause is fixed. Otherwise tomorrow night the same job deletes them again.
- Assume it is a cron fault => s3 | 0 | Cron ran the job as set. The problem is more likely in what the script did. Example: crontab -l shows the job ran at 02:00 exactly as scheduled. Cron only starts commands, so the script's contents are the place to look.

### s3
text: Time is passing and the data team is waiting. You still do not know what the variables contained. How do you proceed?
- Look at the config change and the log => s4 | 2 | The facts are in the config history and the log. Example: The file dates are enough here: 'ls -l /etc/cleanup.conf' shows a change yesterday at 17:40, and the log shows what the script removed after that time.
- Restore a backup immediately, without understanding => s5 | 1 | Restoring is useful, but if the script runs again the data is lost again. Example: Restoring last night's backup brings the reports back, but if the job is still enabled, 02:00 the next night the same rm deletes them again.

### s4
text: The log shows: removing /srv/reports//*. The SUBDIR variable was renamed in the config, so the script used an empty value. Combined with the missing quotes, the pattern covered the whole reports folder. What is the lesson for the script?
- Quote variables, check that they are not empty, and run with set -u so unset variables stop the script => s6 | 2 | These three habits would have prevented this failure. Example: Use rm -rf "${REPORT_DIR:?}"/old and set -u, so an empty REPORT_DIR stops the script with an error instead of expanding to rm -rf /old or worse.
- Add more logging only => s6 | 1 | Logging helps with investigation but does not prevent the deletion. Example: Logging 'deleting $dir' would have shown the bad path in the morning, but the files were already gone by then.
- Nothing needs to change, the config was wrong => end-fail | 0 | The script was unsafe: a wrong config should never be able to delete everything. Example: Blaming the config misses that one empty variable was able to wipe everything. A safe script treats a bad value as a reason to stop.

### s5
text: You restored last night's backup of /srv/reports and the files are back. The data team can work. The script is still disabled. What next?
- Find the cause in the script and fix it before re-enabling => s4 | 2 | Understand and fix the cause first. Example: The log shows 'rm -rf /srv/reports/' ran with an empty subfolder name, so the fix is to refuse an empty name and test the path exists before deleting.
- Re-enable the job, since the data is back => end-fail | 0 | The same bug will delete the reports again tonight. Example: If the job is turned back on at 18:00 with the bug still there, the 02:00 run deletes the restored reports again.

### s6
text: You rewrite the line to check the variables, add a dry run and a maximum number of files to delete. How do you test it before turning it on?
- Run it with the dry run option against a copy of the folder and read the list => s7 | 2 | A dry run on a copy shows what would be deleted without risk. Example: cp -r /srv/reports /tmp/reports-copy and then run 'cleanup.sh --dry-run' on the copy prints 'would delete 4812 files', which is far more than expected, so you caught the bug.
- Test it on the real folder => end-fail | 0 | Testing a destructive script on real data is how this incident started. Example: Running the changed script on /srv/reports directly is the same action that caused the incident. A mistake costs the real data again.

### s7
text: The dry run lists only files older than 30 days. You enable the job again. What else do you put in place?
- A check in the script that refuses to run if the target path is shorter than a minimum or equals the base folder, and a backup before deleting => end-win | 2 | Extra guards and a backup make a second mistake much less costly. Example: Add [ "$dir" = / ] and a minimum path length check, and run tar czf backup.tgz before deleting, so even a wrong config removes only old files that you can restore.
- Nothing else, the script is fixed => end-ok | 1 | The script is better, but one more config error could still cause damage without guards. Example: Without guards, a typo such as REPORT_DIR=/srv in the config can still delete a lot, because the fixed script trusts whatever path it is given.

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
