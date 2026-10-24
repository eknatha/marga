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
