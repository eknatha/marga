---
title: CloudFormation templates, parameters and resources
minutes: 13
summary: Write a CloudFormation template with parameters, resources, outputs and references, and deploy it as a stack from the CLI.
---

A CloudFormation template is a document with a few sections. Once you know what each does you can read any template and write simple ones from the resource reference.

## What you will learn

- Template sections
- Resources, properties and logical ids
- Parameters and outputs
- Deploying with the CLI

## A small template

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  Env:
    Type: String
    AllowedValues: [dev, prod]
Resources:
  Logs:
    Type: AWS::S3::Bucket
    Properties:
      VersioningConfiguration:
        Status: Enabled
      Tags:
        - Key: env
          Value: !Ref Env
Outputs:
  BucketName:
    Value: !Ref Logs
    Export:
      Name: !Sub "${AWS::StackName}-bucket"
```

Each resource has a **logical id** (`Logs`) used inside the template and a **Type**. CloudFormation picks the physical name unless you set one; leave it unset so a stack can be created twice and resources can be replaced safely.

## Sections

| Section | Purpose |
|---|---|
| Parameters | Inputs with type, default and allowed values |
| Resources | The only required section |
| Outputs | Values to show or export for other stacks |
| Conditions, Mappings | Branching and lookup tables |

## Deploy

```console
$ aws cloudformation validate-template --template-body file://logs.yaml
$ aws cloudformation deploy --template-file logs.yaml --stack-name logs-dev \
    --parameter-overrides Env=dev
$ aws cloudformation describe-stack-events --stack-name logs-dev
```

`deploy` creates or updates and shows the events. Read the **events** list when something fails: the first failed event holds the real reason.

```diagram
title: From template to resources
node: tpl | Template | 0 | 0 | YAML with parameters, resources and outputs. | A typo in a property name fails only at deploy time.
node: val | validate-template | 1 | 0 | Checks syntax, not whether values are valid. | Passing validation does not guarantee deployment. | observe
node: stack | Stack | 2 | 0 | The managed set of resources. | Failed create rolls back and leaves a ROLLBACK state. | process
node: res | Resources | 3 | 0 | Buckets, roles, networks created in dependency order. | Hard-coded global names collide across accounts. | store
node: out | Outputs | 3 | 1 | Values for people or other stacks. | An export in use blocks deleting its stack.
edge: tpl | val
edge: val | stack
edge: stack | res
edge: stack | out
```

## Incident: The bucket name that already existed

> **Incident:** A template with a fixed bucket name failed in the second account.

```console
$ aws cloudformation describe-stack-events --stack-name logs-prod
Logs  CREATE_FAILED  acme-logs already exists
logs-prod  ROLLBACK_COMPLETE
```

S3 names are global, so the second deploy could never use the same name. The fix was to remove the fixed name and let CloudFormation generate it, exposing the generated name through an output.

## Common mistakes

- Hard-coding physical names of global resources
- Ignoring stack events when a deploy fails
- Treating validate-template as a full test
- Editing resources by hand in the console

```quiz
Q: What is required in a template?
+ Resources
- Outputs :: No.
- Parameters :: No.
- Mappings :: No.
> Only Resources is required.

Q: What does Ref return for a bucket?
+ Its name
- Its ARN list :: No.
- Its tags :: No.
- The stack id :: No.
> Ref gives the main identifier.

Q: Where to look when a stack fails?
+ The stack events
- The AWS invoice :: No.
- DNS logs :: No.
- The template comments :: No.
> The first failed event shows the cause.

Q: Why avoid fixed physical names?
+ Replacement and multiple copies need unique names
- They are slower :: No.
- They are more expensive :: No.
- Not supported :: No.
> Fixed names collide.
```

```cards
Logical id :: The name of a resource inside a template
Parameter :: An input that changes between deployments
Output :: A value a stack makes available
Ref :: Function returning a resource's identifier or a parameter value
Stack event :: A log line about a resource change
```
