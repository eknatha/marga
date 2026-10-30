---
title: Security and identity by design
minutes: 15
summary: Design for least privilege, short-lived credentials, isolation and recoverable secrets, using how real breaches happened.
---

Security that is added after the design shows up as a list of exceptions. Security that is designed in shows up as boundaries: who can call what, with which credential, for how long, and what a stolen credential can reach. This lesson takes the design view; it does not replace the security and identity modules, it uses them.

## What you will learn

- Draw trust boundaries and design for least privilege
- Prefer short-lived, workload-bound credentials over long-lived keys
- Limit blast radius with isolation and segmentation
- Plan for secret and key compromise, and for detection

## Assume a component will be compromised

Design as if any one component, key or account will eventually be misused, and ask what that gives an attacker. If the answer is "everything", the design has a single point of compromise, just as a shared database is a single point of failure. The goals are the same as reliability: bound the blast radius and shorten recovery.

## Trust boundaries

Draw the boundaries on your diagram: internet to edge, edge to services, service to service, services to data, admin plane to everything. At each boundary decide who may cross, how they prove who they are, and what is checked. Public access to administration is the commonest mistake: Tesla's cloud account was used for cryptomining in 2017 after attackers reached a Kubernetes administration console that had no password, and found cloud credentials inside a pod. See the case file.

## Least privilege

Give each workload only the permissions it needs, on the resources it needs. Wide roles are convenient and expensive. In 2019 an attacker used a server-side request forgery against a misconfigured web application firewall to reach the cloud metadata service, obtained temporary credentials for a role with broad permissions and read data from storage buckets; the case file for Capital One covers this through a published report. Measures that would have narrowed it: restricting the role to what the application needs, enforcing a metadata service version that is harder to abuse, and blocking server-side requests to internal addresses.

## Short-lived, bound credentials

A long-lived key is a standing invitation. In 2014 an Amazon access key posted to a public code-sharing site was used to open Uber's S3 data store; the company found out months later. Prefer credentials that expire in minutes or hours, are issued to a workload identity rather than copied into configuration, and are scoped to the task. Scan for secrets in repositories and logs, rotate on a schedule, and make revocation fast and tested.

## Segmentation and isolation

Separate environments and accounts (production apart from development), separate data classes, and separate tenants where the risk justifies it. Network policies default to deny. Use separate credentials per cell or per service so one leak does not open everything. Isolation is the security twin of cells and bulkheads.

## Protect the control and support planes

Support tools, admin consoles and CI systems often have wide access and weaker controls. Between 28 September and 17 October 2023 an attacker used a service account credential to access Okta's customer support system and download files, including browser session captures with session tokens; 134 customers had files accessed and 5 had sessions hijacked. Treat support and CI as production: least privilege, strong authentication, short sessions, audit logs, and sanitised uploads.

## Secrets, keys and recovery

Store secrets in a manager, not in code, images or logs. Use envelope encryption so keys are separate from data and can be rotated. Plan the compromise runbook before you need it: how to find where a secret is used, how to rotate it without downtime, how to revoke sessions, how to confirm no one else is using it.

## Detection and audit

Log authentication, authorisation changes, secret access and data export, to a store the application cannot alter. Alert on impossible behaviour: a service account used from a new place, a sudden large read, a new admin. Detection shortens the time attackers have; Uber's key was exposed for months before discovery.

## Supply chain

Dependencies and build systems are part of the design. Pin versions, verify sources, keep a software bill of materials, restrict who can publish, and isolate build credentials. Several case files show how one compromised package or build step reached many victims.

```predict
Q: A service needs to read one bucket. It is given a role that allows full access to all storage in the account. An attacker exploits a flaw in the service. What can they reach, and what is the fix?
???
Every bucket in the account. Scope the role to read only that bucket (and prefix if possible), use short-lived credentials, and add detection for unusual reads.
> The permission set is the blast radius.
```

## How it fails

Long-lived keys in code. One role for everything. Admin interfaces exposed. Support and CI with more access than production. Secrets that cannot be rotated without an outage. Logs that the attacker can edit.

## Incident: A key that opened the data store

> **Incident:** A long-lived access key was published in a public repository and later used to read a data store.

```console
$ aws sts get-caller-identity --profile found-key
{ "UserId": "AKIA...", "Account": "123456789012", "Arn": "arn:aws:iam::123456789012:user/deploy" }
$ aws s3 ls s3://driver-data --profile found-key
2014-05-12 09:14:07   1388190 drivers.csv
```

This is a simulated illustration with invented identifiers. The real Uber incident in May 2014 is in the case file. A design with short-lived workload credentials, scoped permissions, secret scanning and access logging would have limited both the exposure and the time to detect.

## Interview question

"How would you secure service-to-service access in a new platform?" Workload identity with short-lived tokens, mutual authentication, per-service least-privilege policies, default-deny network policy, audit logs, and a rotation and revocation runbook tested in advance.

## Common mistakes

- Long-lived keys in code or images
- One broad role shared by many services
- Exposed admin consoles
- Support and CI tools with wider access than production

```quiz
Q: What does least privilege reduce?
+ What a stolen credential can reach
- The number of services :: Not its effect.
- Network latency :: Not its effect.
- Build times :: Not its effect.
> Correct: What a stolen credential can reach. Re-read the matching lesson section for the full reasoning.

Q: Why prefer short-lived credentials?
+ A leaked one expires quickly and is tied to a workload
- They are easier to type :: Not the reason.
- They never need revocation :: They still can.
- They are free :: Not the reason.
> Correct: A leaked one expires quickly and is tied to a workload. Re-read the matching lesson section for the full reasoning.

Q: What was the failure in the Tesla cloud mining case?
+ An administration console reachable without a password
- A DNS race :: Not this case.
- A full disk :: Not this case.
- A leap second :: Not this case.
> Correct: An administration console reachable without a password. Re-read the matching lesson section for the full reasoning.

Q: Why treat support and CI tools as production?
+ They often hold wide access and attackers target them
- They run the website :: Not the reason.
- They are always public :: Not the reason.
- They have no logs :: Not the reason.
> Correct: They often hold wide access and attackers target them. Re-read the matching lesson section for the full reasoning.
```

```cards
trust boundary :: place where identity and checks change
least privilege :: only the access a task needs
workload identity :: credential issued to a running service
envelope encryption :: data keys protected by a master key
segmentation :: separating environments, accounts and tenants
rotation :: replacing a secret on a schedule or after exposure
```
