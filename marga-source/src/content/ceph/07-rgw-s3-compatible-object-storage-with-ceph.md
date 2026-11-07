---
title: RGW: S3 compatible object storage
minutes: 12
summary: Run the RADOS Gateway for S3 and Swift, create users and buckets, understand realms, zones and multisite replication, and manage bucket lifecycles.
---

With RGW you can offer an S3 compatible service from your own data centre. It is common for backups, artifacts, data lakes and applications that must keep data on site.

## What you will learn

- How RGW stores objects
- Users, keys, buckets and policies
- Index sharding and lifecycle
- Multisite replication

## How it works

RGW is a stateless HTTP gateway. It translates S3 requests into RADOS operations on several pools: one for object data, others for bucket indexes, logs and metadata. Run at least two RGW daemons behind a load balancer such as HAProxy and terminate TLS there or in RGW.

```bash
radosgw-admin user create --uid=backup --display-name="Backup app"
aws --endpoint-url https://s3.example.com s3 mb s3://nightly
aws --endpoint-url https://s3.example.com s3 cp db.dump s3://nightly/
```

## Users and policies

Each application gets its own user, access key and secret key, with quotas. Bucket policies and IAM style policies control access. Never share the admin user's keys with applications.

```diagram
title: S3 requests through RGW
node: app | S3 client | 0 | 1 | Signs requests with an access key. | Keys in code leak through repositories. | client
node: lb | Load balancer + TLS | 1 | 0 | Spreads requests and ends HTTPS. | A single balancer is a single point of failure. | edge
node: rgw | RGW daemons | 2 | 1 | Translate S3 into RADOS operations. | Too few daemons limit throughput. | service
node: idx | Bucket index pool | 3 | 0 | Maps object names to locations. | Huge buckets need index shards. | store
node: obj | Data pool | 3 | 2 | Holds object data, often erasure coded. | Small objects waste space on EC. | store
edge: app | lb
edge: lb | rgw
edge: rgw | idx
edge: rgw | obj
```

## Index sharding and lifecycle

Listing a bucket reads its index. A bucket with millions of objects needs several index shards, and dynamic resharding adds them automatically. Lifecycle rules expire or transition objects by age, which keeps temporary data from filling the cluster.

## Multisite

A **realm** contains **zone groups**, which contain **zones**. Each zone is its own cluster. Metadata and data replicate between zones asynchronously, so a second site holds a copy for disaster recovery or local reads. Replication is eventually consistent, so applications must tolerate a short lag.

## Incident: A bucket too big to list

> **Incident:** Listing a bucket timed out after months of backups.

```console
$ radosgw-admin bucket limit check
"bucket": "nightly", "num_objects": 410000000, "num_shards": 11, "fill_status": "OVER 100%"
$ radosgw-admin bucket reshard add --bucket=nightly --num-shards=211
queued for resharding
```

The bucket index had far too few shards for the number of objects, so listing and writes slowed. Resharding it to more shards, and turning on dynamic resharding, restored normal speed.

## Common mistakes

- Sharing the admin credentials
- One RGW daemon with no load balancer
- Never setting lifecycle rules on temporary buckets
- Expecting multisite to be instant

```quiz
Q: What does RGW provide?
+ S3 and Swift APIs
- Block devices :: No.
- File metadata :: No.
- Quorum :: No.
> It is the object gateway.

Q: What does a zone group contain?
+ Zones
- Monitors :: No.
- OSD disks :: No.
- Pods :: No.
> Zones sit inside zone groups.

Q: Why shard a bucket index?
+ To keep listing and writes fast
- To encrypt data :: No.
- To add monitors :: No.
- To change DNS :: No.
> Large indexes slow operations.

Q: How does multisite replicate?
+ Asynchronously between zones
- Instantly with no lag :: No.
- Only by tape :: No.
- Through the MDS :: No.
> Applications must tolerate lag.
```

```cards
RGW :: The Ceph Object Gateway
Realm :: The top level container for multisite
Zone :: One Ceph cluster in a multisite setup
Bucket index :: The list of objects in a bucket
Lifecycle :: Rules that expire or move objects by age
```
