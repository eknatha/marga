---
title: Horizon, Heat and OpenStack automation
minutes: 12
summary: Automate OpenStack with the CLI, SDKs, Heat templates and Terraform, and use Horizon for what it is good at.
---

OpenStack exposes every capability through REST APIs. The dashboard, command line, SDKs and orchestration tools are different clients of the same interface, and choosing the right one makes work repeatable.

## What you will learn

- CLI and SDK basics with application credentials
- Heat templates and stacks
- Terraform with the OpenStack provider
- When the dashboard is the right tool

## CLI and credentials

```bash
export OS_CLOUD=prod            # reads clouds.yaml
openstack server list --all-projects --status ERROR
openstack application credential create ci-deploy --role member
```

Use **application credentials** for automation instead of a user password. They can be limited and revoked without changing the person's account.

## Python SDK

```python
import openstack
conn = openstack.connect(cloud="prod")
for s in conn.compute.servers(status="ERROR"):
    print(s.name, s.fault["message"] if s.fault else "")
```

## Heat

```yaml
heat_template_version: 2021-04-16
parameters:
  image: {type: string, default: jammy-2026-11}
  flavor: {type: string, default: m1.medium}
resources:
  net:
    type: OS::Neutron::Net
  subnet:
    type: OS::Neutron::Subnet
    properties: {network: {get_resource: net}, cidr: 10.50.0.0/24}
  web:
    type: OS::Nova::Server
    properties:
      image: {get_param: image}
      flavor: {get_param: flavor}
      networks: [{network: {get_resource: net}}]
outputs:
  web_ip:
    value: {get_attr: [web, first_address]}
```

```bash
openstack stack create -t web.yaml demo
openstack stack event list demo
openstack stack delete demo --yes --wait
```

A **stack** groups resources that are created and deleted together. Heat tracks dependencies and rolls back on failure. Terraform offers similar declarative control with a shared workflow across clouds.

## Dashboard

Horizon is useful for exploration, quotas and showing topology to new users. Do not rely on it for repeatable changes.

## Incident: The lab nobody could rebuild

> **Incident:** A hand-built environment was lost with its documentation.

```console
project: qa-lab
14 servers, 3 networks, 6 volumes
created by manual clicks, stack: none
```

A quota cleanup removed some of the lab's resources and no one remembered how they were configured. After rebuilding it as a Heat stack, the team could recreate the environment in minutes and review changes as code.

## Common mistakes

- Hand-built environments
- Using personal passwords in automation
- Skipping stack events when debugging
- Leaving test stacks running forever

```quiz
Q: What does Heat use to describe resources?
+ Templates
- Screenshots :: No.
- Emails :: No.
- Passwords :: No.
> Declarative stacks. The lesson section above explains why.

Q: Why use application credentials?
+ Limited and revocable automation access
- Longer passwords :: No.
- No audit :: No.
- No roles :: No.
> Safer than user passwords.

Q: What is a stack?
+ A group of resources managed together
- A single volume :: No.
- A network card :: No.
- A flavor :: No.
> Created and deleted as one.

Q: When is Horizon best?
+ Exploration and visibility
- Repeatable changes :: No.
- CI pipelines :: No.
- Backups :: No.
> It is a dashboard. The lesson section above explains why.
```

```cards
Heat :: OpenStack orchestration service
Stack :: Resources created from a template
Application credential :: Scoped credential for automation
clouds.yaml :: File defining cloud connection profiles
```
