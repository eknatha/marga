---
title: The DevSecOps mindset and threat modeling
minutes: 15
summary: Move security into every stage of delivery, learn the vocabulary of risk, and use a simple threat model to find problems before attackers do.
---

A team ships a feature every day. Once a quarter a security group reviews the system, writes a long list of findings, and the release slips by a month. Nobody is happy, and the next quarter looks the same. DevSecOps replaces that pattern. Security checks run automatically in the same pipeline as tests, and engineers learn to think like an attacker while they design, not after the code is live.

## What you will learn

- What "shift left" means and why it is not the whole story
- Core terms: asset, threat, vulnerability, risk, control
- The shared responsibility model for cloud and containers
- A short threat modeling routine using STRIDE
- Least privilege and defence in depth as design habits

## Shift left, and keep watching on the right

"Shift left" means catching problems early in the lifecycle: in the editor, in a pull request, in the build. A flaw found in a design review costs minutes. The same flaw found after a breach costs months. But early checks cannot see everything, because some problems only appear in production: a new vulnerability in a library you already run, a misconfigured firewall, a stolen credential. So a mature programme does both: automated checks on the left, and monitoring, patching and incident response on the right.

## The vocabulary of risk

| Term | Meaning | Example |
|------|---------|---------|
| Asset | Something worth protecting | Customer database, signing key |
| Threat | Something that could cause harm | An attacker who steals a token |
| Vulnerability | A weakness that a threat can use | An unpatched library, an open port |
| Risk | Likelihood times impact | A public bucket with personal data |
| Control | A measure that reduces risk | Encryption, a firewall rule, a scan |

You never remove all risk. You rank it, reduce the biggest items first, and write down the ones you accept.

## Shared responsibility

A provider secures the layers it runs, and you secure what you put on top. With a virtual machine you patch the operating system. With a managed database you configure access and backups but not the host. With containers you own the image contents and the settings of the workload. When something is misconfigured, it is almost always on the customer side of this line, which is why configuration scanning matters so much.

## A simple threat model with STRIDE

Threat modeling is a structured conversation about what can go wrong. Draw the system as boxes and arrows: users, services, data stores, and the trust boundaries between them, such as the internet to your load balancer. Then walk each arrow and box and ask the six STRIDE questions.

| Letter | Threat | Question to ask | Typical control |
|--------|--------|-----------------|-----------------|
| S | Spoofing | Can someone pretend to be another user or service? | Strong authentication, mutual TLS |
| T | Tampering | Can data be changed in transit or at rest? | Signatures, integrity checks, TLS |
| R | Repudiation | Can someone deny an action? | Audit logs with identity and time |
| I | Information disclosure | Can data leak? | Encryption, access control |
| D | Denial of service | Can the service be made unavailable? | Rate limits, autoscaling, quotas |
| E | Elevation of privilege | Can a user gain rights they should not have? | Least privilege, input validation |

Write each finding as a ticket with an owner. A one-hour session for each significant change finds more than a large annual review.

```diagram
title: Where the trust boundaries are in a simple web service
node: user | Browser | 0 | 1 | The person using the service. Everything coming from here is untrusted input. | If a user account is stolen, the attacker acts as that user. Rate limits and strong sign-in limit the damage.
node: edge | Load balancer and WAF | 1 | 1 | Terminates TLS and filters common attacks before they reach the application. | If it fails open, attacks reach the application directly. If it fails closed, users see an outage.
node: app | Application | 2 | 1 | Business logic. It checks who the caller is and what they may do. | A flaw such as injection here exposes the data store, because the application holds the database credentials.
node: db | Database | 3 | 1 | Holds the assets: customer records. | If the database is reachable from the internet or uses a shared password, one stolen secret exposes everything.
node: secrets | Secrets manager | 2 | 0 | Hands short-lived credentials to the application at start-up. | If it is unavailable, new instances cannot start. If it is over-permissive, any workload can read every secret.
edge: user | edge
edge: edge | app
edge: app | db
edge: app | secrets
```

## Least privilege and defence in depth

**Least privilege** means each person, service and pipeline gets only the permissions it needs, for only as long as it needs them. **Defence in depth** means no single control is trusted alone: if the firewall fails, authentication still holds, and if that fails, the data is still encrypted. Together these two habits shrink the blast radius of any mistake, which is the same idea reliability engineers use for failures.

## Incident: the review that found the hole too late

> **Incident:** A reporting service was designed, built and demoed in six weeks. In the pre-release security review, an engineer asks how the service reaches the customer database. The answer: through a shared administrator login that is stored in the code.

A short threat model at design time would have drawn the arrow from the application to the database and asked the Spoofing and Elevation questions. The review now forces a rewrite in the last week. Compare the cost of the two paths:

```console
$ grep -rn "DB_ADMIN_PASSWORD" src/ | head -3
src/report/db.py:12:DB_ADMIN_PASSWORD = "Summer2024!"
src/report/settings.py:4:DB_ADMIN_PASSWORD = os.getenv("DB_ADMIN_PASSWORD", "Summer2024!")
```

The fix is a database role limited to the reports it needs, with its password delivered at start-up. Doing that in the design review takes an hour. Doing it a week before release takes a week and delays the launch.

## Common mistakes

- Treating security as a gate at the end instead of a check in every pull request
- Scanning everything, then ignoring the results because there are thousands of findings
- Giving the pipeline an administrator account because it is easier
- Writing a threat model once and never updating it when the design changes

```quiz
Q: What does "shift left" mean?
- Moving security staff to a different building
+ Running security checks earlier in the lifecycle, such as in the editor, pull request and build
- Removing security reviews completely
- Doing all testing only in production
> Earlier checks are cheaper to fix. They still need monitoring on the right, because some problems only show up in production.

Q: Which STRIDE category describes someone pretending to be another user?
+ Spoofing
- Tampering
- Repudiation
- Denial of service
> Spoofing is about identity. Strong authentication and mutual TLS are typical controls.

Q: Under the shared responsibility model, who is normally responsible for the contents of a container image you deploy?
- The cloud provider
- The registry operator
+ You, the customer
- The kernel maintainers
> The provider secures the platform. You own what you put on it, including the image packages and the workload settings.

Q: What is the best description of least privilege?
- Everyone gets read access to everything
+ Each identity gets only the permissions it needs, for only as long as it needs them
- Only administrators can deploy
- Passwords are rotated every day
> Least privilege limits what an attacker can do with any single stolen identity.
```

```cards
What is shift left? :: Running security checks early, such as in pull requests and builds, while still monitoring in production
What does STRIDE stand for? :: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege
Risk is likelihood times what? :: Impact
What is a trust boundary? :: A line where data moves between parts of the system with different levels of trust, such as internet to load balancer
What is defence in depth? :: Layering controls so that no single failure exposes the asset
```
