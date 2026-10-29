---
title: Debugging access denied and cloud security incidents
minutes: 14
summary: Work out why a request was denied, fix it without over-granting, and respond in order to a suspected credential leak.
---

Two situations test everything in this skill. In the first, a legitimate request fails with "access denied" and you need the narrowest fix. In the second, a credential has leaked and you need to contain damage quickly. Both reward a calm, ordered method.

## What you will learn

- Read an access-denied error
- Walk the evaluation chain
- Choose a narrow fix
- Respond to a leaked credential in order

## Read the error

A good error names the principal, the action and the resource: "User arn:...:role/build is not authorized to perform s3:PutObject on arn:aws:s3:::reports-prod/x". That is already the answer to three questions. Check that the principal is the one you expect, because many failures are caused by running as a different role than intended.

## Walk the chain

Check in order: is the right identity in use; does an identity policy allow the action on this resource; does a resource policy allow or deny it; does a boundary, organisation policy or deny statement restrict it; do conditions (network, MFA, tags, time) hold; and for data in storage or keys, does the key policy allow use. Policy simulators and the access analysis tools show which statement decided. Audit logs show the denied call with its error.

## Fix narrowly

Add the specific action and resource, not a wildcard. If the cause is a missing condition such as the request not coming through the private endpoint, fix the path rather than removing the condition. Record why the access is needed.

## Suspected credential leak

Act in this order: **contain** (deactivate the key or revoke the session, do not delete it yet); **assess** (audit logs for use of that credential, new users or keys, new resources, changed policies, copies of data); **eradicate** (remove attacker-created access, rotate related secrets); **recover** (replace with a role or short-lived credential); **learn** (how did it leak, what detection would have caught it sooner). Tell the right people early.

```predict
Q: A leaked key shows calls from an unknown address creating servers. What is your first action?
???
Deactivate the key or revoke the session immediately, then review its activity and remove what it created.
> Contain first.
```

## Incident: Crypto servers in six regions

> **Incident:** A cloud bill spiked because someone launched large servers in regions the team never used.

```console
$ aws cloudtrail lookup-events --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=AKIA...EXAMPLE --max-results 3
RunInstances us-east-2  203.0.113.77
RunInstances ap-south-1 203.0.113.77
CreateAccessKey  203.0.113.77
```

The key had been exposed in a public repository. The team disabled it, terminated the servers, deleted the attacker-created key, checked for changed policies, enabled organisation guardrails that deny unused regions, and moved the application to roles.

## Common mistakes

- Deleting evidence before capturing it
- Fixing access errors with wildcards
- Rotating one secret while others stay exposed
- No guardrail against unused regions

```quiz
Q: What does a good access error name?
+ Principal, action and resource
- Only the time :: Not enough.
- Only the region :: Not enough.
- Only the colour :: No.
> Start there. Re-read the matching lesson section for the full reasoning.

Q: What is the first step for a leaked key?
+ Contain it by deactivating or revoking
- Write a blog post :: No.
- Wait :: Dangerous.
- Delete the logs :: Destroys evidence.
> Stop the damage. Re-read the matching lesson section for the full reasoning.

Q: Which fix is best for a missing permission?
+ Add the specific action on the specific resource
- Grant *:* :: Over-grants.
- Disable MFA :: Unsafe.
- Use root :: Unsafe.
> Narrow. Re-read the matching lesson section for the full reasoning.

Q: What shows which statement decided a request?
+ A policy simulator or access analysis
- A guess :: Unreliable.
- The bill :: No.
- The logo :: No.
> Use the tools. Re-read the matching lesson section for the full reasoning.
```

```cards
Error :: names principal, action, resource
Chain :: identity, resource policy, boundary, deny, condition, key
Simulator :: shows the deciding statement
Narrow fix :: one action, one resource
Contain :: deactivate first
Then :: assess, eradicate, recover, learn
```
