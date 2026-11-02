## What does it mean that Ansible is agentless?
level: junior
Nothing has to be installed on the managed servers except Python and an SSH (or WinRM) login. The control node connects, copies a small module, runs it, reads the result and removes it. That avoids patching and securing a daemon on every host, and it fits a push model where you choose when changes happen.

## What is idempotence and why does it matter?
level: junior
A task is idempotent when running it again changes nothing once the desired state exists. Ansible modules such as package, file and service check current state and report changed only when they alter something. It lets you re-run playbooks safely, detect drift (a run that shows changes means something differed), and recover from partial failures.

## What is the difference between a play, a task and a role?
level: junior
A task calls one module with arguments. A play maps a group of hosts to a list of tasks. A role packages tasks, handlers, templates, defaults and files for one job so it can be reused in many plays. A playbook is a file containing one or more plays.

## How do handlers work?
level: mid
A handler is a task that runs only when notified by a task that reported changed, and it runs once at the end of the play however many tasks notified it. This is how you reload a service only when its configuration changed. If the play fails before handlers run they are skipped unless you flush them or use force-handlers, so critical reloads need care.

## How does variable precedence work, and how do you keep it manageable?
level: mid
Ansible has many precedence levels, but the rule of thumb is that more specific beats more general and extra vars on the command line beat everything. To keep it manageable, define each variable in one place, put role settings in defaults with a role-name prefix, keep environment values in per-environment group_vars, and inspect the real value with ansible-inventory --host.

## How do you keep secrets safe in Ansible?
level: mid
Encrypt secret files or strings with Ansible Vault, using separate vault IDs per environment and keeping the vault password outside the repository, or fetch secrets at run time from a secret manager. Use no_log on tasks that handle credentials, restrict who can read pipeline logs, give the automation account least privilege, and rotate any secret that appears in a log or repository.

## How do you roll out a change to hundreds of servers safely?
level: senior
Test with lint and Molecule, run check mode against a staging copy, then run production with serial batches starting with a canary, drain each host from the load balancer, wait for a health check with retries, and set max_fail_percentage or any_errors_fatal so a bad change stops early. Run it from a shared controller or pipeline with job history and approvals, not from a laptop.

## When would you use Terraform and when Ansible?
level: senior
Terraform is declarative infrastructure provisioning: networks, instances, databases, load balancers, with state that tracks what exists. Ansible configures what runs on machines: packages, files, users and services, and orchestrates procedural rollouts. A common flow is Terraform creates hosts, a dynamic inventory reads them, and Ansible configures them, or Packer and Ansible build images so servers are replaced rather than patched.
