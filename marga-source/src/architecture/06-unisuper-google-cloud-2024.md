# UniSuper private cloud deletion, May 2024
company: UniSuper and Google Cloud
date: May 2024
modules: cloud, terraform, sre
calc: recovery, cloud-cost
source: UniSuper and Google Cloud joint statement | https://www.unisuper.com.au/about-us/media-centre/2024/a-joint-statement-from-unisuper-and-google-cloud
summary: A provider-side misconfiguration deleted a customer's private cloud and its backups in the same region, and independent backups saved the business.

## Before you read on
All your production systems and their backups live with one cloud provider, in one region. What kinds of failure would take out both?

## The system
UniSuper, an Australian pension fund, ran its infrastructure on a private cloud based on VMware in Google Cloud. It was set up in two regions for resilience, and the fund also kept backups with a different provider.

## Timeline as reported
- A one-off misconfiguration during the provisioning of the private cloud caused the subscription to be deleted.
- The deletion removed the private cloud in both regions, because the geo-redundancy of the service is designed for hardware failure and not for the deletion of the whole subscription.
- Members lost access to their accounts for about two weeks, from early May. UniSuper and Google Cloud stated that no data was lost.
- UniSuper used backups held with another provider, with the fund's own data, to rebuild the environment and then restored services in stages.
- Google Cloud investigated, said it was a one-time occurrence and said it had taken steps to prevent a repeat.

## Root cause
A misconfiguration on the provider side, with a deletion that cascaded to everything in the account. Redundancy within one provider's account did not protect against a fault at the level of the account.

## What changed
- Google Cloud reviewed the provisioning path and added safeguards.
- UniSuper's independent backup was the deciding factor in recovery, and its value was publicly acknowledged.

## Trade-offs to weigh
- **Backups in one place against backups in another.** A second provider costs money and adds work, and protects against account-level failure, provider outages and some attacks.
- **Convenience against separation of duties.** Putting backups under different credentials and ownership makes mistakes and attacks harder to spread.
- **Recovery speed.** Restoring everything from external backups takes time. Know how long.

## Try the calculators
In the backup and recovery calculator, enter 20,000 GB at 200 MB/s and daily backups. The restore alone takes more than a day. Then compare the cost multiplier of pilot light, warm standby and active-active against the revenue you would lose in that time. Use the cloud cost calculator to see what the always-on options add each month.
