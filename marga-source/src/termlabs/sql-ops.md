## A page takes nine seconds: add the right index
id: sq-slow-query-index
module: sql-ops
level: Intermediate
minutes: 12
lesson: sql-ops/indexes-that-help-and-indexes-that-hurt
engine: Simulated Linux shell with configuration files
summary: Read a slow query and its plan, then write a safe migration that adds the index the plan is asking for.
@@ story
The orders page went from 80 ms to 9 seconds as the table grew to 12 million rows. The slow query log and its EXPLAIN output are in the db folder. Write the migration file that fixes it. On a live table the index must be built without blocking writes.
@@ goals
- Read slow-query.log and plan.txt.
- Create migrations/20261103_orders_customer_idx.sql that adds an index on the filter column.
- Build it concurrently so writes are not blocked.
@@ hints
- `cat plan.txt` shows a Seq Scan with a Filter on customer_id and millions of rows removed.
- An index on orders (customer_id) lets the planner jump to the rows.
- `CREATE INDEX CONCURRENTLY orders_customer_id_idx ON orders (customer_id);` goes in the migration file.
@@ file /home/user/db/slow-query.log
# Time: 2026-11-03T09:12:44Z
# Query_time: 8.742  Rows_examined: 12000000  Rows_sent: 14
SELECT * FROM orders WHERE customer_id = 4821 ORDER BY created_at DESC LIMIT 20;

@@ file /home/user/db/plan.txt
 Limit  (cost=412345.00..412345.05 rows=20 width=88) (actual time=8701.1..8701.2 rows=14 loops=1)
   ->  Sort  (actual time=8701.1..8701.1 rows=14 loops=1)
         Sort Key: created_at DESC
         ->  Seq Scan on orders  (cost=0.00..412300.00 rows=14 width=88) (actual time=0.03..8690.4 rows=14 loops=1)
               Filter: (customer_id = 4821)
               Rows Removed by Filter: 11999986
 Execution Time: 8701.4 ms

@@ world
{"cwd": "/home/user/db"}
@@ checks
[
 {
  "t": "file",
  "path": "/home/user/db/migrations/20261103_orders_customer_idx.sql",
  "label": "the migration file exists"
 },
 {
  "t": "contains",
  "path": "/home/user/db/migrations/20261103_orders_customer_idx.sql",
  "label": "it creates the index on customer_id concurrently",
  "re": "CREATE INDEX CONCURRENTLY\\s+\\w+\\s+ON\\s+orders\\s*\\(\\s*customer_id"
 },
 {
  "t": "contains",
  "path": "/home/user/db/migrations/20261103_orders_customer_idx.sql",
  "label": "it does not use a blocking build",
  "re": "CREATE INDEX (?!CONCURRENTLY)",
  "not": true
 }
]
@@ explain
The plan shows the database reading all twelve million rows to return a handful, which is the sign of a missing index on the filter column. A normal CREATE INDEX blocks writes to the table while it builds. CONCURRENTLY takes longer but keeps the table usable. In a real database you would also check the new plan and the index size.
@@ solution
cat slow-query.log
cat plan.txt
mkdir -p migrations
echo 'CREATE INDEX CONCURRENTLY orders_customer_id_idx ON orders (customer_id);' > migrations/20261103_orders_customer_idx.sql
cat migrations/20261103_orders_customer_idx.sql


## Too many connections at peak
id: sq-connection-limit
module: sql-ops
level: Intermediate
minutes: 12
lesson: sql-ops/connections-pooling-and-capacity
engine: Simulated Linux shell with configuration files
summary: Six app replicas each open too many connections for a database limited to 100. Size the pools and end stuck sessions.
@@ story
Every afternoon the API fails with 'remaining connection slots are reserved'. PostgreSQL allows 100 connections. The app runs six replicas and each is configured with a pool of 40. Do the sum, set a pool size that fits with room to spare, and add a timeout so sessions stuck in a transaction cannot hold slots forever. Do not raise max_connections.
@@ goals
- Read postgresql.conf, app.env and the error log.
- Set DB_POOL_MAX so six replicas stay well under the limit (at most 15 each).
- Add idle_in_transaction_session_timeout to postgresql.conf and leave max_connections alone.
@@ hints
- Six replicas times 40 is 240, far above 100. Leave room for admin tools and replication.
- `sed -i 's/DB_POOL_MAX=40/DB_POOL_MAX=12/' app.env` changes the pool.
- `echo 'idle_in_transaction_session_timeout = 30s' >> postgresql.conf` adds the timeout.
@@ file /home/user/db/postgresql.conf
max_connections = 100
shared_buffers = 4GB

