---
title: Debugging Ansible runs, connections and variables
minutes: 15
summary: Find why a playbook failed, a host is unreachable, a variable has the wrong value, or a run is slow, using verbosity, debug, step mode and logs.
---

Ansible failures usually fall into four groups: the connection did not work, privilege escalation did not work, the data (variables, templates) was wrong, or the module failed on the target. Naming the group tells you where to look.

## What you will learn

- Reading the failure message and the recap
- Using `-v`, `debug`, `--step` and `--start-at-task`
- Fixing connection, privilege and Python problems
- Finding the real value of a variable
- Finding slow tasks

## Four groups of failure

| Group | Typical message | First step |
|-------|-----------------|------------|
| Connection | `UNREACHABLE! ... Permission denied (publickey)` | `ssh -vvv user@host` with the same key |
| Privilege | `Missing sudo password`, `Permission denied` | Check `become`, sudoers and the user |
| Data | an error naming a missing variable, or a template error | `debug` the variable, `ansible-inventory --host` |
| Module on target | `FAILED! ... No package matching` | Read the module message, run it ad hoc with `-vvv` |

## Verbosity and a closer look

```bash
ansible-playbook site.yml -v          # task results
ansible-playbook site.yml -vvv        # connection details
ansible web1.example.com -i inventory.ini -m setup | head
ansible-playbook site.yml --start-at-task "Render nginx configuration"
ansible-playbook site.yml --step      # confirm each task
ansible-playbook site.yml --check --diff --limit web1.example.com
ansible-config dump --only-changed
```

`-vvv` shows the SSH command, which you can run by hand. `--step` and `--start-at-task` help when a long play fails near the end and you do not want to repeat the first twenty tasks.

## Look at the data

```yaml
- name: Show what the host really sees
  ansible.builtin.debug:
    var: db_host

- name: Show a computed value
  ansible.builtin.debug:
    msg: "{{ app_backends | length }} backends, first is {{ app_backends | first }}"
```

```bash
ansible-inventory -i inventory.ini --host web1.example.com
ansible-inventory -i inventory.ini --list --yaml
```

`ansible-inventory --host` shows variables from inventory sources, which is the quickest way to catch a wrong value from the wrong place.

## Typical fixes

- **Permission denied (publickey)**: wrong user or key. Confirm with plain `ssh`, set `ansible_user` and `ansible_ssh_private_key_file`.
- **Host key verification failed**: add the host key properly rather than turning checking off for all hosts.
- **Python not found on target**: install Python, or set `ansible_python_interpreter`.
- **Missing sudo password**: allow passwordless sudo for the automation user, or provide `--ask-become-pass`.
- **Missing variable in a template**: define it, or use `default`, and fail early with an `assert` task that explains what is missing.
- **Slow run**: use the `profile_tasks` callback to list the slowest tasks, then reduce fact gathering or raise forks.

```yaml
- name: Stop early if required data is missing
  ansible.builtin.assert:
    that:
      - db_host is defined
      - app_port | int > 1024
    fail_msg: "db_host must be set and app_port must be above 1024"
```

Do not "fix" a failure by adding `ignore_errors`. That moves the problem somewhere harder to see.

```predict
Q: A play fails with "UNREACHABLE! ... Permission denied (publickey)" for one host only. What is the fastest check?
???
Run ssh -vvv with the same user and key to that host. Compare ansible_user, the key path and the authorised key on that server with the working hosts.
> Ansible uses ordinary SSH, so a failure there is an SSH failure first.
```

```diagram
title: Narrowing down a failing Ansible run
node: read | Read the error | 0 | 1 | Note the host, task name and message type. | Skipping to retries wastes time and may repeat damage.
node: conn | Connection and privilege | 1 | 0 | ssh -vvv, become settings, sudoers. | Wrong user or key looks like a random failure.
node: data | Variables and templates | 1 | 2 | debug, ansible-inventory --host, assert tasks. | A value from the wrong file gives wrong but valid output.
node: mod | Module on the target | 2 | 1 | Run the module ad hoc with -vvv on one host. | Missing packages or Python surface only at run time.
node: fix | Fix and re-run | 3 | 1 | Change code or data, test on one host, then run the fleet. | Re-running everything without a canary repeats the failure widely.
edge: read | conn
edge: read | data
edge: conn | mod
edge: data | mod
edge: mod | fix
```

## Incident: the template that rendered an empty list

> **Incident:** A firewall template used a variable that was empty on one group of servers. Ansible rendered a valid file with no allow rules, and the load balancer health checks started failing.

```console
$ ansible-inventory -i inventory/production/hosts.ini --host app7 | grep allowed
    "allowed_sources": [],
```

A missing entry in `group_vars` for that group caused it. The team added an `assert` that the list is not empty, a `--check --diff` step in the pipeline, and a canary host before wider rollout.

## Common mistakes

- Running with `ignore_errors` to make the red go away
- Debugging on all hosts instead of one with `--limit`
- Turning off host key checking for everyone
- Not reading the line above the error

```quiz
Q: What does -vvv show that helps with connection failures?
- The playbook source :: You already have it.
+ The SSH command and connection details used
- The vault password :: It should never be shown.
- Only task names :: Lower verbosity shows that.
> You can copy the SSH command and run it manually to see the same failure.

Q: Which command shows the variables a host really receives from inventory?
- ansible-vault view :: It shows encrypted files.
+ ansible-inventory --host NAME
- ansible-galaxy list :: It lists roles.
- ansible-doc :: It shows module documentation.
> It reveals the winning value and where hosts get their variables.

Q: How can a long play be resumed near the failure?
- Delete the inventory :: This makes it worse.
+ --start-at-task with the task name
- --syntax-check :: It only checks syntax.
- --list-hosts :: It only lists hosts.
> Because the tasks are idempotent, resuming at a later task is safe once the cause is fixed.

Q: Why is an assert task useful?
- It speeds up SSH :: It does not.
+ It fails early with a clear message when required data is missing or invalid
- It encrypts values :: That is Vault.
- It disables handlers :: It does not.
> Early, specific failures beat a valid but wrong rendered file.
```

```cards
Reading UNREACHABLE :: A connection problem, check SSH first
ansible-inventory --host :: Shows the variables one host receives
--start-at-task :: Resume a play from a named task
assert module :: Fails early when conditions are not met
profile_tasks :: Callback that lists the slowest tasks
```
