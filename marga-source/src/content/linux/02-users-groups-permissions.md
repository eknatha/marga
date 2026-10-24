---
title: Users, groups and permissions
minutes: 15
summary: Read and set Linux permissions correctly, and debug the "permission denied" errors that trip up deployments.
---

A developer uploads a logo through your app. The file is on disk, the app can read it, but the web server returns `403 Forbidden`. Nothing is wrong with the code. The cause is almost always an ownership or permission problem, and you can diagnose it in two commands once you can read the permission bits.

## What you will learn

- How users, groups and the `root` account relate
- How to read `rwx` and numeric modes such as `640`
- Why a directory needs the execute bit
- How to use `sudo` with least privilege

## Users and groups

Every process runs as a user, and every file has an owner user and an owner group. Account data is stored in plain files: `/etc/passwd` (users), `/etc/group` (groups) and `/etc/shadow` (password hashes, readable only by root).

```console
$ id
uid=1001(deploy) gid=1001(deploy) groups=1001(deploy),998(docker)
$ getent passwd www-data
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
```

`id` shows who you are and which groups you belong to. A shell of `/usr/sbin/nologin` marks a **service account**: it can own files and run a daemon, but nobody can log in as it. Use dedicated service accounts for each application so a compromise stays contained.

## Reading permission bits

```console
$ ls -l /srv/app/uploads
-rw-r--r-- 1 deploy deploy 48213 Oct 24 01:50 logo.png
```

The first column is ten characters: one for the type, then three triplets for **owner**, **group** and **others**. Each triplet is read (`r`), write (`w`) and execute (`x`).

| Mode | Meaning | Typical use |
|------|---------|-------------|
| `644` (`rw-r--r--`) | Owner reads and writes, everyone else reads | Config and web content |
| `600` (`rw-------`) | Owner only | SSH private keys, secrets |
| `755` (`rwxr-xr-x`) | Everyone can run or enter, only owner writes | Programs and directories |
| `750` (`rwxr-x---`) | Owner and group only | Shared app directories |

Numbers add up per triplet: read is 4, write is 2, execute is 1. So `7` is `rwx`, `6` is `rw-`, `5` is `r-x`, and `4` is `r--`.

```bash
chmod 640 app.env              # owner rw, group r, others none
chmod u+x deploy.sh            # add execute for the owner
chown deploy:deploy app.env    # change owner and group
chmod -R g+rX /srv/app/static  # capital X adds execute only on directories
```

> **Note:** On a **directory**, `r` lets you list names, `w` lets you create or delete entries, and `x` lets you enter it and reach things inside. Without `x` on every directory in a path, files below it are unreachable even if the file itself is world-readable.

## Least privilege with sudo

Do not work as root. Log in as yourself and elevate one command at a time.

```console
$ sudo systemctl restart shop
$ sudo -l
User deploy may run the following commands on app01:
    (root) NOPASSWD: /usr/bin/systemctl restart shop
```

`sudo -l` lists what you may run. Granting a specific command, as above, is safer than a blanket `ALL`. Edit rules with `visudo`, which checks syntax before saving so you cannot lock yourself out with a typo.

## Incident: uploads return 403 from nginx

> **Incident:** nginx runs as `www-data` and serves files from `/srv/app/uploads`. New uploads, written by the app as user `deploy`, return 403 although the files exist and look readable.

`namei -l` prints the permissions of every directory on the way to the file, which is the fastest way to find the broken link in the chain.

```console
$ namei -l /srv/app/uploads/logo.png
f: /srv/app/uploads/logo.png
dr-xr-xr-x root   root   /
drwxr-xr-x root   root   srv
drwx------ deploy deploy app
drwxr-xr-x deploy deploy uploads
-rw-r--r-- deploy deploy logo.png
```

The directory `app` is `drwx------`: only `deploy` can enter it. `www-data` is "others" and has no `x`, so it never reaches `uploads`. The file's own permissions are fine. Grant traverse access on that one directory, then test as the web user:

```console
$ sudo chmod o+x /srv/app
$ sudo -u www-data cat /srv/app/uploads/logo.png > /dev/null && echo readable
readable
```

`o+x` lets others enter `app` but not list its contents, which keeps the exposure small. Testing as the affected user proves the fix instead of assuming it.

> **Warning:** Do not "fix" permission errors with `chmod -R 777`. It gives every user on the machine write access, hides the real cause and is a common source of security findings.

## Common mistakes

- Forgetting that every parent directory needs the execute bit
- Running applications as root because it "just works"
- Leaving SSH private keys at `644`; `ssh` refuses keys that other users can read
- Using `777` instead of finding which user or group needs access

```quiz
Q: What does chmod 640 file set?
- Owner read and execute, group read, others none
+ Owner read and write, group read, others no access
- Owner read, group write, others read
- Everyone read and write
> 6 is rw- for the owner, 4 is r-- for the group, and 0 is --- for others.

Q: A file is mode 644 but the web server still cannot read it. What is the most likely cause?
- The file is too large
+ A parent directory lacks the execute bit for the web server's user
- The file name is too long
- Linux caches permissions for an hour
> To reach a file you need execute permission on every directory in the path. namei -l shows which one blocks access.

Q: Which mode is correct for an SSH private key?
- 777
- 644
+ 600
- 666
> ssh refuses private keys that other users can read. 600 limits access to the owner.

Q: Why use visudo rather than editing /etc/sudoers with a normal editor?
- visudo is faster
+ It validates syntax before saving, so a typo cannot lock you out of sudo
- It gives you root permanently
- It removes the need for passwords
> A broken sudoers file can disable sudo entirely. visudo refuses to save invalid syntax.
```

```cards
What do the three triplets in rwxr-xr-x mean? :: Owner permissions, group permissions, then everyone else's permissions
What does the x bit mean on a directory? :: You can enter it and reach items inside by name
Command that shows permissions of every directory on a path? :: namei -l /full/path/to/file
Why give each application its own service account? :: A compromise is limited to what that account can access
```
