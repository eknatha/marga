## The alert that cried wolf
module: observability
level: Beginner
minutes: 7
lesson: observability/alerting-and-dashboards
summary: The on-call phone rings 40 times a night and nobody trusts it. Learn actionable alerts, thresholds and severity.
intro: The on-call engineer has been paged 40 times this week, mostly for CPU above 80 percent on a few servers. Yesterday a real outage was ignored for 25 minutes because it looked like the usual noise.

### s1
text: Where do you start to fix alert fatigue?
- List last week's pages and mark which needed a human action => s2 | 2 | Data shows which alerts deserve to exist. Example: 34 of 40 pages needed no action and resolved themselves in minutes.
- Mute the pager for the night => s2 | 0 | You lose the real alerts too. Example: the next outage goes unnoticed.
- Ask the team to be more careful => s2 | 1 | People are not the problem; the alerts are. Example: more care does not stop a noisy rule from firing.

### s2
text: "CPU above 80 percent for 1 minute" fired 22 times and users were never affected. What is a better rule?
- Alert on user impact, such as error rate or latency of requests, not on a cause like CPU => s3 | 2 | Symptoms matter to users, causes are for dashboards. Example: page when more than 2 percent of requests fail for 5 minutes.
- Raise the threshold to 99 percent => s3 | 1 | It reduces noise and still alerts on a cause. Example: a busy-but-healthy server at 99 percent pages without impact.
- Alert on everything and filter later => end-fail | 0 | More alerts make the fatigue worse. Example: 400 pages a week.

### s3
text: Some alerts should wake someone, and some can wait until morning. How do you structure that?
- Use severity: page for urgent user-facing impact, ticket or message for slow-burn issues => s4 | 2 | Different urgency needs different channels. Example: disk 90 percent full creates a ticket; a failing checkout pages.
- Page for everything to be safe => s4 | 0 | The pager becomes meaningless. Example: engineers silence it.
- Send everything by email => s4 | 1 | Emails are skipped during an outage. Example: the real alert sits among 300 unread messages.

### s4
text: Each page should help the responder act. What do you add to an alert?
- A clear title, impact, a link to a dashboard and a runbook with first steps => s5 | 2 | The responder starts with context at 03:00. Example: "Checkout errors above 2 percent. Dashboard link. Runbook: check the payment provider status first".
- Only the metric name => s5 | 1 | It forces the responder to guess. Example: "high_latency_p99" says little.
- A long email with all history => end-fail | 0 | Too long to read at night. Example: 2,000 words nobody reads.

### s5
text: The pager is quiet. How do you keep alerts healthy?
- Review pages weekly, delete or fix noisy ones, and track the share of pages that needed action => end-win | 2 | Alerts need maintenance like code. Example: a weekly 15-minute review keeps the share of actionable pages above 80 percent.
- Set it and forget it => end-ok | 1 | Systems change and rules rot. Example: old thresholds fire after a hardware upgrade.
- Add more alerts each quarter => end-fail | 0 | Volume is not quality. Example: noise returns.

### end-win
end: win
text: Pages dropped from 40 to 4 a week, each one actionable, and the team trusts the pager again.
takeaway: Alert on user impact, give each page a purpose and a runbook, and review them regularly.

### end-ok
end: ok
text: There is less noise, though some alerts still point at causes rather than impact.
takeaway: Keep refining toward symptom-based alerts.

### end-fail
end: fail
text: The pager stayed noisy and a real outage was missed.
takeaway: An alert nobody trusts is worse than none.

## The metrics bill that tripled
module: observability
level: Advanced
minutes: 7
lesson: observability/telemetry-cost-and-cardinality
summary: The metrics system is slow and costs three times as much. Learn cardinality, labels and sensible retention.
intro: The monitoring bill tripled this month and dashboards load slowly. The metrics team says the number of time series jumped from 2 million to 40 million.

### s1
text: You need to find what grew. What do you do?
- Find the metrics with the most series and the labels that multiply them => s2 | 2 | Cardinality comes from label combinations. Example: http_requests_total has 38 million series because of a user_id label.
- Add more storage => s2 | 1 | It pays for the problem. Example: the bill grows further.
- Delete all dashboards => s2 | 0 | It hides the symptom and loses visibility. Example: on-call cannot see anything.

### s2
text: A new release added a label with the user ID to a request metric. Why is that harmful?
- Each distinct user value creates a new time series, so series count grows with users => s3 | 2 | Labels should have a small, bounded set of values. Example: 1 million users times 20 endpoints equals 20 million series.
- Labels are free => end-fail | 0 | They multiply storage and memory. Example: each series costs memory in the server.
- User IDs are a privacy issue only => s3 | 1 | They are also a cost issue. Example: the privacy risk is one more reason to remove it.

### s3
text: Where should user-level detail go if it is useful?
- Into logs or traces, which are made for high-cardinality detail, and keep metrics aggregate => s4 | 2 | Each signal has a job. Example: a trace shows one slow request for user 8841, the metric shows the latency of all requests.
- Into metrics with a label anyway => s4 | 0 | It repeats the incident. Example: the bill grows again.
- Nowhere => s4 | 1 | Detail has value for debugging. Example: support needs to find one customer's failing request.

### s4
text: You know which label multiplied the series. How do you remove the damage now without losing useful history?
- Drop or relabel the label at ingestion, roll out the fixed release and let old series expire => s5 | 2 | Stop new series, then wait for old ones to age out. Example: a metric relabel rule drops user_id, and cost falls over the next retention period.
- Restart the metrics server => s5 | 1 | The data is reloaded and nothing changes. Example: the same series return.
- Reduce retention to one hour for everything => end-fail | 0 | It loses useful history. Example: week-over-week comparisons are gone.

### s5
text: How do you stop it from happening again?
- Set cardinality limits, review new labels in code review, and alert on series growth => end-win | 2 | Guardrails catch the next mistake early. Example: an alert fires when active series grow 20 percent in a day.
- Tell engineers to be careful => end-ok | 1 | People forget. Example: the next label is added next month.
- Ban metrics => end-fail | 0 | Metrics are essential. Example: no data, no SLOs.

### end-win
end: win
text: The label was removed, the series count is back at 2 million, and limits plus alerts guard against growth.
takeaway: Metrics need bounded labels. Put high-cardinality detail in logs and traces.

### end-ok
end: ok
text: The cost is down, though prevention depends on reviewers.
takeaway: Add automatic limits and growth alerts.

### end-fail
end: fail
text: The bill stayed high and visibility was reduced instead of fixed.
takeaway: Fix the cause of the series growth, not the symptom.

