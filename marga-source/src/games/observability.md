## The dashboard that said everything was fine
module: observability
level: Intermediate
minutes: 6
lesson: observability/alerting-and-dashboards
summary: Customers cannot check out, yet every dashboard is green and no alert has fired. Find out why monitoring was silent.
intro: Support reports failed checkouts for the last half hour. You open the main dashboard: CPU is normal, error rate is flat at 0 percent, and no alerts are firing.

### s1
text: Customers are clearly affected, but the error rate graph shows zero. What do you suspect first?
- That customers are mistaken => end-fail | 0 | Multiple reports are a signal. Do not dismiss them.
- That the data itself might be missing, so check whether the checkout targets are being scraped => s2 | 2 | A flat zero line with real failures often means no data is arriving.
- That the dashboard is slow to refresh => s3 | 0 | A refresh delay of minutes would not explain half an hour of silence.

### s2
text: You query up{job="checkout"} and it returns no series. The metrics from the checkout service stopped 35 minutes ago. What is the first priority?
- Find out why the service is failing and restore checkout, while treating the monitoring gap as a second problem => s4 | 2 | Customers come first. Visibility will be fixed in parallel.
- Fix the monitoring configuration first and ignore checkout => s4 | 0 | Customer impact is the priority.

### s3
text: You refresh the dashboard and nothing changes. Support sends more reports. What next?
- Query the raw metric and check whether the target is up => s2 | 2 | Going to the raw data cuts through assumptions.
- Create a new dashboard => end-fail | 0 | The dashboard is not the problem; the data may be.

### s4
text: Checkout logs show errors from a payment call timing out. A scrape configuration change deployed 40 minutes ago renamed the job label, which removed checkout from the targets. Two problems, one cause. What do you do first?
- Roll back the monitoring change, and in parallel check the payment dependency => s5 | 2 | Restoring visibility quickly lets you see the real state.
- Wait for the next scheduled deploy to fix it => end-fail | 0 | Too slow while customers are failing.

### s5
text: Metrics are back, and the error rate shows 45 percent. A trace of a failed checkout shows the payment provider call taking 30 seconds. What do you do?
- Enable the existing fallback so slow payments are retried via the backup provider, then follow up with the provider => s6 | 2 | You reduce user impact using a prepared mitigation.
- Increase the timeout to 60 seconds => s6 | 0 | Slower failures hurt users more and tie up resources.

### s6
text: Checkout recovers. What will you change so that monitoring does not stay silent again?
- Alert on missing data and on the number of targets up, add a synthetic checkout test from outside, and review monitoring changes like code changes => end-win | 2 | You detect both a broken pipeline and a broken user journey.
- Add more dashboards => end-ok | 1 | More graphs do not help when the data is missing.

### end-win
end: win
text: Checkout works again, and the next time the data stops, an alert will fire in minutes. A test purchase every minute shows what customers see.
takeaway: Silence is not health. Alert on missing data, monitor the user journey from outside, and test monitoring changes like any other change.

### end-ok
end: ok
text: Customers are back, but the same kind of silent failure could happen again.
takeaway: Monitoring needs its own monitoring.

### end-fail
end: fail
text: Customers failed for hours because the team trusted a green dashboard.
takeaway: When reports and dashboards disagree, question the data.
