## Green yesterday, red today
module: cicd
level: Intermediate
minutes: 6
lesson: cicd/pipeline-fundamentals
summary: The main branch pipeline fails with no code change. Decide how to find the cause and unblock the team.
intro: Monday morning. The pipeline on the main branch is red, and ten developers are waiting to merge. Nobody changed the code since Friday, when the pipeline was green.

### s1
text: The build step fails with a compile error in a library the team did not touch. What do you do first?
- Re-run the pipeline until it passes => s2 | 0 | Re-running without understanding hides the problem. If the cause is a changed dependency it will fail every time.
- Read the first error in the log and compare tool and dependency versions with Friday's successful run => s3 | 2 | The first error and a version comparison are the fastest way to find drift.
- Tell everyone to skip the pipeline for now => end-fail | 0 | Skipping checks lets broken code reach production.

### s2
text: You re-ran the pipeline twice. It failed the same way both times. What does this tell you?
- The failure is consistent, not flaky, so something changed in the environment => s3 | 2 | Consistent failure with no code change means the inputs changed.
- The runners are broken => s3 | 0 | Different runners would give different results. A consistent failure points to the inputs.

### s3
text: Comparing the logs: Friday used lodash 4.17.21 and today the build downloaded lodash 4.18.0. The project installs with a version range and has no lockfile. What is the cause?
- A new dependency version was released and picked up automatically => s4 | 2 | Without a lockfile the build takes whatever is newest.
- A cache problem => s4 | 0 | The logs show that a different version was downloaded.

### s4
text: You need to unblock the team now and prevent it from happening again. What is your first step?
- Pin the dependency to the last working version in the project file so the build is green again => s5 | 2 | A quick, safe, reversible fix gets everyone moving.
- Upgrade the whole project to the new version immediately => s5 | 1 | That may be right in the long run, but fixing a breaking change under pressure is risky.

### s5
text: The pipeline is green again. What is the lasting fix?
- Commit a lockfile, install with a clean install command, and pin the build image => s6 | 2 | The build becomes repeatable.
- Ask developers to be more careful => end-fail | 0 | A person cannot prevent a new release from appearing upstream.

### s6
text: How do you find out about dependency drift before it blocks a Monday?
- A scheduled nightly build and an automated dependency update tool that opens reviewed changes => end-win | 2 | Drift appears in a scheduled run or a review, not during a busy morning.
- Nothing, it was rare => end-ok | 1 | It was rare, until it happened.

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
