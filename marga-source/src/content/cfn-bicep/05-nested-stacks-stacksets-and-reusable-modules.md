---
title: Nested stacks, StackSets and reusable modules
minutes: 12
summary: Split large templates into nested stacks, roll one template out to many accounts and regions with StackSets, and share patterns as modules.
---

As an estate grows, one template cannot hold it. You need ways to split work by layer and ways to repeat a baseline across many accounts and regions.

## What you will learn

- Nested stacks and their limits
- Cross-stack references and their coupling
- StackSets for many accounts and regions
- Modules and the registry

## Splitting

A **nested stack** is a stack created by a resource of type `AWS::CloudFormation::Stack` in a parent template, with `TemplateURL` pointing to a template in S3 and `Parameters` passing values down. A single stack is limited to 500 resources, so nesting helps both size and organisation.

```yaml
Resources:
  Network:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/acme-templates/network.yaml
      Parameters: { Env: !Ref Env }
```

## Cross-stack references

`Export` and `!ImportValue` link separate stacks. An export in use **cannot be changed or deleted**, which couples the stacks. A looser option writes values to SSM Parameter Store and reads them as parameters, so layers (network, data, app) can change independently.

## StackSets

A **StackSet** deploys one template to many accounts and regions. With AWS Organizations and service-managed permissions, new accounts in an organisational unit can receive the stack automatically. Set operation preferences: maximum concurrent accounts and a failure tolerance, so a bad template stops after a few accounts instead of all.

## Modules

CloudFormation **modules** package a resource pattern (a compliant bucket) that teams reuse from the registry. Higher-level options, such as the CDK, generate templates from code.

```diagram
title: Splitting and repeating templates
node: root | Parent template | 0 | 1 | Passes parameters to child stacks. | Child failures roll back the parent.
node: net | Network stack | 1 | 0 | VPC and subnets. | Changing an exported value is blocked while imported. | process
node: app | App stack | 1 | 1 | Services that read network outputs. | Tight exports slow changes down. | process
node: ss | StackSet | 1 | 2 | Same baseline in many accounts and regions. | No failure tolerance pushes a bad change everywhere. | process
node: acc | Member accounts | 2 | 2 | Receive the stack automatically. | Drifted accounts fall out of date. | store
edge: root | net
edge: root | app
edge: ss | acc
```

## Incident: Locked by an export

> **Incident:** A team could not change a network output because another stack imported it.

```console
$ aws cloudformation update-stack --stack-name net --template-body file://net.yaml
An error occurred: Cannot update export net-vpc as it is in use by app
imports: app-dev, app-prod
```

The export tied the layers together. The team moved shared values to SSM parameters read at deploy time, which let the network and app stacks change independently.

## Common mistakes

- Using exports for everything
- StackSets with no failure tolerance
- Nested templates not versioned in S3
- Large single templates near the resource limit

```quiz
Q: What resource type creates a nested stack?
+ AWS::CloudFormation::Stack
- AWS::S3::Bucket :: No.
- AWS::IAM::Role :: No.
- AWS::Lambda::Function :: No.
> It points to a child template.

Q: What does a StackSet do?
+ Deploys a template to many accounts and regions
- Encrypts S3 :: No.
- Creates VPN :: No.
- Monitors cost :: No.
> Fleet-wide deployment.

Q: Why can an export be a problem?
+ It cannot change while imported
- It is slow :: No.
- It costs money :: No.
- It hides outputs :: No.
> Imports lock the value.

Q: Why set a StackSet failure tolerance?
+ To stop a bad change after a few accounts
- To speed up deploys :: No.
- To rename stacks :: No.
- To skip tests :: No.
> Limits the blast radius.
```

```cards
Nested stack :: A stack created from within another stack
StackSet :: A template deployed to many accounts and regions
Export :: A named output usable by other stacks
Module :: A reusable resource pattern in the registry
Failure tolerance :: How many failures a rollout accepts before stopping
```
