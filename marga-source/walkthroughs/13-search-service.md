# A search service with an index and replicas
level: Intermediate
modules: databases, observability, linux
lessons: databases/nosql-caches-and-choosing, databases/replication-and-failover, linux/performance-triage
summary: How a search index is built from a database, kept up to date, split into shards with replicas, and queried quickly.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Answer text queries in under a few hundred milliseconds
- Reflect changes in the source data within seconds or minutes
- Stay available when a node fails
- Allow the index to be rebuilt without downtime

## The big picture

```diagram
title: Search service reference design
node: user | Users | 0 | 1 | Type queries and expect fast, relevant results. | Slow or empty results drive people away.
node: api | Search API | 1 | 1 | Parses the query, applies filters and permissions. | Missing permission filters leak private records.
node: coord | Query coordinator | 2 | 1 | Sends the query to all shards and merges the answers. | One slow shard slows every query.
node: shards | Index shards and replicas | 3 | 1 | Each shard holds part of the index and has copies on other nodes. | Too many small shards waste memory.
node: db | Source database | 1 | 0 | The system of record for the data. | Search must never become the only copy.
node: feed | Change feed | 2 | 0 | Streams inserts, updates and deletes from the database. | A broken feed lets search drift from the truth.
node: indexer | Indexers | 3 | 0 | Turn records into index documents. | A bad mapping change can corrupt the index.
node: mon | Monitoring | 4 | 1 | Query latency, index lag, shard health. | No lag metric means nobody knows results are stale.
edge: user | api
edge: api | coord
edge: coord | shards
edge: db | feed
edge: feed | indexer
edge: indexer | shards
edge: shards | mon
```

## A change and a query, step by step

1. A seller edits a product title in the database.
2. The change feed publishes the update. An indexer reads it, builds the index document and writes it to the right shard.
3. The new data becomes searchable after the next refresh, typically within a second or a few seconds.
4. A user searches. The API adds permission and stock filters and sends the query to the coordinator.
5. The coordinator asks one copy of every shard, collects the top results from each and merges them into one ranked list.
6. The API returns the page of results, and logs the query and its latency.

## Why the design looks like this

- A **separate index** is built for reading text queries, which a normal database does poorly.
- **Sharding** splits the data so many machines work on one query at the same time.
- **Replicas** add query capacity and keep the service up when a node fails.
- A **change feed** keeps the index in step without a nightly rebuild.
- The **database stays the source of truth**, so the index can always be rebuilt from it.

## Scaling decisions

1. Start with a single small cluster, a few shards and one replica each.
2. Watch shard size. Keep shards in the range your engine recommends, and plan the shard count before data grows.
3. Add replicas for more query throughput. Add shards for more data.
4. Use an alias for the index name. Build a new index in the background and switch the alias for a zero-downtime rebuild.
5. Cache popular queries and autocomplete results.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Index lag | Edits do not show up for minutes | Monitor lag, scale indexers, alert on the oldest unprocessed change |
| Node loss | Shards become unavailable or degraded | Replicas on other nodes, rack and zone awareness |
| Mapping mistake | Searches return wrong results after a deploy | Test on a copy, version the mapping, rebuild into a new index |
| Deep pagination | Requests for page 5000 use huge memory | Limit depth, use cursors |
| Expensive query | One wildcard query slows everything | Query timeouts, limits, slow query log |
| Permission leak | Users see records they should not | Always filter by access in the query, test with real roles |

## Trade-offs

- Near-real-time refresh costs CPU. A longer refresh interval indexes faster and shows changes later.
- More shards allow more parallelism but add overhead for every query.
- Running search in the main database is simpler for small data. Past a size or feature need, a separate engine pays off.

```predict
Q: After a mapping change, results look wrong. How can you fix it without downtime?
???
Build a new index with the corrected mapping from the source database, test it, then switch the alias from the old index to the new one. Keep the old index for a short time in case you need to switch back.
> Indexes are rebuildable, so treat changes like a release with a rollback.
```
