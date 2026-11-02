## The release that needs to go back
module: cicd
level: Intermediate
minutes: 7
lesson: cicd/deployment-strategies
summary: A new release breaks checkout and a database change makes rollback hard. Learn rollback, expand and contract.
intro: At 10:15 a release goes to all users. By 10:25 checkout errors triple. The release also ran a database migration that renamed a column.

### s1
text: Errors are rising after the release. What do you do first?
- Stop the rollout or send traffic back to the previous version, then investigate => s2 | 2 | Limit the damage first, then find the cause. Example: with a canary or blue-green setup you switch traffic back in a minute.
- Fix forward quickly by editing production code => s2 | 0 | A rushed patch without tests often adds a second bug. Example: a hand edit on a server is lost on the next deploy.
- Wait ten minutes to see if it settles => s2 | 1 | Waiting costs customers. Example: ten minutes of failed payments is real money.

### s2
text: You try to roll back the code. The old version crashes because the column it reads was renamed by the migration. What went wrong in the design?
- The migration was not backward compatible, so old code cannot run on the new schema => s3 | 2 | Both versions must work with the schema during a release. Example: the old code reads user_name, which no longer exists.
- Rollbacks never work => end-fail | 0 | They work when changes are compatible. Example: a rollback of code only, with an added column, is safe.
- The old code has a bug => s3 | 1 | The old code was fine for the old schema. Example: it worked yesterday.

### s3
text: The site is down on both versions. What is the quickest safe way back?
- Add back the old column name (or a compatible view) so the old code works, then roll back => s4 | 2 | Restoring compatibility is faster and safer than a huge restore. Example: ALTER TABLE users ADD COLUMN user_name and copy values from the new column, or create a view with the old name.
- Restore last night's full database backup => s4 | 0 | It loses a day of orders. Example: 3,000 orders placed since midnight disappear.
- Rebuild the old version from scratch => s4 | 1 | It does not solve the schema problem. Example: the rebuilt code fails exactly the same way.

### s4
text: Service is back. The team asks how to avoid this next time. What do you propose?
- Use expand and contract: add new column, write both, migrate readers, then remove the old column in a later release => s5 | 2 | Each step is compatible with the previous and next code version. Example: release 1 adds full_name and writes both; release 2 reads full_name; release 3 drops user_name.
- Rename columns only at night => s5 | 1 | Timing does not fix compatibility. Example: a rollback at 03:00 fails the same way.
- Ban schema changes => end-fail | 0 | Schemas must evolve. Example: new features need new columns.

### s5
text: The service is stable again and the team wants to stop this class of failure. What do you add to the pipeline?
- A test that runs the previous version against the new schema, plus a canary step with automatic rollback => end-win | 2 | Test compatibility before production sees it. Example: the pipeline starts the old image against the migrated test database and runs smoke tests.
- A longer approval meeting => end-ok | 1 | Meetings find some issues. Example: nobody notices the rename in a 400-line diff.
- Nothing, it was a one-off => end-fail | 0 | It will happen again with a different change. Example: the next dropped column has the same outcome.

### end-win
end: win
text: The release was rolled back safely. Future migrations use expand and contract, and the pipeline tests the old version against the new schema.
takeaway: Make every release compatible with the version before and after it, so rollback is always possible.

### end-ok
end: ok
text: Service returned after a hard night. The new rules are written down but not yet tested in the pipeline.
takeaway: Process helps, and automation is what keeps it.

### end-fail
end: fail
text: The outage lasted hours and data was lost in the restore.
takeaway: Rollback is a feature that must be designed in, especially for data.

## The pipeline that took forty minutes
module: cicd
level: Intermediate
minutes: 7
lesson: cicd/fast-pipelines-caching-parallelism-monorepos
summary: Developers wait forty minutes for feedback. Learn to measure, cache, parallelise and trim a pipeline.
intro: The team merges less often because the pipeline takes forty minutes. Developers start other work, forget the build, and broken main goes unnoticed.

### s1
text: Several things changed this month and you need facts before you act on anything. Where do you start?
- Measure: list each stage with its duration and find the slowest => s2 | 2 | You cannot speed up what you have not measured. Example: install 9 minutes, build 6, unit tests 8, integration tests 14, upload 3.
- Buy faster runners => s2 | 1 | It may help a little but hides waste. Example: 40 minutes becomes 33 and waste remains.
- Cut the tests => s2 | 0 | Fewer tests reduce safety without understanding. Example: a bug escapes that the removed test would have caught.

### s2
text: Dependency install takes 9 minutes on every run. What helps?
- Cache dependencies keyed by the lock file hash => s3 | 2 | The cache is reused until the lock file changes. Example: key npm-${hash(package-lock.json)} restores node_modules in 20 seconds.
- Install only on Mondays => end-fail | 0 | Stale dependencies cause confusing failures. Example: a missing package breaks Tuesday builds.
- Use a smaller project => s3 | 1 | Not a pipeline fix. Example: the project needs those dependencies.

### s3
text: Tests run in one long sequence of 22 minutes. How can you cut it?
- Split tests across parallel workers and run independent stages at the same time => s4 | 2 | Total time becomes about the slowest part. Example: four workers each take 5 or 6 minutes of integration tests.
- Run tests only before release => s4 | 0 | Late feedback is expensive. Example: a broken test found a week later takes hours to trace.
- Increase timeouts => s4 | 1 | A longer timeout does not make it faster. Example: the pipeline just waits longer.

### s4
text: Every change rebuilds and tests the whole monorepo, although most changes touch one service. What is the improvement?
- Run only the stages affected by the changed paths, with a full run on main => s5 | 2 | Path-based selection saves time with a safety net. Example: a docs-only change runs lint and skips the 14-minute integration suite.
- Split the repo into 30 repos now => s5 | 1 | A large move with its own cost. Example: shared code becomes hard to change.
- Skip tests for small changes by trust => end-fail | 0 | Small changes also break things. Example: a one-character config change breaks startup.

### s5
text: The pipeline now takes 11 minutes. How do you stop it from getting slow again?
- Track pipeline duration as a metric with a budget and an alert => end-win | 2 | A budget keeps the speed visible. Example: an alert fires when the 90th percentile exceeds 15 minutes.
- Celebrate and move on => end-ok | 1 | Pipelines slow gradually. Example: six months later it is back to 30 minutes.
- Freeze new tests => end-fail | 0 | Tests are useful. Example: new features go untested.

### end-win
end: win
text: Feedback arrives in 11 minutes. Developers merge small changes often, and main stays green.
takeaway: Measure first, cache what repeats, run independent work in parallel, and keep a budget.

### end-ok
end: ok
text: The pipeline is faster, but nobody watches it. It will slow down again.
takeaway: Speed is a habit. Make it visible.

### end-fail
end: fail
text: Developers kept waiting, merges got bigger and riskier.
takeaway: Slow feedback shapes behaviour. Fast feedback is a feature.

