# The xz Utils backdoor, March 2024
company: xz Utils project
date: 29 March 2024
modules: linux, security, cicd
calc: error-budget, recovery
source: CISA alert on the xz Utils compromise | https://www.cisa.gov/news-events/alerts/2024/03/29/reported-supply-chain-compromise-affecting-xz-utils-data-compression-library-cve-2024-3094
summary: A maintainer account added a hidden backdoor to a compression library through its release tarballs, and a developer found it by chance when SSH logins became slower.

## Before you read on
A small library, maintained by one tired volunteer, is used by many large systems. What would make you trust a new co-maintainer?

## The system
xz Utils is a compression library found in nearly every Linux distribution. Some distributions patch the SSH daemon so that it links the library through a system service integration, which put xz code in the same process as SSH.

## Timeline as reported
- Over about two years, an account using the name Jia Tan became a trusted contributor, and later a maintainer of the project, as the original maintainer faced pressure and had little time.
- In early 2024, the new maintainer released versions 5.6.0 and 5.6.1. The release archives contained extra build scripts, not present in the source repository, that inserted a backdoor during the build.
- The backdoor changed the behaviour of SSH authentication on some systems, so that a holder of a certain key could run commands.
- On 29 March 2024, a Microsoft engineer, Andres Freund, saw that SSH logins used more CPU than expected, investigated, and reported it to the security list.
- The compromised versions were in a few distributions in testing, and had not yet reached most stable releases. Packages were reverted within hours.

## Root cause
A long social engineering effort against an under-resourced maintainer, and release tarballs that differed from the source in the repository and were not checked.

## What changed
- Distributions reverted to earlier versions, and the project moved under new maintainership with more review.
- The industry started to look at funding of maintainers, reproducible release builds, and comparing release archives with the repository.

## Lessons learned
- Compare release artifacts with the source repository, and prefer reproducible builds.
- Fund and support maintainers of critical libraries, so that pressure cannot be used against them.
- Reduce what is linked into sensitive daemons such as SSH.
- Watch performance and behaviour anomalies. A small slowdown was the signal that exposed this one.

## Trade-offs to weigh
- **Open contribution against trust.** Open projects need new maintainers. Each new maintainer is also an attack surface.
- **Release tarballs against repository builds.** Tarballs are convenient. Building from the repository makes differences visible.
- **Hardening of SSH against convenience.** Linking extra libraries into the daemon adds convenience and attack paths.

## Try the calculators
In the error budget calculator, think of how long a hidden flaw might have been present compared with your objective. In the backup, RTO and RPO calculator, see how long a rebuild of trusted systems takes.
