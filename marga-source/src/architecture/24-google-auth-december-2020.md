# Google authentication outage, December 2020
company: Google
date: 14 December 2020
modules: cloud, sre, observability
calc: capacity, error-budget
source: Google Cloud incident report | https://status.cloud.google.com/incident/zall/20013
summary: The quota of a storage system that the authentication service depended on was reduced by mistake, and sign-in failed for many Google services.

## Before you read on
Your sign-in service stores its data with a quota system. The quota for it silently goes to a very small value. What alerts first?

## The system
Google uses a central user ID service for authentication across its products. This service stores data in a distributed system and relies on a quota management system to allocate storage capacity to each service.

## Timeline as reported
- In October, Google started a migration of the quota system to a new one. Part of the plan was to register the usage of services in the new system.
- As reported, the service for user IDs was not registered correctly, so the quota system saw its usage as zero.
- On 14 December, around 3:46 AM Pacific, the quota for the ID service was reduced to zero as a result, because it was believed to use none of it.
- The authentication system could not write to its storage. Services that needed sign-in, including Gmail, YouTube and Google Cloud consoles, returned errors for about 47 minutes.
- Engineers found the cause and increased the quota in a few minutes. Services recovered gradually.

## Root cause
A migration left an important service with a usage figure of zero, and the quota system acted on it with no check that the reduction was safe.

## What changed
- Google fixed the migration, and added safeguards against a drastic cut in quota.
- It said it would also improve its monitoring, and check the alerts and the tools that engineers rely on during such events.

## Trade-offs to weigh
- **Automatic quota against manual quota.** Automation avoids waste. It will also act on wrong data at full speed.
- **Hard stop against graceful decline.** A quota that blocks writes stops abuse. A gradual limit would have given warning.
- **Central sign-in against independent.** One identity service is convenient, and failure of it is felt everywhere.

## Try the calculators
In the capacity calculator, see what happens to headroom when the usable capacity is cut. In the error budget calculator, compare a 47-minute full outage with a monthly objective.
