---
title: Evaluating AI ops output: test sets, shadow mode and review rates
minutes: 14
summary: Measure whether detectors, correlators and assistants are right before and after launch, using labelled incidents, shadow mode, human review rates and a regression suite.
---

You would not ship a service without tests. An AIOps feature needs the same discipline, with one difference: its output is probabilistic, so you measure rates and trends rather than a single pass or fail.

## What you will learn

- How to build a labelled test set from real incidents
- Which metrics to use for detectors, correlators and assistants
- How shadow mode and staged rollout reduce risk
- How to keep evaluating after launch

## A labelled incident set

Collect 30 to 100 past incidents with what a good tool should have done: when the problem started, which service was the root cause, which change caused it, and what the right action was. Include near misses and quiet periods so you can count false alarms. Write labels from postmortems and have a second person check a sample. This set is your most valuable AIOps asset, so version it like code.

## Metrics by feature

- **Detector:** recall (incidents caught), lead time (how early), false alarms per week.
- **Correlator and grouping:** share of incidents grouped correctly, number of merges and splits a human had to fix, alert reduction ratio.
- **Root-cause ranking:** top-1 and top-3 accuracy, meaning how often the true cause is first or in the first three.
- **Assistant answers:** correctness against the postmortem, share with a valid citation, share of unsupported claims, and "did not find" rate when it should abstain.
- **Remediation:** success rate, rollback rate, time to recover and harmful action count (target zero).

Report these with the number of cases, since "8 of 10" and "80 of 100" are not equally convincing.

## Shadow mode

Run the new feature beside production without acting on it. It sees the same live data, produces its output into a log, and humans continue as before. After a few weeks, compare its output with what the responders did. Shadow mode finds problems that a replay cannot: late data, new services, strange traffic. It costs nothing in risk.

## Human review rate

Once suggestions appear to people, track how often they accept, edit or reject them. A high rejection rate means the tool is noise. A very high acceptance rate with no edits can mean people are not reading, so sample and audit accepted suggestions. Capture a reason for rejections with one click.

## Staged rollout

Go from shadow to suggestions for one team, to suggestions for all, to automatic low-tier actions for a few services. At each stage define the numbers that must hold before moving on, and the numbers that trigger a rollback. Write these gates down in advance.

## Regression suite

Every incident where the tool was wrong joins the test set. Run the whole set on every change to a model, a threshold, a prompt or a retrieval setting. If a change fixes one case and breaks three, you will see it before users do.

```python
def top_k_accuracy(cases, k=3):
    """cases: list of {'truth': str, 'ranked': [str, ...]}"""
    hits = sum(1 for c in cases if c["truth"] in c["ranked"][:k])
    return hits, len(cases), round(hits / len(cases), 2)

cases = [
    {"truth": "orders-db", "ranked": ["orders-db", "checkout", "web"]},
    {"truth": "payments", "ranked": ["checkout", "web", "payments"]},
    {"truth": "cache", "ranked": ["web", "search", "checkout"]},
]
print("top-1:", top_k_accuracy(cases, 1), "top-3:", top_k_accuracy(cases, 3))
```

A tiny harness like this, run over your incident set, shows at once whether a change helped.

```diagram
title: From test set to trusted automation
node: set | Labelled incidents | 0 | 1 | Real cases with start, cause, change and right action. | Only dramatic incidents, no quiet periods. | store
node: replay | Replay | 1 | 0 | Score the feature on history. | Tuning and testing on the same cases. | process
node: shadow | Shadow mode | 1 | 2 | Runs live, output only logged. | Never compared with what humans did. | observe
node: sugg | Suggestions | 2 | 1 | Shown to one team with accept and reject. | Acceptance without reading. | external
node: auto | Bounded automation | 3 | 1 | Low tiers only, with guardrails. | No predefined rollback criteria. | service
node: reg | Regression suite | 4 | 1 | Every wrong case becomes a test. | Not run on each change. | store
edge: set | replay
edge: set | shadow
edge: replay | sugg
edge: shadow | sugg
edge: sugg | auto
edge: auto | reg
```

## Incident: The great demo and the poor month

> **Incident:** A root-cause ranking tool impressed everyone in a demo and was then switched on for all teams.

```console
$ rcaeval report --suite incidents-2026 --model v3
cases: 64   top-1: 41%   top-3: 69%   abstained: 3
demo cases only (8): top-1: 88%
(this is a simulated illustration, not a real incident)
```

The demo had used eight clean, well-documented incidents. On the full set, including messy ones, the tool put the true cause first only 41 percent of the time. The team went back to shadow mode for a month, fixed topology gaps, and moved forward only when top-3 passed 80 percent.

## Common mistakes

- Judging by a demo of the best cases
- No quiet periods in the test set, so false alarms go uncounted
- Reporting percentages without the number of cases
- Skipping shadow mode
- Not adding failures to the regression set

```quiz
Q: What is shadow mode?
+ Running a feature on live data without acting on it
- Running it only at night :: Not the meaning.
- Hiding it from the logs :: Opposite.
- Disabling its output :: It still produces output.
> It compares the tool with human actions at no risk.

Q: What does top-3 accuracy measure for root-cause ranking?
+ How often the true cause is among the first three suggestions
- How fast the tool runs :: Different.
- How many alerts fired :: Different.
- The tool's confidence :: Not accuracy.
> It shows how useful the shortlist is.

Q: Why include quiet periods in the test set?
+ To count false alarms
- To make the set larger for fun :: Not the reason.
- To test storage :: Unrelated.
- To avoid labels :: Still needed.
> A detector that fires all the time looks perfect on incidents alone.

Q: What happens to each case the tool got wrong?
+ It joins the regression suite
- It is deleted :: Loses learning.
- It is ignored :: Repeats mistakes.
- It is hidden :: Dishonest.
> Future changes must handle it.
```

```cards
Labelled incident set :: Real past incidents with the correct cause and response
Top-k accuracy :: How often the right answer is within the first k results
Shadow mode :: Running a feature live without letting it act
Acceptance rate :: The share of suggestions people use
Regression suite :: Saved cases rerun after every change
```
