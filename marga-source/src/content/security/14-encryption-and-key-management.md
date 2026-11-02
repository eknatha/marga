---
title: Encryption and key management in practice
minutes: 14
summary: Use encryption at rest, in transit and in use correctly, manage keys with a key management service, rotate and separate duties, and avoid the common mistakes that make encryption useless.
---

Encryption is often treated as a checkbox: "encrypted at rest: yes". But encryption only protects against specific threats, and its strength rests entirely on how keys are managed. A strongly encrypted database whose key sits next to it in a configuration file is protected against almost nothing. This lesson shows how to use encryption so that it really reduces risk.

## What you will learn

- What encryption at rest, in transit and in use protect against
- Symmetric and asymmetric keys, hashing and signing in plain terms
- Key management services and envelope encryption
- Rotation, access control and separation of duties
- Common mistakes

## What it protects against

| Kind | Protects against | Does not protect against |
|------|------------------|--------------------------|
| At rest (disks, databases, object storage, backups) | Lost or stolen disks, access to raw storage, some cloud-side mistakes | An attacker using valid application credentials, who sees decrypted data |
| In transit (TLS between client and server, and between services) | Eavesdropping and tampering on the network | A compromised endpoint |
| In use (confidential computing) | A compromised host or hypervisor reading memory | Application bugs |
| Application-level (field encryption) | Database administrators and anyone with database access | Compromise of the application's key |

Choose by threat. Encrypt everything at rest by default because it is cheap, but know that it is mainly a compliance and basic-hygiene control.

## Building blocks

- **Symmetric encryption** (such as AES-256-GCM) uses one key to encrypt and decrypt; fast, used for data.
- **Asymmetric encryption** uses a public key to encrypt or verify, and a private key to decrypt or sign; used to exchange keys and to prove identity (certificates, signatures).
- **Hashing** produces a fixed fingerprint that cannot be reversed; use slow, salted password hashing (Argon2, bcrypt) for passwords, never plain SHA-256.
- **Signing** proves who produced data and that it was not changed (used for images, packages and tokens).
- **Never invent your own algorithms or modes**; use well-reviewed libraries with safe defaults.

## Key management and envelope encryption

Use a key management service (a cloud KMS, or a hardware-backed vault) so that keys are created, stored and used inside a protected service. With **envelope encryption**, a data key encrypts the data, and a master key in the KMS encrypts the data key. Applications ask the KMS to decrypt the data key, so the master key never leaves the service and every use is logged and controlled by policy.

```console
$ aws kms generate-data-key --key-id alias/orders --key-spec AES_256
# returns a plaintext key (use, then discard from memory) and an encrypted copy (store next to the data)
$ aws kms decrypt --ciphertext-blob fileb://datakey.enc
```

## Access and separation of duties

- Key policy decides who can use a key and who can administer it; keep these roles separate. The person who manages keys should not be able to read the data, and the application that reads data should not be able to delete keys.
- Grant `Decrypt` only to the specific roles that need it; deny key deletion except through a reviewed process, and use a waiting period before deletion.
- Use different keys for different data classes and environments, so one leak does not expose everything.
- Log every key use and alert on unusual patterns.

## Rotation and recovery

Rotate keys on a schedule and after suspected exposure. Managed services rotate the master key material automatically while old versions keep decrypting old data. Plan for loss: deleting a key makes data permanently unreadable, which is sometimes the goal (crypto-shredding) and sometimes a disaster. Back up what you must, test recovery, and protect the backup keys.

## TLS everywhere

Use TLS 1.2 or newer for all connections, including inside the network. Automate certificate issue and renewal and alert on expiry. Verify certificates properly in clients; never turn verification off to "make it work".

```predict
Q: Database disks are encrypted, and an attacker steals the application's database password. Does disk encryption help?
???
No. The database decrypts data for any authenticated user, so the attacker reads the data normally. Disk encryption does not stop use of valid credentials.
> Protect credentials, limit what the application account can read, and consider field-level encryption for the most sensitive data.
```

## Incident: the key in the repository

> **Incident:** A security scan finds an encryption key in a configuration file in the same repository as the encrypted exports.

```console
$ grep -R "AES_KEY" config/
config/prod.env: AES_KEY=9f2c...e1
$ aws s3 ls s3://exports-prod/ | head -1
2026-09-30 exports-2026-09.enc
```

Anyone with access to the repository could decrypt every export. The team moved to envelope encryption using a KMS key with a narrow policy, rotated the exposed key, re-encrypted past exports, removed the key from history, and added a secret scanner to the pipeline.

## Common mistakes

- Keys stored with the data they protect
- One key for everything
- Disabling certificate verification
- Treating "encrypted at rest" as protection against all attackers

```quiz
Q: What does encryption at rest mainly protect against?
+ Access to raw storage such as stolen disks or backups
- Stolen valid application credentials :: The data is decrypted for them.
- Network eavesdropping :: That is encryption in transit.
- Software bugs :: Unrelated.
> Know the threat model.

Q: What is envelope encryption?
+ A data key encrypts the data and a master key in a KMS encrypts the data key
- Encrypting twice with the same key :: Not the idea.
- Hashing the data :: Different.
- Compressing data :: Unrelated.
> The master key never leaves the KMS.

Q: Why separate key administrators from data readers?
+ So no single person can both control keys and read the data
- To save money :: Not the reason.
- To speed up access :: Not the reason.
- To avoid logging :: Opposite.
> Separation of duties limits insider risk.

Q: What should you use to store passwords?
+ A slow, salted hash such as Argon2 or bcrypt
- Plain SHA-256 :: Too fast to resist guessing.
- Reversible encryption with a shared key :: Passwords should not be recoverable.
- Base64 :: Not protection.
> Slow hashing makes guessing expensive.
```

```cards
At rest versus in transit? :: Stored data versus data moving across a network
Envelope encryption? :: Data key encrypted by a master key in a KMS
Safe password storage? :: Argon2 or bcrypt with salt
Key deletion effect? :: Data becomes unreadable
Why separate duties? :: Key admins should not read data
```
