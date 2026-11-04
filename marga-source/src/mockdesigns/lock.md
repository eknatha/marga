# Model answer: a distributed lock service
prompt: lock
summary: A lease-based lock on top of a consensus store with fencing tokens, because a lock alone cannot stop a slow client.

## The answer in one minute

Store locks in a consensus system such as etcd or ZooKeeper, grant them as leases with a timeout, and return a monotonically increasing fencing token that the protected resource checks. Without the token a paused client can still write after its lease expired.

## The design

```diagram
title: Distributed lock service design
node: c1 | Client A | 0 | 0 | Holds the lock and does work. | A long pause makes its lease expire.
node: c2 | Client B | 0 | 2 | Waits for the lock. | Polling wastes load.
node: api | Lock API | 1 | 1 | Acquire, renew and release. | Accepts requests only on the leader.
node: raft | Consensus cluster | 2 | 1 | Replicated, ordered state. | Losing quorum stops locks.
node: lease | Lease and expiry | 3 | 0 | Time-limited ownership. | Clock assumptions can fail.
node: tok | Fencing token | 3 | 2 | Counter that grows with each grant. | Resources that ignore it are unsafe.
node: res | Protected resource | 4 | 1 | Rejects writes with an old token. | Without checks, two writers corrupt data.
edge: c1 | api
edge: c2 | api
edge: api | raft
edge: raft | lease
edge: raft | tok
edge: tok | res
```

## Every component, explained

### Consensus store

The lock state lives in a replicated log agreed by a majority, so a single node failure does not lose or duplicate locks.

Example: With 5 nodes, 3 must agree, and the service continues if 2 fail.

### Lease

A lock is granted for a time such as 10 seconds. The holder renews it. If the holder dies, the lease expires and others can take it.

Example: Client A crashes; after 10 seconds client B acquires the lock.

### Fencing token

Each grant returns a larger number. The storage service remembers the highest it has seen and rejects lower ones.

Example: A gets token 33, pauses, loses the lease; B gets 34 and writes; A wakes and writes with 33 and is rejected.

### Waiting and watches

Clients wait by watching the lock key, not by polling, and the next waiter is woken when it is released.

Example: B watches the key and is notified within milliseconds of A releasing it.

### When not to lock

If the work is idempotent or can use a conditional write, a lock may be unnecessary and add risk.

Example: Use compare-and-set on a version column instead of a lock for a counter update.

## Numbers to say out loud

- A 5-node consensus cluster handles thousands of lock operations a second.
- Renew at one third of the lease time so one missed heartbeat is not fatal.
- Typical leases are 5 to 30 seconds; shorter means faster recovery and more load.

## What goes wrong

| Failure | Effect | Defence |
|---------|--------|---------|
| Client pause | Two holders | Fencing tokens checked by the resource |
| Leader failover | Brief unavailability | Retry with backoff |
| Clock jump | Early expiry | Use monotonic clocks locally and store-side expiry |
| Quorum loss | No locks granted | Fail safe, alert, restore nodes |
| Lock leak | Never released | Leases, not permanent locks |

## Follow-up questions to expect

- Why is Redis SETNX alone not safe?
- What happens during a network partition?
- How would you build a leader election on this?
