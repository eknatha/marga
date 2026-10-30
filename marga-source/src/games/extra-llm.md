## The bill that tripled overnight
module: llm
level: Intermediate
minutes: 6
lesson: llm/cost-latency-and-caching
summary: An LLM feature costs three times more after a release. Find the cause and cap it.
intro: Daily API spend jumps from 200 to 650 dollars the day after a release. Traffic is about the same.

### s1
text: Spend tripled with flat traffic. What do you look at?
- Tokens per request, input and output, split by feature and by release => s2 | 2 | Cost follows tokens, not requests. Example: Average input tokens rose from 1,200 to 5,000 per call.
- Ask the provider to lower prices => s2 | 0 | Price is not what changed. That does not deal with the real cause. Example: Nothing changes.
- Switch off the feature => s2 | 1 | It stops cost but loses value. It helps only in part. Example: Users lose the feature.

### s2
text: Input tokens grew a lot. What is a likely cause?
- The release added long context such as full history or whole documents to every call => s3 | 2 | Context size drives input cost. Example: The prompt now includes the full conversation instead of the last six messages.
- The model got worse => s3 | 0 | Not related to token count. That does not deal with the real cause. Example: Quality is unchanged.
- Users type more => s3 | 1 | Unlikely to explain a fourfold rise. Example: Message length is similar.

### s3
text: How do you cut cost without hurting quality?
- Trim or summarise context, use prompt caching for stable prefixes and pick a smaller model where it is good enough => s4 | 2 | Reduce what you send and reuse what repeats. Example: A cached system prompt of 3,000 tokens is billed at the cached rate.
- Remove the system prompt => s4 | 0 | Behaviour may break. That does not deal with the real cause. Example: Answers become inconsistent.
- Lower max output to 10 tokens => s4 | 1 | It truncates answers. It helps only in part. Example: Replies stop mid-sentence.

### s4
text: How do you stop surprises? Choose the move you would make next.
- Track cost per feature, set budgets and alerts, and test token counts before releasing => end-win | 2 | Make cost visible and bounded. Example: A CI check fails if a prompt grows past a set size.
- Check the invoice monthly => end-ok | 1 | Too late. It helps only in part. Example: The overspend is a month old.
- Hope it stays low => end-fail | 0 | Costs drift. That does not deal with the real cause. Example: Another release raises it.

### end-win
end: win
text: You found the token growth, trimmed context, cached the stable part and set budgets and alerts.
takeaway: Measure tokens per feature. Review the lesson and try the game again.

### end-ok
end: ok
text: Costs fell, but alerts and limits are missing.
takeaway: Add budgets and alerts. Review the lesson and try the game again.

### end-fail
end: fail
text: Cutting blindly hurt quality or users. Read each choice explanation to see why.
takeaway: Find the cause first. Review the lesson and try the game again.

## The answer that sounded sure but was wrong
module: llm
level: Beginner
minutes: 5
lesson: llm/training-fine-tuning-and-where-knowledge-comes-from
summary: A chatbot confidently quoted a refund policy that does not exist. Ground its answers.
intro: A customer was told refunds are allowed for 90 days. The real policy is 30 days.

### s1
text: The bot invented a policy. Why can that happen?
- The model predicts likely text and has no built-in access to your current policy => s2 | 2 | Fluent text is not verified fact. Example: It produced a typical-sounding refund policy.
- The bot is lying on purpose => s2 | 0 | It has no intent. That does not deal with the real cause. Example: It has no understanding of truth.
- The customer misread => s2 | 1 | The transcript shows the claim. It helps only in part. Example: The claim was in the answer.

### s2
text: How do you make it use the real policy? Choose the move you would make next.
- Retrieve the policy text and include it in the prompt, telling the model to answer only from it => s3 | 2 | Ground answers in your own source. Example: The prompt includes the current policy and says "use only this text".
- Tell it to be accurate => s3 | 0 | A request does not add facts. That does not deal with the real cause. Example: It still guesses.
- Fine-tune on one example => s3 | 1 | Knowledge goes stale and is hard to update. Example: The policy changes next quarter.

### s3
text: What should it do when the source does not cover the question?
- Say it does not know and hand off to a person or show the policy link => s4 | 2 | A safe refusal beats a guess. Example: "I cannot find that. Here is the policy page and a support link."
- Guess the closest answer => s4 | 0 | It repeats the problem. That does not deal with the real cause. Example: Another wrong claim.
- Stay silent => s4 | 1 | Users get no help. It helps only in part. Example: Customers wait.

### s4
text: How do you check it is working? Choose the move you would make next.
- Test with a set of questions that have known answers, including ones outside the source, and review samples in production => end-win | 2 | Evaluate with real cases. Example: A test asks about 90-day refunds and expects 30.
- Test it once by hand => end-ok | 1 | Misses many cases. It helps only in part. Example: A different question fails.
- Trust the demo => end-fail | 0 | Demos hide failures. That does not deal with the real cause. Example: Real users find them.

### end-win
end: win
text: The bot now answers from the current policy, says when it does not know and is tested on known cases.
takeaway: Ground, admit gaps, test. Review the lesson and try the game again.

### end-ok
end: ok
text: It is better, but tests are thin. Read each choice explanation to see why.
takeaway: Use a test set. Review the lesson and try the game again.

### end-fail
end: fail
text: Guessing left wrong claims in place. Read each choice explanation to see why.
takeaway: Use real sources. Review the lesson and try the game again.

