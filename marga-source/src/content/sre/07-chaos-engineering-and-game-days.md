---
title: Chaos engineering, game days and disaster recovery
minutes: 15
summary: Practise failure on purpose with controlled experiments and game days, test backups and failover, and set recovery objectives you have actually proved.
---

Systems fail in ways nobody predicted, usually at the worst time. You can discover the weaknesses during a calm Tuesday afternoon with the whole team watching, or at 03:00 with customers watching. **Chaos engineering** and **game days** choose the first option.

## What you will learn

- The chaos experiment loop and how to keep it safe
- Running a game day
- Tools for injecting failure in Kubernetes and cloud
- Disaster recovery: RTO, RPO and proving your backups

## The experiment loop

Chaos engineering is not breaking things at random. It is the scientific method applied to production readiness.

1. **Define steady state**: measurable behaviour that means "healthy", such as the checkout success rate and p95 latency
2. **Form a hypothesis**: "If one API Pod is killed, checkout success stays above 99.9 percent"
3. **Limit the blast radius**: start small, in staging or on a slice of traffic, with a clear way to stop
4. **Inject the failure**
5. **Observe** against the steady state, and compare with the hypothesis
6. **Learn and fix**, then repeat with a larger failure

An experiment that confirms the hypothesis is a success: you have evidence of resilience. An experiment that fails is a bigger success, since you found the weakness cheaply.

## Safety rules

- Have a **hypothesis, an owner and an abort condition** before starting (for example "stop if the error rate exceeds 2 percent")
- Announce the experiment, and avoid running during incidents, releases or peak traffic
- Make sure monitoring and the stop button work first
- Begin in non-production, then production with a small scope
- Never test what you could not recover from

## Injecting failure

```console
$ kubectl delete pod -l app=shop-api -n shop --field-selector=status.phase=Running --wait=false | head -1
$ kubectl get pods -n shop -w
$ kubectl drain worker-3 --ignore-daemonsets --delete-emptydir-data
$ kubectl uncordon worker-3
$ sudo tc qdisc add dev eth0 root netem delay 200ms loss 2%
$ sudo tc qdisc del dev eth0 root
$ stress-ng --cpu 4 --timeout 120s
```

Dedicated tools make experiments repeatable and safer. **Chaos Mesh** and **LitmusChaos** run experiments as Kubernetes resources, and cloud providers offer **AWS Fault Injection Service** and **Azure Chaos Studio**.

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: kill-one-api-pod
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: ["shop"]
    labelSelectors:
      app: shop-api
  duration: "60s"
```

Useful failures to rehearse: a Pod or node dying, a zone becoming unavailable, a dependency returning errors or becoming slow, DNS failing, a disk filling, a certificate expiring and an expired credential.

## Game days

A **game day** is a scheduled exercise where the team responds to a simulated failure, practising the human side: detection, communication, escalation and runbooks.

1. Pick a scenario drawn from past incidents or from a risk review, for example "primary database fails over"
2. Assign roles: a facilitator who injects events, the responders, an observer taking notes
3. Run it: the facilitator reveals symptoms step by step, and responders use normal tools and runbooks
4. Debrief within a day: what worked, what was slow, what runbook was wrong?
5. Track fixes like any other work

The result is rarely a technical finding alone. You will learn that the runbook refers to a dashboard that no longer exists, or that only one person knows the failover procedure.

## Disaster recovery

Two numbers define what you must achieve:

- **RTO** (recovery time objective): how long the service may be down
- **RPO** (recovery point objective): how much data you may lose, measured in time

A backup strategy is only as good as its **last successful restore test**.

| Strategy | Typical RTO | Cost |
|----------|-------------|------|
| Backup and restore | Hours | Low |
| Pilot light (core running, rest scaled down) | Tens of minutes | Medium |
| Warm standby | Minutes | Higher |
| Active-active multi-region | Near zero | Highest |

```console
$ aws rds describe-db-snapshots --db-instance-identifier shop-prod --query 'DBSnapshots[-1].[SnapshotCreateTime,Status]'
$ aws rds restore-db-instance-from-db-snapshot --db-instance-identifier shop-restore-test --db-snapshot-identifier shop-prod-2025-06-02
$ psql -h shop-restore-test.abc.eu-west-1.rds.amazonaws.com -U app -c "select count(*) from orders;"
$ aws rds delete-db-instance --db-instance-identifier shop-restore-test --skip-final-snapshot
```

Automate this restore test on a schedule and alert if it fails. Measure the actual time and compare it with the RTO.

## Incident: the backup that did not restore

> **Incident:** The primary database is corrupted by a faulty migration. The team starts the restore, and discovers the nightly backups have been empty files for five weeks because a credential expired and the job reported success anyway. The newest usable copy is from a month ago.

The problem is untested backups and a job that ignored its own errors. Recovery uses whatever remains:

```console
$ aws s3 ls s3://acme-backups/shop/ --human-readable | tail -5
$ aws rds describe-db-snapshots --snapshot-type automated --query 'DBSnapshots[].[DBSnapshotIdentifier,SnapshotCreateTime]' --output text | tail -3
```

Fall back to the cloud provider's automated snapshots and point-in-time recovery, accept the data loss that remains and tell stakeholders plainly. Then fix the process: backup jobs must fail loudly, a scheduled restore test must verify row counts, alerts must fire on backup size anomalies, and a quarterly game day must exercise the full restore.

## Common mistakes

- Running experiments without a hypothesis or abort condition
- Chaos testing before basic monitoring works
- Treating a successful backup job as proof of restorability
- Game days that nobody follows up with fixes
- Stating RTO and RPO that have never been measured

```quiz
Q: What is the first step of a chaos experiment?
- Break something in production
+ Define steady state and form a hypothesis
- Buy a tool
- Page the team
> You need a measurable definition of healthy before injecting failure.

Q: What is the purpose of a game day?
+ Practise detection, communication and recovery as a team under a simulated failure
- Replace monitoring
- Find a person to blame
- Test only the code
> Game days test people and process as well as technology.

Q: What does RPO describe?
- How long recovery takes
+ How much data loss is acceptable, measured as time
- The number of servers
- The cost of backups
> RTO is about downtime; RPO is about data loss.

Q: How do you know a backup works?
- The job says success
+ You regularly restore it and verify the data
- It is large
- It is encrypted
> A tested restore is the only proof.
```

```cards
Why limit blast radius? :: So a failed experiment causes minimal harm and can be stopped quickly
RTO versus RPO? :: Recovery time allowed versus data loss allowed
What is a pilot light DR strategy? :: Core components run in the DR region and the rest is scaled up when needed
Name two chaos tools :: Chaos Mesh and LitmusChaos (or AWS Fault Injection Service, Azure Chaos Studio)
```
