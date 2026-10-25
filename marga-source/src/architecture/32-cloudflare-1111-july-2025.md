# Cloudflare 1.1.1.1 resolver outage, July 2025
company: Cloudflare
date: 14 July 2025
modules: networking, sre
calc: cells, error-budget
source: Cloudflare blog: Cloudflare 1.1.1.1 incident on July 14, 2025 | https://blog.cloudflare.com/cloudflare-1-1-1-1-incident-on-july-14-2025/
summary: An old misconfiguration in a service topology system became active during an unrelated change, and the public DNS resolver withdrew its routes worldwide.

## Before you read on
A configuration mistake is made today and does nothing for weeks. A later, unrelated change activates it. How would anybody connect the outage to the original mistake?

## The system
Cloudflare runs the public DNS resolver 1.1.1.1 on anycast addresses announced from its data centres. A topology system decides which data centres announce which address prefixes, and it is used for the resolver and for other services.

## Timeline as reported
- In June, a configuration change linked the resolver prefixes to a test location that was not yet live. As reported, the mistake had no effect because the test location was not in use.
- On 14 July, a change to add a data centre to a different service triggered a refresh of the topology configuration.
- The refresh applied the old mistake. The resolver prefixes were attached only to one offline location, and they were withdrawn from all real data centres.
- Within minutes most users of 1.1.1.1 could not resolve names, and traffic over UDP, TCP and DNS over TLS dropped sharply, while DNS over HTTPS stayed up for some clients which used another address.
- Engineers reverted the change, and routes were announced again. Some data centres needed a configuration reset to bring services back, so full recovery took about an hour.

## Root cause
A latent configuration error, in a system that applied changes to all locations at once, with no check that a prefix was announced from at least one live location.

## What changed
- Cloudflare said it would move the legacy topology system to a staged rollout with health checks.
- It also planned to stop using the older, error-prone approach, and to add safeguards that stop an announcement from losing all live locations.

## Lessons learned
- A change that has no visible effect can still be wrong, so validate configuration against the intended outcome, not only against syntax.
- Roll configuration out in stages with health checks, even for changes that look small.
- Add a safety rule that an announced service must always be present in at least one live location.
- Finish migrations off the old system, because the leftover path is where errors live.

## Trade-offs to weigh
- **Old and new systems side by side.** A migration leaves two systems in play, and mistakes can hide in the seam between them.
- **Instant global change against staged.** Instant gives quick control. Staged gives a chance to see harm early.
- **Anycast resilience against shared fate.** One address in many places hides single failures. A shared configuration means a shared failure.

## Try the calculators
In the cells calculator, compare one global configuration with several staged groups and read the share of users hit by a bad push. In the error budget calculator, see what an hour of failed resolution costs a monthly objective.
