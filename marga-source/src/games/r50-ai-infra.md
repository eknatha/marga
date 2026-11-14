## The token bill that doubled
module: ai-infra
level: Advanced
minutes: 7
lesson: ai-infra/cost-and-capacity-engineering-for-inference
summary: Inference spend doubled in a month while GPU use stayed low. Find and fix the cause.
intro: Finance reports that the LLM bill doubled. GPU utilisation is 15 percent and one batch job served 980 million tokens. You are asked to cut cost without hurting quality.

### s1
text: Where do you start? Choose the best next step.
- Break the cost down by team, feature and model using gateway logs => s2 | 2 | You cannot cut what you cannot see. Example: One summarisation job is the top consumer.
- Switch to the cheapest model everywhere => s2 | 1 | Quality may drop. Example: Customer answers get worse.
- Ask teams to use fewer tokens => end-fail | 0 | Vague. Example: Nothing changes.

### s2
text: What do you do about repeated requests? Choose the best next step.
- Add response and semantic caching at the gateway for repeated prompts => s3 | 2 | Repeats should be free. Example: A third of requests hit the cache.
- Raise rate limits => s3 | 1 | Raises cost. Example: The bill grows.
- Disable logging => end-fail | 0 | Hides cost. Example: Nobody sees the spend.

### s3
text: How do you right size model use? Choose the best next step.
- Route easy tasks to smaller models and keep large models for hard ones, using evaluation to check quality => s4 | 2 | Routing saves money with checks. Example: Classification moves to a small model with the same accuracy.
- Use the largest model always => s4 | 1 | Costly. Example: Spend stays high.
- Pick a model at random => end-fail | 0 | No quality control. Example: Accuracy falls.

### s4
text: What about GPU capacity? Choose the best next step.
- Batch requests, scale on queue depth and share GPUs with MIG or time slicing => end-win | 2 | Utilisation rises and cost per token falls. Example: Utilisation rises from 15 to 60 percent.
- Buy more GPUs => end-ok | 1 | Idle GPUs cost more. Example: Utilisation drops further.
- Turn off autoscaling => end-fail | 0 | Wastes capacity. Example: Peak queues grow.

### end-win
end: win
text: Costs fell after you found the top consumers, cached repeats, routed by difficulty and raised GPU use.
takeaway: Measure, cache, route and batch before buying capacity.

### end-ok
end: ok
text: Some savings came but visibility or utilisation remain weak.
takeaway: Track cost per request and raise GPU use. Review the lesson and try again.

### end-fail
end: fail
text: The bill kept growing or quality dropped without evidence.
takeaway: Do not guess. Measure first. Review the lesson and try again.
