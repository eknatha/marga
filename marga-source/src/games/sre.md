## Three people, three changes
module: sre
level: Advanced
minutes: 7
lesson: sre/incident-response
summary: Checkout latency triples. Run the incident as commander and keep a busy team from making it worse.
intro: It is 16:20 and the paging system shows checkout latency at three times normal. You are the incident commander. Three engineers have joined the incident channel and each wants to act.

### s1
text: Latency rose at 16:18. A deploy finished at 16:15. Two engineers suggest different fixes at the same time. What do you do?
- Let everyone try their idea in parallel to save time => s3 | 0 | Parallel changes make it impossible to know what helped or hurt. Example: Five engineers restarting different services at once make the latency graph jump around, and nobody can say which action fixed it.
- Ask for the most likely cause, ask who changed what, and assign one person to make changes while others investigate => s2 | 2 | One operator and announced changes keep cause and effect clear. Example: 'Who deployed in the last hour? One person drives, the rest read logs' leads to the finding that the 13:40 deploy matches the start of the slowdown.
- Start a long call to discuss root cause => s3 | 0 | Discussion does not reduce user impact. Example: A 45 minute call about root cause leaves p99 latency at 4 seconds while the customers wait, and nothing has been mitigated.

### s2
text: The recent change list shows the 16:15 deploy of the pricing service. Rolling it back takes about two minutes and is safe. What do you decide?
- Roll back the deploy now, announced in the channel, and watch the latency graph => s4 | 2 | A quick, reversible mitigation that also tests the hypothesis. Example: 'Rolling back api to v212 now, watch p99' is posted in the channel, and p99 falls from 4 s to 300 ms in three minutes, which also supports the hypothesis.
- Keep investigating without a rollback because rollback hides the cause => s5 | 0 | Users keep failing, and the cause can be studied afterwards from the failed version. Example: Keeping the broken version running for another hour to study it costs another 60 minutes of errors, and the failed build stays available for analysis later.

### s3
text: Three changes were made in five minutes: a restart, a larger database pool and a feature flag turned off. Latency recovered a little, but nobody knows why. What do you do now?
- Stop, ask each person to say what they changed and when, and return to one change at a time => s2 | 2 | Restore order, then continue methodically. Example: 'Everyone stop. Say your name, what you changed and when' reveals that two people both scaled the database, one of them at 13:52, and gives you a clean order.
- Make more changes to push it further => end-fail | 0 | More uncontrolled changes may break something else. Example: Adding load tests to the live service 'to see where it breaks' while users are affected turns a slow service into a down service.

### s4
text: After the rollback, latency returns to normal within three minutes. Customers are no longer affected. What should the communications lead do now?
- Post a clear update: impact, the mitigation, current status and when the next update comes => s6 | 2 | Stakeholders need short, factual updates on a schedule. Example: '13:55 Impact: 30 percent of checkouts fail. Mitigation: rollback in progress. Next update 14:15' tells support what to tell customers.
- Stay silent until the postmortem => s6 | 0 | Support and executives would be left guessing. Example: Without updates, support invents answers, a vice president joins the call at 14:10 and asks for a status that nobody has written down.

### s5
text: Ten minutes later latency is still bad and executives are asking for updates in the incident channel. What do you do?
- Roll back now, redirect stakeholders to the updates channel, and ask the communications lead to post a summary => s4 | 2 | You act on the best hypothesis and protect the responders' focus. Example: The incident commander announces the rollback, points executives to #incident-updates, and the communications lead posts a short summary, so engineers can keep working.
- Answer every question in the channel yourself => end-fail | 0 | You lose focus on the incident. Example: Replying to 30 questions in the channel yourself takes ten minutes while the rollback is waiting for someone to run it.

### s6
text: The incident is mitigated. How do you close it?
- Verify user-facing metrics are normal, declare the incident over, and schedule a blameless postmortem with owners for actions => end-win | 2 | You confirm recovery and capture learning. Example: p99 back under 500 ms and error rate under 0.1 percent for 30 minutes, then 'incident resolved', and a blameless review booked for Thursday with named action owners.
- Declare it over without checking metrics => end-ok | 1 | You may be right, but you have not verified. Example: Closing the incident at 14:20 because the rollback finished, then seeing a second spike at 14:35 because a cache was still cold, reopens the incident and trust drops.

### end-win
end: win
text: Latency is normal, the team knows the pricing deploy was the cause, and the postmortem will look at testing and rollout practices rather than blaming anyone.
takeaway: Mitigate first with a reversible action, change one thing at a time, keep communication separate from debugging, verify recovery and hold a blameless review.

### end-ok
end: ok
text: The incident ended, but without verification you cannot be sure users have recovered.
takeaway: Check user-facing metrics before you declare an incident over.

### end-fail
end: fail
text: Uncontrolled changes and poor communication prolonged the outage and nobody could say what fixed it.
takeaway: An incident commander coordinates; it does not debug. Control changes and keep updates flowing.
