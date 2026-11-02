---
title: Variables, facts and templates
minutes: 15
summary: Parameterise playbooks with variables, understand precedence, use gathered facts and render configuration files with Jinja2 templates.
---

One playbook should configure staging and production, differing only in values such as ports, hostnames and sizes. Variables and templates let you keep the logic once and the differences in data.

## What you will learn

- Defining variables in playbooks, inventory and files
- Variable precedence, and why it surprises people
- Facts gathered from hosts
- Jinja2 templates for configuration files

## Where variables live

```yaml
- name: Configure the app
  hosts: web
  become: true
  vars:
    app_port: 8080
  vars_files:
    - vars/common.yml
  tasks:
    - name: Show the port
      ansible.builtin.debug:
        msg: "Listening on {{ app_port }}"
```

Common places, from broad to specific:

- `group_vars/web.yml` applies to every host in the `web` group
- `host_vars/web1.example.com.yml` applies to one host
- `vars` in a play or `vars_files`
- `-e "app_port=9090"` on the command line, which wins over almost everything

Directory layout is a good habit:

```text
inventory/
  production/
    hosts.ini
    group_vars/
      all.yml
      web.yml
  staging/
    hosts.ini
    group_vars/
      all.yml
```

Each environment owns its values, and the same playbook runs against either inventory.

## Precedence

Ansible has more than twenty precedence levels. You only need the idea: **more specific beats more general, and extra vars (`-e`) beat everything**. To avoid confusion, define each variable in one place, give role defaults a clear name prefix, and use `ansible-inventory --host NAME` to see what a host really receives.

## Facts

Before tasks run, Ansible gathers **facts**, details about the host stored in `ansible_facts`.

```yaml
- name: Use facts
  hosts: all
  tasks:
    - name: Report the distribution
      ansible.builtin.debug:
        msg: "{{ ansible_facts['distribution'] }} {{ ansible_facts['distribution_version'] }}, {{ ansible_facts['memtotal_mb'] }} MB"
```

```bash
ansible web1.example.com -i inventory.ini -m setup -a "filter=ansible_distribution*"
```

Facts let a playbook adapt to the operating system or memory size. Gathering costs time on large fleets, so set `gather_facts: false` where you do not use them.

## Templates

A template is a text file with Jinja2 placeholders. The `template` module renders it on the control node and copies the result.

```text
# nginx site for {{ site_name }}  -- managed by Ansible, do not edit by hand
server {
    listen {{ app_port }};
    server_name {{ site_name }};
{% for upstream in app_backends %}
    # backend {{ upstream }}
{% endfor %}
}
```

```yaml
- name: Render the site configuration
  ansible.builtin.template:
    src: site.conf.j2
    dest: /etc/nginx/conf.d/shop.conf
    owner: root
    group: root
    mode: "0644"
    validate: "nginx -t -c /etc/nginx/nginx.conf"
```

- `{{ }}` prints a value, `{% %}` holds logic such as loops and conditions
- The header comment tells future readers not to edit by hand
- `validate` runs a check on the rendered file before it replaces the old one (some tools need `%s` in the command for the file path)

Filters transform values: `{{ name | upper }}`, `{{ port | default(80) }}`, `{{ items | join(',') }}`. The `default` filter prevents failures when a variable is missing.

```predict
Q: group_vars/all.yml sets app_port to 8080 and group_vars/web.yml sets it to 9090. A web host runs the play with no other settings. Which port does it get?
???
9090, because the group web is more specific than all. Adding -e app_port=7070 on the command line would override both.
> Specific beats general, and extra vars beat everything else.
```

```diagram
title: How a templated file reaches a server
node: vars | Variables and facts | 0 | 1 | Values from inventory, group_vars, play vars and gathered facts. | A value defined in two places can silently win from the wrong one.
node: tpl | Jinja2 template | 1 | 1 | A text file with placeholders and simple logic. | Missing variables stop the play or render empty text.
node: render | Rendered on control node | 2 | 1 | The template module fills in the values. | A logic mistake only shows after rendering.
node: dest | File on the host | 3 | 1 | Copied only if content differs, then validated. | An unvalidated bad file can break the service on reload.
edge: vars | render
edge: tpl | render
edge: render | dest
```

## Incident: the production config with staging values

> **Incident:** A deployment pointed production at the staging database because a variable defined in two places let the wrong value win.

```console
$ ansible-inventory -i inventory/production/hosts.ini --host web1 | grep db_host
    "db_host": "db.staging.internal",
```

An old `-e @staging.json` was still in a shell alias. The team removed extra-vars files from routine use, put the database host only in `group_vars/production`, and added a check that prints the key variables for confirmation before the real run.

## Common mistakes

- Defining the same variable in many places
- Skipping `default` filters and failing on a missing value
- Editing the deployed file by hand and losing the change at the next run
- Putting secrets in plain variable files (see the vault lesson)

```quiz
Q: Which source overrides all inventory and play variables?
- group_vars/all.yml :: It is the broadest level.
+ Extra vars passed with -e
- host_vars :: They are specific but not the highest.
- Facts :: Facts are low in precedence.
> Extra vars are highest, which is useful for one-off overrides and dangerous as a habit.

Q: What is the purpose of gathered facts?
- To store passwords :: Facts hold host details, not secrets.
+ To give playbooks information about each host, such as OS and memory
- To speed up SSH :: Gathering adds work.
- To define groups :: Groups come from inventory.
> You can branch on facts or insert them into templates.

Q: What does {% for x in list %} do in a template?
- Prints a variable :: That is double braces.
+ Runs template logic that repeats a block for each item
- Imports a file :: Includes use other syntax.
- Defines a variable in the inventory :: Templates do not edit inventory.
> Jinja2 statements use percent braces.

Q: Which filter avoids a failure when a variable has not been set?
- upper :: It changes case.
+ default
- join :: It combines list items.
- length :: It counts items.
> default supplies a fallback value.
```

```cards
group_vars :: Variables applied to every host in a group
host_vars :: Variables applied to one host
Fact :: Information Ansible gathers about a host
Jinja2 :: The template language used by Ansible
Extra vars :: -e values that override almost everything
```
