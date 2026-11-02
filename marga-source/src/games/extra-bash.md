## The script that ran twice
module: bash
level: Intermediate
minutes: 6
lesson: bash/temporary-files-and-atomic-writes
summary: A scheduled script overlapped with itself and corrupted a shared file. Add a lock and atomic writes.
intro: The hourly report script usually takes ten minutes. Today it took ninety, and the next run started while it was still going.

### s1
text: Two copies ran together and the output file is broken. What do you do first?
- Stop the extra copy, keep the evidence and restore the last good file => s2 | 2 | Stop the damage and keep what you need to understand it. Example: Killing the second process and copying the last good report back restores service.
- Delete the report and rerun everything => s2 | 1 | It may work but loses evidence and repeats the risk. Example: A rerun overlaps with the next scheduled run and the same corruption can happen again.
- Do nothing, it will fix itself next hour => end-fail | 0 | A corrupted file stays corrupted and downstream users see bad data. Example: The dashboard shows half-written numbers until someone notices.

### s2
text: How do you stop two copies from running together?
- Take a lock at the start with flock and exit if it is held => s3 | 2 | A lock makes overlap impossible and is released automatically if the script dies. Example: flock -n 9 || exit 0 at the start of the script lets a new run skip while one is active.
- Check if a file exists and create it => s3 | 1 | A manual lock file can be left behind after a crash or can race. Example: The script crashes and the leftover lock file blocks all future runs.
- Run it less often => s3 | 0 | A slower schedule does not prevent overlap when a run takes longer. Example: Running every two hours still overlaps with a three-hour run.

### s3
text: How should the script write its output file?
- Write to a temporary file in the same directory, then rename it => s4 | 2 | Rename is atomic on one filesystem, so readers see the old or new file but never half of one. Example: mv report.tmp report.csv replaces the file in one step.
- Write directly into the final file => s4 | 0 | Readers can see a half-written file. Example: A reader opens the file while the script is at line 5,000 of 10,000.
- Write to /tmp and copy over => s4 | 1 | Copying across filesystems is not atomic. Example: cp from /tmp is a long write and can be interrupted midway.

### s4
text: How do you notice a slow run before it overlaps?
- Log start and end times and alert when a run exceeds its normal duration => end-win | 2 | Duration is a useful health signal. Example: An alert at 30 minutes warns well before the next scheduled start.
- Trust it will be fast => end-fail | 0 | Data grows and runs slow down. Example: Month-end data doubles the runtime.
- Add a longer sleep between runs => end-ok | 1 | It spaces runs but does not detect problems. Example: The next run waits, but nobody knows it is slow.

### end-win
end: win
text: The script now locks, writes atomically and alerts when it is slow, so overlap cannot corrupt output.
takeaway: Use a lock, write atomically and alert on duration.

### end-ok
end: ok
text: The immediate damage is repaired, but without a lock a slow run can overlap again.
takeaway: Repair and prevent. Review the lesson and try the game again.

### end-fail
end: fail
text: The corrupted report stayed in place and the same overlap happens next hour.
takeaway: Contain first, then prevent overlap.

## The loop that broke on spaces
module: bash
level: Beginner
minutes: 5
lesson: bash/arrays-and-parameter-expansion
summary: A cleanup loop skipped files with spaces in their names and one dangerous case nearly deleted the wrong thing.
intro: A script loops over report files and archives them. It silently ignores some files, and one run printed an odd rm command.

### s1
text: A file called q3 report.csv was not archived. What is the likely cause?
- Word splitting treated q3 and report.csv as two separate items => s2 | 2 | Unquoted expansion splits on spaces. Example: for f in $(ls) breaks q3 report.csv into q3 and report.csv.
- The file is corrupt => s2 | 0 | The file is fine; the script mishandles its name. Example: Opening the file works normally.
- The disk is full => s2 | 1 | Not related to file names. It helps only in part. Example: Other files copy normally.

### s2
text: How do you loop over files safely? Choose the move you would make next.
- Use a glob and quote the variable: for f in ./*; do ... "$f" => s3 | 2 | Globs do not split on spaces and quoting keeps one name as one word. Example: for f in ./reports/*.csv; do gzip "$f"; done handles spaces.
- Parse the output of ls => end-fail | 0 | ls output is meant for people and breaks on spaces and special characters. Example: ls | while read can lose names with leading spaces or newlines.
- Replace spaces in names first by hand => s3 | 1 | It hides the problem rather than fixing the script. Example: Renaming files by hand is slow and users keep creating new ones.

### s3
text: The script also runs rm on a variable. What protects you from deleting the wrong place?
- Use set -u, check the variable is not empty and keep paths absolute and specific => s4 | 2 | Guards stop an empty variable from widening a delete. Example: [ -n "$dir" ] && rm -- "$dir"/*.csv avoids rm -rf /* when dir is empty.
- Hope the variable is set => s4 | 0 | An unset variable can turn a narrow delete into a catastrophic one. Example: rm -rf $dir/ with dir empty becomes rm -rf /.
- Run it as root so it always works => s4 | 0 | More privilege makes mistakes worse. Example: As root the bad delete succeeds on system files.

### s4
text: How do you test the script before it touches real files?
- Run it with a dry-run option and test names with spaces, quotes and leading dashes => end-win | 2 | Tests with nasty names find bugs early. Example: A test directory containing "a b.csv" and "-rf" shows the script handles both.
- Test only with simple file names => end-ok | 1 | It passes but misses the case that breaks. Example: Simple names pass and production names fail.
- Skip testing and ship => end-fail | 0 | Risky for any script that deletes or moves files. Example: The first real run damages data.

### end-win
end: win
text: Names with spaces work, deletes are guarded, and a dry run proves it before real files are touched.
takeaway: Quote variables, use globs, guard deletes and test odd names.

### end-ok
end: ok
text: The loop works now, but untested edge cases can still hurt.
takeaway: Test with unusual names. Review the lesson and try the game again.

### end-fail
end: fail
text: The script mishandled names and a bad variable nearly widened a delete.
takeaway: Quote, guard and test. Review the lesson and try the game again.

