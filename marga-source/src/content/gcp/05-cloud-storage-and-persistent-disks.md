---
title: Cloud Storage and persistent disks
minutes: 12
summary: Use Cloud Storage buckets with classes, lifecycle rules, versioning and uniform access, and choose between Persistent Disk, Hyperdisk and Filestore.
---

Storage on Google Cloud comes in object, block and file forms. Most beginners need only the first two and the habits that keep data safe and cheap.

## What you will learn

- Buckets, classes and locations
- Access control and signed URLs
- Lifecycle, versioning and retention
- Disks, snapshots and file storage

## Buckets

```console
$ gcloud storage buckets create gs://acme-exports --location=europe-west1 \
    --uniform-bucket-level-access --public-access-prevention
$ gcloud storage cp report.csv gs://acme-exports/2026/
$ gcloud storage ls --long gs://acme-exports/2026/
```

A bucket has a **location** (region, dual-region or multi-region) and a default **storage class**: Standard for hot data, Nearline (30 days), Coldline (90 days), Archive (365 days) for rarely read data. Colder classes cost less to keep and more to read, and have minimum storage durations.

## Access

Use **uniform bucket-level access** so IAM alone controls access (no per-object ACLs), turn on **public access prevention**, and give service accounts the narrowest role (`roles/storage.objectViewer`). For temporary sharing, create a **signed URL**.

## Lifecycle and protection

```json
{"rule": [
  {"action": {"type": "SetStorageClass", "storageClass": "NEARLINE"}, "condition": {"age": 30}},
  {"action": {"type": "Delete"}, "condition": {"age": 365}}
]}
```

**Object versioning** keeps previous versions after overwrite or delete; a **retention policy** prevents deletion for a period. Lifecycle rules move or delete objects automatically.

## Disks and files

A **Persistent Disk** (balanced, SSD) attaches to VMs and survives instance deletion if configured that way. Take scheduled **snapshots** and test restoring them. **Hyperdisk** gives tunable performance. **Filestore** offers shared NFS.

```diagram
title: Where data lives
node: app | Application | 0 | 0 | Reads and writes through IAM roles. | Overly broad roles expose all buckets.
node: bkt | Bucket | 1 | 0 | Objects with a class and a location. | Public access exposes data to the world. | store
node: life | Lifecycle rules | 2 | 0 | Move to colder classes or delete by age. | Deleting too soon loses needed data. | process
node: ver | Versioning | 2 | 1 | Keeps older versions after change. | Unbounded versions raise cost. | store
node: disk | Persistent Disk | 1 | 1 | Block storage for one VM with snapshots. | No snapshot schedule means no restore point. | store
edge: app | bkt
edge: bkt | life
edge: bkt | ver
edge: app | disk
```

## Incident: The public bucket

> **Incident:** A bucket was made public for a quick share and customer exports stayed exposed.

```console
$ gcloud storage buckets get-iam-policy gs://acme-exports
members: allUsers  role: roles/storage.objectViewer
audit: 14,201 external reads
```

A one-off share became a permanent exposure. The team removed allUsers, enabled public access prevention at the organization, and used signed URLs with a short expiry for sharing.

## Common mistakes

- Granting allUsers or allAuthenticatedUsers
- Archive class for data read often
- No lifecycle rules, so old data piles up
- Disks without snapshot schedules

```quiz
Q: What does public access prevention do?
+ Blocks making a bucket public
- Speeds up reads :: No.
- Compresses objects :: No.
- Creates snapshots :: No.
> A guardrail against exposure.

Q: Which class suits data read once a year?
+ Archive or Coldline
- Standard :: No.
- Local SSD :: No.
- Memory :: No.
> Cold classes are cheap to keep.

Q: How do you share a file temporarily?
+ A signed URL
- Make the bucket public :: No.
- Email the key :: No.
- Open the firewall :: No.
> A time-limited link.

Q: What protects against accidental overwrite?
+ Object versioning
- A label :: No.
- A bigger disk :: No.
- Cloud NAT :: No.
> Previous versions are kept.
```

```cards
Bucket :: A container for objects in Cloud Storage
Storage class :: Cost and access tier for objects
Signed URL :: A time-limited link granting access to an object
Lifecycle rule :: An automatic action based on object age or state
Snapshot :: A point-in-time copy of a disk
```
