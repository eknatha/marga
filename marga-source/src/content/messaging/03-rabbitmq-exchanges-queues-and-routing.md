---
title: RabbitMQ: exchanges, queues and routing
minutes: 13
summary: Understand RabbitMQ's model of producers, exchanges, bindings and queues, and choose direct, topic, fanout and headers exchanges.
---

RabbitMQ is a widely used message broker built on AMQP. Its power is in routing: the producer does not know which queues exist, only the exchange and a routing key. Learning that one layer of indirection makes the rest of RabbitMQ easy to reason about.

## What you will learn

- Producers, exchanges, bindings and queues
- Direct, topic, fanout and headers exchanges
- Durability and persistence
- Virtual hosts, users and the management interface

## The model

A **producer** publishes a message to an **exchange** with a **routing key**. The exchange applies its rules to **bindings** (links from the exchange to queues) and copies the message into each matching **queue**. **Consumers** read from queues.

| Exchange | Routes by |
|---|---|
| direct | Exact match of routing key to binding key |
| topic | Pattern match: `orders.*.eu`, `#` for everything |
| fanout | Every bound queue, ignoring the key |
| headers | Message header values |

```console
$ rabbitmqadmin declare exchange name=events type=topic durable=true
$ rabbitmqadmin declare queue name=billing durable=true
$ rabbitmqadmin declare binding source=events destination=billing routing_key='order.paid.#'
$ rabbitmqadmin publish exchange=events routing_key=order.paid.eu payload='{"id":4411}'
```

## Durability

Messages survive a broker restart only if the **queue is durable** and the **message is persistent**. For stronger safety use **quorum queues**, which replicate across nodes using a consensus protocol and are the recommended type for important data. Classic non-replicated queues lose messages if their node is lost.

## Virtual hosts and access

A **vhost** is an isolated namespace of exchanges, queues and permissions. Use one per environment or application. Give each service its own user with permissions only on its vhost. The management UI (port 15672) and `rabbitmqctl list_queues` show message counts, consumers and rates.

```diagram
title: How RabbitMQ routes a message
node: prod | Producer | 0 | 0 | Publishes to an exchange with a routing key. | Publishing to a missing exchange fails or the message is dropped.
node: ex | Exchange | 1 | 0 | Applies routing rules to decide which queues get a copy. | A wrong binding silently drops messages that match nothing.
node: q1 | Billing queue | 2 | 0 | Bound with order.paid.# and read by billing. | Not durable means messages vanish on restart. | queue
node: q2 | Search queue | 2 | 1 | Bound to the same key for another consumer. | A slow consumer fills memory and disk. | queue
node: cons | Consumers | 3 | 0 | Read, process and acknowledge messages. | No consumer means the queue only grows.
edge: prod | ex
edge: ex | q1
edge: ex | q2
edge: q1 | cons
```

## Incident: The messages that matched nothing

> **Incident:** A new routing key had a typo and an exchange dropped events with no error.

```console
$ rabbitmqctl list_exchanges name type
events topic
management: events unroutable_dropped 3210
binding: events -> billing  (order.paid.#)
```

The producer published order.payed.eu, which matched no binding, so the exchange dropped the messages. The team turned on the mandatory flag and an alternate exchange for unroutable messages, and added an alert on the dropped count.

## Common mistakes

- Publishing to the default exchange with a queue name everywhere
- Non-durable queues for important work
- One shared user and vhost for every application
- No alert for unroutable messages

```quiz
Q: Where do producers publish in RabbitMQ?
+ To an exchange
- Directly to a consumer :: No.
- To a disk :: No.
- To a vhost only :: No.
> Exchanges apply the routing.

Q: Which exchange type matches patterns like order.*?
+ topic
- fanout :: No.
- direct only :: No.
- none :: No.
> Topic exchanges use patterns.

Q: What makes a message survive a restart?
+ A durable queue and a persistent message
- A longer routing key :: No.
- A bigger consumer :: No.
- A second exchange :: No.
> Both parts are needed.

Q: What are quorum queues for?
+ Replicated, safer queues for important data
- Faster plain queues :: No.
- Logging :: No.
- Temporary data :: No.
> They replicate across nodes.
```

```cards
Exchange :: The entry point that routes messages to queues
Binding :: A rule linking an exchange to a queue
Routing key :: A label a producer attaches to guide routing
Quorum queue :: A replicated queue type using consensus
Vhost :: An isolated namespace inside one broker
```
