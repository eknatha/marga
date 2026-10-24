---
title: Cloud fundamentals
minutes: 14
summary: Learn the shared vocabulary of AWS and Azure: regions, availability zones, the shared responsibility model, service types and how to organize accounts.
---

Cloud platforms rent you computing by the second instead of selling you servers. The vocabulary differs between providers, but the ideas are the same. Learn them once and you can read either AWS or Azure documentation without starting over.

## What you will learn

- Regions, availability zones and why they exist
- IaaS, PaaS and SaaS
- The shared responsibility model
- How accounts and subscriptions organize resources

## Regions and availability zones

A **region** is a geographic area with several data centers, such as `eu-west-1` (Ireland) in AWS or `westeurope` in Azure. An **availability zone (AZ)** is one or more separate data centers within a region, with independent power and networking, connected by fast links.

| Concept | Purpose | Design rule |
|---------|---------|-------------|
| Region | Latency, data residency, disaster recovery | Choose near users and within legal requirements |
| Availability zone | Survive a data center failure | Spread each important service across at least two zones |

A service running in a single zone is one power failure away from an outage. Running across zones is the basic form of high availability. Surviving the loss of a whole region is a larger, more expensive design that you adopt only when the business needs it.

## Service models

| Model | You manage | Provider manages | Examples |
|-------|-----------|------------------|----------|
| **IaaS** | Operating system, runtime, application | Hardware, virtualization | AWS EC2, Azure Virtual Machines |
| **PaaS** | Application and data | Everything below, including patching | AWS Elastic Beanstalk, Azure App Service, managed databases |
| **SaaS** | Your usage and data | The whole application | Email, ticketing, CRM products |

Moving toward PaaS reduces operational work and risk, at the cost of some control. A good default is the most managed service that meets your requirements.

## Shared responsibility

The provider secures the cloud itself: buildings, hardware, hypervisors, the global network. **You secure what you put in it**: identities and permissions, data, network rules, operating system patches on virtual machines, and configuration.

> **Why it matters:** Most publicly reported cloud breaches involve customer configuration, such as a storage bucket opened to the internet or an access key committed to a shared location, not a failure of the provider's data centers.

## Organizing accounts

| | AWS | Azure |
|---|-----|-------|
| Top-level grouping | Organization | Tenant (Microsoft Entra ID) and management groups |
| Billing and isolation boundary | Account | Subscription |
| Logical folder inside | Tags, resource groups (optional) | Resource group (required) |
| Policy at scale | Service control policies | Azure Policy |

Use **separate accounts or subscriptions** for production and non-production, and often per team or workload. A boundary at this level limits the blast radius of mistakes and of compromised credentials far better than any tag could.

## Cost basics

Cloud billing rewards switching things off. The main levers:

- **Right-size**: match instance sizes to measured usage
- **Commit**: reserved capacity or savings plans for steady workloads
- **Spot or low-priority capacity** for interruptible jobs
- **Delete** unattached disks, old snapshots and idle load balancers
- **Tag** resources with owner and environment, so you can tell whose bill is whose

Set a **budget alert** on every account on day one.

## Incident: an unexpected bill

> **Incident:** The monthly invoice is four times higher than usual, and nobody launched anything new.

Start with where the cost is, not who to blame. In AWS use Cost Explorer grouped by service and by region; in Azure use Cost Analysis grouped by resource group and meter.

```console
$ aws ce get-cost-and-usage \
    --time-period Start=2026-10-01,End=2026-10-24 \
    --granularity DAILY --metrics UnblendedCost \
    --group-by Type=DIMENSION,Key=SERVICE
```

The output shows a large increase in data transfer and compute in an unfamiliar region. Unfamiliar region plus compute is a classic sign of leaked credentials being used to mine cryptocurrency. Treat it as a security incident: disable the exposed keys immediately, review activity in CloudTrail (or the Azure Activity Log), terminate unknown resources, and rotate every credential that could have been exposed. Afterward, add controls that would have caught it sooner: budget alerts at low thresholds, a policy denying use of regions you do not operate in, and short-lived credentials instead of long-lived keys.

## Common mistakes

- Running everything in one account or subscription
- Placing production in a single availability zone
- No budget alert and no tagging
- Assuming the provider secures your configuration

```quiz
Q: What is an availability zone?
- A country
+ One or more separate data centers within a region with independent power and networking
- A billing plan
- A type of virtual machine
> Spreading across zones protects against a single data center failure.

Q: Under the shared responsibility model, who secures the data and permissions you configure?
- The provider
+ You
- The internet service provider
- Nobody
> The provider secures the underlying cloud; customers secure what they run and configure.

Q: Which Azure object is the main billing and isolation boundary, similar to an AWS account?
- Resource group
+ Subscription
- Region
- Tag
> Subscriptions group billing and access, and resource groups sit inside them.

Q: Large unexpected compute charges appear in a region you never use. What is the most likely cause?
- A price change
+ Leaked credentials being used to create resources
- A normal backup
- An availability zone outage
> Disable the credentials first, then investigate activity logs.
```

```cards
Region vs availability zone? :: A region is a geographic area; an AZ is an isolated data center group inside it
IaaS vs PaaS? :: IaaS gives you virtual infrastructure to manage; PaaS also manages the platform and patching
AWS account equals what in Azure? :: Roughly a subscription
First cost controls to set? :: Budget alerts and consistent tagging
```
