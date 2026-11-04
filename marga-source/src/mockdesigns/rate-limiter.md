# Model answer: a rate limiter for an API gateway
prompt: rate-limiter
summary: A shared counter per client with a token bucket, applied at the gateway with a safe fallback.

## The answer in one minute

Identify the caller, keep a token bucket per key in a fast shared store, answer 429 with a Retry-After header when the bucket is empty, and decide up front what happens when the store is down. Rules live in configuration, not code.

## The design

```diagram
title: Rate limiter design
node: cl | Client | 0 | 1 | Calls the API with a key. | A misbehaving client retries instantly.
node: gw | Gateway | 1 | 1 | Extracts the key and asks the limiter. | Adds latency to every call.
node: lim | Limiter logic | 2 | 1 | Token bucket check with an atomic script. | A race gives wrong counts.
node: store | Counter store (Redis) | 3 | 0 | Holds buckets with expiry. | If it fails, the policy must decide.
node: cfg | Rules configuration | 3 | 2 | Limits per plan, route and key. | A wrong rule blocks real users.
node: api | Backend API | 4 | 1 | Receives only allowed calls. | Unprotected if the gateway is bypassed.
edge: cl | gw
edge: gw | lim
edge: lim | store
edge: lim | cfg
edge: gw | api
```

## Every component, explained

### Token bucket

A bucket holds up to N tokens and refills at R per second. Each request takes one token and is rejected when empty. It allows short bursts and a steady average.

Example: A bucket of 100 refilling at 10 a second lets a client burst 100 calls and then sustain 10 a second.

### Key choice

The limit applies to a key such as API key, user or IP address. A good key matches who should pay for the load.

Example: Two users behind one office NAT share an IP, so an API key is fairer than the IP for logged-in calls.

### Atomic update

Read and write of the counter happen in one step, for example a Lua script in Redis. Otherwise two gateways read the same value and both allow.

Example: Two gateways each see 1 token left; the script lets only one succeed.

### Failure policy

Decide whether to fail open (allow) or fail closed (block) when the store is down. Public read APIs often fail open, and expensive or abuse-prone ones fail closed.

Example: If Redis is unreachable the gateway allows reads and blocks password attempts.

### Response contract

Return 429 with Retry-After and headers that show the limit and the remaining count, so clients can back off.

Example: A client reads Retry-After: 12 and waits twelve seconds instead of hammering.

## Numbers to say out loud

- 10000 gateway checks a second need a store that does 100k operations a second with room to spare.
- One bucket per key at 100 bytes means 1 million active keys use about 100 MB.
- Add less than 2 ms for the check, ideally with local caching of decisions.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Store outage | Limits not enforced or all blocked | Explicit fail-open or fail-closed rule, local fallback limits |
| Clock skew | Wrong refill | Use server time in the store |
| Hot key | One bucket overloaded | Shard by key and use local pre-limits |
| Bad rule | Customers blocked | Staged rollout and dry-run mode |
| Retry storm after 429 | More load | Jitter and Retry-After guidance |

## Follow-up questions to expect

- Token bucket or sliding window, and why?
- How do you limit across several regions?
- How would you let a paying customer burst higher?
