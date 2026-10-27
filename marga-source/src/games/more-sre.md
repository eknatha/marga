## The error budget ran out
module: sre
level: Intermediate
minutes: 7
lesson: sre/slos-and-error-budgets
summary: A service has used its monthly error budget in two weeks. Learn how to use the budget to decide what to do.
intro: Your checkout service has a 99.9 percent monthly SLO. By the 14th, outages have used 110 percent of the month's error budget. A big feature launch is planned for next week.

### s1
text: The budget is gone. What does the policy suggest?
- Slow down feature releases and focus on reliability work until the budget recovers => s2 | 2 | The budget exists to balance speed and stability. Example: pause non-urgent launches, and spend the sprint on the top causes of downtime.
- Ship the launch as planned => s2 | 0 | Adding risk when the budget is empty increases the chance of another outage. Example: the launch causes a 20 minute incident.
- Change the SLO to 99 percent => s2 | 1 | Changing the target hides the signal. Example: the graph looks green and customers still suffer.

### s2
text: What do you do first to use the data well?
- Review the incidents that consumed the budget and rank them by minutes lost => s3 | 2 | The largest causes give the largest gain. Example: two incidents caused 70 percent of the lost minutes: a bad deploy and a database failover.
- Blame the on-call => end-fail | 0 | Blame hides the system causes. Example: nobody reports the next incident honestly.
- Wait for the next month => s3 | 1 | The causes remain. Example: the budget empties again.

### s3
text: Product leaders say the launch is critical for revenue. How do you respond?
- Offer options: delay, a smaller launch behind a flag with a canary, or a risk-accepted launch signed by the owner => s4 | 2 | Decisions belong to those who own the risk, with clear options. Example: launch to 5 percent of users with a quick rollback and extra on-call.
- Refuse flatly => s4 | 1 | It may be right and loses trust. Example: the team routes around reliability reviews.
- Give in without discussion => s4 | 0 | The policy loses meaning. Example: the next team ignores the budget too.

### s4
text: One of the top causes was a deploy without a canary. What is the best action?
- Add canary deployment with automatic rollback to the standard pipeline => s5 | 2 | Fix the class of failure. Example: a bad build is detected at 5 percent of traffic and rolled back in two minutes.
- Add a rule that deploys must be careful => s5 | 1 | Words do not stop mistakes. Example: the next rushed deploy skips care.
- Deploy less often only => end-fail | 0 | Bigger, rarer changes are riskier. Example: a monthly mega-release breaks more.

### s5
text: How do you report the situation to stakeholders?
- Share the SLO status, the causes, the plan and when the budget is expected to recover => end-win | 2 | Clear communication builds trust. Example: a one-page update with a graph and three actions.
- Say it is fine => end-fail | 0 | False comfort breaks trust. Example: the next outage surprises everyone.
- Say nothing => end-ok | 1 | Others make plans without the facts. Example: marketing announces a date.

### end-win
end: win
text: The launch was reshaped, the top causes were fixed, and the budget recovered. The SLO now guides real decisions.
takeaway: An error budget turns reliability into a shared decision about speed and risk.

### end-ok
end: ok
text: Reliability work started, but the cause of the biggest losses is not yet fixed.
takeaway: Rank incidents by minutes lost and fix the largest first.

### end-fail
end: fail
text: The launch went ahead on an empty budget and caused another outage.
takeaway: A budget that never changes decisions is not a budget.

## Two incidents and one on-call
module: sre
level: Advanced
minutes: 7
lesson: sre/incident-response
summary: Two serious incidents start at once. Learn roles, priorities, communication and handover.
intro: At 15:00 the payments service starts failing. At 15:10 the login service also fails. You are the only on-call engineer. Both look serious.

### s1
text: You have two incidents and one person. What do you do first?
- Call for help, declare both incidents, and assign an incident commander and a lead for each => s2 | 2 | Large incidents need roles, not heroes. Example: you page the secondary on-call and the manager, and name yourself lead for payments while someone else leads login.
- Work on both yourself => s2 | 0 | You will do both badly. Example: context switching adds ten minutes to each.
- Pick one and ignore the other => s2 | 1 | Someone must own each. Example: login stays down because nobody looks.

### s2
text: Both incidents have teams waiting for an answer and you can only direct the first effort once. Which incident is more urgent?
- Compare customer impact and risk: how many users, how much money, whether data is at risk => s3 | 2 | Priority follows impact. Example: login failure blocks all users, payments affect only purchases.
- The one that was reported first => s3 | 1 | Order of arrival is not impact. Example: the first report is only a small part.
- The one that is easier => end-fail | 0 | Easy is not important. Example: a quick fix to a minor issue while the major one burns.

### s3
text: The responders start working. Customers and executives ask for updates. Who handles it?
- A communications lead posts regular, factual updates to a status page and stakeholders => s4 | 2 | The responders should not be interrupted. Example: an update every 20 minutes: what is known, what is being done, next update time.
- The engineers answer every message => s4 | 0 | It slows the fix. Example: each question costs five minutes.
- No updates until fixed => s4 | 1 | Silence causes rumours and duplicate questions. Example: ten teams ask for status.

### s4
text: The login service is fixed by rolling back a config change. Payments is still failing after 90 minutes and the team is tired. What do you do?
- Hand over to fresh people with a clear summary, take breaks, and keep a written timeline => s5 | 2 | Fatigue creates mistakes. Example: a handover note lists what was tried, what is known and the next steps.
- Push on with the same people => end-fail | 0 | Mistakes rise with exhaustion. Example: someone runs the wrong command at hour three.
- Stop work until morning => s5 | 1 | The impact continues. Example: customers still cannot pay.

### s5
text: Both services are healthy again and everyone is tired but the facts are fresh. Both incidents are over. What next?
- Hold blameless reviews for both and look for a link between them => end-win | 2 | Learning comes from facts and systems. Example: both incidents came from changes released in the same window without a change freeze.
- Skip the review, everyone is tired => end-ok | 1 | Delays lose details. Example: nobody remembers why the config changed.
- Find who is to blame => end-fail | 0 | Blame stops honest reporting. Example: people hide mistakes.

### end-win
end: win
text: Both incidents were handled with clear roles, honest updates and fresh responders, and the reviews found a shared cause.
takeaway: In big incidents, structure beats heroics. Roles, priorities, communication and handover keep people effective.

### end-ok
end: ok
text: Both incidents ended, though some work was disorganised.
takeaway: Next time, name roles earlier.

### end-fail
end: fail
text: The single responder was overwhelmed, and the outages lasted longer than they needed to.
takeaway: Ask for help early. Incident response is a team job.

