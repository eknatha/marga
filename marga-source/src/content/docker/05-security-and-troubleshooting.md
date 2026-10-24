---
title: Container security and troubleshooting
minutes: 16
summary: Harden containers with least privilege, scan images, and use exit codes and inspect output to find out why a container died.
---

A container keeps restarting. Another one passed review and then showed up in a vulnerability report. This lesson covers both sides of operating containers: reducing what an attacker can do, and finding out quickly what went wrong when something stops.

## What you will learn

- A short hardening checklist for running containers
- What belongs in an image and what does not
- How to read container exit codes
- How to find out whether a container was killed for memory

## Hardening checklist

| Practice | How |
|----------|-----|
| Run as a non-root user | `USER nonroot` in the Dockerfile, or `--user 10001` |
| Read-only root filesystem | `--read-only`, with `--tmpfs /tmp` for scratch space |
| Drop Linux capabilities | `--cap-drop ALL`, then add only what you need |
| Block privilege escalation | `--security-opt no-new-privileges` |
| Limit resources | `--memory 512m --cpus 1` |
| Keep secrets out of images | Use runtime secrets, never `COPY` or `ENV` secrets |
| Pin and scan images | Use fixed tags or digests and scan for known vulnerabilities |

```bash
docker run -d --name api \
  --user 10001:10001 \
  --read-only --tmpfs /tmp \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --memory 512m --cpus 1 \
  registry.example.com/shop-api:1.8.2
```

> **Warning:** Avoid `--privileged` and mounting `/var/run/docker.sock` into containers. Either gives the container nearly full control of the host, because anyone who can talk to the Docker socket can start a privileged container.

Every package in an image is something to patch. Choose a small base, rebuild regularly for security updates, and scan in your pipeline:

```console
$ trivy image --severity HIGH,CRITICAL --exit-code 1 registry.example.com/shop-api:1.8.2
```

`--exit-code 1` makes the command fail when it finds serious issues, which turns the scan into a pipeline gate. Remember that a scan shows *known* issues in the packages it can identify. It does not replace least privilege.

## Why did my container stop?

Start with the state Docker recorded:

```console
$ docker ps -a --filter name=api
CONTAINER ID   IMAGE          STATUS                       NAMES
8d9e0a1b2c3d   shop-api:1.8   Exited (137) 3 minutes ago   api
$ docker inspect api --format 'exit={{.State.ExitCode}} oom={{.State.OOMKilled}} restarts={{.RestartCount}}'
exit=137 oom=true restarts=4
$ docker logs --tail 20 api
```

The exit code tells you a lot. Codes above 128 mean the process died from a signal, calculated as `128 + signal number`.

| Exit code | Meaning |
|-----------|---------|
| `0` | Finished normally |
| `1` | The application reported an error; read the logs |
| `125` | Docker itself failed to run the command |
| `126` | Command found but not executable |
| `127` | Command not found, often a wrong path or missing binary in the image |
| `137` | Killed by `SIGKILL` (9), commonly out of memory or `docker kill` |
| `139` | Segmentation fault (11) |
| `143` | Stopped by `SIGTERM` (15), a normal stop |

For a container that will not start or exits instantly, run it interactively with a different entrypoint to explore:

```bash
docker run --rm -it --entrypoint sh registry.example.com/shop-api:1.8.2
```

If the image has no shell (distroless), use `docker logs`, `docker inspect`, or Docker's debug tooling to attach a shell from another image sharing the same namespaces. Do not add a shell to the production image just for convenience.

## Incident: the container is killed every few hours

> **Incident:** `api` restarts about every four hours with `Exited (137)`. The logs show nothing unusual before the restart.

The output above already contains the answer: `exit=137 oom=true`. The kernel killed the process for exceeding the container's memory limit, so the application had no chance to log anything. To see the trend instead of guessing:

```console
$ docker stats --no-stream api
CONTAINER ID   NAME   CPU %   MEM USAGE / LIMIT   MEM %    NET I/O
8d9e0a1b2c3d   api    12.4%   498MiB / 512MiB     97.3%    1.2GB / 800MB
```

Memory sits at 97% of the 512 MiB limit. Two honest options exist. If the service legitimately needs more memory under load, raise the limit after checking peak usage. If memory grows steadily until it dies, you have a leak: capture a heap profile or trend memory in your metrics, fix the code, and keep the limit as a safety net. Raising the limit repeatedly without watching the trend only delays the next kill. Also set a restart policy such as `--restart unless-stopped` so a crash does not become an outage, while still alerting on restart counts so you notice.

## Common mistakes

- Running with `--privileged` or mounting the Docker socket
- Adding secrets with `ENV` or `COPY`
- Restarting a crashing container repeatedly without reading the exit code
- Setting no memory limit and letting one container starve the host

```quiz
Q: A container shows Exited (137) and OOMKilled=true. What happened?
- It exited normally
+ The kernel killed it with SIGKILL because it exceeded its memory limit
- Docker could not find the image
- The application called exit(137) deliberately
> 137 is 128 plus signal 9. OOMKilled=true confirms the kernel enforced the memory limit.

Q: Which flag set reduces the privileges of a container the most among these?
- --privileged
+ --cap-drop ALL --security-opt no-new-privileges --read-only
- -p 8080:80
- --restart always
> Dropping capabilities, blocking privilege escalation and a read-only filesystem all remove ways an attacker could act.

Q: Why is mounting /var/run/docker.sock into a container dangerous?
- It slows down networking
+ Access to the Docker API allows starting privileged containers, which gives control of the host
- It deletes images
- It disables logging
> Whoever can talk to the Docker daemon can effectively act as root on the host.

Q: What does exit code 127 usually mean?
- The container ran out of memory
- The process was stopped normally
+ The command was not found, such as a wrong path or a missing binary in the image
- The network was down
> 127 is the shell's "command not found" status.
```

```cards
Exit code 137? :: 128 + 9: killed by SIGKILL, often out of memory
Command to check if a container was OOM killed? :: docker inspect NAME --format '{{.State.OOMKilled}}'
Three flags that harden a container? :: --read-only, --cap-drop ALL, --security-opt no-new-privileges
Why avoid --privileged? :: It gives the container nearly all host capabilities
```
