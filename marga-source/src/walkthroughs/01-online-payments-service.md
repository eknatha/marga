# An online payments service
level: Advanced
modules: databases, networking, sre
lessons: databases/transactions-and-locking, databases/replication-and-failover, sre/production-readiness-reviews
summary: How a checkout API takes a payment exactly once, records it in a ledger and survives retries, timeouts and a failed database.

This is a teaching design that shows common patterns. It is not the internal design of any real company.

## What it must do

- Accept a payment request from a shop and charge a card through an external card network
- Never charge twice, even when the client retries
- Keep an accurate record of every movement of money
- Stay available during a database or zone failure, and be able to explain every cent afterwards

## The big picture

```diagram
title: Payments service reference design
node: client | Shop backend | 0 | 1 | Calls the payments API with an idempotency key. | Retries after a timeout can duplicate charges without a key.
node: lb | Load balancer and API | 1 | 1 | Terminates TLS, authenticates the caller, rate limits. | A single bad deploy here stops all payments.
node: idem | Idempotency store | 2 | 0 | Remembers the result for each key for a day or more. | If it is lost, retries become new charges.
node: svc | Payment service | 2 | 1 | Creates the payment record and calls the card network. | A slow card network ties up threads and connections.
node: db | Primary database | 3 | 1 | Stores payments and the ledger in transactions. | Losing it without a replica or backup loses money records.
node: queue | Event queue | 3 | 2 | Carries payment events to email, fraud checks and reporting. | A stuck consumer delays receipts but must not block charging.
node: card | Card network | 4 | 0 | The external system that approves or declines the charge. | It can time out after approving, leaving the outcome unknown.
node: replica | Replica and backups | 4 | 1 | Standby copy plus archived logs for recovery. | Lag or an untested restore turns a failure into data loss.
edge: client | lb
edge: lb | svc
edge: svc | idem
edge: svc | db
edge: svc | card
edge: svc | queue
edge: db | replica
```

## A request, step by step

1. The shop sends `POST /payments` with an **idempotency key** (a unique token for this intended payment).
2. The API authenticates the caller and checks the key. If it has been seen, it returns the stored result and stops.
3. The service writes a `pending` payment and a ledger entry in **one database transaction**.
4. It calls the card network with a timeout.
5. On approval it marks the payment `captured` in a second transaction and stores the result under the key.
6. It publishes a `payment.captured` event to the queue. Receipts, fraud analysis and reporting read from there.
7. If the card network times out, the payment stays `unknown`. A background job asks the network for the real status and settles it later.

## Why the design looks like this

- **Idempotency keys** make retries safe. Networks fail after a charge succeeds, and a client that cannot know will retry.
- **A ledger of immutable entries** (debits and credits that sum to zero) is easier to audit than a balance column that is overwritten.
- **Transactions** keep the payment row and ledger rows consistent. Two updates either both commit or both roll back.
- **A queue** decouples slow, non-critical work from the charge path, so a broken email service does not stop payments.
- **Timeouts and circuit breakers** around the card network protect the service from a slow dependency.

## Scaling decisions

- Stateless API instances scale horizontally behind the load balancer.
- The database is the hard part to scale. Start with a larger primary, add read replicas for reporting, and partition by merchant only when one primary no longer suffices.
- Reporting reads go to a replica or a data warehouse, never the primary used for charging.
- Connection pooling keeps many API instances from overloading the database.

## Where it breaks

| Failure | What happens | Defence |
|---------|--------------|---------|
| Client retries after timeout | Duplicate charge | Idempotency keys |
| Card network times out after approval | Customer charged, record unknown | Status reconciliation job |
| Primary database fails | Writes stop | Replica with tested failover, synchronous commit for the ledger |
| Deploy bug in the API | All payments fail | Canary releases, quick rollback, feature flags |
| Queue consumer stuck | Receipts delayed | Dead letter queue, alert on age of oldest message |
| Bad migration locks the payments table | Checkout hangs | Online migrations with lock timeouts |

## Trade-offs

- Synchronous replication protects against losing a payment but adds latency to every charge.
- Strong consistency in the ledger limits how freely you can spread writes across regions.
- Storing the idempotency result in the same database is simpler and consistent. A separate cache is faster but must not lose keys.
- An outage-friendly design (queueing requests for later) risks charging after the user has given up, so many systems fail fast and show an honest error instead.

```predict
Q: The card network approves a charge, but your service times out before reading the reply. The shop retries with the same idempotency key. What should happen?
???
The service finds the existing payment in the unknown state, does not call the network again for a new charge, and resolves the status through reconciliation. The retry returns the stored or pending result.
> Idempotency is about the intent to pay once, not about the number of HTTP calls.
```
