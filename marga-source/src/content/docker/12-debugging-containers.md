---
title: Debugging containers that will not start or keep dying
minutes: 15
summary: Read exit codes, logs and events, inspect a container's config, and get a shell inside a failing or minimal image without guessing.
---

A container that exits straight away, restarts in a loop, or behaves differently from your laptop frustrates people because it leaves little behind. In fact Docker keeps a lot of evidence: the exit code, the last logs, the configuration it actually used, and events. This lesson shows where each piece lives.

## What you will learn

- Reading exit codes (0, 1, 125-127, 137, 139, 143)
- Using `logs`, `inspect`, `events`, `stats` and `exec`
- Debugging images with no shell
- The usual causes of crash loops

## Start with the facts

```console
$ docker ps -a --format 'table {{.Names}}\t{{.Status}}'
NAMES    STATUS
shop     Restarting (137) 12 seconds ago
$ docker logs --tail 50 --timestamps shop
$ docker inspect shop --format '{{.State.ExitCode}} {{.State.OOMKilled}} {{.HostConfig.Memory}}'
137 true 268435456
```

| Exit code | Usual meaning |
|-----------|---------------|
| 0 | Process finished normally |
| 1 | Application error |
| 125 | Docker itself failed to run the command |
| 126, 127 | Command not executable, or not found |
| 137 | Killed (SIGKILL), often out of memory |
| 139 | Segmentation fault |
| 143 | Stopped by SIGTERM |

Here 137 together with `OOMKilled true` and a 256 MB limit says the process used more memory than allowed.

## Get inside

```bash
docker exec -it shop sh                       # shell in a running container
docker run --rm -it --entrypoint sh shop:1.4  # shell in the image, skipping the failing entrypoint
docker cp shop:/app/config.yml .              # copy a file out to read it
docker diff shop                              # what changed in the filesystem
docker stats --no-stream                      # CPU and memory now
docker events --since 10m                     # starts, dies, OOM and health events
```

For minimal images with no shell, attach a debug container that shares the target's namespaces:

```bash
docker run --rm -it --pid=container:shop --net=container:shop nicolaka/netshoot
```

## Usual causes of a crash loop

- The main process exits (a script that ends, or a service that daemonises itself)
- A missing environment variable or config file
- A port already in use, or binding to `127.0.0.1` so published ports do not work
- The wrong user, so the app cannot write to a volume
- A health check that is too strict, so the orchestrator keeps killing a working container

```predict
Q: A container prints "exec format error" on start. What is the likely cause?
???
The image was built for a different CPU architecture, such as arm64 on an amd64 host.
> Build with the matching platform or use a multi-architecture image (docker buildx build --platform linux/amd64,linux/arm64).
```

```diagram
title: From a dead container to a cause
node: status | Exit code and state | 0 | 1 | docker ps -a and inspect give the code and whether it was OOM killed. | Looking only at the restart count hides why it exits. | process
node: logs | Logs | 1 | 0 | docker logs shows the last output with timestamps. | Applications that log to files inside the container leave nothing here.
node: cfg | Effective config | 1 | 2 | inspect shows env, mounts, user, limits and command. | Assuming the image defaults still apply misses overrides.
node: shell | Shell inside | 2 | 1 | exec or run --entrypoint sh lets you test files and commands. | Minimal images lack a shell; use a debug container.
node: fix | Fix the image or run options | 3 | 1 | Change the cause, rebuild, and re-run with the same flags. | Fixing only in a running container is lost on the next start.
edge: status | logs
edge: status | cfg
edge: logs | shell
edge: cfg | shell
edge: shell | fix
```

## Incident: the container that restarted every minute

> **Incident:** A new image is released and the service restarts about once a minute. Logs show nothing unusual before each restart.

```console
$ docker inspect api --format '{{.State.OOMKilled}} {{.HostConfig.Memory}}'
true 536870912
$ docker stats --no-stream api
NAME   CPU %   MEM USAGE / LIMIT
api    3.1%    508MiB / 512MiB
```

A new cache library kept results without a size limit. Memory grew until the 512 MB limit killed the process with code 137. The team bounded the cache, raised the limit with measured headroom, and added a memory alert.

## Common mistakes

- Running `docker logs` once, seeing nothing, and giving up (check the exit code and events)
- Debugging in a running container and forgetting to put the fix into the image
- Using `latest` tags, so nobody knows which image is running
- Treating a restart policy as a fix

```quiz
Q: A container exits with code 137 and OOMKilled is true. What happened?
- The app finished normally :: Normal completion gives code 0.
+ The kernel killed it for exceeding its memory limit
- Docker could not find the image :: That fails before the container starts.
- The network was down :: A network fault does not give OOMKilled.
> 137 is SIGKILL, and OOMKilled confirms the memory limit was the cause.

Q: How do you open a shell in an image whose entrypoint crashes immediately?
- docker exec :: exec needs a running container.
+ docker run --rm -it --entrypoint sh image
- docker stop :: stop does not give a shell.
- docker prune :: prune removes unused objects.
> Overriding the entrypoint skips the failing start command.

Q: Which command shows the configuration a container actually runs with?
- docker images :: It lists images only.
+ docker inspect
- docker login :: It authenticates to a registry.
- docker version :: It reports versions.
> inspect shows environment, mounts, user, limits and the command used.

Q: A service inside a container listens on 127.0.0.1 and the published port does not work. Why?
+ Traffic from outside arrives on the container's other interface, so the app must listen on 0.0.0.0
- Docker blocks all ports :: Ports work when published and bound correctly.
- The image is too large :: Size has no effect on binding.
- The host has no CPU :: It does not matter here.
> Loopback is private to the container's own network namespace.
```

```cards
What does exit code 137 mean? :: Killed by SIGKILL, often out of memory
How to run an image with a shell instead of its entrypoint? :: docker run --rm -it --entrypoint sh image
Which command shows effective settings? :: docker inspect
Where do you see start, die and OOM events? :: docker events
Why must apps bind to 0.0.0.0 in containers? :: Loopback is not reachable from outside
```
