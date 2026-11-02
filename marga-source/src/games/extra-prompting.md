## The prompt that worked until it did not
module: prompting
level: Beginner
minutes: 5
lesson: prompting/debugging-bad-prompts
summary: A prompt gives good results in tests but fails for real users. Find the gap.
intro: A summary prompt works on your five test emails but misses action items in many customer emails.

### s1
text: It works in tests but not in production. What do you check?
- Collect failing real inputs and compare them with your test inputs => s2 | 2 | Real inputs show what the prompt misses. Example: Real emails are longer and have quoted threads.
- Rewrite the prompt without looking => s2 | 0 | You may break what works. That does not deal with the real cause. Example: New failures appear.
- Blame the model => s2 | 1 | The prompt is within your control. It helps only in part. Example: Nothing improves.

### s2
text: Failures involve long threads. What do you try?
- Say what to focus on, structure the input and add an example with a long thread => s3 | 2 | Guide attention and show the format. Example: Add a labelled example where the action item is in an earlier message.
- Add "be very careful" in capitals => s3 | 1 | Emphasis alone is weak. It helps only in part. Example: The result barely changes.
- Cut all instructions => s3 | 0 | You lose guidance. That does not deal with the real cause. Example: Output becomes generic.

### s3
text: How do you check you did not break other cases?
- Run the old tests and the new failures together before and after the change => s4 | 2 | Regression tests protect the gains. Example: Twenty saved cases are rerun after each edit.
- Try two emails => s4 | 1 | Too few. It helps only in part. Example: A previous case breaks.
- Ship and watch => s4 | 0 | Users find the break. That does not deal with the real cause. Example: Complaints rise.

### s4
text: How do you keep it healthy over time? Choose the move you would make next.
- Version the prompt, keep a test set that grows with each failure and review samples regularly => end-win | 2 | Treat prompts like code. Example: Every reported failure becomes a test case.
- Edit it live whenever => end-fail | 0 | No history. That does not deal with the real cause. Example: You cannot revert.
- Never touch it again => end-ok | 1 | Inputs change. It helps only in part. Example: Quality slowly falls.

### end-win
end: win
text: Real failures drove the changes, an example fixed long threads and a growing test set guards quality.
takeaway: Collect failures, test, version.

### end-ok
end: ok
text: The prompt improved, but tests or versions are weak.
takeaway: Grow the test set. Review the lesson and try the game again.

### end-fail
end: fail
text: Guessing created new failures. Read each choice explanation to see why.
takeaway: Use real failing inputs. Review the lesson and try the game again.

## The JSON that broke the parser
module: prompting
level: Intermediate
minutes: 6
lesson: prompting/validating-repairing-and-retrying-outputs
summary: A model sometimes adds text around JSON and the downstream parser crashes. Make output reliable.
intro: About 3 percent of responses begin with "Sure, here is the JSON:" and the parser throws an error.

### s1
text: The parser fails on some responses. What do you do first?
- Log the raw failing outputs to see how they differ from the good ones => s2 | 2 | See the real variation. Example: Some have text before the JSON, some are cut off at the token limit.
- Wrap the parser in try and ignore errors => end-fail | 0 | You silently drop data. That does not deal with the real cause. Example: Orders are lost without a trace.
- Ask the model nicely => s2 | 1 | It may help a little. It helps only in part. Example: Failures drop but remain.

### s2
text: What improves the format reliably? Choose the move you would make next.
- Use a structured output or schema feature, or a strict prompt with an example and no extra text => s3 | 2 | Constrain the output. Example: A JSON schema parameter makes the model return valid objects only.
- Hope it follows the format => s3 | 0 | Not reliable. That does not deal with the real cause. Example: The same failures remain.
- Parse with a regex only => s3 | 1 | Fragile. It helps only in part. Example: A nested object breaks the pattern.

### s3
text: Some outputs still fail validation. What next?
- Validate against the schema, retry with the error message a limited number of times, and fall back safely => s4 | 2 | Validate, repair and bound retries. Example: The retry prompt includes "field amount must be a number".
- Retry forever => s4 | 0 | Cost and loops. That does not deal with the real cause. Example: A bad input runs all night.
- Accept invalid data => s4 | 0 | Bad data spreads. That does not deal with the real cause. Example: A string lands in a number column.

### s4
text: How do you monitor it? Choose the move you would make next.
- Track the validation failure rate and retry counts, and alert when they rise => end-win | 2 | Measure reliability. Example: A dashboard shows failures per prompt version.
- Check manually each week => end-ok | 1 | Slow. It helps only in part. Example: A bad release runs days.
- Ignore it, 3 percent is fine => end-fail | 0 | 3 percent of orders is many. That does not deal with the real cause. Example: Hundreds of failures a day.

### end-win
end: win
text: Structured output, validation with bounded retries and monitoring made the pipeline reliable.
takeaway: Constrain, validate, retry with limits, measure.

### end-ok
end: ok
text: It is more reliable, but monitoring is weak.
takeaway: Track failure rates. Review the lesson and try the game again.

### end-fail
end: fail
text: Hiding errors lost data silently. Read each choice explanation to see why.
takeaway: Never swallow parse errors. Review the lesson and try the game again.

