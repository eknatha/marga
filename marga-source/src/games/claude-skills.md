## The skill that never triggered
module: claude-skills
level: Intermediate
minutes: 7
lesson: claude-skills/debugging-skills-that-do-not-trigger-or-misbehave
summary: A new skill is installed but never used. Work out whether discovery, description or body is at fault.
intro: The team wrote a contract-review skill last week. Colleagues ask Claude to review contracts, but the skill is never loaded and answers are generic.

### s1
text: The skill never seems to load. What do you test first?
- Check the folder location, the exact SKILL.md file name and the header, then ask for the skill by name => s2 | 2 | This separates a discovery problem from a description problem. Example: The file is named skill.md in lower case, so it is not discovered at all.
- Rewrite the whole body => s2 | 1 | The body only loads after the skill triggers. Example: Hours of work change nothing because the skill is invisible.
- Install a bigger model => s2 | 0 | Model size does not fix a file name. Example: The new model also ignores a skill it cannot see.

### s2
text: After fixing the file name, the skill loads only when named. What is likely wrong?
- The description is vague, so it does not match natural requests => s3 | 2 | Triggering depends on the description. Example: The description says Helps with legal stuff, with no mention of contracts, clauses or review.
- The user asks in the wrong way => s3 | 1 | Skills must work for ordinary phrasing. Example: People will not memorise a magic phrase.
- The scripts are too short => s3 | 0 | Scripts are not part of triggering. Example: Changing scripts has no effect on discovery.

### s3
text: Given what you have found so far: How do you verify the new description?
- Run 10 requests that should trigger it and 10 near-misses that should not, and record the results => end-win | 2 | You measure both misses and false triggers. Example: Nine of ten should-trigger requests load the skill and none of the near-misses do.
- Try one request and stop => end-ok | 1 | One success is not evidence. Example: The skill fails for requests phrased as clause check.
- Make the description as broad as possible => end-fail | 0 | It will fire on unrelated tasks. Example: The contract skill loads for every document question.

### end-win
end: win
text: The skill triggers on the right requests and not on unrelated ones, and the tests are saved.
takeaway: Debug in order: discovery, description, body. Test with should and should-not trigger requests.

### end-ok
end: ok
text: The skill triggers now, but nobody measured false triggers.
takeaway: Fix discovery and wording, then measure both kinds of error.

### end-fail
end: fail
text: The skill stays invisible and the team stops trusting it.
takeaway: Rewriting the body cannot help a skill that never loads.


## The downloaded skill that phoned home
module: claude-skills
level: Intermediate
minutes: 7
lesson: claude-skills/sharing-versioning-and-skill-security
summary: A popular skill from a public repository includes a script that sends data to an unknown server. Handle it safely.
intro: A teammate installed a spreadsheet-cleaning skill found online. During review you notice a bundled script makes a network request to an address nobody recognises.

### s1
text: You find a network call in a bundled script. What do you do first?
- Stop using the skill, remove it from shared locations, and review what the script could access => s2 | 2 | You contain the exposure before analysing. Example: The skill is removed from the team folder and the machines that ran it are listed.
- Leave it because many people use it => s2 | 1 | Popularity is not safety. Example: Thousands of users does not mean the code was reviewed.
- Edit the URL and keep going => s2 | 0 | You still run code you have not understood. Example: A second hidden call remains in another file.

### s2
text: What should you review about the incident?
- What data the script could read, what ran, and whether any credentials or files were exposed => s3 | 2 | You decide whether to rotate secrets. Example: Logs show it ran twice against a folder holding an API token, so the token is rotated.
- Nothing, the data was only spreadsheets => s3 | 1 | Spreadsheets can hold sensitive data. Example: The folder contained customer exports.
- Only check the skill's star count => s3 | 0 | Stars say nothing about behaviour. Example: The count was inflated by the same account.

### s3
text: How should the team treat outside skills from now on?
- Read every file, test in a sandbox without network, pin a reviewed commit, and re-review updates => end-win | 2 | This is the same care as for any dependency. Example: The team keeps an allowlist of reviewed skills with an owner for each.
- Allow everything on personal machines => end-ok | 1 | Personal machines hold company data. Example: Another unreviewed skill is installed next month.
- Ban skills entirely => end-fail | 0 | You lose the benefit when review is enough. Example: People install skills secretly instead.

### end-win
end: win
text: The risky skill is gone, secrets are rotated, and outside skills go through review.
takeaway: Treat outside skills as untrusted code: read, sandbox, pin and re-review.

### end-ok
end: ok
text: The skill is removed, but the review process is still informal.
takeaway: Remove the risk, then build a review habit.

### end-fail
end: fail
text: Data may continue to leave and nobody knows.
takeaway: A skill can run code, so popularity is never a security check.

