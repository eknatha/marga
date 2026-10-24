---
title: AWS
summary: Identity, networking, compute, storage, cost and incident-response commands for AWS.
module: cloud
---

## Identity and CLI

```bash
aws sts get-caller-identity
aws configure list
aws iam list-attached-role-policies --role-name shop-api-role
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:role/shop-api-role \
  --action-names s3:GetObject \
  --resource-arns arn:aws:s3:::acme-uploads/shop/logo.png
aws iam generate-credential-report
```

Use roles and temporary credentials. Deny beats allow. Check who you are before debugging what you may do.

## Policy skeleton

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::acme-uploads/shop/*"
    }
  ]
}
```

## Networking

```bash
aws ec2 describe-vpcs --query 'Vpcs[].{id:VpcId,cidr:CidrBlock}'
aws ec2 describe-subnets --filters Name=vpc-id,Values=VPC_ID \
  --query 'Subnets[].{id:SubnetId,az:AvailabilityZone,cidr:CidrBlock}'
aws ec2 describe-route-tables --filters Name=vpc-id,Values=VPC_ID
aws ec2 describe-security-groups --group-ids SG_ID
aws ec2 describe-nat-gateways
```

| Component | Role |
|-----------|------|
| Internet gateway | Route to and from the internet for public subnets |
| NAT gateway | Outbound-only internet for private subnets |
| Security group | Stateful, instance-level firewall |
| Network ACL | Stateless, subnet-level firewall |
| VPC endpoint | Private access to AWS services |
| Reachability Analyzer | Explains why a path is blocked |

## Compute

```bash
aws ec2 describe-instances --filters Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].[InstanceId,InstanceType,Tags[?Key==`Name`]|[0].Value]' --output table
aws ec2 describe-volumes --filters Name=status,Values=available   # unattached disks
aws autoscaling describe-auto-scaling-groups
aws eks update-kubeconfig --name CLUSTER --region eu-west-1
aws lambda list-functions --query 'Functions[].FunctionName'
```

## Storage

```bash
aws s3 ls s3://acme-uploads/
aws s3 sync ./site s3://acme-site --delete
aws s3api get-bucket-versioning --bucket acme-uploads
aws s3api put-public-access-block --bucket acme-reports \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

| Type | Service |
|------|---------|
| Object | S3 |
| Block | EBS |
| Shared file | EFS, FSx |

## Databases and messaging

| Need | Service |
|------|---------|
| Relational | RDS, Aurora |
| Key-value | DynamoDB |
| Cache | ElastiCache |
| Queue / pub-sub | SQS, SNS |
| Events | EventBridge |
| Secrets | Secrets Manager, Parameter Store |

Enable Multi-AZ and automated backups. Connect through the DNS endpoint, never an IP.

## Logs and audit

```bash
aws logs tail /aws/lambda/FUNCTION --follow
aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteBucket
aws cloudwatch describe-alarms --state-value ALARM
```

## Cost

```bash
aws ce get-cost-and-usage \
  --time-period Start=2026-10-01,End=2026-10-24 \
  --granularity DAILY --metrics UnblendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

| Lever | Action |
|-------|--------|
| Budgets | Alerts at 50%, 80%, 100% |
| Tags | `owner`, `env`, `service` |
| Right-size | Use measured utilization |
| Commitments | Savings plans for steady load |
| Clean up | Unattached volumes, old snapshots, idle load balancers |

## Compromised key response

1. Deactivate the access key
2. Review CloudTrail for what it did, including other regions
3. Terminate unknown resources and revoke sessions
4. Rotate related credentials
5. Replace the key with a role
