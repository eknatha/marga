---
title: Cloud Run and Cloud Functions
minutes: 12
summary: Deploy containers to Cloud Run and event code to Cloud Run functions, with scaling to zero, revisions, traffic splitting, concurrency and secrets.
---

For many web services and background tasks, a container platform that charges per use is simpler than servers or Kubernetes. Cloud Run is Google Cloud's answer, and it is often the right first choice.

## What you will learn

- Deploying services and revisions
- Scaling, concurrency and cold starts
- Secrets, networking and authentication
- Jobs and event-driven functions

## Deploy

```console
$ gcloud run deploy web --image=europe-west1-docker.pkg.dev/acme-pay-prod/app/web:1.4.2 \
    --region=europe-west1 --service-account=web@acme-pay-prod.iam.gserviceaccount.com \
    --no-allow-unauthenticated --max-instances=20 --concurrency=80 \
    --set-secrets=DB_PASSWORD=db-password:latest
$ gcloud run services update-traffic web --region=europe-west1 --to-revisions=web-00007=10,web-00006=90
```

Each deploy makes a **revision**. Traffic can split between revisions for canary tests and rolled back instantly. The container must listen on the port in `$PORT` and keep no local state.

## Scaling

An instance handles many requests at once up to `--concurrency`. Cloud Run adds instances when concurrency fills and scales to **zero** when idle. `--min-instances` keeps warm instances; `--max-instances` protects databases from overload. Choose CPU always allocated for background work, or CPU only during requests to save money.

## Security and networking

Services are private unless you grant `roles/run.invoker`; use `--no-allow-unauthenticated` and call with identity tokens. Read secrets from **Secret Manager**. Use **Direct VPC egress** to reach private resources.

## Jobs and functions

**Cloud Run jobs** run containers to completion on a schedule or on demand (batch, migrations). **Cloud Run functions** run small event handlers triggered by HTTP, Pub/Sub, Cloud Storage and others, built on the same platform.

```diagram
title: Cloud Run request path
node: user | Caller | 0 | 0 | Sends a request with an identity token. | Allowing unauthenticated calls exposes the service.
node: run | Cloud Run service | 1 | 0 | Routes to a revision and scales instances. | Cold starts delay the first request. | service
node: rev | Revisions | 2 | 0 | Versions with traffic split. | Old revisions linger if never cleaned. | process
node: sec | Secret Manager | 2 | 1 | Supplies passwords at runtime. | Hard-coded secrets leak in images. | security
node: db | Database | 3 | 0 | Limited by max instances and connections. | Unlimited scale exhausts connections. | store
edge: user | run
edge: run | rev
edge: rev | db
edge: sec | run
```

## Incident: Database connection storm

> **Incident:** Cloud Run scaled quickly and opened more connections than the database allowed.

```console
$ gcloud run services describe web --format='value(spec.template.scaling.maxInstance)'
(none)
postgres: FATAL: remaining connection slots are reserved
```

Unlimited scaling met a limited database. The team set max instances, used a connection pooler and lowered per-instance connections.

## Common mistakes

- No maximum instances in front of a database
- Storing state in container local disk
- Public services without authentication needs
- Secrets in environment variables baked into the image

```quiz
Q: What does a deploy create?
+ A new revision
- A new project :: No.
- A new VPC :: No.
- A new disk :: No.
> Revisions are immutable versions.

Q: What does concurrency control?
+ Requests handled at once per instance
- Memory size :: No.
- Region :: No.
- Image size :: No.
> It affects scaling. The lesson section above explains why.

Q: How are secrets supplied?
+ From Secret Manager at runtime
- In the image :: No.
- In Git :: No.
- In labels :: No.
> Mount or env from the manager.

Q: What are Cloud Run jobs for?
+ Run-to-completion tasks
- Serving web traffic :: No.
- Storing data :: No.
- DNS :: No.
> Batch and migrations.
```

```cards
Revision :: An immutable version of a Cloud Run service
Concurrency :: How many requests an instance handles at once
Cold start :: Delay while a new instance starts
Invoker :: The role allowed to call a Cloud Run service
Cloud Run job :: A container that runs to completion
```
