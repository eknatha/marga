## The cache that stampeded the database
module: system-design
level: Advanced
minutes: 7
lesson: system-design/caching-without-stampedes
summary: A popular cache key expired and thousands of requests hit the database at once. Prevent stampedes.
intro: At 12:00 a hot product page key expires. In one second 8,000 requests miss the cache and the database falls over.

### s1
text: The database collapsed when one key expired. What happened?
- Many requests missed together and each recomputed the value from the database => s2 | 2 | A cache stampede. Example: 8,000 simultaneous misses became 8,000 identical queries.
- The database was too small only => s2 | 1 | It was a symptom, not the trigger. Example: A bigger database would also be hammered.
- The cache was broken => s2 | 0 | It worked as designed. That does not deal with the real cause. Example: It expired on schedule.

### s2
text: How do you stop the immediate overload? Choose the move you would make next.
- Shed or throttle load, restore the cache value and let one request refill it => s3 | 2 | Reduce the pile-on and refill once. Example: Rate limiting the page lets the database recover while the key is repopulated.
- Restart the database => end-fail | 0 | It loses warm caches. That does not deal with the real cause. Example: Recovery takes longer.
- Add more clients => s3 | 0 | More load. That does not deal with the real cause. Example: Worse stampede.

### s3
text: What design prevents this? Choose the move you would make next.
- Single-flight or locking so one request recomputes, plus jittered expiry and serving slightly stale data => s4 | 2 | Coalesce and spread. Example: Random plus or minus 10 percent on TTL avoids synchronised expiry.
- Set TTL to 1 second => s4 | 0 | More misses. That does not deal with the real cause. Example: More database load.
- Disable caching => s4 | 1 | It removes the benefit. It helps only in part. Example: The database always takes full load.

### s4
text: How do you verify it? Choose the move you would make next.
- Load test hot-key expiry, watch hit ratio and database concurrency, and alert on spikes in misses => end-win | 2 | Test the failure mode. Example: A test expires the key under load and checks the database sees one query.
- Trust the design on paper => end-ok | 1 | Not enough. It helps only in part. Example: A bug in the lock appears in production.
- Wait for the next spike => end-fail | 0 | Reactive. That does not deal with the real cause. Example: The next outage hits.

### end-win
end: win
text: One request refilled the key, expiries were jittered and the failure mode was load tested.
takeaway: Coalesce misses and spread expiry.

### end-ok
end: ok
text: The stampede is handled, but not yet verified.
takeaway: Load test the expiry. Review the lesson and try the game again.

### end-fail
end: fail
text: Restart or extra load deepened the outage.
takeaway: Protect the database first. Review the lesson and try the game again.

## The retry storm
module: system-design
level: Advanced
minutes: 7
lesson: system-design/queues-retries-and-idempotency
summary: A short outage grows into a long one because clients retry aggressively. Design retries that heal.
intro: A dependency has a 30 second blip. Clients retry three times immediately and the blip turns into a 20 minute overload.

### s1
text: The dependency recovered, but load stays high. Why?
- Retries multiply traffic, so recovering servers are overwhelmed again => s2 | 2 | Retries amplify load. Example: Three retries from every client means up to four times the traffic.
- Clients are malicious => s2 | 0 | Normal retry logic is the cause. That does not deal with the real cause. Example: They are ordinary callers.
- The dependency is permanently broken => s2 | 1 | It recovered but is swamped. It helps only in part. Example: Health checks pass briefly.

### s2
text: What do you do right now? Choose the move you would make next.
- Reduce incoming load with limits or a circuit breaker so the dependency can recover => s3 | 2 | Give it room. This is the strongest move. Example: Cut traffic to 30 percent, then ramp up.
- Add more retries to get through => end-fail | 0 | Worse. That does not deal with the real cause. Example: More overload.
- Restart the dependency repeatedly => s3 | 1 | It resets warm state. It helps only in part. Example: Recovery restarts from zero.

