## The cleanup that matched everything
module: python-ops
level: Intermediate
minutes: 7
lesson: python-ops/working-with-cloud-and-kubernetes-sdks-with-safe-patterns
summary: A cleanup script is about to delete thousands of resources. Stop it and make it safe.
intro: A cleanup script was meant to remove resources tagged temp. A dry run shows 4812 matches, far more than expected. The scheduled run is in ten minutes.

### s1
text: What do you do right now? Choose the best next step.
- Disable the scheduled run and keep the dry run output => s2 | 2 | Stop damage and keep evidence. Example: The schedule is paused.
- Let it run and watch => s2 | 1 | Too late if it deletes. Example: Thousands of resources are gone.
- Delete the script file => end-fail | 0 | Loses the cause. Example: Nobody knows what happened.

### s2
text: How do you find the cause? Choose the best next step.
- Check the filter and the tag value handling in a test with a fake client => s3 | 2 | Tests reproduce the bug. Example: An empty tag value matches everything.
- Guess => s3 | 1 | Unreliable. Example: The wrong fix.
- Blame the cloud => end-fail | 0 | Not helpful. Example: The bug remains.

### s3
text: What guardrails do you add? Choose the best next step.
- A per run limit, a required non empty filter, dry run by default and logs of every action => s4 | 2 | Several layers protect you. Example: The run aborts when matches exceed 50.
- A comment in the code => s4 | 1 | Not enforced. Example: The bug returns.
- Remove the dry run => end-fail | 0 | Less safe. Example: The next mistake is live.

### s4
text: How should the script get credentials? Choose the best next step.
- Use a least privilege role that can only delete the tagged class => end-win | 2 | Limits the blast radius. Example: The role cannot touch production data.
- Use an admin key => end-ok | 1 | Large blast radius. Example: Any bug affects everything.
- Share a password => end-fail | 0 | Unsafe. Example: No audit trail.

### end-win
end: win
text: The run was stopped, the bug found with a test and guardrails and a limited role make the next mistake small.
takeaway: Pause first, test the filter and add limits, dry run and least privilege.

### end-ok
end: ok
text: The deletion was stopped but guardrails are incomplete.
takeaway: Add limits and a scoped role. Review the lesson and try again.

### end-fail
end: fail
text: The script ran or evidence was lost and many resources were deleted.
takeaway: Never let a surprising count run. Review the lesson and try again.
