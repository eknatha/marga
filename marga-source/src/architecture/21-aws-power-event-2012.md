# AWS US-East power event, June 2012
company: Amazon Web Services
date: 29 June 2012
modules: cloud, linux, sre
calc: redundancy, recovery
source: AWS summary of the power event in the US-East Region | https://aws.amazon.com/message/67457/
summary: A severe storm cut power to a data centre, backup generators failed to take over cleanly, and customers in one availability zone lost instances.

## Before you read on
You run your application in two availability zones for safety. A storm cuts power in one. What do you need to have ready to make sure the other zone carries the load?

## The system
AWS builds its regions from several availability zones, each in one or more data centres with their own power. Each data centre has utility feeds, backup generators and battery power for the gap between them.

## Timeline as reported
- A severe thunderstorm passed through Northern Virginia on the evening of Friday 29 June, and utility power failed at a data centre.
- As reported, the generators in the facility did not run stable and the systems did not switch to them, so the batteries ran down and the servers shut down.
- Instances and volumes in the affected zone went offline. Customers who ran in only one zone had an outage.
- Power returned, but starting up a large number of servers and volumes at once created a recovery backlog and delays in the control plane.
- The load balancers in some other zones also had trouble, as a fault caused services which depended on the affected zone to behave badly, and some sites that used more than one zone also had issues.

## Root cause
A power problem in one facility whose backup power did not work as designed, and the recovery work that followed, which was slow because of the volume of devices starting at once.

## What changed
- AWS said it would repair the generator control equipment and review the procedures for testing the backup power.
- It also worked on the control plane so that it did not rely on a single zone during recovery, and on the load balancer behaviour.

## Trade-offs to weigh
- **Two zones against three.** Two zones double your cost. A third zone gives spare room after the loss of one.
- **Testing backup power against risk.** Generator tests carry risk, and untested generators fail when the storm comes.
- **Fast restart against orderly restart.** Starting everything at once overloads shared services. Ordered startup takes longer, but it works.

## Try the calculators
In the redundancy calculator, set the number of replicas and the number needed, and see the availability that results. In the backup, RTO and RPO calculator, see the effect of recovery time.
