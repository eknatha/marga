---
title: Investigating security alerts and failed controls
minutes: 16
summary: Triage an alert, preserve evidence, trace a suspicious action through audit logs and contain it, and debug security controls that block legitimate work.
---

Security debugging has two sides. One is investigating something suspicious: was that login or API call really an attack? The other is debugging a control that works too well: a policy that blocks a valid deploy. In both, you follow evidence in logs, keep your own actions from destroying it, and change as little as possible.

## What you will learn

- Triaging an alert: true positive, false positive or unknown
- Preserving evidence before containment
- Tracing an action through audit and access logs
- Debugging failed admission, policy, TLS and permission checks
- Containment steps that are reversible

## Triage questions

1. What exactly fired, and what data did the rule use?
2. Who, from where, to what, and when? (identity, source address, resource, time)
3. Is this normal for that identity? Compare with the last 30 days.
4. What is the worst case if this is real, and how fast can it spread?

## Trace the action

```bash
# Who used this access key, and what did it do?
aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIAEXAMPLE --max-results 20
# Failed logins from one address
grep "Failed password" /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -rn | head
# Kubernetes audit: who deleted this?
jq 'select(.verb=="delete" and .objectRef.name=="payments")' audit.log
```

Build a timeline: first sign, what the actor touched, and the last sign. Check for persistence such as new users, keys, scheduled jobs and changed policies.

## Preserve, then contain

Containment should be reversible and should not destroy evidence. Prefer isolating a host with a restrictive security group to powering it off, disable a key rather than delete it, snapshot disks before cleaning, and copy logs to a separate store. Rotate any credential that might have been exposed.

## Debugging a control that blocks good work

| Symptom | Where to look |
|---------|---------------|
| Deploy rejected by admission policy | The denial message names the rule; test with a dry run |
| Image blocked by signature check | Was it signed by the expected identity? Is the policy up to date? |
| Scanner fails the build | Read the finding, check the fixed version, add a documented exception with an expiry |
| mTLS or certificate errors | Expiry, name, trust chain, clock skew |
| Permission denied after hardening | Audit log shows the denied call; add the narrowest allow |

```console
$ kubectl apply -f deploy.yaml --dry-run=server
Error from server: admission webhook "policy.example.com" denied the request: containers must not run as root
```

The message states the rule and the fix: set `runAsNonRoot: true`. Do not remove the policy to get past it.

```predict
Q: You find an exposed access key in a public repository. In which order do you act?
???
Disable the key, review its activity in the audit log, rotate and replace it, then remove it from the code and history.
> Disabling stops further use immediately. The audit trail tells you what was done. Deleting history alone does not help because the key was already copied.
```

```diagram
title: Security investigation flow
node: alert | Alert or report | 0 | 1 | A detection rule or a person raises a suspicion. | Ignoring low alerts that repeat lets real attacks blend in.
node: triage | Triage | 1 | 0 | Decide true, false or unknown using identity, source and history. | Calling it false without checking baselines.
node: evid | Preserve evidence | 1 | 2 | Snapshot disks, copy logs, record the timeline. | Wiping a host first destroys what you need.
node: contain | Contain | 2 | 1 | Disable keys, isolate hosts, block addresses, reversibly. | Deleting resources removes both evidence and the ability to undo.
node: recover | Eradicate and recover | 3 | 1 | Remove persistence, rotate secrets, restore from known-good. | Restoring while the attacker's access remains.
edge: alert | triage
edge: triage | evid
edge: triage | contain
edge: evid | contain
edge: contain | recover
```

## Incident: the build that was blocked, and the one that was not

> **Incident:** A new policy blocks all deployments from one team, and the same week a leaked token is used from an unknown address.

```console
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=Username,AttributeValue=ci-deploy --max-results 3
ConsoleLogin? no   SourceIPAddress: 198.51.100.77   EventName: ListSecrets   09:41
```

The block was a signature rule that expected the old build identity, a configuration fix. The leaked token was real: it came from a build log that printed environment variables. The team disabled and rotated the token, reviewed its activity, masked secrets in logs, and moved to short-lived credentials from workload identity.

## Common mistakes

- Powering off or reimaging a host before taking evidence
- Deleting a credential instead of disabling it first
- Removing a control to unblock a team
- Closing an alert without checking a baseline

```quiz
Q: What should you do first when you find a leaked access key?
- Wait for the weekly review :: Every hour gives the attacker time.
+ Disable it and review its recent activity in the audit log
- Delete the repository :: The key is already copied.
- Post it in chat :: That spreads the secret.
> Disabling is quick and reversible; the audit trail shows the damage.

Q: Why preserve evidence before cleaning a compromised host?
- To waste time :: Evidence supports understanding and recovery.
+ So you can learn what the actor did and find persistence
- Because logs are slow :: Not a reason.
- To avoid backups :: Backups are separate.
> Snapshots and log copies show scope, which guides recovery.

Q: A policy denies a deployment with "must not run as root". What is the right fix?
- Remove the policy :: It removes protection for everyone.
+ Change the workload to run as a non-root user
- Disable the cluster :: Disproportionate.
- Ignore the message :: The deployment stays blocked.
> The denial states the rule; fix the workload.

Q: Which containment action is usually preferred first?
- Delete all resources :: Destroys evidence and cannot be undone.
+ Isolate the host with a restrictive network rule
- Turn off logging :: Removes visibility.
- Email the attacker :: Not a security measure.
> Isolation limits damage while keeping the system available for analysis.
```

```cards
Triage questions? :: Who, from where, to what, when, and is it normal
Contain how? :: Reversibly: isolate, disable, snapshot
Why disable before deleting a key? :: Reversible and keeps the audit trail
What to do about a policy that blocks a deploy? :: Fix the workload, or add a documented, expiring exception
Why short-lived credentials? :: A leaked one expires quickly
```
