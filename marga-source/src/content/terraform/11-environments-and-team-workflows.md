---
title: Environments, repository layout and team workflows
minutes: 14
summary: Choose between workspaces and directories for environments, split state to limit blast radius, and set up reviewed, automated plan and apply flows for a team.
---

A Terraform setup that works for one person fails when a team shares it. Two people apply at once, a change to a test environment accidentally touches production, or state grows so big that every plan takes ten minutes. The layout you choose and the workflow around it decide how safe and fast the team can be.

## What you will learn

- Workspaces compared with directories per environment
- How to split state and why
- Sharing outputs between stacks
- Pipeline flows: plan on review, apply on merge
- Roles, credentials and approvals

## One code base, several environments

**Workspaces** give one configuration multiple state files in the same backend. They are quick for identical copies (for example, temporary preview environments), but the code cannot differ much, and it is easy to forget which workspace is selected.

**Directories per environment** (`envs/dev`, `envs/staging`, `envs/prod`) each call shared modules with their own variables and backend. They are explicit, can use different provider settings and credentials, and make a diff show exactly which environment changes. Most teams prefer this for long-lived environments.

```text
infra/
  modules/
    network/
    app/
  envs/
    dev/      main.tf  backend.tf  terraform.tfvars
    staging/  main.tf  backend.tf  terraform.tfvars
    prod/     main.tf  backend.tf  terraform.tfvars
```

Use versioned modules (a tag or registry version) so that production uses a known version while you try a newer one in development.

## Split state to limit blast radius

One state for everything is slow and risky: any plan reads every resource, and a bad apply can touch everything. Split by lifecycle and ownership: networking, shared data stores, and each application in its own state. Rule of thumb: things that change together and are owned by one team belong together; things that change at different speeds belong apart.

Share values between stacks with outputs and `terraform_remote_state`, or better, by reading data sources (look up the VPC by tag) so stacks stay loosely coupled.

## Team workflow

1. A change is made on a branch and a pull request opens.
2. The pipeline runs format, validate, lint, security checks and `terraform plan`, and posts the plan as a comment.
3. A reviewer reads the plan, not just the code.
4. After approval and merge, the pipeline applies the saved plan for that environment, in order: dev, staging, then production with an approval.
5. Only the pipeline's role may apply to production; people have read-only access.

Use remote state with locking and encryption, one pipeline job at a time per state, and `-lock-timeout` to wait instead of failing. Apply the exact plan file that was reviewed (`terraform apply tfplan`) so what was approved is what runs.

## Credentials

Prefer short-lived credentials from the pipeline's identity (OpenID Connect to the cloud provider) over stored keys. Use a separate role per environment with the least privilege needed. Keep secrets out of variables files and state outputs where possible, and mark sensitive values.

```predict
Q: Two engineers run terraform apply for the same state at the same moment. What protects the state?
???
State locking in the remote backend: the second run waits or fails until the first releases the lock.
> Use a backend that supports locking, and avoid force-unlock unless you are sure the lock is stale.
```

## Incident: the shared state that took four hours

> **Incident:** An urgent security group change needs four hours because plans on the single shared state take 25 minutes and conflict with other people's applies.

```console
$ time terraform plan
...
real    24m12s
$ terraform state list | wc -l
3180
```

All environments' resources lived in one state. The team split networking, data stores and each service into separate states with their own pipelines. Plans fell to about a minute, applies no longer collided, and a change to one service could not alter the network.

## Common mistakes

- Using workspaces for very different environments
- One giant state
- Applying a different plan than the reviewed one
- Long-lived keys in the pipeline

```quiz
Q: When are directories per environment usually better than workspaces?
+ When environments differ in settings, credentials or provider configuration
- When you have one environment :: Then it hardly matters.
- When you want less code review :: Unrelated.
- When state is empty :: Unrelated.
> Directories make differences visible and explicit.

Q: Why split a large state?
+ To shorten plans and limit the blast radius of a mistake
- To avoid backends :: Unrelated.
- To remove modules :: Unrelated.
- To skip reviews :: Unrelated.
> Smaller states are faster and safer.

Q: What should the pipeline apply to production?
- A fresh plan at apply time :: It may differ from what was reviewed.
+ The saved plan file that reviewers approved
- Whatever is on a laptop :: Unsafe.
- A manually edited state :: Unsafe.
> Apply the reviewed plan exactly.

Q: Which credential approach is preferred for pipelines?
+ Short-lived credentials from the pipeline identity
- A shared admin key :: Too powerful and long-lived.
- A key in the repository :: Never.
- A password in the variables file :: Never.
> Short-lived tokens limit damage if they leak.
```

```cards
Workspaces versus directories? :: Workspaces: same code. Directories: explicit per environment
Why split state? :: Speed and smaller blast radius
Safe apply flow? :: Plan on review, apply the saved plan after approval
Where do reviewers look? :: At the plan output
Preferred pipeline credentials? :: Short-lived, via OIDC
```
