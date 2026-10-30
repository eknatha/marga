## The postmortem with no actions
module: sre
level: Intermediate
minutes: 6
lesson: sre/postmortems-and-toil
summary: A review ends with "be more careful". Turn it into a blameless postmortem that changes something.
intro: After a two-hour outage, the review document says the engineer should have checked first. Three months later a similar outage happens.

### s1
text: The first draft blames one engineer. What do you change?
- Ask how the system allowed the mistake and what made it easy to make => s2 | 2 | Blameless reviews look for conditions, not culprits. Example: The deploy tool let a dangerous change through without a check.
- Keep the draft, the engineer did make the mistake => end-fail | 0 | People will hide mistakes in future. Example: Next time nobody reports a near miss.
- Remove the engineer name only => s2 | 1 | It helps a little but does not change the analysis. Example: The text still says the engineer was careless.

### s2
text: Which action items are worth writing? Choose the move you would make next.
- Specific, owned and dated: add a pre-deploy check and a rollback button, owner and deadline => s3 | 2 | Clear actions get done. Example: Add a config validation step to the pipeline by the 15th, owner Priya.
- Be more careful in future => s3 | 0 | It cannot be verified or completed. That does not deal with the real cause. Example: Nothing changes.
- Rewrite the whole platform => s3 | 1 | Too big to finish. It helps only in part. Example: The project never starts.

### s3
text: How do you decide which actions come first?
- Rank by how much risk each removes and how much effort it needs => s4 | 2 | Prioritise the ones that matter most for the cost. Example: A check that blocks the exact failure ranks above a long list of ideas.
- Do all of them at once => s4 | 1 | It spreads effort too thin. It helps only in part. Example: None of them finish.
- Pick the easiest only => s4 | 0 | The risky cause stays. Example: Low-value tasks are done and the main risk remains.

### s4
text: How do you make sure the actions happen?
- Track them in the normal work system and review progress at a regular meeting => end-win | 2 | Visibility keeps them alive. Example: A weekly reliability review checks overdue items.
- Trust people to remember => end-fail | 0 | Work gets lost. That does not deal with the real cause. Example: Three months pass with nothing done.
- Close the postmortem when it is written => end-ok | 1 | The learning is lost without follow-up. Example: Actions are never checked.

### end-win
end: win
text: The postmortem blames the system, ranks actions and tracks them, so a similar outage is far less likely.
takeaway: Blame the conditions, write specific actions and follow up.

### end-ok
end: ok
text: The review is better, but follow-up is weak.
takeaway: Track actions to completion. Review the lesson and try the game again.

### end-fail
end: fail
text: The review blamed a person and changed nothing.
takeaway: Look for conditions. Review the lesson and try the game again.

## The launch without a readiness review
module: sre
level: Beginner
minutes: 5
lesson: sre/production-readiness-reviews
summary: A new service launched without alerts or a rollback plan and failed on day two. Decide what a review should check.
intro: A new service launches on Monday. On Tuesday it fails and nobody knows how to restart it or who owns it.

### s1
text: The service failed and nobody knows what to do. What is missing?
- Ownership, a runbook, alerts and a rollback plan => s2 | 2 | A launch needs the basics for operating it. Example: The runbook says how to check health and how to roll back.
- A bigger server => s2 | 0 | Capacity is not the issue. Example: The server was healthy but misconfigured.
- More developers => s2 | 1 | People do not replace preparation. Example: Extra people do not know the service either.

### s2
text: What would a short readiness review check?
- Monitoring, alerts, capacity, dependencies, on-call and rollback => s3 | 2 | A short list covers most launch failures. Example: The checklist has twelve items and takes thirty minutes.
- Only whether the code is merged => s3 | 0 | Merged code is not operable. Example: The code works but nobody can run it.
- A long document nobody reads => s3 | 1 | A heavy process gets skipped. Example: The document is signed without reading.

### s3
text: A team says the review slows them. What do you do?
- Keep it short, tie items to real incidents and allow documented exceptions => s4 | 2 | A light, useful review gets used. Example: The team skips one item with a note and a date to complete it.
- Make the review mandatory with no exceptions => s4 | 1 | Too rigid. It helps only in part. Example: Teams find ways around it.
- Drop reviews => s4 | 0 | The same failures return. That does not deal with the real cause. Example: Another launch fails on day two.

### s4
text: How do you keep the checklist useful? Choose the move you would make next.
- Update it after each incident and review it every quarter => end-win | 2 | It learns from real failures. Example: Add a check for rate limits after an outage.
- Never change it => end-fail | 0 | It becomes stale. That does not deal with the real cause. Example: New risks are missed.
- Let each team write its own => end-ok | 1 | Quality varies. It helps only in part. Example: Some teams miss basics.

### end-win
end: win
text: The service has an owner, alerts, a runbook and a rollback plan, and the checklist improves after each incident.
takeaway: Check the basics before launch and keep the review light.

### end-ok
end: ok
text: The review exists, but rigid or stale lists will be skipped.
takeaway: Keep it light and current. Review the lesson and try the game again.

### end-fail
end: fail
text: The service launched unprepared again. Read each choice explanation to see why.
takeaway: Do the basics before launch. Review the lesson and try the game again.

