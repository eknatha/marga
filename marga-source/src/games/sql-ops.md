## The query that got slow overnight
module: sql-ops
level: Advanced
minutes: 7
lesson: sql-ops/reading-explain-and-finding-slow-queries
summary: An orders page went from 80 ms to 9 seconds. Find the slow statement, read the plan and fix it without guessing.
intro: At 09:00 the orders page times out. The database CPU is high and nothing was deployed. A teammate wants to add an index on every column of the orders table.

### s1
text: Where do you start? Think about what the evidence shows.
- Find the slowest statements with pg_stat_statements or the slow query log and look at one with EXPLAIN (ANALYZE, BUFFERS) => s2 | 2 | Evidence shows which statement matters and what the plan does. Example: pg_stat_statements shows one query with mean 8.7 s and 41,000 calls; EXPLAIN shows a sequential scan on 12 million rows.
- Add an index on every column of orders => s3 | 0 | Indexes cost writes and space and may not help this query. Example: Inserts slow down by 40 percent and the slow query still scans.
- Restart the database => s3 | 1 | A restart clears caches and makes things slower for a while. Example: The page is slower for ten more minutes while the cache warms up.

### s2
text: EXPLAIN shows a sequential scan on orders filtering by customer_id and status. Estimated rows 1, actual rows 480,000. What does that mean?
- The planner's statistics are stale or the filter is poorly estimated, so it picked a bad plan; run ANALYZE and consider an index on the filter columns => s4 | 2 | A large gap between estimated and actual rows points to wrong statistics or correlated columns. Example: ANALYZE orders updates the statistics, and CREATE INDEX CONCURRENTLY orders_cust_status ON orders (customer_id, status) gives an index scan.
- The database is too small => s3 | 1 | Hardware does not explain a wrong estimate. Example: Doubling the CPU leaves the plan unchanged.
- The ORM is broken so rewrite everything => s3 | 0 | A rewrite is far bigger than the problem. Example: Three weeks go on a migration for a one-index fix.

### s3
text: How do you add the index in production? Think about what the evidence shows.
- CREATE INDEX CONCURRENTLY outside peak time, then check the plan and the index size => s4 | 2 | Concurrent builds avoid long write locks. Example: The build takes six minutes, the plan switches to an index scan and the query takes 4 ms.
- CREATE INDEX at the busiest hour => end-fail | 0 | A normal build blocks writes to the table. Example: Orders cannot be placed for six minutes at lunchtime.
- Skip testing and hope => end-ok | 1 | It might work, but you cannot tell without checking. Example: Nobody confirms whether the planner uses the new index.

### s4
text: What stops the next slow query surprising you?
- Keep pg_stat_statements, alert on query latency percentiles and review plans for new critical queries => end-win | 2 | You find regressions early with data. Example: A dashboard shows the top ten statements by total time and alerts at p95 above 500 ms.
- Nothing; the page is fast => end-ok | 1 | The next regression arrives the same way. Example: Another table grows past the threshold in six months.
- Index every table now => end-fail | 0 | Blanket indexing hurts writes and storage. Example: Write latency doubles and disk use grows 30 percent.

### end-win
end: win
text: The query is at 4 ms, the index is justified by evidence and slow-query monitoring is in place.
takeaway: Measure first, read the plan, change one thing and check again.

### end-ok
end: ok
text: The page is fast, but nothing watches for the next regression.
takeaway: A fix without monitoring is a one-off.

### end-fail
end: fail
text: Writes are slower, storage has grown and the original query may still be slow.
takeaway: Guessing costs more than measuring.


## Connections exhausted at peak
module: sql-ops
level: Advanced
minutes: 7
lesson: sql-ops/connections-pooling-and-capacity
summary: The application starts failing with "too many connections" every afternoon. Fix it without raising the limit blindly.
intro: Every day at 15:00 the API returns errors: remaining connection slots are reserved. Max connections is 200 and the team proposes 2,000.

### s1
text: What do you look at first? Think about what the evidence shows.
- Who holds the connections: pg_stat_activity grouped by state and application => s2 | 2 | You need to see whether they are active or just idle. Example: pg_stat_activity shows 188 connections, 171 of them idle in transaction from one service.
- Raise max_connections to 2,000 => s3 | 0 | Each connection uses memory and adds contention; more is not faster. Example: The database runs out of memory at 1,400 connections and swaps.
- Restart the API => s3 | 1 | It clears the connections briefly and hides the cause. Example: Errors stop for 20 minutes and come back at the same load.

### s2
text: 171 connections are idle in transaction. What does that tell you?
- The application opens transactions and does not finish them, holding connections and sometimes locks => s4 | 2 | Idle in transaction is a code or pool problem, not a capacity problem. Example: A request begins a transaction, calls a slow external API and only then commits.
- PostgreSQL leaks connections => s3 | 0 | The server does what the client asks. Example: The client never sent COMMIT.
- The network is slow => s3 | 1 | That would not leave transactions open for minutes. Example: Ping to the database is 0.4 ms.

### s3
text: What is a good fix? Think about what the evidence shows.
- Keep external calls out of transactions, set idle_in_transaction_session_timeout and use a pooler with a sensible pool size => end-win | 2 | Fix the cause and add protection. Example: PgBouncer in transaction mode with 40 server connections serves 600 clients, and a 30 second timeout ends stuck sessions.
- Disable the timeout so nothing is killed => end-fail | 0 | Stuck sessions would hold slots forever. Example: The slots fill by noon instead of 15:00.
- Only add a pooler => end-ok | 1 | It helps, but long transactions still hold server connections. Example: The pool is exhausted by the same slow handler.

### s4
text: How do you prove it is solved? Think about what the evidence shows.
- Dashboards for connections by state and wait time for a free connection, plus a load test at twice peak => s4 | 2 | You see saturation before users do. Example: A graph of pool wait time stays under 5 ms during a test at 2x traffic.
- Wait and see tomorrow => end-ok | 1 | It may work, but you learn it slowly. Example: The failure returns on Friday during a sale.
- Close the ticket => end-fail | 0 | No evidence means no confidence. Example: The same page returns during the next campaign.

### end-win
end: win
text: Connections are used sparingly, stuck sessions are ended and pool wait time is visible.
takeaway: Capacity problems are often behaviour problems. Look at what holds connections.

### end-ok
end: ok
text: The incident calmed, but you cannot show why.
takeaway: Without evidence, success is luck.

### end-fail
end: fail
text: The limit was raised, memory ran out and the database became unstable.
takeaway: More connections rarely fix a design problem.


