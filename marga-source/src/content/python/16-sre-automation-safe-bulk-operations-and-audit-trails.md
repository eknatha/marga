---
title: SRE automation: safe bulk operations and audit trails
minutes: 12
summary: Run changes across many hosts or resources with a plan, batches, rate limits, a kill switch, resumable state and a clear audit trail.
---

Running a command on one server is a task; running it on 800 servers is an operation. The risks multiply: a mistake repeats everywhere, the target may be overloaded, and half-finished work is hard to describe. Bulk automation needs a small set of safety features built in from the start.

## What you will learn

- Build a plan and review it before any change
- Work in small batches with a pause and a health check
- Respect rate limits and concurrency limits
- Keep state so a run can resume, and write an audit trail

## Plan, then apply

Separate the decision of what to change from the act of changing. The plan step reads current state and produces a list of exact actions. A person (or a check) reviews the list, and only then does the apply step run it. If state changes between plan and apply, re-plan.

```python
import json, time

def make_plan(hosts, wanted):
    return [{"host": h["name"], "from": h["version"], "to": wanted}
            for h in hosts if h["version"] != wanted]

def save_plan(plan, path="plan.json"):
    with open(path, "w") as fh:
        json.dump(plan, fh, indent=2)
    print(len(plan), "changes planned, review", path)
```

Printing the count is a cheap sanity check: a plan that touches 780 of 800 hosts when you expected 12 should stop you.

## Batches, limits and a health gate

```python
from concurrent.futures import ThreadPoolExecutor

def run(plan, apply_one, healthy, batch=10, workers=3, pause=30):
    done = []
    for i in range(0, len(plan), batch):
        chunk = plan[i:i + batch]
        with ThreadPoolExecutor(max_workers=workers) as pool:
            results = list(pool.map(apply_one, chunk))
        done.extend(results)
        if not healthy():
            print("health check failed, stopping after", len(done))
            break
        time.sleep(pause)
    return done
```

Start with one canary target, then a small batch, then larger ones. Limit workers to what the target systems and APIs can take, and stop on the first failed health check. Add a **kill switch**: a file or flag the script checks between batches, so any person can halt the run without killing processes.

## Resume and audit

Record each result as it happens, in an append-only file, with time, operator, target, action and outcome. On restart, skip targets already marked done, so a run that died halfway continues without repeating work. Make each action idempotent in case the last one was cut off. After the run, print a summary: planned, succeeded, failed, skipped, with the failures listed.

```predict
Q: A bulk script stops after 300 of 800 hosts because the laptop lost network. What lets you continue safely?
???
A saved state file of completed targets and idempotent actions: restart, skip finished hosts and run the rest.
> Make long runs resumable.
```

## Incident: The change that went everywhere

> **Incident:** A script that updated an agent configuration on all hosts applied a bad value to 600 machines in four minutes.

```console
$ python rollout.py --all --workers 50
applied 600/800 ... monitoring: errors rising
$ ls kill-switch
ls: cannot access 'kill-switch': No such file or directory
```

There was no plan review, no canary and no health gate, and 50 workers worked with no pause, so the whole fleet was affected before anyone saw the first alert. Recovery meant a rollback script written during the incident. The team changed the tool to require a plan file, start with one canary, run in batches of 20 with a health check between them and a kill switch, and to log every host change to an audit file.

## Common mistakes

- Applying to everything at once
- No canary, no health check and no stop button
- Hidden state that makes reruns repeat work
- No record of who changed what and when

```quiz
Q: Why separate plan from apply?
+ A person or check can review the exact changes before anything happens
- To make the script longer :: Not the goal.
- To avoid logs :: Logs are needed.
- To use more workers :: Unrelated.
> Review reduces blast radius.

Q: What is the purpose of a canary?
+ Test the change on one small target before the rest
- To speed up the run :: It slows it deliberately.
- To avoid tests :: It is a test.
- To disable alerts :: Unrelated.
> Small first, then grow.

Q: What makes a long run resumable?
+ Recorded state of finished targets and idempotent actions
- A larger timeout only :: Does not preserve progress.
- A faster laptop :: Does not help.
- Running it twice from the start :: Repeats work.
> Persist progress.

Q: What should an audit record contain?
+ Time, operator, target, action and result
- Only the final summary :: Loses detail.
- Passwords :: Never log secrets.
- Nothing, to save disk :: Removes accountability.
> Who did what, where and when.
```

```cards
Plan then apply :: review exact changes before running them
Canary :: one target first, then batches
Health gate :: stop when checks fail between batches
Kill switch :: a flag any person can set to halt the run
Audit trail :: time, operator, target, action, result
```
