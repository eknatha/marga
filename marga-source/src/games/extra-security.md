## The vulnerability list of four thousand
module: security
level: Intermediate
minutes: 6
lesson: security/vulnerability-management-and-security-incidents
summary: A scan reports four thousand findings. Decide what to fix first and how to keep up.
intro: The first company-wide scan lists 4,000 findings. Management asks when everything will be fixed.

### s1
text: Four thousand findings. Where do you start?
- Rank by internet exposure, known exploitation and importance of the system => s2 | 2 | Risk is more than a score. Example: A critical flaw on an internet-facing server that is exploited in the wild goes first.
- Fix them in alphabetical order => end-fail | 0 | Order unrelated to risk wastes effort. Example: A low-risk finding is fixed while a critical one waits.
- Sort only by severity score => s2 | 1 | Better than nothing but ignores context. Example: A critical score on an isolated test host outranks a high one on the payment system.

### s2
text: A fix needs downtime on an important system. What do you do?
- Agree a maintenance window and add temporary controls until then => s3 | 2 | Reduce risk now and fix properly soon. Example: A firewall rule blocks the vulnerable port until Saturday.
- Skip it because downtime is inconvenient => s3 | 0 | The risk remains. That does not deal with the real cause. Example: The flaw is exploited next week.
- Fix it in the middle of the day => s3 | 1 | It may cause an outage. Example: Users are hit by an unplanned restart.

### s3
text: How do you stop the list growing again? Choose the move you would make next.
- Patch regularly, scan images in the pipeline and set fix times by severity => s4 | 2 | Prevention and routine beat heroic cleanups. Example: Critical in 7 days, high in 30, tracked on a dashboard.
- Run a scan once a year => s4 | 0 | Too rare. That does not deal with the real cause. Example: The list returns to four thousand.
- Ignore low findings forever => s4 | 1 | Some matter in combination. Example: Several low issues chain into a breach.

### s4
text: What do you report to management? Choose the move you would make next.
- Risk reduced, time to fix and what is outstanding, not just a count => end-win | 2 | Show progress in terms of risk. Example: Exposed critical findings fell from 40 to 3 in a month.
- A promise to fix everything in a week => end-fail | 0 | Unrealistic. That does not deal with the real cause. Example: Trust is lost when it slips.
- Only the total count => end-ok | 1 | A number without context misleads. Example: The count rises with a better scanner.

### end-win
end: win
text: Findings are ranked by real risk, deadlines are set by severity and progress is reported as risk reduced.
takeaway: Prioritise by risk and build a routine.

### end-ok
end: ok
text: The worst items are handled, but the routine is incomplete.
takeaway: Set fix times and report risk.

### end-fail
end: fail
text: Effort was wasted and the worst risks stayed open.
takeaway: Rank before you fix. Review the lesson and try the game again.

## The backups the attacker deleted
module: security
level: Advanced
minutes: 7
lesson: security/ransomware-resilience-and-recovery
summary: Attackers encrypted production data and then deleted the backups. Plan a recovery that still works.
intro: On Saturday morning files are encrypted and a ransom note appears. The backup console shows all online backups deleted.

### s1
text: Files are encrypted and online backups are gone. What is the first priority?
- Isolate affected systems to stop the spread and start the incident process => s2 | 2 | Contain first and preserve evidence. Example: Network isolation stops encryption from reaching more servers.
- Pay the ransom immediately => end-fail | 0 | No guarantee, and it funds attackers. Example: Some payers receive nothing back.
- Shut everything down and walk away => s2 | 1 | It stops harm but loses volatile evidence and time. Example: Memory evidence is lost and recovery is delayed.

### s2
text: Online backups were deleted using stolen admin credentials. What survives?
- Immutable or offline copies in a separate account with different credentials => s3 | 2 | Separate, immutable copies resist the same attacker. Example: Object-lock backups in another account cannot be deleted for 30 days.
- Nothing, rebuild from memory => s3 | 0 | Data cannot be remembered. That does not deal with the real cause. Example: Months of records are lost.
- Backups on the same domain => s3 | 1 | They share the attacker access. Example: The attacker has those credentials too.

### s3
text: Before restoring, what must you do? Choose the move you would make next.
- Find and remove the attacker access and clean systems so the restore is not hit again => s4 | 2 | Restoring into a compromised environment repeats the loss. Example: Reset credentials, rebuild from known good images and check for persistence.
- Restore at once to save time => s4 | 0 | The attacker re-encrypts. That does not deal with the real cause. Example: Data is encrypted again.
- Restore into the same servers unchanged => s4 | 1 | They may still be compromised. Example: Malware survives on the old servers.

### s4
text: How do you prepare for the next attempt?
- Keep immutable backups with separate access, rehearse restores and limit admin credentials => end-win | 2 | Resilience comes from isolation and practice. Example: Quarterly restore tests measure how long recovery really takes.
- Buy more backup disks in the same network => end-ok | 1 | The same compromise can reach them. Example: New disks are encrypted too.
- Hope it does not happen again => end-fail | 0 | Attacks repeat. That does not deal with the real cause. Example: The same weakness is exploited.

### end-win
end: win
text: Isolation limited the spread, immutable copies allowed recovery and a clean rebuild prevented a repeat.
takeaway: Isolate, recover from immutable copies and clean before restoring.

### end-ok
end: ok
text: Data is recovered, but weaknesses remain.
takeaway: Prepare for repeat attacks. Review the lesson and try the game again.

### end-fail
end: fail
text: Paying or rushing made things worse. Read each choice explanation to see why.
takeaway: Contain, recover safely and improve.

