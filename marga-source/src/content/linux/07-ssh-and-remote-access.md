---
title: SSH and secure remote access
minutes: 15
summary: Use key-based SSH, configure clients and servers safely, tunnel traffic, jump through bastion hosts and transfer files with scp and rsync.
---

SSH is how you reach nearly every Linux server. It encrypts the session, authenticates with keys and can carry file transfers and network tunnels. A weak SSH setup is one of the most common ways servers get compromised.

## What you will learn

- Generating and using key pairs
- Writing `~/.ssh/config` so connections are short and consistent
- Hardening sshd and using bastion (jump) hosts
- Port forwarding, scp and rsync

## Keys instead of passwords

A key pair has a private key that never leaves your machine and a public key placed on servers. Use the modern Ed25519 type and protect the private key with a passphrase.

```console
$ ssh-keygen -t ed25519 -C "reddy@laptop" -f ~/.ssh/id_ed25519
$ ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@10.0.1.20
$ ssh deploy@10.0.1.20
$ ssh-add ~/.ssh/id_ed25519
$ ssh-add -l
```

`ssh-agent` holds the unlocked key in memory so you type the passphrase once. On first connection SSH records the server's fingerprint in `~/.ssh/known_hosts`. If the fingerprint later changes, SSH warns loudly. Do not blindly delete the line: first confirm whether the server was rebuilt.

## The client config

```text
Host bastion
    HostName 203.0.113.10
    User ops
    IdentityFile ~/.ssh/id_ed25519

Host app-*
    User deploy
    ProxyJump bastion
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 30

Host *
    AddKeysToAgent yes
    IdentitiesOnly yes
```

With this, `ssh app-1` connects through the bastion automatically. **ProxyJump** is the safe way to reach private servers: your private key stays on your laptop and never sits on the bastion, unlike agent forwarding to untrusted hosts.

## Hardening the server

Edit `/etc/ssh/sshd_config` (or a file in `sshd_config.d/`) and test before reloading.

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers deploy ops
MaxAuthTries 3
ClientAliveInterval 300
```

```console
$ sudo sshd -t
$ sudo systemctl reload sshd
$ sudo ss -tlnp | grep sshd
$ sudo journalctl -u ssh --since "1 hour ago" | grep -i failed | tail
```

Always keep an existing session open while you test a new one, so a typo does not lock you out. Add rate limiting with `fail2ban` or a cloud security group that limits port 22 to known addresses.

## Tunnels and file transfer

```console
$ ssh -L 5433:db.internal:5432 app-1
$ ssh -N -D 1080 bastion
$ scp ./release.tar.gz app-1:/tmp/
$ rsync -avz --delete ./site/ app-1:/var/www/site/
$ rsync -avzn ./site/ app-1:/var/www/site/
```

`-L` forwards a local port to a remote destination, useful for reaching a private database from your laptop. `rsync` copies only differences, and `-n` is a dry run, which you should use before any `--delete`.

## Incident: the leaked key on a shared bastion

> **Incident:** Engineers copy their private keys to a shared bastion so they can hop to internal servers. A contractor's account on the bastion is compromised, and the attacker reads every key in every home directory.

Private keys were stored where other people and processes could reach them. Remediation and prevention:

```console
$ sudo find /home -name "id_*" -not -name "*.pub" 2>/dev/null
$ sudo chmod 700 /home/*/.ssh
$ sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
```

Rotate every exposed key, remove old entries from `authorized_keys`, switch to `ProxyJump` so keys stay on laptops, and consider short-lived certificates or a cloud session manager so there are no long-lived keys at all.

## Common mistakes

- Using password authentication on internet-facing hosts
- Permissions on `~/.ssh` or the private key that are too open (SSH refuses them)
- Forwarding the agent to hosts you do not fully trust
- Editing sshd_config and reloading without testing
- Deleting a `known_hosts` warning without investigating

```quiz
Q: Which key type is a good modern default?
- RSA 1024
- DSA
+ Ed25519
- A password
> Ed25519 keys are small, fast and strong.

Q: What is the safest way to reach private servers through a bastion?
- Copy your private key to the bastion
+ Use ProxyJump so the key stays on your machine
- Share one account
- Open port 22 to the world on every server
> ProxyJump tunnels through the bastion without exposing your key there.

Q: Why run sshd -t before reloading?
- It restarts the service
+ It validates the configuration so a typo does not lock you out
- It lists active sessions
- It generates host keys
> A bad config can prevent new logins.

Q: What does ssh -L 5433:db.internal:5432 app-1 do?
+ Forwards local port 5433 to db.internal port 5432 via app-1
- Copies files to app-1
- Opens port 5433 publicly
- Creates a VPN
> It is a local port forward through the SSH connection.
```

```cards
Why disable PasswordAuthentication? :: Passwords can be brute-forced; keys cannot be guessed realistically
What does ssh-agent do? :: Keeps the unlocked private key in memory so you enter the passphrase once
Safe rsync habit? :: Run with -n (dry run) before using --delete
What is known_hosts for? :: It records server fingerprints so SSH can detect an impostor
```
