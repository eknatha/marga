## Tool choice for a new team
level: mid
A team asks whether to use Terraform, OpenTofu or Pulumi.

```text
$ grep -r "required_providers" . | head -2
aws = { source = "hashicorp/aws" }
```
? What guides the choice?
+ Skills, licence needs, provider support and migration cost, tested on a small project
- Whatever is newest
- The longest docs
why: Compatibility and team skills matter more than trends.

## Rename recreated a database
level: mid
A refactor renamed a resource and the plan shows destroy and create.

```text
$ terraform plan | grep -E "destroy|create"
# aws_db_instance.main will be destroyed
# aws_db_instance.primary will be created
```
? How do you avoid it?
+ Add a moved block from the old address to the new one
- Apply anyway
- Delete the state
why: A moved block maps the old address to the new in state.

## Copy pasted environments
level: junior
Staging and production directories differ in small ways.

```text
$ diff -r envs/stg envs/prod | wc -l
412
```
? What structure helps?
+ Shared modules with small per environment inputs, for example with Terragrunt
- More copies
- One huge file
why: Common code should live once.

## Module change broke consumers
level: mid
A module update changed an output name.

```text
$ terraform plan
Error: Unsupported attribute: module.net.vpc_id
```
? What process prevents this?
+ Version modules, test them and release with a changelog and pinned versions
- Edit in place
- Delete outputs
why: Pinned versions let consumers upgrade on purpose.

## Manual console change
level: mid
Someone opened a security group by hand.

```text
$ terraform plan -detailed-exitcode; echo $?
2
```
? What do you do?
+ Review the drift, then revert it through code or adopt it into code, and restrict console writes
- Ignore the plan
- Disable drift checks
why: Exit code 2 means changes; investigate who and why.

## Secret in state
level: senior
A database password appears in a state file.

```text
$ grep -c password terraform.tfstate
3
```
? What is the right response?
+ Protect and encrypt the backend, restrict access and source secrets from a manager
- Commit the file
- Share it
why: State can hold sensitive values, so treat it like a secret.
