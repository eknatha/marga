## The slow request nobody could trace
module: observability
level: Intermediate
minutes: 6
lesson: observability/logs-and-traces
summary: Some requests take eight seconds and the logs of each service look fine. Follow one request through the system.
intro: Customers report occasional slow checkouts. Every service shows normal averages and no errors.

### s1
text: Averages look fine but some requests are slow. What data do you want?
- A trace of a slow request showing time spent in each service => s2 | 2 | Traces show where the time goes for one request. Example: A trace shows 7.5 of 8 seconds waiting on the inventory call.
- A bigger log file from every service => s2 | 1 | More text rarely shows how services connect. Example: You search four logs by timestamp and still cannot link them.
- The average latency chart => s2 | 0 | Averages hide the slow tail. Example: The average is 300 ms while the slowest percent takes eight seconds.

### s2
text: You have no trace for those requests. What helps?
- Find a request id in logs and follow it, then add trace context propagation => s3 | 2 | A shared id links the logs, and propagation makes traces possible. Example: The request id header appears in three services and lines up the timeline.
- Guess which service is slow => end-fail | 0 | Guessing wastes time. That does not deal with the real cause. Example: You blame the wrong team.
- Restart all services => s3 | 1 | It may hide the issue and lose evidence. Example: The slow requests return after the restart.

### s3
text: The slow part is the inventory service. What do you look for?
- Its dependency calls, queue waits and the slow percentile of its own metrics => s4 | 2 | Look inside the slow component with the right signals. Example: A histogram shows the 99th percentile jumps when one shard is busy.
- Only its CPU graph => s4 | 1 | CPU can be normal while waiting on something else. Example: CPU is 20 percent but threads wait on a lock.
- Nothing, move on => s4 | 0 | The cause remains. That does not deal with the real cause. Example: Customers keep waiting.

### s4
text: How do you avoid this blind spot next time?
- Propagate context everywhere, sample to keep slow and error traces and alert on high percentiles => end-win | 2 | Slow requests are kept and alerted on. Example: Tail-based sampling keeps all traces over two seconds.
- Log everything at debug level => end-ok | 1 | Cost and noise rise without linking requests. Example: The log bill doubles.
- Rely on averages => end-fail | 0 | They hid the problem. That does not deal with the real cause. Example: The next slow tail goes unnoticed.

### end-win
end: win
text: The trace points at the inventory service and its busy shard, and slow traces are now kept and alerted on.
takeaway: Use traces to find where, metrics to find how much, logs to find why.

### end-ok
end: ok
text: The cause is found, but the blind spot is still there.
takeaway: Propagate context everywhere. Review the lesson and try the game again.

### end-fail
end: fail
text: The team looked in the wrong place. Read each choice explanation to see why.
takeaway: Follow the request, do not guess.

## The log pipeline that fell behind
module: observability
level: Advanced
minutes: 6
lesson: observability/log-pipelines
summary: During an incident the logs arrived an hour late. Fix the pipeline so evidence is there when needed.
intro: Traffic doubles. Dashboards show current metrics, but the log search shows nothing from the last hour.

### s1
text: Logs are an hour behind. What is the first question?
- Where is the bottleneck: collectors, buffer, parsing or storage? => s2 | 2 | Find the slow stage before changing anything. Example: Collector queues are empty but the indexer is at its write limit.
- Restart every component => end-fail | 0 | You may lose buffered logs. Example: The restart drops the unflushed buffer.
- Turn off logging => s2 | 1 | You lose evidence when you most need it. Example: The incident has no logs at all.

### s2
text: The storage layer cannot keep up. What do you do now?
- Raise ingest capacity or drop low-value logs first, keeping errors and audit events => s3 | 2 | Protect important data when you must shed. Example: Debug and health-check logs are sampled while errors are kept.
- Drop logs at random => s3 | 0 | You may lose the error that matters. Example: The one stack trace you need is gone.
- Wait for it to catch up => s3 | 1 | It may never catch up while load stays high. Example: The delay grows to three hours.

### s3
text: How do you stop a spike from losing data?
- Put a durable buffer between collectors and storage and add backpressure => s4 | 2 | A buffer absorbs bursts and lets storage catch up. Example: A queue holds six hours of logs while the indexer drains it.
- Send logs straight to storage => s4 | 0 | There is no room for bursts. Example: A burst overflows memory and drops lines.
- Make logs bigger => s4 | 0 | More data makes it worse. That does not deal with the real cause. Example: Volume grows further.

### s4
text: How do you know the pipeline is healthy?
- Monitor lag, queue depth, drop counts and parsing errors, and alert on them => end-win | 2 | The pipeline needs monitoring like any production system. Example: An alert fires when end-to-end lag passes five minutes.
- Look at it when someone complains => end-ok | 1 | Too late. It helps only in part. Example: You learn during an incident.
- Assume it works => end-fail | 0 | Silent failures are common. That does not deal with the real cause. Example: Logs were missing for days.

### end-win
end: win
text: The pipeline buffers bursts, keeps important logs first and alerts on lag, so evidence is there during incidents.
takeaway: Treat the log pipeline as production.

### end-ok
end: ok
text: Logs catch up, but visibility into the pipeline is still weak.
takeaway: Monitor lag and drops. Review the lesson and try the game again.

### end-fail
end: fail
text: Evidence was missing when it mattered. Read each choice explanation to see why.
takeaway: Do not turn off or restart blindly.

