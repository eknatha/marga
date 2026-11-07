---
title: FinOps: commitments, savings plans and spot capacity
minutes: 12
summary: Lower the unit price of steady workloads with reserved and committed discounts, run fault-tolerant work on spot capacity, and avoid over-committing.
---

After you remove waste and rightsize, the next lever is the price you pay per hour. Providers give lower prices in exchange for commitment (steady use over one or three years) or flexibility (capacity they can take back). Used well, these cut a large share of compute cost. Used badly, they lock you into payments for things you no longer run.

## What you will learn

- The main pricing models: on-demand, commitments and spot
- How to choose a commitment level from your baseline
- Which workloads suit spot and how to make them survive interruption
- Risks and how to manage a commitment portfolio

## Pricing models

- **On-demand**: pay as you go, no commitment, highest unit price. Right for unpredictable or short-lived use.
- **Commitments**: reserved instances, savings plans (AWS), reservations and savings plans (Azure) and committed use discounts (Google Cloud). You promise a level of use, or a spend per hour, for one or three years and get a lower rate. Flexible plans apply across instance families or services; narrow ones give bigger discounts but fit less.
- **Spot or preemptible**: unused capacity at a deep discount, which the provider can reclaim with short notice (often two minutes or less).

Exact discounts and terms change, so check the current provider pages before you decide.

## Commit to the baseline, not the peak

Plot hourly usage over several months. The **always-on floor** is what you can commit to. The variable part above it stays on-demand or spot. If you commit to the average or the peak, you pay for unused commitment during quiet periods. Start with a smaller share of the floor (for example 50 to 70 percent), observe **coverage** (how much usage is discounted) and **utilization** (how much of the commitment is used), and add more in steps. Stagger purchase dates so that not everything expires at once, and review before each expiry, since your architecture may have changed (for example a move to containers, a new instance family or another region).

## Spot for fault-tolerant work

Good fits: batch jobs, CI runners, stateless web workers behind a load balancer, data processing with checkpoints, and Kubernetes node pools for scalable workloads. Poor fits: single databases, anything that cannot be interrupted or restarted.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: batch-worker
spec:
  terminationGracePeriodSeconds: 90
  tolerations:
    - key: "capacity"
      operator: "Equal"
      value: "spot"
      effect: "NoSchedule"
  nodeSelector:
    capacity: spot
  containers:
    - name: worker
      image: registry.example.com/batch-worker:1.4.2
```

Design for interruption: handle the termination notice (drain, checkpoint, return work to the queue), spread across several instance types and zones so one pool drying up does not stop you, and keep a small on-demand base so the service stays up when spot is scarce.

```predict
Q: Your usage swings between 40 and 100 instances during the day. What should a one-year commitment cover?
???
About the always-on floor, up to roughly 40 instances (perhaps start lower), with the swing handled by on-demand or spot.
> Commit to the floor.
```

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How FinOps: commitments, savings plans and spot... fits together
node: n1 | Pricing models | 0 | 0 | On-demand: pay as you go, no commitment, highest unit price. | Buying everything at once with the same expiry date. | process
node: n2 | Commit to the baseline, not the peak | 1 | 1 | Plot hourly usage over several months. The always-on floor is what you can commit to. | Not watching coverage and utilization after the purchase. | process
node: n3 | Spot for fault-tolerant work | 2 | 0 | Good fits: batch jobs, CI runners, stateless web workers behind a load balancer, data processing with checkpoints, and Kubernetes node pools for scalable workloads. | Running stateful systems on spot. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: Paying for servers that were gone

> **Incident:** A company bought a three-year commitment for a specific instance family, then migrated to containers on a different family six months later.

```console
$ aws ce get-reservation-utilization --time-period Start=2026-02-01,End=2026-03-01
Utilization: 38%
```

The commitment utilization fell to 38 percent, so the company paid for capacity it did not use while also paying on-demand for the new family. The team sold what they could on the marketplace, converted part to flexible plans, and changed their process: commitments are bought in steps, reviewed quarterly against the roadmap, owned by a named person and limited to a share of the baseline.

## Common mistakes

- Committing to the peak or the average
- Buying everything at once with the same expiry date
- Running stateful systems on spot
- Not watching coverage and utilization after the purchase

```quiz
Q: What should a commitment normally cover?
+ The steady baseline of usage
- The highest peak :: You would pay for unused capacity.
- Nothing, ever :: Misses savings.
- Only new projects :: Not the rule.
> Commit to what is always on.

Q: What is the risk of spot capacity?
+ The provider can reclaim it on short notice
- It cannot run containers :: It can.
- It has no network :: It has.
- It costs more than on-demand :: It is cheaper.
> Design for interruption.

Q: Which workload suits spot?
+ A stateless batch worker with checkpoints
- A single primary database :: Interruption hurts.
- A license server with a fixed host :: Hard to move.
- A payment ledger on one node :: Too risky.
> Fault-tolerant and restartable.

Q: Why review commitments before they expire?
+ Architecture and demand may have changed
- Because prices fall to zero :: They do not.
- To remove tags :: Unrelated.
- To disable billing :: Not possible.
> Renew only what you still need.
```

```cards
On-demand :: flexible, highest rate
Commitment :: lower rate for one or three years of steady use
Spot :: spare capacity, deep discount, can be reclaimed
Coverage and utilization :: how much usage is discounted, how much commitment is used
Staggering :: spread expiry dates to reduce risk
```
