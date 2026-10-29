---
title: Cloud security and IAM
summary: Policies, roles, scopes, keys, private access, audit logs and an incident checklist for AWS and Azure.
module: cloud-iam
---

## Read an AWS policy

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject"],
    "Resource": "arn:aws:s3:::reports-prod/summaries/*"
  }]
}
```

> **Warning:** Action "*" on Resource "*" is administrator access. Never use it to make an error go away.

## Who am I and what can I do

```bash
aws sts get-caller-identity
aws iam list-attached-role-policies --role-name build
aws iam simulate-principal-policy --policy-source-arn ARN --action-names s3:PutObject --resource-arns ARN
aws iam generate-service-last-accessed-details --arn ARN
```

> **Warning:** Check which identity you are running as before changing any policy. Many denials come from the wrong role.

## Azure access

```bash
az account show
az role assignment list --assignee USER --all -o table
az role assignment create --assignee USER --role "Reader" --scope /subscriptions/SUB/resourceGroups/RG
az identity create --name app-identity --resource-group RG
```

> **Warning:** Assign roles at the lowest scope that works. A subscription-level Contributor can change everything below it.

## Secrets and keys

```bash
aws secretsmanager get-secret-value --secret-id prod/db --query SecretString --output text
aws kms describe-key --key-id alias/app-data
az keyvault secret show --vault-name kv-prod --name db-password --query value -o tsv
```

> **Warning:** Do not print secrets in logs or CI output. Fetch at run time, hold in memory, rotate with an overlap.

## Network exposure checks

```bash
aws s3api get-public-access-block --bucket NAME
aws ec2 describe-security-groups --filters Name=ip-permission.cidr,Values=0.0.0.0/0
az network nsg rule list --nsg-name NSG --resource-group RG -o table
```

> **Warning:** 0.0.0.0/0 on SSH, RDP or a database port is an incident waiting to happen. Use session-based access instead.

## Audit trail lookups

```bash
aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteTrail --max-results 5
aws cloudtrail get-trail-status --name org-trail
az monitor activity-log list --offset 1d -o table
```

> **Warning:** Alert on audit logging being stopped, root account use, new admin grants and public resources. Keep logs in a separate protected account.

## Leaked credential order

```text
1. Contain  - deactivate the key or revoke the session (do not delete yet)
2. Assess   - audit log: what did this credential do, from where
3. Remove   - attacker-created users, keys, servers, policies
4. Rotate   - related secrets; replace with a role
5. Learn    - how it leaked; add detection
```
