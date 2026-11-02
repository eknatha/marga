---
title: Compute and storage
minutes: 16
summary: Choose between virtual machines, containers and serverless, understand object, block and file storage, and protect data with versioning and backups.
---

Two decisions come up in every design: where the code runs, and where the data lives. Each has several options on both clouds, and choosing well is mostly about matching the workload to the level of management you want to carry.

## What you will learn

- The compute options and when each fits
- Autoscaling and load balancing
- Object, block and file storage
- Protecting data from loss and exposure

## Compute options

| Option | AWS | Azure | Choose when |
|--------|-----|-------|-------------|
| Virtual machines | EC2 | Virtual Machines | You need full OS control or run legacy software |
| Managed containers | ECS, Fargate | Container Apps, Container Instances | You want containers without running a cluster |
| Managed Kubernetes | EKS | AKS | You need Kubernetes features and a portable platform |
| Functions | Lambda | Azure Functions | Short, event-driven work with spiky traffic |
| Managed web platform | Elastic Beanstalk, App Runner | App Service | A web app with minimal operations |

A rule of thumb: pick the **most managed** option that still fits. A function or managed container has less to patch than a virtual machine. Reach for virtual machines when you must, and for Kubernetes when you have enough services and enough people to justify its cost.

## Scaling and load balancing

Put instances behind a **load balancer** across at least two zones, and let an **autoscaling group** (AWS) or **scale set** (Azure) add or remove instances based on a metric such as CPU or request count. Health checks remove bad instances automatically.

```console
$ aws autoscaling describe-auto-scaling-groups \
    --query 'AutoScalingGroups[].{name:AutoScalingGroupName,min:MinSize,max:MaxSize,desired:DesiredCapacity}'
```

Instances should be **disposable**: built from an image or startup script, holding no unique data, and replaceable at any time. If a server is precious, it is a risk.

## Storage types

| Type | AWS | Azure | Use for |
|------|-----|-------|---------|
| **Object** | S3 | Blob Storage | Files, backups, static websites, logs, data lakes |
| **Block** | EBS | Managed Disks | A single VM's disk, databases on VMs |
| **File** | EFS, FSx | Azure Files | Shared file systems mounted by many machines |

Object storage is the workhorse: practically unlimited, durable, cheap and accessed over HTTPS. It is not a file system and is not for frequent small edits to one file.

Storage **classes** trade price for access speed. Frequently read data belongs in the standard tier; old logs belong in an infrequent-access or archive tier, moved by a **lifecycle rule** automatically.

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "archive-then-expire"
    status = "Enabled"

    filter {}

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 365
    }
  }
}
```

## Protecting data

- **Block public access** at the account level for object storage, and allow exceptions deliberately.
- **Encrypt at rest** with provider-managed or customer-managed keys. Encrypt in transit with TLS.
- **Turn on versioning**, so an overwritten or deleted object can be recovered.
- **Back up** to a separate account or subscription and **test restores**.
- **Replicate** across zones (default for most managed storage) and, where required, across regions.
- **Snapshot** disks before risky changes.

> **Warning:** Replication copies mistakes as faithfully as it copies data. If someone deletes a file, replication deletes it everywhere. Versioning and backups are what bring it back.

## Incident: a bucket is public

> **Incident:** A security scanner reports that the bucket `acme-reports` allows public reads. It contains customer exports.

Act in this order: close the exposure, then investigate, then fix the cause.

```console
$ aws s3api put-public-access-block --bucket acme-reports \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
$ aws s3api get-bucket-policy --bucket acme-reports
$ aws s3api get-bucket-acl --bucket acme-reports
```

Blocking public access takes effect immediately and does not delete data. Then find out how long it was open and what was read: check S3 server access logs or CloudTrail data events, if they were enabled. If you had no logging, you cannot prove nothing was accessed and may need to treat the data as disclosed, which can carry legal notification duties. Find the root cause (a policy with `"Principal": "*"`, a legacy ACL, a deployment that ignored the account-level block) and add controls: account-wide public access block, a policy check in the pipeline, and alerting on any change to bucket exposure.

## Common mistakes

- Treating a virtual machine as a pet that cannot be rebuilt
- No versioning or tested restore
- Confusing replication with backup
- Leaving old snapshots and unattached disks to accumulate cost

```quiz
Q: Which storage type is best for storing backups and static files accessed over HTTPS?
- Block storage
- File storage
+ Object storage
- Instance memory
> Object storage is durable, cheap and designed for large numbers of files.

Q: Why is replication not a backup?
- It is slower
+ It copies deletions and corruption to the replicas as well
- It is always encrypted
- It costs more
> A backup holds point-in-time copies you can restore from.

Q: What does a lifecycle rule do?
- Starts instances
+ Moves or deletes objects automatically based on age
- Encrypts the bucket
- Blocks public access
> Lifecycle rules control cost by transitioning old data to cheaper tiers or expiring it.

Q: Which is usually the most managed compute option for short, event-driven work?
- Virtual machines
- Dedicated hosts
+ Functions
- Bare metal
> Functions (Lambda, Azure Functions) have the least infrastructure to manage.
```

```cards
Object, block, file storage? :: Object for files over HTTP, block for a VM disk, file for shared mounts
Why make instances disposable? :: So failed or scaled instances can be replaced automatically without losing data
First step when a bucket is exposed? :: Block public access immediately, then investigate logs and fix the cause
Versioning purpose? :: Recover previous versions of overwritten or deleted objects
```
