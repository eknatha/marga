# A real-time chat application
level: Intermediate
modules: networking, databases, kubernetes
lessons: networking/latency-mtu-and-network-performance, databases/nosql-caches-and-choosing, kubernetes/service-mesh-and-mtls
summary: How persistent connections, a message bus and a durable store deliver messages quickly, in order, to many people at once.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Deliver a message to everyone in a conversation within a fraction of a second
- Keep messages in order within a conversation and never lose a sent message
- Show who is online and who is typing
- Work on bad networks and let users reconnect without gaps

## The big picture

```diagram
title: Chat reference design
node: client | Client app | 0 | 1 | Keeps one WebSocket open and sends and receives messages. | Mobile networks drop connections constantly.
node: edge | Gateway servers | 1 | 1 | Hold the open connections and authenticate users. | Each holds tens of thousands of sockets, so a restart disconnects them all.
node: bus | Message bus | 2 | 1 | Routes each message to the gateways serving the recipients. | A lagging bus delays every conversation.
node: msg | Message service | 2 | 0 | Validates, assigns a sequence number and stores the message. | Skipping the store before delivery risks losing messages.
node: store | Message store | 3 | 0 | Durable, partitioned by conversation for fast history reads. | A hot conversation overloads one partition.
node: pres | Presence cache | 3 | 2 | Keeps online status with short expiry. | Stale entries show people online who left.
node: push | Push notifications | 2 | 2 | Sends mobile notifications to offline users. | Delays or failures here are seen as lost messages.
edge: client | edge
edge: edge | msg
edge: msg | store
edge: msg | bus
edge: bus | edge
edge: edge | client
edge: edge | pres
edge: msg | push
```

## A message, step by step

1. Alice's app sends a message on its open **WebSocket** to a gateway.
2. The gateway authenticates it and forwards it to the message service.
3. The service assigns a per-conversation **sequence number**, writes the message to the durable store and only then acknowledges it to Alice.
4. The service publishes the message to the bus. The bus delivers it to the gateways that hold connections for the other members.
5. Those gateways push it down each recipient's socket. Offline users get a push notification.
6. When a device reconnects it says "my last sequence number was 1041", and the service replays everything after it.

## Why the design looks like this

- **WebSockets** (or similar persistent connections) avoid the delay of a new request per message.
- **Sequence numbers** give a total order inside a conversation and make gaps detectable, so replay after reconnecting is exact.
- **Write before acknowledge**: the sender sees "sent" only once the message is durable.
- **Partitioning by conversation** keeps each conversation's messages together and spreads load across many nodes.
- A short-lived **presence cache** is fine with eventual accuracy, so it does not need durable storage.

## Scaling decisions

- Gateways scale by connection count, not CPU. Plan memory per connection and file descriptor limits.
- Rolling restarts must drain connections gradually, with clients reconnecting using random delay (jitter) to avoid a stampede.
- Large groups and channels use fan-out on read or tiered delivery, since sending to a million sockets one by one is too slow.
- Hot partitions (a viral channel) need splitting or caching.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Gateway restarts | All its clients reconnect at once | Draining, jittered backoff, spare capacity |
| Bus is slow | Messages arrive late | Backpressure and lag alerts |
| Message store unavailable | New messages cannot be acknowledged | Replicated store, clear error to senders |
| Duplicate delivery after retry | Message shown twice | Client id plus sequence number for de-duplication |
| Clock differences | Messages sorted wrongly | Order by sequence number, not by client time |
| Network partition | Users see a split conversation | Reconcile by sequence on reconnect |

## Trade-offs

- Strict ordering and durability cost latency. Presence and typing indicators trade accuracy for speed.
- End-to-end encryption protects privacy but makes server-side search and spam detection harder.
- Keeping history forever is useful but expensive. Many products tier or expire old messages.

```predict
Q: A gateway with 50,000 connections is restarted for a deploy. What problem can the reconnecting clients cause, and how do you soften it?
???
All 50,000 clients reconnect at the same moment, overloading the other gateways and the authentication path. Drain connections gradually and make clients retry with exponential backoff plus random jitter.
> Reconnect storms turn a small deploy into an outage.
```
