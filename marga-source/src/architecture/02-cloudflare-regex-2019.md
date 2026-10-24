# Cloudflare WAF regular expression, July 2019
company: Cloudflare
date: 2 July 2019
modules: cicd, python, sre
calc: error-budget, cells
source: Cloudflare blog | https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/
summary: One firewall rule with a pathological pattern used all the CPU on every edge server at once.

## Before you read on
Your edge servers run rules written by your own security team. How do you test a new rule, how fast can it reach every server, and what stops one rule from using all the CPU?

## The system
Cloudflare runs a web application firewall (WAF) on every edge server. Rules are written by engineers and checked against traffic. Some rules are managed rules that can be deployed quickly to respond to new attacks, and these used a mechanism that pushed changes globally within seconds.

## Timeline as reported
- A new managed rule was released to the whole network in one step. It was set to log matches rather than block, but the engine still had to evaluate it on every request.
- Around 13:42 UTC the first alarms showed CPU use at the limit on many servers, and the network began to return errors.
- Early on engineers suspected an attack, because the symptoms looked like one. The first steps were spent on that theory.
- Around 14:02 UTC the team used a global kill switch to turn the WAF off, which had been designed for emergencies.
- Around 14:09 UTC traffic and CPU were back to normal. The whole incident lasted about half an hour.

## Root cause
The rule contained a regular expression that could backtrack heavily on certain input, so matching a request could take a very long time. The regex engine in use had no cap on how long a match could take. The same rule ran everywhere at the same time.

## What Cloudflare changed
- The WAF was changed so that new rules are rolled out in stages, including release to a small share of traffic first.
- The regular expression engine was replaced with one that guarantees running time proportional to input size.
- Protections that limit how much CPU any rule can use were restored and strengthened.
- The deployment system, the kill switch and the dashboards were reviewed.

## Trade-offs to weigh
- **Fast protection against safe rollout.** Global releases within seconds defend customers from new attacks, but also spread a mistake just as quickly.
- **Expressive rules against bounded cost.** Full regular expressions are powerful and can be unbounded. Engines with guaranteed time are safer and restrict some patterns.
- **Kill switch design.** A kill switch is only useful if people know it exists, trust it and are allowed to use it quickly.

## Try the calculators
In the error budget calculator, set a 99.99% target over 30 days. Half an hour of global downtime uses how much of that budget? Then use the cells calculator to see what share of customers a staged rollout would have exposed if the first stage was one of 20 cells.
