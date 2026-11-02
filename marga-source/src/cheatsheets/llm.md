---
title: LLM fundamentals
summary: Tokens, context limits, API calls, sampling, cost, caching, evaluation and a debugging checklist for LLM features.
module: llm
---

## A first API call

```python
import os
import anthropic

MODEL = os.environ["MODEL_ID"]
client = anthropic.Anthropic()          # reads ANTHROPIC_API_KEY
resp = client.messages.create(
    model=MODEL,
    max_tokens=500,
    system="You are a concise assistant.",
    messages=[{"role": "user", "content": "Explain a 502 error."}],
)
print(resp.content[0].text, resp.stop_reason, resp.usage)
```

> **Warning:** Never put API keys in code, front-end JavaScript, logs or screenshots. Use a secret manager and rotate on exposure.

## Tokens and limits

```python
if resp.stop_reason == "max_tokens":
    raise RuntimeError("reply was cut off")
print(resp.usage.input_tokens, resp.usage.output_tokens)
```

One token is about four English characters. Input, history, documents, tool results and the answer all count toward the context window.

> **Warning:** A reply cut off by the length limit is incomplete. Truncated JSON will not parse, so always check the stop reason.

## Sampling

```python
client.messages.create(model=MODEL, max_tokens=300, temperature=0.0,
                       messages=[{"role": "user", "content": "Classify: " + text}])
```

Low temperature for extraction, classification and code. Higher for brainstorming.

> **Warning:** Temperature 0 does not guarantee identical output. Test properties and pass rates, not exact sentences.

## Errors and retries

```python
import random, time

def with_retry(call, tries=4):
    for n in range(tries):
        try:
            return call()
        except anthropic.RateLimitError:
            time.sleep(2 ** n + random.random())
    raise RuntimeError("rate limited")
```

Retry 429 and 5xx with backoff and jitter. Do not retry 400, 401 or 403.

## Cost estimate

```python
def cost(inp, out, price_in, price_out):
    return inp / 1e6 * price_in + out / 1e6 * price_out
```

Output tokens usually cost more than input tokens. Use the current price list.

> **Warning:** Agents and retry loops can spend a month of budget overnight. Set provider spend limits, alerts and a step cap.

## Caching and streaming

```python
with client.messages.stream(model=MODEL, max_tokens=500, messages=msgs) as s:
    for text in s.text_stream:
        print(text, end="", flush=True)
```

Put stable content first and changing content last to benefit from prompt caching.

## Evaluate

```json
{"id": "t-014", "input": "Card charged twice", "expect": {"category": "billing"}}
```

Keep 30 to 100 real cases, run every candidate several times, and compare pass rate, cost and latency. Re-run on any change.

## Debug a bad answer

```bash
jq '{id, model, stop_reason, usage, error}' req.json
jq -r '.prompt' req.json | head -60
```

> **Warning:** Model output is untrusted. Validate it before it reaches a shell, a database or a customer.
