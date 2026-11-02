## The region that was never drilled
module: system-design
level: Advanced
minutes: 8
lesson: system-design/multi-region-and-global-traffic
summary: Region A fails and the standby region has never carried full load. Decide, fail over and protect the core.
intro: At 14:05 region A loses its database primary. Region B is a warm standby that nobody has failed over to in two years. Error rates are at 40 percent.

### s1
text: Customers are failing. What do you do first?
- Declare an incident, confirm region B health and replica lag, and decide on failover with the owner of the RPO => s2 | 2 | A failover can lose recent writes, so confirm lag and decision rights. Example: Lag is 4 seconds, within the 30 second RPO.
- Fail over immediately without checking lag => s2 | 1 | Fast but blind. Example: You discover lag was 12 minutes after traffic moved.
- Wait for region A to recover on its own => s2 | 0 | No bound on the outage. Example: Forty minutes pass.

### s2
text: Region B is promoted. Load shifts and region B reaches 115 percent of capacity. What now?
- Shed low priority work such as exports and analytics, keep payments and login, and scale out in B => s3 | 2 | Protect the core while capacity arrives. Example: Exports return 503 with Retry-After and payments stay under 200 ms.
- Send half of the traffic back to region A => s3 | 1 | Region A is down. Example: Half the requests fail again.
- Turn off rate limits => s3 | 0 | Removes the protection you need. Example: Latency climbs for everyone.

### s3
text: Service is stable. Region A returns. How do you fail back?
- Reconcile writes accepted during the split, ramp traffic back in steps and keep B warm until A is verified => end-win | 2 | Failing back is another change. Example: Ten percent steps with a rollback point.
- Switch all traffic back at once => end-ok | 1 | Risky but works if A is healthy. Example: A stumbles under a cold cache.
- Leave both regions out of sync => end-fail | 0 | Data diverges silently. Example: Customers see old balances next week.

### end-win
end: win
text: You failed over, protected the core, reconciled data and failed back safely.
takeaway: Check lag against the RPO, shed by priority, and treat failback as a staged change.

### end-ok
end: ok
text: Service returned, but the failback was riskier than it needed to be.
takeaway: Ramp and verify. A cold region can fail the moment it receives full traffic.

### end-fail
end: fail
text: The regions diverged and the team spent days reconciling.
takeaway: Without a plan for the writes in the gap, recovery creates a second incident.
