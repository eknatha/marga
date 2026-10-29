# Cloudflare WAF body parsing change, December 2025
company: Cloudflare
date: 5 December 2025
modules: cicd, observability, sre
calc: cells, error-budget
source: Cloudflare blog: 5 December 2025 outage | https://blog.cloudflare.com/5-december-2025-outage/
summary: An emergency change to the firewall request-body limit, made to protect customers from a new vulnerability, triggered an error in older proxy code and part of the network returned errors for about 25 minutes.

## Before you read on
A serious public vulnerability needs a mitigation within hours. How do you balance the urgency of the fix against the usual testing and staged rollout?

## The system
Cloudflare runs a web application firewall (WAF) on its proxies. Rules and settings are distributed globally through a fast configuration system, and the proxies have more than one generation of software running side by side.

## Timeline as reported
- To protect customers against a newly disclosed vulnerability, engineers raised the size of the request body that the WAF inspects.
- As reported, the change went out through the global configuration system, which pushes updates to the whole network within seconds, with no gradual stage.
- The larger buffer exposed an error in an older proxy generation, and in a rule evaluation path that had not been exercised before, a null value caused a failure.
- About 28 percent of HTTP traffic returned errors for roughly 25 minutes, mostly customers served by the affected proxy generation.
- Engineers reverted the setting, and the traffic recovered shortly after the change was reversed.

## Root cause
A global, instant configuration change, with a code path that had a latent error, made for an urgent security reason and not staged like software releases.

## What changed
- Cloudflare said it would put configuration changes through the same health-checked staged rollout as software, with fast rollback.
- It also said it would review failure handling in the proxy so that an error in one rule does not fail the request, and it would add kill switches.

## Lessons learned
- Treat configuration changes like software: stage them, health check them and make them easy to revert, even when they are urgent.
- Exercise rarely used code paths in tests, including the case of a null or unexpected value.
- Decide in advance, rule by rule, whether a failure should let traffic pass or block it.
- Keep global kill switches, so that an engineer can turn off a feature quickly.

## Trade-offs to weigh
- **Urgency against testing.** A fast fix limits exposure to the vulnerability. A faulty fix is its own outage.
- **Configuration as data against configuration as code.** Treating it as data makes it quick. Treating it as code gives it a pipeline.
- **Fail open against fail closed for security rules.** Failing open lets bad requests through. Failing closed turns a bug into an outage.

## Try the calculators
In the cells calculator, compare an instant global push with a staged one and read the share of users affected. In the error budget calculator, see how 25 minutes of a quarter of traffic maps to your monthly objective.
