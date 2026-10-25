## Token found in a public repository
level: junior
A scanner alert shows a cloud access key in a public repository. The commit is three weeks old.

```text
Finding: AWS access key AKIA...Q7 in config/deploy.env (commit 4be1d2, 21 days ago)
Key status: Active, last used 2 minutes ago from 198.51.100.77
```
? What is the right first action?
+ Deactivate the key now, then review the audit logs for activity from that address and rotate any credentials it could reach
- Delete the file in a new commit and close the alert
- Make the repository private and keep the key
- Wait for the next scheduled rotation
why: The key is active and in use from an address you may not know, so assume that an attacker has it. Deactivation comes before cleanup. Then read the audit logs for what was done, look for new users, roles and instances, and rotate anything the key could read. Removing the file does not remove the key from history or from copies.

## Pipeline job has more rights than it needs
level: mid
A review of the CI system shows that every job uses the same cloud credentials.

```text
Job: run-unit-tests      credentials: deploy-admin (AdministratorAccess)
Job: build-image         credentials: deploy-admin (AdministratorAccess)
Job: deploy-production   credentials: deploy-admin (AdministratorAccess)
Runners: shared, long-lived, also used by pull requests from forks
```
? Which change reduces the risk most?
+ Give each job its own short-lived role with only the rights it needs, and keep untrusted fork builds on separate runners with no credentials
- Rename the credential to something less obvious
- Rotate the credential every year
- Add more runners
why: A unit test job needs no cloud rights, and a fork pull request can run attacker-controlled code. With one administrator credential and shared runners, a single malicious test can take over the account. Separate identities, OIDC exchange for short-lived access, and isolated runners limit the damage.

## Image scan fails the build
level: mid
A pipeline fails on an image scan the day before a release.

```text
$ trivy image --severity HIGH,CRITICAL --exit-code 1 shop/api:2.3
libssl3  3.0.11-1  CRITICAL  CVE-2023-xxxx  fixed in 3.0.13-1
Total: 1 (CRITICAL: 1)
Base image: debian:12.2-slim
```
? What is the best response?
+ Rebuild on an updated base image that has the fixed package, and keep the gate on
- Switch the scanner off for this release
- Add the finding to the permanent ignore list
- Deploy anyway and fix it next quarter
why: A fix exists, and it arrives through a base image update. Rebuilding is cheap and the gate did its job. If a fix did not exist, an exception with an owner, a reason and an expiry date would be the proper route, not a permanent ignore.

## Pod can read secrets it should not
level: senior
After a web pod is compromised, the attacker lists secrets across the namespace.

```text
$ kubectl auth can-i list secrets -n shop --as system:serviceaccount:shop:web
yes
$ kubectl get rolebinding web -n shop -o yaml | grep -A3 roleRef
roleRef: {kind: ClusterRole, name: edit}
```
? What should change?
+ Create a dedicated service account with a narrow Role, remove the edit binding, and stop mounting the API token in pods that do not call the API
- Move the secrets to a ConfigMap
- Rename the namespace
- Increase the pod memory limit
why: The edit role includes access to secrets. A web application rarely needs the Kubernetes API at all. Least privilege and an unmounted token remove the path completely. Moving secrets into a ConfigMap would make things worse.

## Unexpected outbound traffic from a database host
level: senior
A monitoring alert shows a large transfer from a database server to an unknown address at night.

```text
Alert: egress 41 GB to 203.0.113.9:443 between 02:10 and 02:50
Host: db-prod-3, security group egress: 0.0.0.0/0 all ports
CloudTrail: no changes in the last 24h; DB audit log: new user "backup2" created 02:05
```
? What is the best next step?
+ Isolate the host from the network, snapshot it for evidence, disable the new database user and rotate credentials, then investigate how it was created
- Reboot the host to stop the transfer
- Delete the new user and say nothing
- Wait to see whether it happens again
why: This looks like data exfiltration through a new account. Containment and evidence come first: isolate, snapshot, disable. A reboot loses memory evidence. The open egress rule is also a finding: database hosts should reach only what they need.

## Public bucket found by posture scan
level: mid
A weekly cloud posture scan reports a public storage bucket.

```text
Bucket: acme-marketing-assets   Public: yes   Objects: 14,220
Bucket: acme-hr-exports         Public: yes   Objects: 311   Last modified: yesterday
Account-level block public access: off
```
? How should you respond?
+ Turn on block public access for the account, check which objects were read from the access logs, and treat acme-hr-exports as a possible data exposure
- Treat both buckets as equally harmless
- Delete the scan report
- Rename the buckets
why: Marketing assets may be public on purpose. HR exports clearly are not. Enable the account-level block so one wrong setting cannot expose data, and review access logs to know whether anyone downloaded files, because that decides whether you must notify anyone.

## Signature verification blocks a deployment
level: senior
The cluster refuses a deployment after an admission policy was added.

```text
Error from server: admission webhook "verify-images" denied the request:
image registry.example.com/shop/api:1.9 has no valid signature
Pipeline step "sign-image": skipped (flag SKIP_SIGN=1 was set for a hotfix)
```
? What is the right fix?
+ Sign the image in the pipeline and deploy by digest, and keep the policy enforced instead of disabling it
- Disable the admission webhook for the namespace
- Remove the signature check from the policy permanently
- Retag the image as latest
why: The policy did what it was designed to do: it stopped an unsigned artifact. Skipping the signing step in a hotfix defeats the control. Fix the pipeline so signing is quick and mandatory, and deploy the signed digest.
