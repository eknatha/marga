## The idle transaction
module: db-ops
level: Advanced
minutes: 7
lesson: db-ops/database-incidents-and-runbooks
summary: Queries pile up behind one forgotten transaction. Recover without losing data.
intro: The checkout database has hundreds of waiting queries and rising latency. CPU is low. The application is retrying and making it worse.

### s1
text: What do you check first? Choose the best next step.
- Active queries, wait events and the longest transactions => s2 | 2 | Blockers show in pg_stat_activity. Example: One transaction has been idle for six hours.
- Restart the database => s2 | 1 | Loses sessions and may not fix it. Example: The blocker returns after restart.
- Add more connections => end-fail | 0 | Makes the queue longer. Example: The limit is reached.

### s2
text: How do you find the blocker? Choose the best next step.
- Use pg_blocking_pids to see who blocks the waiting sessions => s3 | 2 | Find the cause, not the victims. Example: One pid blocks 300 sessions.
- Kill random sessions => s3 | 1 | Could break other work. Example: A good job is stopped.
- Wait => end-fail | 0 | Latency grows. Example: The incident lengthens.

### s3
text: What action is safe? Choose the best next step.
- Cancel the blocker query first, then terminate if needed after checking it => s4 | 2 | Least harmful first. Example: Cancelling releases the lock and the queue drains.
- Delete the table => s4 | 1 | Destructive. Example: Data is lost.
- Kill everything => end-fail | 0 | Disruptive. Example: All customers see errors.

### s4
text: How do you prevent a repeat? Choose the best next step.
- Set idle in transaction timeouts, alert on transaction age and update the runbook => end-win | 2 | Detect and limit this class of problem. Example: An alert fires at ten minutes.
- Tell the team to be careful => end-ok | 1 | No control. Example: It happens again.
- Ignore it => end-fail | 0 | Repeats. Example: Next month the same.

### end-win
end: win
text: The blocker was found, cancelled safely and a timeout, alert and runbook update prevent a repeat.
takeaway: Find the blocker, act with the least harm and add timeouts and alerts.

### end-ok
end: ok
text: Service recovered but a repeat is still possible.
takeaway: Add timeouts and alerts. Review the lesson and try again.

### end-fail
end: fail
text: A destructive action or a wait made the incident worse.
takeaway: Never act on the victims or destroy data. Review the lesson and try again.
