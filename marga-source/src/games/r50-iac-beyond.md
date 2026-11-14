## The rename that destroyed a database
module: iac-beyond
level: Advanced
minutes: 7
lesson: iac-beyond/state-secrets-and-safe-migrations
summary: A refactor shows a destroy and create for the production database. Stop it safely.
intro: A pull request renames a module and the plan wants to destroy and recreate the production database. It is Friday afternoon and the apply job is waiting.

### s1
text: What do you do with the plan? Choose the best next step.
- Do not apply, and read the plan to find why the address changed => s2 | 2 | A destroy of a database needs a reason. Example: The plan shows the old and new resource addresses.
- Apply because the code looks right => s2 | 1 | Risky. Example: The database is destroyed.
- Approve it quickly => end-fail | 0 | Review is the control. Example: Data loss follows.

### s2
text: How do you keep the existing resource? Choose the best next step.
- Add a moved block from the old address to the new address => s3 | 2 | State is updated, not the resource. Example: The plan then shows no changes.
- Delete the state entry => s3 | 1 | Orphans the real database. Example: A new empty database is created.
- Rename the database => end-fail | 0 | Also recreates it. Example: The change still destroys data.

### s3
text: What protects against this in future? Choose the best next step.
- Set prevent_destroy on critical resources and require plan review => s4 | 2 | Guardrails stop mistakes. Example: A destroy now fails with an error.
- Hope reviewers notice => s4 | 1 | Unreliable. Example: The next plan is huge and skimmed.
- Turn off plan output => end-fail | 0 | Hides risk. Example: Nobody sees what changes.

### s4
text: What about backups and state? Choose the best next step.
- Back up state, enable locking and confirm a database backup is recent before applying => end-win | 2 | Safety net before change. Example: A snapshot was taken ten minutes earlier.
- Skip backups for small changes => end-ok | 1 | Small changes can be large. Example: The rename was small and the impact large.
- Share state in chat => end-fail | 0 | Unsafe. Example: A secret leaks.

### end-win
end: win
text: The database was kept with a moved block, protected with prevent_destroy and backed by a snapshot.
takeaway: Use moved blocks for renames, guard critical resources and read every destroy.

### end-ok
end: ok
text: The database survived but guardrails and backups were only partly added.
takeaway: Add destroy protection and backups. Review the lesson and try again.

### end-fail
end: fail
text: The plan was applied or state edited, and the database was lost or orphaned.
takeaway: Never apply a surprise destroy. Review the lesson and try again.
