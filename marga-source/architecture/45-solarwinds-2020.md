# SolarWinds build system compromise, 2020
company: SolarWinds
date: September 2019 to December 2020
modules: cicd, security, sre
calc: error-budget, recovery
source: CISA: Emergency Directive 21-01, Mitigate SolarWinds Orion Code Compromise | https://www.cisa.gov/news-events/directives/ed-21-01-mitigate-solarwinds-orion-code-compromise
summary: Attackers inserted code into the build of a widely used network management product, and the signed update reached thousands of customers.

## Before you read on
Your build system produces a signed update that customers trust. If an attacker could change the code inside the build, how would anybody notice?

## The system
SolarWinds sold Orion, a network monitoring product that runs with high privileges in customer networks. Updates were built by the company's build system, signed, and distributed to customers.

## Timeline as reported
- As reported by the company and investigators, attackers got into the network of the company in 2019 and studied its build environment.
- They tested the technique, and in early 2020 they put malicious code into the build process, so that it was added to the product during compilation, not in the source repository.
- The product was signed with the company's valid certificate and was delivered as a normal update to about 18,000 customers.
- The backdoor stayed quiet for a time, and was then used against a small number of high-value targets, including government agencies and technology companies.
- In December 2020, a security company that had itself been attacked found the link to the update. Customers were told to isolate or remove the product, and authorities issued directives.

## Root cause
The build environment was compromised and its output was not independently verified, so a signed artifact could contain code that was never in the source.

## What changed
- SolarWinds changed its build process, with more isolation and checks, and made its builds more reproducible.
- The event pushed the industry to supply chain frameworks such as SLSA, and to government guidance on software supply chain security.

## Lessons learned
- Harden and isolate the build system as a production system, with short-lived builders and monitored access.
- Aim for reproducible builds and provenance, so that the output can be compared with the source.
- Segment management software so that one product does not have wide access to the whole network.
- Watch for unusual behaviour from trusted software, such as new outbound connections.

## Trade-offs to weigh
- **Trust in the vendor against verification.** Customers trust updates by default. Verification needs reproducible builds and provenance.
- **Fast builds against hardened builds.** A shared build server is efficient. An isolated, ephemeral build is harder to tamper with.
- **Signing against attestation.** A signature shows who released an artifact, and does not show how it was built.

## Try the calculators
In the error budget calculator, consider how long a compromise could stay undetected compared with your objectives. In the backup, RTO and RPO calculator, see how rebuilding trusted systems from scratch takes time.
