# OpenAI shared connection bug, March 2023
company: OpenAI
date: 20 March 2023
modules: llm, python, sre
calc: retries, capacity
source: OpenAI write-up of the 20 March ChatGPT outage | https://openai.com/index/march-20-chatgpt-outage/
summary: A bug in an open source Redis client library could return data to the wrong user, and the service was taken offline to fix it.

## Before you read on
Your web service shares a pool of connections to a cache among many users. A request is cancelled at the wrong moment. What state is the connection left in, and who receives the next reply?

## The system
ChatGPT used a Redis cache to keep user information so it did not have to read the database on every request. The service talked to Redis through an open source Python client library that reused connections and handled many requests at the same time.

## Timeline as reported
- On 20 March 2023 users reported seeing the titles of other people's conversations in their sidebar.
- OpenAI took ChatGPT offline for a few hours to investigate.
- The cause was found in the Redis client library: if a request was cancelled after the command was sent but before the reply was read, the connection could return the wrong reply to the next request.
- A change made on the server side that morning had increased the number of cancelled requests, which made the rare bug appear.
- For a small share of paying subscribers, limited payment details of other users could also be visible during a window of about nine hours.
- OpenAI worked with the library maintainers on a fix, restored the service and contacted affected users.

## Root cause
A race in an open source library that left a shared connection out of step with the requests using it, exposed by a change that raised the rate of cancelled requests.

## What changed
- OpenAI said it fixed the library bug with the maintainers and tested the fix.
- It said it added redundant checks that the data returned belongs to the requesting user.
- It said it improved logging and reduced the chance of the cache connection being left in a bad state.

## Lessons learned
- Verify that returned data belongs to the caller, even when a lower layer should guarantee it.
- Treat cancelled and timed out requests as a normal case that needs tests.
- Keep a way to take a service offline quickly when it may be leaking data.
- Open source dependencies are part of your system, so track updates and contribute fixes.

## Trade-offs to weigh
- **Caching against safety.** Shared caches save load and widen the damage of a mix-up.
- **Connection reuse against isolation.** Reuse is fast, and one corrupted connection affects many users.
- **Taking the service down against availability.** Stopping the service protects data and costs trust and revenue.

## Try the calculators
In the retries calculator, see how cancelled and repeated requests change the load. In the capacity calculator, see how much a cache removes from the database and what happens if it is wrong.
