## Define SLOs and an error budget
level: Beginner
hours: 3
modules: sre, observability
summary: Choose indicators users would feel, set objectives, and turn them into an error budget and a release policy.
goal: Replace "it should be reliable" with a number the team can act on.
build: An SLI and SLO document for one service, a measurement query for each, a budget calculation and a written policy for what happens when the budget is spent.
steps:
- Pick one user journey (for example checkout) and write down what a good and a bad experience mean.
- Choose two SLIs, one for availability (good requests over valid requests) and one for latency (share of requests under a threshold).
- Set targets such as 99.9 percent and 95 percent under 300 ms, and say why those numbers fit the users.
- Write the measurement queries against real or sample metrics and compute the last 30 days.
- Convert the targets into an error budget in minutes and in failed requests per month.
- Write a policy: what you do at 50, 80 and 100 percent of the budget spent (for example, freeze risky releases).
- Review it with a colleague and record one decision it would have changed in the past month.
check:
- Each SLI measures what users experience, not the CPU of a server.
- The error budget is a number you can read off a dashboard.
- The policy names an owner and an action for each threshold.
- You can explain why 100 percent is the wrong target.
stretch: Add a per-customer-tier SLO and show whether the premium tier meets a stricter target.

## Build burn-rate alerts and a service dashboard
level: Intermediate
hours: 4
modules: observability, sre
summary: Alert on how fast the error budget burns, using fast and slow windows, and build a dashboard an on-call person can use at 3 a.m.
goal: Page people for real user pain only, and help them find the cause in minutes.
build: A dashboard with the four golden signals, multi-window burn-rate alerts, links from alerts to runbooks and a missing-data alert.
steps:
- Expose request count, error count and latency histograms from a sample service (or use an existing one).
- Build the dashboard rows: traffic, errors, latency percentiles and saturation, with deploy markers.
- Write a fast burn alert (for example 14 times the budget rate over 5 minutes and 1 hour) that pages.
- Write a slow burn alert (for example 3 times over 6 hours) that opens a ticket.
- Add an alert for missing data and a heartbeat alert that must always fire.
- Attach a runbook link and a dashboard link to every alert.
- Cause an error spike with a test tool and check that the right alert fires, and that nothing else does.
check:
- A short outage pages quickly, and a slow leak creates a ticket, not a page.
- Every paging alert has a runbook and states the user impact.
- A stopped metrics source triggers an alert.
- Latency is shown as percentiles, not averages.
stretch: Add a trace link from a slow request on the dashboard to its logs by trace id.

## Run a game day and write the runbook
level: Advanced
hours: 4
modules: sre, kubernetes
summary: Inject a controlled failure, observe the system against a written hypothesis, and turn what you learn into a runbook.
goal: Learn how the system fails before your users do.
build: A game day plan with a hypothesis, a safe failure injection, observations, a rollback plan and a runbook written from the results.
steps:
- Write a hypothesis, such as "if one replica dies, users see no errors and recovery takes under a minute".
- Define the blast radius, the stop condition and who can call off the experiment.
- Confirm monitoring would show the failure: dashboards open, alerts ready.
- Inject the failure in a test or staging environment (delete a Pod, block a dependency, add latency).
- Record what happened with timestamps: detection time, recovery time, user impact, surprises.
- Compare the result with the hypothesis and list each gap as an action with an owner.
- Write the runbook: symptoms, checks in order, mitigation steps, who to call, and how to verify recovery.
check:
- The experiment had a written stop condition and was stopped on time.
- Detection time and recovery time are recorded as numbers.
- At least one surprising result became a tracked action.
- Someone who did not run the game day can follow the runbook.
stretch: Repeat the experiment after the fixes and show the improvement.

## Simulate an incident and write a blameless postmortem
level: Advanced
hours: 4
modules: sre
summary: Practise roles, communication and mitigation in a simulated outage, then write a postmortem focused on systems and actions.
goal: Rehearse the human side of incidents and learn from them without blame.
build: An incident log, status updates, a timeline, contributing causes and follow-up actions with owners and dates.
steps:
- Agree a scenario in advance (for example a bad deploy raises errors for 30 percent of users) and assign commander, operations, communications and scribe roles.
- Declare the incident, set a severity, and post the first status update within the first ten minutes.
- Mitigate first (roll back or turn off the flag), then investigate, changing one thing at a time and announcing each change.
- Keep a timestamped log in the incident channel as you go.
- Post updates at a fixed rhythm and a final all-clear after you verify user recovery.
- Write the postmortem: summary, impact, timeline, what went well, contributing causes (not a person), and what was lucky.
- List follow-up actions that are specific, owned and dated, and review them a week later.
check:
- The timeline has timestamps for detection, mitigation and recovery.
- The document names causes in the system and process, never a person to blame.
- Each action has an owner and a date.
- You can show how you would detect the same problem sooner.
stretch: Measure the time to detect, time to mitigate and time to recover across two simulations.
