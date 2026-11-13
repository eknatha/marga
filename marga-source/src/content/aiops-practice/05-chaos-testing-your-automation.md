---
title: Chaos testing your automation
minutes: 13
summary: Break things on purpose to prove detectors fire, correlators find the cause and remediations fix and undo safely, starting in staging and with a small, announced experiment.
---

Automation is code that runs when things are already going wrong, which is the worst time to find out it does not work. Chaos testing creates those conditions on your terms.

## What you will learn

- What to test: detection, explanation, action and the stop path
- How to run a safe, small experiment with a hypothesis
- How to inject faults at the pod, node, network and dependency level
- How to turn results into regression tests

## Four questions per experiment

1. **Detection:** did the right alert or detector fire, and how fast?
2. **Explanation:** did the correlator or assistant name the injected fault, or a symptom?
3. **Action:** did the remediation run, was it bounded, and did verification pass?
4. **Stop path:** when you pulled the kill switch or made verification fail, did the automation stop and undo cleanly?

Test the negative as well: inject a similar but harmless condition and confirm the automation does nothing.

## Write a hypothesis

State what you expect before you inject: "If one api pod becomes unresponsive, an alert fires within 3 minutes, the restart action runs once, and the error ratio returns below 2 percent within 5 minutes." A result that does not match is the finding, whichever way it differs.

## Start small and safe

Start in staging with production-like data. Announce the experiment and name a stop condition: "abort if the checkout error ratio exceeds 5 percent". Have the kill switch and a person watching. Move to production only for experiments that have been proven in staging, with a small percentage of traffic and during working hours, never during a freeze window or an active incident.

## Fault types

Kill a pod or process, fill a disk, exhaust memory or CPU, add network latency or packet loss between two services, block a dependency, expire a certificate in a test, or make a health check lie. Tools such as Chaos Mesh, Litmus or simple scripts do this. Choose faults that match your past incidents, since those are the ones your automation should already handle.

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: api-pod-kill
  namespace: chaos-testing
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: [staging-api]
    labelSelectors:
      app: api
  duration: 60s
```

This kills one pod of the staging API once. Running it should trigger the restart or reschedule automation, and your checks confirm detection time, number of actions and recovery.

## Test the failure of the automation

Disable the metrics source and confirm a freshness alert fires. Make the remediation's verification query return no data and confirm it escalates instead of declaring success. Break the kill switch store and confirm the automation fails closed, meaning it stops acting rather than continuing without a check.

## Make results permanent

Each experiment that found a gap becomes a ticket, and each fixed gap becomes a scheduled regression test. Run a small set weekly in staging and a larger game day each quarter. Record time to detect, time to explain and time to recover over the months so you can see improvement.

```diagram
title: One chaos experiment on automation
node: hyp | Hypothesis | 0 | 1 | What should detect, explain and fix it. | No expectation, so no finding. | process
node: inj | Inject fault | 1 | 1 | Small, announced, with a stop condition. | Starting in production. | external
node: det | Detect | 2 | 0 | Did the right alert fire in time? | Alerts fire on the wrong signal. | observe
node: exp | Explain | 2 | 1 | Did the hint name the injected fault? | A symptom named as the cause. | process
node: fix | Act and verify | 2 | 2 | Bounded action, verification, undo. | The undo path never exercised. | service
node: rec | Record and fix gaps | 3 | 1 | Ticket and regression test for each gap. | Findings never revisited. | store
edge: hyp | inj
edge: inj | det
edge: inj | exp
edge: inj | fix
edge: det | rec
edge: exp | rec
edge: fix | rec
```

## Incident: The test that proved the undo was missing

> **Incident:** A game day killed a database replica in staging. The failover automation ran, but the old primary was never fenced.

```console
$ aiopsctl experiment result exp-0417
detect: 2m10s   explain: named replica lag (correct)
action: promote replica-2  verify: ok
undo test: FAILED - old primary still accepting writes
(this is a simulated illustration, not a real incident)
```

Two nodes believed they were primary. In production that would have been split-brain. The team added fencing to the action and a regression test that checks only one writer exists after failover.

## Common mistakes

- Injecting a fault without a hypothesis
- Starting in production
- Testing only the success path
- Not testing the stop path
- Treating a finding as a one-off instead of a regression test

```quiz
Q: What should every chaos experiment start with?
+ A hypothesis and a stop condition
- A production deploy :: Unsafe.
- A silent fault :: Nobody learns.
- A vendor demo :: Not an experiment.
> You need an expected result and a clear abort rule.

Q: What does testing the stop path mean?
+ Confirming automation halts and undoes when told or when verification fails
- Stopping the test early :: Different.
- Turning off alerts :: Dangerous.
- Restarting nodes :: Unrelated.
> A stop that was never tested may not work.

Q: Which faults should you choose first?
+ Ones matching your past incidents
- Random exotic failures :: Less useful.
- Only the cheapest to inject :: Not relevant to risk.
- Faults your tools cannot see :: Cannot be measured.
> Your automation should already handle what has happened before.

Q: What happens to a finding?
+ It becomes a ticket and a regression test
- It is filed and forgotten :: Wasted.
- It is added to a slide :: Not enough.
- It is ignored if staging only :: It still matters.
> Repeat the test after the fix.
```

```cards
Chaos experiment :: A planned fault injection to test how a system reacts
Hypothesis :: The result you expect before running an experiment
Game day :: A scheduled exercise where teams respond to injected faults
Fail closed :: Stop acting when a safety check cannot be performed
Fencing :: Stopping an old node from acting after a failover
```
