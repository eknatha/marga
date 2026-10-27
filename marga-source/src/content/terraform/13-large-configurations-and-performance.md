---
title: Large configurations: structure, speed and blast radius
minutes: 12
summary: Split big Terraform code into stacks that plan quickly and fail small, with clear boundaries and dependencies between them.
---

One Terraform project grew to 1,800 resources. A plan takes eleven minutes, two engineers block each other on the state lock, and a small change to a tag shows a plan that touches the network. Size is the cause of all three. The cure is splitting by risk and by owner, not by file name.

## What you will learn

- Why one giant state is slow and risky
- How to split into stacks by lifecycle and ownership
- Sharing values between stacks safely
- Making plans faster: targeted refresh, parallelism and provider settings

## The cost of one big state

Terraform reads every resource in the state during a plan to see if it changed, and each read is an API call. More resources means a longer plan and more rate limit pressure. The state lock allows one writer at a time, so a big shared state serializes the whole team. And the **blast radius** grows: a mistake in a shared file can affect networking, databases and applications together.

## Split by lifecycle and owner

Put things that change at different speeds, or belong to different teams, in separate stacks, each with its own state:

```text
stacks/
  foundation/    accounts, DNS zones, identity        (changes rarely)
  network/       VPCs, subnets, routing               (platform team)
  data/          databases, queues, buckets           (data team)
  apps/shop/     services, load balancers, autoscaling (shop team)
```

A good boundary is one where the lower stack changes much less often than the upper one, and where a different group would approve changes. Avoid splitting into dozens of tiny stacks with circular dependencies, because every connection between them is something you must keep consistent by hand.

## Share values between stacks

A stack exposes **outputs**, and others read them. The two common ways are reading the other state through a `terraform_remote_state` data source, and looking up the real resource by name or tag with a normal data source.

```hcl
data "aws_vpc" "main" {
  tags = { Name = "prod-main" }
}

resource "aws_security_group" "app" {
  name   = "shop-app"
  vpc_id = data.aws_vpc.main.id
}
```

Looking up by tag avoids giving every consumer read access to another team's state, which can contain secrets. Publish only the values others need, for example subnet IDs, and name them as a stable interface.

## Speed

Several settings help once the structure is sound:

- `terraform plan -refresh=false` skips reading real resources (use only when you know nothing changed outside Terraform).
- `-target` limits a plan to chosen resources, but it is for emergencies, because it can leave things out of step.
- `-parallelism=20` raises the number of concurrent operations (the default is 10), if the provider API allows it.
- Cache providers with `TF_PLUGIN_CACHE_DIR` in the pipeline, so each run does not download them again.

Measure first. A plan that spends most of its time on one slow data source needs a fix there, not more parallelism.

```predict
Q: Two engineers wait on the state lock while each only changes their own application. What structural change helps most?
???
Give each application its own stack and state, so unrelated changes do not share a lock.
> Locks are per state. Smaller states mean less waiting and a smaller blast radius.
```

## Incident: Eleven minutes for a tag change

> **Incident:** A one-line tag change needed an eleven-minute plan, and during that time nobody else could change anything in the account.

```console
$ time terraform plan
...
Plan: 0 to add, 14 to change, 0 to destroy.
real    10m52s
$ terraform state list | wc -l
1812
```

Everything lived in a single state. The team split foundation, network, data and each application into stacks. Plans fell to under a minute, the shop team no longer blocked the data team, and an application stack could not even see the network resources it did not own. They added a short README to each stack describing its outputs as its public interface.

## Common mistakes

- Splitting by file name instead of by lifecycle and owner
- Creating many tiny stacks with circular dependencies
- Giving every stack read access to every state, including secrets
- Using -target as a normal habit

```quiz
Q: Why is a single huge state a problem?
+ Plans are slow, the lock serializes everyone, and a mistake has a large blast radius
- Terraform cannot read large files :: It can, but slowly.
- It uses more disk on the laptop :: Disk is not the issue.
- It prevents modules :: Modules still work.
> Size affects speed, concurrency and risk.

Q: What is a good boundary between stacks?
+ Different change speed or different owners
- The alphabetical order of names :: Names say nothing about risk.
- The number of lines :: Length does not matter.
- The programmer's preference :: It needs a reason.
> Split by lifecycle and ownership.

Q: How can a stack use a value from another team without reading their state?
+ Use a normal data source that looks up the real resource by tag or name
- Copy the state file :: That is risky.
- Hard-code the ID :: It will go stale.
- Ask them to email it :: Not repeatable.
> State may hold secrets.

Q: When is -target appropriate?
+ Rarely, in emergencies
- Always :: It can leave things out of step.
- For every plan :: That hides drift.
- Never, it does not exist :: It exists.
> Normal workflows plan the whole stack.
```

```cards
Split stacks by :: lifecycle and owner
Share values with :: outputs and data sources
Plan faster by :: smaller states and provider caching
Use -target for :: emergencies only
Each stack documents :: its outputs as an interface
```
