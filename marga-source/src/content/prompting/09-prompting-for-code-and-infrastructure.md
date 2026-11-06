---
title: Prompting for code and infrastructure work
minutes: 12
summary: Write prompts that produce correct scripts, configs and reviews: give context, constraints and tests, ask for small changes and verify everything.
---

Prompting for operations work is different from prompting for essays. The output is executable, small mistakes are costly and the model cannot see your environment unless you describe it.

## What you will learn

- Giving context: versions, environment and constraints
- Asking for small, reviewable changes with tests
- Verifying with linters, dry runs and plans
- Keeping risky actions behind human review

## A good prompt

```text
Context: Kubernetes 1.30 on EKS, Helm 3.15, namespace shop, Prometheus Operator installed.
Task: Write a PrometheusRule that alerts when the checkout service error ratio is above 2%
for 10 minutes. The metric is http_requests_total{service="checkout",code=~"5.."}.
Constraints: Use only the fields in monitoring.coreos.com/v1. Labels: severity=page, team=payments.
Output: Only the YAML, then a short list of assumptions. Include a promtool test case.
```

Name versions, tools, metric names and conventions. State what must not change. Say the output format. The more precise the environment, the fewer invented fields and flags.

## Small changes

Ask for a **diff** or a single function, not a whole rewrite. Ask the model to explain trade-offs and list assumptions. Request tests and edge cases such as empty input, timeouts and permission errors.

## Verify

```bash
shellcheck deploy.sh
terraform fmt -check && terraform validate && terraform plan -out tfplan
terraform show tfplan | grep -E "will be (destroyed|replaced)"
kubeconform -strict rendered.yaml
promtool check rules alerts.yaml
```

Models can invent flags and fields. Linters and dry runs catch many errors cheaply. For infrastructure, always read the **plan**, especially replacements and deletes.

## Safety

Never paste secrets into prompts. Do not let generated commands run directly against production. Use review, a staging environment and guards such as `prevent_destroy` for important resources.

## Incident: The plan that replaced the database

> **Incident:** A generated rename caused Terraform to replace a database.

```console
# aws_db_instance.main must be replaced
-/+ resource "aws_db_instance" "main"
Plan: 1 to add, 0 to change, 1 to destroy
```

The generated change renamed a resource block, and Terraform treated it as a new resource. The engineer caught the replacement while reading the plan. The team added prevent_destroy to the database and a CI check that fails on destroy of tagged resources.

## Common mistakes

- Prompts with no versions or environment
- Applying generated changes without reading the plan
- Asking for whole rewrites
- Pasting secrets into prompts

```quiz
Q: What helps reduce invented flags?
+ Naming exact versions and tools
- A longer greeting :: No.
- Higher temperature :: No.
- No context :: No.
> Specifics constrain the answer.

Q: What should you read before applying Terraform?
+ The plan
- Only the code :: No.
- The README :: No.
- Nothing :: No.
> Check replacements and deletes.

Q: Why ask for small diffs?
+ Easier to review and test
- They are longer :: No.
- They hide errors :: No.
- They skip tests :: No.
> Reviewability matters.

Q: Which tool checks shell scripts?
+ shellcheck
- grep :: No.
- top :: No.
- cat :: No.
> Static analysis finds bugs.
```

```cards
Constraint :: A rule the output must follow
Dry run :: Running without making changes
Plan :: Preview of infrastructure changes
prevent_destroy :: Terraform guard against deletion
```
