## Secure the pipeline: secrets, dependencies and images
level: Intermediate
hours: 4
modules: cicd, security, docker
summary: Add secret scanning, dependency checks, image scanning and a signed, traceable build to a pipeline.
goal: Stop leaks and known-vulnerable code before they reach production.
build: A pipeline with a secret scan, a dependency audit, an image scan with a severity gate, an SBOM and a signature on the published image.
steps:
- Add a secret scanner to run on every change and on full history once, and fix or rotate anything it finds.
- Add a dependency audit that fails the build on a high severity with a fix available.
- Build the image from a pinned, minimal base and run an image scan with a severity gate.
- Generate a software bill of materials and store it with the build.
- Sign the image with keyless or key-based signing and record its digest.
- Use short-lived credentials for the registry and cloud (workload identity) instead of stored keys.
- Plant a fake secret in a test branch and confirm the pipeline blocks it, then show how you would rotate a real one.
check:
- A secret in a change stops the pipeline.
- A known vulnerable dependency stops the pipeline until updated or excepted with an expiry.
- The deployed image digest matches the signed image.
- No long-lived cloud key is stored in the pipeline.
stretch: Add a rule so that only signed images from your pipeline can run in the cluster.

## Harden containers and Kubernetes workloads
level: Intermediate
hours: 4
modules: kubernetes, docker, security
summary: Apply least privilege to a workload with a security context, network policy, admission rules and scoped service account.
goal: Make a compromised container as useless to an attacker as possible.
build: A hardened Deployment, a default-deny network policy with explicit allows, a restricted service account and admission policies that reject unsafe Pods.
steps:
- Run the workload as non-root with a read-only root filesystem, no privilege escalation and all capabilities dropped.
- Enable the Pod Security restricted profile on the namespace and fix every warning it produces.
- Create a default-deny ingress and egress network policy, then allow only the paths the app needs.
- Give the Pod its own service account with no token mounted unless needed, and a role limited to what it calls.
- Store secrets outside the manifest and reference them, never in an image layer or a plain ConfigMap.
- Add an admission policy that rejects privileged Pods and images from unknown registries, and test it with a dry run.
- Try to break out: attempt to write to the filesystem, reach another namespace and read the service account token, and record each denial.
check:
- The Pod runs without root, without extra capabilities and with a read-only filesystem.
- Traffic that was not explicitly allowed is blocked.
- A privileged Pod is rejected with a clear message.
- You can state what an attacker can still do from inside the container.
stretch: Add runtime detection that alerts when a shell starts in the container.

## Enforce policy as code on infrastructure changes
level: Advanced
hours: 4
modules: terraform, security, cicd
summary: Check Terraform plans against written rules in the pipeline so unsafe changes cannot be merged.
goal: Turn security standards into automatic checks, with exceptions that expire.
build: A set of policy rules, a pipeline step that evaluates the plan, tests for the rules and a documented exception process.
steps:
- Write down five rules in plain language, such as no public storage, no open SSH, encryption required, required tags and no wildcard permissions.
- Express each rule as code with a policy engine and write a passing and a failing example for each.
- Generate a machine-readable plan with `terraform show -json` and run the policy checks against it in the pipeline.
- Make failures readable: each message states the rule, the resource and how to fix it.
- Run the policies against existing infrastructure to find current violations and plan remediation.
- Create an exception mechanism with an owner, a reason and an expiry date, and fail the build when an exception expires.
- Open a deliberately unsafe change and show the pipeline rejecting it.
check:
- Every rule has a test that proves it blocks the bad case and allows the good one.
- The pipeline blocks a plan that opens a database to the internet.
- Exceptions expire and are visible in a list.
- A developer can fix a failure from the message alone.
stretch: Add a drift detector that reports resources changed outside code.

## Detect, respond and recover
level: Advanced
hours: 5
modules: security, observability, cloud
summary: Collect audit logs, alert on suspicious actions, run a leaked key drill and restore from an immutable backup.
goal: Prove you can notice an attack, contain it, and recover without paying anyone.
build: Central audit logging, detection rules, a containment runbook, a key rotation drill and a restore test from a protected backup.
steps:
- Turn on cloud audit logs and cluster audit logs, and send them to a separate, write-protected store.
- Write three detections, such as a root login, a new access key created, and a policy changed to allow everything.
- Plant a fake leaked key, watch the detection fire, and follow your runbook: disable the key, review its activity, rotate it, and clean the source.
- Preserve evidence before containment: snapshot a disk and copy logs, then isolate the host with a restrictive rule.
- Create an immutable, separate-account backup of important data with a retention lock.
- Delete the data in a test environment and restore it from the backup, recording the time taken.
- Write a one-page response plan: who decides, who communicates, what is restored first (identity, then data, then apps).
check:
- Audit logs cannot be altered by the accounts they record.
- Each detection fired during your drill and led to a documented action.
- A restore from the protected backup worked and was timed.
- The response plan names roles and an order for recovery.
stretch: Run the whole exercise as an unannounced drill for a colleague and review it together.
