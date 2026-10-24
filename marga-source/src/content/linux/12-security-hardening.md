---
title: Server hardening and auditing
minutes: 16
summary: Reduce a Linux server's attack surface with minimal packages, firewall rules, least privilege, SELinux or AppArmor, auditing and routine checks.
---

A new server is secure only if you make it so. Hardening means removing what you do not need, restricting what remains and watching for changes. Most breaches use known weaknesses: weak passwords, exposed services, unpatched software and excess privilege.

## What you will learn

- Finding and closing unnecessary listening services
- A host firewall with a default-deny stance
- Mandatory access control with SELinux and AppArmor
- Auditing changes and scanning for weaknesses

## Shrink the attack surface

Start by finding what is listening, then decide whether each service is needed on this host.

```console
$ sudo ss -tulpn
$ systemctl list-unit-files --state=enabled --type=service | head -20
$ sudo systemctl disable --now cups avahi-daemon
$ dpkg -l | wc -l
$ sudo apt purge -y telnet rsh-client
```

Every listening port is an entry point. If a database should only be reached from the app tier, it should bind to a private interface (`bind-address = 10.0.1.5`), not `0.0.0.0`.

## A default-deny firewall

```console
$ sudo ufw default deny incoming
$ sudo ufw default allow outgoing
$ sudo ufw allow from 203.0.113.0/24 to any port 22 proto tcp
$ sudo ufw allow 443/tcp
$ sudo ufw enable
$ sudo ufw status numbered
```

On RHEL-family systems the same idea uses `firewalld`:

```console
$ sudo firewall-cmd --permanent --add-service=https
$ sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="203.0.113.0/24" service name="ssh" accept'
$ sudo firewall-cmd --reload
$ sudo firewall-cmd --list-all
```

Cloud security groups are the first layer and a host firewall the second. Do both.

## Least privilege

- Give each application its own non-login user and keep files owned by it
- Use `sudo` rules for specific commands, never blanket `ALL`
- Remove the setuid bit from binaries that do not need it

```console
$ sudo visudo -f /etc/sudoers.d/deploy
$ sudo find / -xdev -perm -4000 -type f 2>/dev/null
$ sudo find / -xdev -type f -perm -0002 2>/dev/null | head
$ getent passwd | awk -F: '$7 !~ /nologin|false/ {print $1}'
```

A drop-in sudoers line such as `deploy ALL=(root) NOPASSWD: /bin/systemctl restart myapp` lets the deploy user restart one service and nothing else.

## SELinux and AppArmor

Standard permissions answer "does this user own the file". **Mandatory access control** also asks "should this program touch this resource at all". RHEL-family systems use SELinux, Ubuntu uses AppArmor.

```console
$ getenforce
$ sudo ausearch -m avc -ts recent | tail -5
$ sudo semanage port -a -t http_port_t -p tcp 8081
$ sudo restorecon -Rv /srv/www
$ sudo aa-status | head
```

When SELinux blocks something, **do not disable it**. Read the denial, then fix the file label or add the specific port or boolean the application legitimately needs. Disabling the control removes a safety net that has stopped real attacks.

## Audit and verify

```console
$ sudo apt install -y auditd lynis
$ sudo auditctl -w /etc/passwd -p wa -k identity
$ sudo ausearch -k identity | tail -3
$ sudo lynis audit system | tail -25
$ last -n 10
$ sudo lastb | head
```

`auditd` records who changed watched files. `lynis` and CIS benchmarks give a prioritised checklist. Ship audit logs off the host, because an attacker's first move is to edit local logs.

## Incident: the forgotten test database

> **Incident:** A security scan finds MongoDB answering on a public IP with no authentication. It was started for a quick test months ago with `--bind_ip_all`, and the security group allowed all traffic. Customer records are exposed.

Contain first: close the exposure, preserve evidence, then investigate.

```console
$ sudo ss -tlnp | grep 27017
$ sudo ufw deny 27017
$ sudo systemctl stop mongod
$ sudo journalctl -u mongod --since "30 days ago" | grep -i "connection accepted" | head
```

Review connection logs for unknown sources, rotate any credentials stored in the database, and notify according to your policy. Prevent a repeat with an inventory of listening services, default-deny security groups, and automated scans that alert on any port open to the internet.

## Common mistakes

- Disabling SELinux or the firewall to "fix" a problem
- Binding databases and caches to all interfaces
- Shared accounts, and sudo rules that grant everything
- Hardening a server once, then never re-checking after changes
- Keeping audit logs only on the server being attacked

```quiz
Q: What is the first step in reducing a server's attack surface?
- Install an antivirus
+ List listening services and remove or restrict what is not needed
- Change the hostname
- Add more users
> You cannot protect what you do not know is exposed.

Q: What does a default-deny firewall policy mean?
- All traffic is allowed unless blocked
+ Incoming traffic is blocked unless a rule explicitly allows it
- Only outgoing traffic is blocked
- The firewall is off
> Allow lists are safer than block lists.

Q: What should you do when SELinux blocks an application?
- Disable SELinux
+ Read the denial and adjust the label, boolean or port the app needs
- Run the app as root
- Reboot
> Fix the specific permission rather than removing the protection.

Q: Why ship audit logs off the host?
- To save disk space
+ An attacker who compromises the host can alter local logs
- Logs are not allowed locally
- To speed up the server
> Remote logs preserve evidence after a compromise.
```

```cards
Command to list listening ports? :: ss -tulpn
Principle behind a default-deny firewall? :: Allow only what is explicitly needed, block everything else
Which tool watches file changes on Linux? :: auditd with auditctl watch rules
Why not disable SELinux? :: It is a second layer of defence; fix the denial instead
```
