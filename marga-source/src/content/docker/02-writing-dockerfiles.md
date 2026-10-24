---
title: Writing good Dockerfiles
minutes: 16
summary: Use layer caching, multi-stage builds and a non-root user to build images that are fast to build, small and safer to run.
---

Every code change triggers a six-minute image build, because a dependency install runs again each time. The final image is 1.2 GB for an application that is a single 15 MB binary. Both are Dockerfile problems, and both have simple fixes once you understand how Docker builds images.

## What you will learn

- The core instructions and what each does
- How layer caching works and how to order instructions for it
- Multi-stage builds for small final images
- How to run as a non-root user

## The core instructions

| Instruction | Purpose |
|-------------|---------|
| `FROM` | The base image to start from |
| `WORKDIR` | Set the working directory for later steps |
| `COPY` | Copy files from the build context into the image |
| `RUN` | Execute a command at build time and save the result as a layer |
| `ENV` | Set an environment variable |
| `EXPOSE` | Document the listening port (it does not publish it) |
| `USER` | Switch to a non-root user |
| `CMD` / `ENTRYPOINT` | What runs when the container starts |

`ENTRYPOINT` is the program, and `CMD` provides default arguments to it (or the whole command if there is no entrypoint). Use the **exec form** `["server", "--port", "8080"]` so the program is PID 1 and receives stop signals directly, which allows graceful shutdown.

## How the cache works

Docker runs instructions in order and reuses a cached layer if the instruction and the files it depends on are unchanged. **The first changed layer invalidates every layer after it.** So put things that change rarely at the top and things that change often at the bottom.

```dockerfile
# Slow: any source edit invalidates the dependency install
FROM python:3.12-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "app.py"]
```

```dockerfile
# Fast: dependencies are reinstalled only when requirements.txt changes
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

With the second version, editing `app.py` leaves the install layer cached:

```console
$ docker build -t shop-api:dev .
 => CACHED [2/5] WORKDIR /app
 => CACHED [3/5] COPY requirements.txt .
 => CACHED [4/5] RUN pip install --no-cache-dir -r requirements.txt
 => [5/5] COPY . .
```

This is abbreviated sample output. A `.dockerignore` file keeps junk out of the build context and out of cache checks:

```text
node_modules
.venv
*.log
.env
tmp/
```

> **Warning:** Never `COPY` secrets such as `.env` files into an image. Every layer is stored and can be read by anyone who can pull the image, even if a later step deletes the file.

## Multi-stage builds

A build needs compilers and tools that the running application does not. A multi-stage build compiles in one stage and copies only the result into a small final stage.

```dockerfile
FROM golang:1.23 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
USER nonroot
EXPOSE 8080
ENTRYPOINT ["/server"]
```

The first stage includes the whole Go toolchain, which is hundreds of megabytes. The final stage contains only the compiled binary on a minimal base with no shell or package manager, so it is both small (often under 20 MB) and exposes far less to an attacker. For interpreted languages, use a `-slim` base and install only runtime dependencies in the final stage.

## Incident: a bloated, slow, root-running image

> **Incident:** The platform team scans the shop image and flags a long list of vulnerabilities in tools nobody uses. The image is 1.2 GB, pulls take minutes on new nodes, and the container runs as root.

Check what is inside:

```console
$ docker image ls shop-api
REPOSITORY   TAG    IMAGE ID       SIZE
shop-api     old    5d0c1e2a9b77   1.21GB
shop-api     new    a4f7b8c3d1e0   18.4MB
$ docker run --rm shop-api:old id
uid=0(root) gid=0(root) groups=0(root)
$ docker run --rm shop-api:new id
uid=65532(nonroot) gid=65532(nonroot)
```

The old image used a full build image as its runtime and never set `USER`. The fix is the multi-stage Dockerfile above. The benefits are measurable: a 98% smaller image, faster pulls and rollouts, fewer packages to patch, and a process that cannot write to most of the filesystem if it is compromised. Add a **vulnerability scan** (for example with Trivy) to your pipeline so a new finding fails the build instead of reaching production.

## Common mistakes

- Copying the whole source tree before installing dependencies
- Using `latest` or an unpinned base image
- Running as root
- Leaving build tools and caches in the final image
- Using the shell form of `CMD`, which makes `/bin/sh` PID 1 and swallows stop signals

```quiz
Q: In a Dockerfile, why copy requirements.txt and install dependencies before copying the rest of the source?
- It makes the image smaller
+ So the dependency layer stays cached when only source files change
- Docker requires this order
- It runs the install twice
> A changed layer invalidates all later layers. Copying rarely changing files first preserves the cache.

Q: What is the main benefit of a multi-stage build?
- It makes builds run in parallel on many hosts
+ The final image contains only what is needed at runtime, not the build tools
- It encrypts the image
- It removes the need for a Dockerfile
> Build tools stay in earlier stages. Only the files you copy forward end up in the final image.

Q: Why is the exec form of CMD (a JSON array) preferred?
- It is the only valid form
+ The program runs as PID 1 and receives stop signals directly
- It runs faster
- It hides environment variables
> The shell form wraps your command in /bin/sh, which often does not forward signals, so graceful shutdown fails.

Q: You COPY .env into an image and delete it in a later RUN step. Is the secret safe?
- Yes, deleted files are gone
+ No, the file remains readable in the earlier layer
- Yes, if the image is private
- Only if the tag is latest
> Layers are immutable. Deleting a file in a later layer hides it but does not remove it from the earlier one.
```

```cards
What invalidates the layer cache? :: A changed instruction or changed input files, which also invalidates every later layer
Why use .dockerignore? :: To keep unneeded or secret files out of the build context and the cache checks
Why run as a non-root USER? :: If the process is compromised it has far fewer privileges
CMD vs ENTRYPOINT? :: ENTRYPOINT is the program; CMD gives its default arguments
```
