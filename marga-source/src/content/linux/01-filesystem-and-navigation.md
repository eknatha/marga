---
title: Filesystem and navigation
minutes: 14
summary: Learn where things live on a Linux server, how to find them fast, and how symbolic links cause real deployment bugs.
---

It is 02:10 and an alert says the checkout service is serving an old version of its config. You SSH into the server. Before you change anything you need to answer three questions: where am I, what is here, and what changed? This lesson gives you the map and the commands to answer them in under a minute.

## What you will learn

- The standard directories and what belongs in each
- How to move around, list and search without guessing
- How to copy, move and delete without destroying data
- How symbolic links work, and how a stale link breaks a deployment

## One tree, many purposes

Linux has a single directory tree that starts at `/` (root). There are no drive letters. Disks, USB sticks and network shares are *mounted* into the tree at a directory you choose. Knowing the standard layout tells you where to look before you search.

| Path | What lives there | You will touch it when |
|------|------------------|------------------------|
| `/etc` | System-wide configuration files | Changing service settings |
| `/var/log` | Log files | Investigating a failure |
| `/var/lib` | Application state, such as databases | Checking data size or restoring |
| `/home` | One directory per user | Looking at SSH keys or shell history |
| `/usr/bin`, `/usr/sbin` | Installed programs | Checking which binary runs |
| `/opt` | Self-contained third-party or in-house apps | Finding deployed releases |
| `/tmp` | Temporary files, often cleared on reboot | Debugging scratch files |
| `/proc`, `/sys` | Live kernel and process information, not real files | Reading CPU, memory, process data |
| `/dev` | Device files such as disks and terminals | Working with disks |

> **Why it matters:** Configuration is almost always under `/etc`, logs under `/var/log`, and application data under `/var/lib` or `/opt`. When a vendor puts things elsewhere, that is the exception worth noting.

## Move around and look

```console
$ pwd
/home/deploy
$ cd /var/log
$ ls -lah
total 4.2M
drwxrwxr-x  9 root   syslog 4.0K Oct 24 00:00 .
drwxr-xr-x 14 root   root   4.0K Sep  2 11:20 ..
-rw-r-----  1 syslog adm    312K Oct 24 02:09 auth.log
-rw-r-----  1 syslog adm    1.1M Oct 24 02:10 syslog
drwxr-xr-x  2 root   root   4.0K Oct 23 06:25 nginx
$ cd -
/home/deploy
```

Read the `ls -l` columns left to right: file type and permissions, link count, owner, group, size, modified time, name. The first character is the type: `-` file, `d` directory, `l` symbolic link. `-h` prints human-readable sizes and `-a` shows hidden files, which start with a dot. `cd -` jumps back to the previous directory.

The output above is sample output. Names, sizes and dates on your machine will differ.

## Find things

You will often know a file name but not its location, or the reverse.

```console
$ find /etc -name "nginx.conf"
/etc/nginx/nginx.conf
$ find /var/log -type f -mtime -1 -size +1M
/var/log/syslog
$ grep -rn "listen 443" /etc/nginx
/etc/nginx/sites-enabled/shop.conf:4:    listen 443 ssl;
$ type -a python3
python3 is /usr/bin/python3
```

`find` walks the tree and filters by name, type, age or size. `grep -rn` searches *inside* files recursively and prints line numbers. `type -a` shows which executable will actually run when you type a command, which settles most "wrong version" arguments.

## Copy, move and delete without regret

```bash
cp -a /etc/nginx /root/nginx.bak.2026-10-24   # -a keeps permissions, owners and links
mv app.conf app.conf.old                       # rename in place
rm -i notes.txt                                # ask before deleting
```

> **Warning:** `rm` does not use a recycle bin. `rm -rf` with a typo or an empty variable, such as `rm -rf "$DIR"/`, can erase far more than you meant. Before deleting, run the same pattern with `ls` and read the list. Always make a copy before editing a production config.

## Links: one name pointing at another

A **symbolic link** (symlink) is a small file that holds a path. A **hard link** is a second name for the same data on disk.

```console
$ ln -s /etc/nginx/sites-available/shop.conf /etc/nginx/sites-enabled/shop.conf
$ ls -l /etc/nginx/sites-enabled/
lrwxrwxrwx 1 root root 38 Oct 20 08:12 shop.conf -> /etc/nginx/sites-available/shop.conf
```

If you delete the target of a symlink, the link keeps pointing at nothing and is called *broken*. Hard links cannot cross filesystems, and deleting one name does not remove the data until every name is gone.

## Incident: the new release is deployed but the old config is live

The deploy script finished without errors, yet the service still behaves like last week's build. Symlinks are a common cause because many teams point `current` at the active release.

> **Incident:** A deployment tool creates `/opt/shop/releases/<id>` and then swaps a `current` link. The service reads `/opt/shop/current/config.yml`.

```console
$ ls -l /opt/shop
total 8
lrwxrwxrwx 1 deploy deploy   26 Oct 14 16:02 current -> releases/2026-10-14-1a2b3c
drwxr-xr-x 4 deploy deploy 4096 Oct 21 09:14 releases
$ ls /opt/shop/releases
2026-10-14-1a2b3c  2026-10-21-9f8e7d
```

The newest release, `2026-10-21-9f8e7d`, exists, but `current` still points at the older one. The link was never updated. Repoint it, then verify:

```console
$ ln -sfn releases/2026-10-21-9f8e7d /opt/shop/current
$ readlink -f /opt/shop/current
/opt/shop/releases/2026-10-21-9f8e7d
```

`-s` makes a symlink, `-f` replaces an existing one, and `-n` treats a link to a directory as a plain file. Without `-n`, `ln` would create a new link *inside* the old release directory instead of replacing `current`. After the swap, restart the service so it re-reads its files.

To prevent a repeat, make the deploy script verify the link with `readlink -f` and fail if it does not match the new release.

## Common mistakes

- Editing a config in `/etc` without a backup, then forgetting what the original said
- Using `rm -rf` with an unquoted or empty variable
- Searching with `find /` on a busy server instead of a narrower directory
- Forgetting `-n` when replacing a symlink that points to a directory

```quiz
Q: Where do you normally find system-wide configuration files on Linux?
- /var/log
+ /etc
- /proc
- /tmp
> Configuration lives in /etc. /var/log holds logs, /proc is live kernel data and /tmp is temporary scratch space.

Q: You run grep -rn "listen 443" /etc/nginx. What does it do?
- Lists files named listen 443
+ Searches inside every file under /etc/nginx and prints matching lines with line numbers
- Opens port 443 for nginx
- Deletes lines that contain listen 443
> grep searches file contents. -r recurses into directories and -n prints the line number of each match.

Q: A symbolic link's target directory is deleted. What happens to the link?
- The link is deleted automatically
- The link points to the parent directory
+ The link remains but is broken because its path points at nothing
- The link becomes a hard link
> A symlink only stores a path. If the target disappears the link stays in place and fails when followed.

Q: Why use ln -sfn instead of ln -sf when replacing a link that points to a directory?
- It makes the link read-only
+ It stops ln from creating a new link inside the existing target directory
- It copies the directory
- It follows the link to delete the old release
> Without -n, ln follows the existing link to the directory and creates the new link inside it. -n treats the link itself as the thing to replace.
```

```cards
Which directory holds logs? :: /var/log
What does ls -lah add compared with ls? :: Long format, all files including hidden ones, and human-readable sizes
Symbolic link vs hard link? :: A symlink stores a path to another name. A hard link is another name for the same data and cannot cross filesystems.
Command to see which executable runs for "python3"? :: type -a python3
```
