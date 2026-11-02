## Success but pods crash
level: junior
Helm reports Happy Helming while pods restart.
```text
$ helm upgrade shop-web ./chart -f values-prod.yaml
Release "shop-web" has been upgraded. Happy Helming!
$ kubectl get pods -n shop
shop-web-6c9d7b8f4-hq2lm   0/1   CrashLoopBackOff   5   4m
```
? What flags make the pipeline notice?
+ --wait with --atomic and a timeout
- --debug only
- --dry-run
- --keep-history
why: Without wait Helm returns when the manifests are accepted. Check the evidence in the output before you act, then confirm the fix with a test or a rerun.

## Which value wins
level: junior
You pass -f base.yaml -f prod.yaml and --set replicaCount=3.
```text
$ helm upgrade rel ./chart -f base.yaml -f prod.yaml --set replicaCount=3
# base.yaml:  replicaCount: 2
# prod.yaml:  replicaCount: 4
```
? Which value is used for replicaCount?
+ The --set value
- The base.yaml value
- The chart default
- The first file
why: The order is defaults, files in order, then --set. Check the evidence in the output before you act, then confirm the fix with a test or a rerun.

## List override
level: mid
You override one entry of a list in values and lose the others.
```text
# chart default
ingress:
  hosts: [a.example.com, b.example.com]
# your file
ingress:
  hosts: [c.example.com]
```
? Why?
+ Lists are replaced as a whole, not merged
- Helm sorts lists
- YAML ignores lists
- Values are cached
why: Provide the entire list. Check the evidence in the output before you act, then confirm the fix with a test or a rerun.

## Render only
level: junior
You need to see the YAML without touching a cluster.
```text
$ helm template shop-web ./chart -f values-prod.yaml | head -4
---
# Source: shop-web/templates/service.yaml
apiVersion: v1
kind: Service
```
? Which command?
+ helm template
- helm status
- helm history
- helm rollback
why: template renders locally and is good for CI checks. Check the evidence in the output before you act, then confirm the fix with a test or a rerun.

## Stuck release
level: senior
A deploy says another operation is in progress after a job was killed.

```text
$ helm history rel -n shop
9 pending-upgrade
```
? What is the safest first fix?
+ Roll back to the last deployed revision
- Delete the namespace
- Delete all pods
- Reinstall the cluster
why: A rollback resets the state. Delete the stuck revision Secret only as a last resort.

## Secret in values
level: mid
A password is in values-prod.yaml.
```text
# values-prod.yaml
db:
  host: pg.internal
  password: Sup3rS3cret!
```
? What do you do first?
+ Rotate the password and switch the chart to reference an existing Secret
- Delete the line only
- Base64 encode it
- Make the repository private
why: The value remains in history and release records. Check the evidence in the output before you act, then confirm the fix with a test or a rerun.

## Nindent error
level: mid
An install fails with a YAML error after resources:.
```text
Error: YAML parse error on shop-web/templates/deployment.yaml: error converting YAML to JSON: yaml: line 31: did not find expected key
```
? What is the usual cause?
+ The nindent number does not match the key column
- The cluster is old
- The image is large
- Helm version is too new
why: Indent must equal the destination column. Check the evidence in the output before you act, then confirm the fix with a test or a rerun.

## Chart version
level: junior
You changed a template but not Chart.yaml.
```text
$ git diff --stat
 templates/deployment.yaml | 6 +++---
 Chart.yaml is unchanged (version: 1.2.0)
```
? What should you do before publishing?
+ Increase the chart version
- Reuse the same version
- Delete the repository
- Change appVersion only
why: Published chart versions are immutable. Check the evidence in the output before you act, then confirm the fix with a test or a rerun.
