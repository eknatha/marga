---
title: Starting Vault: seal, unseal and storage
minutes: 12
summary: Learn how Vault encrypts its storage, why it starts sealed, how Shamir key shares and auto-unseal work, and which storage backend to choose.
---

A running Vault has two states that matter: sealed and unsealed. Understanding them explains most startup problems and most security design.

## What you will learn

- The encryption barrier and the seal
- Shamir shares and auto-unseal
- Choosing a storage backend
- Initialising and protecting the root token

## The barrier and the seal

Vault writes data to storage through an **encryption barrier**. Everything past the barrier is encrypted with a data encryption key. That key is encrypted by the root key, and the root key is protected by the **seal**. When Vault is sealed it knows where its data is but cannot decrypt it. Unsealing gives it the root key in memory.

## Unsealing

By default, initialisation splits the root key into key shares with Shamir's algorithm. A threshold of shares, for example 3 of 5, is needed to unseal. Give shares to different people.

```bash
vault operator init -key-shares=5 -key-threshold=3
vault operator unseal
vault status
```

**Auto-unseal** delegates this to a trusted external system: a cloud KMS, an HSM, or another Vault's transit engine. Vault unseals itself at start without a person. With auto-unseal you receive recovery keys, which are used for sensitive operations rather than unsealing.

```diagram
title: How Vault unseals
node: disk | Encrypted storage | 0 | 1 | Holds all data encrypted by the barrier. | Stolen storage alone is unreadable. | store
node: root | Root key | 1 | 0 | Protects the data key; kept only in memory when unsealed. | Never written to disk in clear. | security
node: shares | Shamir key shares | 2 | 1 | A threshold of shares rebuilds the root key. | Lost shares below threshold mean a permanent seal. | security
node: kms | Cloud KMS or HSM | 2 | 0 | Auto-unseal: the external key wraps the root key. | If the KMS is unreachable after a restart Vault stays sealed. | external
node: vault | Unsealed Vault | 3 | 1 | Serves requests with the keys in memory. | A memory dump of an unsealed node exposes keys. | service
edge: disk | root
edge: shares | root
edge: kms | root
edge: root | vault
```

## Storage backends

**Integrated storage (Raft)** keeps data on each node's disk and replicates among nodes. It needs no extra system and is the recommended choice. Older setups used Consul. Cloud backends exist but give fewer features. Use fast local disks, and back up with Raft snapshots.

## Initial setup

`vault operator init` prints the first root token once. Use it only to configure authentication and policies, then revoke it. Day-to-day work should use named identities. Dev mode (`vault server -dev`) is in memory, auto-unsealed, with a known token: great for learning, never for real secrets.

## Incident: Sealed all night

> **Incident:** A node restart left Vault unreachable until morning.

```console
$ vault status
Key                Value
Seal Type          shamir
Initialized        true
Sealed             true
Unseal Progress    1/3
```

After a kernel patch rebooted the nodes, Vault started sealed. Only one of the five key holders was reachable. The team configured auto-unseal with a cloud KMS key and tested a restart during working hours.

## Common mistakes

- Running dev mode anywhere real
- Giving all key shares to one person
- Leaving the initial root token active
- Not testing a restart

```quiz
Q: Why does Vault start sealed?
+ It cannot decrypt its data without the root key
- It is broken :: No.
- The disk is full :: No.
- DNS is down :: No.
> The seal protects the key.

Q: What does auto-unseal use?
+ A KMS or HSM
- A password in Git :: No.
- A cron job :: No.
- A spreadsheet :: No.
> An external system unwraps the key.

Q: Which backend is recommended?
+ Integrated storage (Raft)
- A text file :: No.
- A shared drive :: No.
- An S3 bucket only :: No.
> Raft needs no extra system.

Q: What should happen to the initial root token?
+ Be revoked after setup
- Be shared widely :: No.
- Be put in the repo :: No.
- Be used daily :: No.
> Named identities replace it.
```

```cards
Seal :: The state where Vault cannot read its data
Shamir shares :: Pieces of the root key, some of which are needed to unseal
Auto-unseal :: Letting an external system unseal Vault at startup
Barrier :: The encryption layer between Vault and storage
Raft :: The consensus algorithm behind integrated storage
```
