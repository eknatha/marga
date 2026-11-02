---
title: Cloud security, identity and infrastructure as code
minutes: 18
summary: Design least-privilege identity, protect data with encryption and private networking, turn on audit logging, and check Terraform and cloud accounts for misconfiguration.
---

In the cloud, the control panel is the new perimeter. A single over-broad role or a public storage bucket can expose more data than any network attack. And because infrastructure is created by code, one mistaken template can reproduce the same weakness in fifty accounts. Cloud security is mostly identity, configuration and visibility.

## What you will learn

- Designing least-privilege IAM policies
- Account structure and guardrails
- Encryption and private connectivity
- Logging and detection
- Scanning infrastructure as code and live accounts

## Identity is the perimeter

Use roles that are assumed temporarily rather than users with permanent keys. Give people access through single sign-on with multi-factor authentication, and give workloads their own roles. Build policies from what is needed, not from what is convenient.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject"],
    "Resource": "arn:aws:s3:::shop-reports/monthly/*"
  }]
}
```

This policy allows one action on one prefix. A wildcard policy such as `"Action": "*", "Resource": "*"` lets whoever holds it do anything in the account. Use the access advisor and access analyzer tools to see which permissions are actually used and to trim the rest.

## Accounts, guardrails and separation

Split workloads into separate accounts or subscriptions for production, testing and shared tooling. Apply organisation-wide guardrails that no account administrator can lift, such as blocking public storage, forbidding unapproved regions, and protecting the logging configuration. A blast radius that ends at an account boundary is easy to reason about.

```diagram
title: A request for a private file in a well-configured cloud account
node: user | Signed-in user | 0 | 1 | Authenticated with single sign-on and multi-factor authentication. | If sign-in is weak, an attacker becomes a legitimate user. Multi-factor authentication limits that.
node: role | Workload role | 1 | 1 | The temporary identity of the application. It can read one bucket prefix. | An over-broad role turns any application bug into a data breach.
node: kms | Encryption key | 2 | 0 | Encrypts the data. Use of the key is logged and limited by key policy. | If the key policy is too open, encrypted data gives no real protection.
node: bucket | Private bucket | 2 | 1 | Stores reports. Block public access is on. | A public setting exposes every object to the internet.
node: trail | Audit log | 3 | 1 | Records every API call, in a separate protected account. | If logs can be deleted by the account owner, an attacker removes the evidence.
edge: user | role
edge: role | bucket
edge: kms | bucket
edge: bucket | trail
```

## Protect the data

- **Encrypt at rest and in transit.** Use managed keys, or customer-managed keys when you need separation of duties.
- **Keep data stores private.** Place databases in private subnets and reach cloud services through private endpoints, not the public internet.
- **Block public access at the account level** for object storage, so one wrong bucket setting cannot expose it.
- **Back up and protect backups** with a different account or immutable storage, so ransomware cannot delete both.

## Log, alert, respond

Enable the cloud's audit trail in all regions and send it to a protected account. Alert on high-risk events: root account use, a new access key, a change to logging, a policy that grants public access, or a role with broad rights. Logs that nobody reads do not protect you, and logs that an attacker can erase do not help later.

## Scan before and after deploy

Scan Terraform, Kubernetes manifests and templates in the pull request, with tools such as Checkov, Trivy or tfsec, so that an open security group never reaches production. Then scan live accounts with a posture management tool, because people also change things in the console. Detect drift and either reconcile it or turn the console into read-only for most people.

> **Warning:** Do not put secrets in Terraform variables or state without protection. State files often contain passwords in plain text, so encrypt the backend and restrict access.

## Incident: the wildcard role

> **Incident:** An application with a server-side request forgery bug lets an attacker call the instance metadata service and obtain the role credentials. The role allows every action on every bucket.

With a narrow role the same bug would have exposed one prefix. Check what the role really allows:

```console
$ aws iam get-role-policy --role-name app-role --policy-name inline
{"Statement": [{"Effect": "Allow", "Action": "s3:*", "Resource": "*"}]}
```

Replace it with the specific actions and prefixes the application uses, require the newer metadata service version that resists this attack, and alert on use of the credentials from outside the instance.

## Common mistakes

- Using the root account for daily work
- Granting wide wildcard permissions "to get it working" and never narrowing them
- Storing logs in the same account that an attacker will control
- Assuming the provider secures your configuration

```quiz
Q: What is the best way to give an application access to a bucket?
- Embed an access key in the code
+ Attach a role with a narrow policy to the workload and use temporary credentials
- Make the bucket public
- Share a human user password
> Roles give short-lived credentials with only the permissions required, and there is no key to leak.

Q: Why send audit logs to a separate protected account?
- To make them load faster
+ So that someone who takes over a workload account cannot erase the evidence
- To avoid encryption
- To lower storage cost
> Evidence that the attacker can delete is of little use during an investigation.

Q: What does scanning Terraform in the pull request achieve?
- It makes the plan faster
+ It finds problems such as open firewalls before they are created
- It replaces code review
- It encrypts the state
> Fixing a template before apply is far cheaper than fixing a live exposure.

Q: Which is a risk of Terraform state files?
- They are always empty
+ They can contain secret values in plain text, so the backend must be encrypted and access limited
- They cannot be locked
- They are public by default
> Treat state like a secret store: encrypt it and limit who can read it.
```

```cards
Why use roles instead of access keys? :: Roles give temporary credentials that expire, so there is no long-lived key to leak
What is a guardrail? :: An organisation-level rule that account administrators cannot override, such as blocking public buckets
Name three high-risk events to alert on :: Root account use, new access keys, changes to logging
Why store logs in a separate account? :: An attacker in the workload account cannot delete them
Does state contain secrets? :: Often yes, so encrypt the backend and restrict access
```
