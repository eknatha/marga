## The description that matched nothing
module: claude-skills
level: Beginner
minutes: 5
lesson: claude-skills/writing-descriptions-that-trigger
summary: A skill works when invoked by name but Claude never picks it up on its own. Fix the description.
intro: Your report-formatting skill works with /report but is never used when someone asks for "a weekly summary doc".

### s1
text: The skill works by name but not automatically. What controls automatic use?
- The description, which tells Claude when the skill applies => s2 | 2 | Claude decides from the description. Example: The description says "formats reports" with no mention of when.
- The folder name only => s2 | 1 | It helps humans but not triggering. Example: The name is fine already.
- The size of the file => s2 | 0 | Not related. That does not deal with the real cause. Example: Size does not matter.

### s2
text: How do you rewrite the description? Choose the move you would make next.
- State what it does and the situations and phrases that should trigger it => s3 | 2 | Include the user words. Example: Use when asked for weekly summaries, status reports or team updates.
- Make it as short as possible => s3 | 1 | Too little context. It helps only in part. Example: "Reports." matches nothing.
- Make it very vague to match everything => s3 | 0 | It fires when it should not. Example: It interferes with unrelated tasks.

### s3
text: How do you test it? Choose the move you would make next.
- Try realistic prompts that should and should not trigger it and note the results => s4 | 2 | Test both sides. Example: "Write a weekly summary" should trigger it, "fix this bug" should not.
- Test with the exact skill name only => s4 | 0 | That already worked. That does not deal with the real cause. Example: You learn nothing new.
- Test once => s4 | 1 | One case is not enough. It helps only in part. Example: A different phrase fails.

### s4
text: How do you keep triggering reliable? Choose the move you would make next.
- Keep a small set of trigger prompts, re-run after edits and refine from misses => end-win | 2 | Treat it like a test suite. Example: Ten prompts are checked after each change.
- Never revisit it => end-ok | 1 | Usage changes. It helps only in part. Example: Misses go unnoticed.
- Add many unrelated keywords => end-fail | 0 | Overtriggering. That does not deal with the real cause. Example: It fires on everything.

### end-win
end: win
text: A clear description with real phrases triggers the skill when it should, backed by a prompt set.
takeaway: Descriptions decide triggering.

### end-ok
end: ok
text: It triggers more often, but no test set protects it.
takeaway: Keep trigger prompts. Review the lesson and try the game again.

### end-fail
end: fail
text: A vague description caused misfires or misses.
takeaway: Be specific. Review the lesson and try the game again.

## The skill that did too much
module: claude-skills
level: Advanced
minutes: 6
lesson: claude-skills/debugging-skills-that-do-not-trigger-or-misbehave
summary: A skill fires on unrelated tasks and its script touches files it should not. Narrow it.
intro: A deployment-helper skill starts running when people ask about general scripting, and its script edits files in the wrong folder.

### s1
text: The skill triggers on unrelated work. What do you inspect?
- Its description for broad terms, and recent sessions to see which phrases matched => s2 | 2 | Broad wording causes overtriggering. Example: The description says "any script or automation".
- Delete all skills => end-fail | 0 | Overreaction. That does not deal with the real cause. Example: You lose useful ones.
- Ignore it => s2 | 1 | It will keep misfiring. It helps only in part. Example: Wrong edits continue.

### s2
text: The script edited the wrong folder. What is the cause?
- It used a relative path and assumed the current directory instead of a given target => s3 | 2 | Scripts should take explicit targets. Example: It ran "sed -i" in the working directory with no check.
- Bad luck => s3 | 0 | There is a cause. That does not deal with the real cause. Example: The cause repeats.
- The model is random => s3 | 1 | The script is deterministic. Example: The same input gives the same edit.

### s3
text: How do you make the script safe? Choose the move you would make next.
- Require an explicit path, validate it, support a dry run and restrict it to expected folders => s4 | 2 | Safe by design. Example: --target must be inside ./deploy and --dry-run shows the changes.
- Add a warning comment => s4 | 1 | Comments do not stop actions. Example: It still edits the wrong folder.
- Run it with higher privileges => s4 | 0 | More risk. That does not deal with the real cause. Example: More damage.

### s4
text: How do you narrow the triggering? Choose the move you would make next.
- Rewrite the description to the specific deployment tasks and test sample prompts that should and should not trigger => end-win | 2 | Precise scope. Example: "Use for deploying the web app to staging or production" replaces "any automation".
- Keep it broad, people will adapt => end-fail | 0 | Misfires continue. That does not deal with the real cause. Example: Users are confused.
- Make it manual only without testing => end-ok | 1 | Safe but loses benefit. It helps only in part. Example: Nobody uses it.

### end-win
end: win
text: The description is narrow, the script takes a validated target with dry run and both are tested.
takeaway: Scope what triggers it and what it can touch.

### end-ok
end: ok
text: Risk is reduced, but tests are thin. Read each choice explanation to see why.
takeaway: Test both sides. Review the lesson and try the game again.

### end-fail
end: fail
text: Ignoring or deleting everything did not fix the cause.
takeaway: Fix the scope. Review the lesson and try the game again.

