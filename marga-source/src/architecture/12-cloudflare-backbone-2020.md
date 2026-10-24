# Cloudflare backbone outage, July 2020
company: Cloudflare
date: 17 July 2020
modules: networking, sre
calc: redundancy, cells
source: Cloudflare blog: Cloudflare outage on July 17, 2020 | https://blog.cloudflare.com/cloudflare-outage-on-july-17-2020/
summary: A router configuration change on the backbone sent traffic to a single data centre and made a large share of Cloudflare traffic fail for about half an hour.

## Before you read on
A backbone links your data centres. A change on one router starts attracting all traffic. How does the rest of the network know something is wrong before users do?

## The system
Cloudflare runs data centres in many cities. A private backbone carries traffic between them, so that busy cities can use spare capacity from others. Routers on the backbone exchange routes, and a configuration decides which paths are preferred.

## Timeline as reported
- A router in Atlanta was being reconfigured to remove some traffic from a congested part of the backbone.
- As reported, the change contained an error in a rule, which made the router announce itself as a good path for traffic that it should not have been carrying.
- Traffic to many data centres was drawn to Atlanta, and that site became overloaded.
- The overload affected a large share of Cloudflare traffic for about 27 minutes, and users saw errors.
- Engineers removed the faulty router from the backbone and traffic was balanced again.

## Root cause
A configuration error on one backbone router was accepted without a check that it would not attract unexpected traffic, and the backbone had no limit on how much one site could attract.

## What changed
- Cloudflare reviewed its backbone change procedure and added checks before configuration reaches production routers.
- The company also said it would improve how it tests and stages network changes.

## Trade-offs to weigh
- **Shared backbone against isolated sites.** Sharing capacity makes the network efficient. It also lets one fault reach many sites.
- **Fast change against staged rollout.** Network changes are often applied by hand to one device. A staged rollout is slower but limits damage.
- **Automatic path choice against operator control.** Routing protocols react fast, and they will also propagate a mistake fast.

## Try the calculators
In the redundancy calculator, see how many healthy sites you need to carry load if one fails. In the cells calculator, compare one shared backbone with several separate ones and look at the share of users affected by one failure.
