---
title: BuildKit, build caching and multi-architecture images
minutes: 13
summary: Make image builds fast and repeatable with layer ordering, BuildKit cache mounts, secrets that do not leak into layers, remote caches and images that run on both amd64 and arm64.
---

A slow image build slows every developer and every pipeline run. A careless one leaks secrets into layers or produces an image that cannot run on the machine where it is deployed. BuildKit, the modern build engine, gives you precise control over caching, secrets and target platforms.

## What you will learn

- How layer caching works and how to order instructions
- Cache mounts for package managers
- Build secrets and SSH forwarding without leaking into layers
- Sharing cache between pipeline runs
- Building for amd64 and arm64 with `buildx`

## How the cache works

Each instruction in a Dockerfile creates a layer. If the instruction and everything before it are unchanged, the layer comes from cache. As soon as one layer changes, all following layers are rebuilt. So order instructions from least to most frequently changing:

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim AS build
WORKDIR /app
COPY requirements.txt .                      # changes rarely
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt
COPY . .                                      # changes on every commit
RUN python -m compileall .
```

Copying the dependency list first means a code change does not reinstall the dependencies. A `.dockerignore` file keeps unrelated changes (test output, local files) from invalidating the `COPY . .` layer.

## Cache mounts

`RUN --mount=type=cache` keeps a directory (pip, npm, apt, Go build cache) between builds without storing it in the image. Builds become much faster, and the image stays small.

## Secrets

Never use `ARG` or `ENV` for a secret, or `COPY` a credentials file: they stay in image layers and history. Use a build secret, which is mounted only during one `RUN`:

```dockerfile
FROM node:20-slim
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci
```

```bash
docker build --secret id=npmrc,src=$HOME/.npmrc -t shop:1.0 .
docker history --no-trunc shop:1.0 | grep -i npmrc || echo "not in history"
```

For private repositories use `--mount=type=ssh` and `--ssh default` so the key never enters the image.

## Cache in pipelines

Pipeline runners start clean, so local layer cache is empty. Export and import the cache:

```bash
docker buildx build \
  --cache-from type=registry,ref=registry.example.com/shop:buildcache \
  --cache-to   type=registry,ref=registry.example.com/shop:buildcache,mode=max \
  -t registry.example.com/shop:1.4.2 --push .
```

## Multi-architecture images

Teams now run on both amd64 servers and arm64 machines (developer laptops, cloud processors that cost less). An image built for one fails on the other with "exec format error". Build a manifest list covering both:

```bash
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t registry.example.com/shop:1.4.2 --push .
docker buildx imagetools inspect registry.example.com/shop:1.4.2   # shows each platform
```

Compile inside the build for the target (for example `GOARCH=$TARGETARCH`), and test the arm64 image, not only that it builds. Emulation with QEMU works but is slow, so use native builders when you can.

```predict
Q: You move `COPY . .` above `RUN pip install -r requirements.txt`. What happens to build times?
???
Every code change invalidates the cache before the install step, so dependencies are reinstalled on every build.
> Put the files that change least first.
```

## Incident: the token in the layer

> **Incident:** A security scan finds a package registry token in a public image, though the Dockerfile's last line removes the file.

```console
$ docker history --no-trunc shop:0.9 | grep -i NPM_TOKEN
 ARG NPM_TOKEN=npm_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

The token was passed as a build argument and a `RUN rm` in a later layer does not remove earlier layers. The team revoked the token, rebuilt with a build secret, scanned the history in CI, and added a rule against `ARG` names that contain TOKEN or KEY.

## Common mistakes

- `COPY . .` before dependency installation
- Secrets in `ARG`, `ENV` or files copied into layers
- No `.dockerignore`
- Publishing a single-architecture image to mixed fleets

```quiz
Q: What happens to the cache when one layer changes?
- Nothing :: Later layers depend on earlier ones.
+ That layer and all later layers are rebuilt
- Only that layer is rebuilt :: Following layers lose their cache too.
- The whole cache is deleted :: Earlier layers remain valid.
> So place frequently changing files late.

Q: How should a build use a private registry token?
- ARG NPM_TOKEN :: It stays in image history.
+ A build secret mounted for one RUN instruction
- COPY .npmrc :: The file stays in a layer.
- ENV in the Dockerfile :: It is stored in the image.
> Secret mounts are not written into layers.

Q: What does RUN --mount=type=cache provide?
+ A directory reused between builds that is not part of the image
- An encrypted layer :: Not its purpose.
- A smaller base image :: Unrelated.
- A registry :: Unrelated.
> It speeds up package installs without bloating the image.

Q: What error shows an image was built for the wrong CPU architecture?
- permission denied :: A different error.
+ exec format error
- no such host :: A DNS error.
- address in use :: A port error.
> Build a multi-architecture image for mixed fleets.
```

```cards
Why order Dockerfile instructions by change frequency? :: Cache is invalidated from the first changed layer onward
How to pass secrets to a build? :: --mount=type=secret
Command for multi-platform images? :: docker buildx build --platform linux/amd64,linux/arm64
Why add .dockerignore? :: To avoid invalidating cache and copying junk
How to see layer history? :: docker history --no-trunc
```
