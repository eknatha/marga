## The alert storm from one full disk
module: aiops
level: Advanced
minutes: 7
lesson: aiops/alert-correlation-and-noise-reduction
summary: A shared volume fills up and two hundred alerts arrive in ten minutes. Find the cause fast.
intro: The pager starts at 03:12. Within ten minutes you have two hundred alerts from thirty services, and customers are failing to check out.

### s1
text: What is the first useful thing to do with the wall of alerts?
- Group them by service and dependency to find the shared component that is also unhealthy => s2 | 2 | Look for the common cause. Example: Twenty-nine services depend on one storage volume that shows 100 percent usage.
- Open each alert one by one => s2 | 0 | Far too slow. Example: Reading two hundred alerts takes more time than the outage allows.
- Silence everything => end-fail | 0 | You would lose real signals. Example: Muting all alerts hides the disk alarm that matters.

### s2
text: The grouped view shows storage-vol-7 at 100 percent. What next?
- Free space safely or expand the volume, and confirm that dependants recover => s3 | 2 | Fix the source, not the symptoms. Example: Old snapshots are removed and usage drops to 82 percent, then error rates fall.
- Restart all thirty services => s3 | 0 | It would not free the disk. Example: Services restart and fail again on writes.
- Page thirty teams separately => s3 | 1 | They are echoes of one fault. Example: Thirty people join a call to look at a problem they cannot fix.

### s3
text: How do you reduce noise for the next incident?
- Add stable labels, grouping by service and cluster, and inhibition rules that fold dependants under the source alert => s4 | 2 | Group and inhibit. Example: When VolumeFull fires, service error alerts for that volume are inhibited.
- Raise every threshold => s4 | 1 | You would miss real faults. Example: Slow error growth now goes unnoticed for an hour.
- Delete the alerts => s4 | 0 | You would lose coverage. That does not deal with the real cause. Example: The next disk fault has no warning.

### s4
text: How do you check that the change helped?
- Track alerts per incident and time to identify the cause against your baseline => end-win | 2 | Measure the effect. Example: Median alerts per incident falls from 71 to 12 over the next quarter.
- Count total alerts only => end-ok | 1 | It misses quality. Example: Total volume falls because a rule was broken, not because noise improved.
- Ask people if it feels better => end-fail | 0 | Opinion is not data. Example: Two engineers disagree and no numbers settle it.

### end-win
end: win
text: Grouping exposed one full volume, the fix was applied there, and inhibition and measurement now keep storms short.
takeaway: Group by dependency, fix the source, measure noise.

### end-ok
end: ok
text: The outage ended, but noise reduction was not measured.
takeaway: Track alerts per incident. Review the lesson and try the game again.

### end-fail
end: fail
text: Silencing or restarting everything delayed the real fix.
takeaway: Find the shared source first. Review the lesson and try the game again.

## The automation that made it worse
module: aiops
level: Advanced
minutes: 7
lesson: aiops/safe-automation-and-auto-remediation
summary: A cleanup rule runs with an empty variable and starts deleting data. Contain it and make automation safe.
intro: At 14:05 a cleanup automation triggers on a disk alert. A minute later several services report missing files.

### s1
text: What is the first action? Choose the move you would make next.
- Use the kill switch to stop all automation, then confirm no further deletions are running => s2 | 2 | Stop the damage first. Example: The global switch disables the rule and the deletion count stops rising.
- Let it finish, it is only cleaning => end-fail | 0 | It is deleting needed files. Example: Another ten gigabytes of live data disappear in the next minute.
- Restart the services that complain => s2 | 1 | They cannot recover missing files. Example: The services restart and report the same missing files.

### s2
text: How do you recover? Choose the move you would make next.
- Restore the deleted data from backup or snapshot, verify the services, and keep the rule disabled until fixed => s3 | 2 | Restore, verify, keep it off. Example: The latest snapshot is mounted and files are restored and checked.
- Recreate the files by hand => s3 | 0 | Not reliable. That does not deal with the real cause. Example: Guessing file contents risks silent errors.
- Ignore the missing files => s3 | 0 | Services still fail. That does not deal with the real cause. Example: Customers keep seeing errors.

