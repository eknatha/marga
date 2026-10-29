## Cut-off answer
level: junior
A job asks for a JSON report and fails to parse it.

```text
json.decoder.JSONDecodeError: Unterminated string starting at: line 41
resp.stop_reason = max_tokens
```
? What is the first thing to check and fix?
+ The stop reason shows the reply hit the output limit; raise max_tokens or shorten the task
- Switch to a different JSON parser
- Lower the temperature
- Retry with the same settings forever
why: A reply stopped by the length limit is incomplete, so no parser can read it. Check the stop reason before parsing, and raise the limit or reduce the output.

## Chat gets slower every turn
level: junior
A support chat answers more slowly and costs more as the conversation grows.

```text
turn 5: input_tokens=1,850
turn 20: input_tokens=9,400
turn 40: input_tokens=18,700
```
? Why?
+ The full history is resent each turn, so input tokens keep growing; trim or summarise old turns
- The model is getting tired
- The API charges more over time
- The network is slowing down
why: The API is stateless, so your code resends the history. Summarise or trim old turns and cache stable parts to control cost and latency.

## Rate limited batch
level: junior
A batch job fails in the middle of a run.

```text
HTTP 429 rate_limit_error
retry-after: 12
```
? What do you add?
+ Exponential backoff with jitter, limited concurrency, and respect for retry-after
- Retry instantly in a tight loop
- Ignore the error and continue
- Increase max_tokens
why: A 429 means slow down. Backoff with jitter and a concurrency limit protect both your job and the service.

## Key in a screenshot
level: mid
A teammate posted a terminal screenshot in a public channel.

```text
$ env | grep ANTHROPIC
ANTHROPIC_API_KEY=sk-ant-XXXXXXXX
```
? What do you do first?
+ Revoke and replace the key, then review usage logs and add secret scanning
- Delete the screenshot and carry on
- Wait to see if anyone uses it
- Change the variable name
why: A leaked key is compromised even after deletion because copies persist. Revoke first, then investigate and prevent.

## Flaky classifier
level: mid
The same ticket gets different queues on different days.

```text
billing
billing
payments
billing
payments
```
? What is the best fix?
+ Constrain output to an allowed list, use low temperature, and test with repeated runs
- Increase the temperature
- Ask the model to be consistent
- Remove the tests
why: Free text and default sampling cause variation. Enums, low temperature and pass-rate tests make the behaviour measurable and stable.

## Upgrade regression
level: mid
A new model version scores higher on a public benchmark but your router breaks.

```text
pass_rate=0.71 (was 0.94) category_not_in_allowed_list=38
```
? What should have caught this?
+ Your own evaluation set in CI, run before the upgrade
- The public leaderboard
- User complaints after release
- A longer prompt
why: Benchmarks measure general ability. Only your own cases show whether your feature still works after a change.

## Overnight bill
level: mid
Spend jumped overnight.

```text
feature=doc-summary requests=2000 input_tokens=80,412,000 cache_read_tokens=0
```
? What is a likely fix?
+ Cache the large unchanging prefix, batch the nightly run, and set spend alerts and a hard budget
- Use a longer prompt
- Raise the rate limit
- Remove monitoring
why: The same large document was sent 2,000 times with no caching. Reuse stable prefixes and guard budgets.

## Bot cannot find the policy
level: senior
After a docs update the assistant refuses policy questions.

```text
retrieved: blog/holiday-hours.md, faq/shipping.md
(policies/returns-v3.md missing)
```
? Which layer failed?
+ Retrieval or indexing; the fact never reached the prompt
- The tokenizer
- The temperature
- The GPU
why: The model cannot use facts it never saw. Check what was retrieved and fix the index, then add monitoring for known test questions.
