---
title: Package management and repositories
minutes: 14
summary: Install, update, pin and verify software with apt and dnf, understand repositories and signatures, and keep servers patched without surprises.
---

Every package on a server is code that runs with privilege. Package managers install software, resolve dependencies, verify signatures and make upgrades repeatable. Knowing them well is the difference between controlled patching and hoping nothing breaks.

## What you will learn

- The apt and dnf workflows for install, search, update and remove
- How repositories, GPG keys and signatures protect you
- Holding a package at a version
- Patching safely and checking what changed

## Two families

Debian and Ubuntu use **apt** with `.deb` packages. RHEL, Rocky, Alma, Fedora and Amazon Linux use **dnf** (older systems use `yum`) with `.rpm` packages. The concepts are the same.

```console
$ sudo apt update
$ apt search nginx | head -5
$ apt show nginx | head -12
$ sudo apt install -y nginx
$ dpkg -L nginx | head
$ dpkg -S /usr/sbin/nginx
$ sudo apt remove nginx
$ sudo apt purge nginx
```

`apt update` refreshes the package index, it does not upgrade anything. `remove` keeps configuration files, `purge` deletes them too. `dpkg -S` tells you which package owns a file.

```console
$ sudo dnf makecache
$ dnf search nginx
$ dnf info nginx
$ sudo dnf install -y nginx
$ rpm -ql nginx | head
$ rpm -qf /usr/sbin/nginx
$ dnf history
```

## Repositories and trust

A repository is a server of packages plus an index. Your system trusts a repository only if you installed its **signing key**, and every package or index is verified against that key. Never disable signature checks to "make an install work".

```console
$ ls /etc/apt/sources.list.d/
$ cat /etc/yum.repos.d/*.repo | head -15
$ sudo apt-key list 2>/dev/null | head -3
$ apt-cache policy nginx
```

Add third-party repositories deliberately: download the key over HTTPS, store it in `/etc/apt/keyrings/`, and reference it with `signed-by=` in the source entry. Every extra repository widens who can put code on your servers, so keep the list short and review it.

## Pinning and holding

Production rarely wants the newest version of everything. Hold a package so routine upgrades skip it, or install an exact version.

```console
$ apt-cache madison nginx | head -3
$ sudo apt install -y nginx=1.24.0-2ubuntu7
$ sudo apt-mark hold nginx
$ apt-mark showhold
$ sudo dnf install -y nginx-1.24.0
$ sudo dnf versionlock add nginx
```

A hold must be temporary and tracked. A package held for two years is a security risk with a ticket nobody reads.

## Patching safely

```console
$ apt list --upgradable
$ sudo apt upgrade -y
$ sudo apt autoremove -y
$ ls /var/run/reboot-required
$ dnf check-update
$ sudo dnf upgrade --security -y
$ sudo needs-restarting -r
```

A reasonable routine is: patch a staging host, run smoke tests, roll through production in small batches behind a load balancer, and reboot where the kernel or libc changed. Enable **unattended security updates** for low-risk hosts, with alerts when they fail.

## Incident: the held package and the CVE

> **Incident:** A security scanner flags an OpenSSL vulnerability on forty servers. Patch automation reports success, but the scanner still fails them. Investigation shows `apt-mark hold openssl` was set a year ago during a compatibility problem and never removed.

Find holds across the fleet and decide on each one:

```console
$ apt-mark showhold
openssl
$ sudo apt-mark unhold openssl
$ sudo apt install --only-upgrade openssl
$ openssl version
```

Then fix the real issue, which was an application depending on an old library, and add a quarterly review that lists every hold with an owner and a reason.

## Common mistakes

- Running `apt upgrade` on production without testing first
- Disabling GPG checks or using `--allow-unauthenticated`
- Adding random repositories copied from a blog post
- Leaving holds in place forever
- Forgetting to restart services or reboot after library and kernel updates

```quiz
Q: What does apt update do?
- Upgrades all installed packages
+ Refreshes the list of available packages from the repositories
- Removes unused packages
- Installs security patches
> It updates the index only; apt upgrade installs newer versions.

Q: Why are repository signing keys important?
- They speed up downloads
+ They let the system verify packages really come from the repository owner
- They encrypt installed files
- They are needed for apt purge
> Signature checks stop tampered or spoofed packages from installing.

Q: How do you find which package owns /usr/sbin/nginx on Debian?
- apt show /usr/sbin/nginx
+ dpkg -S /usr/sbin/nginx
- apt-cache policy
- dnf history
> dpkg -S maps a file to its package; rpm -qf does the same on RPM systems.

Q: What is the danger of leaving apt-mark hold in place?
- It slows the server
+ The package misses security fixes and the hold is forgotten
- It deletes configuration
- It breaks apt
> Holds should be temporary, tracked and reviewed.
```

```cards
remove versus purge? :: remove keeps config files; purge deletes them too
How to see what is upgradable? :: apt list --upgradable or dnf check-update
Why limit third-party repositories? :: Each one can deliver code that runs as root on your servers
What does needs-restarting -r tell you? :: Whether a reboot is required after updates (RPM systems)
```
