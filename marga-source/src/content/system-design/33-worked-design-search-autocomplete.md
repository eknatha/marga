---
title: Worked design: search autocomplete
minutes: 17
summary: Suggest completions in a few milliseconds: prefix indexes, ranking, freshness and how to degrade gracefully under load.
---

Autocomplete is a latency problem. A person types a letter and expects suggestions before the next keystroke, so the budget is tens of milliseconds. The data structure is simple, the interesting parts are ranking suggestions, keeping them fresh, and surviving a burst of traffic, since every keystroke is a request.

## What you will learn

- Size a request-per-keystroke service
- Choose a prefix index and a cache layer
- Rank and refresh suggestions
- Degrade safely when load or dependencies fail

## 1. Clarify

The user types into a search box and sees up to ten suggestions after each keystroke. Suggestions come from popular past queries, filtered for safety. Latency must stay under 50 milliseconds at the 99th percentile. Suggestions may be minutes old, but a failure must never block the search box itself.

## 2. Estimate

Assume 200 million searches a day with six keystrokes on average that trigger suggestions, so 1.2 billion requests a day, about 14,000 a second and 40,000 at peak. The index of the top ten million queries at 50 bytes each is about 500 MB, small enough to hold in memory on every serving node.

## 3. Prefix index

Store queries in a trie or a sorted structure, and for each prefix keep the top ten suggestions precomputed. A lookup is then a single map read. Limit prefix length, for example the first 20 characters, and normalise case and accents so near-identical typings share entries.

## 4. Caching and the client

Most keystroke sequences repeat, so cache by prefix at the edge for a short time. The client waits a small delay after typing, called debouncing, cancels outdated requests, and caches earlier results. Together these can cut the load by more than half and reduce wasted work.

## 5. Ranking and freshness

Rank suggestions by recent popularity, with a decay so old trends fade, and personalise lightly if the user allows it. Build the index offline from query logs every few minutes to hours, then ship it to serving nodes as a versioned file. A separate fast path can inject trending queries quickly, with an expiry.

## 6. Failure modes

| Failure | Effect | Answer |
| --- | --- | --- |
| Serving node dies | fewer replicas | load balancer health checks, many replicas |
| Bad index build | wrong suggestions | validate size and samples, staged rollout, rollback |
| Traffic spike | latency rises | shed load, serve from cache, drop personalisation |
| Offensive suggestion | reputation harm | blocklist filter at build time and at serve time |
| Log pipeline lags | stale suggestions | alert on index age, keep last good index |
| Backend down | no suggestions | the search box still works, show nothing |

## 7. Trade-offs

Precomputing the top ten per prefix costs memory and rebuild time, and buys speed. Fresher indexes cost more compute. Personalisation helps relevance but breaks sharing of cache entries between users. Choose the simplest design that meets the latency target, and say what you would change if the index grew a hundred times.

## Checking an index before rollout

```console
$ acindex validate --file index-2026-03-14T10.bin
entries: 9,874,102  (previous 9,861,550)  size change +0.1%
sample prefixes checked: 500, empty results: 3
blocklist hits: 0
$ acindex rollout --file index-2026-03-14T10.bin --stage 5%
```

A new index is checked for size, sample coverage and blocked terms before a small staged rollout. If the check fails, the last good index stays in place. The output is a simulated illustration.

## How it fails

A bad index build ships to every node. A traffic spike at a big event overloads serving. An offensive suggestion appears. Debouncing is missing, so every keystroke is a request. The index is hours old and nobody notices.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Worked design: search autocomplete fits together
node: n1 | Clarify | 0 | 0 | The user types into a search box and sees up to ten suggestions after each keystroke. | Requests on every keystroke with no debouncing. | process
node: n2 | Estimate | 1 | 1 | Assume 200 million searches a day with six keystrokes on average that trigger suggestions, so 1.2 billion requests a day, about 14,000 a second and 40,000 at peak. | Shipping a new index to every node at once. | process
node: n3 | Caching and the client | 2 | 0 | Most keystroke sequences repeat, so cache by prefix at the edge for a short time. | No blocklist at serving time. | client
node: n4 | Ranking and freshness | 3 | 1 | Rank suggestions by recent popularity, with a decay so old trends fade, and personalise lightly if the user allows it. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n5 | Trade-offs | 4 | 0 | Precomputing the top ten per prefix costs memory and rebuild time, and buys speed. | Personalisation helps relevance but breaks sharing of cache entries between users. | process
node: n6 | Checking an index before rollout | 5 | 1 | A new index is checked for size, sample coverage and blocked terms before a small staged rollout. | If the check fails, the last good index stays in place. | observe
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
edge: n5 | n6
```

## Incident: A suggestion nobody should have seen

> **Incident:** A new index included a phrase that appeared in a burst of spam queries. It showed up as a suggestion for a common word, and users saw it for several hours before the next build.

```console
$ acindex lookup "how to"
1 how to tie a tie
2 how to <redacted spam phrase>
$ acindex blocklist check --index current
hits: 1
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. A blocklist filter at build time and at serving time, plus a fast way to remove one entry without a full rebuild, limits how long a bad suggestion can live.

## Interview question

"Design search autocomplete." Estimate requests per keystroke, hold a prefix to top-ten map in memory, cache at the edge with client debouncing, rebuild offline with staged rollout, add a blocklist, and shed load under spikes.

## Common mistakes

- Requests on every keystroke with no debouncing
- Shipping a new index to every node at once
- No blocklist at serving time
- Letting autocomplete failures break the search box

```quiz
Q: Why precompute the top suggestions for each prefix?
+ A lookup becomes one map read, which meets the latency target
- To save memory :: It uses more memory.
- To avoid caching :: Caches still help.
- To remove ranking :: Ranking still happens.
> Correct: A lookup becomes one map read, which meets the latency target. Re-read the matching lesson section for the full reasoning.

Q: What does debouncing do on the client?
+ Waits briefly after typing before sending a request
- Encrypts requests :: Not its purpose.
- Blocks typing :: Not its purpose.
- Deletes history :: Not its purpose.
> Correct: Waits briefly after typing before sending a request. Re-read the matching lesson section for the full reasoning.

Q: How do you limit the damage of a bad index build?
+ Validate it and roll it out in stages with the last good index kept for rollback
- Ship to everyone :: Maximum risk.
- Skip validation :: Misses problems.
- Delete the old index :: No rollback.
> Correct: Validate it and roll it out in stages with the last good index kept for rollback. Re-read the matching lesson section for the full reasoning.

Q: What should happen if the suggestion service is down?
+ The search box still works, with no suggestions shown
- Block all searches :: Too harsh.
- Show an error page :: Too harsh.
- Retry forever :: Hangs the page.
> Correct: The search box still works, with no suggestions shown. Re-read the matching lesson section for the full reasoning.
```

```cards
trie :: a tree keyed by characters used for prefix lookup
debouncing :: waiting briefly after input before sending a request
blocklist :: terms that must never be suggested
staged rollout :: release to a small share first, then widen
```
