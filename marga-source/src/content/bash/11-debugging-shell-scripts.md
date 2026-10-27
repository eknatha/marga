---
title: Debugging shell scripts
minutes: 14
summary: Trace a script with set -x, catch silent failures with strict mode and shellcheck, and find why a script works in your terminal but fails under cron or CI.
---

A shell script that works on your laptop and fails at 03:00 in cron is one of the most common operations problems. The cause is rarely the logic. It is usually the environment, the quoting, or an error that nothing noticed. This lesson gives you tools that make a script show its work.

## What you will learn

- Tracing with `set -x` and a useful `PS4`
- Strict mode and what it does not catch
- Finding mistakes before running with `shellcheck` and `bash -n`
- Why scripts differ between a terminal and cron or CI

## See every command: tracing

```bash
bash -x ./backup.sh                 # trace one run
set -x                              # or turn tracing on inside the script
export PS4='+ ${BASH_SOURCE##*/}:${LINENO}: '   # show file and line for each traced command
```

Each traced line starts with the `PS4` prefix, so you see which line ran and with which expanded values. Turn tracing on only around the suspect part (`set -x` ... `set +x`) to keep the output short, and remember it may print secrets.

## Fail loudly

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
trap 'echo "failed at line $LINENO: $BASH_COMMAND" >&2' ERR
```

`-e` exits on an error, `-u` treats unset variables as errors, `pipefail` makes a pipeline fail when any part fails, and the `ERR` trap tells you where. Strict mode is not magic: commands in an `if` test, in `&&` chains, or on the left of `||` are exempt from `-e`, so keep logic simple and check important results yourself.

## Check before you run

```console
$ bash -n backup.sh              # syntax check only, nothing runs
$ shellcheck backup.sh
In backup.sh line 7:
rm -rf $DIR/*
       ^--^ SC2086: Double quote to prevent globbing and word splitting.
```

`shellcheck` finds quoting mistakes, unused variables and unsafe patterns. Run it in your pipeline so every change is checked.

## Terminal versus cron

Cron runs scripts with a minimal environment: a short `PATH`, no login files, a different working directory and no terminal.

| Difference | Symptom | Fix |
|------------|---------|-----|
| `PATH` is short | `command not found` | Use full paths or set `PATH` at the top |
| Working directory differs | Relative paths fail | `cd "$(dirname "$0")"` or use absolute paths |
| No profile loaded | Missing variables | Set variables in the script or an env file |
| Output is mailed or lost | You never see errors | Redirect to a log: `>> /var/log/backup.log 2>&1` |

```predict
Q: A script contains DIR="" and then runs rm -rf $DIR/ . What does the command become?
???
rm -rf / , which tries to delete everything it is allowed to.
> An empty unquoted variable disappears. Always quote variables, use set -u so an unset variable stops the script, and check that the variable is not empty before a destructive command.
```

## Incident: works by hand, fails at night

> **Incident:** A nightly backup script runs fine when started manually, but the cron job produces no archive and no error.

```console
$ crontab -l
0 2 * * * /opt/scripts/backup.sh
$ env -i /bin/sh -c '/opt/scripts/backup.sh'
/opt/scripts/backup.sh: line 9: aws: command not found
```

Running the script with a clean environment (`env -i`) reproduced the failure: `aws` lived in `/usr/local/bin`, which cron's `PATH` does not include. The fix was a full path to the command, a `PATH` line at the top, and a log redirect, so the next failure leaves evidence.

## Common mistakes

- Unquoted variables, which split on spaces and expand wildcards
- Assuming `set -e` catches every failure
- Debugging only in an interactive shell
- Sending cron output nowhere

```quiz
Q: What does set -x do?
- It makes the script exit on errors :: That is set -e.
+ It prints each command, after expansion, before running it
- It checks the script for syntax errors only :: That is bash -n, which runs nothing.
- It encrypts variables :: It does not change values; it only prints commands.
> Tracing shows exactly what the shell is about to run with the real values.

Q: Why does a script that works in your terminal often fail in cron?
- Cron is slower :: Speed does not cause command not found errors.
+ Cron uses a minimal environment, with a short PATH and a different working directory
- Cron uses a different programming language :: It runs the same shell.
- Cron blocks all network traffic :: It does not; the environment is what differs.
> Anything the script gets from your profile or current directory may be missing under cron.

Q: What does pipefail change?
- Pipes run faster :: It has no effect on speed.
+ A pipeline returns a failure if any command in it fails, not only the last
- It removes the pipe character :: It does not change syntax.
- It logs every pipe :: It only changes the exit status.
> Without pipefail, a failure early in a pipeline is hidden by the success of the last command.

Q: Which tool finds quoting mistakes without running the script?
- strace :: strace needs a running process.
- top :: top shows processes, not script mistakes.
+ shellcheck
- ping :: ping tests network reachability.
> shellcheck analyses the script text and warns about unsafe patterns.
```

```cards
What does bash -n do? :: Checks syntax without running the script
Why quote "$var"? :: To prevent word splitting and wildcard expansion
What does set -u do? :: Treats unset variables as errors
How to see which line a traced command came from? :: Set PS4 to include BASH_SOURCE and LINENO
How do you reproduce cron's environment? :: Run with env -i and a short PATH
```
