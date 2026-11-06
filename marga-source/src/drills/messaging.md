## Queue grows steadily
level: junior
A work queue gains 500 messages a minute.

```text
$ rabbitmqctl list_queues name messages_ready consumers
orders  184000  0
```
? What is the first thing to check?
+ Why there are zero consumers, then restore them
- Add more disk
- Change the exchange type
- Purge the queue
why: A backlog with no consumers means the workers are down or disconnected. Purging would delete work that needs doing.

## Duplicate charges
level: junior
A customer is charged twice.

```text
consumer: charge ok order=4411
consumer: restarted
consumer: charge ok order=4411
```
? Which fix addresses the cause?
+ Make the handler idempotent with an idempotency key or a processed-ids table
- Use a faster broker
- Delete the topic
- Disable acknowledgements
why: At-least-once delivery repeats messages after a crash. The handler must treat a repeat as a no-op.

## Poison message loop
level: mid
One message blocks the queue.

```text
consumer: JSONDecodeError (restart 480)
queue orders: ready 52000 unacked 1
basic.reject requeue=true
```
? What should happen to the bad message?
+ Reject without requeue to a dead-letter queue and alert on it
- Requeue it forever
- Raise prefetch to 10000
- Restart the broker
why: Requeue puts the same message back at the front. A dead-letter queue lets good messages continue and keeps the bad one for review.

## Lag on one partition
level: mid
Only partition 1 is far behind.

```text
orders 0  lag 12
orders 1  lag 350000
orders 2  lag 8
```
? What does this suggest?
+ A slow or stuck consumer or a hot key on partition 1
- The whole cluster is down
- Retention is too long
- Too many partitions
why: Lag on a single partition points to its consumer or its data, not to cluster-wide trouble.

## Records lost after a crash
level: senior
Topic and table counts differ although lag is zero.

```text
enable.auto.commit=true
CURRENT-OFFSET 5000 LOG-END 5000 LAG 0
select count(*) from invoices;  4200
```
? What is the likely cause?
+ Offsets were committed before processing finished, so a crash skipped records
- The broker lost the data
- Compression is off
- The topic is compacted
why: Auto-commit can mark records as read before they are handled. Commit after the work is saved, and make handling idempotent.

## Renamed field breaks reports
level: senior
Revenue reads zero after a deploy.

```text
producer schema v7: total
consumer schema v6: amount (got null)
```
? What would have prevented this?
+ A schema registry compatibility check in CI and an expand-then-contract change
- A bigger partition count
- Faster consumers
- A new topic name every week
why: Renaming a field is not backward compatible. Add the new field, migrate readers, then remove the old one.
