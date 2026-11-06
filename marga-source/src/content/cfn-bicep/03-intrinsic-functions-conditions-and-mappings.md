---
title: Intrinsic functions, conditions and mappings
minutes: 12
summary: Use Ref, GetAtt, Sub, Join, Select, If, Conditions and Mappings to make one CloudFormation template adapt to many environments.
---

Static templates are brittle. Intrinsic functions let a template refer to other resources and compute strings, while conditions and mappings capture the differences between environments in one file.

## What you will learn

- Ref, GetAtt and Sub
- Join, Select, Split and ImportValue
- Conditions and If
- Mappings and SSM parameters

## Functions you use daily

```yaml
Resources:
  Role:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub "${AWS::StackName}-${Env}-app"
  Fn:
    Type: AWS::Lambda::Function
    Properties:
      Role: !GetAtt Role.Arn
      Environment:
        Variables:
          BUCKET: !ImportValue shared-bucket
```

- `!Ref` returns a parameter value or a resource's main id.
- `!GetAtt Res.Attr` returns another attribute, such as an ARN.
- `!Sub` substitutes `${...}` inside a string, including pseudo parameters like `${AWS::Region}`.
- `!Join`, `!Select`, `!Split` build and cut lists and strings.
- `!ImportValue` reads another stack's export.

## Conditions

```yaml
Conditions:
  IsProd: !Equals [!Ref Env, prod]
Resources:
  Alarm:
    Type: AWS::CloudWatch::Alarm
    Condition: IsProd
    Properties:
      Threshold: 80
```

A resource with a false condition is simply not created. `!If [IsProd, 3, 1]` picks a value.

## Mappings and SSM

```yaml
Mappings:
  Size:
    dev:  { Type: t3.small }
    prod: { Type: m5.large }
Parameters:
  Image:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64
```

Use `!FindInMap [Size, !Ref Env, Type]` to look up a value. The SSM parameter type resolves the latest image id for the current region at deploy time.

```diagram
title: One template, many environments
node: tpl | One template | 0 | 1 | Contains functions, conditions and mappings. | Too many branches make the template hard to read.
node: par | Parameters | 1 | 0 | Env and region choose the path. | A wrong value deploys the wrong sizing.
node: map | Mappings | 1 | 1 | Lookup table for sizes and settings. | A missing key fails the deploy. | store
node: cond | Conditions | 1 | 2 | Decide whether a resource exists. | A condition on a used resource breaks references.
node: res | Resources | 2 | 1 | The final set of resources for that environment. | Differences should be reviewed with a change set. | process
edge: tpl | par
edge: tpl | map
edge: tpl | cond
edge: par | res
edge: map | res
edge: cond | res
```

## Incident: The AMI from another region

> **Incident:** A template with a fixed image id failed in a new region.

```console
$ aws cloudformation describe-stack-events --stack-name app-eu
Server  CREATE_FAILED  The image id 'ami-0abc1234' does not exist
region: eu-west-1  (template written for us-east-1)
```

Image ids differ per region. Replacing the fixed id with the SSM parameter type made the template portable and always current.

## Common mistakes

- Hard-coding region-specific ids
- Writing one template per environment
- Overusing conditions until nothing is readable
- Referencing a conditional resource without guarding the reference

```quiz
Q: Which function returns a resource ARN?
+ GetAtt
- Ref for every type :: No.
- Join :: No.
- Select :: No.
> GetAtt reads attributes.

Q: What does a false condition do to a resource?
+ It is not created
- It is deleted from Git :: No.
- It fails the stack :: No.
- It is renamed :: No.
> Resources with false conditions are skipped.

Q: What are mappings used for?
+ Lookup tables
- Secrets :: No.
- Loops :: No.
- Networking :: No.
> FindInMap reads them.

Q: Why use SSM parameter types for AMIs?
+ They resolve the right image per region
- They encrypt data :: No.
- They add tags :: No.
- They create stacks :: No.
> Region-specific lookup.
```

```cards
Intrinsic function :: A built-in function evaluated at deploy time
Pseudo parameter :: A predefined value such as AWS::Region
Condition :: A rule that enables or disables resources
Mapping :: A static lookup table in a template
Export :: A named output another stack can import
```
