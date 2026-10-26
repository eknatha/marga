---
title: Ansible at scale, testing and working with Terraform
minutes: 16
summary: Roll out changes safely with serial batches and limits, test roles with linting and Molecule, scale connections, and divide the work between Terraform and Ansible.
---

Running a playbook against three servers is easy. Running it against three hundred during business hours means batches, health checks, a way to stop, and tests that run before the change reaches anyone.

## What you will learn

- Rolling updates with `serial` and failure limits
- Linting and testing roles
- Performance settings for large inventories
- Where Ansible stops and Terraform starts
- A controller such as AWX or a pipeline

## Rolling updates

```yaml
- name: Rolling update of the web tier
  hosts: web
  become: true
  serial: "20%"
  max_fail_percentage: 10
  tasks:
    - name: Take the host out of the load balancer
      ansible.builtin.command: /opt/tools/lb-drain {{ inventory_hostname }}
      delegate_to: localhost
    - name: Update the application
      ansible.builtin.apt:
        name: shop-app
        state: latest
    - name: Wait for the health endpoint
      ansible.builtin.uri:
        url: "http://localhost:8080/health"
        status_code: 200
      register: health
      retries: 10
      delay: 5
      until: health.status == 200
    - name: Put the host back
      ansible.builtin.command: /opt/tools/lb-enable {{ inventory_hostname }}
      delegate_to: localhost
```

- `serial` updates a batch at a time instead of everything at once
- `max_fail_percentage` aborts the play when too many hosts fail
- `retries` with `until` waits for readiness rather than guessing a sleep
- `delegate_to` runs a task on another machine such as a load balancer or localhost
- `any_errors_fatal: true` stops the whole play at the first failure when a partial rollout is worse

## Test before you roll

```bash
ansible-lint site.yml
yamllint .
ansible-playbook site.yml --syntax-check
ansible-playbook site.yml --check --diff --limit web1.example.com
```

For roles, **Molecule** creates a throwaway container or VM, applies the role, runs it a second time to prove idempotence, then runs verification checks. A pipeline that runs lint, Molecule and a staging run catches most mistakes before production.

## Speed

- Turn off `gather_facts` or use `gather_subset` when you do not need all facts
- Raise `forks` (parallel connections, default 5) to match your control node and network
- Enable SSH connection reuse (`ControlPersist`) and pipelining
- Use `strategy: free` only when hosts are independent
- Avoid loops that call a module once per item when it accepts a list

## Ansible and Terraform

They solve neighbouring problems and work well together.

| Question | Better fit |
|----------|-----------|
| Create networks, servers, databases, load balancers | Terraform |
| Install packages, render configuration, manage users on a server | Ansible |
| Keep a machine matching a description over time | Ansible, or rebuild from an image |
| Build the server image once | A tool such as Packer, then Ansible inside it |

A common flow: Terraform creates instances and outputs addresses, a dynamic inventory reads them, and Ansible configures them. For container and Kubernetes workloads, immutable images often replace much of host configuration, but Ansible still manages the hosts that run them.

## Running it for a team

Running playbooks from laptops makes results depend on who ran them. A shared controller (AWX or the supported Automation Platform) or a CI pipeline gives you credentials kept in one place, job history, role-based access, scheduling and a standard environment.

```predict
Q: A play with serial: 2 targets ten hosts and the third host in the first batch fails. What happens to the remaining hosts?
???
Hosts already processed stay changed. Whether the remaining batches run depends on settings: by default the play continues for hosts that have not failed, but max_fail_percentage or any_errors_fatal can stop it.
> Decide your stop rule before the rollout, not during it.
```

```diagram
title: A safe fleet rollout
node: lint | Lint and test | 0 | 1 | ansible-lint, Molecule and check mode on a test host. | Skipping tests sends mistakes to every server at once.
node: canary | Canary batch | 1 | 1 | Update one small batch first and verify health. | A canary without a health check proves nothing.
node: waves | Serial waves | 2 | 1 | Continue in batches, draining and restoring each host. | Without a failure limit one bad change spreads fleet-wide.
node: verify | Verify | 3 | 1 | Check version, health and error rates after each wave. | No verification means failures are found by users.
edge: lint | canary
edge: canary | waves
edge: waves | verify
```

## Incident: the update that went to every server at once

> **Incident:** A playbook with no `serial` upgraded a library on all web servers simultaneously. The new version had a startup bug, and every server was down at the same moment.

```console
$ ansible-playbook upgrade.yml --list-hosts | tail -1
  hosts (240):
```

The team added `serial` with a canary batch, a health check between waves and `max_fail_percentage`, and made the pipeline refuse to run a production playbook that has none of these.

## Common mistakes

- Running all hosts at once during business hours
- Using fixed sleeps instead of health checks
- Using Ansible to create and destroy cloud infrastructure that Terraform already owns
- Letting laptops run production changes

```quiz
Q: What does serial do in a play?
- Runs tasks one after another :: Tasks already run in order.
+ Processes hosts in batches rather than all at once
- Orders the inventory :: It does not sort hosts.
- Limits SSH keys :: It is unrelated.
> Batching limits the blast radius of a bad change.

Q: Which tool is designed to test Ansible roles in disposable instances?
- Terraform :: It provisions infrastructure.
+ Molecule
- Vault :: It encrypts data.
- Jinja2 :: It is a template language.
> Molecule applies a role, repeats it to check idempotence and runs verification.

Q: Which pairing fits best?
- Ansible creates VPCs and Terraform installs packages :: This reverses the strengths.
+ Terraform creates the servers and Ansible configures them
- Both create the same servers :: Overlap causes conflicts.
- Neither can be combined :: They are commonly combined.
> Provisioning and configuration are separate concerns.

Q: Why wait for a health endpoint with retries and until?
- To slow the run :: The aim is correctness.
+ To continue only when the service is actually ready, not after a guessed delay
- To disable handlers :: They are unrelated.
- To avoid SSH :: SSH is still used.
> Waiting on readiness prevents sending traffic to a host that is not ready.
```

```cards
serial :: Run a play on hosts in batches
max_fail_percentage :: Abort when too many hosts fail
delegate_to :: Run a task on another host such as a load balancer
Molecule :: Framework for testing roles in throwaway instances
forks :: Number of hosts Ansible works on in parallel
```
