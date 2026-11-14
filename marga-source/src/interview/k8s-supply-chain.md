## What is the software supply chain?
level: junior
Everything between a developer and a running workload: source, dependencies, build, registry, deployment. An attacker can tamper at any step. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## What does SLSA add?
level: mid
Levels that describe build integrity: scripted builds, hosted builders, and signed provenance that can be verified before deployment. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you enforce image signatures?
level: mid
Sign in CI with cosign, then use an admission policy such as Kyverno or the policy controller to reject unsigned images, starting in audit mode.

## SBOM versus scanner?
level: junior
An SBOM lists contents once at build. A scanner matches them to known vulnerabilities, so you can re-scan old SBOMs when new CVEs appear. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## How do you detect runtime attacks?
level: mid
Falco rules on syscalls and audit events, sent to an alerting system, plus tuning to remove noise and a runbook for each alert. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.

## When do you use sandboxed runtimes?
level: senior
For untrusted or multi-tenant code where a kernel escape is a real risk, accepting some performance cost and compatibility limits. I explain the trade-off, give a concrete example from my own work and say how I would check that the change really worked.
