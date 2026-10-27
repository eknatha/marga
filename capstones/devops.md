## Containerise and run a web service
level: Beginner
hours: 3
modules: docker, linux
summary: Package a small web service in a lean, non-root image and run it with a health check and resource limits.
goal: Turn a small HTTP service into an image you would be willing to run in production.
build: A multi-stage Dockerfile, a .dockerignore, a running container with a health check, memory limit and read-only filesystem.
steps:
- Create a small service that answers `GET /health` with `ok` and `GET /` with a greeting (any language you like).
- Write a multi-stage `Dockerfile`: build in one stage, copy only the result into a small final image.
- Add a `.dockerignore` that leaves out build output, local config and anything secret.
- Create and switch to a non-root user in the final stage, and set `EXPOSE`, `WORKDIR` and a `CMD` in exec form.
- Build it with `docker build -t shop:1.0 .` and compare `docker images` sizes between the single-stage and multi-stage versions.
- Run it with `--read-only --memory 128m --cpus 0.5 -p 8080:8080` and add `--health-cmd` for the health endpoint.
- Break it on purpose: set a memory limit that is too small and read the exit code with `docker inspect` (expect 137 and OOMKilled).
check:
- The container runs as a non-root user (confirm with `docker exec shop id`).
- `docker ps` shows the container as healthy.
- The final image has no compiler or package cache.
- You can explain what exit code 137 means and where you found it.
stretch: Scan the image with a vulnerability scanner and fix the highest finding by updating the base image.

## Build a CI pipeline that tests, scans and publishes
level: Intermediate
hours: 4
modules: cicd, docker
summary: Create a pipeline that lints, tests, scans, builds and publishes an image only when everything passes.
goal: Make every change prove itself before an image can be released.
build: A pipeline definition with lint, unit test, dependency scan, image build, image scan and a gated publish step, with caching and pinned versions.
steps:
- Start from the service in the first capstone and add at least three unit tests and a linter configuration.
- Write the pipeline so that lint and tests run first, in parallel where possible, and fail fast.
- Pin the build image and tool versions, and install dependencies from a lockfile with a clean install command.
- Add a cache keyed on a hash of the lockfile, and confirm a second run is faster.
- Add a dependency scan and an image scan, and make them fail the job above a severity you choose.
- Publish the image only from the main branch, tagged with the commit id (never only `latest`).
- Add a manual approval step before the deploy stage and write down who may approve.
check:
- A failing test stops the pipeline before any image is built.
- The same commit builds an identical image twice (compare digests of the dependency layer).
- Secrets are read from the pipeline's secret store and never printed.
- You can tell a flaky test from a real failure using the first error in the log.
stretch: Add a scheduled nightly run so dependency drift is found before release day.

## Deploy to Kubernetes with probes, rollout and rollback
level: Intermediate
hours: 4
modules: kubernetes, docker
summary: Run the service on a cluster with replicas, probes, resource requests, a Service and a safe rollout you can undo.
goal: Operate a stateless service on Kubernetes the way a production team would.
build: A Deployment with three replicas, readiness and liveness probes, requests and limits, a ConfigMap, a Secret reference, a Service and an Ingress or port-forward.
steps:
- Create a local cluster (kind or minikube) and a namespace named `shop`.
- Write a Deployment with three replicas, resource requests and limits, and a non-root security context.
- Add a readiness probe on `/health` and a liveness probe, with a startup delay that suits your app.
- Move configuration into a ConfigMap and a Secret, and mount them as environment variables.
- Expose the Pods with a ClusterIP Service and check that `kubectl get endpoints` lists three addresses.
- Roll out a new image version with `kubectl set image`, watch `kubectl rollout status`, then break it with a bad image tag and recover with `kubectl rollout undo`.
- Add a PodDisruptionBudget and drain a node (or delete a Pod) while sending requests, and record whether any request failed.
check:
- All three Pods are Ready and the Service has three endpoints.
- A bad rollout leaves the old Pods serving traffic until you undo it.
- You can read `describe` and `logs --previous` to explain a crash loop.
- Changing a ConfigMap value does not require rebuilding the image.
stretch: Add a HorizontalPodAutoscaler and generate load to watch it scale.

## Provision infrastructure with Terraform and watch it
level: Advanced
hours: 5
modules: terraform, observability, cloud
summary: Describe a small environment as code, apply it with a remote state, add monitoring and detect drift.
goal: Create, change and destroy infrastructure repeatably, and know when it has drifted.
build: A Terraform module with variables and outputs, remote state with locking, a network, a compute resource, a dashboard and an alert, and a drift check.
steps:
- Write a root module with typed variables, outputs and pinned provider and Terraform versions.
- Configure a remote backend with state locking and encryption, and confirm a second `plan` waits when the first holds the lock.
- Create a network with public and private subnets and one compute resource in the private subnet.
- Move the network into a reusable module with its own variables and outputs.
- Add a metrics dashboard and one alert on a symptom users would feel (for example error rate), not only CPU.
- Change a setting by hand in the cloud console, then run `terraform plan -refresh-only` and describe the drift it reports.
- Run `terraform plan` and read each line for `forces replacement`, then destroy everything and confirm nothing is left running or billing.
check:
- A clean `plan` shows no changes after apply.
- State is stored remotely and locked while an apply runs.
- Nothing in the code contains a credential.
- You can explain what `must be replaced` means before you apply it.
stretch: Add a policy check that fails a plan which opens SSH to the whole internet.
