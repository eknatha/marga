# Cloudflare data centre network change, June 2022
company: Cloudflare
date: 21 June 2022
modules: networking, sre, cicd
calc: cells, error-budget
source: Cloudflare blog: Cloudflare outage on June 21, 2022 | https://blog.cloudflare.com/cloudflare-outage-on-june-21-2022/
summary: A long-planned network re-architecture reached busy data centres in one batch and a wrong ordering of rules disconnected them for about an hour and a half.

## Before you read on
You are changing how a group of data centres is connected to each other. The change is correct for most of them. What would you roll out first, and how long would you wait before the next batch?

## The system
Cloudflare was moving some of its busiest data centres to a new design, called Multi-Colo PoP, that gives them more capacity and resilience. The work was spread over many weeks and was applied in stages to groups of cities.

## Timeline as reported
- A group of cities had already received the change without trouble. The next stage included 19 data centres, which carried a large share of global traffic.
- A change to the router configuration put a rule in the wrong order. The rule that withdrew some routes came before the rule that kept them in place.
- Those 19 data centres stopped announcing routes for some services, so users in those regions could not reach them.
- Engineers saw the problem, found the faulty change, and reverted it on the affected routers. Service came back after about 75 minutes.

## Root cause
A configuration change with a wrong ordering of rules was released to some of the busiest data centres at once, with no earlier stage that would have shown the problem.

## What changed
- Cloudflare said it would stage network changes in smaller and less busy groups first.
- It also said it would review its change process, including peer review of such changes and clearer visibility of the configuration that will be applied.

## Lessons learned
- Roll out network changes to quiet sites before busy ones, in small batches.
- Verify the order and effect of rules with a simulator before applying them.
- Allow time between batches to see problems.
- Have a fast, tested way to revert a router configuration.

## Trade-offs to weigh
- **Big batches against small ones.** Fewer, larger batches finish the migration sooner. Small batches take longer and limit the damage.
- **Quiet sites first against busy sites first.** Quiet sites are safer to test on. They may also hide problems that only appear under load.
- **Peer review against automated checks.** People miss rule order mistakes. A simulator of the router behaviour can find them.

## Try the calculators
In the cells calculator, change the number of cells and see how the share of users hit by one bad batch falls. In the error budget calculator, see how an hour and a half compares with a monthly allowance.