@@ file /home/user/db/app.env
APP_REPLICAS=6
DB_POOL_MAX=40
DB_HOST=db.internal

@@ file /home/user/db/error.log
2026-11-03 15:02:11 FATAL:  remaining connection slots are reserved for non-replication superuser connections
2026-11-03 15:02:12 FATAL:  remaining connection slots are reserved for non-replication superuser connections

@@ world
{"cwd": "/home/user/db"}
@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/db/app.env",
  "label": "each replica has a pool of at most 15",
  "re": "DB_POOL_MAX=([1-9]|1[0-5])\\s*$"
 },
 {
  "t": "contains",
  "path": "/home/user/db/postgresql.conf",
  "label": "a timeout ends stuck transactions",
  "re": "idle_in_transaction_session_timeout\\s*=\\s*\\d+(s|ms|min)"
 },
 {
  "t": "contains",
  "path": "/home/user/db/postgresql.conf",
  "label": "max_connections was not raised",
  "re": "max_connections\\s*=\\s*100\\s*$"
 }
]
@@ explain
Connections are a shared budget: replicas times pool size must stay under the server limit with headroom. More connections do not mean more speed, because the database can only run so many queries at once. A timeout on idle transactions stops one stuck handler from holding a slot, and a pooler such as PgBouncer lets many clients share a few server connections.
@@ solution
cat postgresql.conf
cat app.env
tail -3 error.log
sed -i 's/DB_POOL_MAX=40/DB_POOL_MAX=12/' app.env
echo 'idle_in_transaction_session_timeout = 30s' >> postgresql.conf
cat app.env
tail -2 postgresql.conf


## Too many app connections: configure the pooler
id: sq-pgbouncer-pool
module: sql-ops
level: Intermediate
minutes: 10
lesson: sql-ops/connections-pooling-and-capacity
engine: Simulated Linux shell with configuration files
summary: Set PgBouncer to transaction pooling with a small server pool.
@@ story
The database refuses new connections at the afternoon peak. The pooler config uses session pooling with 200 server connections per database. Switch to transaction pooling and a default pool size of 20.
@@ goals
- Read pgbouncer.ini and the error log.
- Set pool_mode to transaction.
- Set default_pool_size to 20.
@@ hints
- `cat errors.log` shows too many connections.
- Edit the two lines in pgbouncer.ini.
- `sed -i 's/pool_mode = session/pool_mode = transaction/; s/default_pool_size = 200/default_pool_size = 20/' pgbouncer.ini`
@@ world
{"cwd": "/home/user/db"}
@@ file /home/user/db/errors.log
FATAL: sorry, too many clients already
max_connections = 200, active = 200

@@ file /home/user/db/pgbouncer.ini
[pgbouncer]
pool_mode = session
default_pool_size = 200
max_client_conn = 2000

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/db/pgbouncer.ini",
  "label": "transaction pooling",
  "re": "pool_mode\\s*=\\s*transaction"
 },
 {
  "t": "contains",
  "path": "/home/user/db/pgbouncer.ini",
  "label": "small pool",
  "re": "default_pool_size\\s*=\\s*20\\s*$"
 }
]
@@ explain
Session pooling keeps a server connection for the whole client session, so it saves little. Transaction pooling lends one only while a transaction runs, so a few server connections serve thousands of clients.
@@ solution
cat errors.log
cat pgbouncer.ini
sed -i 's/pool_mode = session/pool_mode = transaction/; s/default_pool_size = 200/default_pool_size = 20/' pgbouncer.ini
cat pgbouncer.ini


