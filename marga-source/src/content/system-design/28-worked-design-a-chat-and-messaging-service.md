---
title: Worked design: a chat and messaging service
minutes: 18
summary: A walk through a chat design: connections, delivery guarantees, ordering, presence and what happens when a node or region fails.
---

Chat looks simple until you count connections and promise delivery. Millions of users hold a connection open, messages must arrive once and in order, and people expect it to work on a weak phone network. This worked design follows the six steps from the design method: clarify, estimate, sketch, deep-dive, failure modes and trade-offs.

## What you will learn

- Size a connection-heavy service from users and message rates
- Design delivery with acknowledgements, retries and idempotent message ids
- Keep message order within a conversation
- Plan for gateway loss, reconnect storms and regional failure

## 1. Clarify

Direct messages and small groups up to 200 people, text and attachments by link, delivery receipts, history sync across devices, and a target of 99.95 percent availability. Messages must not be lost and must stay in order within a conversation. Global ordering across conversations is not needed. End-to-end encryption is out of scope for this design but changes where servers can index content.

## 2. Estimate

Assume 50 million daily users, with 10 million connected at peak. Each user sends 40 messages a day, so 2 billion messages a day, about 23,000 a second on average and 70,000 at a 3x peak. A message is about 1 KB with metadata, so 2 TB a day and around 700 TB a year before replication. Connections matter more than requests: with 50,000 connections per gateway, 10 million connections need about 200 gateways plus headroom.

## 3. Sketch

Clients keep a WebSocket to a gateway. The gateway authenticates and forwards messages to a chat service. The service writes each message to a partitioned log and a message store, then finds the recipients' gateways through a session registry and pushes to them. Offline users receive a push notification and sync from the store when they reconnect.

## 4. Deep-dive: ids, order and delivery

Each client generates a message id, so a retry cannot create a duplicate. Within a conversation, the server assigns a sequence number, using the conversation id as the partition key so one node orders it. The client acknowledges each message by sequence number, and the server retries unacknowledged messages. On reconnect the client says "my last sequence is 812" and the server sends what follows.

## 5. Deep-dive: presence and fan-out

Presence changes often and few people need every change. Update presence from heartbeats with a time-to-live, and send it only to users who have the contact open. For a group of 200, fan out by looking up each member's gateway. For very large channels, switch to pull: clients fetch from the log, and the server pushes only a light "new messages" signal.

## 6. Failure modes

| Failure | Effect | Design answer |
| --- | --- | --- |
| Gateway dies | 50,000 clients disconnect | clients reconnect with jittered backoff, session registry expires entries by ttl |
| Reconnect storm | the others overload | admission control, backoff with jitter, slow ramp |
| Chat node dies | one partition stalls | leader election per partition, replicas |
| Store partition slow | writes lag | log accepts first, store catches up, alert on lag |
| Region lost | users there offline | users homed per region, failover with replicated logs |
| Duplicate send | double message | client ids make writes idempotent |

## 7. Trade-offs

Per-conversation ordering is cheap, global ordering is not worth its cost. Pushing through gateways gives low latency but needs a registry that can be briefly wrong, so delivery relies on acknowledgements, not on the registry. Storing every message forever is simple, but old data should move to cheaper storage. Say what you would revisit at ten times the scale.

## Sketching the capacity numbers

```console
$ python3 -c "dau=50_000_000; per_day=dau*40; avg=per_day/86_400; print(per_day, round(avg), round(avg*3), 'gateways', 10_000_000/50_000)"
2000000000 23148 69444 gateways 200.0
```

Two lines of arithmetic give the load: about 23,000 messages a second on average and around 70,000 at peak, with 200 gateways for ten million connections.

## How it fails

Duplicate messages after a retry. A reconnect storm that overloads the gateways. Order lost because two nodes handle one conversation. A registry that says a user is online when they are not, so messages are pushed into the void.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Worked design: a chat and messaging service fits together
node: n1 | Clarify | 0 | 0 | Direct messages and small groups up to 200 people, text and attachments by link, delivery receipts, history sync across devices, and a target of 99.95 percent... | Trying to guarantee global ordering. | process
node: n2 | Estimate | 1 | 1 | Assume 50 million daily users, with 10 million connected at peak. | Ignoring connection counts and sizing only by requests. | process
node: n3 | Deep-dive: ids, order and delivery | 2 | 0 | Each client generates a message id, so a retry cannot create a duplicate. | Relying on the session registry for delivery guarantees. | process
node: n4 | Deep-dive: presence and fan-out | 3 | 1 | Presence changes often and few people need every change. | No jittered backoff on clients. | process
node: n5 | Trade-offs | 4 | 0 | Per-conversation ordering is cheap, global ordering is not worth its cost. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n6 | Sketching the capacity numbers | 5 | 1 | Two lines of arithmetic give the load: about 23,000 messages a second on average and around 70,000 at peak, with 200 gateways for ten million connections. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
edge: n5 | n6
```

## Incident: When everyone reconnected at once

> **Incident:** A gateway cluster restarted after a deployment. Every client reconnected within seconds, which overloaded authentication and the session registry, so many clients retried and made the overload last longer.

```console
$ kubectl get pods -l app=gateway
NAME         READY   STATUS             RESTARTS
gateway-7    0/1     CrashLoopBackOff   6
$ curl -s auth.internal/metrics | grep login_rate
login_rate 41000/s (capacity 9000/s)
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration of a reconnect storm. Clients that back off with jitter, a server that sheds excess logins, and a slow, staged restart keep a deployment from turning into an outage.

## Interview question

"Design a chat service for 50 million daily users." Use the numbers above, choose WebSocket gateways, partition by conversation for ordering, client ids for idempotency, acknowledgements for delivery, and walk the failure table, especially reconnect storms.

## Common mistakes

- Ignoring connection counts and sizing only by requests
- Relying on the session registry for delivery guarantees
- No jittered backoff on clients
- Trying to guarantee global ordering

```quiz
Q: Why partition messages by conversation id?
+ One node can order the messages of a conversation cheaply
- To spread users by country :: Not the reason.
- To avoid acknowledgements :: They are still needed.
- To encrypt messages :: Unrelated.
> Correct: One node can order the messages of a conversation cheaply. Re-read the matching lesson section for the full reasoning.

Q: How does the design prevent duplicate messages after a retry?
+ The client supplies a message id so the write is idempotent
- The server never retries :: Retries are needed.
- Messages are numbered by time only :: Not safe.
- Gateways deduplicate by IP :: Wrong key.
> Correct: The client supplies a message id so the write is idempotent. Re-read the matching lesson section for the full reasoning.

Q: What helps most against a reconnect storm?
+ Jittered backoff on clients and admission control on the server
- Immediate retries :: Makes it worse.
- A smaller gateway fleet :: Reduces capacity.
- No timeouts :: Clients hang.
> Correct: Jittered backoff on clients and admission control on the server. Re-read the matching lesson section for the full reasoning.

Q: Why drive delivery with acknowledgements instead of the session registry?
+ The registry can be briefly wrong, while acknowledgements confirm real receipt
- Registries are always right :: They can be stale.
- Acknowledgements are slower to build :: Not the reason.
- Registries cost nothing :: Not the reason.
> Correct: The registry can be briefly wrong, while acknowledgements confirm real receipt. Re-read the matching lesson section for the full reasoning.
```

```cards
WebSocket :: a long-lived two-way connection between client and server
idempotent write :: repeating it gives the same result as doing it once
sequence number :: per-conversation counter used for ordering and sync
reconnect storm :: many clients reconnecting together after an outage
```
