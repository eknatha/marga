---
title: ConfigMaps and Secrets
minutes: 14
summary: Separate configuration from images with ConfigMaps and Secrets, choose between environment variables and mounted files, and handle secrets honestly.
---

One image should run unchanged in development, staging and production. What changes between them is configuration: database hostnames, feature flags, credentials. Kubernetes keeps that configuration in separate objects and injects it when the Pod starts.

## What you will learn

- ConfigMaps for non-sensitive settings
- Secrets for sensitive values, and their real limits
- Injecting as environment variables versus mounted files
- What happens when configuration changes

## ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: shop-config
  namespace: shop
data:
  LOG_LEVEL: info
  FEATURE_NEW_CHECKOUT: "true"
  app.properties: |
    cache.ttl=300
    region=eu-west
```

Values are strings, so booleans and numbers are quoted. Keys can hold single values or whole files.

## Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: shop-db
  namespace: shop
type: Opaque
stringData:
  username: app
  password: change-me
```

`stringData` accepts plain text and Kubernetes stores it Base64-encoded in `data`. 

> **Warning:** Base64 is an encoding, not encryption. Anyone who can read the Secret object can decode it with `base64 -d`. Real protection comes from three things: RBAC that limits who can read Secrets, encryption at rest for etcd, and ideally an external secret manager that syncs values in. Never commit Secret manifests containing real values to a shared repository.

## Using them in a Pod

```yaml
spec:
  containers:
    - name: api
      image: registry.example.com/shop-api:1.8.2
      env:
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: shop-config
              key: LOG_LEVEL
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: shop-db
              key: password
      volumeMounts:
        - name: config
          mountPath: /etc/shop
          readOnly: true
  volumes:
    - name: config
      configMap:
        name: shop-config
        items:
          - key: app.properties
            path: app.properties
```

| Method | Updates when the object changes? | Notes |
|--------|----------------------------------|-------|
| Environment variable | No, only at Pod start | Simple; values appear in process environment |
| Mounted volume | Yes, files refresh after a short delay | The application must re-read the file |

Mounted files are usually the better choice for secrets, because environment variables leak easily into crash dumps and debug output.

## Verifying what a Pod sees

```console
$ kubectl exec deploy/shop-api -n shop -- printenv LOG_LEVEL
info
$ kubectl exec deploy/shop-api -n shop -- cat /etc/shop/app.properties
cache.ttl=300
region=eu-west
$ kubectl get secret shop-db -n shop -o jsonpath='{.data.password}' | base64 -d
```

## Incident: changing the ConfigMap did nothing

> **Incident:** You change `LOG_LEVEL` from `info` to `debug` in the ConfigMap and apply it. The application keeps logging at `info`.

```console
$ kubectl get configmap shop-config -n shop -o jsonpath='{.data.LOG_LEVEL}'
debug
$ kubectl exec deploy/shop-api -n shop -- printenv LOG_LEVEL
info
```

The object is updated, but the running Pods still hold the old value. Environment variables are read once when the container starts. Restart the Pods to pick up the change:

```console
$ kubectl rollout restart deployment/shop-api -n shop
$ kubectl rollout status deployment/shop-api -n shop
```

For a durable approach, many teams include a hash of the config in the Pod template (Helm and Kustomize can do this), so any config change automatically triggers a rolling update and the change is recorded as a new revision you can roll back.

## Common mistakes

- Treating Base64 as secure
- Expecting environment variables to refresh without a restart
- Putting secrets in images, ConfigMaps or Deployment manifests
- Naming a key wrongly, which leaves the Pod stuck in `CreateContainerConfigError`

```quiz
Q: Is a Kubernetes Secret encrypted by default?
- Yes, with AES
+ No, values are only Base64-encoded unless encryption at rest and RBAC are configured
- Yes, but only in the default namespace
- Yes, if mounted as a volume
> Base64 is reversible by anyone who can read the object. Protection comes from RBAC, etcd encryption and external managers.

Q: You update a ConfigMap used through environment variables. When do running Pods see the change?
- Immediately
- After one minute
+ Only after the Pods are restarted
- Never, even after a restart
> Environment variables are set at container start.

Q: Which injection method can refresh while the Pod is running?
- Environment variables
+ A mounted ConfigMap or Secret volume
- Command-line arguments
- Image tags
> Mounted files are updated by the kubelet after a delay, though the app must re-read them.

Q: A Pod is stuck in CreateContainerConfigError. What should you check first?
- The node's disk
+ That the referenced ConfigMap or Secret and its keys exist
- The Ingress
- The image digest
> That status commonly means a referenced ConfigMap, Secret or key is missing.
```

```cards
ConfigMap vs Secret? :: ConfigMap holds non-sensitive settings; Secret holds sensitive values, still only Base64-encoded by default
Are env vars refreshed live? :: No, only when the container starts
Command to apply new config to env-based Pods? :: kubectl rollout restart deployment/NAME
Better way to deliver secrets than env vars? :: Mounted files with tight RBAC, or an external secret manager
```
