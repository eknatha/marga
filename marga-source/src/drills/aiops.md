## Monday alarms
level: junior
An anomaly alert fires every Monday morning and everyone ignores it.

```text
metric checkout_requests 1840/s
compared with previous hour mean 620/s (z = 6.2)
same hour, last 4 Mondays: 1790/s (z = 0.3)
```
? What is the fix?
+ Compare with a seasonal baseline from the same time on earlier weeks
- Raise the alert severity
- Page more people
- Delete the metric
why: Normal traffic has a weekly rhythm. A seasonal baseline removes the false alarm.

## Two hundred alerts
level: junior
One failure produces alerts from thirty services.

```text
alerts received: 214, distinct fingerprints: 31
likely shared source: storage-vol-7 (disk 100%)
```
? What is the best first step?
+ Group alerts by dependency to find the shared component that is also unhealthy
- Read every alert in order
- Mute the pager
- Restart all services
why: Alert storms are mostly echoes. Find the source first.

## The silent silence
level: mid
A fault went unnoticed because an old silence was still active.

```text
silence id 88: matcher service=~".*" created 2025-11-02, expires never
```
? What is the lesson?
+ Silences need an expiry and a narrow matcher with a reason
- Silences are always safe
- Make matchers wider
- Disable alerting
why: A broad, permanent silence hides new problems.

## New error after release
level: mid
Customers report problems, and a new log message appeared after the release.

```text
new template since release 5.1.0:
64  serialization failed for field <NAME> in schema v<NUM>
```
? How do you use this?
+ Treat new templates after a change as a strong hint, confirm in traces and the change log
- Ignore rare messages
- Clear the logs
- Wait for the rate to grow
why: New message templates right after a deployment point to the change.

## Confident but wrong hint
level: senior
An assistant blames the database but the team loses time.

```text
hint 1: database latency up at 09:41
timeline: 09:39 load balancer config push, 09:41 db latency up
```
? What would help the team judge the hint?
+ Show the timeline and evidence next to the hint, and check the order of events
- Trust the highest score
- Hide the evidence
- Remove the change log
why: Symptoms can follow the cause. Evidence and order of events let people verify a hint.

## Cleanup with an empty path
level: senior
An automation is about to run a delete with an empty variable.

```text
remediate run cleanup-tmp --dry-run
target path: ""
resolved delete scope: /var/data/*
```
? What should the rule do?
+ Abort when the target is empty and limit deletes to a named directory
- Run anyway
- Delete faster
- Skip the dry run
why: Preconditions and scope limits stop automation from acting on bad input.

## The assistant blames the last deploy
level: mid
An assistant says a deploy caused a spike and offers to roll it back.

```text
assistant: cause = deploy a41f2c2 (confidence high)
errors_5xx first above baseline: 14:02
deploy a41f2c2 finished:         14:14
```
? What does the timeline show?
+ The errors began before the deploy, so the claim is not supported and should be tested further
- The deploy is confirmed as the cause
- The timeline is irrelevant
- The rollback should run at once
why: A cause must come before its effects. A confident claim still needs evidence, and a person approves any action.
