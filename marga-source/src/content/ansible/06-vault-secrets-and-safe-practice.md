---
title: Ansible Vault, secrets and safe practice
minutes: 14
summary: Keep passwords and keys out of plain text with Ansible Vault, hide secrets from logs, limit privilege escalation and review what automation can reach.
---

Automation holds the keys to your servers: SSH access, sudo rights, database passwords and API tokens. If those leak, the blast radius is every machine the automation can reach, so secret handling is part of the job, not an extra.

## What you will learn

- Encrypting values and files with Ansible Vault
- Keeping secrets out of logs with `no_log`
- Using an external secret manager instead
- Least privilege for the automation itself

## Ansible Vault

Vault encrypts a file or a single value so it can sit next to your playbooks. Without the vault password it is unreadable.

```bash
ansible-vault create group_vars/prod/vault.yml
ansible-vault edit group_vars/prod/vault.yml
ansible-vault encrypt_string 's3cret-value' --name 'vault_db_password'
ansible-playbook site.yml --vault-id prod@prompt
```

A common pattern keeps readable variable names pointing to encrypted ones:

```yaml
# group_vars/prod/vars.yml (readable, safe to review)
db_password: "{{ vault_db_password }}"
```

```yaml
# group_vars/prod/vault.yml (encrypted with ansible-vault)
vault_db_password: placeholder-replaced-by-encrypted-content
```

Reviewers can see which variables exist and where they are used, while the values stay encrypted. Use separate vault IDs for different environments so a developer with staging access cannot read production secrets.

## Where the vault password comes from

- Prompt interactively (`--vault-id prod@prompt`)
- A password file outside the repository with tight permissions
- A script that fetches it from your secret manager or CI secret store

Never commit the vault password next to the encrypted files. That defeats the point.

## Keep secrets out of output

Verbose output and logs can print task arguments. Mark sensitive tasks:

```yaml
- name: Set the database password
  community.postgresql.postgresql_user:
    name: shop
    password: "{{ db_password }}"
  no_log: true
```

`no_log: true` hides the task's arguments and results, including useful error details, so enable it only for tasks that handle secrets and debug with a safe test copy.

## Better: do not store long-lived secrets at all

Vault is fine for small teams. Larger teams often fetch secrets at run time from a manager such as HashiCorp Vault or a cloud secret service using a lookup plugin, so secrets are rotated and audited in one place. Whatever you choose, rotate any secret that has ever appeared in a log or a repository.

## Least privilege for the automation

- Use a dedicated SSH key or short-lived certificate for Ansible, not a person's key
- Give the account only the sudo commands it needs where possible
- Limit which hosts the control node can reach with network rules
- Protect the control node like production: patch it, restrict logins, log access
- Review third-party roles and collections before running them as root

```predict
Q: A task prints the database password in the output when you run with -vvv. Which setting prevents this?
???
no_log: true on that task. It hides the arguments and result from the console and logs.
> Remember to remove it temporarily on a test copy if you need the hidden error text.
```

```diagram
title: How a secret travels through a run
node: store | Encrypted vault file | 0 | 1 | The value is stored encrypted in the repository. | A leaked vault password exposes every value in the file.
node: pw | Vault password source | 1 | 0 | Prompt, protected file or secret manager. | A password committed with the files cancels the encryption.
node: play | Playbook run | 1 | 2 | Decrypts in memory and renders tasks. | Verbose output may print values without no_log.
node: host | Target host | 2 | 1 | The secret is written to a protected file or passed to a service. | A world-readable file undoes the protection.
edge: store | play
edge: pw | play
edge: play | host
```

## Incident: the password in the build log

> **Incident:** A database password appeared in a CI build log because a task ran with verbose output and no `no_log`. The log was readable by the whole company.

```console
$ ansible-playbook site.yml -vvv | grep -i password
"password": "REDACTED-IN-THIS-EXAMPLE"
```

The team rotated the password, added `no_log` to every task that handles credentials, restricted who can read pipeline logs, and added a scanner that fails the pipeline if secrets appear in output.

## Common mistakes

- Committing the vault password file
- One vault password for all environments
- Using `no_log` everywhere so failures become undebuggable
- Running automation with a personal, over-privileged account

```quiz
Q: What does ansible-vault do?
- Starts a secrets server :: It does not run a server.
+ Encrypts files or values so they can be stored with playbooks
- Hides tasks in output :: That is no_log.
- Manages SSH keys :: It is not a key manager.
> Vault is file and string encryption protected by a password.

Q: Which setting hides a task's arguments and results from output?
- changed_when :: It controls change reporting.
+ no_log: true
- ignore_errors :: It hides failures, not data.
- tags :: Tags select tasks to run.
> Use it on tasks that handle credentials.

Q: Why use separate vault IDs per environment?
- It is faster :: Speed does not change.
+ People with access to one environment cannot decrypt another environment's secrets
- To avoid YAML :: It has no relation.
- Vault requires it :: It is optional but wise.
> It limits the blast radius of a leaked password.

Q: Where should the vault password be kept?
- In the same repository :: This cancels the protection.
+ Outside the repository, entered at run time or fetched from a secret manager
- In a comment in the playbook :: That exposes it.
- In the inventory :: It would be readable.
> Treat the vault password as the key to everything inside.
```

```cards
Ansible Vault :: Encrypts files or strings for storage with playbooks
no_log :: Hides a task's arguments and result from logs
Vault ID :: A label that lets you use different vault passwords
Least privilege :: Give automation only the access it needs
Secret rotation :: Replacing a credential after exposure or on a schedule
```
