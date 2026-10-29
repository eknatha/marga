---
title: Cost, latency and caching
minutes: 12
summary: Estimate what a feature costs, understand the parts of latency, and reduce both with model choice, prompt design and caching.
---

Model calls are priced per token and take noticeable time. A feature that is cheap in a demo can be expensive at ten thousand users a day, and slow enough to frustrate people. A little arithmetic before launch, and a few well-known techniques, keep both under control.

## What you will learn

- Estimate cost from tokens and traffic
- Time to first token and tokens per second
- Cut cost: smaller models, shorter prompts, caching, batching
- Budgets and alerts

## Back-of-envelope cost

Cost per request = input tokens times the input price, plus output tokens times the output price. Output tokens usually cost several times more than input tokens. Example with made-up prices: 3,000 input tokens at 3 dollars per million is 0.009 dollars, 500 output tokens at 15 dollars per million is 0.0075 dollars, so about 1.65 cents per request. At 50,000 requests per day that is about 825 dollars a day. Use your provider's current price list, and measure your real token counts.

```python
def cost(inp, out, price_in=3.0, price_out=15.0):
    """Prices are dollars per million tokens (example values)."""
    return inp / 1e6 * price_in + out / 1e6 * price_out

print(round(cost(3000, 500) * 50_000, 2))
```

## Latency

Total time is roughly: network and queueing, **time to first token** (processing your input), and then output length divided by **tokens per second**. A long prompt delays the first token; a long answer takes long to finish. Streaming improves perceived speed. Smaller models are faster and cheaper, so use the smallest model that passes your tests for each step.

## Reducing cost and delay

- **Right-size the model**: easy steps (classify, extract) on a small model, hard steps on a large one.
- **Shorten**: trim instructions, remove unused context, ask for concise output or a fixed format.
- **Prompt caching**: mark a large stable prefix (instructions, reference text, tool definitions) so repeated requests reuse it at lower cost and delay. Put stable content first and changing content last.
- **Batch** non-urgent work through a batch interface, often at a discount.
- **Cache answers** to identical questions in your own store, if the content allows.
- **Limit** output with max_tokens and stop conditions.

## Budgets and visibility

Track tokens and cost per feature, per customer and per model. Set spend limits at the provider and alerts in your monitoring. Add a circuit breaker for runaway loops, especially in agents that call a model repeatedly. One forgotten retry loop can spend a month's budget overnight.

```predict
Q: A feature calls the large model three times per request to classify, extract and summarise. How can you cut cost without losing quality?
???
Use a small model for classification and extraction, cache the stable prefix, and keep the large model for the summary only; confirm with your tests.
> Match model size to the step.
```

## Incident: The overnight bill

> **Incident:** A scheduled job re-sent the same 40,000-token document 2,000 times.

```console
$ python usage_report.py --day yesterday
feature=doc-summary requests=2000 input_tokens=80,412,000 output_tokens=610,000
$ python usage_report.py --day yesterday --cached
cache_read_tokens=0
```

Nothing was cached, and the document was the same in every request. The team moved the document into a cached prefix, used a batch process for the nightly run, and added a daily spend alert and a hard stop at a set budget.

## Common mistakes

- No token or cost tracking
- Using the largest model for every step
- Putting changing text before the stable prefix
- No budget limit on automated loops

```quiz
Q: Which usually costs more per token?
+ Output tokens
- Input tokens :: Usually cheaper.
- Both equal :: Usually not.
- Neither :: Both are priced.
> Output is priced higher. Re-read the matching lesson section for the full reasoning.

Q: What does prompt caching reuse?
+ A stable prefix of the prompt
- The answer to any question :: Not that.
- Your API key :: No.
- The user session :: No.
> Put stable content first. Re-read the matching lesson section for the full reasoning.

Q: How do you improve perceived latency?
+ Stream the reply
- Lengthen the prompt :: Slower.
- Add retries :: Slower.
- Raise temperature :: Unrelated.
> Users see text sooner. Re-read the matching lesson section for the full reasoning.

Q: What protects you from a runaway loop?
+ Spend limits, alerts and a circuit breaker
- More temperature :: No.
- A bigger model :: No.
- Longer prompts :: No.
> Budgets are controls. Re-read the matching lesson section for the full reasoning.
```

```cards
Cost :: tokens times price, input and output
Latency :: first token plus length over speed
Cheaper :: smaller model, shorter prompt, caching
Cache layout :: stable first, changing last
Batch :: non-urgent work at lower price
Guard :: budgets and alerts
```
