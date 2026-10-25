## Equifax breach
company: Equifax
year: 2017
area: Security
modules: linux, cloud, sre, security
source: US GAO report | https://www.gao.gov/products/gao-18-559
what: In 2017 attackers stole personal data of about 147 million people from a credit reporting company.
cause: A known flaw in the Apache Struts web framework was not patched on a public web application, and the tool that should have inspected traffic had an expired certificate, so the attack was not seen for months.
fix: The company rebuilt its security programme, improved patching and asset inventory, and paid large settlements.
lesson: Keep an inventory so you know what to patch, patch quickly, and make sure the monitoring itself works.

## Capital One cloud breach
company: Capital One
year: 2019
area: Security
modules: cloud, networking, terraform, security
source: Capital One statement | https://www.capitalone.com/digital/facts2019/
what: In 2019 an attacker obtained data on about 100 million customers from storage buckets in the cloud.
cause: A misconfigured web application firewall allowed a server-side request forgery attack. The attacker used it to reach the instance metadata service and obtain temporary credentials for a role that had much broader access than the application needed.
fix: Capital One fixed the configuration, reduced role permissions, and the cloud industry moved toward the stronger version of the metadata service.
lesson: Give each workload the least privilege it needs, require the protected metadata service, and test your firewall rules.

## SolarWinds supply chain attack
company: SolarWinds
year: 2020
area: Supply chain
modules: cicd, sre, cloud, security
source: US CISA advisory | https://www.cisa.gov/news-events/cybersecurity-advisories/aa20-352a
what: In 2020 attackers added a backdoor to a network management product, Orion, and the compromised update was delivered to thousands of customers, including government agencies.
cause: The attackers broke into the build environment and altered the software during the build. The result was signed with the company's own certificate, so customers trusted it.
fix: The company rebuilt its build system with stronger isolation, and the industry accelerated work on reproducible builds, provenance and the SLSA framework.
lesson: Your build system is a production system. Protect it, verify what comes out of it, and record where each artifact came from.

## Log4Shell
company: Apache Software Foundation
year: 2021
area: Supply chain
modules: cicd, docker, sre, security
source: US CISA guidance | https://www.cisa.gov/news-events/news/apache-log4j-vulnerability-guidance
what: In December 2021 a critical flaw in the Log4j logging library let attackers run code on a server by getting it to log a specially crafted string. A huge number of applications were exposed.
cause: Log4j looked up and expanded certain patterns, including remote lookups, in messages that it logged. Many teams did not know that they used the library, because it was inside other packages.
fix: Fixed versions were released within days, and teams disabled the feature as a stop-gap. Interest in software bills of materials rose sharply.
lesson: Know what is inside your software. A dependency inventory turns a week of searching into an hour.

## Codecov bash uploader
company: Codecov
year: 2021
area: Supply chain
modules: cicd, bash, sre, security
source: Codecov security update | https://about.codecov.io/security-update/
what: In 2021 attackers changed a script that thousands of CI jobs downloaded and ran. For a couple of months it sent environment variables, which often hold secrets, to the attackers.
cause: A mistake in how a Docker image was built exposed credentials. The attackers used them to edit the script that customers fetched on each run.
fix: Codecov fixed the leak and rotated its credentials. Customers rotated all secrets that had been available to the affected jobs and began pinning and checking downloaded scripts.
lesson: Do not pipe a remote script into a shell without checking it. Keep secrets out of environment variables where you can, and limit what each job can see.

## Heartbleed
company: OpenSSL project
year: 2014
area: Security
modules: networking, linux, sre, security
source: Heartbleed information page | https://heartbleed.com/
what: In April 2014 a flaw in OpenSSL's heartbeat feature allowed anyone to read parts of a server's memory, which could include private keys and passwords.
cause: The code did not check that the length a client claimed matched the data it sent, so it returned up to 64 KB of adjacent memory with each request.
fix: Fixed versions were released. Operators patched, then replaced certificates and keys and asked users to change passwords.
lesson: Patching is not enough when keys leaked. Be ready to rotate certificates and secrets quickly.

## left-pad removal
company: npm
year: 2016
area: Supply chain
modules: cicd, python, sre, security
source: npm blog | https://blog.npmjs.org/post/141577284765/kik-left-pad-and-npm
what: In March 2016 a developer removed a tiny package of a few lines from the npm registry. Builds of many popular projects broke within minutes.
cause: Large projects depended on the package through other packages, with no local copy, and the registry allowed authors to remove published versions.
fix: npm restored the package and changed its policy to stop authors from removing packages that others depend on.
lesson: Cache or vendor dependencies, pin versions, and do not assume a registry will always hold the same files.

## xz backdoor
company: xz project
year: 2024
area: Supply chain
modules: linux, cicd, networking, security
source: Openwall security announcement | https://www.openwall.com/lists/oss-security/2024/03/29/4
what: In March 2024 a backdoor was found in the xz compression library. It was designed to let an attacker log in to SSH servers on some Linux distributions.
cause: Someone gained trust as a maintainer over two years and then added hidden code to release tarballs. A developer noticed that SSH logins were about half a second slower than expected and investigated.
fix: The affected versions were withdrawn before they reached most stable releases, and distributions reverted to older versions.
lesson: Small oddities can reveal big problems. Watch performance changes, and treat the maintainers of critical libraries as part of your security model.

## CircleCI security incident
company: CircleCI
year: 2023
area: Security
modules: cicd, cloud, sre, security
source: CircleCI incident report | https://circleci.com/blog/jan-4-2023-incident-report/
what: In January 2023 CircleCI told all customers to rotate every secret stored in the service, because attackers had been able to read them.
cause: Malware on an engineer's laptop stole a session token that was valid even after two-factor authentication. The attacker then used the engineer's access to production systems and customer data.
fix: CircleCI revoked tokens, rotated keys, strengthened access controls and advised customers on rotating secrets.
lesson: Short-lived credentials limit the damage of a leak. Know how you would rotate every secret held by a third party.
