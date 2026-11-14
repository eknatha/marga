## GPU idle but pods pending
level: mid
All GPUs are allocated but utilisation is low.

```text
$ kubectl describe node gpu-1 | grep nvidia.com/gpu
nvidia.com/gpu: 8 allocated 8
$ nvidia-smi --query-gpu=utilization.gpu --format=csv
12 %
```
? What is happening?
+ Pods hold whole GPUs but use a fraction; share with MIG or time slicing
- The GPUs are broken
- Too many nodes
why: Whole GPU requests waste capacity for small workloads.

## Search returns stale answers
level: mid
A chatbot cites an old policy.

```text
$ psql -c "select max(updated_at) from chunks"
2026-08-02
```
? What is the likely cause?
+ The ingestion pipeline stopped, so re-index and alert on freshness
- The model is lazy
- The prompt is short
why: Retrieval quality depends on fresh data.

## Vector search is slow
level: mid
Queries take two seconds.

```text
$ psql -c "explain select * from chunks order by embedding <-> $1 limit 5"
Seq Scan on chunks
```
? What helps?
+ Create an approximate nearest neighbour index such as HNSW and tune it
- Add more columns
- Use bigger vectors
why: A sequential scan compares every vector.

## Provider rate limit hit
level: mid
Requests fail during peak with 429.

```text
$ tail gateway.log
429 Too Many Requests: tokens per minute
```
? What gateway features help?
+ Queueing, retries with backoff, fallbacks to another model and per team limits
- Disable limits
- Retry instantly
why: A gateway smooths bursts and protects shared quotas.

## Bad answers with no trace
level: senior
Users report wrong answers and nobody can reproduce them.

```text
$ grep -c prompt app.log
0
```
? What should you add?
+ Trace each request with prompt, retrieved chunks and model, plus evaluation sets
- More replicas
- Longer timeouts
why: You cannot fix what you cannot see.

## Cost doubled
level: senior
The token bill doubled in a month.

```text
$ cat usage.csv | sort -k3 -n | tail -1
summary-batch 980M tokens
```
? How do you respond?
+ Find the top consumers, add caching and limits, and move easy tasks to smaller models
- Ignore it
- Raise the budget
why: Cost is controlled by visibility, caching and routing.
