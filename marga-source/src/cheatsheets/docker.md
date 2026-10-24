---
title: Docker and Compose
summary: Run, build, inspect, clean up and harden containers, plus everyday Compose commands.
module: docker
---

## Run and manage

```bash
docker run -d --name web -p 8080:80 nginx:1.27
docker run --rm -it alpine:3.20 sh          # throwaway interactive container
docker ps -a                                 # include stopped
docker stop web && docker rm web
docker exec -it web sh                       # shell in a running container
docker logs -f --tail 50 web
docker cp web:/etc/nginx/nginx.conf ./nginx.conf
```

| Flag | Meaning |
|------|---------|
| `-d` | Run in the background |
| `-p HOST:CONTAINER` | Publish a port |
| `-e KEY=value` | Set an environment variable |
| `-v NAME:/path` | Mount a volume |
| `--network NAME` | Join a network |
| `--restart unless-stopped` | Restart policy |
| `--memory 512m --cpus 1` | Resource limits |
| `--user 10001` | Run as a non-root user |

## Build and ship

```bash
docker build -t shop-api:1.8.2 .
docker build --no-cache -t shop-api:dev .
docker tag shop-api:1.8.2 registry.example.com/shop-api:1.8.2
docker push registry.example.com/shop-api:1.8.2
docker pull registry.example.com/shop-api:1.8.2
docker history shop-api:1.8.2
```

## Dockerfile essentials

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
USER 10001
EXPOSE 8080
CMD ["python", "app.py"]
```

| Rule | Why |
|------|-----|
| Copy dependency files first | Keeps the install layer cached |
| Pin base image versions | Reproducible builds |
| Use multi-stage builds | Small final image without build tools |
| Use exec form for `CMD` | Program is PID 1 and receives signals |
| Add `.dockerignore` | Smaller context, no secrets copied |

## Volumes and networks

```bash
docker volume create pgdata
docker volume ls
docker volume inspect pgdata
docker network create backend
docker network connect backend web
docker network inspect backend
```

On a user-defined network containers resolve each other by name. The default bridge does not.

## Inspect and debug

```bash
docker inspect web --format '{{.State.ExitCode}} oom={{.State.OOMKilled}}'
docker inspect web --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}'
docker stats --no-stream
docker top web
docker events --since 10m
docker run --rm -it --entrypoint sh shop-api:1.8.2
```

| Exit code | Meaning |
|-----------|---------|
| 0 | Finished normally |
| 1 | Application error |
| 125 / 126 / 127 | Docker error / not executable / command not found |
| 137 | SIGKILL, often out of memory |
| 139 | Segmentation fault |
| 143 | SIGTERM, normal stop |

## Clean up

```bash
docker system df                     # disk used by images, containers, volumes
docker container prune               # remove stopped containers
docker image prune -a                # remove unused images
docker volume prune                  # remove unused volumes (check first)
```

## Compose

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f --tail 50 app
docker compose exec db psql -U app -d appdb
docker compose config                # validate and print the merged file
docker compose down                  # keeps volumes
docker compose down -v               # also deletes volumes: destroys data
```

## Hardened run

```bash
docker run -d --name api \
  --user 10001:10001 --read-only --tmpfs /tmp \
  --cap-drop ALL --security-opt no-new-privileges \
  --memory 512m --cpus 1 \
  registry.example.com/shop-api:1.8.2
```

Avoid `--privileged` and mounting `/var/run/docker.sock` into containers.

## Images and registries, more

```bash
docker image ls --digests
docker history --no-trunc app:1.4
docker image inspect app:1.4 --format '{{.Config.User}} {{.Config.Entrypoint}}'
docker tag app:1.4 registry.example.com/team/app:1.4
docker push registry.example.com/team/app:1.4
docker save -o app.tar app:1.4
docker load -i app.tar
docker buildx build --platform linux/amd64,linux/arm64 -t app:1.4 .
docker scout cves app:1.4
```

> **Warning:** Do not tag production deployments with `latest`. It moves, so two hosts can run different code. Pin a version tag or, better, a digest.

> **Warning:** Never copy secrets into an image with `COPY` or `ARG`. They stay in the image layers and in `docker history`. Use build secrets (`--secret`) or runtime injection.

## Run and inspect containers, more

```bash
docker run -d --name web --restart unless-stopped -p 8080:80 nginx:1.27
docker run --rm -it --user 1000:1000 --read-only --cap-drop ALL alpine sh
docker run --memory 512m --cpus 1.5 app:1.4
docker exec -it web sh
docker logs -f --tail 100 --since 10m web
docker inspect web --format '{{.State.Health.Status}} {{.NetworkSettings.IPAddress}}'
docker stats --no-stream
docker top web
docker diff web
docker cp web:/etc/nginx/nginx.conf ./nginx.conf
docker port web
docker events --since 10m
```

> **Warning:** `--privileged` gives a container nearly full access to the host. Do not use it unless you understand why, and never mount `/var/run/docker.sock` into an untrusted container: it is root on the host.

> **Warning:** Publishing with `-p 8080:80` listens on all interfaces and Docker edits firewall rules itself. Bind to localhost with `-p 127.0.0.1:8080:80` when the service is private.

## Volumes and networks

```bash
docker volume ls
docker volume inspect pgdata
docker run -v pgdata:/var/lib/postgresql/data postgres:16
docker run -v "$PWD":/work:ro alpine ls /work
docker network ls
docker network create --driver bridge backend
docker network connect backend web
docker network inspect backend
```

> **Warning:** Data written inside a container is lost when the container is removed. Keep state in named volumes and back them up.

> **Warning:** A bind mount such as `-v /:/host` exposes the host filesystem. Mount only what you need, and read-only (`:ro`) where possible.

## Compose

```bash
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs -f api
docker compose exec api sh
docker compose pull && docker compose up -d
docker compose down
```

> **Warning:** `docker compose down -v` also deletes the named volumes, including your database. Use plain `down` unless you really want to wipe the data.

## Cleanup and cautions

```bash
docker system df
docker container prune
docker image prune
docker builder prune --filter until=168h
```

> **Warning:** `docker system prune -a --volumes` removes every unused image, stopped container and unused volume. On a shared host that can delete someone else's data. Look at `docker system df` and prune one resource type at a time.

> **Warning:** `docker rm -f` kills a running container without a graceful stop. Use `docker stop` first, which sends SIGTERM and waits.
