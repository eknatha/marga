## The path nobody walks
module: platform
level: Intermediate
minutes: 7
lesson: platform/golden-paths-and-paved-roads
summary: A golden path is losing users. Work out why and what to change without forcing anyone.
intro: Your platform team launched a service template six months ago. Adoption was good at first, and now new services are leaving it. Leadership suggests making it mandatory.

### s1
text: Seven teams left the path and listed reasons. What do you do first?
- Interview the teams and rank the reasons by how many services each affects => s2 | 2 | Exits are product feedback. Example: Runtime too old affects 7 services and a missing queue option affects 5, so they come first.
- Make the path mandatory so the numbers recover => end-fail | 0 | This hides the signal and builds resentment. Example: Teams copy the template and then change it in secret.
- Wait another quarter => s2 | 1 | Waiting loses users and gives no information. Example: Two more teams leave, and the template is another quarter older.

### s2
text: The top reason is an outdated runtime. What change fits a paved road?
- Support two runtime versions and push upgrades as pull requests => s3 | 2 | Staying current should be cheaper than leaving. Example: A bot opens a pull request in each service when a new version is supported.
- Pin the runtime forever for stability => s3 | 0 | A pinned old version pushes people off the path for security fixes. Example: A team that needs a security fix builds its own pipeline.
- Tell teams to upgrade by hand => s3 | 1 | It moves the work to every team. Example: Forty teams each spend an afternoon on the same change.

### s3
text: Five teams need a message queue the template lacks. How do you respond?
- Add an optional queue module with secure defaults and document how to bring your own => s4 | 2 | Customisation inside the path keeps teams supported. Example: The template asks one question, queue yes or no, and wires access and alerts for it.
- Reject the request because the path must stay small => s4 | 1 | A path that never grows stops being useful. Example: Teams build queues in five different ways.
- Let each team build their own queue outside the path => s4 | 0 | The result is five unsupported setups with no shared security review. Example: One of them has no encryption and nobody notices for months.

### s4
text: How do you know the changes worked? Choose the best next step.
- Track time to first deploy, the share of new services on the path and why teams leave => end-win | 2 | Measure both ease and exits. Example: Time to first deploy falls from four days to six hours and exits drop to two a quarter.
- Count how many documents were written => end-fail | 0 | Activity is not value. Example: Forty pages exist and adoption is unchanged.
- Ask leadership if they are happy => end-ok | 1 | It is only a weak signal. Example: Leadership is happy until a team reports a blocker.

### end-win
end: win
text: The numbers recovered for a while, but forcing the path hid why teams were leaving.
takeaway: Listen to the exits and keep the path easy. Review the lesson and try again.

### end-ok
end: ok
text: Adoption improved, new options keep teams supported, and exits are now read as feedback.
takeaway: Treat a golden path as a product. Fix the reasons teams leave rather than forcing them to stay.

### end-fail
end: fail
text: The path was made mandatory and teams worked around it, so security and support got worse.
takeaway: Mandating a weak product causes quiet workarounds. Review the lesson and try again.

## The database that never appeared
module: platform
level: Advanced
minutes: 7
lesson: platform/platform-apis-with-crossplane-and-operators
summary: A custom Database object is accepted but nothing is created. Trace it and make the failure visible.
intro: A team applied a Database resource at 09:00. At 10:00 the app still cannot connect and the object shows SYNCED true and READY false.

### s1
text: What do you check first? Choose the best next step.
- Describe the object and read its status conditions and events => s2 | 2 | Status and events show the first failing step. Example: The message says quota exceeded in the region.
- Delete the object and create it again => s2 | 1 | It may repeat the same failure and loses the evidence. Example: The new object fails the same way, and the first error is gone.
- Restart the app => end-fail | 0 | The app is not the problem yet. Example: The app restarts and still cannot connect.

### s2
text: The cloud quota is exceeded. What is the immediate fix?
- Raise the quota or pick a different region and let the control plane reconcile => s3 | 2 | The controller keeps trying until the cause is gone. Example: After the quota rises the instance is created in minutes.
- Create the instance by hand in the console => s3 | 1 | It works once but the control plane no longer matches reality. Example: A later reconcile conflicts with the hand-made instance.
- Wait for it to fix itself => s3 | 1 | A quota will not change on its own. Example: The object stays not ready for another hour.

### s3
text: The platform knew about the quota error from the start. What should change?
- Show the error in the object status and alert when READY stays false past a limit => s4 | 2 | The abstraction must be honest about failures. Example: A ten minute alert tells the owner while the user still waits.
- Hide the READY column => s4 | 0 | Hiding status makes things worse. Example: Users cannot tell whether anything is wrong.
- Tell users to read controller logs => s4 | 1 | Users should not need platform internals. Example: Nobody outside the platform team can read those logs.

### s4
text: How do you prevent a repeat? Choose the best next step.
- Add a pre-check for quota in the composition and a dashboard of not-ready resources => end-win | 2 | Catch it before and see it after. Example: A pre-check blocks the request with a clear message.
- Give every team unlimited quota => end-fail | 0 | It removes a safety limit and hides cost. Example: One runaway loop creates hundreds of instances.
- Close the ticket => end-ok | 1 | The same failure will return. Example: Next month another team hits the same wall.

### end-win
end: win
text: The instance appeared, but the next user will wait an hour for the same reason.
takeaway: Fix the cause in the platform, not just the instance. Review the lesson and try again.

### end-ok
end: ok
text: The failure is visible in the status, an alert tells the owner, and quota is checked before creation.
takeaway: Make failures show where users look. An honest abstraction builds trust.

### end-fail
end: fail
text: The real cause stayed hidden and the team lost time restarting things that were fine.
takeaway: Read status and events first. Review the lesson and try again.
