---
title: Multi-container apps with Compose
minutes: 15
summary: Describe an app, its database, networks, volumes and secrets in one file, and make services wait for real readiness.
---

Running an app with a database means a network, a volume, a password, a start order and about five `docker run` commands that someone must remember in the right order. Docker Compose captures all of that in one file that you can review, version and run with one command.

## What you will learn

- The structure of a Compose file
- Health checks and start-up ordering
- Secrets and environment variables
- Everyday Compose commands

## A complete example

```yaml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      DB_HOST: db
      DB_USER: app
      DB_NAME: appdb
      DB_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    depends_on:
      db:
        condition: service_healthy
    networks:
      - backend

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_DB: appdb
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d appdb"]
      interval: 5s
      timeout: 3s
      retries: 10
    networks:
      - backend

secrets:
  db_password:
    file: ./secrets/db_password.txt

volumes:
  pgdata:

networks:
  backend:
```

Read it top to bottom. Each entry under `services` becomes a container. Compose creates the `backend` network and the `pgdata` volume, and services reach each other by their **service name** (`db`). Notice there is no `version:` line. Current Compose ignores that key and warns that it is obsolete.

**Secrets** are mounted as files under `/run/secrets/` inside the containers that list them, so the password never appears in `docker inspect` output or in the image. The `postgres` image reads `POSTGRES_PASSWORD_FILE` natively. Your own application must read the file named by `DB_PASSWORD_FILE` for this to work, which is a small code change worth making.

## Health checks and ordering

`depends_on` alone only waits for the container to *start*, not for the program inside to be *ready*. A database takes several seconds to accept connections. Adding a `healthcheck` and `condition: service_healthy` makes Compose wait until `pg_isready` succeeds before it starts `app`.

## Everyday commands

```console
$ docker compose up -d --build
$ docker compose ps
NAME            IMAGE           COMMAND                  SERVICE   STATUS                    PORTS
shop-app-1      shop-app        "/server"                app       Up 12 seconds             0.0.0.0:8080->8080/tcp
shop-db-1       postgres:16...  "docker-entrypoint.s…"   db        Up 17 seconds (healthy)   5432/tcp
$ docker compose logs -f --tail 20 app
$ docker compose exec db psql -U app -d appdb -c 'select 1'
$ docker compose down            # stops and removes containers and networks, keeps volumes
$ docker compose down -v         # also deletes volumes: this destroys the data
```

This is sample output. `up -d --build` rebuilds changed images and starts everything in the background. `exec` runs a command in a running service. `down -v` is the dangerous one: it removes named volumes, so use it deliberately.

For different environments, keep one base file and override pieces with `-f compose.prod.yaml`, or use **profiles** so optional services (a debug tool, a mail catcher) start only when requested:

```yaml
  mailcatcher:
    image: sj26/mailcatcher
    profiles: ["dev"]
```

`docker compose --profile dev up -d` includes it, and a plain `up -d` leaves it out.

## Incident: the app crashes on every first start

> **Incident:** After `docker compose up -d`, the app container exits with a connection error and restarts a few times before it works. On a slow laptop it never recovers.

```console
$ docker compose logs app | head -3
app-1  | 2026/10/24 03:12:01 connect to database: dial tcp 172.20.0.2:5432: connect: connection refused
app-1  | 2026/10/24 03:12:01 exiting
```

The app started before PostgreSQL finished initializing, and it gives up on the first failed connection. There are two layers of fix. First, the Compose file's `healthcheck` plus `condition: service_healthy` removes the race at start-up. Second, the application should **retry** its connection with a short backoff, because databases restart and networks hiccup after start-up too. Relying on start order alone would leave it fragile whenever the database restarts later.

Confirm the ordering works:

```console
$ docker compose down && docker compose up -d
$ docker compose ps --format '{{.Service}} {{.Status}}'
db Up 14 seconds (healthy)
app Up 8 seconds
```

## Common mistakes

- Using `depends_on` without a health check and assuming the dependency is ready
- Putting passwords directly in the Compose file
- Running `docker compose down -v` out of habit
- Expecting Compose to be a production orchestrator; it runs on one host and has no scheduling across machines

```quiz
Q: What does depends_on with condition: service_healthy wait for?
- The dependency container to be created
+ The dependency's health check to pass
- The dependency to be removed
- The dependency image to be pulled
> Without the condition, Compose only waits for the dependency to start. The health check proves it is ready.

Q: Which command stops the stack but keeps named volumes?
- docker compose down -v
+ docker compose down
- docker compose rm -v
- docker compose prune
> Plain down removes containers and networks. Adding -v also removes volumes and their data.

Q: Why mount a password as a secret file rather than an environment variable?
+ It does not appear in docker inspect output or the image, and it is easy to restrict
- Files are encrypted by default
- Environment variables cannot hold passwords
- Compose requires it
> Environment variables are visible in inspect output and often in logs. A mounted file is not part of the container's configuration.

Q: How do services reach each other in Compose?
- By IP address only
+ By service name on the project network
- Through the host's published ports only
- Through a shared environment file
> Compose creates a network with DNS entries for each service name.
```

```cards
What does a Compose file describe? :: Services, networks, volumes and secrets for a multi-container app
Why add a healthcheck? :: So other services can wait until it is actually ready, not just started
What does docker compose down -v do? :: Removes containers, networks and named volumes, which deletes the data
Is the version key needed? :: No, current Compose ignores it and warns that it is obsolete
```
