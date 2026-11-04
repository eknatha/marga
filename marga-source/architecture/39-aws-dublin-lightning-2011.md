# AWS Dublin power loss, August 2011
company: Amazon Web Services
date: 7 August 2011
modules: cloud, linux, sre
calc: redundancy, recovery
source: AWS summary of the Amazon EC2 and Amazon RDS service disruption in the EU West region | https://aws.amazon.com/message/2329B7/
summary: A lightning strike on a utility transformer cut power, backup generators failed to take over because of a control fault, and instances and volumes in one zone were lost.

## Before you read on
Your data centre has a utility feed, generators and batteries. What proves that all three work together when the utility fails?

## The system
AWS ran its EU West region in Dublin with several availability zones. Power for the facilities came from the utility, with backup generators and uninterruptible power supplies for the time between loss and generator start.

## Timeline as reported
- On Sunday evening, a lightning strike hit a transformer that fed the facilities, and as reported, the utility power failed in the area.
- The backup generators did not take over, because a programmable logic controller that synchronises the generator phases did not work, which stopped the switch.
- The batteries ran down, servers shut off, and instances and volumes in one availability zone became unavailable.
- When power was restored, recovery was slow. Many EBS volumes needed a check for consistency and restoring volumes took time, with a number of snapshots affected by a bug found during recovery.
- Most instances came back after some hours, and some volumes and databases took more than a day.

## Root cause
A failure in the power control equipment prevented backup power from working, and the storage system needed a long recovery because of the number of volumes involved.

## What changed
- AWS said it would repair the equipment and improve its testing of power systems.
- It also said it would improve the recovery process for storage volumes and make it simpler for customers to use more than one zone.

## Lessons learned
- Test the complete power chain, including the control equipment, under load and on a schedule.
- Run production across more than one availability zone and practise the failover.
- Plan recovery for the case in which thousands of volumes need checks at the same time.
- Keep snapshots in another region for data that must survive a regional failure.

## Trade-offs to weigh
- **One zone against more.** Using one zone is cheap and simple. Using two removes the single point of failure and costs more.
- **Backup power complexity.** More equipment gives more redundancy, and more parts that can fail together.
- **Fast recovery against careful recovery.** Checking volumes protects data and extends the outage.

## Try the calculators
In the redundancy calculator, see how the availability of two zones compares with one. In the backup, RTO and RPO calculator, see how recovery time grows with data size.
