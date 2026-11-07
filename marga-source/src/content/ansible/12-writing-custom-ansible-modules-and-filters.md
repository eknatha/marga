---
title: Writing custom Ansible modules and filters
minutes: 12
summary: Extend Ansible with a small Python module or filter plugin, keep it idempotent, support check mode and test it.
---

Most tasks have a module already. When yours does not, a small Python module is better than a pile of shell commands, because it can check state, support dry runs and explain what changed.

## What you will learn

- Module structure: arguments, state check, change, result
- Idempotence and check mode
- Filter plugins for data transformation
- Testing and distributing with collections

## A small module

```python
#!/usr/bin/python
from ansible.module_utils.basic import AnsibleModule
import os

def main():
    module = AnsibleModule(
        argument_spec=dict(
            path=dict(type="path", required=True),
            content=dict(type="str", required=True),
        ),
        supports_check_mode=True,
    )
    path, content = module.params["path"], module.params["content"]
    current = open(path).read() if os.path.exists(path) else None
    changed = current != content
    if changed and not module.check_mode:
        with open(path, "w") as f:
            f.write(content)
    module.exit_json(changed=changed, path=path)

if __name__ == "__main__":
    main()
```

The module declares its arguments, reads the **current state**, compares it with the **desired state** and acts only if they differ. With `check_mode`, it reports what would change without doing it. Use `fail_json(msg=...)` for errors.

## Filters

```python
# plugins/filter/bytes_human.py
class FilterModule:
    def filters(self):
        return {"bytes_human": self.bytes_human}

    def bytes_human(self, n):
        for unit in ["B", "KiB", "MiB", "GiB"]:
            if n < 1024:
                return f"{n:.0f} {unit}"
            n /= 1024
        return f"{n:.1f} TiB"
```

Use it as `{{ ansible_memtotal_mb * 1048576 | bytes_human }}`. Filters are pure functions and should not touch the system.

## Test and ship

Unit test the logic with pytest, run the module in a playbook twice and check that the second run reports no change, and run with `--check --diff`. Package modules and plugins in a **collection** with a version and documentation, and keep them in the same repository as the roles that use them.

```bash
ansible-playbook site.yml --check --diff
ansible-test sanity --docker
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Writing custom Ansible modules and filters fits together
node: n1 | A small module | 0 | 0 | The module declares its arguments, reads the current state, compares it with the desired state and acts only if they differ. | No check mode support. | process
node: n2 | Filters | 1 | 1 | Use it as {{ ansible_memtotal_mb * 1048576 / bytes_human }}. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n3 | Test and ship | 2 | 0 | Unit test the logic with pytest, run the module in a playbook twice and check that the second run reports no change, and run with --check --diff. | Shell commands that always report changed. | observe
edge: n1 | n2
edge: n2 | n3
```

## Incident: Always changed

> **Incident:** A shell-based task reported changed on every run and hid real changes.

```console
TASK [create user] changed: [web-01]
TASK [create user] changed: [web-01]   (second run)
PLAY RECAP: changed=1 on every run
```

A command task created a user and always reported a change, which made review of real changes impossible. The team wrote a module that checked whether the user existed first, supported check mode and was tested for idempotence in CI.

## Common mistakes

- Shell commands that always report changed
- No check mode support
- Writing a module when one exists
- No tests for idempotence

```quiz
Q: What makes a module idempotent?
+ It checks current state before changing
- It always writes :: No.
- It uses shell :: No.
- It ignores errors :: No.
> Repeat runs do nothing.

Q: What does check mode do?
+ Reports changes without making them
- Deletes files :: No.
- Speeds runs :: No.
- Installs modules :: No.
> A dry run. The lesson section above explains why.

Q: What should a filter do?
+ Transform data without side effects
- Change the system :: No.
- Open ports :: No.
- Restart services :: No.
> Filters are pure functions.

Q: How ship custom modules?
+ In a versioned collection
- Pasted into chat :: No.
- On a laptop :: No.
- Unversioned :: No.
> Share and test them.
```

```cards
Module :: A unit of work Ansible runs on a target
Check mode :: Dry run that reports would-be changes
Filter plugin :: Function used in templates
Collection :: Packaged modules, plugins and roles
```
