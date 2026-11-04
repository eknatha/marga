# Model answer: a chat service with groups and history
prompt: chat
summary: Persistent connections, a per-conversation ordered log, fan-out on write for small groups and a history store.

## The answer in one minute

Clients hold WebSocket connections to gateway servers. Messages go to a conversation service that assigns a sequence number, stores them durably and fans out to online members, while offline members receive them on reconnect from history or a push notification.

## The design

```diagram
title: Chat service design
node: cli | Clients | 0 | 1 | Apps with a WebSocket. | Mobile networks drop often.
node: gw | Connection gateways | 1 | 1 | Hold sockets, route messages. | A restart drops many connections.
node: conv | Conversation service | 2 | 0 | Assigns order and persists. | A hot group is one hot partition.
node: pres | Presence and routing | 2 | 2 | Knows which gateway holds each user. | Stale routing loses messages.
node: store | Message store | 3 | 1 | Partitioned by conversation, ordered by sequence. | Unbounded history grows costs.
node: push | Push notifications | 4 | 0 | Wake offline devices. | Provider delays.
node: media | Media storage | 4 | 2 | Images and files in object storage. | Large uploads through the chat path.
edge: cli | gw
edge: gw | conv
edge: conv | pres
edge: conv | store
edge: conv | push
edge: conv | media
```

## Every component, explained

### WebSocket gateways

Long-lived connections keep a channel open for instant delivery. Gateways are stateless apart from the open sockets.

Example: A phone connects to gateway 14, and presence records user 7 -> gateway 14.

### Ordering

The conversation service gives each message the next sequence number in that conversation. Clients show messages in that order and ask for gaps.

Example: Two people send at once; one gets 101 and the other 102, and everyone sees the same order.

### Fan-out

For each message, the service looks up members and sends it to their gateways. Large channels use fan-out on read instead.

Example: A 5-person chat sends 4 deliveries; a 100000-member channel is read from the log by clients.

### History store

Messages are partitioned by conversation id with the sequence number as sort key, so reading recent history is one range read.

Example: Opening a chat loads the latest 50 messages with a single query.

### Offline delivery

If a user has no connection, a push notification is sent and messages wait. On reconnect the client asks for everything after its last sequence number.

Example: After a flight, the phone reconnects and fetches messages 340 to 392.

## Numbers to say out loud

- 10 million users online with 1 message per minute each is about 170000 messages a second.
- 100 bytes of text per message and 3 copies: about 50 GB a day per 100 million messages.
- Each gateway holds 100000 sockets at a few KB each, so 100 gateways serve 10 million.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Gateway crash | Mass reconnect | Jittered reconnect and spare capacity |
| Hot conversation | Slow partition | Split large channels, rate limit |
| Message loss | Missing chat | Acknowledgements and resend by sequence |
| Presence stale | Delivery to wrong place | Short leases and fallback to push |
| Abuse | Spam and harassment | Rate limits, reporting and moderation |

## Follow-up questions to expect

- How do you do read receipts?
- How do you support end-to-end encryption?
- How do you search history?
