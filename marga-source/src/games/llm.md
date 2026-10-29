## The report that stops halfway
module: llm
level: Intermediate
minutes: 7
lesson: llm/debugging-llm-applications
summary: A nightly job that asks for a JSON report starts failing with parse errors. Find why the reply is incomplete and fix it properly.
intro: At 02:10 the nightly summary job fails with a JSON error on about one run in five. The prompt has not changed this week, but the source documents grew longer.

### s1
text: Parse errors appear only on long documents. What do you inspect first?
- Log the stop reason and token counts of a failing request, the reply may have hit the output limit => s2 | 2 | A stop reason of max_tokens means the reply was cut off. Example: The log shows stop_reason=max_tokens and output_tokens=1024, equal to the configured limit.
- Switch to a different JSON parser => s2 | 1 | A parser cannot repair text that was never finished. Example: The new parser fails on the same unterminated string at the same place.
- Lower the temperature to zero => s2 | 0 | Sampling does not change the output limit. Example: Runs are still cut off at exactly 1024 tokens.

### s2
text: You confirm the reply was cut off at the limit. What is the best fix?
- Raise max_tokens, ask for a shorter structure, and check the stop reason before parsing => s3 | 2 | You remove the cause and detect it if it returns. Example: The job requests 4000 tokens, asks for 5 bullets per document, and fails fast with a clear message when the stop reason is not end_turn.
- Retry the same request up to ten times => s3 | 1 | The same limit gives the same cut-off. Example: Ten retries cost ten times as much and fail identically on long documents.
- Catch the exception and skip the document => s3 | 0 | Data is silently lost. Example: Forty reports go missing and nobody notices until a customer asks.

### s3
text: The fix is merged. What do you add so the next change does not break it?
- A test with a deliberately long document and an alert on stop reasons other than end_turn => end-win | 2 | You turn the incident into a permanent check. Example: CI now runs a 60-page sample, and a dashboard panel counts max_tokens stops per day.
- A note in the wiki asking people to be careful => end-ok | 1 | Notes do not run in CI. Example: Six months later a new prompt doubles the output size and the job fails again.
- Nothing, the job passed once => end-fail | 0 | One pass does not prove the edge case is covered. Example: The next growth in document size brings the failures back.

### end-win
end: win
text: Reports are complete again, and a test plus an alert would catch the next truncation early.
takeaway: A stop reason of max_tokens means the reply is incomplete. Check it before parsing, and test with long inputs.

### end-ok
end: ok
text: The bug is fixed, but nothing would warn you if it came back.
takeaway: Fix the cause and add a check, so the same cut-off is caught early.

### end-fail
end: fail
text: Reports keep failing and the team does not know why.
takeaway: Without the stop reason you cannot tell a cut-off reply from a bad prompt.


## The bill nobody expected
module: llm
level: Intermediate
minutes: 7
lesson: llm/cost-latency-and-caching
summary: Spend triples overnight after a feature launch. Trace the cost to its source and bring it down without hurting quality.
intro: Finance asks why the model bill tripled after Tuesday's release. The new document assistant is popular, and traffic is only 20 percent higher than last week.

### s1
text: Spend grew far more than traffic. Where do you look first?
- Break down tokens per feature and per request, including input, output and cached tokens => s2 | 2 | Cost is tokens times price, so find which tokens grew. Example: The report shows document-assistant requests averaging 38,000 input tokens with zero cached tokens.
- Ask the provider for a discount => s2 | 1 | A discount does not explain the jump. Example: The account manager asks for the same usage data you do not have yet.
- Block the feature until the end of the month => s2 | 0 | This removes the value and the evidence. Example: Users complain and you still do not know the cause.

### s2
text: Each request resends the same 35,000-token manual before the question. What do you do?
- Put the manual first as a stable prefix and enable prompt caching => s3 | 2 | Repeated prefixes are read at a lower price and start faster. Example: Cache reads rise to 90 percent of input tokens and cost per request drops by about two thirds.
- Remove the manual from the prompt => s3 | 1 | Answers lose their grounding and quality falls. Example: The assistant starts guessing at policy details.
- Truncate every prompt to 1,000 tokens => s3 | 0 | Important context is cut blindly. Example: Answers about section 7 fail because it is no longer included.

### s3
text: Costs are back under control. How do you stop a surprise next time?
- Per-feature budgets, spend alerts and a token-count check in CI => end-win | 2 | You see growth early and tie it to a change. Example: An alert fires at 130 percent of the weekly baseline and names the feature.
- Check the invoice once a month => end-ok | 1 | You find out weeks too late. Example: The next regression is discovered on the 30th.
- Remove logging to save money => end-fail | 0 | You lose the data needed to explain a bill. Example: The next investigation has nothing to analyse.

### end-win
end: win
text: Cost per request is down, caching is working, and alerts will catch the next jump.
takeaway: Measure tokens per feature, cache stable prefixes, and alert on spend so surprises show up in days.

### end-ok
end: ok
text: Costs fell, but you would still discover the next jump from the invoice.
takeaway: Fix the biggest source of tokens, then add monitoring.

### end-fail
end: fail
text: The bill stays high and nobody can explain it.
takeaway: Cost control starts with measurement. Cutting features blindly removes value, not waste.

