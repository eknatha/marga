---
title: Application security for DevOps engineers
minutes: 16
summary: Recognise the most common web and API weaknesses, understand how input validation, headers and rate limits stop them, and review code and configuration for risky patterns.
---

Infrastructure can be perfect and the application can still be the way in. Most breaches of internet-facing systems use a small set of well-known mistakes: unchecked input, broken access control, weak session handling and unsafe use of third-party code. DevOps engineers do not need to be penetration testers, but they run the pipelines, gateways and configuration that decide whether those mistakes get caught.

## What you will learn

- The categories in the OWASP Top 10 that matter most in operations
- How injection and request forgery attacks work, in plain terms
- Security headers, cookies and TLS settings
- API protection: authentication, rate limiting and input limits
- What to look for in code review and in a scan report

## The mistakes that keep appearing

| Weakness | What happens | Typical fix |
|----------|--------------|-------------|
| Broken access control | A user changes an ID and reads someone else's data | Check permission for every object on the server |
| Injection | Input is treated as code, for example in SQL or a shell command | Parameterised queries, no string building |
| Security misconfiguration | Debug pages on, default passwords, open storage | Hardened defaults, configuration scanning |
| Vulnerable components | An old library with a known flaw | Dependency scanning and updates |
| Server-side request forgery | The server fetches a URL chosen by the attacker, including internal addresses | Allow lists for outbound requests, block metadata addresses |
| Weak authentication | Guessable passwords, no lockout, long sessions | MFA, rate limits, short sessions |
| Logging failures | Attacks are not recorded or noticed | Log security events, alert on patterns |

## Injection in one example

```python
# Unsafe: user input becomes part of the query text
query = "SELECT * FROM users WHERE name = '" + name + "'"

# Safe: the driver sends the value separately from the query
cursor.execute("SELECT * FROM users WHERE name = %s", (name,))
```

If `name` is `x' OR '1'='1`, the first version returns every user. The second treats the whole text as a value. The same idea applies to shell commands, LDAP queries and template engines.

```predict
Q: A script builds a command from a user supplied file name. What happens if the name is: report.txt; rm -rf /data
os.system("gzip " + name)
???
The shell runs two commands: gzip report.txt, then rm -rf /data. Pass arguments as a list, with no shell, and validate the name.
> Concatenating input into a shell command lets the user add commands after a semicolon. Use subprocess.run(["gzip", name], check=True) and check that the name matches an allowed pattern.
```

## Headers, cookies and TLS

Set these at the gateway or in the web server so every application benefits:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

Session cookies should have `Secure`, `HttpOnly` and `SameSite` attributes. Redirect HTTP to HTTPS, and disable old TLS versions.

## Protecting APIs

- **Authenticate every call** and authorize each object, not only the endpoint.
- **Rate limit** per user and per address, to slow brute force attempts and abuse.
- **Limit input**: maximum body size, field lengths, number of items per page.
- **Return little**: do not send fields the client does not need, and avoid detailed error messages.
- **Keep an inventory** of every API, including old versions, because forgotten endpoints are often unprotected.

```diagram
title: Layers that protect an API
node: client | Client | 0 | 1 | Any caller, including attackers. All input is untrusted. | Nothing to fix here. Assume hostile input.
node: waf | Gateway and WAF | 1 | 1 | Terminates TLS, applies rate limits, blocks known attack patterns and large bodies. | If it is bypassed through a direct address, the app is exposed. If rules are too loose, attacks pass.
node: auth | Authentication | 2 | 0 | Validates the token: signature, issuer, audience and expiry. | If validation is skipped or weak, anyone can forge a token.
node: api | API code | 2 | 1 | Checks object-level permission and validates input. | Missing permission checks let users read each other's data.
node: db | Database | 3 | 1 | Accessed with a least-privilege account and parameterised queries. | An admin account here turns one injection into a full breach.
edge: client | waf
edge: waf | auth
edge: waf | api
edge: auth | api
edge: api | db
```

## Incident: the guessable invoice number

> **Incident:** A customer notices that the invoice link ends with a number. Changing it to the next number shows another company's invoice.

```console
$ curl -s -H "Authorization: Bearer $TOKEN" https://api.example.com/invoices/10042 | jq .customer
"Acme Ltd"
$ curl -s -H "Authorization: Bearer $TOKEN" https://api.example.com/invoices/10043 | jq .customer
"Globex Corp"
```

The API checks that the caller is logged in, but not that the invoice belongs to the caller. The fix is a server-side ownership check on every request, plus an alert for one account reading many objects in sequence. Random identifiers help, but they do not replace the check.

## Common mistakes

- Relying on the client or front end to enforce permissions
- Building queries and commands by joining strings
- Returning stack traces or internal details in error messages
- Leaving old API versions running without protection

```quiz
Q: What is the best defence against SQL injection?
- Hiding the database name
+ Parameterised queries, where values are sent separately from the SQL text
- A longer password
- Removing semicolons from input only
> Parameterisation keeps data from being interpreted as code. Filtering characters is fragile.

Q: What is broken access control?
- The login page is slow
+ The server fails to check that the user may access the specific data or action requested
- A certificate has expired
- A password is too short
> Changing an identifier and seeing another user's data is the classic example.

Q: Why is server-side request forgery dangerous in the cloud?
- It makes pages load slowly
+ The attacker can make the server call internal addresses, such as the metadata service, and steal credentials
- It deletes logs
- It disables TLS
> The server can reach places the attacker cannot. Allow lists and a hardened metadata service reduce the risk.

Q: Which cookie attribute helps stop JavaScript from reading a session cookie?
- Secure
- SameSite
+ HttpOnly
- Path
> HttpOnly hides the cookie from scripts, which limits the damage of cross-site scripting.
```

```cards
What is injection? :: Untrusted input is interpreted as code, such as SQL or shell commands
Fix for SQL injection? :: Parameterised queries
What does HSTS do? :: Tells browsers to use HTTPS for the site and never fall back to HTTP
Name the cookie attributes that matter :: Secure, HttpOnly and SameSite
What is SSRF? :: Getting the server to fetch a URL the attacker chooses, including internal ones
```
