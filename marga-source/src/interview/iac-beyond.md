## Terraform versus OpenTofu?
level: mid
They share syntax and most providers. OpenTofu is open source and community governed. I check licence, support and features before choosing, and avoid mixing them in one state.

## When is Pulumi a good fit?
level: mid
When a team prefers a real language with loops, tests and types, and wants to share logic with application code. The trade-off is more power and less uniformity.

## How do you structure many environments?
level: mid
Reusable versioned modules plus a thin layer per environment, such as Terragrunt, with separate state per environment and account. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you test IaC?
level: mid
Static checks and validation, plan tests with the native test framework, policy tests, and a few integration tests in a disposable account. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## What is drift and how do you handle it?
level: junior
Real resources differing from code. I run scheduled plans, alert on differences and either revert or codify the change. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you migrate state safely?
level: senior
Back up the state, use import or moved blocks, run a plan that shows no changes, and apply during a quiet period with locking on.
