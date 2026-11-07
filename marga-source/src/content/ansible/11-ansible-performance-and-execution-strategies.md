---
title: Ansible performance and execution strategies
minutes: 12
summary: Speed up Ansible runs with forks, pipelining, fact caching and smarter strategies, and control rollouts with serial and error limits.
---

Ansible is agentless, so every task costs an SSH round trip. On a few servers that is invisible. On hundreds it is the whole runtime, and the defaults are conservative.

## What you will learn

- Forks, pipelining and persistent connections
- Facts: gathering, caching and skipping
- Strategies, async and batches
- Failure limits for safe rollouts

## Connection tuning

```text
# ansible.cfg
[defaults]
forks = 50
gathering = smart
fact_caching = jsonfile
fact_caching_connection = /tmp/ansible-facts
fact_caching_timeout = 3600

[ssh_connection]
pipelining = True
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
```

**Forks** is how many hosts run in parallel. **Pipelining** reduces SSH operations per task, and **ControlPersist** reuses one connection per host. Pipelining needs `requiretty` disabled on targets.

## Facts

Gathering facts takes time on every host. Cache them, or turn it off when a play does not use them.

```yaml
- hosts: web
  gather_facts: false
  tasks:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```

## Strategies and async

The default **linear** strategy waits for each task on all hosts. The **free** strategy lets each host proceed independently, which helps when hosts differ in speed. Use `async` with `poll: 0` for long tasks such as package upgrades, and check later.

## Safe rollouts

```yaml
- hosts: web
  serial: [1, 5, "20%"]
  max_fail_percentage: 10
  any_errors_fatal: false
  tasks:
    - name: Deploy release
      ansible.builtin.include_role:
        name: app_release
    - name: Run the database migration once
      ansible.builtin.command: /opt/app/migrate
      run_once: true
```

`serial` limits how many hosts change at a time, starting with a canary. `max_fail_percentage` stops the play if too many fail. `run_once` runs a task on one host only. Profile slow runs with the `profile_tasks` callback.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Ansible performance and execution strategies fits together
node: n1 | Connection tuning | 0 | 0 | Forks is how many hosts run in parallel. | Gathering facts that are never used. | process
node: n2 | Facts | 1 | 1 | Gathering facts takes time on every host. | Changing all hosts at once. | process
node: n3 | Strategies and async | 2 | 0 | The default linear strategy waits for each task on all hosts. | Default forks on a large fleet. | process
node: n4 | Safe rollouts | 3 | 1 | serial limits how many hosts change at a time, starting with a canary. | No failure limit during rollouts. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: A forty minute run for a reload

> **Incident:** A simple change took forty minutes because of fact gathering and few forks.

```console
PLAY [web] ***************
Gathering Facts: 31m (forks=5)
Reload nginx: 2m
total time: 40m12s
```

The play gathered full facts it never used and ran only five hosts at a time. Turning off unneeded facts, caching the rest and raising forks reduced the total to eight minutes. A canary batch with serial was added for safety.

## Common mistakes

- Default forks on a large fleet
- Gathering facts that are never used
- Changing all hosts at once
- No failure limit during rollouts

```quiz
Q: What does pipelining do?
+ Reduces SSH operations per task
- Deletes facts :: No.
- Encrypts logs :: No.
- Adds hosts :: No.
> Faster connections. The lesson section above explains why.

Q: What does serial do?
+ Limits how many hosts change at once
- Speeds all hosts :: No.
- Disables errors :: No.
- Sorts hosts :: No.
> Safer rollouts. The lesson section above explains why.

Q: What does run_once do?
+ Runs a task on a single host
- Runs a play once a day :: No.
- Stops after one error :: No.
- Caches facts :: No.
> Good for migrations.

Q: What does max_fail_percentage do?
+ Stops the play when too many hosts fail
- Raises forks :: No.
- Skips facts :: No.
- Sets timeouts :: No.
> A safety brake. The lesson section above explains why.
```

```cards
forks :: Number of hosts handled in parallel
Pipelining :: Fewer SSH operations per task
serial :: Batch size for rolling changes
async :: Runs a task in the background
```
