# AWS Kinesis thread limit, November 2020
company: Amazon Web Services
date: 25 November 2020
modules: cloud, linux, sre
calc: capacity, cells
source: AWS post-event summary | https://aws.amazon.com/message/11201/
summary: Adding servers to a fleet pushed every server past an operating system limit, because each one kept a thread for every other.

## Before you read on
Each of your servers opens a thread to every other server. You add 20% more servers. Which resource do you run out of first, and would your monitoring tell you?

## The system
Kinesis is a managed streaming service. A front-end fleet receives requests and routes them to back-end clusters. To do that, every front-end server builds a table of the shards and back-end clusters, and it keeps that table up to date by using a thread to talk to each of the other front-end servers. The number of threads on a server therefore grows with the number of servers in the fleet.

## Timeline as reported
- In the early morning Pacific time, AWS added capacity to the front-end fleet in US-East-1, as a planned change.
- Soon after, front-end servers began to exceed the maximum number of threads that their operating system allowed. The servers could not build their tables, and requests failed.
- Because the symptoms looked like several other possible problems, engineers spent time on other theories before finding the thread limit.
- Services that use Kinesis, including CloudWatch and Cognito, also failed or degraded. Customers had trouble seeing metrics and signing in.
- Engineers could not simply restart servers all at once, because restarting too fast would have made the cache problems worse. They brought servers back slowly, a few at a time.
- Recovery took most of the day.

## Root cause
The design made resource use per server grow with fleet size, and nothing warned that a limit was close. The change that exposed the limit was ordinary.

## What AWS changed
- The fleet was moved to fewer, larger servers, which need fewer threads in total.
- Alarms were added for thread counts and other resources, and the change process includes a check against limits.
- AWS worked on cell-based isolation of the Kinesis front end and on reducing dependencies, including its own use of Cognito and CloudWatch.

## Lessons learned
- Watch limits that grow with fleet size, such as thread and connection counts, and alert before the cap.
- Add servers in cells so adding capacity does not touch everything at once.
- Make the status page and monitoring independent of the failing service.
- Plan for slow, ordered restarts and test them.

## Trade-offs to weigh
- **Many small servers against a few big ones.** Small servers lose less when one fails, but they may need more connections and coordination.
- **All-to-all communication.** It keeps every server up to date, but costs grow faster than the fleet.
- **Dependencies on shared services.** Using a shared service saves work, and ties your recovery to someone else's.

## Try the calculators
In the capacity calculator, plan a fleet for a peak of 5,000 requests per second. Change the number of zones and note the extra servers needed to survive losing one. In the cells calculator, ask what happens to the cost multiplier if every extra cell adds 6% overhead.
