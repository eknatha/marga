## The image that grew to two gigabytes
module: docker
level: Beginner
minutes: 7
lesson: docker/writing-dockerfiles
summary: A small service ships a huge image. Learn layers, base images, caching and multi-stage builds.
intro: Deploys of a tiny API take ten minutes because the image is 2.1 GB. Pulls on new nodes time out during scale-up.

### s1
text: You look at the Dockerfile. It starts with FROM ubuntu, installs a compiler, builds the app and leaves everything in. What is your first idea?
- Use docker history to see which layers are large and why => s2 | 2 | It shows the size each instruction added. Example: one RUN apt-get install layer adds 900 MB of build tools, and COPY . . adds 600 MB of test data.
- Compress the image after building => s2 | 1 | Registries already compress layers, so the gain is small. Example: 2.1 GB becomes 1.9 GB and the pull is still slow.
- Move to a bigger registry plan => s2 | 0 | More storage does not make pulls smaller. Example: nodes still download 2.1 GB each.

### s2
text: The runtime only needs the compiled binary and a few libraries. How do you remove the build tools?
- Use a multi-stage build and copy only the result into a small final image => s3 | 2 | The first stage compiles, the last stage holds only what runs. Example: FROM golang AS build, then FROM gcr.io/distroless/static and COPY --from=build /app /app yields about 20 MB.
- Delete the tools with a later RUN rm command => end-fail | 0 | Layers are additive, so deleted files still exist in earlier layers. Example: the image stays 2.1 GB.
- Tell developers to build locally => s3 | 1 | It moves the problem and loses reproducibility. Example: laptops produce different images.

### s3
text: The build is now small but slow, because every code change reinstalls all dependencies. What helps?
- Copy dependency files first, install, then copy the source, so the dependency layer is cached => s4 | 2 | Docker reuses a layer when its inputs are unchanged. Example: COPY package.json then RUN npm ci then COPY . . makes a code change rebuild only the last layer.
- Put every command on one RUN line => s4 | 1 | It reduces layers, but a change anywhere reruns everything. Example: one typo fix reinstalls all packages.
- Disable the cache for safety => s4 | 0 | It makes every build slow. Example: a five-minute build every time.

### s4
text: A teammate adds COPY . . and a .env file with secrets ends up in the image. What do you do?
- Add a .dockerignore, remove the secret from the build context, rotate the secret and pass secrets at run time => s5 | 2 | Anything in an image layer can be read by anyone with the image. Example: docker history and docker save reveal the .env file, so the key must be changed.
- Delete .env in a later layer => end-fail | 0 | The earlier layer still contains it. Example: extracting the layers reveals the file.
- Make the registry private and move on => s5 | 1 | Private helps, and the secret is still baked into every copy. Example: anyone with pull access can read it.

### s5
text: The image is 40 MB and builds in 40 seconds. How do you keep it from growing back?
- Add an image size check in the pipeline and pin the base image by version => end-win | 2 | A budget in CI catches creep early. Example: the pipeline fails if the image exceeds 100 MB, and a pinned base avoids surprise updates.
- Rely on code review to notice => end-ok | 1 | Reviewers rarely see layer sizes. Example: a new dependency adds 300 MB unnoticed.
- Use the latest tag for the base => end-fail | 0 | A moving tag changes the image without a code change. Example: a new base release breaks the build overnight.

### end-win
end: win
text: The image is 40 MB, pulls take seconds, and scale-up no longer times out.
takeaway: Keep build tools out of the final image, order layers for caching, and keep secrets out of layers.

### end-ok
end: ok
text: The image is smaller but still has avoidable weight or risks.
takeaway: Good progress. Add checks so it stays small and safe.

### end-fail
end: fail
text: Deploys stayed slow, and a secret remained in the image history.
takeaway: Layers are permanent. Plan what goes into each one.

## The pull that failed on Friday evening
module: docker
level: Intermediate
minutes: 7
lesson: docker/registries-and-supply-chain
summary: Nodes cannot pull an image during a scale-up. Learn rate limits, tags, digests and mirroring.
intro: Friday 18:00. Traffic grows and the cluster adds nodes, but new pods stay in ImagePullBackOff. The error says "toomanyrequests".

### s1
text: Pods show ImagePullBackOff. What do you read first?
- The pod events with kubectl describe pod to see the exact pull error => s2 | 2 | Events show the registry message. Example: Failed to pull image: toomanyrequests: You have reached your pull rate limit.
- Delete the pods and let them recreate => s2 | 1 | They fail the same way. Example: each new pod makes another pull request and the limit stays hit.
- Restart the nodes => s2 | 0 | Restarts add more pulls and downtime. Example: all nodes pull again at once.

### s2
text: The registry limits anonymous pulls per IP. All nodes share one outbound address. What are your options?
- Authenticate pulls with an account or token, and plan to mirror important images => s3 | 2 | Authenticated pulls usually get higher limits, and a mirror removes the dependency. Example: an imagePullSecret with a read-only token raises the limit for the whole cluster.
- Wait until the limit resets tomorrow => end-fail | 0 | Customers wait too. Example: traffic is lost for hours.
- Ask each developer to pull locally => s3 | 1 | It does not feed the cluster. Example: laptops have the image, nodes do not.

### s3
text: You add a pull secret and pods start. Your deployment uses image: shop:latest. A teammate warns this is risky. Why?
- latest can point to a different image on each node, so different pods may run different code => s4 | 2 | Tags can move; digests cannot. Example: one node pulled latest at 17:00, another at 18:30 after a push, so two versions serve traffic.
- latest is slower => s4 | 0 | Speed is not the issue. Example: both tags pull at the same speed.
- latest is not allowed by Kubernetes => s4 | 1 | It is allowed, and the risk is consistency. Example: the pod starts fine and still runs unexpected code.

### s4
text: How do you make sure every node runs exactly the image you tested?
- Deploy by digest, or by an immutable version tag that is never overwritten => s5 | 2 | A digest identifies content. Example: image: shop@sha256:ab12... always means the same bytes.
- Re-push latest after each test => end-fail | 0 | It repeats the moving-target problem. Example: nodes pull different versions during the push.
- Ask developers not to push during the day => s5 | 1 | It relies on discipline. Example: one urgent fix breaks the rule.

### s5
text: The incident is over. What prevents a Friday repeat?
- Mirror critical base images into your own registry, add a pull-through cache, and alert on pull failures => end-win | 2 | You control your own registry. Example: images of the base OS and your app live in the company registry, so a public outage or a limit has no effect.
- Hope the public registry raises limits => end-fail | 0 | Hope is not a design. Example: the next limit change catches you again.
- Pull fewer images by never scaling => end-ok | 1 | It avoids the symptom and breaks the purpose. Example: traffic spikes get errors.

### end-win
end: win
text: Critical images are mirrored and pinned by digest. Scale-ups no longer depend on a public rate limit.
takeaway: Own the images you depend on, pin what you run, and watch pull errors like any other signal.

### end-ok
end: ok
text: The cluster recovered with a pull secret, but the dependency on a public registry remains.
takeaway: A fix is in place; remove the single point of failure next.

### end-fail
end: fail
text: Pods stayed pending for hours and versions drifted between nodes.
takeaway: Know where your images come from and what exactly runs.

