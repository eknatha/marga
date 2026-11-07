---
title: Measuring AIOps value and avoiding hype
minutes: 12
summary: Decide whether an AIOps tool helps with before and after metrics such as noise, time to detect and time to resolve, and run honest pilots.
---

Every AIOps product promises less noise and faster recovery. Your job is to test those claims on your own data, with measures that capture both the benefits and the dangers.

## What you will learn

- Choosing metrics: precision, recall, MTTD and MTTR
- Shadow mode and control groups
- Comparing against a simple baseline
- Counting total cost and risk

## Metrics

- **Precision:** of the alerts it raised, how many were real.
- **Recall:** of the real problems, how many it caught.
- **MTTD and MTTR:** mean time to detect and to resolve.
- **Alert volume and pages per on-call shift.**
- **Human effort:** time spent tuning, labeling and handling its mistakes.

```python
def precision_recall(tp, fp, fn):
    return tp / (tp + fp), tp / (tp + fn)

print(precision_recall(tp=42, fp=8, fn=6))   # (0.84, 0.875)
```

## Run an honest pilot

Start in **shadow mode**: the tool runs and records what it would do, but humans still handle incidents. Compare its decisions with what really happened over several weeks, including at least one busy period. If possible use a control group, such as one team with the tool and one without.

## Baselines

Compare with a simple rule, such as a static threshold with a sensible window, or a plain deduplication rule. If a simple baseline gets most of the benefit, choose it.

## Total cost and risk

Include licences, compute, integration work, tuning time, and the cost of a missed incident. Define a **rollback** plan and review results quarterly. Stop or shrink anything that does not show a measurable gain.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Measuring AIOps value and avoiding hype fits together
node: n1 | Metrics | 0 | 0 | Precision: of the alerts it raised, how many were real. | Judging only by alert reduction. | observe
node: n2 | Run an honest pilot | 1 | 1 | Start in shadow mode: the tool runs and records what it would do, but humans still handle incidents. | Skipping a shadow period. | process
node: n3 | Baselines | 2 | 0 | Compare with a simple rule, such as a static threshold with a sensible window, or a plain deduplication rule. | No comparison with a simple rule. | process
node: n4 | Total cost and risk | 3 | 1 | Include licences, compute, integration work, tuning time, and the cost of a missed incident. | Ignoring the work of maintaining the tool. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
```

## Incident: Ninety percent less noise, two missed incidents

> **Incident:** Shadow mode revealed that suppression hid real incidents.

```console
alerts before: 1820/week
alerts after:  182/week (-90%)
real incidents suppressed during shadow period: 2
```

The headline number counted all noise reduction as good. Looking at missed incidents showed the tool suppressed two real problems because they looked like usual noise. The team used the tool only to group related alerts and kept humans in charge of suppression.

## Common mistakes

- Judging only by alert reduction
- Skipping a shadow period
- No comparison with a simple rule
- Ignoring the work of maintaining the tool

```quiz
Q: What does recall measure?
+ Real problems it caught
- Alerts raised :: No.
- CPU use :: No.
- Cost :: No.
> Misses hurt. The lesson section above explains why.

Q: What is shadow mode?
+ The tool records decisions without acting
- The tool is off :: No.
- The tool deletes alerts :: No.
- A new dashboard :: No.
> Safe evaluation. The lesson section above explains why.

Q: Why compare with a baseline?
+ A simple rule may do as well
- To make it harder :: No.
- To skip testing :: No.
- To avoid data :: No.
> Complexity must earn its place.

Q: Which cost is often forgotten?
+ Human tuning and maintenance
- Colour :: No.
- Logo size :: No.
- Branch names :: No.
> Ongoing effort matters.
```

```cards
Precision :: Share of alerts that were real
Recall :: Share of real problems detected
MTTD :: Mean time to detect
Shadow mode :: Running without taking real action
```
