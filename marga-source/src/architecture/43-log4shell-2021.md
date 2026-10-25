# Log4Shell vulnerability response, December 2021
company: Apache Software Foundation and industry
date: 9 December 2021
modules: security, cicd, sre
calc: error-budget, retries
source: CISA: Apache Log4j vulnerability guidance | https://www.cisa.gov/news-events/news/apache-log4j-vulnerability-guidance
summary: A flaw in a widely used logging library allowed remote code execution through a log message, and every organisation had to find out where they used it.

## Before you read on
A new flaw is announced in a library that logs every request. How quickly could you find every service that uses it, including indirect use?

## The system
Log4j is a Java logging library used in a huge number of applications and products. It supported a feature that looked up values, including remote ones, inside log messages. Many applications log text that an outside user controls, such as a header.

## Timeline as reported
- A security researcher reported the flaw to the Apache Software Foundation, and a fix was prepared.
- On 9 December 2021, a proof of concept became public and the flaw, CVE-2021-44228, was announced. It was rated at the highest severity.
- Attackers began scanning the internet within hours and used the flaw to run code, install miners, and open a way into networks.
- Organisations had to find where the library was used: in their own code, in products from vendors, and inside other libraries.
- Several follow-up fixes were needed as further problems were found, and the work went on for weeks and, in some places, for months.

## Root cause
A dangerous feature enabled by default in a library that logs untrusted data, in a software ecosystem where few organisations knew what they used.

## What changed
- The project removed the feature from default use, and released fixes in a series of versions.
- The industry started to ask for software bills of materials, and many teams began to track dependencies, including indirect ones.

## Lessons learned
- Keep a current inventory of dependencies, with an SBOM per release, so you can answer "are we affected" in minutes.
- Prefer safe defaults, and turn off features that you do not need in libraries.
- Do not treat user-controlled data as safe, even in logs.
- Have a prepared procedure for emergency patches with mitigations as a fallback, such as web firewall rules and configuration flags.

## Trade-offs to weigh
- **Powerful features against safe defaults.** A feature that fetches remote data is powerful, and unsafe if it is on for untrusted input.
- **Shared libraries against self-written code.** Sharing saves effort, and one flaw reaches everyone.
- **Patch fast against patch safely.** A rushed upgrade can break an application. A slow one leaves it open to active attack.

## Try the calculators
In the error budget calculator, think about how a security objective could be expressed as time to patch. In the retries calculator, see how repeated attacker attempts add load to your services.
