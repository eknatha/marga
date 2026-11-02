---
title: Worked design: a news feed and timeline
minutes: 18
summary: Design a feed for a social product: fan-out on write versus read, ranking, hot accounts and cache failures.
---

A feed shows each user a recent, ranked list of posts from people they follow. Reading is far more common than writing, and a few accounts have millions of followers. The whole design is a choice between doing work when a post is written and doing it when the feed is read. This lesson works through that choice and its failure modes.

## What you will learn

- Compare fan-out on write with fan-out on read
- Handle accounts with millions of followers
- Combine ranking with a cached candidate list
- Protect the feed from cache and ranking failures

## 1. Clarify

Users follow others, post short items with media links, and open a home feed of recent posts from those they follow. The feed should load in under 300 milliseconds and show a new post within a few seconds. A user may follow up to 5,000 accounts. Perfect freshness is not required, and a slightly stale feed is better than an empty one.

## 2. Estimate

Assume 100 million daily users who open the feed 10 times a day, so a billion feed reads a day, about 12,000 a second and 35,000 at peak. Posts are 100 times fewer: 10 million a day, about 120 a second. Each post is delivered to the feeds of followers; with an average of 200 followers that is 2 billion feed insertions a day, about 23,000 a second.

## 3. Fan-out on write

When a post is created, the system pushes its id into the feed list of every follower, held in a cache such as a sorted set per user. Reads are then very fast: take the latest ids and fetch the posts. The cost is write amplification, which is acceptable for ordinary accounts and a problem for an account with 20 million followers.

## 4. Fan-out on read

The feed is built when the user opens it: fetch recent posts from each followed account and merge them. Writes are cheap, but reads are expensive and slow for users who follow many accounts. This suits rarely active users, where precomputing is wasted.

## 5. The hybrid

Use write fan-out for normal accounts and read-time merge for celebrity accounts. At read time, take the user's precomputed list, then merge in recent posts from the few high-follower accounts they follow. A threshold such as 100,000 followers decides which path an account uses. Skip write fan-out for inactive users and build their feed on first return.

## 6. Ranking and failure modes

Rank a few hundred candidates with a lightweight model, and fall back to reverse-chronological order if the ranker is slow.

| Failure | Effect | Answer |
| --- | --- | --- |
| Feed cache node lost | some feeds empty | rebuild from the post store on demand, serve stale |
| Celebrity posts | write spike | read-time merge for those accounts |
| Ranker slow | feed latency | strict timeout, chronological fallback |
| Post store slow | partial feeds | show cached items and mark gaps |
| Delete or block | removed items remain | filter at read time against a deletion set |

## 7. Trade-offs

Write fan-out spends storage and write work to buy fast reads. The hybrid avoids the worst case at the price of two code paths. Ranking improves engagement but needs a fallback, so the feed never goes blank. Say how freshness, cost and complexity trade, and what you would change for ten times the users.

## Counting feed insertions

```console
$ python3 -c "inserts=10_000_000*200; print(inserts, round(inserts/86_400), 'celebrity post inserts', 20_000_000)"
2000000000 23148 celebrity post inserts 20000000
```

The average account is fine for write fan-out, but one post from an account with 20 million followers would create 20 million inserts at once. That is why celebrities use read-time merge.

## How it fails

A celebrity post floods the write path. The cache is lost and every feed rebuilds at once. The ranker adds seconds of latency. Deleted posts keep showing. A user who follows thousands of accounts times out.

## Incident: A post from an account with millions of followers

> **Incident:** A very popular account posted during a busy hour. The system pushed the post into millions of feed lists in a burst, which queued behind ordinary writes and delayed everyone's feed by several minutes.

```console
$ queuectl depth feed-fanout
queue          depth      oldest
feed-fanout    18400000   412s
$ queuectl top-producers feed-fanout
account:88231  17900000 pending
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. Moving high-follower accounts to read-time merge, and putting their fan-out in a separate queue with limits, keeps one post from delaying everyone.

## Interview question

"Design a news feed." Estimate reads and writes, compare write and read fan-out, propose the hybrid with a follower threshold, add ranking with a chronological fallback, and discuss celebrity posts and cache failure.

## Common mistakes

- Fan-out on write for every account
- No fallback when ranking is slow
- Ignoring deletes and blocks
- Rebuilding every feed at once after a cache loss

```quiz
Q: What is the main cost of fan-out on write?
+ Write amplification for accounts with many followers
- Slow reads :: Reads are fast.
- No caching possible :: Caches are used.
- Lost posts :: Not the cost.
> Correct: Write amplification for accounts with many followers. Re-read the matching lesson section for the full reasoning.

Q: Why use a hybrid approach?
+ Ordinary accounts use write fan-out and very popular accounts use read-time merge
- To remove all caches :: Caches stay.
- To rank without models :: Unrelated.
- To delete old posts :: Unrelated.
> Correct: Ordinary accounts use write fan-out and very popular accounts use read-time merge. Re-read the matching lesson section for the full reasoning.

Q: What should happen when the ranker is slow?
+ Fall back to a chronological feed after a timeout
- Show an error :: Worse than a fallback.
- Wait indefinitely :: Hangs the feed.
- Stop posting :: Unrelated.
> Correct: Fall back to a chronological feed after a timeout. Re-read the matching lesson section for the full reasoning.

Q: How are deleted posts hidden from cached feeds?
+ Filter against a deletion set at read time
- Wait for the cache to expire :: Shows deleted items for too long.
- Ignore deletions :: Wrong.
- Block the user :: Unrelated.
> Correct: Filter against a deletion set at read time. Re-read the matching lesson section for the full reasoning.
```

```cards
fan-out on write :: push each post into follower feeds at post time
fan-out on read :: merge followed accounts when the feed is opened
hot account :: an account with a very large follower count
fallback ranking :: a simple order used when the ranker is slow
```
