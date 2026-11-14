## A story with no result
level: junior
A candidate describes a project in detail.

```text
$ cat notes.txt
Situation: slow deploys
Action: I rewrote the pipeline
Result: (empty)
```
? What is missing?
+ A measurable result, such as the deploy time falling from 40 to 12 minutes
- More detail on the code
- A longer introduction
why: Interviewers look for impact and what you learned.

## Design review with silence
level: mid
A design review has no comments and a hidden concern surfaces later.

```text
$ cat review-notes.md
Attendees: 9
Comments: 0
```
? How do you improve it?
+ Share the document early, ask for specific objections and record decisions and open questions
- Cancel reviews
- Invite fewer people
why: Early written review draws out concerns.

## Stalled cross team change
level: mid
Another team ignores a request you depend on.

```text
$ cat thread.txt
Request sent 3 weeks ago, no reply
```
? What approach works?
+ Explain their benefit, find the owner of the priority, offer to do part of the work and escalate with facts
- Complain publicly
- Do it yourself without telling them
why: Influence comes from shared goals and trust, not authority.

## Feedback that lands badly
level: mid
You tell a colleague their work is bad.

```text
$ cat feedback.txt
Your pull request was sloppy.
```
? How do you rewrite it?
+ Describe the behaviour and impact, give an example and suggest a next step
- Say nothing
- Say it in public
why: Specific, private, kind feedback is easier to act on.

## Incident with no roles
level: mid
Ten people debug at once and nobody coordinates.

```text
$ cat channel.log
10:05 try restart
10:05 try rollback
10:06 try restart
```
? What should happen first?
+ Name an incident commander and assign communication and operations roles
- Add more people
- Wait
why: One person coordinating prevents conflicting actions.

## Promotion feedback
level: senior
You are told you need more scope for the next level.

```text
$ cat feedback.txt
Strong delivery; impact limited to your team
```
? What should you do?
+ Pick a problem across teams, write the plan, bring others along and show outcomes
- Work longer hours
- Ask for a title
why: Scope is about the size of problems you own and enable.
