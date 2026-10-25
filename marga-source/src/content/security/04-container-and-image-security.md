---
title: Container and image security
minutes: 15
summary: Build minimal images, run as a non-root user with dropped capabilities, scan and sign, and use runtime controls to limit what a compromised container can do.
---

A container is a process with a fence around it, and the fence is only as strong as its settings. A default container often runs as root, has more Linux capabilities than it needs, can write anywhere in its filesystem, and ships with a shell and package manager an attacker can use. Hardening removes those conveniences one by one so that a bug in the application has less to work with.

## What you will learn

- Choosing and maintaining a minimal base image
- Running with a non-root user and fewer privileges
- Runtime restrictions: read-only filesystems, capabilities, seccomp
- Image scanning and registry policy
- What not to do: privileged mode and the Docker socket

## Start with less

Every package in an image is something to patch and something an attacker can use. Prefer a slim or distroless base with no shell, build with a multi-stage Dockerfile so compilers stay behind, and rebuild regularly to pick up fixes. Pin the version, and use a `.dockerignore` file so that credentials and local files never enter the build context.

```dockerfile
FROM golang:1.22 AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /out/server .

FROM gcr.io/distroless/static:nonroot
COPY --from=build /out/server /server
USER 65532:65532
ENTRYPOINT ["/server"]
```

## Do not run as root

If the process runs as root inside the container and an escape bug exists, the attacker may be root on the host. Set `USER` to an unprivileged ID and make sure files the app must write are owned by that user. In Kubernetes enforce it with `runAsNonRoot: true`.

## Runtime restrictions

```bash
docker run --rm \
  --read-only --tmpfs /tmp \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --pids-limit 200 --memory 256m \
  registry.example.com/shop-api:1.8.2
```

| Setting | What it does |
|---------|--------------|
| Read-only root filesystem | An attacker cannot drop tools or change binaries |
| Drop all capabilities | Removes special powers such as raw network access |
| no-new-privileges | Blocks setuid programs from gaining rights |
| Seccomp profile | Limits which system calls the process may make |
| Memory and process limits | Stop one container from starving the host |

## Scanning and registry policy

Scan in the build and again in the registry, since new advisories appear daily. Keep a private registry, allow only approved base images, sign images, and have the cluster verify signatures at admission. Remove old tags that nobody should deploy.

```predict
Q: What does this command do, and why is it dangerous?
docker run -v /var/run/docker.sock:/var/run/docker.sock tools/build-agent
???
It gives the container full control of the Docker daemon on the host, which is equivalent to root access on the host.
> From inside, the process can start a privileged container with the host filesystem mounted. Use rootless builders, a remote build service, or a daemonless tool instead.
```

> **Danger:** Never use `--privileged` or mount the Docker socket into an application container. Both give the container control of the host.

## Incident: the shell in the web container

> **Incident:** A runtime alert reports an interactive shell started inside a production web container, followed by a download of an unknown binary.

The container ran as root with a writable filesystem and a package manager, which made the attacker's work easy. Check what the container was allowed to do, then replace it with a hardened one.

```console
$ docker inspect web --format 'user={{.Config.User}} readonly={{.HostConfig.ReadonlyRootfs}} caps={{.HostConfig.CapDrop}}'
user= readonly=false caps=[]
```

The empty user means root, and nothing was dropped. The fix is a distroless image, a non-root user, a read-only filesystem and dropped capabilities, so that the same bug leads nowhere.

## Common mistakes

- Running as root because it was the default
- Adding a shell and debugging tools to the production image
- Passing secrets with build arguments or `ENV`
- Scanning only at build time and never again

```quiz
Q: Which setting prevents an attacker from modifying binaries in a running container?
- A larger memory limit
+ A read-only root filesystem
- Using the latest tag
- Exposing more ports
> With a read-only filesystem the attacker cannot write tools or replace files. Provide a tmpfs for paths that need to be written.

Q: Why is mounting the Docker socket into a container dangerous?
- It slows the network
+ Anyone who can use the socket can start privileged containers and take over the host
- It deletes images
- It prevents logging
> Access to the Docker API is effectively root on the host.

Q: What is a benefit of a distroless base image?
- It adds more debugging tools
+ It contains little beyond the application, so there is less to patch and less for an attacker to use
- It runs faster on every CPU
- It needs no updates
> Fewer packages mean a smaller attack surface. You still rebuild to pick up fixes.

Q: What does --cap-drop ALL do?
- Deletes all containers
+ Removes the special Linux capabilities, so the process has only ordinary user powers
- Blocks all network traffic
- Disables logging
> Add back only the specific capability an application proves it needs.
```

```cards
Why run as a non-root user? :: Limits what an attacker can do if they break out or abuse the process
Flags for a hardened container? :: --read-only, --cap-drop ALL, --security-opt no-new-privileges
What is distroless? :: Images with the application and its runtime only, no shell or package manager
Why scan the registry again? :: New vulnerabilities are published after the image was built
What does seccomp do? :: Restricts which system calls a process may use
```
