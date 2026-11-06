---
title: Jenkins: credentials, security and hardening
minutes: 14
summary: Store secrets safely, limit who can do what, keep build code away from the controller and harden a Jenkins server.
---

A CI server can read your code, push to your registry and often deploy to production. That makes it one of the most valuable targets in a company. Hardening Jenkins is mostly a short list of habits applied every time.

## What you will learn

- How the credentials store scopes and masks secrets
- Authentication and role-based access
- Keeping build code away from the controller
- Patching, plugins and an audit trail

## Credentials

Store secrets in the credentials store, give each a clear ID and bind them only where needed with `withCredentials`. Jenkins masks the exact value in logs, but masking does not catch a modified copy, so never print secrets at all.

```groovy
withCredentials([string(credentialsId: 'registry-token', variable: 'TOKEN')]) {
  sh 'echo "$TOKEN" | docker login registry.example.com -u ci --password-stdin'
}
```

Prefer short-lived credentials (a cloud role or a vault lease) over a long-lived key, and use folder-scoped credentials so a team can only see its own.

## Who can do what

Turn on a security realm (your company SSO) and an authorization strategy such as role-based access: viewers, developers who build, admins who configure. Disable anonymous read. Admin rights should be rare and logged.

```diagram
title: Layers of Jenkins security
node: user | Person | 0 | 0 | Signs in through single sign-on. | Local accounts with shared passwords have no owner.
node: authz | Authorization | 1 | 0 | Role-based rules decide who can view, build or configure. | Everyone as admin means every job can read every secret. | security
node: job | Job and library | 2 | 0 | Pipeline code runs in a sandbox with script approval. | Approving scripts without reading them removes the sandbox. | service
node: agent | Agent | 3 | 0 | Runs the build away from the controller. | Builds on the controller can read the secrets directory.
node: audit | Audit and patching | 2 | 1 | Logs who changed what; core and plugins are updated promptly. | Old plugins are the most common entry point. | observe
edge: user | authz
edge: authz | job
edge: job | agent
edge: authz | audit
```

## Hardening list

Run builds only on agents. Restrict what a pipeline can do with the script sandbox, and review every script approval. Limit agent-to-controller access. Use HTTPS and keep the controller off the public internet if possible. Update the core and plugins on a schedule and remove plugins you do not use, because every plugin adds code that runs with Jenkins' power. Back up `JENKINS_HOME` and test a restore.

## Incident: The secret in the build log

> **Incident:** A debugging line printed an encoded copy of a registry token and masking did not recognise it.

```console
+ echo cmVnaXN0cnktdG9rZW4=
Finished: SUCCESS
audit: registry login from unknown address 203.0.113.50
```

Anyone who could read the job log could decode the token. The team rotated it, switched to short-lived registry tokens issued per build and added a scan that fails a build whose log contains common secret patterns.

## Common mistakes

- Printing environment variables while debugging
- Giving all developers admin rights
- Leaving old plugins installed and unpatched
- Allowing builds on the controller

```quiz
Q: Why does masking not make printing a secret safe?
+ A modified copy such as base64 is not masked
- Masking is only for passwords :: No.
- Logs are encrypted :: No.
- Masking deletes the log :: No.
> Only the exact value is masked.

Q: Which credential type is safer?
+ Short-lived and scoped
- Long-lived and shared :: No.
- Written in the Jenkinsfile :: No.
- Shared by email :: No.
> Short-lived tokens limit the damage of a leak.

Q: Why keep builds off the controller?
+ Build code could read the controller's secrets and files
- Agents are faster :: No.
- The controller has no CPU :: No.
- To reduce plugin count :: No.
> The controller holds all credentials.

Q: What is a common cause of Jenkins compromise?
+ Outdated plugins and core
- Too many agents :: No.
- Using HTTPS :: No.
- Using labels :: No.
> Patch promptly and remove unused plugins.
```

```cards
Credentials store :: The encrypted place Jenkins keeps secrets
withCredentials :: A step that exposes a secret to a block of steps
Role-based access :: Permissions given by role instead of per person
Script approval :: A review step for code outside the sandbox
Short-lived credential :: A secret that expires quickly
```
