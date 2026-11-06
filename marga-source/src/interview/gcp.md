## How are resources organised in Google Cloud?
level: junior
In a hierarchy of organization, folders and projects, with resources inside projects. IAM and organization policies are inherited downward, and billing accounts are linked to projects.

## Why prefer service account impersonation or Workload Identity to key files?
level: junior
Key files are long-lived secrets that can leak. Impersonation and Workload Identity give short-lived tokens with no stored secret, and the access can be limited and audited.

## How do Google Cloud firewall rules differ from traditional ones?
level: mid
A VPC is global and rules are applied to instances by network tag or service account. Ingress is denied and egress allowed by default. Rules have priorities, and using service accounts as targets is safer than tags that others can edit.

## When would you pick Cloud Run over GKE?
level: mid
Pick Cloud Run for stateless containers or event handlers when you want scale to zero and little operations work. Pick GKE when you need Kubernetes features, custom networking, privileged workloads or many cooperating services. GKE Autopilot sits between the two.

## How do you control BigQuery cost?
level: senior
Partition and cluster tables, select only needed columns, require partition filters, use dry runs, set quotas or maximum bytes billed, and consider reserved capacity for steady workloads.

## Walk through handling PERMISSION_DENIED.
level: senior
Read the missing permission from the error, use Policy Troubleshooter to see why access is denied, check organization policies and VPC Service Controls, then grant the smallest predefined role at the lowest level. Never grant Owner to silence an error, and review with IAM Recommender later.
