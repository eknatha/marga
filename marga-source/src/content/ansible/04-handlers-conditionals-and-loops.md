---
title: Handlers, conditionals and loops
minutes: 14
summary: Control task flow with when conditions, loops, handlers that fire on change, block/rescue error handling and tags.
---

Real servers differ and real changes need follow-up: reload the web server only if its config changed, install a package only on Debian family hosts, create five users without five copied tasks. These tools give a playbook that flow without turning it into a script.

## What you will learn

- `when` conditions
- `loop` over lists and dictionaries
- Handlers and when they run
- `block`, `rescue` and `always`
- Tags and limiting a run

## Conditions

```yaml
- name: Install on Debian family
  ansible.builtin.apt:
    name: nginx
    state: present
  when: ansible_facts['os_family'] == "Debian"

- name: Install on Red Hat family
  ansible.builtin.dnf:
    name: nginx
    state: present
  when: ansible_facts['os_family'] == "RedHat"
```

`when` takes a plain expression with no braces. Combine conditions with `and`, `or` and `not`, and use `is defined` to test a variable.

## Loops

```yaml
- name: Create service users
  ansible.builtin.user:
    name: "{{ item.name }}"
    groups: "{{ item.groups }}"
    state: present
  loop:
    - { name: alice, groups: "sudo" }
    - { name: bob, groups: "developers" }
```

Use `loop_control` with `label` to keep output short when items are large. Do not loop over a package list with many tasks, because most package modules accept a list in `name` and do it in one transaction.

## Handlers

A **handler** is a task that runs only when notified, and only once at the end of the play, however many tasks notified it.

```yaml
- name: Web configuration
  hosts: web
  become: true
  tasks:
    - name: Render nginx configuration
      ansible.builtin.template:
        src: shop.conf.j2
        dest: /etc/nginx/conf.d/shop.conf
        validate: "nginx -t -c /etc/nginx/nginx.conf"
      notify: Reload nginx

    - name: Ensure nginx is running
      ansible.builtin.service:
        name: nginx
        state: started

  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```

The reload happens only if the template task reported `changed`. If a later task fails before the handlers run, the handler is skipped unless you use `meta: flush_handlers` or `--force-handlers`, which is a common source of "config changed but service not reloaded".

## Handling errors

```yaml
- name: Deploy with a safety net
  block:
    - name: Update the application
      ansible.builtin.copy:
        src: app-v2.tar.gz
        dest: /opt/shop/app.tar.gz
    - name: Restart the application
      ansible.builtin.service:
        name: shop
        state: restarted
  rescue:
    - name: Roll back to the previous release
      ansible.builtin.command: /opt/shop/bin/rollback
  always:
    - name: Report the outcome
      ansible.builtin.debug:
        msg: "Deployment attempt finished"
```

`rescue` runs if something in the block fails, and `always` runs regardless. `ignore_errors: true` is different: it keeps going after a failure and hides the problem, so use it rarely and with a comment.

## Tags and limiting

```bash
ansible-playbook site.yml --tags config
ansible-playbook site.yml --skip-tags slow
ansible-playbook site.yml --list-tasks
```

Tags let you run part of a playbook. Combine with `--limit` to test on one host before the fleet.

```predict
Q: Three tasks all notify "Reload nginx" and all report changed. How many times does the handler run?
???
Once, at the end of the play. Handlers are deduplicated, and they run only if at least one notifying task changed something.
> That behaviour avoids repeated restarts during one run.
```

```diagram
title: How a change triggers a reload
node: task | Config task | 0 | 1 | Renders the file and reports changed or ok. | An always-changed task triggers needless reloads.
node: notify | Notify | 1 | 1 | Queues the handler only if the task changed. | A typo in the handler name means it never runs.
node: end | End of play | 2 | 1 | Queued handlers run once each after all tasks. | A failure before this point may skip the handler.
node: handler | Handler runs | 3 | 1 | Reloads the service with the new configuration. | A reload without validation can take the service down.
edge: task | notify
edge: notify | end
edge: end | handler
```

## Incident: the handler that never ran

> **Incident:** A new certificate was deployed and the play reported success, but the site kept serving the old one for days because the play failed after the copy and before the handlers.

```console
$ ansible-playbook site.yml
TASK [Copy certificate] changed
TASK [Run database check] fatal: FAILED
RUNNING HANDLER [Reload nginx] skipped
```

The team added `meta: flush_handlers` right after the copy task and turned on `--force-handlers` in the pipeline. They also added a post-deploy check that reads the certificate expiry date from the live site.

## Common mistakes

- Braces inside `when`
- Using `ignore_errors` instead of fixing or rescuing
- Restarting a service from a normal task (it restarts on every run)
- Putting everything in one giant play with no tags

```quiz
Q: When does a handler run?
- After every task :: It would then be an ordinary task.
+ Once at the end of the play, if a task notified it by reporting changed
- Before the tasks :: Handlers follow tasks.
- Only on failure :: That is rescue.
> This lets many changes trigger a single reload.

Q: What does a rescue section do?
- Runs always :: That is always.
+ Runs when a task in the block fails
- Ignores errors silently :: Rescue is explicit handling.
- Skips the block :: It runs after a failure in it.
> Block, rescue and always work like try, catch and finally.

Q: Which is the correct condition syntax?
- when: "{{ ansible_os_family }} == 'Debian'" :: Braces are not used in when.
+ when: ansible_facts['os_family'] == "Debian"
- when = Debian :: This is not valid.
- if: Debian :: Ansible uses when.
> The expression is evaluated directly as Jinja2.

Q: Why is ignore_errors usually a smell?
- It is slow :: Speed is not the issue.
+ It hides failures so later tasks run on a broken base
- It breaks YAML :: It is valid YAML.
- It disables handlers :: It does not.
> Prefer fixing the cause, a failed_when rule or a rescue block.
```

```cards
when :: Runs a task only if an expression is true
loop :: Repeats a task for each item in a list
Handler :: A task that runs once at the end if notified by a change
block / rescue :: Group tasks and handle failure like try and catch
Tags :: Labels that let you run part of a playbook
```
