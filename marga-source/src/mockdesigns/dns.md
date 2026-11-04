# Model answer: an authoritative DNS service
prompt: dns
summary: Anycast name servers in several places serve signed zones from memory, fed by a validated pipeline from a source of truth.

## The answer in one minute

Keep zone data in a source of truth, validate and sign it, push it to name servers in many locations announced with anycast, and serve answers from memory. Monitor with probes from outside and protect against floods.

## The design

```diagram
title: Authoritative DNS design
node: res | Resolvers | 0 | 1 | Ask for records and cache answers. | Cached bad data lasts as long as the TTL.
node: any | Anycast edge | 1 | 1 | Same address announced from many sites. | A bad route announcement hides a site.
node: ns | Name servers | 2 | 0 | Answer from memory. | Query floods and amplification.
node: zone | Zone distribution | 2 | 2 | Publishes validated, signed zones. | A broken zone goes everywhere.
node: src | Source of truth and API | 3 | 1 | Records edited through review. | Manual edits cause outages.
node: sign | DNSSEC signing | 4 | 0 | Signs records and rolls keys. | Expired signatures break resolution.
node: mon | Probes and monitoring | 4 | 2 | Checks answers from outside. | Internal checks miss routing problems.
edge: res | any
edge: any | ns
edge: ns | zone
edge: zone | src
edge: src | sign
edge: sign | mon
```

## Every component, explained

### Anycast

Many servers share one IP and the network routes each resolver to the nearest. A failed site withdraws its route and traffic moves on.

Example: A resolver in Frankfurt reaches the Frankfurt site, and if it fails, Amsterdam answers the same IP.

### Zone pipeline

Changes go through review, syntax and consistency checks, and a canary push before global release.

Example: A record that points a CNAME at the zone apex fails validation and never ships.

### TTL choice

The time to live sets how long caches keep an answer. Short TTLs allow quick changes and raise load.

Example: Before a migration the TTL is lowered from 3600 to 60 seconds a day ahead.

### DNSSEC

Records are signed so resolvers can detect forgery. Keys are rotated on a schedule with overlap.

Example: A signature set to expire on Saturday is renewed on Thursday by automation.

### DDoS protection

Rate limiting, response rate limits and enough capacity absorb floods and avoid amplification.

Example: Repeated identical queries from one prefix receive truncated or rate-limited answers.

## Numbers to say out loud

- One server answers 100000 to 1 million queries a second from memory.
- 10 million queries a second needs 20 or more servers across sites with headroom.
- A zone of 1 million records is tens of MB and loads in seconds.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Bad zone push | Wrong answers worldwide | Validation, canary, fast rollback |
| Signature expiry | Resolution fails for validating resolvers | Automated renewal and alerts |
| Site loss | Capacity drop | N+2 capacity, route withdrawal |
| Amplification abuse | Traffic used against others | Response rate limiting |
| Long TTL on a bad record | Slow recovery | Sensible TTLs and change process |

## Follow-up questions to expect

- How do you do a safe migration of a record?
- What changes with a million zones?
- How do you test failover?
