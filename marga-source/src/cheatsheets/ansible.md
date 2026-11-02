---
title: Ansible
summary: Inventory, ad-hoc commands, playbook structure, variables, handlers, roles, Vault and safe rollout flags.
module: ansible
---

## Ad-hoc commands

```bash
ansible all -i inventory.ini -m ping
ansible web -i inventory.ini -m command -a "uptime"
ansible web -i inventory.ini -m apt -a "name=nginx state=present" --become
ansible-inventory -i inventory.ini --graph
ansible-inventory -i inventory.ini --host web1.example.com
```

| Flag | Meaning |
|------|---------|
| `-m` | Module to run |
| `-a` | Module arguments |
| `--become` | Run with elevated rights |
| `--limit` | Restrict to some hosts |
| `--check` | Show what would change |

## Running playbooks

```bash
ansible-playbook -i inventory.ini site.yml
ansible-playbook site.yml --syntax-check
ansible-playbook site.yml --check --diff --limit web1.example.com
ansible-playbook site.yml --tags config --skip-tags slow
ansible-playbook site.yml --start-at-task "Render nginx configuration"
ansible-playbook site.yml --list-tasks
```

## Playbook skeleton

```yaml
- name: Configure web servers
  hosts: web
  become: true
  vars:
    app_port: 8080
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
    - name: Render configuration
      ansible.builtin.template:
        src: shop.conf.j2
        dest: /etc/nginx/conf.d/shop.conf
        validate: "nginx -t -c /etc/nginx/nginx.conf"
      notify: Reload nginx
  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```

Read the recap: a clean second run shows `changed=0`.

## Control flow

```yaml
- name: Only on Debian
  ansible.builtin.apt:
    name: nginx
  when: ansible_facts['os_family'] == "Debian"

- name: Make users
  ansible.builtin.user:
    name: "{{ item }}"
  loop: [alice, bob]
```

| Tool | Use |
|------|-----|
| `when` | Run a task only if true |
| `loop` | Repeat for each item |
| `block` / `rescue` / `always` | Try, catch, finally |
| `changed_when: false` | Mark a read-only task as unchanged |
| `no_log: true` | Hide secrets from output |

## Roles and collections

```bash
ansible-galaxy init roles/nginx
ansible-galaxy install -r requirements.yml
ansible-galaxy collection list
```

Pin versions in `requirements.yml`. Put overridable settings in `defaults/main.yml` and prefix variable names with the role name.

## Vault

```bash
ansible-vault create group_vars/prod/vault.yml
ansible-vault edit group_vars/prod/vault.yml
ansible-vault encrypt_string 'value' --name 'vault_db_password'
ansible-playbook site.yml --vault-id prod@prompt
```

Keep the vault password out of the repository.

## Safe rollout

```yaml
- hosts: web
  serial: "20%"
  max_fail_percentage: 10
```

Test with `ansible-lint` and Molecule. Use a canary batch and a health check before continuing.

## Troubleshooting

| Symptom | First step |
|---------|-----------|
| UNREACHABLE, publickey | `ssh -vvv` with the same user and key |
| Missing sudo password | Check `become` and sudoers |
| Missing variable | `ansible-inventory --host`, add `default` or `assert` |
| Slow run | `gather_facts: false`, more forks, `profile_tasks` |

> **Warning:** `ansible-playbook` without `--limit` or `serial` changes every host in the group at once. Test on one host first.

> **Danger:** Never commit the vault password next to the encrypted files. It cancels the protection.

> **Warning:** `ignore_errors: true` hides failures and lets later tasks run on a broken base. Fix the cause or use `rescue`.

> **Warning:** `shell` and `command` always report `changed` unless you add `creates` or `changed_when`.
