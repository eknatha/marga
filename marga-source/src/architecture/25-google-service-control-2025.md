# Google Cloud Service Control crash, June 2025
company: Google Cloud
date: 12 June 2025
modules: cloud, sre, cicd
calc: cells, retries
source: Google Cloud incident report | https://status.cloud.google.com/incidents/ow5i3PPK96RduMcb1SsW
summary: A new policy field with blank values was replicated worldwide in seconds, hit a null pointer in the API checking service, and crashed it everywhere.

## Before you read on
A new feature adds a field to a policy that is copied to every region in seconds. The code that reads the field was never run with an empty value. Where would you catch that?

## The system
Service Control is a component that checks API requests in Google Cloud: it applies policies, quotas and authorization before a request reaches the product. Its policy data is stored in a regional database and replicated globally within seconds.

## Timeline as reported
- In late May, a new feature for extra quota policy checks was added to Service Control. As reported, the code path had no error handling for a null value, and it was not protected by a feature flag.
- On 12 June, a policy change was inserted that contained blank fields. It replicated to all regions in seconds.
- When Service Control read the policy, it hit the null pointer and crashed. The binaries crashed in a loop in every region.
- Google Cloud's own engineers saw the problem within minutes and identified the cause. They turned off the faulty serving path in about 40 minutes.
- The big region us-central1 took longer, because the restarting tasks all overloaded the underlying database. Throttling and extra capacity restored it in a few hours.
- Many Google Cloud products and customers of Google Cloud had errors, and some other companies that depend on it were affected.

## Root cause
A code path without a null check or a feature flag, a global replication that gave no time to catch a bad policy, and a restart of many tasks at once without back-off.

## What changed
- Google froze changes to the service and said it would add error handling and modularize the architecture to fail open.
- It also said it would add feature flags for each new check, stop global replication of metadata without staged rollout, and add randomized back-off after crashes.

## Trade-offs to weigh
- **Instant global replication against staged.** Instant gives consistent policy. A staged rollout would have limited the damage to one region.
- **Fail open against fail closed.** If the checker fails open, requests pass without checks. If it fails closed, everything stops.
- **Feature flags against simplicity.** A flag for each feature adds work and gives a switch for when the code is wrong.

## Try the calculators
In the cells calculator, change the number of cells and see how many users a single bad update reaches. In the retries calculator, see how restarting tasks without back-off multiplies load on a recovering database.
