## A role that is not read only
level: mid
A role named viewer is used widely.

```text
$ kubectl get clusterrole viewer -o yaml | grep -A6 rules
rules:
- apiGroups: [""]
  resources: ["secrets","pods/exec"]
  verbs: ["get","list","create"]
```
? What is wrong with this role?
+ It can read secrets and exec into pods, which is far from read only
- Nothing, because the name says viewer
- It lacks the delete verb
- It is too short
why: Rules decide power, not names. Reading secrets and exec access let a holder act as other workloads and steal credentials.

## Token in a pod that does not need it
level: junior
A static web pod mounts a service account token.

```text
$ kubectl get pod web-1 -o yaml | grep -c serviceAccountToken
1
$ kubectl auth can-i --list --as=system:serviceaccount:prod:default | head -3
list pods [] []
```
? What is the best fix?
+ Set automountServiceAccountToken to false and use a dedicated minimal service account
- Leave it because it is read only
- Share the token with other pods
- Delete the namespace
why: If a pod does not call the API, it should not carry a token. A compromised container could use it.

## Privileged pod in production
level: mid
A pod was admitted with host access.

```text
$ kubectl get pod debug -o jsonpath="{.spec.containers[0].securityContext}"
{"privileged":true}
$ kubectl get ns prod --show-labels
NAME STATUS LABELS
prod Active kubernetes.io/metadata.name=prod
```
? What control was missing and what is the fix?
+ No Pod Security labels, so add enforce restricted and fix workloads using warn first
- A larger node
- A longer pod name
- A different CNI
why: Pod Security admission acts only on labelled namespaces. Roll out with warn and audit first and then enforce.

## Secrets readable in etcd
level: mid
An auditor reads a secret directly in etcd.

```text
$ etcdctl get /registry/secrets/prod/db | strings | head -3
k8s
v1
db-password=hunter2
```
? What do you do?
+ Enable encryption at rest, rewrite all secrets, verify the stored value and rotate the password
- Nothing, because base64 hides it
- Rename the secret
- Make the pod read only
why: Without encryption configuration, Secrets are stored readable. Enable encryption, rewrite existing secrets, then check the raw value.

## Anonymous access
level: senior
A scan reports open requests to the API.

```text
$ curl -sk https://10.0.0.10:6443/api/v1/namespaces
{"kind":"NamespaceList","items":[{"metadata":{"name":"default"}}]}
$ ps -ef | grep kube-apiserver | grep -o "anonymous-auth=[a-z]*"
anonymous-auth=true
```
? What should you do?
+ Turn off anonymous auth where possible, review RBAC for system:anonymous and check the audit log
- Block the port with a note
- Ignore it because it only lists names
- Reboot the node
why: Anonymous requests that are authorized are an unneeded exposure. Disable it or remove its bindings, and review who accessed what.
