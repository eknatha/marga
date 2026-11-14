## Image deployed by tag
level: junior
A deployment uses a mutable tag.

```text
$ kubectl get deploy api -o jsonpath="{.spec.template.spec.containers[0].image}"
registry.example/api:latest
```
? What is the risk and fix?
+ The tag can change under you; deploy by digest and verify a signature
- No risk
- Use a shorter tag
why: A digest identifies exact content and a signature proves who built it.

## Critical CVE found
level: mid
A scanner reports a critical issue in a base image.

```text
$ trivy image registry.example/api:1.4 --severity CRITICAL
libssl3 CRITICAL fixed in 3.0.15
```
? What do you do?
+ Rebuild on a patched base, redeploy and track the fix with an owner and date
- Ignore it
- Disable the scanner
why: Scanning only helps when findings lead to a rebuild and a deadline.

## Unsigned image admitted
level: mid
An image without a signature runs in production.

```text
$ kubectl get cpol verify-images -o jsonpath="{.spec.validationFailureAction}"
Audit
```
? Why did it run?
+ The policy only audits; enforce it after checking exceptions
- Signatures are optional
- The cluster is old
why: Audit mode records but does not block.

## Shell in a container
level: mid
Falco alerts about a shell in the payments pod.

```text
$ falco -r rules.yaml
Warning Terminal shell in container (user=root container=payments)
```
? What is your first step?
+ Treat it as suspicious: check who exec ed, contain the pod and review audit logs
- Restart Falco
- Ignore it as normal
why: A shell in a production container is rare and deserves a quick look.

## Seccomp profile missing
level: junior
Pods run unconfined.

```text
$ kubectl get pod web -o jsonpath="{.spec.securityContext.seccompProfile}"

```
? What should you set?
+ seccompProfile type RuntimeDefault
- Nothing
- Privileged true
why: The default profile blocks many dangerous syscalls at low cost.

## Sensitive tenant on shared nodes
level: senior
Untrusted code runs next to payment pods.

```text
$ kubectl get runtimeclass
NAME   HANDLER
runc   runc
```
? What is a stronger isolation option?
+ A sandboxed RuntimeClass such as gVisor or Kata for untrusted workloads
- More replicas
- A bigger node
why: A separate kernel boundary limits the impact of an escape.
