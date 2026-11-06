---
title: Native IaC: CloudFormation, Bicep or Terraform
minutes: 12
summary: Compare AWS CloudFormation and Azure Bicep with Terraform, and decide when a cloud's own infrastructure-as-code tool is the better choice.
---

You can describe infrastructure in code with your cloud's own language or with a neutral tool. The choice affects who holds the state, how fast new services are supported and how portable your skills are.

## What you will learn

- What CloudFormation and Bicep are
- Where state lives and who manages it
- Strengths and limits against Terraform
- How to choose

## Two native tools

**CloudFormation** reads a template (YAML or JSON) describing resources and creates them as a **stack**. **Bicep** is a cleaner language that compiles to an ARM template; Azure Resource Manager then creates the resources in a **resource group**, subscription or other scope. In both, the cloud service tracks what exists, so there is **no state file** for you to store, lock or lose.

| | CloudFormation | Bicep | Terraform |
|---|---|---|---|
| Clouds | AWS | Azure | Many |
| Language | YAML or JSON | Bicep (compiles to ARM) | HCL |
| State | Held by AWS | Held by Azure | Your backend |
| New services | Usually day one (some lag) | Day one | Provider release needed |
| Cost | Free | Free | Free (plus paid options) |

## Strengths and limits

Native tools get new features early, integrate with the cloud's permissions and rollback, and need no backend setup. They can only manage that cloud, have fewer community modules, and the languages are tied to that vendor. Terraform shines for multi-cloud and non-cloud providers (DNS, monitoring, GitHub).

## Choosing

Use the native tool when your estate is mostly one cloud and your team wants less to operate. Use Terraform when several clouds or third-party services are managed together. Many organisations use both: native for the cloud foundation, Terraform for the rest. The ideas (declare desired state, preview, apply, detect drift) carry across all three.

```diagram
title: Where each tool keeps its state
node: dev | Template in Git | 0 | 1 | Desired state written as code. | Unreviewed changes go straight to production.
node: cfn | CloudFormation | 1 | 0 | AWS service creates and tracks a stack. | Stuck stacks can need manual rollback. | process
node: arm | Bicep and ARM | 1 | 1 | Azure Resource Manager tracks deployments. | Complete mode can delete resources not in the file. | process
node: tf | Terraform | 1 | 2 | Your tool plans and applies changes. | A lost or corrupted state file breaks plans. | process
node: cloud | Cloud resources | 2 | 1 | The real servers, networks and databases. | Manual console changes cause drift. | store
edge: dev | cfn
edge: dev | arm
edge: dev | tf
edge: cfn | cloud
edge: arm | cloud
edge: tf | cloud
```

## Incident: The corrupted state file

> **Incident:** A Terraform team lost a day when the state became corrupt; the native team had no state to lose.

```console
$ terraform plan
Error: state data in S3 does not have the expected content
$ aws cloudformation describe-stacks --stack-name net
StackStatus: UPDATE_COMPLETE
```

The native approach removed an entire failure class, but it does not remove drift or bad changes. The team standardised on native tools for single-cloud foundations and kept Terraform for cross-cloud pieces.

## Common mistakes

- Choosing a tool for fashion rather than for the estate
- Assuming no state means no drift
- Mixing tools on the same resources
- Ignoring that skills in one language transfer partly to the other

```quiz
Q: Where does CloudFormation keep its state?
+ In the AWS service
- In a file you manage :: No.
- In Git :: No.
- In Terraform :: No.
> AWS tracks the stack.

Q: What does Bicep compile to?
+ An ARM template
- A Docker image :: No.
- YAML for Kubernetes :: No.
- A shell script :: No.
> Azure Resource Manager runs ARM.

Q: When is Terraform the better pick?
+ Managing several clouds and providers
- Only one AWS account :: No.
- Never :: No.
- Only on laptops :: No.
> It is provider neutral.

Q: What do all three share?
+ Declared desired state with preview and apply
- One syntax :: No.
- One state backend :: No.
- One license :: No.
> The workflow is the same idea.
```

```cards
Stack :: A set of resources managed together by CloudFormation
ARM template :: JSON that Azure Resource Manager deploys
Bicep :: A readable language that compiles to ARM templates
Drift :: Real resources no longer matching the template
Desired state :: The end result described in code
```
