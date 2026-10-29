# Atlassian site deletion, April 2022
company: Atlassian
date: 4 to 18 April 2022
modules: cloud, sre, bash
calc: recovery, redundancy
source: Atlassian engineering: Post-incident review on the April 2022 outage | https://www.atlassian.com/engineering/post-incident-review-april-2022-outage
summary: A script meant to delete a legacy app was given the wrong kind of identifier and deleted whole customer sites, and restoring them took up to two weeks.

## Before you read on
A script deletes things by a list of IDs. What would you check before you let it accept either site IDs or app IDs in the same field?

## The system
Atlassian runs Jira, Confluence and other products for many customers in a multi-tenant cloud. Each customer site has data in several stores. The company has backups and can restore data, and it does so routinely for single sites.

## Timeline as reported
- A team wanted to delete a legacy app that had been merged into the core product. It asked for a script to be run with a list of IDs of the app installations.
- As reported, the list contained IDs of the customer sites rather than the app, because of a communication gap between teams. The script was also run with permanent deletion mode, rather than the mode that can be undone.
- On 5 April, the script ran and deleted around 400 customer sites. The first deletion was a test with a smaller set, and the wider run followed.
- Atlassian could restore sites, but the existing process restored a few at a time, and the restore of a site required many manual steps to prevent data from other customers being affected.
- Engineers built automation to restore many sites at once. The first customers got their data back in a few days, and all were restored by 18 April.

## Root cause
Confusing identifiers across teams, a deletion script with a permanent mode and no checks of the scale, and a restore process that had not been tested for many tenants at once.

## What changed
- Atlassian said it would use only soft deletion for such scripts, with a delay before permanent removal, and add checks on the scale of a deletion.
- It also said it would test its restore at a greater scale, and improve its incident communications to customers.

## Lessons learned
- Use soft deletion with a delay for any destructive script.
- Use unambiguous identifiers, and check the type of ID that a script receives.
- Test the restore of many tenants at once.
- Add a check that blocks a script that would affect too many objects.

## Trade-offs to weigh
- **Soft delete against storage cost.** Keeping deleted data costs money and gives time to notice a mistake.
- **Tenant by tenant restore against bulk.** A per-tenant process is safe. For hundreds of tenants it takes weeks.
- **Specific IDs against general ones.** One field that accepts any kind of ID is convenient. It makes typing mistakes into outages.

## Try the calculators
In the backup, RTO and RPO calculator, set a data size and a restore rate and see how many days a large restore needs. In the redundancy calculator, ask whether replicas would protect against a deliberate deletion.
