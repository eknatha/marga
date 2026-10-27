# Real-time location tracking for a fleet
level: Advanced
modules: networking, databases, observability
lessons: networking/http-and-tls, databases/nosql-caches-and-choosing, observability/metrics-and-prometheus
summary: How thousands of vehicles send positions every few seconds, how the latest position is kept fast and history is stored cheaply, and how the map updates live.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Accept frequent small updates from many devices over weak networks
- Show the latest position within a few seconds
- Keep a history for reports and replay
- Cope with devices that go offline and come back

## The big picture

```diagram
title: Real-time location tracking reference design
node: dev | Vehicle devices | 0 | 1 | Send position, speed and time every few seconds. | Phones lose signal and send old data in bursts later.
node: edge | Ingest gateway | 1 | 1 | Terminates connections, authenticates devices and rate-limits. | A flood of reconnects after an outage can overload it.
node: stream | Event stream | 2 | 1 | A durable log of position events that several consumers read. | A consumer that falls behind sees stale positions.
node: latest | Latest-position store | 3 | 0 | An in-memory key-value store with one entry per vehicle. | If it restarts empty, maps show nothing until devices report again.
node: hist | History store | 3 | 2 | Time-series or column storage, partitioned by day. | Unbounded history grows the bill without notice.
node: push | Live update service | 3 | 1 | Pushes changes to open map pages over WebSocket or server-sent events. | Many open connections need careful limits and memory.
node: web | Map clients | 4 | 1 | Show vehicles and ask only for the area in view. | Asking for every vehicle makes the page slow.
node: alert | Rules and alerts | 4 | 2 | Detects geofence exits and long stops. | Duplicated or late events cause false alerts.
edge: dev | edge
edge: edge | stream
edge: stream | latest
edge: stream | hist
edge: stream | push
edge: stream | alert
edge: push | web
edge: latest | web
```

## One position update, step by step

1. A device sends a small message with its identity, position and its own timestamp over a persistent connection or a short HTTPS request.
2. The gateway checks the credentials, rejects bad data and writes the event to the stream.
3. One consumer updates the latest-position entry for that vehicle, but only if the timestamp is newer than the stored one.
4. A second consumer appends the event to history storage in batches.
5. The live update service tells every map client whose viewport contains the vehicle to move its marker.
6. The rules consumer checks geofences and raises an alert if the vehicle left its area.

## Why the design looks like this

- An **event stream** lets many consumers read the same data at their own pace. Slow history writes do not slow the live map.
- **Timestamps from the device** and "only newer wins" make late and repeated messages harmless.
- A **separate latest store** answers "where is it now" in a millisecond, without scanning history.
- **Viewport queries** keep each map page small. A user in one city never receives positions from another.
- **Batching writes to history** turns a flood of tiny inserts into a few big ones.

## Scaling decisions

1. Start with one gateway, one stream partition per few thousand devices and a single history table.
2. Partition the stream by vehicle identity, so one vehicle's events stay in order.
3. Reduce update frequency when a vehicle is parked or moving in a straight line.
4. Use geographic tiles to index vehicles so viewport queries stay fast.
5. Move old history to cheaper storage and keep only summaries online.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Reconnect storm | After an outage every device reconnects at once | Jitter in the device retry, connection limits, gateway autoscaling |
| Out-of-order events | A vehicle appears to jump backward | Compare timestamps, keep sequence numbers |
| Stream consumer lag | The map shows old positions | Alert on lag, scale consumers, drop to the newest value when far behind |
| Hot tile | A city centre overloads one partition | Finer tiles, caching, load-aware partitioning |
| History cost growth | Storage costs rise every month | Retention policy, downsampling, cold storage |
| Clock errors on devices | Timestamps are wrong by hours | Validate against server time, store both times |

## Trade-offs

- Updating every second feels live but costs ten times more than every ten seconds. Choose the lowest rate that serves the use case.
- Strict ordering across all vehicles is costly. Ordering per vehicle is enough.
- Pushing every update to every client is simple but wasteful. Pushing only what is in view is more complex and much cheaper.

```predict
Q: A phone was offline for ten minutes and then sends 200 old positions at once. How does the system avoid showing the vehicle jumping around?
???
Each message carries the device timestamp and the latest store accepts only newer ones. The old positions go to history in order, and the map moves the marker only to the newest.
> Design for late data, because mobile networks guarantee it will happen.
```