### s3
text: What retry policy is safe? Choose the move you would make next.
- Exponential backoff with jitter, a retry budget, a cap on attempts and idempotent requests => s4 | 2 | Spread and limit retries. Example: Wait 100 ms, 200 ms, 400 ms with random jitter, at most 3 tries.
- Retry instantly forever => s4 | 0 | Storm. That does not deal with the real cause. Example: Overload persists.
- Never retry => s4 | 1 | Transient errors become failures. Example: A brief blip drops requests.

### s4
text: How do you make retries harmless? Choose the move you would make next.
- Make operations idempotent with request ids so repeated calls do not duplicate work => end-win | 2 | Safe to repeat. Example: The server stores the request id and returns the first result.
- Hope duplicates are rare => end-fail | 0 | They happen. That does not deal with the real cause. Example: Double orders appear.
- Disable timeouts => end-ok | 1 | Hangs grow. It helps only in part. Example: Calls wait forever.

### end-win
end: win
text: You shed load, introduced backoff with jitter and a budget, and made operations idempotent.
takeaway: Retries are load too. Review the lesson and try the game again.

### end-ok
end: ok
text: The storm ended, but retry safety is partial.
takeaway: Add idempotency. Review the lesson and try the game again.

### end-fail
end: fail
text: More retries or restarts prolonged the outage.
takeaway: Reduce load first. Review the lesson and try the game again.

## The two leaders
module: system-design
level: Advanced
minutes: 7
lesson: system-design/quorum-leaders-and-split-brain
summary: After a network partition, two nodes both believed they were the leader and accepted writes. Prevent split brain.
intro: A partition separates a three-node cluster. The old leader keeps accepting writes while a new one is elected on the other side.

### s1
text: Two nodes both accept writes. What is this called?
- Split brain, where two leaders diverge => s2 | 2 | The two sides disagree. Example: Both sides record different updates to the same key.
- A normal failover => s2 | 0 | Normal failover has one leader. That does not deal with the real cause. Example: Data diverges.
- A slow disk => s2 | 0 | Unrelated. That does not deal with the real cause. Example: Disks are fine.

### s2
text: What do you do first? Choose the move you would make next.
- Stop writes on the side without a majority, keep the majority side serving, and preserve both logs for reconciliation => s3 | 2 | Limit divergence and keep evidence. Example: The one-node side is fenced and set read-only.
- Let both continue => end-fail | 0 | Divergence grows. That does not deal with the real cause. Example: Merging gets harder.
- Delete one side data => s3 | 1 | You may lose valid writes. It helps only in part. Example: Customers lose orders.

### s3
text: How does the design prevent two leaders?
- Require a majority quorum for leadership and writes, with leader leases and fencing tokens => s4 | 2 | Only one side can have a majority. Example: A three-node cluster needs two votes, so the isolated node cannot lead.
- Let any node declare itself leader => s4 | 0 | That causes it. That does not deal with the real cause. Example: Two leaders appear.
- Use two nodes only => s4 | 1 | Two nodes cannot form a safe majority. Example: A partition stalls or splits.

### s4
text: How do you resolve the diverged data? Choose the move you would make next.
- Compare logs, apply a defined conflict rule or manual review and record what was decided => end-win | 2 | Reconcile deliberately. Example: Writes on the minority side are replayed if they do not conflict.
- Pick a side at random => end-fail | 0 | Data may be lost. That does not deal with the real cause. Example: Valid orders vanish.
- Ignore differences => end-ok | 1 | Inconsistent data remains. It helps only in part. Example: Customers see different values.

### end-win
end: win
text: The minority was fenced, quorum rules prevent two leaders and divergence was reconciled with a defined rule.
takeaway: A leader needs a majority. Review the lesson and try the game again.

### end-ok
end: ok
text: Writes stopped, but reconciliation was ad hoc.
takeaway: Define conflict rules. Review the lesson and try the game again.

### end-fail
end: fail
text: Letting both sides continue made the data diverge.
takeaway: Fence the minority. Review the lesson and try the game again.

