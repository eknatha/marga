## Task always shows changed
level: junior
A playbook is run twice and the second run is not clean.

```text
TASK [Write timestamp file] ******
changed: [web1]
PLAY RECAP
web1 : ok=5 changed=1 failed=0
```
? What is the most likely cause?
+ The task uses shell or command, which always reports changed unless told otherwise
- Ansible has a bug in recap
- The inventory is wrong
- Facts were not gathered
why: command and shell cannot tell whether anything changed. Use a proper module, or add creates, removes or changed_when so the result reflects reality.

## Permission denied (publickey)
level: junior
One host fails while the others work.

```text
fatal: [web4]: UNREACHABLE! => Permission denied (publickey).
```
? What do you check first?
+ Run ssh -vvv to that host with the same user and key and compare with a working host
- Rewrite the playbook
- Raise forks
- Add ignore_errors to the play
why: This is an SSH failure, not an Ansible one. Check ansible_user, the key path and the authorized key on that server.

## Handler skipped after failure
level: mid
A new certificate was copied, a later task failed, and the site still serves the old certificate.

```text
TASK [Copy certificate] changed
TASK [Check database] FAILED
RUNNING HANDLER [Reload nginx] skipped
```
? Why was the reload skipped, and what fixes it?
+ Handlers run at the end only if the play completes for that host. Flush handlers after the copy or use force-handlers
- Handlers only run on Mondays
- The certificate copy failed silently
- Reload cannot be a handler
why: A failure before the handler stage skips pending handlers by default. meta: flush_handlers or --force-handlers runs them.

## Wrong database host in production
level: mid
Production was configured with staging values.

```text
$ ansible-inventory --host web1 | grep db_host
    "db_host": "db.staging.internal"
```
? What should you do?
+ Find where the value comes from, for example an extra vars file or a duplicate in group_vars, and define it in one place
- Edit the file on the server by hand
- Run the play again with more verbosity
- Delete the inventory
why: ansible-inventory --host shows the winning value. Extra vars beat everything, so a stale -e file is a common cause.

## Update on all servers at once
level: senior
A library upgrade is about to run on 240 web servers.

```text
$ ansible-playbook upgrade.yml --list-hosts | tail -1
  hosts (240):
```
? What change makes this rollout safer?
+ Add serial with a small canary batch, health checks between waves and max_fail_percentage
- Increase forks to finish sooner
- Add ignore_errors
- Run it from a laptop
why: A bad version should reach a handful of hosts first, with an automatic stop when failures appear.

## Password in the build log
level: mid
A CI log shows a database password.

```text
$ ansible-playbook site.yml -vvv | grep -i password
"password": "..."
```
? What do you do?
+ Rotate the password, add no_log to tasks handling credentials and restrict who can read logs
- Delete the log and carry on
- Disable vault
- Lower the verbosity only
why: Treat the secret as exposed. no_log prevents recurrence, and rotation fixes the actual risk.

## Which variable wins
level: junior
The same variable is defined in several places.

```text
group_vars/all.yml:  app_port: 8080
group_vars/web.yml:  app_port: 9090
command line:        (none)
```
? Which port does a web host get?
+ 9090, because the more specific group wins
- 8080, because all is read first
- Both, as a list
- It fails with a duplicate error
why: Specific beats general. Only extra vars (-e) would override both.

## Role unpinned upstream
level: senior
A scheduled run broke production after nobody changed the repository.

```text
$ ansible-galaxy role list
- geerlingguy.nginx, (unknown version)
```
? What is the lasting fix?
+ Pin roles and collections in requirements.yml, mirror critical ones, and update on purpose through a tested pull request
- Stop running scheduled jobs
- Remove roles and write shell scripts
- Always install the latest version
why: Unpinned content can change between runs. Pinning makes runs repeatable and updates deliberate.
