---
title: Workload identity federation and OIDC trust
minutes: 12
summary: Let CI systems and clusters call the cloud without stored keys by trusting signed tokens from an identity provider, and write tight trust conditions.
---

Long-lived access keys in CI systems are a top cause of cloud breaches. OpenID Connect federation removes them: the platform proves a job's identity and the cloud issues credentials that last minutes.

## What you will learn

- How OIDC token exchange works
- Claims that matter: issuer, audience and subject
- Writing a narrow trust policy
- Debugging a failed exchange

## The flow

1. The job requests an ID token from its platform, with an audience such as `sts.amazonaws.com`.
2. The token is a signed JWT with claims about the issuer, subject, repository, branch and more.
3. The cloud checks the signature with the issuer's public keys and compares the claims with the trust policy.
4. If they match, it returns temporary credentials.

## A narrow trust policy

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.example.com"},
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.example.com:aud": "sts.amazonaws.com",
        "token.actions.example.com:sub": "repo:acme/shop:ref:refs/heads/main"
      }
    }
  }]
}
```

Always check **audience** and **subject**. Use exact `StringEquals` where you can. A wildcard on the subject, such as `repo:acme/*`, lets every repository assume the role.

## Inspect and debug

```bash
# decode a token payload (never share tokens)
echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq '{iss,aud,sub}'
aws sts get-caller-identity
```

Common failures are a wrong audience, a subject that differs from the policy because of the environment or branch name, an issuer certificate change or a clock difference. Compare the token's claims with the policy line by line.

## Operate

Give each pipeline a separate role with minimal permissions, log every assumed role session and alert on use from unexpected subjects.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Workload identity federation and OIDC trust fits together
node: n1 | The flow | 0 | 0 | The job requests an ID token from its platform, with an audience such as sts.amazonaws.com. | Wildcard subjects in trust policies. | process
node: n2 | A narrow trust policy | 1 | 1 | Always check audience and subject. Use exact StringEquals where you can. | Not checking the audience. | security
node: n3 | Inspect and debug | 2 | 0 | Common failures are a wrong audience, a subject that differs from the policy because of the environment or branch name, an issuer certificate change or a clock... | Check the Common mistakes list below this diagram for what usually goes wrong here. | observe
node: n4 | Operate | 3 | 1 | Give each pipeline a separate role with minimal permissions, log every assumed role session and alert on use from unexpected subjects. | One role for all pipelines. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Any repository could deploy

> **Incident:** A trust policy used a wildcard subject.

```console
Condition: sub StringLike repo:acme/*
AssumeRoleWithWebIdentity by repo:acme/playground
role assumed: prod-deploy
```

A test repository could assume the production deploy role because the subject condition matched the whole organization. The team narrowed the condition to one repository and branch, split roles by environment and added alerts for new subjects.

## Common mistakes

- Wildcard subjects in trust policies
- Not checking the audience
- One role for all pipelines
- Keeping a stored key as a fallback

```quiz
Q: What does the subject claim identify?
+ The workload, such as repo and branch
- The region :: No.
- The password :: No.
- The VPC :: No.
> It is who the token is for.

Q: Why check audience?
+ To ensure the token was meant for this cloud
- To compress it :: No.
- To rename roles :: No.
- To save time :: No.
> Prevents token reuse.

Q: What is wrong with repo:acme/* as a condition?
+ Every repository matches
- It is too strict :: No.
- It is invalid :: No.
- It is encrypted :: No.
> Too broad. The lesson section above explains why.

Q: What do federated credentials last?
+ A short time
- Years :: No.
- Forever :: No.
- Until revoked manually :: No.
> Temporary credentials expire.
```

```cards
OIDC :: OpenID Connect, identity layer on OAuth
JWT :: Signed token with claims
Subject claim :: Claim naming the workload identity
AssumeRoleWithWebIdentity :: AWS call that exchanges a token
```
