---
title: Transit: encryption as a service
minutes: 12
summary: Use the transit engine to encrypt and decrypt data without the application ever holding the key, rotate keys, rewrap old data and use data keys for large payloads.
---

Encryption is easy to call and hard to do well. Key storage, rotation and access control are where teams fail. Transit moves all of that out of the application.

## What you will learn

- Encrypting and decrypting through the API
- Key versions, rotation and rewrap
- Data keys for large payloads
- Policies that separate encrypt from decrypt

## Basic use

```bash
vault secrets enable transit
vault write -f transit/keys/orders
PT=$(echo -n "4111 1111 1111 1111" | base64)
vault write transit/encrypt/orders plaintext="$PT"
vault write transit/decrypt/orders ciphertext="vault:v1:abc123example"
```

Plaintext is base64 encoded in and out. The result looks like `vault:v1:...`, where `v1` is the key version that encrypted it. Store the ciphertext in your database. The key never leaves Vault.

## Rotation and rewrap

```bash
vault write -f transit/keys/orders/rotate
vault write transit/rewrap/orders ciphertext="vault:v1:abc123example"
```

Rotating creates a new key version for new encryptions; older versions still decrypt. **Rewrap** converts old ciphertext to the latest version inside Vault without exposing plaintext, so you can retire old key versions with `min_decryption_version`.

```diagram
title: Encrypting a field with transit
node: app | Application | 0 | 1 | Sends plaintext, stores ciphertext. | Logging the plaintext defeats the point. | client
node: tr | Vault transit | 1 | 1 | Holds the key and does the cryptography. | Availability matters, since reads need decrypt. | security
node: db | Database | 2 | 0 | Contains only ciphertext. | A stolen dump alone is useless. | store
node: rot | Key rotation | 2 | 2 | New versions for new data; rewrap for old data. | Skipping rewrap leaves old keys in use. | process
node: pol | Separate policies | 1 | 0 | Services that write need encrypt only. | One policy for both widens exposure. | security
edge: app | tr
edge: tr | db
edge: tr | rot
edge: pol | tr
```

## Data keys

Sending large files to Vault is slow. Instead request a **data key** from `transit/datakey/plaintext/orders`: you get a plaintext key to encrypt locally and a wrapped copy to store beside the data. Discard the plaintext key after use. To decrypt, ask Vault to unwrap the stored copy.

## Policies

Give writers only the `update` capability on `transit/encrypt/orders` and the few services that must read the data `transit/decrypt/orders`. A service that cannot decrypt cannot be tricked into leaking plaintext.

## Incident: The dump that was only ciphertext

> **Incident:** A database backup was exposed.

```console
$ psql -c "select card from payments limit 2"
                      card
---------------------------------------------
 vault:v3:8SDd3WHDOjf7mq69CyCqY...
 vault:v3:Zk0mFQd3pT1xA2lU91nBc...
```

A misconfigured storage bucket exposed a database backup. Because card numbers were encrypted through transit, the backup contained only ciphertext, and the key was never in the dump. The incident was contained without notifying customers.

## Common mistakes

- Logging plaintext before encrypting
- One policy for encrypt and decrypt
- Never rotating keys
- Sending very large payloads through the API

```quiz
Q: What does transit return?
+ Ciphertext with a key version
- The key :: No.
- A certificate :: No.
- A lease only :: No.
> The result starts with vault:v1.

Q: What does rewrap do?
+ Moves ciphertext to the latest key without plaintext
- Deletes data :: No.
- Seals Vault :: No.
- Creates a policy :: No.
> It stays inside Vault.

Q: Why use data keys?
+ To encrypt large data locally
- To skip Vault :: No.
- To store passwords :: No.
- To create pods :: No.
> Vault wraps the key only.

Q: Why split encrypt and decrypt permissions?
+ A writer need not read data
- Decrypt is slow :: No.
- Encrypt is unsafe :: No.
- There is no reason :: No.
> Least privilege. The lesson section above explains why.
```

```cards
Transit :: A Vault engine that does cryptography without exposing keys
Rewrap :: Re-encrypting ciphertext with a newer key version inside Vault
Data key :: A key generated for local encryption and stored wrapped
Key version :: A numbered generation of a transit key
min_decryption_version :: The oldest key version still allowed to decrypt
```
