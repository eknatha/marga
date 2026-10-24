---
title: Containers and images
minutes: 15
summary: Understand what a container really is, how image layers work, and why pinning image versions prevents "it works on my machine".
---

A feature works on a developer's laptop, passes staging, and breaks in production. The code is identical. The difference is the environment: a different library version, a different base operating system, a different setting. Containers exist to remove that difference by shipping the application together with everything it needs.

## What you will learn

- What a container is and how it differs from a virtual machine
- How images are built from layers
- The everyday `docker` commands
- Why floating tags such as `latest` cause surprises

## A container is an isolated process

A container is **not** a small virtual machine. It is an ordinary Linux process that the kernel has isolated using two features:

- **Namespaces** give the process its own view of processes, network, mounts and hostname.
- **cgroups** limit how much CPU, memory and I/O it can use.

Because containers share the host's kernel, they start in well under a second and use far less memory than a VM, which runs a full operating system on virtual hardware. The trade-off is weaker isolation: a kernel flaw can affect every container on the host, so security settings matter (see the last lesson in this module).

| | Virtual machine | Container |
|---|----------------|-----------|
| Includes | Guest operating system and kernel | Application and its libraries |
| Start time | Seconds to minutes | Milliseconds to seconds |
| Isolation | Strong, hardware level | Process level, shared kernel |
| Typical size | Gigabytes | Megabytes to a few hundred megabytes |

## Images and layers

An **image** is a read-only template. It is built from **layers**, where each instruction in a Dockerfile adds a layer on top of the last. A running **container** is an image plus a thin writable layer. When the container is removed, that writable layer disappears.

```console
$ docker pull nginx:1.27
$ docker history nginx:1.27 | head -4
IMAGE          CREATED       CREATED BY                                      SIZE
a1b2c3d4e5f6   2 weeks ago   CMD ["nginx" "-g" "daemon off;"]                0B
<missing>      2 weeks ago   EXPOSE map[80/tcp:{}]                           0B
<missing>      2 weeks ago   COPY docker-entrypoint.sh / # buildkit          4.62kB
```

This is sample output; IDs and dates will differ. Layers are cached and shared. If ten images start from the same base, the base is stored once on disk, which is why pulls are fast after the first.

## Everyday commands

```console
$ docker run -d --name web -p 8080:80 nginx:1.27
$ docker ps
CONTAINER ID   IMAGE        COMMAND                  STATUS         PORTS                  NAMES
7f3a9c1b2d4e   nginx:1.27   "/docker-entrypoint.…"   Up 5 seconds   0.0.0.0:8080->80/tcp   web
$ curl -sI http://localhost:8080 | head -1
HTTP/1.1 200 OK
$ docker logs --tail 3 web
$ docker exec -it web sh
$ docker stop web && docker rm web
```

`-d` runs in the background, `--name` gives the container a readable name, and `-p 8080:80` publishes container port 80 on host port 8080. `docker exec` starts an extra process **inside** a running container, which is your debugging shell. `docker rm` deletes the container and its writable layer. Add `--rm` to `docker run` for throwaway containers that clean up after themselves.

## Tags are labels, not versions

An image reference has a repository, a **tag** and optionally a **digest**: `nginx:1.27` or `nginx@sha256:...`. A tag is a movable label. The publisher can point `latest` or even `1.27` at a new image at any time. A digest identifies exact content and never changes.

| Reference | Behaviour |
|-----------|-----------|
| `myapp:latest` | Whatever was pushed most recently, which can differ per host |
| `myapp:1.8.2` | A specific release, usually stable but still movable |
| `myapp@sha256:9b2...` | Exact bytes, immutable |

## Incident: two servers run different code from the same tag

> **Incident:** Production runs `myapp:latest` on three hosts. After a release, one host serves the new behaviour and two serve the old, and nobody changed the deploy command.

`latest` was moved by a build on Monday. `docker run` and `docker compose up` reuse an image already stored on the host and only pull when it is missing. Hosts that had pulled `latest` before Monday kept the old image. Compare what each host actually runs:

```console
$ docker image inspect myapp:latest --format '{{.Id}} {{index .RepoDigests 0}}'
sha256:3c1e... myapp@sha256:8f2a...
```

The digests differ between hosts, which proves it. The cure is to deploy by an immutable reference:

```bash
docker pull registry.example.com/myapp:1.8.2
docker run -d --name myapp registry.example.com/myapp:1.8.2
```

Have your pipeline tag each build with a version or commit identifier, deploy by that tag (or digest), and treat `latest` as a convenience for local experiments only. Rollback becomes trivial: run the previous tag.

## Common mistakes

- Using `latest` in production
- Storing important data in the container's writable layer, which is lost on `docker rm`
- Treating a container like a VM: logging in to change things by hand instead of rebuilding the image
- Publishing ports you do not need to the whole network

```quiz
Q: What is a container?
- A lightweight virtual machine with its own kernel
+ An isolated process that shares the host kernel, limited by namespaces and cgroups
- A compressed file archive
- A separate physical server
> Containers are processes isolated by kernel features. They do not run their own kernel.

Q: What happens to data written inside a container's writable layer when you run docker rm?
- It is saved to the image
+ It is deleted with the container
- It moves to /var/lib
- It stays until the next reboot
> The writable layer belongs to the container. Persistent data belongs in a volume.

Q: Why is deploying myapp:latest in production risky?
- latest images are always larger
+ The tag can move, so different hosts may run different content
- Docker blocks the tag
- It cannot be pulled over HTTPS
> A tag is a mutable label. Hosts that pulled it at different times can hold different images.

Q: What does docker run -p 8080:80 do?
- Opens port 80 on the host to the container's port 8080
+ Publishes container port 80 on host port 8080
- Limits the container to 80 MB
- Runs 8080 copies
> The format is HOST_PORT:CONTAINER_PORT.
```

```cards
Container vs VM? :: A container is an isolated process sharing the host kernel; a VM runs a full guest OS on virtual hardware
What are image layers? :: Read-only filesystem changes stacked in order; layers are cached and shared between images
Why avoid the latest tag in production? :: It is a movable label, so hosts can end up with different images
Command to get a shell inside a running container? :: docker exec -it NAME sh
```
