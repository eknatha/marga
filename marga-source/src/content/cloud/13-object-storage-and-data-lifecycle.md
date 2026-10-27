---
title: Object storage and data lifecycle
minutes: 12
summary: Use object storage well: classes, lifecycle rules, versioning, access control and protection against deletion and exposure.
---

Object storage looks like a bottomless folder, and that is why it causes two classic incidents: a bucket left public and a bill that quietly grows for years because nobody deleted old data. A handful of settings (access blocks, versioning, lifecycle rules and encryption) cover most of the risk.

## What you will learn

- How object storage differs from a disk
- Storage classes and lifecycle rules that control cost
- Versioning, retention and protection from accidental deletion
- Blocking public access and using signed URLs

## Objects, not files

Object storage keeps whole objects (data plus metadata) in a flat namespace, addressed by key such as `reports/2026/01/sales.csv`. The slashes are only part of the name. You cannot edit a part of an object; you replace it. It is very durable (often described as eleven nines), scales without planning, and is accessed over HTTPS. It is not a file system, so it is a poor fit for databases or software that needs fast small writes.

## Classes and lifecycle rules

Providers offer classes that trade price for access speed: hot for frequent access, infrequent access for monthly reads, and archive for data you rarely need and can wait hours to get back. Lifecycle rules move or delete objects automatically.

```json
{
  "Rules": [{
    "ID": "logs-tiering",
    "Status": "Enabled",
    "Filter": { "Prefix": "logs/" },
    "Transitions": [
      { "Days": 30, "StorageClass": "STANDARD_IA" },
      { "Days": 180, "StorageClass": "GLACIER" }
    ],
    "Expiration": { "Days": 730 },
    "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 7 }
  }]
}
```

This rule moves logs to a cheaper class after 30 days, to archive after 180, deletes them after two years, and cleans up abandoned uploads. Check minimum storage durations and retrieval fees before you move small or short-lived objects.

## Versioning and deletion protection

With **versioning**, an overwrite or delete creates a new version, and the old one stays recoverable. It protects against mistakes and some attacks, but old versions cost money, so add a lifecycle rule for noncurrent versions. For stronger protection use **object lock** (write once, read many) with a retention period, and require multi-factor authentication for delete. Replicate critical buckets to another region or account so a single account problem cannot remove every copy.

## Keep it private

Most exposures come from a permissive bucket policy or ACL. Turn on the account-wide **block public access** setting, and give applications access through roles, not shared keys. To share one file for a limited time, create a **signed URL** that expires:

```console
$ aws s3 presign s3://acme-reports/2026/01/sales.csv --expires-in 900
```

Encrypt at rest with the provider key or your own key, require HTTPS in the bucket policy, and enable access logging on sensitive buckets. Run the provider's public-access checker regularly and alert when a bucket policy changes.

```predict
Q: A bucket has versioning on and a user deletes an important object. Can you recover it, and what might still cost money later?
???
Yes, remove the delete marker or restore the previous version. Old versions keep costing money unless a lifecycle rule expires them.
> Versioning protects data and creates cost you need to manage.
```

## Incident: The bucket that kept growing

> **Incident:** A finance review found that a logging bucket cost more each month and no one could say why.

```console
$ aws s3 ls s3://acme-logs --recursive --summarize | tail -2
Total Objects: 94,220,118
   Total Size: 412 TiB
$ aws s3api get-bucket-lifecycle-configuration --bucket acme-logs
An error occurred (NoSuchLifecycleConfiguration)
```

Five years of logs sat in the most expensive class, with no expiry rule. Compliance needed only two years. A lifecycle rule moved data to infrequent access at 30 days and to archive at 180, and expired it after two years, which cut the bill by about 70 percent. The team also added a monthly report of the five largest buckets with their growth and owner tags.

## Common mistakes

- No lifecycle rule, so data grows forever
- Public access allowed on a bucket by accident
- Versioning without expiring old versions
- Treating object storage like a fast local disk

```quiz
Q: What does a lifecycle rule do?
+ Moves or deletes objects automatically based on age or prefix
- Encrypts objects :: That is an encryption setting.
- Makes the bucket public :: It does not affect access.
- Speeds up reads :: It affects cost and retention.
> Automation controls cost and retention.

Q: What protects against accidental overwrite or delete?
+ Versioning, with object lock for stronger protection
- A longer bucket name :: Names do not protect data.
- A faster network :: It does not protect data.
- More folders :: Prefixes do not protect data.
> Old versions stay recoverable.

Q: How do you share one object temporarily without making it public?
+ Create a signed URL that expires
- Make the bucket public :: Everything becomes exposed.
- Email the access keys :: Keys give too much access.
- Move the file to a laptop :: Not a sharing method.
> Signed URLs are time limited.

Q: Why is object storage a poor fit for a database?
+ You cannot update part of an object, and small writes are slow
- It is not durable :: It is very durable.
- It cannot be encrypted :: It can.
- It has no API :: It has an API.
> Use block storage or a database service.
```

```cards
Block account-wide public access :: block public access
Control cost over time :: lifecycle rules
Recover from delete :: versioning and delete markers
Share temporarily :: signed URL with expiry
Immutable retention :: object lock
```
