## Start a container when the port is taken
id: dk-port-conflict
module: docker
level: Beginner
minutes: 10
lesson: docker/containers-and-images
engine: Simulated Docker engine and shell
summary: A new web container cannot bind port 8080 because another container already uses it. Choose a free port.
@@ story
The legacy app runs on host port 8080 and must keep running. You need a second copy of the new site next to it. `docker run -p 8080:80` fails.
@@ goals
- Read the error and find which container holds port 8080.
- Start a container named web from nginx:1.25 on a different host port, 8081.
- Keep the legacy container running.
@@ hints
- `docker ps` shows which container publishes port 8080.
- You cannot publish two containers on the same host port, and stopping legacy would break users.
- Use another host port: `docker run -d --name web -p 8081:80 nginx:1.25`.
- Test with `curl -s localhost:8081`.
@@ world
{"docker": {"registry": {"nginx:1.25": {"port": 80, "body": "Welcome to nginx", "size": 190, "log": ["nginx started", "listening on port 80"]}, "legacy:1": {"port": 80, "body": "Legacy app", "size": 120}}, "local": ["legacy:1", "nginx:1.25"], "containers": [{"name": "legacy", "image": "legacy:1", "ports": {"8080": 80}}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "curl -s localhost:8081",
  "code": 0,
  "out": "Welcome to nginx",
  "label": "the new site answers on 8081"
 },
 {
  "t": "cmd",
  "run": "curl -s localhost:8080",
  "code": 0,
  "out": "Legacy app",
  "label": "the legacy app still answers on 8080"
 },
 {
  "t": "cmd",
  "run": "docker ps",
  "code": 0,
  "out": "web",
  "label": "web is running"
 }
]
@@ solution
docker ps
docker run -d --name web -p 8080:80 nginx:1.25
docker run -d --name web -p 8081:80 nginx:1.25
curl -s localhost:8081
@@ explain
A host port can be published by only one container at a time. The error comes from the Docker daemon when it tries to bind the port. The container port (the second number) can be the same in many containers because each container has its own network space.

## Reuse a container name
id: dk-name-conflict
module: docker
level: Beginner
minutes: 8
lesson: docker/containers-and-images
engine: Simulated Docker engine and shell
summary: Docker refuses a container name that an old stopped container still holds.
@@ story
You need to start the web container again, but `docker run --name web` fails because the name is already taken by a container that stopped yesterday.
@@ goals
- Read the conflict error.
- Remove the old stopped container.
- Start a new container named web from nginx:1.25 in the background.
@@ hints
- `docker ps -a` lists stopped containers too.
- A stopped container still reserves its name until it is removed.
- `docker rm web` removes it. Then `docker run -d --name web -p 8080:80 nginx:1.25`.
- Check with `docker ps`.
@@ world
{"docker": {"registry": {"nginx:1.25": {"port": 80, "body": "Welcome to nginx", "size": 190, "log": ["nginx started", "listening on port 80"]}}, "local": ["nginx:1.25"], "containers": [{"name": "web", "image": "nginx:1.25", "ports": {"8080": 80}, "status": "exited", "exit": 0}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "docker ps",
  "code": 0,
  "out": "web",
  "label": "web is running"
 },
 {
  "t": "cmd",
  "run": "curl -s localhost:8080",
  "code": 0,
  "out": "Welcome to nginx",
  "label": "it answers on 8080"
 },
 {
  "t": "ran",
  "re": "docker rm",
  "label": "the old container was removed, not renamed"
 }
]
@@ solution
docker run -d --name web -p 8080:80 nginx:1.25
docker ps -a
docker rm web
docker run -d --name web -p 8080:80 nginx:1.25
docker ps
@@ explain
Container names are unique. A container that has stopped still exists, along with its logs and filesystem, until it is removed. That is useful for debugging but it blocks the name. Use `docker rm` for old ones, or `docker run --rm` for throwaway containers.

## Find why a container exits at once
id: dk-exit-env
module: docker
level: Beginner
minutes: 12
lesson: docker/debugging-containers
engine: Simulated Docker engine and shell
summary: The database container starts and stops immediately. Logs say what is missing.
@@ story
You started the database container and `docker ps` shows nothing. It did not stay up. Find out why and start it correctly. The image needs a POSTGRES_PASSWORD variable.
@@ goals
- Find the stopped container with `docker ps -a` and read its logs.
- Start a new container named db with POSTGRES_PASSWORD=labpass.
- Make `docker ps` show db running.
@@ hints
- `docker ps -a` shows Exited (1). Exit code 1 means an error.
- `docker logs db` prints the last output before it stopped.
- Remove the failed container, then run it again with `-e POSTGRES_PASSWORD=labpass`.
- Check `docker ps`.
@@ world
{"docker": {"registry": {"postgres:16": {"port": 5432, "needsEnv": ["POSTGRES_PASSWORD"], "size": 420, "crashLog": "Error: Database is uninitialized and superuser password is not specified. You must specify POSTGRES_PASSWORD.", "log": ["database system is ready to accept connections"]}}, "local": ["postgres:16"], "containers": [{"name": "db", "image": "postgres:16"}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "docker ps",
  "code": 0,
  "out": "db",
  "label": "db is running"
 },
 {
  "t": "cmd",
  "run": "docker exec db printenv POSTGRES_PASSWORD",
  "code": 0,
  "out": "labpass",
  "label": "the password variable is set"
 }
]
@@ solution
docker ps -a
docker logs db
docker rm db
docker run -d --name db -e POSTGRES_PASSWORD=labpass postgres:16
docker ps
@@ explain
A container lives only as long as its main process. If that process stops with an error, the container exits. The logs of the exited container are still there, so docker logs is the first command to run. Environment variables are fixed when a container is created, so you recreate it to change them.

## Stop a container being killed for memory
id: dk-oom
module: docker
level: Intermediate
minutes: 12
lesson: docker/container-logging-and-resource-limits
engine: Simulated Docker engine and shell
summary: A container exits with code 137 because its memory limit is too small.
@@ story
The report generator container dies a few seconds after it starts. `docker ps -a` shows Exited (137). It was started with a 64 MB limit. It needs about 128 MB.
@@ goals
- Confirm with `docker inspect` that the container was killed for memory.
- Recreate it as reporter with a 256m memory limit.
- Make `docker ps` show reporter running.
@@ hints
- Exit code 137 is 128 plus 9, the signal for kill. Memory limits kill with it.
- `docker inspect --format '{{.State.OOMKilled}}' reporter` prints true.
- Remove it and run again with `-m 256m`.
- Check `docker ps`.
@@ world
{"docker": {"registry": {"reporter:2": {"port": 9100, "mem": 128, "size": 140, "log": ["reports ready"]}}, "local": ["reporter:2"], "containers": [{"name": "reporter", "image": "reporter:2", "mem": 64}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "docker ps",
  "code": 0,
  "out": "reporter",
  "label": "reporter is running"
 },
 {
  "t": "cmd",
  "run": "docker inspect --format '{{.HostConfig.Memory}}' reporter",
  "code": 0,
  "out": "^268435456$",
  "label": "the limit is 256 MB"
 }
]
@@ solution
docker ps -a
docker inspect --format '{{.State.OOMKilled}}' reporter
docker rm reporter
docker run -d --name reporter -m 256m reporter:2
docker ps
@@ explain
When a container uses more memory than its limit, the kernel kills it and Docker records OOMKilled with exit code 137. The fix is a larger limit, or lower memory use in the program. A limit is a safety fence: set it above the normal peak.

## Fix a pull that is denied
id: dk-image-not-found
module: docker
level: Beginner
minutes: 8
lesson: docker/containers-and-images
engine: Simulated Docker engine and shell
summary: docker run fails with pull access denied because the image name has a typo.
@@ story
A teammate sent the command `docker run -d --name site -p 8080:80 ngnix:1.25`. It fails. Find the real image name and start the site.
@@ goals
- Read the error message.
- Fix the image name.
- Start a container named site from the correct image on port 8080.
@@ hints
- "pull access denied" and "repository does not exist" often mean a typo in the name.
- The image is nginx, not ngnix.
- `docker run -d --name site -p 8080:80 nginx:1.25`.
- Check with `curl -s localhost:8080`.
@@ world
{"docker": {"registry": {"nginx:1.25": {"port": 80, "body": "Welcome to nginx", "size": 190, "log": ["nginx started", "listening on port 80"]}}, "local": []}}
@@ checks
[
 {
  "t": "cmd",
  "run": "curl -s localhost:8080",
  "code": 0,
  "out": "Welcome to nginx",
  "label": "the site answers on 8080"
 },
 {
  "t": "cmd",
  "run": "docker ps",
  "code": 0,
  "out": "site",
  "label": "site is running"
 }
]
@@ solution
docker run -d --name site -p 8080:80 ngnix:1.25
docker run -d --name site -p 8080:80 nginx:1.25
docker ps
@@ explain
Docker reports a missing image as an access error because a private repository and a non-existent one look the same to a stranger. Check the spelling and the tag before you suspect credentials.

## Keep data when a container is replaced
id: dk-volume-data
module: docker
level: Intermediate
minutes: 15
lesson: docker/volumes-and-networking
engine: Simulated Docker engine and shell
summary: Container filesystems vanish with the container. Store the database files in a named volume.
@@ story
The tinydb container keeps its data in /data. You will write an order, replace the container (as in an upgrade) and the order must still be there. Without a volume it would be lost.
@@ goals
- Create a volume named dbdata and run a container named db from tinydb:1.0 with it mounted at /data.
- Write the line order-1 to /data/orders.txt inside the container.
- Remove the container, start a new db with the same volume, and read the file back.
@@ hints
- `docker run -d --name db -v dbdata:/data tinydb:1.0` creates the volume if needed.
- `docker exec db sh -c "echo order-1 >> /data/orders.txt"` writes the file.
- `docker rm -f db`, then run it again with the same -v option.
- `docker exec db cat /data/orders.txt` should print order-1.
@@ world
{"docker": {"registry": {"tinydb:1.0": {"port": 5432, "size": 60, "log": ["tinydb ready"]}}, "local": ["tinydb:1.0"]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "docker exec db cat /data/orders.txt",
  "code": 0,
  "out": "order-1",
  "label": "the order survived the replacement"
 },
 {
  "t": "cmd",
  "run": "docker volume ls",
  "code": 0,
  "out": "dbdata",
  "label": "the volume dbdata exists"
 },
 {
  "t": "ran",
  "re": "docker rm",
  "label": "the first container was removed"
 }
]
@@ solution
docker run -d --name db -v dbdata:/data tinydb:1.0
docker exec db sh -c "echo order-1 >> /data/orders.txt"
docker rm -f db
docker run -d --name db -v dbdata:/data tinydb:1.0
docker exec db cat /data/orders.txt
@@ explain
A container's own filesystem layer is deleted with the container. A named volume lives outside it, so a new container can mount the same data. Always keep database files and uploads in volumes, and never rely on the container layer for anything you need later.

## Let two containers find each other by name
id: dk-network-dns
module: docker
level: Intermediate
minutes: 14
lesson: docker/volumes-and-networking
engine: Simulated Docker engine and shell
summary: web cannot reach api by name on the default network. A user-defined network gives containers name lookup.
@@ story
The web container calls http://api:8080 but gets "bad address". Both containers are on the default bridge network, which does not resolve names.
@@ goals
- Show the failure with `docker exec web wget -qO- http://api:8080`.
- Create a network named appnet.
- Connect both containers to it so the call works.
@@ hints
- Name lookup works only on user-defined networks, not on the default bridge.
- `docker network create appnet` makes one.
- `docker network connect appnet web` and `docker network connect appnet api`.
- Run the wget command again.
@@ world
{"docker": {"registry": {"webapp:1": {"port": 80, "body": "web ok", "size": 50}, "apiapp:1": {"port": 8080, "body": "api ok", "size": 60}}, "local": ["webapp:1", "apiapp:1"], "containers": [{"name": "web", "image": "webapp:1"}, {"name": "api", "image": "apiapp:1"}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "docker exec web wget -qO- http://api:8080",
  "code": 0,
  "out": "api ok",
  "label": "web reaches api by name"
 },
 {
  "t": "cmd",
  "run": "docker network ls",
  "code": 0,
  "out": "appnet",
  "label": "the network appnet exists"
 }
]
@@ solution
docker exec web wget -qO- http://api:8080
docker network create appnet
docker network connect appnet web
docker network connect appnet api
docker exec web wget -qO- http://api:8080
@@ explain
Docker runs a small DNS server on user-defined networks, so containers can use each other's names. The default bridge network keeps the old behaviour with no name lookup. Create one network per application and put its containers on it.

## Build an image when a file seems missing
id: dk-build-ignore
module: docker
level: Intermediate
minutes: 15
lesson: docker/writing-dockerfiles
engine: Simulated Docker engine and shell
summary: docker build cannot find server.js, but the file is in the folder. A .dockerignore rule excludes it.
@@ story
The project in ~/app has a Dockerfile, server.js and package.json. `docker build` fails with a file not found error on server.js. Fix the cause, build the image app:1.0 and run it on port 3000.
@@ goals
- Run `docker build -t app:1.0 .` in ~/app and read the error.
- Fix the .dockerignore file.
- Build app:1.0 and run a container named app on port 3000.
@@ hints
- The error mentions the file may be excluded by .dockerignore.
- `cat .dockerignore` shows a line that excludes server.js.
- Remove that line: `sed -i '/^server.js$/d' .dockerignore`.
- Build again, then `docker run -d --name app -p 3000:3000 app:1.0` and `curl -s localhost:3000`.
@@ world
{"cwd": "/home/user/app", "docker": {"registry": {"node:20-alpine": {"size": 180, "user": "root"}}, "local": ["node:20-alpine"]}}
@@ file /home/user/app/Dockerfile mode=644
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
@@ file /home/user/app/package.json mode=644
{"name":"app","version":"1.0.0","main":"server.js"}
@@ file /home/user/app/server.js mode=644
require("http").createServer((q,r)=>r.end("Hello from app")).listen(3000)
@@ file /home/user/app/.dockerignore mode=644
node_modules
.git
server.js
@@ checks
[
 {
  "t": "cmd",
  "run": "curl -s localhost:3000",
  "code": 0,
  "out": "Hello from app",
  "label": "the app answers on 3000"
 },
 {
  "t": "cmd",
  "run": "docker images app",
  "code": 0,
  "out": "1.0",
  "label": "the image app:1.0 exists"
 }
]
@@ solution
cd ~/app
docker build -t app:1.0 .
cat .dockerignore
sed -i '/^server.js$/d' .dockerignore
docker build -t app:1.0 .
docker run -d --name app -p 3000:3000 app:1.0
curl -s localhost:3000
@@ explain
.dockerignore decides which files are sent to the build. A file listed there cannot be copied into the image, even though it is on disk, so the build says it is not found. Check .dockerignore whenever COPY fails for a file you can see.

## Repair a build that fails on npm install
id: dk-build-order
module: docker
level: Intermediate
minutes: 15
lesson: docker/writing-dockerfiles
engine: Simulated Docker engine and shell
summary: npm install fails because package.json is copied after it runs. Reorder the Dockerfile.
@@ story
The Dockerfile in ~/app runs `npm install` before the dependency file has been copied into the image. Fix the order so the build works, and so that dependencies are cached when only the code changes.
@@ goals
- Run `docker build -t app:2.0 .` and read the npm error.
- Copy package.json first, then run npm install, then copy the rest.
- Build app:2.0 successfully.
@@ hints
- The error says package.json cannot be found at /app.
- Each instruction is a layer, run in order. A file must be copied before a command can use it.
- Use this order: COPY package.json ./ then RUN npm install then COPY . .
- Edit the Dockerfile with cat and a heredoc, then build.
@@ world
{"cwd": "/home/user/app", "docker": {"registry": {"node:20-alpine": {"size": 180}}, "local": ["node:20-alpine"]}}
@@ file /home/user/app/Dockerfile mode=644
FROM node:20-alpine
WORKDIR /app
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
@@ file /home/user/app/package.json mode=644
{"name":"app","version":"2.0.0","main":"server.js"}
@@ file /home/user/app/server.js mode=644
require("http").createServer((q,r)=>r.end("Hello from app")).listen(3000)
@@ checks
[
 {
  "t": "cmd",
  "run": "docker images app",
  "code": 0,
  "out": "2.0",
  "label": "the image app:2.0 was built"
 },
 {
  "t": "contains",
  "path": "/home/user/app/Dockerfile",
  "re": "COPY package.json[^\\n]*\\nRUN npm",
  "label": "package.json is copied right before npm install"
 }
]
@@ solution
cd ~/app
docker build -t app:2.0 .
cat > Dockerfile <<'EOF'
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
EOF
docker build -t app:2.0 .
@@ explain
Docker builds layer by layer and caches each one. Copying package.json and installing dependencies before copying the source means the slow install is reused until the dependency file changes. It also has to come first for the command to find its input.

## Shrink a bloated image
id: dk-slim-image
module: docker
level: Intermediate
minutes: 12
lesson: docker/slim-images-and-faster-builds
engine: Simulated Docker engine and shell
summary: The image is over a gigabyte because it uses the full base image. Switch to the small variant.
@@ story
The Dockerfile in ~/app starts from node:20, the full Debian-based image. Pulls take minutes in CI. Change the base to the alpine variant and build app:3.0.
@@ goals
- Build app:3.0 as it is and check the size with `docker images app`.
- Change the base image to node:20-alpine.
- Build again so that the size is below 1 GB (shown in MB).
@@ hints
- `docker images app` shows the SIZE column.
- The full node image is about 1.1 GB. The alpine one is about 180 MB.
- Edit the first line: `sed -i 's#^FROM node:20$#FROM node:20-alpine#' Dockerfile`.
- Build again with the same tag and check the size.
@@ world
{"cwd": "/home/user/app", "docker": {"registry": {"node:20": {"size": 1100}, "node:20-alpine": {"size": 180}}, "local": ["node:20", "node:20-alpine"]}}
@@ file /home/user/app/Dockerfile mode=644
FROM node:20
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
@@ file /home/user/app/package.json mode=644
{"name":"app","version":"3.0.0","main":"server.js"}
@@ file /home/user/app/server.js mode=644
require("http").createServer((q,r)=>r.end("Hello from app")).listen(3000)
@@ checks
[
 {
  "t": "cmd",
  "run": "docker images --format '{{.Size}}' app:3.0",
  "code": 0,
  "out": "^\\d+MB$",
  "label": "app:3.0 is smaller than a gigabyte"
 },
 {
  "t": "contains",
  "path": "/home/user/app/Dockerfile",
  "re": "^FROM node:20-alpine$",
  "label": "the Dockerfile uses the alpine base"
 }
]
@@ solution
cd ~/app
docker build -t app:3.0 .
docker images app
sed -i 's#^FROM node:20$#FROM node:20-alpine#' Dockerfile
docker build -t app:3.0 .
docker images app
@@ explain
The base image is most of an image's size. Alpine-based and slim variants leave out packages you do not need, so they pull faster and have less to patch. Check that your app does not rely on something missing, and test it. Multi-stage builds are the next step.

## Stop a container running as root
id: dk-root-user
module: docker
level: Intermediate
minutes: 12
lesson: docker/security-and-troubleshooting
engine: Simulated Docker engine and shell
summary: The image runs as root. Add an unprivileged user and prove it.
@@ story
A security review found that the image built from ~/app runs its process as root. Make it run as a user called app, rebuild as app:4.0 and prove it.
@@ goals
- Check the current user with `docker run --rm app:4.0 whoami` after building.
- Add a USER instruction to the Dockerfile.
- Build app:4.0 so that `docker run --rm app:4.0 whoami` prints app.
@@ hints
- By default a container runs as root unless the image says otherwise.
- Add `USER app` near the end of the Dockerfile, before CMD.
- `sed -i 's/^EXPOSE 3000$/USER app\nEXPOSE 3000/' Dockerfile` inserts it.
- Rebuild, then run whoami in a throwaway container.
@@ world
{"cwd": "/home/user/app", "docker": {"registry": {"node:20-alpine": {"size": 180, "user": "root"}}, "local": ["node:20-alpine"]}}
@@ file /home/user/app/Dockerfile mode=644
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
@@ file /home/user/app/package.json mode=644
{"name":"app","version":"4.0.0","main":"server.js"}
@@ file /home/user/app/server.js mode=644
require("http").createServer((q,r)=>r.end("Hello from app")).listen(3000)
@@ checks
[
 {
  "t": "cmd",
  "run": "docker run --rm app:4.0 whoami",
  "code": 0,
  "out": "^app$",
  "label": "the container runs as app"
 },
 {
  "t": "contains",
  "path": "/home/user/app/Dockerfile",
  "re": "^USER app$",
  "label": "the Dockerfile has USER app"
 }
]
@@ solution
cd ~/app
docker build -t app:4.0 .
docker run --rm app:4.0 whoami
sed -i 's/^EXPOSE 3000$/USER app\nEXPOSE 3000/' Dockerfile
docker build -t app:4.0 .
docker run --rm app:4.0 whoami
@@ explain
A process that runs as root inside a container is only one mistake away from harming the host, for example through a mounted volume or a kernel flaw. Running as a normal user limits the damage. Create the user in the image if it does not exist, then switch to it with USER.

## Clean up stopped containers safely
id: dk-cleanup
module: docker
level: Beginner
minutes: 10
lesson: docker/running-containers-in-production
engine: Simulated Docker engine and shell
summary: A host fills up with stopped containers. Remove the stopped ones and keep everything that runs.
@@ story
This build host has many old containers. Remove every stopped container, but do not touch the two that are running. Use a filter so you do not have to type each name.
@@ goals
- List all containers, including stopped ones.
- Remove only the stopped containers.
- Leave web and api running.
@@ hints
- `docker ps -a` lists everything. Stopped ones show Exited in STATUS.
- `docker ps -aq -f status=exited` prints only the IDs of stopped containers.
- Pass it to rm: `docker rm $(docker ps -aq -f status=exited)`.
- Finish with `docker ps -a` to confirm.
@@ world
{"docker": {"registry": {"nginx:1.25": {"port": 80, "body": "Welcome to nginx", "size": 190, "log": ["nginx started", "listening on port 80"]}}, "local": ["nginx:1.25"], "containers": [{"name": "web", "image": "nginx:1.25", "ports": {"8080": 80}}, {"name": "api", "image": "nginx:1.25", "ports": {"8081": 80}}, {"name": "old-1", "image": "nginx:1.25", "status": "exited", "exit": 0}, {"name": "old-2", "image": "nginx:1.25", "status": "exited", "exit": 1}, {"name": "old-3", "image": "nginx:1.25", "status": "exited", "exit": 137}]}}
@@ checks
[
 {
  "t": "cmd",
  "run": "docker ps -a -q -f status=exited",
  "code": 0,
  "notOut": "[0-9a-f]{12}",
  "label": "no stopped container is left"
 },
 {
  "t": "cmd",
  "run": "docker ps",
  "code": 0,
  "out": "web",
  "label": "web is still running"
 },
 {
  "t": "cmd",
  "run": "docker ps",
  "code": 0,
  "out": "api",
  "label": "api is still running"
 }
]
@@ solution
docker ps -a
docker ps -aq -f status=exited
docker rm $(docker ps -aq -f status=exited)
docker ps -a
@@ explain
Stopped containers keep their layer on disk until you remove them. Filters let you act on a group safely. Always list what the filter returns before you pass it to a delete command. In production, tools such as docker system prune do the same with extra options.

