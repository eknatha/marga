## The consumer group that never catches up
module: messaging
level: Intermediate
minutes: 7
lesson: messaging/kafka-lag-rebalances-and-capacity-in-operation
summary: Kafka consumer lag keeps growing although the cluster looks healthy. Find the real cause before adding hardware.
intro: At 14:00 the lag alert says the invoicer group is 18 minutes behind and rising. Brokers show no errors. Marketing has just launched a campaign, so traffic is higher than usual.

### s1
text: Lag is growing on the invoicer group. What do you check first?
- Whether the consumers are alive and how lag is spread across partitions => s2 | 2 | Alive consumers and the lag spread separate a consumer problem from a cluster problem. Example: kafka-consumer-groups --describe shows partition 1 with 350000 lag while the others have under 100.
- Add more partitions to the topic right away => s3 | 0 | New partitions change key mapping and do not help if a consumer is stuck. Example: After adding partitions, the stuck consumer is still stuck and new keys now hash to different partitions than before.
- Restart all brokers => end-fail | 0 | Brokers are healthy, and restarting all of them risks an outage. Example: Restarting three brokers at once drops partitions below the minimum in-sync replicas and producers get NotEnoughReplicasException.

### s2
text: Only one partition is far behind, and its consumer is running. What does that suggest?
- A slow or stuck consumer, or a hot key, on that partition => s4 | 2 | One partition behind points to its consumer or its data. Example: The consumer owning partition 1 logs a 40 second call to the tax service for every record.
- A broker disk problem across the whole cluster => s3 | 0 | A cluster-wide problem would show lag on many partitions. Example: Other partitions on the same broker have zero lag, which rules out a broker-wide disk issue.
- The topic retention is too short => s3 | 0 | Retention affects how long data is kept, not how fast it is read. Example: Retention is seven days and lag is 18 minutes, so no data is at risk of deletion.

### s3
text: Time has passed and lag is still rising. What is the sensible reset?
- Go back to the per-partition lag and the consumer logs for the lagging partition => s2 | 2 | Re-anchor on evidence. Example: The describe output and the log for the consumer on partition 1 are the two things that show where time is spent.
- Delete the consumer group to start fresh => end-fail | 0 | Deleting the group loses committed offsets and can replay or skip data. Example: With auto.offset.reset=latest the group restarts at the end and 18 minutes of invoices are never created.

### s4
text: The slow call is to a downstream tax service that has become slow. What is the best action?
- Add a timeout and bounded retries, and scale consumers only if the downstream can take more load => s5 | 2 | Bound the wait so one dependency cannot stall a partition. Example: A 2 second timeout with two retries and a dead-letter topic keeps records moving instead of waiting 40 seconds each.
- Scale to 30 consumers on a 6 partition topic => end-fail | 0 | Consumers beyond the partition count sit idle, and more calls load the slow service further. Example: 24 consumers have no partition assigned and the tax service gets no relief.

### s5
text: Lag is falling after the change. How do you finish the incident well?
- Alert on minutes of lag with a trend, add a dead-letter path, and record the dependency in a runbook => end-win | 2 | Alerts and design changes prevent a repeat. Example: An alert fires when lag in minutes exceeds 5 and keeps rising for 10 minutes, and the runbook lists the tax service as the first thing to check.
- Close the incident because lag is dropping => end-ok | 1 | Service recovers, but the cause is unguarded. Example: The same slow call returns next week and nobody is paged until lag reaches 40 minutes.
- Blame the campaign team for the traffic => end-fail | 0 | Blame does not make the consumer more resilient. Example: The next campaign brings the same slowdown because the timeout was never added.

### end-win
end: win
text: Lag falls to near zero, the slow dependency is bounded, and an alert on minutes of lag warns early next time.
takeaway: Find the lagging partition, bound slow calls, and alert on lag as time.

### end-ok
end: ok
text: Lag recovers, but the same weakness will cause the next incident.
takeaway: Close the loop with alerts and a runbook, not only the quick fix.

### end-fail
end: fail
text: Records are skipped or replayed, or consumers sit idle, and lag stays high.
takeaway: Never delete a group or add consumers beyond partitions to fix lag.
