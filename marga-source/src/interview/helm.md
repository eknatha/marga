## What is Helm and what problem does it solve?
level: junior
Helm is a package manager for Kubernetes. A chart bundles templated manifests and default values, and an installation of it is a release with a name and history. It solves copy-pasted YAML per environment and gives upgrades and rollbacks as single commands. It does not replace understanding the Kubernetes objects it creates.

## What is the difference between a chart, a release and a repository?
level: junior
A chart is the package of templates and defaults. A release is one installation of a chart in a cluster, with its own name, values and revision history. A repository, either an HTTP index or an OCI registry, is where charts are stored and downloaded from. You can install one chart many times as different releases.

## How do you override chart values and what is the precedence?
level: junior
I keep stable settings in values files passed with -f and use --set for the one value that changes per release, such as the image tag. Later files override earlier ones and --set overrides files. Lists are replaced, not merged. I check the result with helm get values and render with helm template before applying.

## How do you roll back a bad release?
level: junior
I look at helm history to find the last good revision and run helm rollback RELEASE REVISION with --wait. That creates a new revision applying the older manifest. It restores Kubernetes objects but not data, so database changes must be backward compatible. In pipelines I use --atomic so failed upgrades roll back automatically.

## What do --atomic and --wait do?
level: mid
--wait makes Helm wait until Deployments are ready and jobs complete before reporting success, up to the timeout. --atomic implies wait and rolls the release back automatically if the upgrade fails or times out. Without them, helm upgrade returns when the manifests are accepted, so a crash-looping rollout can be reported as success.

## How do you handle secrets with Helm?
level: mid
Secrets should not be in values files, because values are stored in the release Secret, shown by helm get values and committed to repositories. The chart references an existing Secret by name, and the Secret is created by an external secrets controller, sealed secrets or an encrypted-file workflow such as SOPS. Anything committed is rotated.

## How do you test and validate a chart before it reaches production?
level: mid
I run helm lint, render with helm template for every environment values file including edge cases with optional features off, validate the output against the Kubernetes schema with a dry run or a validator, and check policies. After deploying I run helm test as a smoke test. Values are validated with a values schema file.

## A release is stuck in pending-upgrade. What do you do?
level: senior
I check helm history to find the stuck revision and the last deployed one and usually roll back to the deployed revision, which resets the state. As a last resort I delete the stuck revision release Secret, which only removes Helm's record. I never delete the workload. Afterwards I fix the cause, such as a killed pipeline job.

## How would you manage Helm across many teams and clusters?
level: senior
I would publish charts to a central OCI registry with immutable versions and signing, keep values per environment in version control, and apply them through a pipeline or a controller that applies them from version control so clusters match reviewed state. I pin and mirror dependencies, run policy checks in CI, limit who can read release Secrets and document upgrade and rollback runbooks.
