---
title: Worked design: a status page that survives the outage, and an outage design review
minutes: 16
summary: Design the small system that must work when everything else is down, then learn to review a design after an outage.
---

The status page is the simplest system with the hardest requirement: it must be up exactly when the rest is down. Designing it shows every principle in the module in a small space. After that, we use the same lens to review a real outage design, before and after.

## What you will learn

- Derive independence requirements from a failure scenario
- Design a communication path that does not share fate with the product
- Run a before and after design review of an outage using a case file
- Write follow-ups that change the design, not only the runbook

## Part 1. The status page

**Clarify.** Customers and staff must see current state and updates during any outage of our platform, DNS, identity or cloud account. Readers: tens of thousands during an incident. Writers: a few on-call staff. Updates can take a minute to appear. It must work if our SSO is down.

**Estimate.** Reads at 50,000 requests per second would be a surge; a static page of 50 KB behind a CDN serves that at trivial cost. Writes: a handful an hour.

**Sketch.**
- A static site generated from a small data file, published to object storage on a different provider and account, behind a CDN on a different DNS zone from the product.
- Updates through a simple authenticated tool with its own accounts (not company SSO) with multi-factor, plus a break-glass path.
- A second publishing path (an API and a documented manual upload) so one tool outage does not stop updates.
- Email and chat notifications from a separate provider.
- Automated probes from outside the platform update the page when checks fail, but a human can override.

**Failure modes.**

| Scenario | Design answer |
| --- | --- |
| Our cloud account unavailable | page is on another provider |
| Our DNS down | status domain on a different registrar and DNS provider |
| SSO down | separate accounts for publishers, tested quarterly |
| Publisher tool down | manual upload path documented and drilled |
| Page itself attacked | static content on a CDN, rate limits |
| Automated probes wrong | human override, probes labelled as automatic |

**Trade-offs.** A second provider costs a little and adds a process to maintain. Static pages cannot show personalised state. Accept both.

**The test.** Every quarter, shut off the product's DNS and SSO in a staging copy and publish an update. Time it.

## Part 2. Reviewing an outage design

A design review after an outage asks the same questions as a design review before one. Use this frame on a case file:

1. **Before design:** draw what existed and the dependencies, including build, operate and recover graphs.
2. **Trigger and latent cause:** what changed, and what weakness did it meet?
3. **Why it spread:** which failure domain, shared dependency or missing limit?
4. **Why it lasted:** detection time, diagnosis tools, recovery dependencies, tested rollback?
5. **After design:** the changes, each mapped to a principle (cell, stage, limit, fail static, independence).
6. **What is still open:** residual risk, honestly.

### Example: Facebook, 4 October 2021

The case file uses Cloudflare's outside view. Before: DNS servers announced through the company's own backbone; a configuration change on that backbone. Trigger: the change. Latent cause: the DNS servers withdrew themselves from routing when they could not reach the data centres, so the name stopped resolving globally. Why it lasted: tools that depended on the same network. After-design lessons: stage backbone changes with a pre-check that proves access remains, keep out-of-band access, and make DNS survive the loss of its backend. Open: any such choice remains a trade between withdrawing a broken server and keeping a stale one.

### Example: S3 in us-east-1, 28 February 2017

Trigger: a debugging command removed more capacity than intended. Latent: two subsystems needed a full restart that nobody had practised at that scale. Why it lasted: restart took longer than expected. After: the tool limits how fast capacity can be removed and a minimum capacity floor; restart paths were practised. A further twist: the status dashboard itself depended on S3, which is exactly the design flaw in Part 1.

```predict
Q: In an outage review you list "engineer ran the wrong command" as the root cause. What is missing?
???
The design that allowed a single command to remove too much, the missing guardrail or limit, and why recovery was slow. People make errors; the review should change the system so the error is bounded.
> A cause that ends at a person is not a design change.
```

## How it fails

Reviews that stop at the trigger. Follow-ups that are only "be more careful". A list of 40 actions with no owner and no ordering. Rank by blast radius reduced per effort and track completion.

## Incident: The dashboard that needed the broken service

> **Incident:** During a major storage outage, the page that should have reported it was itself slow to update because it depended on the failing service.

```console
$ curl -s -o /dev/null -w '%{http_code}\n' https://status.example.com
503
```

This is a simulated illustration. In the real S3 incident of 28 February 2017, AWS reported that the status dashboard's own images were stored in S3, so it could not show colour changes and the team used text updates instead. See the case file. The design answer is the independent page in Part 1.

## Interview question

"You are asked to review a postmortem. What do you look for?" Whether actions reduce blast radius, whether detection and recovery dependencies are addressed, whether owners and dates exist, and whether the fixes get tested.

## Common mistakes

- Status page on the same stack
- Review ends at human error
- Actions that add procedure but no system change
- Never testing the communication path

```quiz
Q: Why must the status page avoid sharing DNS and accounts with the product?
+ It must work exactly when the product's infrastructure is down
- It costs less :: Not the reason.
- Customers prefer it :: Not the reason.
- Search engines require it :: No.
> Correct: It must work exactly when the product's infrastructure is down. Re-read the matching lesson section for the full reasoning.

Q: What is wrong with ending a review at "operator error"?
+ It leaves the missing guardrail and slow recovery unchanged
- Operators never err :: They do.
- It is too detailed :: Opposite.
- It breaks the template :: Not the point.
> Correct: It leaves the missing guardrail and slow recovery unchanged. Re-read the matching lesson section for the full reasoning.

Q: Which review question covers detection and diagnosis?
+ Why did it last, and what did our tools depend on?
- Who is to blame? :: Not a design question.
- How much did it cost? :: Not this one.
- Which vendor was used? :: Not this one.
> Correct: Why did it last, and what did our tools depend on?. Re-read the matching lesson section for the full reasoning.

Q: How should follow-up actions be ranked?
+ By blast radius reduced per effort, with owners and dates
- Alphabetically :: No.
- By who suggested them :: No.
- By ease only :: Misses impact.
> Correct: By blast radius reduced per effort, with owners and dates. Re-read the matching lesson section for the full reasoning.
```

```cards
status page :: communication path independent of the product
break-glass :: emergency access outside normal systems
before and after :: compare the design pre and post incident
latent cause :: weakness waiting for a trigger
guardrail :: limit that bounds a mistake
follow-up action :: change with owner and date
```
