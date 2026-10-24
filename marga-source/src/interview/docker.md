## What is the difference between a container and a virtual machine?
level: junior
A virtual machine runs a full guest operating system with its own kernel on virtualised hardware. A container is an isolated process that shares the host kernel, using namespaces for isolation and cgroups for resource limits. Containers start in seconds and are lighter, but share the kernel, so isolation is weaker than a VM. Many production setups run containers inside VMs to combine both.

## What is the difference between an image and a container?
level: junior
An image is a read-only, layered template containing the filesystem and metadata. A container is a running instance of an image with a thin writable layer on top. You can start many containers from one image, and deleting a container discards its writable layer unless data is stored in a volume.

## How do you make a Docker image small and secure?
level: mid
Use a small, maintained base such as slim, distroless or Alpine, and pin its version. Use multi-stage builds so compilers and build tools do not reach the final image. Run as a non-root user, copy only what you need with a `.dockerignore`, order instructions so dependencies are cached, and scan the image in the pipeline. Do not store secrets in layers.

## What is the difference between CMD and ENTRYPOINT?
level: mid
`ENTRYPOINT` defines the executable that always runs; `CMD` supplies default arguments, which are replaced by arguments given to `docker run`. Use the exec (JSON array) form so the process receives signals directly as PID 1 and shuts down cleanly. Together, `ENTRYPOINT ["app"]` and `CMD ["--help"]` give a tool with a default argument.

## How does data persist for containers?
level: junior
Container filesystems are ephemeral. Use a **named volume** managed by Docker for databases and other state, a **bind mount** to map a host directory (useful in development), or `tmpfs` for in-memory data. In orchestrators use persistent volumes backed by network or cloud storage, and back them up separately.

## A container keeps restarting. How do you debug it?
level: mid
Check `docker ps -a` and `docker inspect` for the exit code (137 suggests an out-of-memory kill, 1 an application error), read `docker logs`, and look at events. Run the image interactively with a shell, override the entrypoint, check environment variables and mounted files, and confirm resource limits and healthchecks. In Kubernetes the same ideas apply through `kubectl describe pod` and `kubectl logs --previous`.

## Why should you not deploy the latest tag?
level: mid
`latest` is just a mutable tag, so it can point to different content over time. Nodes may run different versions, rollbacks become unclear and builds are not reproducible. Use unique version tags, or better a digest (`image@sha256:...`), enable tag immutability in the registry and record which build produced which tag.

## How would you secure the container supply chain?
level: senior
Build from pinned, trusted base images, scan images for vulnerabilities in the pipeline and on a schedule, produce an SBOM for each build, sign images with a tool such as cosign, and enforce verification at admission so the cluster refuses unsigned or unapproved images. Use a private registry with short-lived credentials, immutable tags and retention rules, and run builds on ephemeral, isolated runners.
