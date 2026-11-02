---
title: Container runtimes, the OCI standard and Podman
minutes: 14
summary: Understand what runs a container beneath Docker, how OCI standards make images portable, and how Podman and containerd fit in, including rootless containers.
---

Docker made containers popular, but Docker is not the only piece of software involved. Kubernetes does not need the Docker daemon at all. Knowing the layers helps you debug nodes, choose tools and read documentation that mentions containerd, runc or CRI.

## What you will learn

- The layers: CLI, engine, high-level runtime and low-level runtime
- What the OCI image and runtime specifications guarantee
- Using Podman as a daemonless, rootless alternative
- Inspecting containers on a Kubernetes node with `crictl`

## The layers

When you run `docker run`, several programs cooperate:

| Layer | Example | Job |
|-------|---------|-----|
| CLI | `docker`, `podman`, `nerdctl` | Takes your command |
| Engine / API | `dockerd` | Builds images, manages networks and volumes |
| High-level runtime | `containerd`, CRI-O | Pulls images, manages container lifecycle |
| Low-level runtime | `runc`, `crun` | Creates the Linux namespaces and cgroups and starts the process |

At the bottom a container is just a Linux process started with **namespaces** (an isolated view of processes, network, mounts and users) and **cgroups** (limits on CPU and memory). `runc` is the reference tool that does exactly that.

## The Open Container Initiative

The OCI publishes two specifications. The **image spec** defines how an image is laid out: a manifest, a configuration and a stack of layer tarballs. The **runtime spec** defines how a runtime turns an unpacked image into a running process. Because of these standards, an image built with Docker runs on containerd, CRI-O or Podman, and Kubernetes can swap its runtime without changing your images.

```console
$ docker save shop-api:1.8.2 -o shop-api.tar
$ tar -tf shop-api.tar | head
$ docker history shop-api:1.8.2
$ docker inspect shop-api:1.8.2 --format '{{.Config.Entrypoint}} {{.Config.Cmd}}'
```

## Podman

Podman runs containers without a long-running daemon, and can do so as a normal user (**rootless**). Its commands are deliberately compatible with Docker's.

```console
$ podman run --rm -it docker.io/library/alpine:3.20 uname -a
$ podman build -t shop-api:dev .
$ podman ps
$ podman generate systemd --new --name shop-api > shop-api.service
$ podman pod create --name shop -p 8080:80
$ podman run -d --pod shop --name web docker.io/library/nginx:1.27
```

In rootless mode, "root" inside the container maps to your unprivileged user on the host. If an attacker escapes the container they land as an unprivileged user, which greatly limits damage. Podman can also run several containers in a **pod** that shares a network namespace, the same idea as a Kubernetes Pod, and can export or read Kubernetes YAML with `podman generate kube` and `podman play kube`.

## Runtimes under Kubernetes

Modern Kubernetes talks to a runtime through the **Container Runtime Interface (CRI)**. Most clusters use containerd or CRI-O. On a node there may be no `docker` command, so use `crictl` to see what the kubelet sees.

```console
$ sudo crictl ps
$ sudo crictl images
$ sudo crictl logs 3f9a1c2b8d
$ sudo crictl inspect 3f9a1c2b8d | head -30
$ sudo crictl pods
$ systemctl status containerd
```

Isolation can also be strengthened with alternative low-level runtimes such as gVisor or Kata Containers, which add a user-space kernel or a lightweight virtual machine between the workload and the host. They trade some performance for stronger separation and are chosen with a `RuntimeClass`.

## Incident: docker command not found on the node

> **Incident:** A Pod is stuck in `ImagePullBackOff`. The on-call engineer connects to the node, runs `docker pull` to test the registry, and gets `command not found`. They conclude the node is broken and drain it.

The node is fine. It uses containerd, so there is no Docker. The kubelet's view of the problem is available with the CRI tool:

```console
$ sudo crictl pull registry.example.com/team/shop-api:1.8.2
FATA[0000] pulling image: ... 401 Unauthorized
$ kubectl get secret regcred -n shop -o jsonpath='{.type}'
kubernetes.io/dockerconfigjson
```

The real cause is an expired registry credential. Refresh the image pull secret, and teach the team that `crictl` replaces `docker` on nodes, and that image pull errors are about names, authentication and network, not the node.

## Common mistakes

- Assuming every node has the Docker daemon
- Running containers as root on the host when rootless is possible
- Confusing the runtime spec with the image spec
- Mounting the Docker socket into containers, which is equivalent to root on the host
- Choosing a sandbox runtime without checking it supports the features you need

```quiz
Q: What actually creates a container's isolation on Linux?
- The Docker CLI
+ Namespaces and cgroups, set up by a low-level runtime such as runc
- The registry
- The Dockerfile
> A container is a process with restricted views and resource limits.

Q: Why can an image built with Docker run on containerd or Podman?
+ Both follow the OCI image and runtime specifications
- They share one binary
- Docker converts it at runtime
- They do not; images are tied to Docker
> Open standards make images portable between runtimes.

Q: What is a main benefit of rootless containers?
- Faster builds
+ Escaping the container lands the attacker as an unprivileged user
- No need for images
- Better networking
> Rootless mode limits the impact of a runtime or kernel escape.

Q: Which tool inspects containers on a containerd-based Kubernetes node?
- docker ps
+ crictl ps
- podman ps
- kubectl exec
> crictl speaks the CRI to whichever runtime the kubelet uses.
```

```cards
What is runc? :: The low-level OCI runtime that creates namespaces and cgroups and starts the container process
What does CRI stand for? :: Container Runtime Interface, the API between the kubelet and the runtime
Why is mounting docker.sock risky? :: Anyone with the socket can start privileged containers, effectively root on the host
Podman versus Docker architecture? :: Podman is daemonless and can run rootless; Docker uses a central daemon
```
