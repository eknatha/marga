# Microsoft WAN router change, January 2023
company: Microsoft
date: 25 January 2023
modules: networking, cloud, sre
calc: redundancy, error-budget
source: Microsoft Azure status history and post incident review | https://azure.status.microsoft/en-us/status/history/
summary: A command issued to a router on the wide-area network caused routers to recompute their forwarding tables, and traffic between data centres and to the internet was disrupted for hours.

## Before you read on
A single command on one network device can affect the whole network. How would you limit what one command can do?

## The system
Microsoft runs a large wide-area network (WAN) that links its data centres and connects them to the internet. Many services such as Azure, Microsoft 365 and Teams depend on it. Routers hold forwarding information that must be kept consistent.

## Timeline as reported
- In the early hours (UTC), an engineer working on a router to update an address in the network issued a command.
- As reported, the command caused the router to send messages to the other routers in the network, and they in turn recomputed and updated their forwarding tables.
- During the update, packets were dropped and traffic could not be forwarded properly across the wide area network.
- The network recovered partly by itself, then the engineers paused further changes and restarted devices. Core connectivity returned in about two hours.
- Some services took longer to recover, as they had to recover from the loss of connection, and a few were affected for much of the morning.

## Root cause
A command on one device had a network-wide effect, with no guard rail that checked the impact before it was applied.

## What changed
- Microsoft said it would block highly impactful commands from being run on the devices, unless they pass a safe path.
- It also said it would require changes to the network to go through a safe deployment process, and improve how fast a bad change is detected and reversed.

## Lessons learned
- Block or gate network commands with global effects, and require a second approval and a pre-check of the impact.
- Roll out network changes in small steps with automatic rollback on loss of connectivity.
- Keep an out-of-band path to the devices, so repair does not depend on the network that is broken.
- Divide a large network into fault domains with limits on what one change can propagate.

## Trade-offs to weigh
- **Direct device access against managed changes.** Direct commands are quick for experts. A managed pipeline checks impact first.
- **Fast convergence against stability.** Routers that react quickly to change also spread an error quickly.
- **One big network against several.** A single network is simple. A fault domain boundary limits a mistake.

## Try the calculators
In the redundancy calculator, see how network availability changes when two paths share a hidden dependency. In the error budget calculator, see what two hours of a shared dependency do to a quarterly objective.
