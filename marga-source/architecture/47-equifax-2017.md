# Equifax data breach, 2017
company: Equifax
date: May to July 2017
modules: linux, security, sre
calc: error-budget, redundancy
source: US Government Accountability Office report on the Equifax breach | https://www.gao.gov/products/gao-18-559
summary: An unpatched web framework vulnerability on an internet-facing system, and an expired certificate on a monitoring tool, allowed attackers to take data about about 147 million people.

## Before you read on
A critical patch was announced for a library that you use. Who checks that every system that uses it was in fact patched?

## The system
Equifax operated a consumer dispute web portal, built on the Apache Struts framework. The company had tools to scan for vulnerabilities and to inspect network traffic, and a process for patching systems after an alert.

## Timeline as reported
- In March 2017, a critical flaw in Apache Struts was announced, with a fix, and the company was told to patch it.
- As reported by the GAO, the notification went through the usual channels, but the portal was not found by the scan and was not patched.
- In May, attackers used the flaw to run commands on the portal and found credentials, which let them move to other databases.
- They took data over about 76 days in small pieces. A tool that inspects encrypted traffic had an expired certificate for about 19 months, so it did not see the data leave.
- In late July, the certificate was renewed and the unusual traffic became visible. The company found the problem, shut the access, and announced the breach in September.

## Root cause
A patch process that depended on a notification and a scan that missed an asset, flat network access once inside, and a monitoring tool that was not working.

## What changed
- The company invested heavily in security, replaced leaders, rebuilt its patching and monitoring, and agreed to a large settlement.
- Regulators and customers asked for better inventories of assets, and for checks that security tools work.

## Lessons learned
- Keep a complete inventory of internet-facing assets and verify that each critical patch is applied, with a deadline.
- Monitor your monitoring: alert when a security tool stops working, or when its certificate is about to expire.
- Segment the network and limit credentials, so a breach of one system does not reach the databases.
- Limit and watch how much data can leave in a short time.

## Trade-offs to weigh
- **Decentralised patching against central.** Teams know their systems. A central inventory is the only way to be sure nothing was missed.
- **Network segmentation against convenience.** A flat network is easy to run, and it let the attacker move.
- **Inspecting encrypted traffic.** The tool helps detection, and its certificate is a thing that someone must keep valid.

## Try the calculators
In the error budget calculator, think about a patch time objective such as 48 hours and how it would have changed the outcome. In the redundancy calculator, ask whether a second, independent detection tool would have helped.
