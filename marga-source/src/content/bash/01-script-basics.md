---
title: Script basics
minutes: 14
summary: Write your first reliable Bash script: shebang, variables, quoting, arguments, exit codes and command substitution.
---

Your team runs the same six commands after every deploy: check disk space, check the service, tail the log. Doing it by hand invites mistakes at 2 a.m. A script runs the same steps the same way every time and can be reviewed like code. Bash is already on almost every Linux server, which makes it the default tool for glue work.

## What you will learn

- How to create and run an executable script
- Variables, quoting and why quotes matter
- Arguments, exit codes and command substitution
- Why you should check the result of every important command

## Your first script

```bash
#!/usr/bin/env bash
# check-disk.sh: print the usage of the root filesystem
usage=$(df --output=pcent / | tail -n 1 | tr -dc '0-9')
echo "Root filesystem is ${usage}% full"
```

The first line, the **shebang**, tells the kernel which interpreter to use. Save it, make it executable and run it:

```console
$ chmod +x check-disk.sh
$ ./check-disk.sh
Root filesystem is 28% full
```

`$(command)` is **command substitution**: it runs the command and inserts its output. The sample output above will differ on your machine.

## Variables and quoting

```bash
name="deploy user"        # no spaces around =
echo "Hello, $name"       # double quotes expand variables
echo 'Hello, $name'       # single quotes print the text literally
echo "${name}_backup"     # braces mark where the name ends
```

> **Warning:** Always quote variable expansions: `"$file"`, not `$file`. Unquoted, a value such as `my file.txt` splits into two words, and `rm $file` would try to delete `my` and `file.txt`. Quoting prevents an entire class of bugs and accidents.

## Arguments and exit codes

Scripts receive arguments as `$1`, `$2` and so on. `$#` is the count and `"$@"` is all of them, preserving spaces.

```bash
#!/usr/bin/env bash
service="$1"
if [ -z "$service" ]; then
  echo "usage: $0 SERVICE" >&2     # >&2 sends the message to stderr
  exit 2
fi
systemctl is-active --quiet "$service"
echo "exit status was $?"
```

Every command ends with an **exit code**: `0` means success and anything else means failure. `$?` holds the last one. Shell logic depends on it, because `if`, `&&` and `||` all test exit codes.

```bash
mkdir -p /srv/backups && echo "ready"          # second command runs only if the first succeeded
systemctl is-active shop || echo "shop is down"  # second runs only if the first failed
```

Use distinct exit codes for distinct problems, such as `2` for bad usage and `1` for a failed check, so that callers like cron and CI can react.

## Reading a file line by line and testing values

```bash
while IFS= read -r host; do
  if ping -c1 -W2 "$host" >/dev/null 2>&1; then
    echo "$host up"
  else
    echo "$host DOWN"
  fi
done < hosts.txt
```

`IFS= read -r` reads each line unchanged, without trimming spaces or interpreting backslashes. Redirecting `>/dev/null 2>&1` discards both normal output and errors. Common tests in `[ ... ]` are `-f` (file exists), `-d` (directory exists), `-z` (string is empty), `-n` (string is not empty), `-eq` (numbers equal) and `==` (strings equal).

## Incident: the cleanup script that deleted too much

> **Incident:** A cleanup script ran `rm -rf $BACKUP_DIR/*` nightly. After a config change `BACKUP_DIR` was never set. The shell expanded the line to `rm -rf /*`.

Two habits would have prevented it. First, make the shell stop on unset variables with `set -u` (covered next lesson), or fail explicitly with a default error:

```bash
backup_dir="${BACKUP_DIR:?BACKUP_DIR must be set}"   # exits with a message if unset or empty
rm -rf -- "${backup_dir:?}"/*
```

`${VAR:?message}` aborts the script when the variable is missing or empty. Second, test destructive scripts by first replacing the dangerous command with `echo`, reading what *would* run, then removing the `echo`. The rule: **never let a variable you did not validate decide what gets deleted.**

## Common mistakes

- Spaces around `=` in assignments (`name = value` runs a command called `name`)
- Unquoted variables
- Ignoring exit codes, so the script reports success after a failure
- Writing scripts that only work on your laptop because of hard-coded paths

```quiz
Q: What does the first line #!/usr/bin/env bash do?
- Makes the script run faster
+ Tells the kernel to run the file with bash
- Imports a library called bash
- Marks the file as a comment only
> The shebang names the interpreter. Without it, the kernel does not know how to execute the file directly.

Q: With file="my report.txt", what is the problem with rm $file?
- Nothing, it works as expected
+ Word splitting turns it into two arguments, "my" and "report.txt"
- The file is deleted twice
- It prints the file instead
> Unquoted expansions are split on whitespace. Use rm -- "$file".

Q: What exit code does a successful command return?
+ 0
- 1
- 255
- -1
> Zero means success. Any non-zero value signals failure, and scripts, cron and CI rely on that.

Q: What does ${BACKUP_DIR:?BACKUP_DIR must be set} do when the variable is empty?
- Uses an empty string
- Sets a default value
+ Prints the message and exits the script
- Ignores the line
> The :? form is a guard. It stops the script with an error instead of continuing with a dangerous empty value.
```

```cards
Why quote "$var"? :: To stop word splitting and globbing from changing the meaning of the value
What does $? contain? :: The exit code of the last command
Run command B only if A succeeds? :: A && B
Guard against an unset variable? :: ${VAR:?message}
```
