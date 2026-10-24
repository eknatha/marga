---
title: Control flow and functions
minutes: 14
summary: Use conditionals, loops, case statements and functions to turn one-off commands into reusable tools.
---

A health check that only prints "OK" is not much use. You need scripts that make decisions: retry a flaky call, branch on which environment you are in, and reuse the same logic for ten servers. Control flow and functions give your scripts that structure.

## What you will learn

- `if`, `case` and the difference between `[ ]` and `[[ ]]`
- `for` and `while` loops
- Functions, local variables and return codes
- A retry helper you can reuse

## Conditionals

```bash
if [[ "$ENVIRONMENT" == "prod" && -f /etc/shop/maintenance ]]; then
  echo "Maintenance flag is set in production"
elif [[ -z "$ENVIRONMENT" ]]; then
  echo "ENVIRONMENT is not set" >&2
else
  echo "Continuing in $ENVIRONMENT"
fi
```

`[[ ... ]]` is Bash's extended test. It supports `&&`, `||`, pattern matching (`[[ $name == web-* ]]`) and does not word-split unquoted variables, so it is safer than the older `[ ... ]`. Use `(( ... ))` for arithmetic: `if (( count > 3 )); then`.

`case` is cleaner than a chain of `elif` when you compare one value with several patterns:

```bash
case "$1" in
  start)   systemctl start shop ;;
  stop)    systemctl stop shop ;;
  restart) systemctl restart shop ;;
  *)       echo "usage: $0 {start|stop|restart}" >&2; exit 2 ;;
esac
```

## Loops

```bash
for host in web01 web02 web03; do
  echo "== $host =="
  ssh "$host" uptime
done

for f in /var/log/app/*.log; do
  [[ -e "$f" ]] || continue      # skip when the glob matches nothing
  gzip -- "$f"
done

attempt=1
while (( attempt <= 5 )); do
  curl -fsS http://localhost:8080/health && break
  sleep $(( attempt * 2 ))
  (( attempt++ ))
done
```

`curl -fsS` fails on HTTP errors (`-f`), stays quiet (`-s`) but still shows errors (`-S`). That makes its exit code meaningful for scripts. In the last loop the wait grows each time, which is a simple **backoff** that gives a starting service time to become ready.

## Functions

```bash
log() {
  printf '%s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*" >&2
}

check_port() {
  local host="$1" port="$2"          # local keeps variables inside the function
  timeout 3 bash -c "cat < /dev/null > /dev/tcp/${host}/${port}" 2>/dev/null
}

if check_port db01 5432; then
  log "database reachable"
else
  log "database unreachable"
  exit 1
fi
```

Functions **return an exit code**, not text. `return 0` is success. Use `local` for every variable inside a function, otherwise it leaks into the rest of the script. Send log messages to stderr (`>&2`) so that stdout stays clean for data that another command might consume.

## A reusable retry function

```bash
retry() {
  local tries="$1" delay="$2"; shift 2
  local n=1
  until "$@"; do
    if (( n >= tries )); then
      log "giving up after $n attempts: $*"
      return 1
    fi
    log "attempt $n failed, retrying in ${delay}s"
    sleep "$delay"
    (( n++ ))
  done
}

retry 5 3 curl -fsS http://localhost:8080/health
```

`shift 2` drops the first two arguments so `"$@"` contains only the command to run. Because the function takes any command, you can reuse it for downloads, database checks or deploy steps.

## Incident: the deploy that "succeeded" against a dead app

> **Incident:** A deploy script restarted the service and printed "Deploy complete" before the application finished loading. Smoke tests then failed intermittently, and one run marked the release healthy while the service was still down.

The script waited a fixed `sleep 5`. Startup time varies with load, so the wait was sometimes too short. Replace sleeps with a **readiness loop** that checks the thing you care about and fails clearly:

```bash
systemctl restart shop
if ! retry 20 3 curl -fsS http://localhost:8080/health >/dev/null; then
  log "shop did not become healthy"
  journalctl -u shop -n 20 --no-pager >&2
  exit 1
fi
log "shop is healthy"
```

Now the script only reports success when the health endpoint answers, and on failure it prints the last log lines so the person on call sees the cause immediately.

## Common mistakes

- Using `[ $var = x ]` with an unquoted variable that can be empty
- Forgetting `local` in functions
- Looping over `ls` output instead of a glob such as `*.log`
- Using fixed `sleep` calls instead of checking readiness

```quiz
Q: Why prefer [[ ]] over [ ] in Bash scripts?
- It works in every shell
+ It avoids word splitting on unquoted variables and supports patterns and && and ||
- It is required for numbers
- It runs faster than a function
> [[ ]] is a Bash feature with safer parsing. It is not available in plain POSIX sh.

Q: What does local do inside a function?
- Makes the variable global
- Exports the variable to child processes
+ Limits the variable to the function so it does not leak into the rest of the script
- Makes the variable read-only
> Without local, variables set in a function are visible everywhere in the script and can overwrite other values.

Q: In the retry function, what does shift 2 accomplish?
- Waits two seconds
+ Removes the first two arguments so "$@" holds only the command to run
- Runs the command twice
- Moves the script two lines up
> The first two arguments are the number of tries and the delay. After shifting, the rest is the command to retry.

Q: Why is a readiness loop better than sleep 5 after restarting a service?
- It uses less CPU
+ It waits only as long as needed and fails clearly if the service never becomes healthy
- It prevents the service from restarting
- It hides errors
> Startup time varies. Polling a health check is accurate, and the failure path can show logs.
```

```cards
Safer test syntax in Bash? :: [[ ... ]] instead of [ ... ]
How do you return success from a function? :: return 0 (or let the last command succeed)
Why send log messages to stderr? :: So stdout stays clean for data that other commands read
What replaces fixed sleeps after a restart? :: A readiness loop that polls a health check with a limit
```
