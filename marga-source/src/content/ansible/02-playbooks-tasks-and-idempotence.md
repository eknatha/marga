---
title: Playbooks, tasks and idempotence
minutes: 15
summary: Write YAML playbooks with plays and tasks, run them safely with check and diff modes, and understand why idempotence matters.
---

Ad-hoc commands fix one thing once. A playbook records the whole intended state of a server in a file you can review, run again and keep in version control. It is the central artifact of Ansible.

## What you will learn

- The structure of a playbook: plays, hosts, tasks
- Using common modules for packages, files, services and users
- Idempotence and how to read `changed` and `ok`
- Running with `--check`, `--diff` and `--limit`

## A first playbook

```yaml
- name: Configure web servers
  hosts: web
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: true

    - name: Create the site directory
      ansible.builtin.file:
        path: /var/www/shop
        state: directory
        owner: www-data
        mode: "0755"

    - name: Ensure nginx is running and starts on boot
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
```

- A **play** maps a group of hosts to tasks
- A **task** calls one module with arguments
- Tasks run top to bottom on each host, and a failed task stops that host
- `name` is optional but it is what you read in the output, so write good ones

Run it:

```bash
ansible-playbook -i inventory.ini site.yml
ansible-playbook -i inventory.ini site.yml --check --diff
ansible-playbook -i inventory.ini site.yml --limit web1.example.com
ansible-playbook site.yml --syntax-check
```

## Idempotence

A task is **idempotent** when running it again changes nothing once the desired state exists. The recap printed at the end of each run tells you:

```text
PLAY RECAP
web1 : ok=4  changed=0  unreachable=0  failed=0  skipped=0
```

A healthy second run shows `changed=0`. If it keeps reporting changes, something in your playbook is not describing a state, and it will hide real changes later.

Common causes of fake changes are `command` or `shell` tasks, which always report `changed`. Fix them in one of three ways:

```yaml
- name: Initialise the application once
  ansible.builtin.command: /opt/shop/bin/init-db
  args:
    creates: /opt/shop/.initialised

- name: Read the version without claiming a change
  ansible.builtin.command: /opt/shop/bin/version
  register: shop_version
  changed_when: false
```

`creates` skips the task when a file exists, and `changed_when: false` marks a read-only task as unchanged.

## Useful modules

| Need | Module |
|------|--------|
| Packages | `ansible.builtin.apt`, `dnf`, `package` |
| Files and directories | `file`, `copy`, `template`, `lineinfile` |
| Services | `service`, `systemd` |
| Users and keys | `user`, `authorized_key` |
| Run something | `command`, `shell` (last resort) |
| Download | `get_url`, `unarchive` |

Use the full name such as `ansible.builtin.apt`. It avoids ambiguity when collections from other sources define modules with the same short name.

## Check mode and diff

`--check` runs the play without changing anything, and `--diff` prints what would change in files. Together they act as the `plan` step of Ansible. Not every module can predict its effect, so a clean check is good evidence but not a guarantee.

```predict
Q: A playbook has a shell task running "echo done > /tmp/flag". You run it three times. What does the recap say on each run?
???
changed=1 each time, because shell always reports changed unless you add creates or changed_when.
> Idempotence is a property you build with the right module or conditions, not something Ansible guesses.
```

```diagram
title: Anatomy of a playbook run
node: play | Play | 0 | 1 | Picks the hosts and sets options such as become. | A wrong hosts pattern runs on too many or too few servers.
node: gather | Gather facts | 1 | 1 | Collects OS and hardware details from each host. | Slow on large fleets, and fails if Python is missing.
node: task | Tasks in order | 2 | 1 | Each task calls a module and reports ok, changed or failed. | A failed task stops the host, leaving it half configured.
node: recap | Recap | 3 | 1 | Counts of ok, changed, failed and unreachable per host. | Unread recaps hide hosts that silently failed.
edge: play | gather
edge: gather | task
edge: task | recap
```

## Incident: the playbook that restarted production every run

> **Incident:** A team scheduled a playbook every hour. Because one task always reported changed, a handler restarted the application hourly and caused short outages.

```console
$ ansible-playbook site.yml | tail -3
web1 : ok=9  changed=1  unreachable=0  failed=0  skipped=0
web2 : ok=9  changed=1  unreachable=0  failed=0  skipped=0
```

A `shell` task that wrote a timestamp into a config file was reporting a change every time. They replaced it with a `template` task that renders the same content when nothing changes, and added a pipeline check that fails when a second run is not clean.

## Common mistakes

- Using `shell` where a module exists
- Skipping the second run that proves idempotence
- Leaving tasks unnamed so output is unreadable
- Running a whole play when `--limit` would test it on one host first

```quiz
Q: What does a healthy second run of an idempotent playbook show?
- changed on every task :: That means something is not idempotent.
+ changed=0 for every host
- failed on one host :: That is a problem to fix.
- skipped for all tasks :: Skipped is for conditions that did not apply.
> Repeating a run should not change anything once the desired state exists.

Q: Which option shows what a playbook would change in files without changing them?
- --verbose :: It prints more output only.
+ --check --diff
- --limit :: It narrows the hosts.
- --syntax-check :: It only validates YAML structure.
> Check mode with diff acts like a plan.

Q: How do you make a read-only command task report no change?
- Add become :: That changes privileges, not reporting.
+ Add changed_when: false
- Rename the task :: The name does not affect results.
- Use ignore_errors :: It hides failure, not change.
> The task still runs but is reported as ok.

Q: Why use ansible.builtin.apt instead of apt?
- It runs faster :: Speed is the same.
+ The full name avoids ambiguity with modules from other collections
- It is required for Debian :: The short form still works.
- It enables check mode :: Check mode is separate.
> Fully qualified names make playbooks explicit and portable.
```

```cards
Play :: Maps a group of hosts to a list of tasks
Task :: One call to a module with arguments
changed=0 :: The sign of an idempotent second run
creates argument :: Skips a command when a file already exists
--check --diff :: Preview changes without applying them
```
