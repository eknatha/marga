## Green yesterday, red today
module: cicd
level: Intermediate
minutes: 6
lesson: cicd/pipeline-fundamentals
summary: The main branch pipeline fails with no code change. Decide how to find the cause and unblock the team.
intro: Monday morning. The pipeline on the main branch is red, and ten developers are waiting to merge. Nobody changed the code since Friday, when the pipeline was green.

### s1
text: The build step fails with a compile error in a library the team did not touch. What do you do first?
- Re-run the pipeline until it passes => s2 | 0 | Re-running without understanding hides the problem. If the cause is a changed dependency it will fail every time. Example: Pressing re-run five times gives five red builds, because npm install now fetches version 5.0.0 which removed a function your code uses.
- Read the first error in the log and compare tool and dependency versions with Friday's successful run => s3 | 2 | The first error and a version comparison are the fastest way to find drift. Example: The first red line says 'TypeError: foo is not a function', and diffing the Friday log with today's shows library x 4.2.1 became 5.0.0.
- Tell everyone to skip the pipeline for now => end-fail | 0 | Skipping checks lets broken code reach production. Example: Skipping the pipeline for a day lets a change that breaks login merge, and it reaches production on Monday afternoon.

### s2
text: You re-ran the pipeline twice. It failed the same way both times. What does this tell you?
- The failure is consistent, not flaky, so something changed in the environment => s3 | 2 | Consistent failure with no code change means the inputs changed. Example: The same test fails on every run for every developer, which a flaky test would not do, so look for a changed input such as a version or an image.
- The runners are broken => s3 | 0 | Different runners would give different results. A consistent failure points to the inputs. Example: Two different runners both fail with the same error, so the runner is not the cause. A broken machine would fail on only some runs.

### s3
text: Comparing the logs: Friday used lodash 4.17.21 and today the build downloaded lodash 4.18.0. The project installs with a version range and has no lockfile. What is the cause?
- A new dependency version was released and picked up automatically => s4 | 2 | Without a lockfile the build takes whatever is newest. Example: The Friday log has x@4.2.1 and Monday's has x@5.0.0, because package.json says ^4 || >=4 and no lockfile fixes it.
- A cache problem => s4 | 0 | The logs show that a different version was downloaded. Example: The logs show 'downloading x-5.0.0', so the cache is not stale. It was bypassed or empty and a new version was fetched.

### s4
text: You need to unblock the team now and prevent it from happening again. What is your first step?
- Pin the dependency to the last working version in the project file so the build is green again => s5 | 2 | A quick, safe, reversible fix gets everyone moving. Example: Setting "x": "4.2.1" in package.json and pushing turns the pipeline green in ten minutes and can be reverted with one commit.
- Upgrade the whole project to the new version immediately => s5 | 1 | That may be right in the long run, but fixing a breaking change under pressure is risky. Example: Upgrading to x 5 means rewriting 40 call sites on a Monday morning with the team blocked, so it should be a planned ticket instead.

### s5
text: The pipeline is green again. What is the lasting fix?
- Commit a lockfile, install with a clean install command, and pin the build image => s6 | 2 | The build becomes repeatable. Example: Commit package-lock.json, use npm ci in the pipeline, and pin the build image to node:20.11 rather than node:latest so both builds match.
- Ask developers to be more careful => end-fail | 0 | A person cannot prevent a new release from appearing upstream. Example: Asking people to be careful cannot stop upstream from publishing x 5.0.0 on a Sunday night.

### s6
text: How do you find out about dependency drift before it blocks a Monday?
- A scheduled nightly build and an automated dependency update tool that opens reviewed changes => end-win | 2 | Drift appears in a scheduled run or a review, not during a busy morning. Example: A weekly scheduled build with no code changes, plus a dependency bot that opens pull requests for x 5.0.0 for review, shows drift on a calm day.
- Nothing, it was rare => end-ok | 1 | It was rare, until it happened. Example: A rare breakage was ignored, then a major release broke every build at 08:30 with a demo scheduled for 10:00.

### end-win
end: win
text: The team merged by lunchtime. With a lockfile and nightly builds, the next upstream change appears as a small reviewed update.
takeaway: Read the first error and compare versions. Lockfiles and pinned images make builds repeatable. Never re-run until green.

### end-ok
end: ok
text: The pipeline is green and repeatable, but the next drift in another tool could still surprise you.
takeaway: A scheduled build finds drift when nobody is in a hurry.

### end-fail
end: fail
text: Broken code reached the main branch or the team lost the morning. The cause remained.
takeaway: Do not skip checks and do not guess. Compare a good run with a bad run.
