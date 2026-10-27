## The surprise bill
module: cloud
level: Beginner
minutes: 7
lesson: cloud/managed-services-and-cost
summary: The monthly cloud bill is three times higher than usual. Learn to find cost sources and stop the leak safely.
intro: Finance reports that this month's cloud bill is three times last month's. Nobody knows why, and the month is only half over.

### s1
text: Several things changed this month and you need facts before you act on anything. Where do you start?
- Open the cost explorer, group by service and by tag or account, and compare with last month => s2 | 2 | You need to find what grew. Example: data transfer went from 200 to 9,000 dollars, in one account.
- Shut down random resources => s2 | 0 | You might remove production. Example: a database used by checkout is stopped.
- Wait for the end of the month => s2 | 1 | Costs continue to grow every day. Example: another two weeks at the new rate triples the damage.

### s2
text: The cost explorer shows a large increase in data transfer from a storage service in a test account. What next?
- Look at access logs and metrics to find which requests or resources cause the transfer => s3 | 2 | Find the actor behind the bytes. Example: one bucket serves a 4 GB file to a partner every few seconds.
- Delete the bucket => end-fail | 0 | Deleting data is permanent. Example: the partner file is the only copy.
- Block all traffic to the account => s3 | 1 | It stops the cost and breaks legitimate use. Example: test pipelines fail.

### s3
text: A script from a test pipeline downloads a large dataset in a loop because of a bug. How do you stop the leak?
- Stop the job, fix the loop, then confirm the cost trend flattens => s4 | 2 | Stop the cause, then verify. Example: after the job is stopped, hourly data transfer drops to the normal level.
- Raise the budget => s4 | 0 | It pays for the bug. Example: the bill keeps growing.
- Ignore it since it is the test account => s4 | 1 | Test accounts bill at the same rate. Example: 9,000 dollars is real money.

### s4
text: Finance asks for the charge to be explained. What do you provide?
- A short timeline, the cause, the amount, the fix and what you changed to prevent it => s5 | 2 | A clear account builds trust and supports a possible provider credit request. Example: "Loop bug, 11 days, 8,800 dollars, fixed on the 14th, alert added".
- A promise that it will not happen again => s5 | 1 | Promises are weaker than controls. Example: nobody can verify the promise.
- Nothing, it is technical => end-fail | 0 | Finance needs facts. Example: the next budget talk is hostile.

### s5
text: The leak is stopped and explained. What controls do you add so the next one is caught within a day?
- Budgets with alerts at 50, 80 and 100 percent, cost anomaly detection, tags for ownership and limits in test accounts => end-win | 2 | Alerts catch trends early. Example: an anomaly alert triggers within a day of a spike.
- Monthly manual review only => end-ok | 1 | Too slow for a fast leak. Example: a leak runs for 29 days.
- Block all test activity => end-fail | 0 | It stops learning and testing. Example: engineers work around the block.

### end-win
end: win
text: The leak was stopped on day 14, the cost is explained, and budgets with anomaly alerts guard every account.
takeaway: Cost is a reliability signal. Group, trace, stop, explain and alert.

### end-ok
end: ok
text: The bill is under control, though the controls are still partial.
takeaway: Finish the budgets and ownership tags.

### end-fail
end: fail
text: The leak continued or valuable data was deleted in a panic.
takeaway: Find the cause before you act on the bill.

## The storage bucket open to everyone
module: cloud
level: Intermediate
minutes: 7
lesson: cloud/security-and-governance
summary: A security researcher reports a public storage bucket. Learn response, scope, fixes and prevention.
intro: An email arrives from a security researcher: one of your storage buckets lists customer invoices to anyone on the internet.

### s1
text: The report looks credible and every minute the data is open increases the risk. What do you do first?
- Confirm the report, then block public access on the bucket right away => s2 | 2 | Stop the exposure first, then investigate. Example: enable the account-level block-public-access setting for the bucket and confirm an anonymous request now fails.
- Reply that it is not a problem => s2 | 0 | Ignoring a valid report invites worse. Example: the researcher posts it publicly.
- Delete the bucket => s2 | 1 | You destroy evidence and data. Example: you lose the access logs and invoices.

### s2
text: The bucket is closed. What do you need to learn next?
- How long it was public, who accessed it, and what data it holds => s3 | 2 | Scope decides legal and customer duties. Example: access logs show 1,200 requests from 15 unknown addresses over 9 days.
- Nothing more, it is closed => end-fail | 0 | Closing the door does not tell you who came in. Example: the data may already be copied.
- Who made the mistake, to blame them => s3 | 1 | Blame does not help the response. Example: the facts are hidden by fear.

### s3
text: Logs show real downloads by unknown addresses. Who must be informed?
- Your security lead, legal or privacy officer, and management, following the incident plan => s4 | 2 | Customer data exposure often has legal deadlines. Example: some rules require notification within 72 hours of becoming aware.
- Nobody, to avoid panic => s4 | 0 | Silence can break the law and trust. Example: customers learn from the news.
- Only the team => s4 | 1 | Others need to decide on duties. Example: legal cannot start the clock.

### s4
text: Why was the bucket public in the first place?
- Find the policy or setting and the change that made it public, such as a manual console change or a template => s5 | 2 | The cause tells you which guardrail failed. Example: a template had "acl: public-read" for a demo and was reused.
- Assume it was the researcher => end-fail | 0 | Read-only listing does not need an attack. Example: the policy allowed everyone.
- It does not matter => s5 | 1 | The same error will repeat. Example: the template creates another public bucket.

### s5
text: You know the cause and the scope. What prevents a repeat of this exposure in other buckets and accounts?
- Account-level block of public access, policy checks in code review and pipeline, and regular scans for public resources => end-win | 2 | Several layers catch mistakes at different times. Example: a pipeline rule fails any template with public-read, and a nightly scan lists public buckets.
- A reminder email to engineers => end-ok | 1 | Emails are forgotten. Example: three months later a new engineer repeats it.
- Nothing, close the case => end-fail | 0 | The cause remains. Example: the next demo bucket is public.

### end-win
end: win
text: The exposure was closed within the hour, scope was established, the right people were told, and guardrails now block public buckets by default.
takeaway: Contain first, scope next, inform the right people, then fix the cause with guardrails.

### end-ok
end: ok
text: The bucket is closed and the facts known, though prevention is partial.
takeaway: Add automated guardrails so a single mistake cannot expose data again.

### end-fail
end: fail
text: The data stayed exposed or the response was hidden, which harmed customers and trust.
takeaway: Fast containment and honest scoping are the core of a security response.

