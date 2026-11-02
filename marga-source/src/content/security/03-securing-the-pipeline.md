---
title: Securing the delivery pipeline and supply chain
minutes: 18
summary: Add dependency, code and image scanning to CI, produce an inventory of what you ship, sign artifacts, and protect the pipeline itself as a target.
---

A modern application is mostly other people's code. A typical service pulls in hundreds of libraries, each with its own dependencies, plus a base image, a build tool and a CI runner. An attacker does not need to break your code if they can slip something into any of those. The pipeline is also powerful: it holds credentials and can deploy to production. Securing delivery means checking what goes in, proving what comes out, and hardening the machinery in between.

## What you will learn

- The kinds of automated scans and what each finds
- Software bills of materials and artifact signing
- How to make scans useful rather than noisy
- Protecting the pipeline: runners, permissions and branches
- A way to describe supply chain maturity

## The scanning toolbox

| Check | Short name | Looks at | Finds | When it runs |
|-------|-----------|----------|-------|--------------|
| Static analysis | SAST | Your source code | Injection patterns, unsafe functions | Pull request |
| Dependency analysis | SCA | Libraries and versions | Known vulnerabilities, risky licences | Pull request and nightly |
| Secret scanning | | Code and history | Leaked keys and tokens | Pre-commit and pull request |
| Infrastructure as code scanning | IaC | Terraform, manifests | Open firewalls, public buckets | Pull request |
| Image scanning | | Container image | Vulnerable OS and library packages | Build and registry |
| Dynamic testing | DAST | A running test copy | Runtime issues such as missing headers | After deploy to test |

No single tool covers everything. Pick one per category and wire it into the same place engineers already look, the pull request.

```console
$ trivy fs --severity HIGH,CRITICAL --exit-code 1 .
$ trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 registry.example.com/shop-api:1.8.2
```

## Make scanning useful

Thousands of findings are the same as none, because people stop reading. Four habits help:

- **Gate on severity and fixability.** Fail the build on critical and high findings that have a fix available. Track the rest as tickets.
- **Allow an expiring exception.** A suppressed finding needs an owner, a reason and a date, so exceptions do not become permanent.
- **Scan on a schedule, too.** A library that was clean at build time can have a new advisory next week.
- **Measure time to fix,** not the number of findings.

## Know what you ship: SBOM

A **software bill of materials** (SBOM) lists every component in an artifact, with versions. When a new vulnerability in a popular library is announced, the question "are we affected?" should take a query, not a week. Generate an SBOM at build time, store it next to the artifact, and index it so that you can search across all services.

## Prove where it came from: signing and provenance

Signing an image with a tool such as Cosign ties it to an identity. **Provenance** records how it was built: which source, which builder, which inputs. The deployment side then verifies the signature and refuses anything unsigned. The SLSA framework describes levels of assurance, from simple scripted builds to hermetic, tamper-resistant builds with verified provenance.

```predict
Q: A pipeline pulls base image node:latest at build time and the registry tag was updated overnight. Two builds from the same commit run a day apart. Are the images guaranteed to be the same?
???
No. The tag latest moved, so the base layers may differ, and so may the vulnerabilities.
> Mutable tags break reproducibility. Pin the base image by version and digest, and let an automated update tool propose changes through pull requests.
```

## Protect the pipeline itself

- **Least privilege for jobs.** A test job needs no deploy rights. Give each job its own narrow, short-lived identity.
- **Isolated, ephemeral runners.** Build on fresh machines that are destroyed after the job, so one job cannot leave something for the next.
- **Protected branches and reviews.** Require review and passing checks before merge. Limit who can change the pipeline definition, because that file is code with production access.
- **Pin third-party actions and plugins** to exact versions or digests. A tag can be moved by its owner.
- **Treat pull requests from forks as untrusted.** Do not expose secrets to them.

> **Danger:** Never run untrusted code, such as a pull request from an outside fork, on a runner that holds production credentials.

## Incident: a poisoned dependency

> **Incident:** A build starts to fail on a new check. A routine update pulled in version 4.1.2 of a small, popular library. Its install script now sends the contents of environment variables to a remote host.

Because the team keeps an SBOM for each release, the first question is easy to answer:

```console
$ grep -l '"name": "tiny-utils"' sboms/*.json
sboms/billing-2.8.0.json
sboms/checkout-5.2.1.json
```

Two services are affected. Pin the previous version, rotate every secret that was available to those builds, rebuild from a clean runner, and add a rule that new versions of dependencies wait a few days before they are accepted.

## Common mistakes

- Using the latest tag for base images and tools
- Running the whole pipeline with one powerful shared credential
- Turning scanners on in report-only mode forever
- Trusting a dependency because it is popular

```quiz
Q: What is the main purpose of an SBOM?
- To speed up the build
+ To list every component in an artifact so you can answer "are we affected?" when a vulnerability is announced
- To encrypt the image
- To replace tests
> Without an inventory, finding affected services after an advisory is slow and error-prone.

Q: Which scan checks Terraform files for an open firewall or public bucket?
- DAST
- SCA
+ Infrastructure as code scanning
- Load testing
> IaC scanners read the configuration before it is applied, so the issue is caught in the pull request.

Q: Why pin a base image by digest?
- It makes the image smaller
+ The content cannot change under the same reference, so builds are reproducible
- It disables scanning
- It speeds up pulls
> A tag can be moved to different content. A digest identifies exactly one image.

Q: What is a sensible policy for scan failures?
- Fail on every finding of any severity
- Never fail the build
+ Fail on critical and high findings that have a fix, and track the rest with owners and dates
- Delete the scanner
> A gate people can act on is enforced. One that always fails is bypassed, and one that never fails is ignored.
```

```cards
SAST vs DAST? :: SAST reads the source code; DAST tests a running application
What is SCA? :: Software composition analysis: finding known vulnerabilities in dependencies
What does Cosign do? :: Signs and verifies container images and other artifacts
What is provenance? :: A record of how, where and from what an artifact was built
Why scan on a schedule? :: New advisories appear for libraries that were clean at build time
```
