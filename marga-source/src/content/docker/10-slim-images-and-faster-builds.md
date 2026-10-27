---
title: Slim images: smaller, faster and safer
minutes: 12
summary: Shrink container images with the right base image, multi-stage builds and clean layers, and see what is inside an image.
---

An image of 1.4 GB takes minutes to pull on every new node, contains compilers an attacker could use, and shows hundreds of vulnerabilities in a scan. Most of that weight is not your application. Small images start faster, cost less to store and give an attacker less to work with.

## What you will learn

- Choose a base image on purpose: full, slim, alpine or distroless
- Use multi-stage builds to leave build tools behind
- Keep layers small and avoid hidden bulk
- Inspect an image to see where the size comes from

## Pick the base on purpose

The base image is usually most of the size. Typical choices:

| Base | Size | Notes |
|------|------|-------|
| `python:3.12` | about 1 GB | Compilers and tools, good for building |
| `python:3.12-slim` | about 150 MB | Debian without most extras, a safe default |
| `python:3.12-alpine` | about 50 MB | Uses musl, which can break some compiled packages |
| distroless | 20 to 60 MB | No shell or package manager, hardest to attack |

Alpine is small but uses a different C library, and some Python wheels then have to be built from source. Slim images are the practical middle. Distroless images are excellent for production, but without a shell you debug with an ephemeral debug container or a separate debug tag.

## Multi-stage builds

Build tools are needed to create the program, not to run it. A multi-stage Dockerfile builds in one stage and copies only the result into a small final stage.

```dockerfile
FROM golang:1.22 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/app ./cmd/app

FROM gcr.io/distroless/static-debian12
COPY --from=build /out/app /app
USER nonroot
ENTRYPOINT ["/app"]
```

The final image holds one static binary. The compiler, the source code and the module cache stay in the first stage and are not part of what you ship.

## Layers and what hides in them

Every instruction can add a layer, and a file deleted in a later layer still takes space in the earlier one. Clean up in the same instruction that creates the mess.

```text
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
```

Use a `.dockerignore` file so the build context does not include `node_modules`, test data, local virtual environments or secrets. Copy the files that change least first (dependency lists), so the cache is reused when only source code changes.

## See where the size comes from

Measure before you optimize.

```console
$ docker images shop
REPOSITORY   TAG    SIZE
shop         1.0    1.38GB
$ docker history shop:1.0 | head
$ docker run --rm -it wagoodman/dive shop:1.0
```

`docker history` lists layers with their sizes, and tools such as `dive` show which files each layer added. A scan with Trivy or Grype on the slim image typically reports far fewer packages, which means fewer alerts to triage.

```predict
Q: You copy a 600 MB archive into an image in one RUN and delete it in the next. Is the image smaller?
???
No. The first layer still contains the archive. Download, use and delete it in a single RUN, or use a multi-stage build.
> Layers are additive; a later delete only hides the file.
```

## Incident: A 1.4 GB image on every node

> **Incident:** Scale-out events took ten minutes because each new node pulled the application image from the registry first.

```console
$ docker history shop:1.0 --format "{{.Size}}\t{{.CreatedBy}}" | head -4
610MB   RUN /bin/sh -c apt-get install -y build-essential
480MB   COPY . /app
210MB   RUN pip install -r requirements.txt
```

The image carried compilers and the whole repository, including test data and a local virtual environment. A multi-stage build, a slim base, and a `.dockerignore` brought it down to 170 MB. Pulls dropped from minutes to seconds, and the vulnerability scan went from over 400 findings to 31.

## Common mistakes

- Using the full language image as the final image
- Deleting files in a later layer and expecting the size to drop
- Copying the whole project, including secrets and caches, into the image
- Choosing Alpine for Python and then fighting native build errors

```quiz
Q: What does a multi-stage build achieve?
+ The final image contains only what it needs at run time
- It makes the build faster in every case :: It may or may not.
- It encrypts layers :: Layers are not encrypted.
- It removes the need for a registry :: You still push the image.
> Build tools stay in the build stage.

Q: Why does deleting a file in a later layer not shrink the image?
+ The earlier layer still stores it
- Docker ignores delete commands :: It applies them, but the data stays in the earlier layer.
- Deleted files move to /tmp :: They do not.
- Compression restores them :: It does not.
> Combine create and delete in one instruction.

Q: What does a .dockerignore file do?
+ Keeps files out of the build context
- Hides files inside the running container :: It only affects the build.
- Blocks pushes :: It does not affect pushing.
- Deletes the image :: It deletes nothing.
> Smaller context means faster, safer builds.

Q: Which command lists the layers and sizes of an image?
+ docker history
- docker logs :: It shows container output.
- docker ps :: It lists containers.
- docker stats :: It shows live usage.
> Use it to find large layers.
```

```cards
List layers and sizes :: docker history IMAGE
Final stage keeps :: only the files needed at run time
Clean in the same layer :: apt-get install ... && rm -rf /var/lib/apt/lists/*
Keep context small :: .dockerignore
Safe default base :: the slim variant
```
