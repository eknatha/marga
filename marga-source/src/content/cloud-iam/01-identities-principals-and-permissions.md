---
title: Identities, principals and permissions
minutes: 11
summary: Learn the vocabulary of cloud access: who is asking, what they may do, on which resource, and how a decision is made.
---

Every cloud action is a request: someone or something asks to do an action on a resource. The cloud checks identity, then permissions, then conditions, and answers allow or deny. Almost every security problem in the cloud is a mistake in that chain: the wrong identity, too many permissions, or a condition nobody checked. This lesson gives you the vocabulary before the provider-specific lessons.

## What you will learn

- Separate authentication from authorization
- Name the parts of an access decision
- Tell human identities from workload identities
- Spot the most common identity mistakes

## Authentication and authorization

**Authentication** answers "who are you?" with a password, a hardware key, a token or a certificate. **Authorization** answers "what may you do?" by comparing the request with policies. A system can authenticate you correctly and still wrongly authorize you, and the second mistake is the common one. Multi-factor authentication protects the first step; least privilege protects the second.

## The parts of a decision

Think of four fields. The **principal** is who asks (a person, a service, a pipeline). The **action** is what they want (read an object, start a server). The **resource** is the thing acted on (one bucket, one subscription). The **conditions** narrow it further (only from this network, only today, only with MFA). A policy is a statement that allows or denies a combination of these. Most clouds start from deny by default: with no matching allow, the answer is no. An explicit deny beats any allow.

## Humans and workloads

People sign in through a central identity provider, ideally with single sign-on and MFA, and receive short-lived sessions. Workloads such as a virtual machine, a function or a Kubernetes pod need identities too. The safe pattern is an identity that the platform attaches to the workload, which gives it temporary credentials automatically. The unsafe pattern is a long-lived access key copied into a configuration file or a repository, where it is leaked, shared and never rotated.

## Common mistakes

Using the root or owner account for daily work; creating one shared login for a team; giving administrator rights "just to get it working"; leaving keys with no expiry; and never removing access when someone changes team. Treat identities like inventory: know who has what, why, and when it ends.

```predict
Q: A pipeline needs to upload files to one storage bucket. Which identity is the best choice?
???
A dedicated workload identity with short-lived credentials and permission only to write to that one bucket.
> Specific principal, specific action, specific resource.
```

## Incident: The key in the repository

> **Incident:** A test key for a deploy pipeline was committed to a repository and found by a scanner three days later.

```console
$ git log --oneline -1 -- deploy/.env
3f9a1c2 add deploy env
$ aws iam list-access-keys --user-name ci-deploy
AccessKeyId: AKIA...EXAMPLE  Status: Active  CreateDate: 2024-03-02
```

The key belonged to a user with broad permissions and no expiry. The team deactivated it, reviewed the audit log for use from unknown addresses, replaced it with a role that the pipeline assumes for short sessions, and added secret scanning before every commit lands.

## Common mistakes

- Using the root account for daily work
- Sharing one login between people
- Long-lived keys in code or files
- Skipping MFA for administrators

```quiz
Q: What does authorization decide?
+ What an identity may do
- Who the person is :: That is authentication.
- Where servers run :: No.
- How fast a network is :: No.
> Allow or deny a request. Re-read the matching lesson section for the full reasoning.

Q: What happens when no policy allows an action?
+ It is denied by default
- It is allowed :: Unsafe default.
- It is logged only :: It is still denied.
- It asks the user :: No.
> Default deny. Re-read the matching lesson section for the full reasoning.

Q: Which is safer for a workload?
+ An identity the platform attaches with temporary credentials
- A shared password :: Weak.
- A key in a file :: Leaks.
- The root login :: Far too broad.
> No static secrets. Re-read the matching lesson section for the full reasoning.

Q: What beats an allow?
+ An explicit deny
- A second allow :: No.
- A comment :: No.
- A tag :: No.
> Deny wins. Re-read the matching lesson section for the full reasoning.
```

```cards
Authentication :: who are you
Authorization :: what may you do
Principal :: who asks
Action and resource :: what and on what
Default deny :: no allow means no
Workload identity :: platform-issued temporary credentials
```
