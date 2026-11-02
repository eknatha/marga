---
title: Secrets management
minutes: 15
summary: Keep passwords, tokens and keys out of code and logs, issue short-lived credentials, rotate on a schedule, and know exactly what to do when one leaks.
---

An engineer pastes a cloud access key into a test script, pushes it to a repository, and moves on. Within minutes automated scanners that watch public code find the key and start launching servers to mine cryptocurrency. The bill arrives before the engineer notices. Leaked credentials are one of the most common ways that cloud accounts are breached, and the fix is a set of habits rather than a single tool.

## What you will learn

- What counts as a secret and where secrets leak
- How to inject secrets at run time instead of building them in
- Short-lived credentials and identity-based access
- Secret scanning in the pipeline
- The response when a secret is exposed

## What counts as a secret

Passwords, API tokens, private keys, certificates, database connection strings, signing keys, and session cookies. A good test: if someone outside the team obtained this value, could they act as you? If yes, treat it as a secret.

## Where secrets leak

- Source code and configuration files committed to a repository, including old history
- Container images, because an `ENV` or `COPY` line stores the value in a layer for good
- Build logs, when a script prints variables or runs with shell tracing on
- Chat messages, tickets and documentation pages
- Crash reports and debug endpoints that dump the environment

Deleting a file in a later commit does not remove the secret from history. Anyone who cloned the repository earlier still has it.

## Inject at run time

The application should receive secrets when it starts, from a store that controls and records access, rather than carry them inside the artifact.

| Method | Good for | Watch out for |
|--------|----------|---------------|
| Secrets manager (cloud or Vault) | Central control, audit, rotation | The permission to read it must be narrow |
| Orchestrator secrets | Simple workloads in a cluster | Kubernetes Secrets are base64 text, not encryption by default |
| Environment variables | Small setups | Visible in process listings and crash dumps |
| Mounted files | Certificates and keys | File permissions and tmpfs |

```predict
Q: A developer wrote the Dockerfile below and deleted the secret file in the next line. Will docker history or an image export still show the token?
RUN echo "token=abc123" > /app/.env
RUN rm /app/.env
???
Yes. The first layer still contains /app/.env with the token.
> Each instruction creates a layer, and layers are read-only. The second instruction only hides the file in the final view. Anyone who pulls the image can extract the first layer. Use build secrets or runtime injection instead.
```

## Prefer short-lived, identity-based credentials

A long-lived key that sits in a variable is a standing risk. Better options exist:

- **Workload identity**: a pod, function or server proves who it is to the cloud provider and receives temporary credentials that expire in an hour or less. No key is stored at all.
- **OIDC for pipelines**: the CI system presents a signed token for the job, and the cloud account exchanges it for temporary access limited to that repository and branch.
- **Dynamic secrets**: a secrets service creates a database user on demand with a short lease and deletes it afterward.

When you cannot avoid a long-lived secret, rotate it on a schedule and make rotation routine, so that rotating after an incident is not a first-time event.

## Scanning for leaks

Add secret scanning in three places: a local pre-commit hook for fast feedback, a pull request check, and a periodic scan of full history and of container images. Tune the rules to reduce false positives, and make a finding block the merge, because a warning that nobody reads protects nothing.

## When a secret leaks

1. **Revoke or rotate first.** Assume it was copied. Rotation matters more than removal from the repository.
2. **Check the audit logs** for use of the credential between the leak and the rotation.
3. **Remove it from where it leaked,** including history if feasible, but treat that as cleanup, not as the fix.
4. **Find the cause** and add a control, such as a scanner rule or a move to workload identity.

> **Warning:** Rewriting repository history does not make a leaked key safe. Rotate the key before anything else.

## Incident: the key in the test script

> **Incident:** At 03:10 the cloud billing alert fires: 140 new large instances in a region the company has never used. The audit log shows they were launched with a deploy key that an engineer had pasted into a test script two days earlier.

The first move is to make the key useless, then look at what it did.

```console
$ aws iam update-access-key --user-name deploy --access-key-id AKIAEXAMPLEKEY --status Inactive
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAEXAMPLEKEY --max-results 5
```

After that, terminate the instances, check for new users and roles the key created, and move the pipeline to short-lived credentials so no static key exists at all.

## Common mistakes

- Putting secrets in `ENV` lines, build arguments or committed `.env` files
- Sharing one credential across many services so that it can never be rotated
- Echoing variables in scripts and shell traces
- Giving every application permission to read every secret

```quiz
Q: A secret was committed and then deleted in the next commit. What should you do?
- Nothing, because the file is gone
+ Treat it as exposed: rotate it, check audit logs, then clean up the history
- Wait for the next release
- Rename the file
> Earlier clones and history still contain the value. Rotation is the real fix.

Q: Which option avoids storing a long-lived cloud key in the pipeline?
- A larger password
+ OIDC federation, where the job exchanges a signed token for temporary credentials
- Storing the key in a wiki
- Printing the key in the job log
> The job proves its identity and receives short-lived access, so there is no standing secret to steal.

Q: Why is deleting a secret in a later Dockerfile line not enough?
- Docker does not support rm
+ Earlier layers are kept in the image and can be extracted
- The registry rejects the push
- The container will not start
> Layers are immutable. Use build-time secret mounts or inject at run time.

Q: What is the best first response to a leaked token?
- Delete the repository
+ Revoke or rotate it immediately
- Email the team and wait
- Change the file name
> A leaked credential should be assumed copied, so it must be made useless before any other cleanup.
```

```cards
Where should secrets be injected? :: At run time from a secrets store, not built into code or images
What is a dynamic secret? :: A credential created on demand with a short lease and removed afterward
First step when a secret leaks? :: Revoke or rotate it
What is OIDC federation for CI? :: The job presents a signed token and receives temporary cloud credentials
Are Kubernetes Secrets encrypted by default? :: No, they are base64 encoded; enable encryption at rest and restrict access
```
