---
title: Cloud SQL, Spanner, BigQuery and Firestore
minutes: 13
summary: Choose between Cloud SQL, AlloyDB, Spanner, Firestore and BigQuery, and run Cloud SQL safely with high availability, backups and private connections.
---

Choosing the wrong database is expensive to reverse. A short map of what each Google Cloud database is good at, plus safe defaults for the common one, prevents most regret.

## What you will learn

- The database map
- Cloud SQL high availability and backups
- Connecting privately
- BigQuery cost control

## The map

| Need | Choose |
|---|---|
| Normal relational app | Cloud SQL (MySQL, PostgreSQL, SQL Server) |
| Heavy PostgreSQL, analytics mix | AlloyDB |
| Globally consistent relational, huge scale | Spanner |
| Documents, mobile and web | Firestore |
| Very high-throughput key-value | Bigtable |
| Analytics over large data | BigQuery |

## Cloud SQL safely

```console
$ gcloud sql instances create orders-db --database-version=POSTGRES_16 --tier=db-custom-4-16384 \
    --region=europe-west1 --availability-type=REGIONAL --network=prod-vpc --no-assign-ip \
    --backup-start-time=02:00 --enable-point-in-time-recovery
$ gcloud sql connect orders-db --user=app
```

**High availability** keeps a standby in another zone with automatic failover. **Backups plus point-in-time recovery** let you restore to a moment; practise a restore. Use **private IP**, and the **Cloud SQL Auth Proxy** or connectors for IAM-based encrypted connections. Add **read replicas** for read scaling, which are not a substitute for HA.

## BigQuery

BigQuery separates storage from compute and bills by data scanned (on-demand) or by reserved capacity. **Partition** tables by date, **cluster** by common filters, select only needed columns and use a dry run.

```console
$ bq query --dry_run --use_legacy_sql=false 'select user_id from logs.events where dt = "2026-11-05"'
Query successfully validated. This query will process 3.1 GB when run.
```

```diagram
title: Picking and protecting a database
node: app | Application | 0 | 1 | Connects privately with IAM auth. | Public IPs with passwords invite attacks.
node: sql | Cloud SQL HA | 1 | 0 | Primary plus standby in another zone. | Failover causes a brief connection drop. | store
node: bk | Backups and PITR | 2 | 0 | Restore to a point in time. | An untested restore is only a hope. | store
node: bq | BigQuery | 1 | 2 | Analytics on partitioned tables. | A query without a partition filter scans everything. | store
node: sp | Spanner or Firestore | 1 | 1 | Global scale and special models. | Used where Cloud SQL suffices, they cost more. | store
edge: app | sql
edge: sql | bk
edge: app | sp
edge: app | bq
```

## Incident: The expensive query

> **Incident:** A query with no partition filter scanned a huge table.

```console
$ bq show -j bqjob_r123
Total bytes processed: 48.2 TB
table: logs.events (not partitioned)
```

The table had no partitioning or required filter. The team partitioned by date, set require_partition_filter and added a per-user daily bytes limit.

## Common mistakes

- Read replicas used as high availability
- Public database IPs
- Restores never practised
- Select * and no dry run in BigQuery

```quiz
Q: What does Cloud SQL high availability provide?
+ Automatic failover to a standby
- Faster queries :: No.
- Free storage :: No.
- A bigger disk :: No.
> A standby in another zone.

Q: How does BigQuery on-demand pricing work?
+ By bytes scanned
- By hours running :: No.
- By tables :: No.
- By users :: No.
> Reduce data scanned.

Q: Which is for globally consistent relational scale?
+ Spanner
- Firestore :: No.
- Cloud Storage :: No.
- Cloud DNS :: No.
> Spanner is relational and global.

Q: What does a dry run show?
+ Bytes a query would process
- Results :: No.
- Users :: No.
- Disks :: No.
> Estimate before running.
```

```cards
Cloud SQL :: Managed MySQL, PostgreSQL and SQL Server
Spanner :: A globally consistent relational database
BigQuery :: A serverless data warehouse
PITR :: Restoring a database to a chosen moment
Partitioned table :: A table split by a column such as date
```
