---
title: Values per environment and keeping secrets out
minutes: 13
summary: Organise values files for dev, staging and production, validate them, and handle secrets without committing them to version control.
---

Once a chart works, the next question is how to configure it for several environments without copy-paste and without leaking a database password into a repository. The answer is a layered set of values files, validation, and a clear rule: values carry configuration, and secrets arrive from somewhere else.

## What you will learn

- Layer values files: base, environment and one-off
- Validate values with a schema and render in CI
- Why secrets do not belong in values files
- Safe patterns: existing secrets, external secret operators and encrypted files

## Layering

A repository layout that scales:

```text
deploy/shop-web/
  values.yaml           shared settings for all environments
  values-dev.yaml       smaller replicas, debug logging
  values-staging.yaml
  values-prod.yaml      replicas, resources, hostnames, pod disruption budget
```

```bash
helm upgrade --install shop-web acme/web -n shop \
  -f deploy/shop-web/values.yaml -f deploy/shop-web/values-prod.yaml
```

Later files override earlier ones. Keep the environment files short: only what differs. Review changes to `values-prod.yaml` with the same care as application code, because changing a replica count or a resource limit is a production change.

## Validate

Add `values.schema.json` to the chart so wrong types or missing keys fail at install time:

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["image"],
  "properties": {
    "replicaCount": { "type": "integer", "minimum": 1 },
    "image": {
      "type": "object",
      "required": ["repository"],
      "properties": { "repository": { "type": "string" }, "tag": { "type": "string" } }
    }
  }
}
```

In CI, render every environment (`helm template -f ... | kubeconform` or a policy tool) so a mistake is found in the pull request, not during the deploy.

## Secrets and values

Values are stored in release history (as Secrets, base64 encoded, not encrypted by Helm), appear in `helm get values`, and often sit in a repository. A password in `values-prod.yaml` therefore ends up in git history, in CI logs and in anyone's terminal who has read access to the release. Do not put secrets in values files or in `--set` arguments that appear in logs.

## Better patterns

- **Reference an existing Secret**: the chart takes `existingSecret: shop-db` and the Secret is created separately, by an operator or a secure pipeline step.
- **External secrets**: a controller reads from a secret manager and creates the Kubernetes Secret; the chart only names it.
- **Encrypted files**: tools such as SOPS keep encrypted values in the repository and decrypt them in the pipeline with a key you control.
- **Sealed secrets**: encrypted objects that only the cluster can decrypt.

Whatever you choose, rotate any secret that was ever committed, restrict who can read Secrets in the namespace, and consider enabling encryption at rest for the cluster's Secret storage. In the chart, mount the secret as an environment variable or file by reference, never by value.

```predict
Q: A teammate puts a database password in values-prod.yaml and commits it. Name two places it now exists besides the file.
???
In the repository history, and in the release history stored in the cluster (visible with helm get values). Rotate it.
> Values are not a secret store.
```

## Incident: The password in helm get values

> **Incident:** A contractor with read access to one namespace could see the production database password.

```console
$ helm get values shop-web -n shop
USER-SUPPLIED VALUES:
db:
  host: pg.internal
  password: Sup3rS3cret!
```

The chart took the password as a value, so it was stored in the release Secret and printed by helm get values. The password was rotated, the chart was changed to reference an existing Secret, and an external secrets controller now creates that Secret from the secret manager. The team also tightened RBAC so that reading release Secrets requires an explicit role.

## Common mistakes

- Secrets in values files or --set
- Copy-pasted environment files with unnoticed drift
- No validation of values
- Giving everyone read access to release Secrets

```quiz
Q: Which values file wins when two are given with -f?
+ The later one
- The earlier one :: Later wins.
- The longer one :: Length does not matter.
- They are merged randomly :: Order is defined.
> Order matters; the lesson section explains why.

Q: Where does Helm 3 keep the values of a release?
+ In the release Secret in the cluster
- Only in your shell history :: No.
- In the Docker image :: No.
- Nowhere :: It stores them.
> Visible to those who can read it.

Q: A safer way to give a chart a password?
+ Reference an existing Kubernetes Secret created elsewhere
- Put it in values-prod.yaml :: It leaks.
- Use --set in the CI log :: It leaks.
- Hard-code it in templates :: It leaks.
> Charts should name secrets, not hold them.

Q: What does values.schema.json provide?
+ Validation of values at install and lint time
- Encryption :: No.
- Caching :: No.
- Templates :: No.
> Catch mistakes early; the lesson section explains why.
```

```cards
Layer :: -f values.yaml -f values-prod.yaml
Validate :: values.schema.json + render in CI
Never in values :: passwords and tokens
Reference :: existingSecret name
Options :: external secrets, SOPS, sealed secrets
Rotate :: anything that was committed
```
