## Container exits immediately
level: junior
A container built from a custom image starts and stops at once, although the same service runs fine on a VM.

```text
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y nginx
CMD service nginx start

$ docker run -d web
$ docker ps -a
CONTAINER ID  IMAGE  COMMAND                 STATUS
a1b2c3d4e5f6  web    "/bin/sh -c 'service..." Exited (0) 2 seconds ago
```
? Why does the container stop?
+ The container lives only as long as its main process, and service starts nginx in the background and then exits
- Docker does not support nginx
- The image is too large
- The exit code 0 means the port was blocked
why: A container stops when PID 1 exits. `service nginx start` launches the daemon and returns, so PID 1 ends. Run the server in the foreground: `CMD ["nginx", "-g", "daemon off;"]`. Logs should go to stdout and stderr so that `docker logs` shows them.

## Container killed with exit code 137
level: mid
A Java container restarts every few hours.

```text
$ docker inspect api --format '{{.State.OOMKilled}} {{.State.ExitCode}}'
true 137

$ docker run -m 512m ... 
JAVA_OPTS=-Xmx1g
```
? What is the most likely problem?
+ The Java heap is larger than the container memory limit, so the kernel kills the container
- The container's disk is full
- The image was built for the wrong CPU
- Docker restarts containers on a schedule
why: `OOMKilled: true` with exit code 137 means the kernel's out-of-memory killer ended the process. A 1 GB heap cannot fit in a 512 MB limit, and the JVM also needs memory outside the heap. Size the heap below the limit, or use container-aware settings such as `-XX:MaxRAMPercentage=70`, and raise the limit if the application needs it.

## Builds reinstall dependencies every time
level: mid
A small code change causes a ten-minute image build.

```text
FROM node:20
WORKDIR /app
COPY . .
RUN npm ci
CMD ["node", "server.js"]

Step 4/5 : RUN npm ci
 ---> Running in 8f2c1a9d03aa
```
? How do you make builds fast?
+ Copy package.json and the lock file first, run the install, and copy the rest of the source afterwards
- Use the latest tag for the base image
- Run npm ci in the CMD line
- Add a second COPY . . at the end
why: Docker caches each layer and reuses it only while that layer and all earlier layers are unchanged. `COPY . .` changes with every edit, so the following install runs again. Copying the manifest first keeps the install layer cached until dependencies change. A `.dockerignore` file also keeps the build context small.

## Container exits with code 137
level: mid
A Java service container restarts every few hours. Nothing is in the application log.

```text
$ docker ps -a
CONTAINER ID  IMAGE      STATUS
3c1f...       shop/api   Exited (137) 3 minutes ago

$ docker inspect 3c1f --format '{{.State.OOMKilled}} {{.HostConfig.Memory}}'
true 536870912
```
? What does this show and what should you do?
+ The kernel killed the process for exceeding the 512 MB memory limit. Measure real use, raise the limit and set the JVM heap below it
- The image is corrupt and must be rebuilt
- The container ran out of disk space
- The Docker daemon is out of date
why: Exit code 137 is 128 plus signal 9, a kill. OOMKilled true means the cgroup memory limit was hit. The JVM adds non-heap memory on top of the heap, so a heap equal to the limit will fail. Set the heap to a share of the limit and look at the real peak.

## Image is huge and slow to deploy
level: mid
A small Go service ships as a 1.4 GB image. Pulls on new nodes take minutes.

```text
$ cat Dockerfile
FROM golang:1.22
WORKDIR /app
COPY . .
RUN go build -o server .
CMD ["./server"]

$ docker images shop/api
shop/api   latest   1.4GB
```
? Which change helps most?
+ Use a multi-stage build: compile in the golang image, and copy only the binary into a small final image
- Add more layers with RUN commands
- Switch the tag to latest
- Run docker system prune on the nodes
why: The final image still contains the compiler, the module cache and the source. A multi-stage build keeps those in the build stage. The runtime stage can be a minimal base or distroless image, which gives a much smaller image, a faster pull and fewer packages to patch.
