---
title: Roles, collections and reusable automation
minutes: 15
summary: Organise automation into roles with a standard layout, install shared collections and requirements, and keep roles small and testable.
---

A single playbook grows until nobody wants to touch it. Roles package the tasks, templates, defaults and handlers for one job (for example "nginx" or "postgres") so that many playbooks can reuse them.

## What you will learn

- The standard role directory layout
- Role defaults versus vars
- Using roles in a play, and passing variables
- Collections and `requirements.yml`

## Role layout

```text
roles/
  nginx/
    defaults/main.yml     # lowest-precedence defaults, meant to be overridden
    vars/main.yml         # high-precedence internal constants
    tasks/main.yml        # the work
    handlers/main.yml     # reload and restart handlers
    templates/site.conf.j2
    files/
    meta/main.yml         # dependencies and metadata
```

Create the skeleton with `ansible-galaxy init roles/nginx`. Only `tasks/main.yml` is required.

## A small role

```yaml
# roles/nginx/defaults/main.yml
nginx_port: 80
nginx_site_name: example.com
```

```yaml
# roles/nginx/tasks/main.yml
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present

- name: Render site configuration
  ansible.builtin.template:
    src: site.conf.j2
    dest: /etc/nginx/conf.d/site.conf
  notify: Reload nginx
```

```yaml
# roles/nginx/handlers/main.yml
- name: Reload nginx
  ansible.builtin.service:
    name: nginx
    state: reloaded
```

Use it from a playbook:

```yaml
- name: Web tier
  hosts: web
  become: true
  roles:
    - role: nginx
      vars:
        nginx_port: 8080
        nginx_site_name: shop.example.com
```

## Design rules for roles

- **One job per role**, with a clear name and a short README
- **Prefix every variable** with the role name (`nginx_port`) so roles do not collide
- Put overridable settings in `defaults`, and keep `vars` for values users should not change
- Avoid hidden dependencies on other roles' variables
- Keep roles free of environment-specific values; those belong in inventory

## Collections

A **collection** bundles modules, plugins and roles for a product or cloud, such as `amazon.aws` or `community.postgresql`. Install the ones you need and pin versions.

```yaml
# requirements.yml
collections:
  - name: amazon.aws
    version: 8.2.1
  - name: community.general
    version: 9.5.0
roles:
  - name: geerlingguy.nginx
    version: 3.2.0
```

```bash
ansible-galaxy install -r requirements.yml
ansible-galaxy collection list
```

Pinning matters. An unpinned role or collection can change under you and make last month's playbook behave differently. Review third-party roles before using them in production, because they run with your privileges.

```predict
Q: Role defaults set nginx_port to 80. The play passes nginx_port: 8080 in the role's vars. Which value is used?
???
8080. Defaults are the lowest precedence, so any value you pass overrides them.
> That is the whole point of putting settings in defaults.
```

```diagram
title: From playbook to configured server using roles
node: play | Playbook | 0 | 1 | Lists hosts and the roles to apply. | A play with no pinned role versions can change between runs.
node: role | Role | 1 | 1 | Tasks, templates, handlers and defaults for one job. | Variables without a prefix collide with other roles.
node: coll | Collection | 2 | 0 | Supplies modules and plugins that the role calls. | An unpinned collection can change behaviour after an update.
node: host | Managed node | 2 | 2 | Receives the rendered files and service changes. | A role that assumes one OS breaks on another.
edge: play | role
edge: role | coll
edge: role | host
```

## Incident: the role update that broke a deploy

> **Incident:** An unpinned third-party role was updated upstream and changed a default port. The next scheduled run reconfigured production web servers on the wrong port.

```console
$ ansible-galaxy role list
- geerlingguy.nginx, (unknown version)
```

After the outage the team pinned every role and collection in `requirements.yml`, mirrored the ones they depend on internally, and updated them on purpose in a pull request that runs the tests.

## Common mistakes

- Giant roles that install five unrelated things
- Unprefixed variables
- Using unpinned roles from the internet
- Putting production hostnames inside roles

```quiz
Q: Where should an overridable setting such as a port live in a role?
- vars/main.yml :: That has high precedence and is hard to override.
+ defaults/main.yml
- files/ :: This holds static files.
- meta/main.yml :: This holds metadata and dependencies.
> Defaults are the lowest precedence on purpose.

Q: What is a collection?
- A group of hosts :: That is an inventory group.
+ A distributable bundle of modules, plugins and roles
- A single playbook :: Playbooks are separate files.
- A kind of fact :: Facts describe hosts.
> Collections are how vendors and communities ship Ansible content.

Q: Why prefix role variables with the role name?
- Faster execution :: It has no performance effect.
+ To avoid collisions between roles that share the same play
- It is required by YAML :: It is a convention.
- To hide them :: They remain visible.
> All variables share one namespace at runtime.

Q: Why pin versions in requirements.yml?
- To save disk :: That is not the reason.
+ So runs are repeatable and upstream changes arrive only when you choose
- To bypass signatures :: Pinning does not do that.
- Because Galaxy requires it :: It is a best practice.
> Unpinned content can change behaviour between runs.
```

```cards
Role :: A reusable unit of tasks, templates, defaults and handlers
defaults/main.yml :: Overridable role settings with the lowest precedence
Collection :: A bundle of modules, plugins and roles
ansible-galaxy :: Tool to create roles and install shared content
requirements.yml :: Lists collections and roles with pinned versions
```
