## Replicas reverted
level: junior
A hand-scaled deployment returned to 2.

```text
kubectl scale deploy/api --replicas=10
READY 2/2 twenty minutes later
```
? Why?
+ Self-heal restored the value in the repository
- The cluster is broken
- Pods expire
- Kubernetes ignores scale
why: The repository is the source of truth. Change it by commit.

## Repository not accessible
level: junior
A new application cannot compare.

```text
ComparisonError: rpc error: authentication required
```
? What is missing?
+ A registered repository credential with read access
- A bigger cluster
- A new namespace
- A load balancer
why: Private repositories must be registered with a credential.

## Synced but Degraded
level: mid
The dashboard shows Synced and Degraded.

```text
Sync Status: Synced
Health Status: Degraded
CrashLoopBackOff
```
? Where do you look?
+ At the failing pods' events and logs
- At the Git diff only
- At DNS
- At the sync policy
why: Sync compares manifests. Health is a separate question about the workload.

## Everything deleted
level: mid
Resources vanished after a folder rename.

```text
Sync Policy: Automated (Prune)
app path does not exist -> empty render
```
? What is the lesson?
+ Prune plus a wrong path can delete resources; render checks and Prune=false help
- Prune is harmless
- Renames are free
- Turn off health
why: Pre-merge render checks and protection for stateful resources limit the blast radius.

## Forever OutOfSync
level: mid
Every sync is followed by OutOfSync.

```text
< replicas: 2
> replicas: 5
```
? Why?
+ An autoscaler owns that field, so ignore or remove it from the manifest
- The UI is slow
- The repo is large
- MFA is on
why: Let each controller own its own fields, so the two stop fighting over one value.

## Migration ran twice
level: senior
A retried sync fails.

```text
ERROR: column currency already exists
hook: PreSync
```
? What design fix?
+ Make hooks idempotent
- Delete the Job
- Disable retries forever
- Use a larger node
why: Syncs can be retried, so hooks must be safe to repeat.

## Secret in values
level: senior
A password is in a values file.

```text
12:  password: Pr0d-Db-2024!
9 commits touch the file
```
? What first?
+ Rotate it, then move to an external secrets reference
- Delete the file
- Ask people to ignore
- Rename the key
why: History keeps it. Treat the secret as exposed.

## Applications removed
level: senior
A generator filter matched nothing.

```text
Generators: git directories apps/*
app list count: 2
```
? What protects you?
+ Review for ApplicationSet changes and a policy that preserves generated apps
- More generators
- No reviews
- Larger templates
why: Generators have a large blast radius, so one bad template can touch many applications.
