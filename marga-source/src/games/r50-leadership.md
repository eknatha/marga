## The incident with ten commanders
module: leadership
level: Intermediate
minutes: 7
lesson: leadership/leading-through-incidents
summary: Ten engineers debug a failing service at once. Lead the response.
intro: A payment service is failing. Ten people are in the channel, each running commands. Two rollbacks have already been tried at the same time.

### s1
text: What do you do first? Choose the best next step.
- Announce that you are the incident commander and ask people to pause changes => s2 | 2 | One voice and no conflicting actions. Example: Changes stop while you take stock.
- Start debugging yourself => s2 | 1 | Nobody coordinates. Example: You become the eleventh debugger.
- Ask who is to blame => end-fail | 0 | Wastes time. Example: People go quiet.

### s2
text: How do you organise the work? Choose the best next step.
- Assign operations, communications and a scribe and ask for hypotheses before actions => s3 | 2 | Roles prevent overlap. Example: A scribe keeps the timeline.
- Let everyone continue => s3 | 1 | Still chaos. Example: Two more conflicting changes happen.
- Wait for the manager => end-fail | 0 | Delays the response. Example: Minutes are lost.

### s3
text: How do you communicate? Choose the best next step.
- Post updates on a fixed schedule to stakeholders with impact and next update time => s4 | 2 | Predictable updates reduce interruptions. Example: An update every twenty minutes.
- Reply to each person privately => s4 | 1 | Does not scale. Example: You are buried in messages.
- Say nothing until fixed => end-fail | 0 | Stakeholders panic. Example: The executive joins the channel.

### s4
text: How do you close the incident? Choose the best next step.
- Confirm recovery, thank the team and schedule a blameless review => end-win | 2 | Learning prevents repeats. Example: The review finds a missing alert.
- Tell people to forget it => end-ok | 1 | Lessons are lost. Example: The same incident returns.
- Blame the engineer who deployed => end-fail | 0 | Damages trust. Example: People hide mistakes next time.

### end-win
end: win
text: The response was coordinated, communication was regular and the team learned from a blameless review.
takeaway: One commander, clear roles, scheduled updates and a blameless review.

### end-ok
end: ok
text: The service recovered but coordination or learning was weak.
takeaway: Name a commander and hold a review. Review the lesson and try again.

### end-fail
end: fail
text: Chaos or blame continued and trust was damaged.
takeaway: Do not let everyone act at once or assign blame. Review the lesson and try again.
