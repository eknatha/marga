# Anthropic overlapping quality bugs, August and September 2025
company: Anthropic
date: August to September 2025
modules: llm, prompting, sre
calc: error-budget, redundancy
source: Anthropic engineering post-mortem of three recent issues | https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues
summary: Three separate infrastructure bugs overlapped and lowered the quality of Claude answers for some users, and the existing checks did not show it quickly.

## Before you read on
Your model service runs on several kinds of hardware, and you ship changes to routing and to the code that picks tokens. Users say answers got worse, but only some of them and not all the time. How do you decide whether the cause is the model, your prompt or the platform?

## The system
Anthropic serves Claude to consumers and developers through its own API and through large cloud platforms, on more than one kind of accelerator hardware. Requests are routed to servers, and the code that turns the model scores into the chosen token runs on that hardware. Quality is checked with evaluations and with reports from users.

## Timeline as reported
- Early in August 2025 a routing error began sending a small share of requests to servers set up for a different context window length. The share grew after a load balancing change at the end of the month.
- A configuration change on some accelerators caused the wrong tokens to be chosen occasionally, so a few answers contained odd characters or broken code.
- A third bug involved a compiler optimisation that could drop the best candidate when the top tokens were selected, and it only appeared on some hardware and batch sizes.
- Because each bug affected a different set of requests, user reports looked inconsistent, and routine evaluations did not show a clear drop.
- Engineers rolled back and fixed the three problems one by one during September and published a detailed account.

## Root cause
Three independent faults overlapped, and quality checks were not sensitive enough or run on the real production path, so each fault was hard to see and to tell apart from random variation.

## What changed
- Anthropic said it would run more sensitive evaluations continuously on real production systems.
- It said it would add tooling to debug reports from users while keeping private conversations protected.
- It also described fixing the routing, configuration and compiler issues directly.

## Lessons learned
- Run your own quality checks against the production path, not only against a test setup.
- Keep traces that show the model version, route, parameters and stop reason for each answer.
- When reports look inconsistent, suspect several overlapping causes before blaming the prompt.
- Roll changes to routing and numerics out in small steps and compare quality between slices.

## Trade-offs to weigh
- **Privacy against debuggability.** Reading user conversations explains quality problems, but needs strict controls.
- **Hardware variety against simplicity.** More platforms add capacity and more combinations to test.
- **Fast releases against careful checks.** Frequent changes need checks that are cheap to run and sensitive enough to matter.

## Try the calculators
In the error budget calculator, see how much room a quality target leaves when part of your traffic is affected. In the redundancy calculator, see why identical copies on one platform fail together.
