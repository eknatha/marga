---
title: Portable scripts, linting and style
minutes: 11
summary: Write scripts that run on different systems, catch mistakes with ShellCheck, and keep them readable for the next person.
---

A script that worked on your laptop fails on the build server with "bad substitution", and nobody can tell why. The server runs `sh`, which is not Bash. A little discipline about the shebang, the features you use, and an automatic linter prevents most of these surprises.

## What you will learn

- The difference between sh and bash and how to choose the shebang
- Common Bash-only features that break under sh
- Using ShellCheck to find bugs before they run
- Readable style: functions, names, comments and usage text

## sh is not bash

`#!/bin/sh` asks for a minimal POSIX shell. On Debian and Ubuntu that is `dash`, which is fast but lacks many Bash features. `#!/bin/bash` asks for Bash. Pick the one you really need, and write it on the first line.

```bash
#!/usr/bin/env bash
set -euo pipefail
```

`env bash` finds Bash on the path, which helps on systems that keep it elsewhere. Features that only Bash has include arrays, `[[ ... ]]`, `${var,,}`, process substitution `<(cmd)`, `pipefail` and `source`. If a script must run under plain `sh`, avoid all of them and test it with `dash script.sh`.

## Find the mistakes with ShellCheck

ShellCheck reads a script and reports problems that are easy to miss: unquoted variables, wrong tests, useless uses of cat, and Bash-only features under an `sh` shebang. Each message has a code such as SC2086 that you can look up.

```console
$ shellcheck deploy.sh
In deploy.sh line 7:
rm -rf $TARGET/*
       ^-- SC2086: Double quote to prevent globbing and word splitting.
```

Run it in your editor and in the pipeline, and treat warnings as bugs. When you disagree, silence one line with a comment such as `# shellcheck disable=SC2034` and explain why.

## Readable by the next person

Scripts live longer than expected. A few habits make them easy to change at 03:00:

```bash
#!/usr/bin/env bash
# Rotate old reports. Usage: rotate.sh DIR DAYS
set -euo pipefail

usage() { echo "usage: $0 DIR DAYS" >&2; exit 2; }
[[ $# -eq 2 ]] || usage

readonly dir=$1 days=$2

main() {
  find "$dir" -type f -mtime +"$days" -print -delete
}
main
```

Put work in functions, name variables for what they hold, quote every expansion, and print a usage line for wrong input. Use `readonly` for values that must not change. Keep a short comment at the top that says what the script does and how to call it.

## Test the edges

Run the script on the situations that break it: an empty folder, a name with a space, no arguments, and a missing command. The `bats` test framework lets you write these checks as files, but even a few manual runs after `set -x` find most problems.

```console
$ bash -n script.sh        # syntax check only
$ bash -x script.sh arg    # trace every command
$ shellcheck -x script.sh  # follow sourced files
```

```predict
Q: A script starts with `#!/bin/sh` and uses `[[ -f $f ]]`. On Ubuntu it fails with "[[: not found". Why?
???
sh is dash there, and `[[` is a Bash feature. Change the shebang to bash, or rewrite the test with `[ -f "$f" ]`.
> The shebang decides which shell runs the script, no matter which shell you typed the command in.
```

## Incident: Works on my laptop

> **Incident:** A pipeline step that ran a deployment script failed only on the build machine with a syntax error on a line that looked fine.

```console
$ head -1 deploy.sh
#!/bin/sh
$ ls -l /bin/sh
lrwxrwxrwx 1 root root 4 /bin/sh -> dash
$ sh deploy.sh
deploy.sh: 14: Syntax error: "(" unexpected
```

The script used a Bash array. On the laptop, /bin/sh was Bash, so it worked; on the build server it is dash. The team changed the shebang to bash, added ShellCheck to the pipeline so this class of error fails the build, and documented that scripts use Bash 4 or newer.

## Common mistakes

- Using #!/bin/sh and then Bash-only features
- Running scripts with sh script.sh and bypassing the shebang
- Ignoring ShellCheck warnings because the script works today
- Leaving out usage text so nobody knows the arguments

```quiz
Q: What does #!/bin/sh promise?
+ Only POSIX shell features; it may be a minimal shell such as dash
- Bash with all features :: That requires #!/bin/bash.
- The fastest possible shell :: Speed is not promised.
- The user's login shell :: The shebang names a specific interpreter.
> Choose the shebang that matches the features you use.

Q: Which tool finds unquoted variables and other likely bugs before you run a script?
+ ShellCheck
- bash -n :: It only checks syntax.
- strace :: It traces system calls while running.
- diff :: It compares files.
> ShellCheck gives a coded message for each finding.

Q: Which of these is a Bash-only feature?
+ Arrays
- Variables :: POSIX has variables.
- if statements :: POSIX has if.
- Pipes :: POSIX has pipes.
> Arrays, [[ ]] and pipefail need Bash.

Q: What does readonly do?
+ Stops a variable from being changed later in the script
- Makes a file read only :: It applies to variables.
- Hides the variable :: The variable is still visible.
- Exports the variable :: That is export.
> Use it for values that must not change.
```

```cards
Safe Bash header :: #!/usr/bin/env bash then set -euo pipefail
Lint a script :: shellcheck script.sh
Syntax check only :: bash -n script.sh
Trace a script :: bash -x script.sh
Test under dash :: dash script.sh
```
