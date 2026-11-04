# Model answer: a status page that survives the outage it reports
prompt: status-page
summary: Host it independently, make it static and cache-friendly, and update it from an out-of-band path.

## The answer in one minute

The status page must not share infrastructure, DNS or login with the product. Serve static files from a different provider, update through a separate small tool, show component status and incident history, and offer subscriptions by channels that do not depend on you.

## The design

```diagram
title: Independent status page design
node: user | Users | 0 | 1 | Check the page during an incident. | A slow page adds to panic.
node: cdn | Separate CDN and DNS | 1 | 1 | Different provider from the product. | Shared DNS means shared failure.
node: static | Static page build | 2 | 0 | Pre-rendered HTML and JSON. | Stale if updates stop.
node: admin | Update tool | 2 | 2 | Small app for responders with separate login. | Using the main SSO locks you out.
node: probe | External probes | 3 | 1 | Check the product from outside. | Only internal checks miss network failures.
node: sub | Subscriptions | 4 | 0 | Email, SMS, RSS and webhooks. | Using your own mail service fails with you.
node: hist | Incident history | 4 | 2 | Past incidents and uptime. | Missing history reduces trust.
edge: user | cdn
edge: cdn | static
edge: admin | static
edge: probe | admin
edge: static | sub
edge: static | hist
```

## Every component, explained

### Independent hosting

The page runs on a different cloud account, DNS provider and CDN, so one outage cannot take both.

Example: If the product DNS fails, status.example.com still resolves at another provider.

### Static delivery

The page is generated as files and cached at the edge, so it serves millions of readers with almost no backend.

Example: A million users reload during an outage and the CDN serves them all.

### Separate update path

Responders update through a tool with its own login and a break-glass account, or a signed commit to a repository.

Example: The incident lead posts an update even though company SSO is down.

### External probes

Checks from outside the network feed automatic suggestions, which a human confirms.

Example: A probe sees failures from three regions and drafts an update for approval.

### Out-of-band notice

Subscribers get messages through providers that do not depend on your systems.

Example: SMS goes out through a separate vendor when email is also affected.

## Numbers to say out loud

- Static files of 100 KB served to 5 million readers an hour need only CDN capacity.
- Updates every 30 minutes during an incident keep users informed.
- Keep the page under 200 KB so it loads on poor networks.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Shared dependency | Page down with product | Audit every dependency, test by cutting the product off |
| Nobody can log in | No updates | Break-glass credentials |
| Wrong automatic status | False alarms | Human review of changes |
| CDN problem | Page unreachable | Second CDN or static fallback host |
| Stale information | Distrust | Timestamps and update cadence |

## Follow-up questions to expect

- Who is allowed to post, and how is it approved?
- How do you avoid leaking details?
- How do you test it?