### s3
text: What was missing in the rule? Choose the move you would make next.
- Preconditions such as a non-empty target and a delete scope limited to a named directory, with a dry run first => s4 | 2 | Validate before you act. Example: The rule aborts because the target path is empty.
- Nothing, it was bad luck => s4 | 0 | Guards would have stopped it. Example: A simple empty check prevents the action.
- A faster server => s4 | 0 | Speed is not the problem. That does not deal with the real cause. Example: A faster run only deletes sooner.

### s4
text: What controls do you add for all automation?
- Action limits, cooldowns, verification with escalation, audit logs and a tested kill switch, with approval for risky actions => end-win | 2 | Layered controls. Example: A rule may act twice an hour, verifies the result and pages a person on failure.
- Trust but never review => end-fail | 0 | No oversight. That does not deal with the real cause. Example: Nobody reads the audit log for months.
- Automate more actions at once => end-ok | 1 | It raises risk without controls. Example: Ten new rules start with no limits.

### end-win
end: win
text: The kill switch stopped the damage, data was restored from a snapshot, and every rule now has checks, limits, verification and an audit trail.
takeaway: Stop first, restore, then add guardrails.

### end-ok
end: ok
text: The damage was contained, but controls are still partial.
takeaway: Add limits, verification and approvals.

### end-fail
end: fail
text: Letting automation continue or acting by hand made the damage larger.
takeaway: Use the kill switch first. Review the lesson and try the game again.

## The rollback nobody needed
module: aiops
level: Intermediate
minutes: 7
lesson: aiops/debugging-and-investigating-aiops-output
summary: An assistant blames a deploy for slow checkout and offers a rollback. Test the claim before acting.
intro: During a slow-checkout alert an AI assistant says the last deploy is the cause and proposes a rollback. You are the on-call engineer and you approve actions.

### s1
text: What do you do first? Choose the move you would make next.
- Ask which evidence the claim rests on and open it => s2 | 2 | A claim with no source is a guess. Example: The cited graph shows errors starting before the deploy time.
- Approve the rollback because it sounds sure => end-fail | 0 | Confidence is not evidence. Example: The rollback runs and the slowness continues.
- Ignore the assistant completely => s2 | 1 | You lose a useful hypothesis. Example: You spend longer searching alone for the same lead.

### s2
text: How do you test the claim? Choose the move you would make next.
- Compare the error rate before and after the deploy time and line it up with other changes => s3 | 2 | A cause must come before its effects. Example: Errors began twelve minutes before the deploy, so the deploy cannot be the cause.
- Check only the deploy log => s3 | 1 | It confirms the deploy happened, not that it caused anything. Example: The log shows a deploy and nothing about its effect.
- Wait for more alerts => s3 | 0 | Waiting adds harm and no information. Example: Customers keep seeing slow checkouts.

### s3
text: Other signals show many database waits. What next?
- Treat locks as a new hypothesis and test it with lock and query metrics => s4 | 2 | Follow the data, one hypothesis at a time. Example: The lock metric shows 41 sessions waiting on one table.
- Roll back anyway to be safe => s4 | 0 | A rollback has its own risk and does not address locks. Example: The rollback adds ten minutes of disruption.
- Restart the database => s4 | 1 | It may clear locks but risks more harm and hides the cause. Example: The restart drops connections and the locks return.

### s4
text: How do you use this afterwards? Choose the move you would make next.
- Record the wrong suggestion, the evidence and the outcome, and keep a person approving actions => end-win | 2 | Records show which suggestions to trust and justify limits. Example: The review lists three misses and the team keeps the tool read-only.
- Give the tool write access to save time => end-fail | 0 | Trust has not been earned yet. Example: The tool rolls back a healthy release on its own the next week.
- Turn the tool off without a review => end-ok | 1 | You lose the value and the lesson. Example: The same noise returns with no better process.

### end-win
end: win
text: The claim was tested, the real cause was found in the database, and a person stayed in charge of every action.
takeaway: Treat AI output as a hypothesis and test it.

### end-ok
end: ok
text: The rollback was avoided, but the miss was not recorded for later tuning.
takeaway: Record misses as evidence. Review the lesson and try the game again.

### end-fail
end: fail
text: An unchecked rollback added disruption while the real cause stayed in place.
takeaway: Never act on a claim you have not tested.

