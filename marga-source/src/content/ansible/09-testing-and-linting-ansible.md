---
title: Testing and linting Ansible code
minutes: 12
summary: Catch mistakes before production with ansible-lint, syntax checks, check mode, Molecule and idempotence tests.
---

A one-character YAML mistake in a role reached production and restarted every web server at once. Infrastructure code is code, and it deserves the same safety net: lint in the editor, tests in the pipeline, and a rehearsal on disposable machines.

## What you will learn

- Static checks: syntax and ansible-lint
- Check and diff mode
- Molecule: test roles on disposable instances
- Idempotence tests and a pipeline layout

## Static checks

```console
$ ansible-playbook site.yml --syntax-check
$ ansible-lint
```

`ansible-lint` flags risky patterns: shell where a module exists, missing `name`, tasks that are never idempotent, deprecated syntax and unquoted file modes. Keep a `.ansible-lint` file with the rules you follow and fix the warnings rather than ignoring them.

```yaml
# .ansible-lint
profile: production
exclude_paths:
  - molecule/
```

## Check and diff mode

```console
$ ansible-playbook site.yml --check --diff --limit role_web
```

Check mode predicts changes without making them, and diff mode shows the exact file changes. It is excellent for review, but not perfect: tasks that depend on earlier changes, or modules that cannot predict (for example `command`), may be skipped. Treat it as a preview, not a guarantee.

## Molecule

Molecule creates disposable containers or virtual machines, applies a role, verifies the result, and destroys them.

```yaml
# molecule/default/molecule.yml
driver:
  name: docker
platforms:
  - name: debian12
    image: debian:12
    pre_build_image: true
provisioner:
  name: ansible
verifier:
  name: ansible
```

```yaml
# molecule/default/verify.yml
- hosts: all
  tasks:
    - name: Nginx answers
      ansible.builtin.uri:
        url: http://localhost
        status_code: 200
```

`molecule test` runs the sequence. Test the platforms you really use, for example two operating system versions.

## Idempotence and pipeline

A good role changes something the first time and nothing the second. Molecule checks this: the second converge must report `changed=0`. A task that always reports changed (often a raw `command`) hides real changes and makes check mode useless; add `changed_when` or use a module.

A sensible pipeline: lint and syntax check on every commit, Molecule on pull requests, check and diff mode against staging before production, and a canary run with `serial: 1` first.

```predict
Q: Molecule reports changed=3 on the second run of a role. What does it mean?
???
Three tasks are not idempotent; they change something every time and should be fixed.
> Repeated runs should converge to no changes.
```

## Incident: The task that always changed

> **Incident:** A nightly Ansible run reported 14 changes every night, so nobody noticed when a real, unwanted change appeared.

```console
PLAY RECAP
web-01 : ok=42 changed=14 unreachable=0 failed=0
$ ansible-lint roles/base
roles/base/tasks/main.yml:31: no-changed-when: Commands should not change things if nothing needs doing
```

Several tasks used shell commands that always reported changed. The team replaced them with proper modules or added changed_when conditions, then added Molecule idempotence tests to the pipeline. Nightly runs now report zero changes in the normal case, so a non-zero number is a genuine signal worth an alert.

## Common mistakes

- Ignoring lint warnings
- Trusting check mode as a guarantee
- Roles that are not idempotent
- Testing only on one operating system version

```quiz
Q: What does ansible-lint do?
+ Flags risky or outdated patterns in playbooks and roles
- Runs the playbook :: It does not run it.
- Encrypts variables :: That is vault.
- Builds images :: Not its job.
> A fast first safety net.

Q: What does --check --diff show?
+ Predicted changes and file differences without applying them
- Only syntax errors :: That is --syntax-check.
- Nothing :: It shows predictions.
- The inventory :: Not its purpose.
> A preview, not a guarantee.

Q: What is Molecule used for?
+ Testing roles on disposable instances
- Monitoring servers :: Not its job.
- Writing inventories :: Not its job.
- Storing secrets :: Not its job.
> Rehearse on throwaway machines.

Q: What should a second run of a role report?
+ changed=0
- changed=1 :: That is a non-idempotent task.
- failed=1 :: That is failure.
- unreachable=1 :: That is a connection issue.
> Idempotence is the test.
```

```cards
Syntax check :: ansible-playbook --syntax-check
Lint :: ansible-lint with a production profile
Preview :: --check --diff
Disposable tests :: Molecule
Second run :: changed=0
```
