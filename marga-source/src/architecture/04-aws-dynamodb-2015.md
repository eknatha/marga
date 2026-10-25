# AWS DynamoDB metadata overload, September 2015
company: Amazon Web Services
date: 20 September 2015
modules: cloud, sre
calc: retries, capacity
source: AWS post-event summary | https://aws.amazon.com/message/5467D2/
summary: Larger metadata responses and a brief network blip made storage servers retry together, which overloaded the service they all depend on.

## Before you read on
Thousands of servers each ask a small central service for their configuration. What happens to that service if a few seconds of network trouble make them all retry at the same moment?

## The system
DynamoDB splits tables into partitions that are stored on storage servers. Each storage server periodically asks a metadata service for its membership: which partitions it is responsible for. The size of the answer depends on the number of partitions and on features such as global secondary indexes. A server that cannot get an answer in time stops serving requests for those partitions.

## Timeline as reported
- A new feature, global secondary indexes, made the metadata for some very large tables much bigger. Responses took longer to produce.
- Early on a Sunday morning Pacific time, a brief network disruption caused some storage servers to fail to get their membership answers in time.
- Those servers retried. The retries added to the load on the metadata service and increased response times further, which caused more timeouts and more retries.
- Error rates for DynamoDB rose across the region, and services that depend on DynamoDB, such as parts of the AWS console and other products, saw errors too.
- Engineers could not simply add capacity to the metadata service because it was too busy to accept the change. They paused requests, added capacity, and brought storage servers back in stages.
- Service was restored over several hours.

## Root cause
Metadata requests had become expensive, and servers retried without enough backoff, so a small disturbance caused a feedback loop. The system had spare capacity for normal load but not for a stampede.

## What AWS changed
- More capacity was added to the metadata service and its requests were made cheaper to answer.
- Storage servers were changed so that they back off and keep serving what they already know instead of giving up when an answer is late.
- Monitoring and the procedure for recovering the metadata service were improved.

## Lessons learned
- Make clients back off after errors, because retries can turn a small fault into a large one.
- Separate the metadata service from the data path so a metadata load spike does not stop storage.
- Add limits that protect shared services from one busy tenant or one bad update.
- Test capacity changes and failure at full scale, not only in small test environments.

## Trade-offs to weigh
- **Retries against stability.** Retries hide short failures but multiply load when a dependency struggles. Backoff, jitter and budgets limit the damage.
- **Fail closed against fail open.** A server that stops serving when it is unsure is safe for data and bad for availability. Serving the last known state is the reverse.
- **Capacity for the steady state against capacity for recovery.** Systems often need extra headroom just to restart.

## Try the calculators
In the retry storm calculator, set 3 layers with 3 retries each and see the worst-case multiplier. Then apply a 10% retry budget. In the capacity calculator, work out how many servers you would need if the metadata service must also handle a stampede of twice the normal request rate.
