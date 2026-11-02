# Knight Capital trading loss, August 2012
company: Knight Capital Group
date: 1 August 2012
modules: cicd, sre, linux
calc: error-budget, retries
source: US Securities and Exchange Commission order | https://www.sec.gov/litigation/admin/2013/34-70694.pdf
summary: A deployment reached only some of the servers, old dormant code woke up on the rest, and the firm lost a large sum in under an hour.

## Before you read on
You deploy new software to eight servers by copying files by hand. How would you know that all eight received the same version, and what would you do if one did not?

## The system
Knight Capital was a market maker that sent a very high volume of automated orders to US stock exchanges. Its routing software ran on several servers. Older code for a retired feature still existed in the system, and a flag that once controlled that feature was about to be reused for a new one.

## Timeline as reported
- In the days before the market opened, technicians deployed the new software to the servers by hand. According to the regulator, one of the eight servers did not receive the new code.
- When the market opened on 1 August, orders were sent with the reused flag. On the seven updated servers it enabled the new feature. On the one server without the update, it triggered the old, retired logic.
- The old logic sent a flood of unintended orders into the market. Per the regulator, it did not stop when the parent orders were filled, as it once had.
- Alerts and error messages were sent the same morning, but they were not treated as an urgent stop signal, and there was no written procedure for this kind of situation.
- Staff tried to find the fault and, as reported, rolled the new software back on the servers that had it. This made the situation worse, because it spread the old behaviour to all servers.
- The problem was contained after about 45 minutes. The regulator reported that the firm had taken on very large unwanted positions, and the firm later sold them at a loss of several hundred million dollars.

## Root cause
A manual deployment with no check that every server matched, old code left in production, a flag whose meaning was changed, and no tested emergency stop or rollback procedure.

## What changed
- The regulator ordered the firm to improve its controls on market access, and the firm was later acquired by another company.
- The industry took away several lessons: automate deployments, verify every host after rollout, remove dead code, and never reuse a flag for a new meaning.

## Lessons learned
- Automate deployments and verify that every host runs the intended version.
- Remove dead code and never give an old flag a new meaning.
- Have an emergency stop and a tested rollback, and know when rolling back is unsafe.
- Treat alerts that arrive before the event as a trigger to stop.

## Trade-offs to weigh
- **Manual speed against automation.** A hand copy is quick for one change. It does not scale and nothing proves it worked on every host.
- **Reusing a flag against adding a new one.** Reuse avoids a schema change, but an old binary can read it differently.
- **Rollback against forward fix.** Rolling back is normally the safe default. It is only safe if the old version is also safe, and here it was not.

## Try the calculators
In the error budget calculator, set a monthly objective and see how few minutes of badness it allows, then compare it with a 45-minute event. In the retries calculator, see how repeated automated attempts multiply load when something is wrong.
