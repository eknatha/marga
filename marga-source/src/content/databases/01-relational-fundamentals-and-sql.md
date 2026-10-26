---
title: Relational databases and SQL for operators
minutes: 15
summary: Understand tables, keys and relationships, and read and write the SQL that operators use to inspect data, check sizes and find trouble.
---

Almost every service you will run keeps its important data in a database. You do not need to design schemas all day, but you must read a query, understand what a table holds and know which commands are safe on a live system.

## What you will learn

- Tables, rows, primary keys and foreign keys
- SELECT, JOIN, GROUP BY and filtering
- Safe habits for UPDATE and DELETE
- Operator queries: sizes, counts and running sessions

## The relational model

A **table** holds rows with the same columns. A **primary key** identifies each row. A **foreign key** points at a row in another table and lets the database enforce that the link is valid.

```sql
CREATE TABLE customers (
  id    bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name  text NOT NULL
);

CREATE TABLE orders (
  id          bigserial PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES customers (id),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

Constraints (`NOT NULL`, `UNIQUE`, `CHECK`, `REFERENCES`) put the rules in the database, where every client has to obey them, not in each application.

## Reading data

```sql
SELECT c.name, count(*) AS orders, sum(o.total_cents) / 100.0 AS revenue
FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.created_at >= now() - interval '30 days'
GROUP BY c.name
HAVING count(*) > 5
ORDER BY revenue DESC
LIMIT 10;
```

- `WHERE` filters rows before grouping, `HAVING` filters groups after
- `JOIN` combines rows from two tables on a condition
- `LIMIT` protects you from pulling a million rows into your terminal

## Changing data safely

```sql
BEGIN;
SELECT count(*) FROM orders WHERE created_at < '2020-01-01';
DELETE FROM orders WHERE created_at < '2020-01-01';
-- check the row count reported matches your expectation, then:
COMMIT;   -- or ROLLBACK;
```

Habits that prevent disasters:

- Run the matching `SELECT` first and compare the count
- Use a transaction so you can `ROLLBACK`
- Never run `UPDATE` or `DELETE` without a `WHERE` clause. Many clients can be set to refuse this.
- Do large changes in small batches so locks and logs stay small
- Take a backup or snapshot before a risky change

## Operator queries (PostgreSQL)

```sql
SELECT pg_size_pretty(pg_database_size(current_database()));

SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;

SELECT pid, state, now() - query_start AS running_for, left(query, 60) AS query
FROM pg_stat_activity
WHERE state <> 'idle'
ORDER BY running_for DESC;
```

These answer three everyday questions: how big is it, what is taking space, and what is running now. Other engines have equivalents, such as `information_schema` tables and `SHOW PROCESSLIST` in MySQL.

## Using the command line

```bash
psql "host=db1.example.com dbname=shop user=readonly" -c "SELECT count(*) FROM orders;"
psql -h db1.example.com -U readonly shop -f report.sql
```

Use a read-only account for investigation. Inside `psql`, `\dt` lists tables, `\d orders` describes one, and `\x` switches to a readable vertical layout.

```predict
Q: You run DELETE FROM orders; without a WHERE clause inside a transaction and notice immediately. What do you do?
???
Run ROLLBACK before committing. Nothing is permanent until COMMIT, so the rows return. If you had run it without a transaction in autocommit mode, only a backup or point-in-time recovery would bring them back.
> That is why risky statements go inside BEGIN.
```

```diagram
title: Where a query's data comes from
node: app | Application or psql | 0 | 1 | Sends SQL over a network connection. | An over-privileged account can change or delete anything.
node: parse | Parse and plan | 1 | 1 | The database checks syntax and chooses how to run it. | A bad plan makes a simple query slow.
node: store | Tables and indexes | 2 | 1 | Rows are read from memory or disk. | Cache misses turn queries into disk reads.
node: wal | Write-ahead log | 3 | 1 | Changes are logged before they are acknowledged. | A full log disk stops all writes.
edge: app | parse
edge: parse | store
edge: store | wal
```

## Incident: the delete without a WHERE

> **Incident:** An engineer ran a cleanup query in a production console. The WHERE clause was cut off when pasting, and every row in a customer table was deleted.

```console
$ psql shop -c "DELETE FROM customers"
DELETE 1840223
```

The team restored from a point-in-time backup, losing twelve minutes of writes to reconcile by hand. Afterwards they required read-only consoles by default, a break-glass role for writes, transactions with a row-count check, and reviews for production data fixes.

## Common mistakes

- Investigating with a read-write account
- Running unbounded queries on a busy primary
- Forgetting that DDL such as `DROP TABLE` may not roll back in every engine
- Selecting `*` on wide tables during an incident

```quiz
Q: What does a primary key do?
- Encrypts the table :: Keys are not encryption.
+ Uniquely identifies each row
- Joins two databases :: It lives inside one table.
- Speeds up every query automatically :: It helps lookups by key only.
> Keys give each row a stable identity that other tables can reference.

Q: What is the difference between WHERE and HAVING?
- None :: They apply at different stages.
+ WHERE filters rows before grouping, HAVING filters groups after aggregation
- HAVING is for deletes :: It is for aggregated results.
- WHERE works only on text :: It works on any column.
> Use WHERE to reduce the rows first, then HAVING for conditions on counts and sums.

Q: Why run the matching SELECT before a DELETE?
- It is required by SQL :: It is a safety habit.
+ To confirm how many rows will be affected before changing anything
- To lock the table :: A plain SELECT does not lock for writes.
- To speed up the delete :: It does not.
> A surprising count is a clear stop signal.

Q: Which account should you use for investigation by default?
- The superuser :: Too much power for looking around.
+ A read-only role
- The application account :: It can write.
- Any account with a short password :: Security matters.
> Read-only access limits accidents.
```

```cards
Primary key :: A column or set of columns that uniquely identifies a row
Foreign key :: A column that must match a row in another table
Constraint :: A rule enforced by the database, such as NOT NULL or CHECK
Transaction :: A group of statements that commit or roll back together
pg_stat_activity :: View showing sessions and running queries in PostgreSQL
```
