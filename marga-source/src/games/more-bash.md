## The deploy script that said OK and was not OK
module: bash
level: Intermediate
minutes: 7
lesson: bash/safe-automation
summary: A script prints success after a step failed. Learn exit codes, set -e and pipefail with examples.
intro: The nightly deploy script ends with "deploy finished OK" every time. This morning the site shows old content and the script log still says OK.

### s1
text: You open the script. It runs a build, copies files and prints OK. What do you look at first?
- The exit status of each step and whether the script stops on a failure => s2 | 2 | Without set -e a script continues after errors and ends with the status of its last command. Example: cp fails because the file is missing, but echo "OK" still runs and exits 0.
- Rewrite the script in another language => s2 | 0 | A rewrite is large and may repeat the same mistake. Example: the new code ignores the failure of the first call too.
- Add more echo lines to see what happens => s2 | 1 | More output helps a little, but the script still carries on after errors. Example: you can see the cp error in the log and the script still prints OK.

### s2
text: You add set -e. The script now stops, but one line is "grep needle file | sort > out", and grep finds nothing, which is a normal case. What happens?
- The script exits at grep, so handle the no-match case explicitly, for example with || true => s3 | 2 | grep returns 1 when nothing matches, and set -e treats that as failure. Example: grep needle file || true keeps the script going when no line matches.
- Remove set -e again => s3 | 1 | That brings back silent failures. Example: the next copy error is ignored again.
- Wrap the whole script in a loop that retries => end-fail | 0 | Retrying a logic error repeats it. Example: the script retries grep ten times and fails ten times.

### s3
text: A line reads: curl -s "$URL" | tar xz. The download fails with an error page but the script continues. What do you add?
- set -o pipefail, so the pipeline fails when any stage fails => s4 | 2 | By default a pipeline returns the status of its last command. Example: curl fails with 22, tar gets an empty input and fails with its own error only sometimes; with pipefail the failure is always seen.
- Ignore it, tar will complain => s4 | 1 | tar may complain, or may extract an HTML error page as a broken file. Example: you ship a partial site.
- Redirect all errors to /dev/null => s4 | 0 | Hiding errors is the opposite of finding them. Example: the log is clean while the site is broken.

### s4
text: Another line uses $TARGET_DIR/ with rm -rf. The variable is sometimes empty. How do you protect against it?
- Use set -u and ${TARGET_DIR:?must be set} so an empty value stops the script => s5 | 2 | set -u fails on an unset variable and :? fails on an empty one. Example: rm -rf "${TARGET_DIR:?}/old" stops with an error instead of running rm -rf /old.
- Check by eye before every run => end-fail | 0 | People forget, and cron does not check by eye. Example: the job runs at 02:00 with an empty value.
- Use rm -rf with a wildcard to be sure => s5 | 1 | A wildcard makes the empty case worse. Example: rm -rf $DIR/* with DIR empty becomes rm -rf /*.

### s5
text: The script is fixed. How do you make sure the next failure is noticed?
- Exit non-zero on failure, log errors to stderr, and have the scheduler alert on non-zero exit => end-win | 2 | Exit codes are the signal that schedulers and CI understand. Example: cron mails the output or your job runner marks the run failed.
- Keep printing OK at the end => end-ok | 1 | A final OK is only honest if it is reached only when everything worked. Example: with set -e the OK line is skipped on failure.
- Check the log manually each morning => end-fail | 0 | Manual checks depend on someone remembering. Example: the one morning nobody looks is the morning it matters.

### end-win
end: win
text: The script stops at the first real error, exits non-zero, and the scheduler raises an alert. OK now means OK.
takeaway: Use set -euo pipefail, handle expected non-zero results on purpose, and let exit codes carry the truth.

### end-ok
end: ok
text: Most failures now stop the script, but a few paths still hide errors.
takeaway: Strict mode is a good base. Review each pipe, variable and expected failure.

### end-fail
end: fail
text: The script kept reporting OK while the site stayed broken, and a cleanup step ran on an empty variable.
takeaway: Silent failure is the most expensive kind. Make scripts fail loudly.

