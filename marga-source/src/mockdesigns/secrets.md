# Model answer: a secrets and identity platform
prompt: secrets
summary: Central vault, short-lived dynamic credentials, workload identity and an audit trail.

## The answer in one minute

Use workload identity to prove who is asking, issue short-lived secrets from a vault, avoid long-lived keys, encrypt with managed keys, rotate automatically, and log every access. Plan break-glass access and the vault own availability.

## The design

```diagram
title: Secrets and identity platform design
node: wl | Workloads | 0 | 1 | Pods and VMs needing credentials. | Hard-coded secrets in images.
node: id | Workload identity | 1 | 1 | Proves who the workload is. | Weak identity undermines everything.
node: vault | Vault cluster | 2 | 0 | Stores and issues secrets. | Its outage blocks starts.
node: kms | KMS and HSM | 2 | 2 | Holds the keys that protect data. | Key loss loses data.
node: dyn | Dynamic credentials | 3 | 1 | Per-workload database or cloud credentials. | Revocation must work.
node: aud | Audit log | 4 | 0 | Every read and change. | Unreviewed logs hide abuse.
node: brk | Break-glass | 4 | 2 | Emergency access with approval. | Unmonitored access.
edge: wl | id
edge: id | vault
edge: vault | kms
edge: vault | dyn
edge: dyn | aud
edge: vault | brk
```

## Every component, explained

### Workload identity

The platform gives each workload a verifiable identity, such as a signed token from the Kubernetes service account, so no password is needed to start.

Example: A pod presents its service account token and the vault maps it to the payments role.

### Dynamic credentials

The vault creates a database user on request that expires in an hour. A leak is limited in time and scope.

Example: Each deploy gets its own database user valid for 1 hour.

### Envelope encryption

Data keys encrypt the data and a master key in the KMS encrypts the data keys. Rotating the master key does not re-encrypt all data.

Example: A new master key version is used for new data keys, and old ones are re-wrapped in the background.

### Audit and detection

Every access is logged with identity, path and time, and unusual access raises an alert.

Example: A service reading 500 secrets in a minute raises an alert.

### Availability and break-glass

The vault runs in several zones with cached leases for running workloads, and a sealed emergency path requires multiple approvers.

Example: If the vault is down, running pods keep their credentials until the lease ends.

## Numbers to say out loud

- 1000 services reading secrets at start and every hour is a few hundred requests a second.
- Lease times of 1 hour limit the exposure and need renewals.
- Keep the vault in three zones with a majority needed for writes.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Vault outage | New workloads cannot start | Replicas, cached leases, tested restore |
| Leaked token | Misuse | Short lives, revocation, scoping |
| KMS key deletion | Data loss | Deletion protection and delay |
| Over-broad role | Wide access | Least privilege and review |
| No rotation | Old keys live forever | Automatic rotation and alerts |

## Follow-up questions to expect

- How do you bootstrap trust for the first secret?
- How do you rotate a leaked database password?
- How do you handle secrets in CI?
