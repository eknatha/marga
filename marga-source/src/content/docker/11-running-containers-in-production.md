---
title: Running containers in production
minutes: 13
summary: Run containers with the settings production needs: non-root users, read-only filesystems, health checks, limits, restart policy and graceful shutdown.
---

A container that works on a laptop can still be a poor citizen in production. It runs as root, it ignores the stop signal and is killed after ten seconds mid-request, and it has no limits, so one bug takes the host down. A short checklist of run-time settings turns a working container into a dependable one.

## What you will learn

- Run as a non-root user with a read-only filesystem and dropped capabilities
- Handle SIGTERM for graceful shutdown
- Set resource limits, health checks and a restart policy
- Log to standard output and keep data in volumes

## Reduce what a container may do

Containers share the host kernel, so you narrow their rights. Four settings do most of the work:

```console
$ docker run -d --name shop \
    --user 10001:10001 \
    --read-only --tmpfs /tmp \
    --cap-drop ALL \
    --security-opt no-new-privileges \
    shop:1.4
```

`--user` avoids root inside the container, `--read-only` stops an attacker from changing the program, `--tmpfs /tmp` provides the one writable place most programs need, and `--cap-drop ALL` removes Linux capabilities that a web service never uses. Add back only what you must, for example `--cap-add NET_BIND_SERVICE` to bind a port below 1024.

## Stop gracefully

`docker stop` sends SIGTERM and waits ten seconds before SIGKILL. A service must catch SIGTERM, stop accepting new work, finish current requests and exit. In a Dockerfile, use the exec form so the program is process 1 and receives the signal:

```text
ENTRYPOINT ["/app/server"]        # good: the server gets SIGTERM
# ENTRYPOINT /app/server           # shell form: a shell is PID 1 and may swallow it
```

If the program needs longer than ten seconds to drain, raise the timeout with `docker stop -t 30` or `stop_grace_period` in Compose. If it is a script, use `exec` at the end so the shell is replaced by the program, or use a tiny init such as `tini` (`docker run --init`).

## Limits, health and restarts

```console
$ docker run -d --name shop \
    --memory 512m --cpus 1.0 --pids-limit 200 \
    --restart unless-stopped \
    --health-cmd "curl -fsS http://localhost:8080/healthz || exit 1" \
    --health-interval 15s --health-retries 3 \
    shop:1.4
```

The memory limit makes the kernel kill only this container if it grows without bound. The pids limit stops a fork bomb. A restart policy brings the container back after a crash or reboot, and a health check lets the platform see that a running process is no longer serving. Health checks should test the application, not just the port.

## Logs and data

Write logs to standard output and standard error and let the runtime collect them; do not write log files inside the container. Set a log driver limit so the host disk cannot fill (`--log-opt max-size=10m --log-opt max-file=3`). Keep data that must survive in a **volume**, and treat the container filesystem as disposable. Pin image tags to a version or a digest, never `latest`, so a restart does not silently change the program.

```predict
Q: A container takes exactly ten seconds to stop and logs "Killed". What do you check first?
???
Whether the program is PID 1 and handles SIGTERM. The shell form of ENTRYPOINT or a wrapper script may hide the signal.
> A process that ignores SIGTERM is killed by SIGKILL after the grace period.
```

## Incident: Requests lost on every deploy

> **Incident:** Each rolling restart produced a burst of 502 errors for about ten seconds.

```console
$ docker stop shop; echo $?
137
$ docker logs shop | tail -2
listening on :8080
(no shutdown message)
```

Exit status 137 means the container was killed. The Dockerfile used the shell form of `ENTRYPOINT`, so the application never received SIGTERM, and the in-flight requests were cut off. After switching to the exec form and adding a handler that stops accepting connections and drains for up to 20 seconds, the 502 bursts disappeared. The team also set a `stop_grace_period` of 30 seconds.

## Common mistakes

- Running as root with a writable filesystem
- Using the shell form of ENTRYPOINT or CMD
- Skipping resource limits and health checks
- Writing logs and data inside the container filesystem

```quiz
Q: What does exit status 137 usually mean for a container?
+ The process was killed by SIGKILL, often after ignoring SIGTERM or running out of memory
- A normal exit :: Normal exit is 0.
- A syntax error :: That would be a different code.
- The image is missing :: That fails before the container runs.
> 137 is 128 plus signal 9.

Q: Why use the exec form of ENTRYPOINT?
+ The program becomes PID 1 and receives signals directly
- It is faster to type :: It is not about typing.
- It enables shell features :: The exec form does not use a shell.
- It hides the command :: It does not hide anything.
> A shell wrapper can swallow SIGTERM.

Q: Which options reduce what a compromised container can do?
+ Non-root user, read-only filesystem, dropped capabilities
- A larger memory limit :: That does not reduce rights.
- Using latest tags :: That does not reduce rights.
- Publishing more ports :: That increases exposure.
> Least privilege applies to containers.

Q: Why set a health check?
+ So the platform can detect that a running process is no longer serving
- To make logs bigger :: It does not do that.
- To speed up the build :: It does not affect builds.
- To remove the need for monitoring :: You still need monitoring.
> Running is not the same as healthy.
```

```cards
Run as non-root :: --user 10001:10001
Read-only root filesystem :: --read-only --tmpfs /tmp
Drop capabilities :: --cap-drop ALL
Exit code 137 :: killed with SIGKILL
Pin versions :: use a tag or digest, never latest
```
