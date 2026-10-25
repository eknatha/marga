---
title: Volumes and networking
minutes: 15
summary: Keep data beyond a container's life with volumes and bind mounts, and connect containers by name on user-defined networks.
---

A containerized app needs two things the container itself does not give you: a place to keep data that survives a restart, and a reliable way to find other containers. Get either wrong and you either lose data or spend an evening debugging why `db` does not resolve.

## What you will learn

- The three ways to persist or share data
- How Docker networks and container DNS work
- Why the default network behaves differently from one you create
- How to publish ports safely

## Persisting data

A container's writable layer is deleted with the container. Use one of these instead:

| Type | Created with | Lives | Use for |
|------|--------------|-------|---------|
| **Named volume** | `-v pgdata:/var/lib/postgresql/data` | Managed by Docker | Databases and other app state |
| **Bind mount** | `-v /srv/config:/etc/app:ro` | A host path you choose | Config files, local development code |
| **tmpfs** | `--tmpfs /tmp` | Memory only | Scratch data that must not touch disk |

```console
$ docker volume create pgdata
$ docker run -d --name db -v pgdata:/var/lib/postgresql/data -e POSTGRES_PASSWORD=change-me postgres:16-alpine
$ docker rm -f db
$ docker run -d --name db2 -v pgdata:/var/lib/postgresql/data -e POSTGRES_PASSWORD=change-me postgres:16-alpine
$ docker volume ls
DRIVER    VOLUME NAME
local     pgdata
```

The second database starts with the first one's data because the volume outlived the container. Back up a volume by running a throwaway container that mounts it and archives the contents, and **test restores**, as you learned in the scripting module.

> **Note:** Bind mounts expose host paths directly. Add `:ro` for read-only wherever the container does not need to write, and remember that file ownership inside the container must match the host's numeric user ID.

## Networks and DNS

Containers on the same **network** can reach each other. Docker creates a default network called `bridge`, but it is best to create your own.

```console
$ docker network create backend
$ docker run -d --name db --network backend -e POSTGRES_PASSWORD=change-me postgres:16-alpine
$ docker run --rm --network backend postgres:16-alpine pg_isready -h db
db:5432 - accepting connections
```

On a **user-defined network** Docker runs an embedded DNS server, so containers find each other **by name** (`db`). On the **default bridge** network there is no automatic name resolution between containers, only IP addresses, which change when containers restart.

| | Default `bridge` | User-defined bridge |
|---|------------------|---------------------|
| Name resolution | No | Yes, by container or service name |
| Isolation | All containers share it | Only members can talk |
| Recommended | Quick experiments | Anything real |

## Publishing ports

Containers are reachable from other containers on their network without publishing anything. Publish a port only for traffic that must come from outside Docker.

```bash
docker run -d -p 8080:80 nginx:1.27                 # all host interfaces
docker run -d -p 127.0.0.1:5432:5432 postgres:16    # localhost only
```

> **Warning:** `-p 5432:5432` makes the database reachable from every network interface of the host. Docker also edits firewall rules itself, which can bypass a host firewall you thought was protecting you. Bind to `127.0.0.1` or do not publish the port at all.

## Incident: the app cannot find the database

> **Incident:** The app container logs `could not translate host name "db" to address: Name or service not known`. Both containers are running.

Check which network each container is on:

```console
$ docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' app db
bridge
backend
```

`app` is on the default `bridge` network and `db` is on `backend`. They cannot see each other at all, and even if they shared the default bridge, name lookup would not work there. Put both on the same user-defined network:

```console
$ docker network connect backend app
$ docker exec app getent hosts db
172.19.0.2      db
```

The command `getent hosts db` inside the app container proves the name now resolves. Make this permanent in the run command (`--network backend`) or, better, define the network in Compose (next lesson) so nobody has to connect things by hand.

```diagram
title: Where container data and traffic live
node: ctr | Container | 0 | 1 | A writable layer that disappears with the container. | Data written here is lost when the container is removed.
node: vol | Volume | 1 | 0 | Managed storage that outlives the container. | Not mounted means no persistence.
node: bind | Bind mount | 1 | 2 | A host folder mounted inside. | Wrong permissions or path on the host break the app.
node: net | Bridge network | 2 | 1 | Containers on it reach each other by name; the host publishes ports. | A container on another network cannot resolve the name.
node: host | Host and port | 3 | 1 | A published port maps to the container port. | Two containers cannot publish the same host port.
edge: ctr | vol
edge: ctr | bind
edge: ctr | net
edge: net | host
```

## Common mistakes

- Keeping database files inside the container
- Publishing database ports to the whole host
- Relying on the default bridge network and container IP addresses
- Bind-mounting source code in production instead of baking it into the image

```quiz
Q: Which storage type is best for a database's data directory?
- tmpfs
+ A named volume
- The container's writable layer
- An unmounted directory in the image
> Named volumes are managed by Docker and outlive the container.

Q: Two containers are on the default bridge network. Can one reach the other by container name?
- Yes, always
+ No, automatic name resolution is only available on user-defined networks
- Yes, but only for databases
- Only if both use -p
> The default bridge has no embedded DNS for container names. Use a user-defined network.

Q: How do you publish a container port only on the host's loopback interface?
- -p 5432
- --expose 5432
+ -p 127.0.0.1:5432:5432
- --network host
> Prefixing the host address restricts which host interface the port is bound to.

Q: What does the :ro suffix on a bind mount do?
- Makes the mount faster
+ Mounts it read-only inside the container
- Removes root access
- Encrypts the data
> :ro prevents the container from modifying the mounted path.
```

```cards
Volume vs bind mount? :: A volume is managed by Docker; a bind mount maps a host path you choose
Why create your own network? :: Containers get DNS names and are isolated from unrelated containers
Safe way to publish a database port locally? :: -p 127.0.0.1:5432:5432
Command to attach a running container to a network? :: docker network connect NETWORK CONTAINER
```
