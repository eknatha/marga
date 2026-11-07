---
title: The KV secrets engine and secret versioning
minutes: 12
summary: Store static secrets in the KV version 2 engine, use versions and soft deletes, patch single keys, and know when static secrets are the wrong choice.
---

The KV engine is the simplest and most used. It is a good home for secrets that exist outside Vault, such as third party API keys, and it adds versioning and audit that a file never had.

## What you will learn

- Enabling KV and reading and writing secrets
- Versions, soft delete and destroy
- Patch and check-and-set
- Organising paths and avoiding sprawl

## Using KV

```bash
vault secrets enable -path=secret kv-v2
vault kv put secret/billing/stripe api_key=sk_live_example
vault kv get secret/billing/stripe
vault kv get -field=api_key secret/billing/stripe
vault kv patch secret/billing/stripe webhook=whsec_example
```

`put` replaces the whole secret with a new version. `patch` updates only the keys you give and keeps the rest. Always prefer `patch` for partial changes.

## Versions

```bash
vault kv get -version=2 secret/billing/stripe
vault kv metadata get secret/billing/stripe
vault kv delete secret/billing/stripe
vault kv undelete -versions=3 secret/billing/stripe
vault kv destroy -versions=1 secret/billing/stripe
```

`delete` marks a version deleted but keeps it for recovery. `destroy` removes it for good. Set `max_versions` so history does not grow forever.

```diagram
title: A secret and its versions
node: w1 | Write: version 1 | 0 | 1 | First value stored. | Old values may be secret too. | store
node: w2 | Write: version 2 | 1 | 0 | Changed API key. | Services still reading version 1 keep the old key. | store
node: soft | Soft delete | 2 | 1 | Version marked deleted but recoverable. | Looks gone but still exists. | process
node: dest | Destroy | 3 | 0 | Version data is permanently removed. | Cannot be undone. | process
node: cas | Check and set | 1 | 2 | A write must name the current version. | Without it concurrent writers overwrite each other. | security
edge: w1 | w2
edge: w2 | soft
edge: soft | dest
edge: cas | w2
```

## Check-and-set

With `-cas=<current version>`, a write fails if someone else wrote in the meantime. You can require it for a whole mount with `cas_required`.

## Paths

Use a consistent layout such as `secret/<team>/<app>/<name>`. Match it to policies, so a team's access is one prefix. Do not store large files or high-rate data in KV. It is for small secrets.

## When not to use it

If the target supports dynamic credentials (databases, cloud IAM), use those instead. A static password in KV is still a long-lived secret, only better protected.

## Incident: The overwritten key

> **Incident:** A deploy failed because a secret key had disappeared.

```console
$ vault kv get -version=6 secret/app
api_key    sk_live_example
webhook    whsec_example
$ vault kv get -version=7 secret/app
api_key    sk_live_example2
```

Version 7 had been written with put and only one key, so the webhook key vanished. The team recovered it from version 6, then moved everyone to patch and enabled cas_required on the mount.

## Common mistakes

- Using put when patch was meant
- Never setting max_versions
- Storing large files in KV
- Keeping static database passwords in KV when dynamic ones are possible

```quiz
Q: What does patch do?
+ Updates given keys and keeps the rest
- Replaces the whole secret :: No.
- Deletes a version :: No.
- Seals Vault :: No.
> It merges changes. The lesson section above explains why.

Q: What does destroy do?
+ Removes a version permanently
- Hides it temporarily :: No.
- Adds a version :: No.
- Enables CAS :: No.
> Destroyed versions cannot be recovered.

Q: What does check-and-set prevent?
+ Overwriting a newer version by mistake
- Reading secrets :: No.
- Token renewal :: No.
- Unsealing :: No.
> Writers must name the current version.

Q: What is KV best for?
+ Static secrets that cannot be generated
- Large files :: No.
- Metrics :: No.
- Certificates only :: No.
> Small static values.
```

```cards
KV v2 :: The versioned key-value secrets engine
Soft delete :: Marking a version deleted while keeping it
Destroy :: Permanently removing a secret version
Check-and-set :: A write that must match the current version
max_versions :: The number of versions kept per secret
```
