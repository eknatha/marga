---
title: Identity, authentication and zero trust
minutes: 16
summary: Understand how sign-in, tokens and multi-factor authentication work, apply OAuth and OIDC safely, authenticate services with mutual TLS, and design with zero trust instead of a trusted network.
---

For years a company network was treated like a castle: strong walls outside, and anyone inside was trusted. Remote work, cloud services and stolen credentials broke that model. An attacker with one valid login on the inside could reach almost everything. Zero trust replaces "inside means safe" with a simple rule: verify every request, from every user and every service, every time, using identity.

## What you will learn

- The difference between authentication and authorization
- How tokens, OAuth and OIDC fit together
- Multi-factor authentication and phishing-resistant methods
- Service-to-service identity and mutual TLS
- The principles of zero trust and how to start

## Authentication and authorization

**Authentication** answers "who are you?". **Authorization** answers "what may you do?". Mixing them up causes many flaws: an application that checks the login but not the permission lets any signed-in user read any record by changing an ID in the URL.

## Tokens, OAuth and OIDC

Applications rarely handle passwords themselves. They rely on an identity provider and receive tokens.

| Term | Purpose | Example |
|------|---------|---------|
| OAuth 2.0 | Delegated authorization: let an app act on your behalf with limited scope | An app gets read-only access to your calendar |
| OpenID Connect (OIDC) | Authentication layer on top of OAuth: tells the app who the user is | "Sign in with your company account" |
| Access token | Short-lived proof of permission, sent with API calls | A signed JWT valid for 10 minutes |
| Refresh token | Longer-lived credential used to get new access tokens | Stored securely, rotated on use |

Good habits: keep access tokens short-lived, validate the signature, issuer, audience and expiry on every request, request the smallest scope, and never put tokens in URLs or logs.

```console
$ echo "$TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null | jq '{iss, aud, exp, scope}'
{
  "iss": "https://login.example.com",
  "aud": "orders-api",
  "exp": 1767225600,
  "scope": "orders:read"
}
```

A JWT is signed, not encrypted: anyone can read the payload, so never place secrets in it.

## Multi-factor authentication

A password alone is weak because it can be guessed, reused or phished. A second factor adds something you have or are. Not all factors are equal.

| Method | Strength | Weakness |
|--------|----------|----------|
| SMS code | Better than nothing | Can be intercepted or SIM swapped |
| Authenticator app code | Good | A fake site can capture and replay the code |
| Push approval | Convenient | Users may approve a prompt they did not start |
| Hardware key or passkey | Strongest | Needs enrolment and recovery planning |

Passkeys and hardware keys are bound to the real website address, so a look-alike phishing site cannot use them. Require them for administrators and for access to production.

```predict
Q: An attacker has stolen an employee's password. The company uses push approval as its second factor. The attacker logs in repeatedly at night. What attack is this, and what is a good defence?
???
Prompt bombing, also called MFA fatigue. Use number matching or phishing-resistant keys, and alert on repeated prompts.
> The attacker hopes a sleepy user taps Approve. Number matching forces the user to enter a code shown on the login screen, so a blind approval fails. Hardware keys and passkeys remove the prompt altogether.
```

## Service identity and mutual TLS

Services need identities too. With ordinary TLS only the client checks the server. With **mutual TLS** (mTLS) both sides present certificates, so a service can know exactly which caller it is talking to. A service mesh or a workload identity system such as SPIFFE can issue short-lived certificates automatically, so nobody manages keys by hand.

```diagram
title: Zero trust: every request is checked
node: user | User and device | 0 | 1 | Signs in with a phishing-resistant method from a managed device. | A stolen password with no second factor lets an attacker in. Device checks and keys reduce that.
node: proxy | Identity-aware proxy | 1 | 1 | Verifies who the user is, what device they use and which application they may reach, on every request. | If it is bypassed by a direct path to the app, all checks are skipped. Close the direct path.
node: app | Application | 2 | 1 | Checks permissions again for the specific action and data requested. | If it trusts the proxy blindly, one flaw in the proxy exposes everything. Authorize in the app too.
node: svc | Backend service | 3 | 1 | Accepts calls only from services that present a valid certificate (mTLS). | With plain network trust, any compromised host can call it.
node: policy | Policy and logs | 2 | 0 | Central rules decide access, and every decision is logged. | If logs are missing, you cannot investigate. If rules are loose, the model is zero trust in name only.
edge: user | proxy
edge: proxy | app
edge: app | svc
edge: policy | proxy
edge: policy | app
```

## Zero trust in practice

1. **Know your identities and devices.** Inventory users, services and the machines they use.
2. **Authenticate strongly and often.** Prefer phishing-resistant factors, short sessions and re-checks for sensitive actions.
3. **Grant least privilege, just in time.** Elevated access is requested, approved and expires.
4. **Segment the network** and treat the internal network as untrusted.
5. **Log and watch** every access decision.

Start with the highest-risk systems: administrator access and production. Moving everything at once is not realistic.

## Incident: the forgotten service account

> **Incident:** An audit finds a service account with administrator rights, a password that has never changed, and no owner. Its password appears in an old wiki page.

```console
$ aws iam list-users --query 'Users[].UserName' --output text
alice bob svc-backup-old
$ aws iam get-user --user-name svc-backup-old --query 'User.PasswordLastUsed'
"2023-02-11T09:41:00+00:00"
```

Disable it, check the logs for recent use, find what depended on it, and replace the dependency with a workload role that has narrow permissions and short-lived credentials. Add an owner and an expiry date to every service identity.

## Common mistakes

- Checking that a user is logged in, but not that they may access that record
- Long-lived tokens and tokens in URLs
- Trusting traffic because it comes from the internal network
- Shared accounts that make audit logs meaningless

```quiz
Q: What is the difference between OAuth 2.0 and OIDC?
- They are the same protocol
+ OAuth handles delegated authorization, and OIDC adds authentication so an app knows who the user is
- OIDC replaces TLS
- OAuth is only for passwords
> OIDC is a thin identity layer built on OAuth. It adds an ID token that describes the user.

Q: Why are hardware keys and passkeys resistant to phishing?
- They are longer than passwords
+ They are bound to the real site address, so a look-alike site cannot use them
- They never expire
- They need no device
> The key signs a challenge that includes the site identity. A fake domain gets nothing usable.

Q: What does mutual TLS add compared with normal TLS?
- Faster connections
+ The server also verifies the client certificate, so services know who is calling
- No certificates are needed
- It removes encryption
> Both sides authenticate. This gives strong identity between services.

Q: What is the core idea of zero trust?
- Trust every request from the internal network
+ Verify every request using identity and context, and do not trust a request just because of where it comes from
- Block all users
- Use one shared password
> Location is no longer proof of trust. Identity, device state and policy decide on each request.
```

```cards
Authentication vs authorization? :: Who you are, versus what you may do
Is a JWT encrypted? :: No, it is signed; anyone can read the payload
What is MFA fatigue? :: Spamming push prompts until the user approves; counter with number matching or hardware keys
What does mTLS do? :: Both client and server present certificates
Name two zero trust principles :: Verify explicitly on every request, and grant least privilege just in time
```
