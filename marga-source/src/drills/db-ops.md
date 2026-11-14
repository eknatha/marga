## Standby far behind
level: mid
Reads from the replica show old data.

```text
$ psql -c "select now()-pg_last_xact_replay_timestamp() as lag"
lag 00:14:12
```
? What do you check?
+ Network, replay load and long queries on the standby, then alert on lag
- Restart the primary
- Delete the standby
why: Lag means replay is behind; find what slows it.

## Restore never tested
level: mid
A restore fails during an incident.

```text
$ pgbackrest restore --stanza=main
ERROR: unable to find backup set
```
? What should have been done?
+ Scheduled restore drills with verification and alerts on backup age
- More disk
- A bigger server
why: Untested backups are only a hope.

## Connection errors after scale out
level: mid
New pods get too many clients errors.

```text
$ psql -c "show max_connections"
500
$ psql -c "select count(*) from pg_stat_activity"
498
```
? What is the fix?
+ Use PgBouncer in transaction mode and limit connections per app
- Raise max_connections to 5000
- Restart pods
why: Pooling reduces backend processes.

## Migration blocked traffic
level: mid
A new index froze writes.

```text
$ psql -c "select query, wait_event_type from pg_stat_activity where wait_event_type='Lock'"
create index orders_idx ...
```
? What should you use?
+ CREATE INDEX CONCURRENTLY with a lock timeout
- A faster server
- Run at noon
why: Concurrent builds avoid blocking writes.

## Redis evicting sessions
level: mid
Users are logged out under load.

```text
$ redis-cli config get maxmemory-policy
allkeys-lru
```
? What is the fix?
+ Separate sessions into an instance with noeviction and memory alerts
- Raise the TTL
- Restart Redis
why: Eviction suits caches, not primary data.

## Disk full on primary
level: senior
The database stops accepting writes.

```text
$ df -h /var/lib/postgresql
100%
$ du -sh pg_wal
380G
```
? What do you check first?
+ Inactive replication slots and failing archiving, never delete WAL by hand
- Delete files in pg_wal
- Reboot
why: Retained WAL from slots is a common cause.
