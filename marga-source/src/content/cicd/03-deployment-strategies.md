---
title: Deployment strategies
minutes: 14
summary: Compare rolling, blue-green and canary releases, use feature flags to separate deploy from release, and plan rollback and database changes.
---

How you put a new version in front of users decides how much risk each release carries. A strategy answers three questions: how much traffic is exposed to the new version, how quickly can you go back, and how much extra capacity does it cost.

## What you will learn

- Rolling, blue-green and canary strategies
- Feature flags and why deploy is not release
- Safe handling of database changes
- Automated verification and rollback

## The strategies

| Strategy | How it works | Strength | Weakness |
|----------|--------------|----------|----------|
| **Recreate** | Stop the old version, start the new one | Simplest | Downtime |
| **Rolling** | Replace instances a few at a time | No extra capacity, no downtime | Old and new run together for a while; slower rollback |
| **Blue-green** | Run the new version beside the old, then switch all traffic | Instant switch and instant rollback | Double capacity during the switch |
| **Canary** | Send a small share of traffic (say 5%) to the new version, then grow it | Limits the damage of a bad release | Needs traffic control and good metrics |

In Kubernetes, a Deployment gives you rolling updates by default. Blue-green is commonly done by running two Deployments and switching a Service selector. Canary needs an ingress or service mesh that can split traffic by weight, or a progressive delivery controller.

```yaml
# Blue-green switch: change which version the Service selects
apiVersion: v1
kind: Service
metadata:
  name: shop-api
spec:
  selector:
    app: shop-api
    track: green        # was: blue
  ports:
    - port: 80
      targetPort: 8080
```

## A canary needs a decision rule

A canary is only as good as the metrics you check. Decide in advance what "healthy" means and let automation judge it:

- Error rate of the canary is no worse than the stable version
- Latency at the 95th percentile within an agreed margin
- No increase in crashes or restarts

If any check fails, traffic returns to the stable version automatically.

## Separate deploy from release

A **feature flag** lets you put code into production switched off, then turn it on for a small group, then everyone. Deploying becomes routine and low-risk, and "release" becomes a business decision that can be reversed in seconds without redeploying.

```python
if flags.is_enabled("new-checkout", user_id=user.id):
    return new_checkout(cart)
return old_checkout(cart)
```

Remove flags once a feature is fully released. Old flags become hidden complexity that nobody dares touch.

## Databases are the hard part

Code can be rolled back in seconds; data changes cannot. During a rolling or canary release both versions run against the same database, so every schema change must work with **both** the old and new code. Use the **expand and contract** pattern:

1. **Expand**: add the new column or table (nullable, with no breaking change). Old code ignores it.
2. **Migrate**: deploy code that writes both and reads the new one; backfill existing data.
3. **Contract**: after the old version is gone and you are sure you will not roll back, remove the old column in a later release.

Never rename or drop a column in the same release that stops using it.

## Verify and roll back

After every deploy, run automated **smoke tests** against the real environment and watch key metrics for a short bake time. Define the rollback in advance: for Kubernetes, `kubectl rollout undo`; for blue-green, switch the selector back; for flags, turn the flag off. A rollback you have never practised is a guess.

## Incident: a canary takes down checkout

> **Incident:** A canary at 10% of traffic goes out at 14:00. At 14:06 the checkout error rate rises to 12% for the whole site, not just the canary.

Look at what the canary and stable versions have in common: the database.

```console
$ kubectl logs deploy/shop-api-canary -n shop --tail 3
ERROR: column "currency_code" of relation "orders" does not exist
```

The new code expects a column that the migration has not created in this environment, and a second effect: the canary's failed requests hold database connections, starving the stable pods. Immediately set the canary weight to zero to stop the damage, which restores service.

The lessons are procedural: run the migration (the **expand** step) as its own earlier release and confirm it before the code that needs it, add a rule that aborts the canary automatically when the error rate climbs above a threshold, and keep connection pools sized so one bad version cannot exhaust the database.

## Common mistakes

- No rollback plan, or one that was never tried
- Releasing database changes together with code that depends on them
- Canaries without metrics or automatic abort
- Leaving feature flags in the code for years

```quiz
Q: Which strategy gives the fastest rollback by switching traffic back?
- Recreate
- Rolling
+ Blue-green
- Manual copy
> Blue-green keeps the old version running, so you only switch the router back.

Q: What is the main purpose of a canary release?
- To save money
+ To expose a small share of traffic first and limit the impact of a bad release
- To skip testing
- To avoid monitoring
> Canaries trade speed for safety using real traffic.

Q: What does expand and contract mean for database changes?
- Add and remove servers
+ Add new schema compatibly first, migrate, and remove the old schema only in a later release
- Compress backups
- Rename a column in place
> Both old and new code must work against the schema during the rollout.

Q: How do feature flags help releases?
- They remove the need for tests
+ They let you deploy code switched off and release it separately, reversibly
- They speed up builds
- They encrypt traffic
> Deploy and release become separate decisions.
```

```cards
Rolling vs blue-green? :: Rolling replaces instances gradually; blue-green switches all traffic between two full environments
Why define canary success metrics in advance? :: So automation can promote or abort without debate
Expand and contract? :: Add compatibly, migrate, and only later remove the old schema
First action when a canary hurts users? :: Send its traffic weight to zero to restore service
```
