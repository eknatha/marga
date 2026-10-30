## The merge conflict at release time
module: git
level: Intermediate
minutes: 6
lesson: git/branches-and-merging
summary: Two branches changed the same file hours before a release. Resolve the conflict without breaking the code.
intro: The release is at 17:00. Two teams changed the same configuration file, and the merge into the release branch stops with conflict markers.

### s1
text: Git reports conflicts in a config file. What do you do first?
- Open the file, read both sides and talk to the authors about what each change was for => s2 | 2 | A conflict is a question about intent, so understand both changes before choosing. Example: One side changes a timeout and the other renames a key. Both are needed.
- Accept your version for the whole file => end-fail | 0 | This silently drops the other team work. Example: Taking ours removes the renamed key and the service fails to start.
- Delete the markers and commit => s2 | 0 | Markers removed without a decision leaves broken or mixed content. Example: The file still contains both versions of one line and fails validation.

### s2
text: You combine both changes. What next? Choose the move you would make next.
- Run the tests or validate the config before committing => s3 | 2 | A resolved file can still be wrong, so check it. Example: A config linter shows a duplicate key from the merge and you fix it before it ships.
- Commit and push straight away to save time => s3 | 1 | It may work but removes the safety check before the deadline. Example: The pipeline fails at 16:40 on a syntax error you could have caught locally.
- Ask someone else to commit => s3 | 0 | Handing off the commit does not reduce risk. Example: Both people assume the other tested it.

### s3
text: The merge is done and the release goes out. How do you reduce this pain in future?
- Merge smaller changes more often and review shared files together => end-win | 2 | Frequent integration keeps conflicts small and understandable. Example: Daily merges from main into feature branches turn one large conflict into several trivial ones.
- Forbid anyone from editing shared files => end-ok | 1 | It lowers conflicts but blocks real work and creates bottlenecks. Example: Teams then copy the file, and the copies drift apart.
- Keep long-lived branches for safety => end-fail | 0 | Long branches grow conflicts and hide risk. Example: A branch open for three weeks has conflicts in forty files.

### end-win
end: win
text: The conflict is resolved with both teams agreeing, the config validates, and smaller, more frequent merges reduce the risk next time.
takeaway: Understand intent, verify the result and integrate often.

### end-ok
end: ok
text: The release shipped, but the conflict was handled by guess and luck.
takeaway: Check the result with tests and talk to authors.

### end-fail
end: fail
text: A rushed resolution broke the release. Read each choice explanation to see why.
takeaway: Never resolve a conflict without understanding both sides.

## The commit that broke production
module: git
level: Advanced
minutes: 6
lesson: git/debugging-git-problems
summary: A bug appeared somewhere in the last two hundred commits. Find the change with bisect and fix it safely.
intro: Checkout fails since this morning. The last release tag was fine, and about two hundred commits have landed since.

### s1
text: You know a good tag and a bad commit. How do you find the culprit fastest?
- Use git bisect between the good tag and the bad commit => s2 | 2 | Bisect halves the range each step, so two hundred commits need about eight tests. Example: git bisect start HEAD v2.3.0 then test the midpoint each time and mark good or bad.
- Read every commit message one by one => s2 | 1 | It can work but is slow and relies on messages being accurate. Example: Reading two hundred messages takes an hour and may miss a change described as a cleanup.
- Revert the last ten commits and see => s2 | 0 | Blind reverts risk removing good work and may not fix the bug. Example: Reverting ten commits breaks a feature that was working.

### s2
text: Bisect needs a test for each step. What should that test be?
- A small script that reproduces the failure and exits non-zero when it fails => s3 | 2 | An automatic test lets bisect run unattended. Example: git bisect run ./check.sh finds the first bad commit with no manual input.
- Open the site by hand each time => s3 | 1 | It works but is slow and error-prone. Example: Manual checks take two minutes each and people mislabel a step.
- Skip testing and guess good or bad => end-fail | 0 | Wrong labels send bisect down the wrong half. Example: One mistaken label points to the wrong commit.

### s3
text: Bisect names a commit. What do you do before reverting it?
- Read the change, check who wrote it and why, and use blame for the line => s4 | 2 | Understanding the reason prevents a revert that breaks the original goal. Example: git blame shows the line changed for a currency rounding fix, so the revert needs an alternative fix.
- Revert at once and push => s4 | 1 | It may stop the bleeding but can reintroduce the problem the commit solved. Example: The revert restores checkout but brings back the rounding bug.
- Delete the commit from history with a force push => s4 | 0 | Rewriting shared history harms everyone who already pulled. Example: Teammates now have commits that no longer exist upstream.

### s4
text: How do you stop this class of bug reaching main again?
- Add a test for it and keep the main branch green with required checks => end-win | 2 | A test turns the incident into permanent protection. Example: A new test for the rounding case fails on the bad commit and passes after the fix.
- Ask people to be more careful => end-fail | 0 | Care does not scale and fixes nothing structurally. Example: The same kind of change slips in next month.
- Freeze merges for a week => end-ok | 1 | It reduces risk briefly but does not prevent the cause. Example: Work piles up and the next merge is bigger and riskier.

### end-win
end: win
text: Bisect found the exact commit in minutes, the fix kept its intent, and a new test guards the case.
takeaway: Bisect, understand, fix with intent and add a test.

### end-ok
end: ok
text: The bug is gone, but the same kind of change can return because there is no test.
takeaway: Turn each bug into a test. Review the lesson and try the game again.

### end-fail
end: fail
text: The wrong change was reverted or history was rewritten, and the team lost time.
takeaway: Find the cause with evidence and never rewrite shared history.

