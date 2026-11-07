## What problem does Vault solve?
level: junior
It replaces secrets copied into files, variables and chat with one controlled system. Callers authenticate, policies decide what they can reach, and secrets come with short leases and an audit trail. Vault can also generate dynamic credentials, encrypt data and issue certificates.

## What does it mean that Vault is sealed?
level: junior
Vault stores everything encrypted and starts without the key needed to read it. Unsealing gives it the root key in memory, either by combining a threshold of Shamir key shares or by an external KMS or HSM in auto-unseal. A sealed Vault serves no requests.

## What is the difference between an auth method and a policy?
level: mid
An auth method proves who the caller is and issues a token. A policy decides what that token may do on which paths, and anything not allowed is denied. Good designs use identity based methods such as Kubernetes or cloud IAM, and narrow policies per application.

## Why prefer dynamic secrets to storing a database password in KV?
level: mid
A dynamic secret is created for each caller with a lease, and Vault deletes it when the lease expires or is revoked. A leak is short lived, every credential is traceable to a caller, and nobody holds a shared long-lived password. KV still holds passwords that live until someone rotates them.

## How do pods get secrets from Vault without storing a token?
level: senior
They log in with their Kubernetes service account token through the Kubernetes auth method, with a role bound to the exact service account and namespace. Then the Agent Injector or CSI provider writes secrets to a volume, or the Vault Secrets Operator syncs them into Kubernetes Secrets. Prefer files over Secrets if you want to keep secrets out of etcd.

## A token was committed to a public repository. What is your response?
level: senior
Look up the token by its accessor, revoke it and its children, and revoke leases by prefix to drop dynamic credentials. Read the audit log to see which paths it read, then rotate every static secret that it could read, and the downstream systems. Finish with a review: shorten TTLs, narrow the policy, and add secret scanning.
