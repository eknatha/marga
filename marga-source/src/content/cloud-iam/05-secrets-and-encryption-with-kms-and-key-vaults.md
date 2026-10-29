---
title: Secrets and encryption with KMS and key vaults
minutes: 13
summary: Store secrets in a managed service, understand keys and envelope encryption, and rotate credentials without outages.
---

Passwords, tokens and keys must live somewhere. The wrong places are source code, container images, chat messages and shared documents. The right place is a managed secrets store, with access controlled by identity, every read logged, and rotation built in. Encryption keys are a related but different subject, and cloud key management services keep them safe so you never handle raw key material.

## What you will learn

- Choose a place for secrets and keep them out of code
- Explain encryption at rest and in transit
- Understand keys, envelope encryption and key policies
- Rotate secrets safely

## Secrets stores

AWS Secrets Manager, AWS Systems Manager Parameter Store and Azure Key Vault store secrets and return them to authorised identities at run time. The application fetches the value with its workload identity, holds it in memory and never writes it to disk or logs. Access is a permission like any other, so a pipeline may read only its own secrets. Every read appears in the audit log.

## Keys and envelope encryption

A key management service (AWS KMS, Azure Key Vault keys, Google Cloud KMS) creates keys and performs encryption without exposing the key. For large data, **envelope encryption** is used: a data key encrypts the data, and the master key in KMS encrypts the data key. Storing the encrypted data key beside the data keeps performance high and control central. Key policies decide who can use and who can manage a key; separate those two powers.

## At rest and in transit

Encrypt storage at rest by default for disks, databases and object storage, using managed or customer-managed keys when rules demand control. Encrypt traffic in transit with TLS and reject plain connections. Encryption does not replace access control: anyone with permission to decrypt sees the plain data.

## Rotation

Rotate credentials on a schedule and immediately after exposure. Safe rotation supports two valid versions for a while: create the new, switch consumers, then retire the old. Managed rotation for database passwords can do this automatically. Prefer short-lived tokens, which make rotation a non-event.

```predict
Q: A database password is needed by a service. Where should it live and how should the service get it?
???
In a secrets manager; the service fetches it at start-up using its workload identity.
> No password in code or images.
```

## Incident: The environment variable in the image

> **Incident:** A container image published to a registry contained a database password in an environment variable.

```console
$ docker history --no-trunc shop-api:2.3 | grep DB_PASSWORD
ENV DB_PASSWORD=Sup3rS3cret!
$ trivy image --scanners secret shop-api:2.3
HIGH: secret in layer 4
```

Anyone who could pull the image could read the password. The team rotated the password, rebuilt the image without it, moved the value to the secrets manager with access limited to the service role, and added secret scanning to the build.

## Common mistakes

- Secrets in code, images or logs
- One key for everything
- No rotation plan
- Giving everyone permission to decrypt

```quiz
Q: Where do secrets belong?
+ In a managed secrets store
- In the repository :: Leaks.
- In the image :: Leaks.
- In chat :: Leaks.
> Fetch at run time. Re-read the matching lesson section for the full reasoning.

Q: What is envelope encryption?
+ A data key encrypts data and a master key encrypts the data key
- Encrypting twice with the same key :: No.
- Compressing :: No.
- Hashing :: No.
> Efficient and controlled. Re-read the matching lesson section for the full reasoning.

Q: Does encryption replace access control?
+ No, those with decrypt permission see the data
- Yes :: False.
- Only in transit :: False.
- Only for files :: False.
> Both are needed. Re-read the matching lesson section for the full reasoning.

Q: How should rotation work?
+ Create new, switch consumers, retire old
- Delete first :: Outage.
- Never rotate :: Risky.
- Email the secret :: Unsafe.
> Overlap versions. Re-read the matching lesson section for the full reasoning.
```

```cards
Secrets manager :: stores and serves secrets by identity
KMS :: creates and uses keys without exposing them
Envelope encryption :: data key under a master key
Key policy :: who uses and who manages
Rotation :: replace with overlap
In transit :: TLS everywhere
```
