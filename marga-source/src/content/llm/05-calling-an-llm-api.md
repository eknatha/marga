---
title: Calling an LLM API
minutes: 13
summary: Make a first API call, understand messages and roles, stream replies, handle errors and rate limits, and keep keys safe.
---

Using a model from code is an ordinary HTTP API call with unusual inputs. The details that matter are the same as for any service: authentication, timeouts, retries, rate limits, logging and cost. Getting them right turns a demo into something that runs on a schedule at three in the morning.

## What you will learn

- The shape of a request: model, messages, limits
- Roles: system, user, assistant
- Streaming and timeouts
- Errors, rate limits, retries and key handling

## A first call

```python
import os
import anthropic

MODEL = os.environ["MODEL_ID"]   # set the model name in configuration, not in code
client = anthropic.Anthropic()    # reads ANTHROPIC_API_KEY from the environment

response = client.messages.create(
    model=MODEL,
    max_tokens=500,
    system="You are a concise assistant for site reliability engineers.",
    messages=[{"role": "user", "content": "Explain a 502 error in two sentences."}],
)
print(response.content[0].text)
print(response.usage.input_tokens, response.usage.output_tokens)
```

A request names a model, a limit on output tokens, an optional system prompt and a list of messages. The reply has content blocks, a stop reason and token usage. Other providers have similar shapes with different field names, so wrap the call in your own small function.

## Roles and conversation state

Messages alternate between the **user** and the **assistant**. The **system** prompt sets rules and context for the whole conversation. The API is stateless: it remembers nothing between calls, so your program sends the whole history each time and decides what to keep, trim or summarise. Store conversations in your own database, and treat them as personal data.

## Streaming and timeouts

Long answers take seconds. Streaming returns tokens as they are generated, so users see text immediately and your server can stop early. Always set a client timeout, and handle a stream that ends in the middle.

```python
with client.messages.stream(model=MODEL, max_tokens=500, messages=messages) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

## Errors, limits and keys

- **Rate limits** return a 429 status: slow down, and retry with exponential backoff and jitter. Respect any retry-after header.
- **Server errors** (500, 529 overloaded) are usually temporary: retry a few times, then fail clearly.
- **Client errors** (400, 401, 403) will not fix themselves: do not retry; log the message.
- **Keys** belong in a secret manager or environment variable, never in code, logs, client-side JavaScript or screenshots. Use separate keys per service and per environment, set spend limits, and rotate on suspicion.
- **Log** request IDs, model, token counts, latency and outcome, but not secrets or personal data.

```predict
Q: Your batch job gets 429 errors during a large run. What do you add?
???
Backoff with jitter, a limit on concurrency, and respect for retry-after; consider batching or a queue.
> Slow down instead of hammering.
```

## Incident: The key in the screenshot

> **Incident:** A teammate shared a terminal screenshot in a public channel that included an API key.

```console
$ env | grep -i anthropic
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXX
$ curl -s -o /dev/null -w "%{http_code}\n" https://api.example.com/v1/models -H "x-api-key: $OLD_KEY"
401
```

The key was revoked as soon as the message was noticed, which is why the check now returns 401. A new key went into the secret manager, usage logs were reviewed for unexpected requests, and the team stopped printing environment variables in shared screens and added secret scanning to chat and repositories.

## Common mistakes

- Hard-coding keys
- Retrying client errors
- No timeout on API calls
- Logging full prompts that contain personal data

```quiz
Q: What does the system prompt do?
+ Sets rules and context for the whole conversation
- Stores history :: The API is stateless.
- Sets the price :: No.
- Chooses the region :: No.
> Instructions that persist. Re-read the matching lesson section for the full reasoning.

Q: Who keeps the conversation history?
+ Your application, which resends it each call
- The API server forever :: It is stateless.
- The browser only :: Not required.
- Nobody :: Your app does.
> Stateless API. Re-read the matching lesson section for the full reasoning.

Q: How should you react to a 429?
+ Back off with jitter and retry
- Retry at once in a tight loop :: Makes it worse.
- Ignore it :: Data is lost.
- Increase max_tokens :: Unrelated.
> Rate limit means slow down. Re-read the matching lesson section for the full reasoning.

Q: Where does an API key belong?
+ A secret manager or environment variable
- In the repository :: Leaks.
- In front-end code :: Leaks.
- In a screenshot :: Leaks.
> Rotate if exposed. Re-read the matching lesson section for the full reasoning.
```

```cards
Request :: model, max_tokens, system, messages
Roles :: system, user, assistant
State :: you resend history
429 :: back off with jitter
5xx :: retry a few times
Keys :: secret manager, never code
```
