---
title: Building and testing shell tools
minutes: 13
summary: Turn a script into a small tool with options, help text, exit codes and tests using getopts, shellcheck and bats, and run them automatically.
---

A script that only its author understands becomes a risk the day that person is away. A small tool has a clear interface: options, a help message, meaningful exit codes, and tests. Bash is not the best language for large programs, but a few good habits make shell tools reliable enough to share with a team.

## What you will learn

- Parsing options with `getopts`
- A standard script layout with functions and a `main`
- Exit codes and error messages
- Testing with `bats` and checking with `shellcheck`
- Making scripts safe to source and to run twice

## Layout

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

usage() { cat <<'EOF'
Usage: rotate.sh [-d DIR] [-k DAYS] [-n]
  -d DIR   directory to clean (required)
  -k DAYS  keep files newer than DAYS (default 14)
  -n       dry run, only print what would be removed
EOF
}

main() {
  local dir="" keep=14 dry=0 opt
  while getopts ":d:k:nh" opt; do
    case $opt in
      d) dir=$OPTARG ;;
      k) keep=$OPTARG ;;
      n) dry=1 ;;
      h) usage; return 0 ;;
      :) echo "option -$OPTARG needs a value" >&2; return 64 ;;
      *) usage >&2; return 64 ;;
    esac
  done
  [[ -n $dir && -d $dir ]] || { echo "error: -d must be an existing directory" >&2; return 64; }
  [[ $keep =~ ^[0-9]+$ ]] || { echo "error: -k must be a number" >&2; return 64; }
  if (( dry )); then
    find "$dir" -type f -mtime "+$keep" -print
  else
    find "$dir" -type f -mtime "+$keep" -delete
  fi
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then main "$@"; fi
```

Putting logic in functions and calling `main` only when the file is run (not sourced) lets tests load the functions without running the tool.

## Exit codes and messages

Use 0 for success, 1 for a general failure and 64 for a usage error (the convention from `sysexits`). Send errors to standard error (`>&2`) and normal output to standard output, so pipelines keep working. Make the message say what was wrong and what the user can do.

## Tests with bats

```text
#!/usr/bin/env bats

setup() { TMP=$(mktemp -d); touch -d '30 days ago' "$TMP/old.log"; touch "$TMP/new.log"; }
teardown() { rm -rf "$TMP"; }

@test "dry run lists old files and keeps them" {
  run ./rotate.sh -d "$TMP" -k 14 -n
  [ "$status" -eq 0 ]
  [[ "$output" == *old.log* ]]
  [ -e "$TMP/old.log" ]
}

@test "missing directory is a usage error" {
  run ./rotate.sh -d /nope
  [ "$status" -eq 64 ]
}
```

Run `shellcheck rotate.sh` and `bats tests/` in your pipeline. Use a temporary directory for test data and never point tests at real paths.

## Idempotence and safety

A tool you may run twice should give the same result the second time. Prefer `mkdir -p`, `ln -sfn`, and checks such as "does it exist" before changes. Provide a dry-run option for anything destructive, and print what you are about to do.

```predict
Q: A script is run with an option it does not know. What should it do?
???
Print a usage message to standard error and exit with a non-zero code such as 64.
> Silent success hides mistakes. A clear message and a non-zero exit let callers and pipelines react.
```

## Incident: the cleanup that ran with the wrong variable

> **Incident:** A cleanup script deletes the wrong directory because a path variable was empty after a typo in an option name.

```console
$ ./clean.sh --dri /data/tmp
removing files under /
```

The tool ignored unknown options and fell back to an empty directory value. The rewrite validated every option, required `-d` to be an existing directory, refused to run on `/`, offered a dry run, and had tests for each of these cases.

## Common mistakes

- No validation of required options
- Mixing messages and results on standard output
- Tests that touch real directories
- No dry-run mode for destructive tools

```quiz
Q: Which builtin helps parse options such as -d dir and -n?
- getopt only :: The external getopt differs between systems.
+ getopts
- parse :: Not a Bash builtin.
- shift :: It moves arguments but does not parse options.
> getopts is the portable Bash builtin for short options.

Q: Where should error messages go?
- Standard output :: That mixes errors with results in pipelines.
+ Standard error
- A random file :: Not predictable.
- Nowhere :: The user needs to know what failed.
> Standard error keeps results clean for the next command.

Q: Why call main only if the script is not sourced?
+ Tests can source the file and call its functions without running the tool
- It speeds up Bash :: Speed is unchanged.
- It hides the code :: It does not.
- It is required by POSIX :: It is a convention.
> The check separates definitions from execution.

Q: What does a dry-run option provide?
+ A preview of what the tool would do, without changing anything
- Faster runs :: It is about safety.
- Encryption :: Unrelated.
- Automatic backups :: Unrelated.
> It lets users check the effect before committing to it.
```

```cards
Exit code for a usage error? :: 64 by the sysexits convention
Tool to test Bash scripts? :: bats
What does shellcheck do? :: Finds quoting and safety problems before running
Why add a dry run? :: To preview destructive actions
Why separate main from definitions? :: So tests can source functions
```
