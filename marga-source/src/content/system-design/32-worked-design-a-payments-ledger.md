---
title: Worked design: a payments ledger
minutes: 19
summary: Correct money movement: double-entry records, idempotent requests, transactions and reconciliation, designed to survive retries and failures.
---

In a payments system, a wrong answer is worse than a slow one. Money must not be created, lost or counted twice, even when requests are retried and servers fail halfway. The design leans on a few simple ideas: record every movement as immutable entries that balance, make every request idempotent, and check the books against the outside world regularly.

## What you will learn

- Model money as double-entry, append-only records
- Make payment requests idempotent
- Use transactions and state machines correctly
- Reconcile with external systems and handle failures

## 1. Clarify

Customers pay merchants. The service creates a payment, authorises it with an external processor, captures it, and later refunds some or all of it. Correctness comes first: no double charges, no lost payments, and a complete audit trail. Latency target is under one second for a payment. Availability must not cost correctness, so a brief refusal is better than a wrong answer.

## 2. Estimate

Assume 5 million payments a day, about 60 a second on average and 300 at peak. Each payment writes a handful of ledger entries, so around 1,500 writes a second at peak. This is a modest load for one well-run relational database with replicas, which is why a transactional database is the right default here.

## 3. Double-entry ledger

Every movement of money is a set of entries that sum to zero: a debit on one account and a credit on another. Entries are never updated or deleted. A correction is a new entry that reverses the old one. Balances are derived from entries or kept in a table that is updated in the same transaction. This makes the history auditable and errors visible.

## 4. Idempotency

The client sends an idempotency key with each request. The service stores the key with the result in the same transaction as the ledger entries. A retry with the same key returns the stored result and does nothing new. The same key with different details is rejected. Keys expire after a window such as 24 hours.

## 5. State machine and external calls

A payment moves through states: created, authorised, captured, refunded, failed. Only valid transitions are allowed, enforced by the database. A call to the processor can time out with unknown outcome. Record the attempt before calling, use the processor's own idempotency key, and resolve unknown outcomes by querying the processor or by reconciliation, never by guessing.

## 6. Failure modes

| Failure | Effect | Answer |
| --- | --- | --- |
| Client retries | duplicate charge risk | idempotency key |
| Crash mid-payment | half-done work | single transaction, state machine |
| Processor timeout | unknown outcome | query status, reconcile |
| Database failover | brief errors | synchronous replica, retries with same key |
| Bug writes bad entries | wrong balances | append-only reversal, daily balance checks |
| Processor and ledger disagree | money mismatch | daily reconciliation with alerts |

## 7. Trade-offs

A single database gives strong consistency and simple correctness, at the cost of scaling limits that you can postpone by partitioning per merchant. Strict state machines are rigid but safe. Asynchronous settlement improves throughput but widens the window where records disagree. Say what you would do to scale past one database.

## Two entries that balance

```console
$ psql ledger -c "select entry_id, account, debit, credit from entries where payment_id='pay_81f' order by entry_id"
 entry_id | account        | debit | credit
----------+----------------+-------+--------
 9001     | customer:441   |  50.00 |
 9002     | merchant:77    |        |  48.50
 9003     | fees:platform  |        |   1.50
$ psql ledger -c "select sum(debit)-sum(credit) from entries where payment_id='pay_81f'"
 0.00
```

Debits equal credits, so the payment balances. A check that every payment sums to zero catches many bugs early. The output is a simulated illustration.

## How it fails

A retry charges the customer twice. A crash leaves money debited and not credited. An unknown processor result is guessed. A bug edits history. Reconciliation is skipped and mismatches grow.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Worked design: a payments ledger fits together
node: n1 | Clarify | 0 | 0 | Customers pay merchants. The service creates a payment, authorises it with an external processor, captures it, and later refunds some or all of it. | No reconciliation with the processor. | process
node: n2 | Estimate | 1 | 1 | Assume 5 million payments a day, about 60 a second on average and 300 at peak. | Updating or deleting ledger rows. | process
node: n3 | Idempotency | 2 | 0 | The client sends an idempotency key with each request. | New reference on every retry. | process
node: n4 | State machine and external calls | 3 | 1 | A payment moves through states: created, authorised, captured, refunded, failed. | Record the attempt before calling, use the processor's own idempotency key, and resolve unknown outcomes by querying the processor or by... | store
node: n5 | Trade-offs | 4 | 0 | A single database gives strong consistency and simple correctness, at the cost of scaling limits that you can postpone by partitioning per merchant. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
node: n6 | Two entries that balance | 5 | 1 | Debits equal credits, so the payment balances. | Check the Common mistakes list below this diagram for what usually goes wrong here. | process
edge: n1 | n2
edge: n2 | n3
edge: n3 | n4
edge: n4 | n5
edge: n5 | n6
```

## Incident: The timeout that charged twice

> **Incident:** A payment request to an external processor timed out. The service treated the timeout as a failure and retried with a new reference, but the first request had in fact succeeded. The customer was charged twice.

```console
$ ledgerctl payment pay_81f
state: failed (processor timeout)
attempts: 2 (processor refs: A-1032, A-1033)
$ ledgerctl reconcile --date 2026-03-14
processor captured 2, ledger captured 1: MISMATCH
(this is a simulated illustration, not a real incident)
```

The output is a simulated illustration. Using one idempotency key for all attempts, and resolving an unknown outcome by asking the processor, would have prevented the second charge. Daily reconciliation caught the mismatch quickly.

## Interview question

"Design a payments ledger." Use double-entry append-only records, idempotency keys, transactions with a state machine, treat timeouts as unknown, reconcile daily, and explain how you would scale a single database later.

## Common mistakes

- Updating or deleting ledger rows
- Treating a timeout as a failure
- New reference on every retry
- No reconciliation with the processor

```quiz
Q: What is the purpose of double-entry records?
+ Every movement balances, which makes errors visible and history auditable
- To make rows smaller :: Not the purpose.
- To avoid transactions :: Transactions are used.
- To speed up reads only :: Not the purpose.
> Correct: Every movement balances, which makes errors visible and history auditable. Re-read the matching lesson section for the full reasoning.

Q: How should a timeout from the processor be handled?
+ As an unknown outcome, resolved by querying the processor or reconciling
- As a certain failure :: It may have succeeded.
- As a certain success :: It may have failed.
- Ignored :: Leaves money unaccounted.
> Correct: As an unknown outcome, resolved by querying the processor or reconciling. Re-read the matching lesson section for the full reasoning.

Q: What does an idempotency key prevent?
+ A retried request from creating a second payment
- Slow queries :: Unrelated.
- Disk failures :: Unrelated.
- Network latency :: Unrelated.
> Correct: A retried request from creating a second payment. Re-read the matching lesson section for the full reasoning.

Q: How do you correct a wrong ledger entry?
+ Add a reversing entry and a correct one, keeping history
- Edit the row :: Destroys the audit trail.
- Delete the row :: Destroys the audit trail.
- Ignore it :: Leaves wrong balances.
> Correct: Add a reversing entry and a correct one, keeping history. Re-read the matching lesson section for the full reasoning.
```

```cards
double-entry :: every movement is a debit and an equal credit
idempotency key :: client token that makes a retry safe
append-only :: records are added, never changed
reconciliation :: comparing your records with an external source
```
