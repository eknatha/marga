---
title: Dynamic inventory for cloud environments
minutes: 11
summary: Let Ansible discover hosts from the cloud by tags instead of maintaining a hand-written list.
---

Servers in the cloud appear and disappear all day through autoscaling. A static inventory file is out of date by lunch. A dynamic inventory asks the cloud which machines exist right now and groups them by tag, so playbooks always target the real fleet.

## What you will learn

- Inventory plugins and how they query the cloud
- Grouping and variables from tags
- Combining static and dynamic sources
- Checking and troubleshooting the result

## Inventory plugins

An inventory plugin reads a small YAML file that tells Ansible where to look.

```yaml
# inventory/aws_ec2.yml
plugin: amazon.aws.aws_ec2
regions:
  - eu-west-1
filters:
  tag:Managed: ansible
  instance-state-name: running
keyed_groups:
  - key: tags.Role
    prefix: role
  - key: tags.Env
    prefix: env
hostnames:
  - private-ip-address
compose:
  ansible_host: private_ip_address
```

The plugin calls the cloud API with your credentials, creates groups such as `role_web` and `env_prod`, and sets variables from instance details. Use roles or instance profiles for credentials, not keys in the file.

## Target by tag

Playbooks target the generated groups. Intersection of groups limits the scope:

```yaml
- hosts: role_web:&env_prod
  serial: 2
  roles:
    - nginx
```

The tag is now the contract: if a team forgets the `Role` tag, the host is not configured. Make tags mandatory through your provisioning code. Combine this with `serial` so that a change touches a few hosts at a time.

## Mix with static inventory

A directory can contain several sources, and Ansible merges them:

```text
inventory/
  aws_ec2.yml
  static.ini
  group_vars/
    all.yml
    role_web.yml
```

Use static files for things the cloud does not know, such as network devices or an office server. Group variables in `group_vars/role_web.yml` apply to the dynamic group automatically.

## Check what it found

```console
$ ansible-inventory -i inventory/aws_ec2.yml --graph
$ ansible-inventory -i inventory/aws_ec2.yml --host 10.0.3.21
$ ansible -i inventory/ role_web -m ping
```

If groups are empty, check the filters, region and credentials first. The inventory cache can hide changes: set a short cache timeout, or disable it while testing. Remember that instances that are still booting may not be ready for SSH, so wait for them in the playbook.

```predict
Q: A new web server was launched but a playbook for the web group does not touch it. What do you check?
???
Whether it has the correct Role tag, whether it matches the plugin filters, and whether the inventory cache is stale.
> The inventory is built from tags and filters.
```

## Incident: The server that nobody patched

> **Incident:** A monthly patch run reported success, but a security scan later found 6 servers still unpatched.

```console
$ ansible-inventory -i hosts.ini --graph | grep -c web
12
$ aws ec2 describe-instances --filters Name=tag:Role,Values=web --query "length(Reservations[].Instances[])"
18
```

The hand-written inventory listed 12 web servers while the autoscaler had grown the group to 18. The team moved to a dynamic inventory keyed on tags, required the tags in the provisioning module, and added a pre-run check that compares the inventory count with the cloud count. Patch runs now cover the whole fleet.

## Common mistakes

- Static host lists for autoscaled fleets
- Untagged or wrongly tagged hosts
- Stale inventory cache
- Credentials stored in the inventory file

```quiz
Q: Why use a dynamic inventory in the cloud?
+ Hosts change constantly, and the inventory should reflect the real fleet
- It makes SSH faster :: It does not.
- It removes the need for keys :: It does not.
- It encrypts playbooks :: It does not.
> Ask the cloud, not a stale file.

Q: What creates groups such as role_web?
+ keyed_groups built from instance tags
- A manual list :: That is static.
- The playbook name :: Unrelated.
- The SSH port :: Unrelated.
> Tags drive groups.

Q: Which command shows the groups Ansible discovered?
+ ansible-inventory --graph
- ansible --version :: It shows the version.
- ansible-vault view :: It is for secrets.
- ansible-doc :: It shows documentation.
> Inspect before running.

Q: What limits how many hosts change at once?
+ serial in the play
- gather_facts :: It collects facts.
- become :: It escalates privileges.
- tags :: They select tasks.
> Small batches reduce risk.
```

```cards
Plugin config :: small YAML file such as aws_ec2.yml
Groups from :: keyed_groups on tags
Intersect groups :: role_web:&env_prod
Inspect :: ansible-inventory --graph
Stale data risk :: inventory cache
```
