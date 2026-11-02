## The zone that went dark
module: cloud
level: Advanced
minutes: 7
lesson: cloud/high-availability-and-disaster-recovery
summary: One availability zone fails and part of the product goes with it. Decide what to do now and what to change.
intro: At 10:12 one availability zone in your region becomes unreachable. Half of your web servers and the primary database are in it.

### s1
text: A zone is down. What is your first priority?
- Confirm the scope on the provider status and your own metrics, then shift traffic to healthy zones => s2 | 2 | Confirm what is affected, then move traffic away. Example: The load balancer health checks mark the zone unhealthy, and capacity in two other zones takes over.
- Wait for the provider to fix it => s2 | 1 | Waiting is sometimes right, but you can protect users now. Example: Users see errors for the hour the provider needs.
- Rebuild everything in a new region at once => end-fail | 0 | A big move during an incident adds risk. Example: A rushed rebuild misses data and configuration.

### s2
text: The primary database was in the failed zone. What do you do?
- Promote the replica in another zone after checking replication lag against your recovery point => s3 | 2 | Promotion is the planned failover; lag tells you what you might lose. Example: Lag is 2 seconds, within the agreed 5 second recovery point.
- Wait for the old primary to return => s3 | 1 | It may return, but you cannot be sure when. Example: The zone stays down for three hours.
- Restore last night backup => s3 | 0 | You would lose a day of data when a replica exists. Example: All of today orders vanish.

### s3
text: Capacity in the remaining zones is tight. What helps?
- Scale out in the healthy zones and shed low-priority work => s4 | 2 | Protect the core by making room and trimming extras. Example: Autoscaling adds nodes while batch reports are paused.
- Do nothing, hope it holds => s4 | 0 | Overload turns a partial failure into a full one. Example: Latency climbs until the remaining servers fall over.
- Disable health checks to avoid flapping => s4 | 0 | You would send traffic to broken servers. Example: Users hit servers that are down.

### s4
text: After recovery, what change makes the next zone failure routine?
- Run enough capacity to lose one zone, test failover regularly and keep replicas in other zones => end-win | 2 | You prove resilience by practising it. Example: A quarterly game day turns off one zone in staging and checks the failover.
- Add a note to the wiki => end-ok | 1 | Documentation helps, but untested plans fail. Example: The note describes a step that no longer works.
- Move everything into one big zone => end-fail | 0 | It removes the redundancy. Example: The next fault takes down everything.

### end-win
end: win
text: Traffic moved to healthy zones, the database was promoted within its recovery point, and regular zone drills make the next one routine.
takeaway: Design for losing a zone, then practise losing one.

### end-ok
end: ok
text: Service was restored, but the design was not tested before the incident.
takeaway: Practise failover. Review the lesson and try the game again.

### end-fail
end: fail
text: Panic changes made the outage longer. Read each choice explanation to see why.
takeaway: Move traffic and fail over by plan.

## The function that charged twice
module: cloud
level: Intermediate
minutes: 6
lesson: cloud/serverless
summary: A serverless function retried after a timeout and charged some customers twice. Make it idempotent.
intro: Finance reports 140 duplicate charges from last night. The payment function timed out on some calls and the queue delivered the messages again.

### s1
text: Duplicate charges appeared. What is the likely mechanism?
- The function timed out after charging, and the queue redelivered the message => s2 | 2 | At-least-once delivery means a message can be handled again. Example: The charge succeeded but the function timed out before acknowledging the message.
- The payment provider is faulty => s2 | 0 | The provider processed two valid requests. Example: Two distinct requests were sent.
- Customers clicked twice => s2 | 1 | Possible, but the pattern follows timeouts. Example: The duplicates match timeout timestamps.

### s2
text: What do you do for the affected customers?
- Refund the duplicates, tell the customers and record what happened => s3 | 2 | Fix the harm first and be open about it. Example: A script lists duplicate charges by order id and refunds one of each pair.
- Wait to see who complains => end-fail | 0 | Customers lose trust. That does not deal with the real cause. Example: Complaints arrive over weeks.
- Refund everyone from last night => s3 | 1 | It overcorrects and costs money. Example: Customers without duplicates are refunded twice.

### s3
text: How do you prevent double processing? Choose the move you would make next.
- Make the handler idempotent with an order-based key checked before charging => s4 | 2 | A key makes repeats harmless. Example: The function stores the payment key first and skips the charge if it exists.
- Increase the timeout only => s4 | 1 | It reduces the frequency but not the cause. Example: A slower provider still times out on busy days.
- Disable retries => s4 | 0 | You would lose messages. That does not deal with the real cause. Example: A temporary error loses orders.

### s4
text: What else makes failures visible? Choose the move you would make next.
- Alert on duplicate keys, dead-letter queue depth and timeouts, and test redelivery => end-win | 2 | You find the problem before finance does. Example: A test sends the same message twice and expects one charge.
- Check the invoice at month end => end-fail | 0 | Too late. That does not deal with the real cause. Example: Problems pile up for weeks.
- Rely on customers to report => end-ok | 1 | Slow and costly. It helps only in part. Example: A few report, many do not.

### end-win
end: win
text: The handler is idempotent, customers were refunded and redelivery is tested.
takeaway: Assume messages arrive more than once.

### end-ok
end: ok
text: The duplicates are refunded, but redelivery is still not tested.
takeaway: Test the retry path. Review the lesson and try the game again.

### end-fail
end: fail
text: Customers were left to find the problem themselves.
takeaway: Fix the harm and the design. Review the lesson and try the game again.

