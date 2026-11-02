---
title: Ansible basics, inventory and ad-hoc commands
minutes: 14
summary: Understand agentless configuration management, describe your servers in an inventory, and run one-off commands and modules across many hosts.
---

You have twelve servers that should all have the same web server, the same users and the same firewall rules. Logging in to each one works for a week. After that, one server has a different package version, one has a forgotten manual change, and nobody can say which. Configuration management keeps servers matching a description instead of matching someone's memory.

## What you will learn

- What configuration management solves, and where Ansible fits
- How Ansible reaches hosts without installing an agent
- Writing an inventory with groups and variables
- Running ad-hoc commands and modules

## How Ansible works

Ansible runs on a **control node** (your laptop or a build server). It connects to **managed nodes** over SSH (or WinRM for Windows), copies a small module to each, runs it, reads the result and removes it. Nothing needs to be installed on the managed nodes except Python and an SSH login.

- **Agentless**: no daemon to patch or secure on each server
- **Declarative modules**: you say "package nginx is present", not "run apt install"
- **Push model**: you decide when changes happen, which suits controlled rollouts

| Term | Meaning |
|------|---------|
| Control node | The machine that runs `ansible` commands |
| Managed node | A server Ansible configures |
| Inventory | The list of hosts and groups |
| Module | A unit of work such as `apt`, `copy` or `service` |
| Playbook | A YAML file that lists tasks to run (next lesson) |

## The inventory

An inventory names your hosts and sorts them into groups. The INI form is the quickest to read.

```text
[web]
web1.example.com
web2.example.com ansible_user=deploy

[db]
db1.example.com

[prod:children]
web
db

[prod:vars]
ansible_python_interpreter=/usr/bin/python3
```

- `[web]` and `[db]` are groups of hosts
- `[prod:children]` makes `prod` a group made of other groups
- `[prod:vars]` sets variables for every host in `prod`

Check what Ansible sees before you change anything:

```bash
ansible-inventory -i inventory.ini --graph
ansible-inventory -i inventory.ini --host web2.example.com
```

Cloud environments change constantly, so teams often use a **dynamic inventory** plugin that asks the cloud API for current instances instead of a hand-written file.

## Ad-hoc commands

An ad-hoc command runs one module on a set of hosts. It is ideal for quick facts and one-off fixes.

```bash
ansible all -i inventory.ini -m ping
ansible web -i inventory.ini -m command -a "uptime"
ansible web -i inventory.ini -m apt -a "name=nginx state=present" --become
ansible db -i inventory.ini -m service -a "name=postgresql state=started" --become
```

- `-m` chooses the module and `-a` gives its arguments
- `--become` runs with elevated rights (sudo)
- `--check` shows what would change without changing it
- `--limit web1.example.com` restricts the run to part of the inventory

The `ping` module is not an ICMP ping. It checks that SSH works and Python is usable on the target.

## Why modules beat shell commands

`state=present` can be run ten times and install the package once. The module reports `changed` only when it altered something. A raw `command: apt install nginx` has no such awareness. Use a module when one exists, and reserve `command` or `shell` for the cases that have none.

```predict
Q: You run the same ad-hoc apt module with state=present twice against a host that has no nginx. What do the two runs report?
???
The first run reports changed (it installed nginx). The second reports ok with no change, because the package is already present.
> That "changed or ok" signal is idempotence, the property that makes Ansible safe to repeat.
```

```diagram
title: What happens when you run an Ansible command
node: ctl | Control node | 0 | 1 | Reads the inventory and builds a connection per host. | If the control node is lost, so is your only copy of the automation unless it is stored in version control.
node: ssh | SSH connection | 1 | 1 | Opens an SSH session to each managed node. | Wrong keys, firewalls or host key prompts stop the run for that host.
node: mod | Module copied and run | 2 | 1 | A small Python module runs on the target and does one job. | Missing Python on the target gives a module failure, not a config error.
node: res | JSON result | 3 | 1 | The module returns ok, changed or failed, and is then removed. | Ignoring "failed" on one host can leave the fleet inconsistent.
edge: ctl | ssh
edge: ssh | mod
edge: mod | res
```

## Incident: the one server nobody could rebuild

> **Incident:** A payment web server died after a disk fault, and no one could recreate it because years of manual changes lived only on that machine.

```console
$ ssh web3 'dpkg -l | wc -l'
611
$ ssh web1 'dpkg -l | wc -l'
498
```

The team spent two days comparing package lists. Afterwards they described the web tier in an inventory and a playbook, ran it against all servers, and made "no manual changes on servers" a rule. The next failure took twenty minutes to replace.

## Common mistakes

- Using `shell` for everything, which gives up change reporting
- Forgetting `--become` and then misreading permission errors
- Keeping the inventory only on one laptop
- Treating `ping` as a network test

```quiz
Q: What does it mean that Ansible is agentless?
- It needs no network :: It connects over SSH or WinRM.
+ Nothing needs to be installed on managed nodes beyond SSH access and Python
- It cannot run on Linux :: It runs on Linux and macOS control nodes.
- It runs only on the control node :: Modules run on the targets.
> There is no resident daemon to install, patch or secure on every server.

Q: In an inventory, what does [prod:children] define?
- Variables for prod :: That is [prod:vars].
+ A group made of other groups
- A single host :: Hosts are listed directly under a group.
- A dynamic plugin :: Plugins are configured separately.
> Child groups let you target a whole environment at once.

Q: Which option previews changes without making them?
- --become :: It elevates privileges.
+ --check
- --limit :: It narrows the hosts.
- -m :: It selects the module.
> Check mode reports what would change, which is useful before a risky run.

Q: What does the ping module test?
- ICMP reachability :: It does not use ICMP.
+ That SSH works and Python is usable on the target
- Bandwidth :: It measures nothing about speed.
- DNS records :: Name resolution is a side effect only.
> It is a connection and interpreter check.
```

```cards
Control node :: The machine that runs Ansible and connects to servers
Managed node :: A server that Ansible configures
Inventory :: The list of hosts and groups Ansible acts on
Ad-hoc command :: One module run on a set of hosts from the command line
Idempotent module :: Can run repeatedly and changes things only when needed
```
