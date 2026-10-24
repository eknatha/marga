# Facebook backbone and BGP, October 2021
company: Facebook
date: 4 October 2021
modules: networking, cloud, sre
calc: redundancy, cells
source: Meta engineering | https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/; Cloudflare analysis | https://blog.cloudflare.com/october-2021-facebook-outage/
summary: A maintenance command disconnected the backbone, DNS withdrew its own routes, and the tools needed to fix it were behind the same network.

## Before you read on
If every data center lost contact with every other, what would your DNS servers do? And how would your engineers log in to fix it?

## The system
Facebook's data centers are connected by a private backbone network. Its authoritative DNS servers run in those data centers and announce their addresses to the internet using BGP. They are designed to withdraw their BGP announcements if they cannot reach the data centers, because that signals that they are unhealthy and traffic should go elsewhere.

## Timeline as reported
- During routine maintenance, engineers ran a command to assess the availability of backbone capacity.
- The command unintentionally took down the connections that make up the backbone. A bug in the audit tool that should have blocked such a command did not stop it.
- With no backbone, the DNS servers could not reach the data centers, so they withdrew their BGP routes. From the outside, Facebook's names and addresses became unreachable at about 15:40 UTC.
- Internal tools, remote access and even building access systems depended on the same network and DNS, so engineers could not easily work remotely.
- Engineers went to the data centers in person. Physical access was slow because of security controls designed to prevent tampering.
- Service was restored gradually, to avoid a power and traffic surge from bringing everything up at once. The outage lasted about six hours.

## Root cause
A command with global effect passed through a faulty audit check. The design of the DNS health behaviour then turned a backbone failure into a complete disappearance from the internet. Recovery tools shared the failed network.

## What Facebook changed
- The audit tool was fixed and reviewed.
- Facebook reviewed the intersection of DNS health checks and BGP behaviour, and stress-tested failure of the backbone.
- Out-of-band access and the process for physical access during an emergency were reviewed.

## Trade-offs to weigh
- **Health-driven withdrawal.** Removing unhealthy servers from routing is good for isolated faults and harmful when every server looks unhealthy at once.
- **Tight physical security against emergency access.** Strong controls protect hardware but delay repairs.
- **One network for everything.** A single network is simple. A separate management path costs money and must itself be kept working.

## Try the calculators
In the redundancy calculator, enter replicas that are 99% available each and compare 3 independent replicas with 3 that share one failure cause. The tool assumes independence, so think about which of your own replicas are not independent. In the cells calculator, see how splitting users would have limited the effect.
