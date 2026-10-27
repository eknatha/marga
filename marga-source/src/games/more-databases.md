## The query that got slow after a release
module: databases
level: Intermediate
minutes: 7
lesson: databases/indexes-and-query-plans
summary: A page that loaded in 80 ms now takes 12 seconds. Learn query plans, indexes and safe fixes.
intro: After yesterday's release the orders page takes 12 seconds. The database CPU is at 95 percent. The release added a filter on the customer email.

### s1
text: The page was fast before the release and slow after it, and the database is under heavy load. Where do you start?
- Find the slow query in the slow query log or monitoring, and look at its plan with EXPLAIN => s2 | 2 | The plan shows how the database finds rows. Example: EXPLAIN shows a sequential scan over 8 million rows for WHERE email = ....
- Add more CPUs => s2 | 1 | It hides the problem and costs money. Example: the query still scans every row.
- Restart the database => s2 | 0 | It drops connections and clears caches, making things worse. Example: the cold cache makes the page even slower.

### s2
text: The plan shows a full scan on the orders table because there is no index on email. What is the fix?
- Create an index on the column, built without locking writes where the database supports it => s3 | 2 | An index lets the database jump to the rows. Example: CREATE INDEX CONCURRENTLY idx_orders_email ON orders (email) in PostgreSQL.
- Index every column => end-fail | 0 | Indexes slow writes and use space. Example: inserts become much slower.
- Cache the page for a day => s3 | 1 | The first request is still slow and data goes stale. Example: customers see old orders.

### s3
text: Creating the index on a busy table takes ten minutes. What is the safe way?
- Use the online or concurrent option, watch the load, and do it in a quiet period => s4 | 2 | A normal index build can block writes. Example: a concurrent build lets orders continue while the index is built.
- Run a plain CREATE INDEX at peak => s4 | 0 | It can lock the table for writes. Example: checkout fails for ten minutes.
- Skip the index and rewrite the page => s4 | 1 | The query would still be slow elsewhere. Example: the report uses the same filter.

### s4
text: After the index exists, the plan still scans the table for some searches that use LOWER(email). Why?
- The function on the column prevents the index from being used; use an expression index or store normalised email => s5 | 2 | The index must match the expression. Example: CREATE INDEX ON orders (lower(email)).
- The index is corrupt => end-fail | 0 | Not likely. Example: other queries use it.
- The table is too big for an index => s5 | 1 | Indexes work on big tables. Example: millions of rows are normal.

### s5
text: The page is fast again. How do you avoid this next time?
- Check query plans in testing with realistic data, and add alerts on query time and CPU => end-win | 2 | Test on data sized like production. Example: a staging database with 8 million rows shows the scan before release.
- Trust that small tables stay small => end-ok | 1 | Tables grow. Example: a query that is fine at 10,000 rows hurts at 8 million.
- Ban new filters => end-fail | 0 | Features need filters. Example: the product team is blocked.

### end-win
end: win
text: The index was added safely, the plan uses it, and tests with realistic data catch slow queries before release.
takeaway: Read the plan, add the right index safely, and test with data the size of production.

### end-ok
end: ok
text: The page is fast again, though safety checks are still missing.
takeaway: Add plan checks to your release process.

### end-fail
end: fail
text: Hardware was added or the database was restarted, and the real problem remained.
takeaway: Throwing resources at a missing index only delays the problem.

## The migration that locked the table
module: databases
level: Advanced
minutes: 7
lesson: databases/safe-schema-migrations
summary: A schema change blocks the orders table and the site freezes. Learn locks, safe patterns and recovery.
intro: At 11:00 a migration adds a NOT NULL column with a default to the 200 million row orders table. Within seconds the application hangs and connections pile up.

### s1
text: The site is frozen and the migration is running. What do you do?
- Find the blocking session and cancel the migration, so locks are released => s2 | 2 | Stop the cause. Example: pg_cancel_backend or kill the session ID that holds the ALTER TABLE lock.
- Wait, it must finish eventually => s2 | 0 | It can take an hour. Example: checkout is down the whole time.
- Restart the application servers => s2 | 1 | The application waits on the same lock. Example: new connections hang too.

### s2
text: The migration is cancelled and the site recovers. What was the likely problem?
- The change took a lock that blocked reads and writes on a huge table while it rewrote it => s3 | 2 | Some operations rewrite the table. Example: adding a column with a volatile default rewrites 200 million rows under an exclusive lock.
- The database is too small => end-fail | 0 | Size matters less than the pattern. Example: a bigger server still blocks.
- Network latency => s3 | 1 | The lock is inside the database. Example: the network was fine.

### s3
text: The site is back and the team still needs the new column on this very large table. How do you add the column safely?
- Add the column as nullable, backfill in small batches, then add the constraint in a separate step => s4 | 2 | Small steps keep locks short. Example: ALTER TABLE orders ADD COLUMN channel text; then update 10,000 rows at a time; then add the NOT NULL check.
- Do the same migration at night => s4 | 1 | It reduces the number of users hurt and still locks. Example: night orders from other time zones fail.
- Drop the table and recreate it => s4 | 0 | It destroys data. Example: orders are gone.

### s4
text: During the backfill, replicas fall behind. What do you do?
- Slow the batches, watch replication lag, and pause if lag passes a limit => s5 | 2 | Replication needs room. Example: sleep 200 ms between batches and stop at 10 seconds of lag.
- Speed up the batches => end-fail | 0 | Lag grows and failover becomes unsafe. Example: replicas are minutes behind.
- Turn off replication => s5 | 1 | You lose your safety net. Example: a primary failure loses data.

### s5
text: What belongs in the process for future migrations?
- Review migrations for locks, test on a copy of production size, set lock timeouts and have a rollback plan => end-win | 2 | A lock timeout makes the migration fail instead of freezing the site. Example: SET lock_timeout = '3s' stops the ALTER TABLE if it cannot get the lock quickly.
- Trust the developer => end-ok | 1 | Even experts miss lock behaviour. Example: a one-line migration looks harmless.
- Freeze schema changes forever => end-fail | 0 | The product must evolve. Example: no new features.

### end-win
end: win
text: The column was added in safe steps, replicas stayed healthy, and every migration now has a lock timeout and a test on production-size data.
takeaway: Schema changes are production changes. Keep locks short, work in batches and watch replication.

### end-ok
end: ok
text: The site recovered and the change was completed, though the review process is still informal.
takeaway: Make lock checks and timeouts standard.

### end-fail
end: fail
text: The site stayed frozen or data was damaged.
takeaway: A migration on a big table needs a plan, not hope.

