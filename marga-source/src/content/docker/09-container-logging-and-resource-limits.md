---
title: Container logging, health checks and resource limits
minutes: 13
summary: Log to standard output, control log growth, add meaningful health checks, and set CPU, memory and process limits that protect the host without causing surprise restarts.
---

Containers run for months and fail at awkward times. The three things that decide whether you can cope are: whether you can see what happened (logs), whether the platform can tell if the app is healthy (health checks), and whether one container can harm its neighbours (limits).

## What you will learn

- Why containers log to standard output and how logging drivers work
- Preventing logs from filling the disk
- Health checks that tell the truth
- CPU, memory, process and file limits
- Restart policies and their traps

## Logging

A container's main process should write logs to standard output and standard error, not to files inside the container. The runtime captures them, and `docker logs` or the platform collects them. Files inside the container are lost with the container and fill its writable layer.

By default the `json-file` driver stores logs without a size limit, so a chatty service can fill the host's disk. Set rotation:

```json
{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "3" } }
```

in `/etc/docker/daemon.json`, or per container with `--log-opt max-size=10m --log-opt max-file=3`. For central logging, use a driver or an agent that ships logs to your log system. Write structured (JSON) logs with a request id so they can be searched.

## Health checks

```dockerfile
FROM alpine:3.20
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1
```

A good health endpoint checks that the app can do its job (for example, reach its database), but not so much that a slow dependency makes every instance unhealthy at once. Separate readiness (can it take traffic) from liveness (should it be restarted). A `start-period` stops slow-starting apps from being killed before they are ready.

## Limits

```bash
docker run -d --name shop \
  --memory 512m --memory-swap 512m \
  --cpus 1.0 \
  --pids-limit 200 \
  --ulimit nofile=4096:4096 \
  --read-only --tmpfs /tmp \
  shop:1.4.2
```

- `--memory` is a hard limit: going over it ends in an OOM kill (exit code 137). Set `--memory-swap` equal to it to disable swap use.
- `--cpus` throttles; it does not kill. Throttling appears as latency.
- `--pids-limit` stops fork bombs and thread leaks.
- `--ulimit nofile` limits open files.
- `--read-only` with `--tmpfs` limits what an attacker or a bug can write.

Choose limits from measured use: run under realistic load, look at `docker stats`, and add headroom. Limits that are too tight cause restarts; none at all lets one container starve the host.

## Restart policies

`--restart unless-stopped` restarts a container that exits. This helps with rare crashes but hides a crash loop. Always alert on restart counts, and pair restarts with logs that show why the process exited.

```predict
Q: A container with --memory 256m is repeatedly restarted. docker inspect shows OOMKilled true. Name two fixes.
???
Raise the limit after measuring real use, or reduce the application's memory use (heap size, cache size, worker count).
> A restart policy only hides the problem. Fix the limit or the memory use, and alert on memory approaching the limit.
```

## Incident: the disk that filled with logs

> **Incident:** A host's disk reaches 100 percent overnight and all containers on it stop working.

```console
$ du -sh /var/lib/docker/containers/*/*-json.log | sort -h | tail -2
48G  /var/lib/docker/containers/9f1c.../9f1c...-json.log
$ docker logs --tail 3 api
DEBUG cache miss key=...
```

A debug log level had been left on, and the default log driver had no size limit. The team set rotation in the daemon configuration, moved to structured logs sent to the central system, and added a disk usage alert at 80 percent.

## Common mistakes

- Logging to files inside containers
- No log rotation
- Health checks that check nothing, or everything
- Restart policies without restart alerts

```quiz
Q: Where should a containerised application write its logs?
- A file in the container :: It is lost and fills the layer.
+ Standard output and standard error
- The image :: Images are read-only.
- The registry :: Not a log store.
> The runtime collects the streams.

Q: What happens when a container exceeds its memory limit?
- It is slowed :: That is CPU behaviour.
+ The kernel kills it, usually exit code 137
- The limit grows :: Limits are fixed.
- Nothing :: The limit is enforced.
> Memory limits are hard.

Q: Which Docker option stops a runaway process from forking without end?
- --cpus :: It throttles CPU.
+ --pids-limit
- --restart :: It restarts exits.
- --read-only :: It restricts writes.
> It limits the number of processes and threads.

Q: Why is a start-period useful in a health check?
+ It gives slow-starting apps time before failures count
- It speeds up startup :: It does not.
- It encrypts the check :: Unrelated.
- It disables the check :: It only delays counting.
> Without it, a healthy but slow app may be marked unhealthy.
```

```cards
How to prevent log files filling the disk? :: Set max-size and max-file for the log driver
CPU limit effect? :: Throttling, shown as latency
Memory limit effect? :: OOM kill (exit 137)
What does --pids-limit protect against? :: Fork bombs and thread leaks
What should alerts watch with restart policies? :: Restart counts
```
