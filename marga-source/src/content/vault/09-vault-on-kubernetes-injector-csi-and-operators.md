---
title: Vault on Kubernetes: injector, CSI and operators
minutes: 13
summary: Get Vault secrets into pods using the Vault Agent Injector, the CSI provider and the Vault Secrets Operator, and compare them with External Secrets.
---

Kubernetes Secrets are only base64 encoded and are easy to over-share. Vault can supply secrets at runtime, with each pod proving its identity.

## What you will learn

- Kubernetes authentication
- The Agent Injector sidecar
- CSI provider and Vault Secrets Operator
- Choosing between the patterns

## Login

Enable the Kubernetes auth method and create a role that binds a service account and namespace to a policy. The pod presents its service account token, Vault asks the Kubernetes API to validate it, and returns a token with the role's policies.

```bash
vault auth enable kubernetes
vault write auth/kubernetes/role/orders \
  bound_service_account_names=orders \
  bound_service_account_namespaces=shop \
  policies=orders-read ttl=1h
```

## Agent Injector

Annotations on a pod tell a mutating webhook to add a Vault Agent sidecar and init container.

```yaml
metadata:
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "orders"
    vault.hashicorp.com/agent-inject-secret-db: "database/creds/orders-ro"
```

The agent logs in, fetches the secret, writes it to `/vault/secrets/db`, and renews it while the pod runs. The application only reads a file.

```diagram
title: Three ways to deliver secrets to a pod
node: pod | Pod with service account | 0 | 1 | Proves identity to Vault. | A shared service account weakens bindings. | client
node: inj | Agent Injector sidecar | 1 | 0 | Writes secrets to a shared volume and renews them. | Adds a sidecar to every pod. | process
node: csi | CSI provider | 1 | 1 | Mounts secrets as a volume at pod start. | Rotation needs the driver to remount. | process
node: vso | Vault Secrets Operator | 1 | 2 | Syncs secrets into Kubernetes Secrets. | The Secret lives in the cluster again. | process
node: vault | Vault | 2 | 1 | Validates the identity and returns secrets. | Unavailable Vault stops new pods. | security
edge: pod | inj
edge: pod | csi
edge: pod | vso
edge: inj | vault
edge: csi | vault
edge: vso | vault
```

## Operator and External Secrets

The **Vault Secrets Operator** watches resources such as `VaultStaticSecret` and `VaultDynamicSecret`, and writes the result into a Kubernetes Secret that pods consume the usual way. **External Secrets Operator** offers a similar model for many backends, including Vault and cloud managers.

## Choosing

Need a file and rotation without code changes: injector or CSI. Need a native Kubernetes Secret for an existing chart: operator. Remember that any secret copied into a Kubernetes Secret is only as safe as your cluster access control and etcd encryption.

## Incident: A pod that stayed Pending

> **Incident:** A new pod never started because the secret volume failed.

```console
$ kubectl describe pod orders-7f9c | tail -n 3
Warning  FailedMount  2m  kubelet  MountVolume.SetUp failed: permission denied
$ vault read auth/kubernetes/role/orders | grep bound_service_account_names
bound_service_account_names    [order]
```

The role was bound to a service account named order, but the pod used orders. The login was denied and the init container never finished. Correcting the binding fixed the Pending pod.

## Common mistakes

- Binding roles to every service account
- Copying all secrets into Kubernetes Secrets
- Skipping etcd encryption when you use synced Secrets
- Using one service account for many apps

```quiz
Q: What does the Agent Injector add to a pod?
+ A Vault Agent sidecar and init container
- A node :: No.
- A new CRD only :: No.
- A DNS record :: No.
> Annotations trigger the webhook.

Q: What does the Vault Secrets Operator create?
+ Kubernetes Secrets from Vault
- Pods :: No.
- Nodes :: No.
- Certificates only :: No.
> It syncs secrets. The lesson section above explains why.

Q: What proves a pod's identity?
+ Its service account token
- Its image name :: No.
- Its label :: No.
- Its IP :: No.
> Kubernetes auth validates the token.

Q: When might you prefer files over Secrets?
+ To keep secrets out of etcd
- To use more storage :: No.
- To avoid Vault :: No.
- To slow rotation :: No.
> Files from a sidecar stay out of etcd.
```

```cards
Agent Injector :: A webhook that adds a Vault Agent sidecar to pods
CSI provider :: A driver that mounts Vault secrets as a volume
Vault Secrets Operator :: An operator that syncs Vault secrets into Kubernetes
Service account :: A Kubernetes identity for pods
External Secrets :: An operator that syncs secrets from external stores
```
