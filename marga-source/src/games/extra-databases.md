## The query that scanned ten million rows
module: databases
level: Intermediate
minutes: 6
lesson: databases/indexes-and-query-plans
summary: A page slows to eight seconds after the table grows. Read the query plan and fix it.
intro: The orders page loads in 8 seconds. The orders table grew from 100 thousand to 10 million rows.

### s1
text: The query is slow after growth. What do you look at first?
- The query plan, to see whether it scans the whole table => s2 | 2 | The plan shows how the database finds rows. Example: EXPLAIN ANALYZE shows a sequential scan over 10 million rows.
- Add more memory straight away => s2 | 1 | It may help a little but hides the cause. Example: The scan is still ten million rows.
- Rewrite the page in another language => s2 | 0 | The slow part is the database. That does not deal with the real cause. Example: The page is still slow.

### s2
text: The plan shows a sequential scan on customer_id. What is the fix?
- Create an index on customer_id, built concurrently on a live system => s3 | 2 | An index lets the database jump to matching rows. Example: CREATE INDEX CONCURRENTLY avoids blocking writes.
- Add an index on every column => s3 | 0 | Too many indexes slow writes and use space. Example: Inserts become slower for no gain.
- Create the index normally during peak => s3 | 1 | It can block writes while it builds. Example: Checkout fails for a few minutes.

### s3
text: The index exists but the plan ignores it. Why?
- The query wraps the column in a function or the types differ, so the index cannot be used => s4 | 2 | The predicate must match the index. Example: WHERE lower(email) needs an index on lower(email).
- Indexes stop working over time => s4 | 0 | They do not. That does not deal with the real cause. Example: Nothing is wrong with the index.
- The database is broken => s4 | 0 | Usually the query shape is the cause. Example: Dropping the database wastes a day.

### s4
text: How do you keep this from returning? Choose the move you would make next.
- Review plans for new queries, watch slow query logs and keep statistics fresh => end-win | 2 | Plans change as data grows. Example: A slow query alert shows anything over one second.
- Wait for users to report => end-ok | 1 | Too late. It helps only in part. Example: Complaints arrive after the damage.
- Never add data => end-fail | 0 | Data grows by nature. That does not deal with the real cause. Example: The business cannot stop.

### end-win
end: win
text: The plan showed a scan, a suitable index fixed it and slow query monitoring keeps it from coming back.
takeaway: Read the plan before you tune.

### end-ok
end: ok
text: It is faster now, but monitoring is missing.
takeaway: Watch slow queries. Review the lesson and try the game again.

### end-fail
end: fail
text: The wrong fix wasted time and hurt writes.
takeaway: Index what the plan needs. Review the lesson and try the game again.

## The column that froze checkout
module: databases
level: Advanced
minutes: 7
lesson: databases/safe-schema-migrations
summary: An ALTER TABLE froze checkout for five minutes. Plan a migration that does not block.
intro: At 2pm a migration adds a column with a default to a 200 million row table. Checkout stops responding.

### s1
text: Checkout is frozen during a migration. What do you do now?
- Find the blocking session and cancel the migration, then confirm the queue drains => s2 | 2 | Stop the lock holder to release the queue. Example: pg_stat_activity shows the ALTER waiting behind a long query while others wait behind it.
- Restart the database => end-fail | 0 | A restart adds more downtime and risk. Example: Recovery takes ten minutes.
- Wait to see if it finishes => s2 | 1 | It could take much longer. It helps only in part. Example: The lock queue keeps growing.

### s2
text: Why did a small change block everything?
- The ALTER needed an exclusive lock and waited behind a long query, so every new query queued behind it => s3 | 2 | A waiting lock blocks later requests too. Example: A reporting query held a lock for four minutes.
- The column was too large => s3 | 0 | The size of the change was not the cause. Example: The column is tiny.
- The disk was full => s3 | 0 | No evidence of that. That does not deal with the real cause. Example: Disk usage was normal.

### s3
text: How do you add the column safely next time?
- Set a lock timeout, add the column without a heavy rewrite and backfill in small batches => s4 | 2 | Short locks and small steps limit the risk. Example: SET lock_timeout = 2s makes the ALTER fail fast instead of queueing.
- Run it at peak, quickly => s4 | 0 | Peak raises the harm. That does not deal with the real cause. Example: Customers see errors.
- Rewrite the whole table in one go => s4 | 1 | Rewrites hold locks for long. It helps only in part. Example: The table is unavailable.

### s4
text: How do you plan the rollout? Choose the move you would make next.
- Use expand and contract: add, deploy code that handles both, backfill, then remove the old => end-win | 2 | Compatible steps allow a safe rollback. Example: Release 1 adds a nullable column, release 2 reads it, release 3 enforces it.
- Change schema and code together => end-ok | 1 | Failure leaves both broken. Example: A rollback of code fails on the new schema.
- Skip testing on a copy => end-fail | 0 | Surprises appear in production. Example: The lock time was never measured.

### end-win
end: win
text: You cancelled the blocker, used a lock timeout, backfilled in batches and rolled out in compatible steps.
takeaway: Short locks, small batches, compatible steps.

### end-ok
end: ok
text: Checkout recovered, but the migration plan still has risks.
takeaway: Use expand and contract. Review the lesson and try the game again.

### end-fail
end: fail
text: A restart or heavy rewrite made it worse.
takeaway: Stop the blocker, do not restart.