## Replica lag caused by long reports
id: sq-replica-conflict
module: sql-ops
level: Advanced
minutes: 10
lesson: sql-ops/replication-lag-vacuum-and-day-two-operations
engine: Simulated Linux shell with configuration files
summary: Tune a replica so reports stop delaying replay.
@@ story
Reporting queries on the replica make it fall behind by minutes. Lower max_standby_streaming_delay to 30s so replay is not held back for long, and turn on hot_standby_feedback so cleanup on the primary waits for the reports.
@@ goals
- Read replica.conf and lag.log.
- Set max_standby_streaming_delay to 30s.
- Turn hot_standby_feedback on.
@@ hints
- `cat lag.log` shows replay waits for a query.
- Both settings live in replica.conf.
- `sed -i 's/max_standby_streaming_delay = 15min/max_standby_streaming_delay = 30s/; s/hot_standby_feedback = off/hot_standby_feedback = on/' replica.conf`
@@ world
{"cwd": "/home/user/db"}
@@ file /home/user/db/lag.log
replay delayed by long-running query on replica (14 min)
replica lag: 780 s

@@ file /home/user/db/replica.conf
hot_standby = on
max_standby_streaming_delay = 15min
hot_standby_feedback = off

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/db/replica.conf",
  "label": "delay is 30s",
  "re": "max_standby_streaming_delay\\s*=\\s*30s"
 },
 {
  "t": "contains",
  "path": "/home/user/db/replica.conf",
  "label": "feedback is on",
  "re": "hot_standby_feedback\\s*=\\s*on"
 }
]
@@ explain
The replica cancels or waits for queries that conflict with replay. A long delay setting lets reports run but lets lag grow. A short delay plus hot_standby_feedback keeps lag low and prevents cancellations, at the cost of some bloat on the primary.
@@ solution
cat lag.log
cat replica.conf
sed -i 's/max_standby_streaming_delay = 15min/max_standby_streaming_delay = 30s/; s/hot_standby_feedback = off/hot_standby_feedback = on/' replica.conf
cat replica.conf


## A hot table bloats faster than autovacuum runs
id: sq-autovacuum-hot-table
module: sql-ops
level: Advanced
minutes: 10
lesson: sql-ops/replication-lag-vacuum-and-day-two-operations
engine: Simulated Linux shell with configuration files
summary: Write a migration that makes autovacuum run earlier on a busy table.
@@ story
The sessions table has 80 million rows and is updated constantly. Autovacuum waits for 20 percent dead rows, which is 16 million, so the table bloats first. Write a migration that sets the scale factor to 0.01 for that table.
@@ goals
- Read bloat.txt.
- Create migrations/20261104_sessions_autovacuum.sql.
- Set autovacuum_vacuum_scale_factor = 0.01 on sessions.
@@ hints
- `cat bloat.txt` shows dead rows and the default scale factor.
- Use ALTER TABLE sessions SET (...).
- Write: ALTER TABLE sessions SET (autovacuum_vacuum_scale_factor = 0.01);
@@ world
{"cwd": "/home/user/db"}
@@ file /home/user/db/bloat.txt
table: sessions  live: 80000000  dead: 14500000
autovacuum_vacuum_scale_factor = 0.2 (default)
last autovacuum: 3 days ago

@@ checks
[
 {
  "t": "contains",
  "path": "/home/user/db/migrations/20261104_sessions_autovacuum.sql",
  "label": "the table setting is changed",
  "re": "ALTER TABLE\\s+sessions\\s+SET\\s*\\(\\s*autovacuum_vacuum_scale_factor\\s*=\\s*0\\.01"
 }
]
@@ explain
The default threshold is a fraction of the table, which is huge on a big table. A lower per-table scale factor makes vacuum run after fewer dead rows, so bloat stays small.
@@ solution
cat bloat.txt
mkdir -p migrations
printf "ALTER TABLE sessions SET (autovacuum_vacuum_scale_factor = 0.01);\n" > migrations/20261104_sessions_autovacuum.sql
cat migrations/20261104_sessions_autovacuum.sql

