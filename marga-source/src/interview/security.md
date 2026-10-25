## What does "shift left" mean in DevSecOps?
level: junior
It means moving security checks earlier in the delivery process, so problems are found while code is being written and reviewed rather than after release. Examples are secret scanning in a pre-commit hook, dependency and code scanning on each pull request, and infrastructure scanning before apply. It does not remove the need for monitoring and incident response in production, because some issues only appear there.

## What is the difference between SAST, DAST and SCA?
level: junior
SAST analyses source code without running it and finds unsafe patterns. DAST tests a running application from the outside and finds issues such as missing security headers or injection that works at run time. SCA, software composition analysis, inspects third-party libraries and reports known vulnerabilities and licences. They complement each other, so most pipelines use all three.

## A developer committed an API key to a repository. What do you do?
level: junior
Treat the key as compromised. Revoke or rotate it first, then check the provider's audit logs for use between the leak and the rotation. Remove it from the code and, where feasible, from history, but understand that cleanup does not make an exposed key safe. Finally find the cause and add a control, such as a pre-commit scanner, a pull request check, or a move to short-lived credentials.

## How do you manage secrets for applications in Kubernetes?
level: mid
Kubernetes Secrets are base64 encoded, so enable encryption at rest and restrict access with RBAC. Better, keep the source of truth in an external store such as a cloud secrets manager or Vault, and sync or mount values at run time with an operator or CSI driver. Use workload identity so pods get short-lived credentials without static keys, and rotate regularly.

## What is an SBOM and why does it matter?
level: mid
A software bill of materials lists the components and versions inside an artifact. When a new vulnerability is announced, you can search stored SBOMs to see which services are affected within minutes. Generate one at build time, store it with the artifact, and consider signing it as an attestation so consumers can trust it.

## How would you secure a CI/CD pipeline?
level: mid
Give each job a narrow, short-lived identity, for example through OIDC, instead of shared long-lived secrets. Use isolated, ephemeral runners. Protect the main branch with required reviews and checks, and restrict who can change pipeline definitions. Pin third-party actions and base images by digest, never expose secrets to builds from untrusted forks, scan code, dependencies and images, and sign artifacts so that deployment verifies them.

## What would you check first when asked to assess the security of a Kubernetes cluster?
level: senior
I would look at identity and exposure: who holds cluster-admin and which service accounts have broad roles, whether the API server and kubelet are reachable from the internet, and whether audit logging is on. Next, workload settings: privileged pods, host paths, root users and missing limits, and whether Pod Security admission is enforced. Then network policy coverage, secret handling, image provenance and node patch levels. Finally runtime detection and an incident plan. I would produce prioritised findings with owners.

## How do you prioritise a backlog of thousands of vulnerability findings?
level: senior
I combine severity with context: is the component reachable and loaded, is the service exposed, is there an exploit in active use, and what data is involved. I fix exploited and exposed issues first, group the rest by shared base images or libraries to fix many at once, and automate updates for routine patches. I agree service levels by severity, report time to fix, and use expiring, owned exceptions for items we accept.

## Explain how you would respond to a suspected compromise of a production server.
level: senior
Confirm and scope the event, then contain: isolate the host from the network and disable any credentials it held, while preserving a disk snapshot and memory capture for evidence. Investigate with logs to find the entry point and lateral movement, rotate secrets, rebuild from a known good image rather than cleaning in place, and restore service. Keep a timeline, limit the incident channel, involve legal staff if personal data may be affected, and run a blameless review that produces control changes.

## What is the difference between authentication and authorization, and where do teams get it wrong?
level: junior
Authentication proves who the caller is. Authorization decides what that caller may do with a specific action or object. Teams often check only that a user is logged in, so changing an identifier in a request returns somebody else's data. Authorization must be enforced on the server for every object.

## How do OAuth 2.0 and OpenID Connect relate?
level: mid
OAuth 2.0 is about delegated authorization: an application receives a token with limited scope to act on a user's behalf. OpenID Connect adds an authentication layer on top, with an ID token that tells the application who the user is. Validate signature, issuer, audience and expiry, keep access tokens short-lived, and request the smallest scope.

## What does zero trust mean in practice?
level: mid
It means no request is trusted because of its network location. Every request is authenticated and authorized using identity, device state and policy, access is least privilege and time-limited, the network is segmented, and every decision is logged. You start with administrator and production access rather than trying to change everything at once.

## How would you roll out a policy that blocks risky Kubernetes pods?
level: mid
I would write it as code, start in audit mode to list violations, work with owning teams to fix them or grant exceptions that have an owner, reason and expiry, then enforce in stages by namespace or environment. I would keep the policy in version control, test it in the pipeline, and report violations over time.

## How do you protect backups against ransomware?
level: senior
Follow 3-2-1, and make at least one copy immutable with a retention lock and one isolated in a separate account with separate credentials and multi-factor authentication. Alert on deletions and retention changes, encrypt with keys managed separately, and test restores against RTO and RPO. Keep the recovery runbook offline and recover in order: identity and DNS, network, data, applications, users.

## An internal service has no authentication because it is on a private network. What is your view?
level: senior
Network location is weak proof of identity, because one compromised host or a request forgery flaw reaches everything inside. I would add service identity with mutual TLS or workload identity, authorize each caller, segment the network, filter egress, and log access. Doing this for the most sensitive services first is practical.
