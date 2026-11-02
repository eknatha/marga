---
title: Tokens, context windows and limits
minutes: 12
summary: Count tokens, understand what fills a context window, and design around input and output limits.
---

Models do not read characters or words. They read tokens, small pieces of text, and every limit and every price is counted in tokens. Knowing what a token is and what fills the context window explains why long chats get worse, why prices depend on length, and why a prompt that works on a short example can fail on real data.

## What you will learn

- What a token is, and rough sizes
- What counts toward the context window
- Input limits versus output limits
- Strategies for text that does not fit

## Tokens

A tokenizer splits text into pieces such as whole common words, parts of rare words, punctuation and spaces. As a rule of thumb, one token is about four characters of English text, or three quarters of a word. Code, other languages and unusual strings often need more tokens per character. Different model families use different tokenizers, so counts differ. Use the provider's token counting tool rather than guessing when limits matter.

## The context window

The context window is the total number of tokens the model can consider in one request: the system prompt, the conversation so far, any documents or tool results you include, and the answer being generated. When the sum is too large, the request fails or older text must be dropped. Long contexts also cost more and can reduce accuracy for details buried in the middle, so more text is not always better.

## Input and output limits

Providers set a maximum number of output tokens per reply, separate from the context size. If you ask for a long report with a small output limit, the answer is cut off, and the response says it stopped because of length. Always check the stop reason in the response. A truncated JSON document is invalid JSON, which breaks the program that parses it.

```python
response = client.messages.create(
    model=MODEL,
    max_tokens=1024,
    messages=[{"role": "user", "content": prompt}],
)
if response.stop_reason == "max_tokens":
    raise RuntimeError("answer was cut off; raise max_tokens or shorten the task")
```

## When text does not fit

- **Select**: send only relevant parts, found by search or by simple rules.
- **Summarise**: compress old conversation turns into a short summary.
- **Chunk**: process a long document in pieces and combine the results.
- **Cache**: reuse a large, unchanging prefix, such as instructions or a reference document, using prompt caching to cut cost and delay.
- **Measure**: log input and output token counts for each request, so cost and growth are visible.

```predict
Q: A chat application sends the full history every turn. After 40 turns the answers get slower and costlier. Why, and what do you change?
???
Every turn resends all earlier tokens, so input grows each time. Summarise or trim old turns and cache stable parts.
> Input tokens add up.
```

## Incident: The report that stopped in the middle

> **Incident:** A nightly job that asked a model for a JSON report failed to parse its output.

```console
$ python summarize.py
json.decoder.JSONDecodeError: Unterminated string starting at: line 41 column 12
$ python -c "print(resp.stop_reason, resp.usage.output_tokens)"
max_tokens 1024
```

The model hit the output limit in the middle of the JSON. The fix raised max_tokens, asked for shorter field values, and added a check that raises an error when the stop reason is max_tokens instead of passing broken text to the parser.

## Common mistakes

- Guessing token counts instead of measuring
- Ignoring the stop reason
- Resending unlimited history
- Putting entire documents in when a few paragraphs would do

```quiz
Q: Roughly how many characters is a token in English?
+ About four
- One :: Too small.
- About forty :: Too large.
- Exactly a word :: Not exact.
> A rule of thumb only. Re-read the matching lesson section for the full reasoning.

Q: What counts toward the context window?
+ System prompt, history, documents, tool results and the answer
- Only the last message :: Everything counts.
- Only the answer :: Input counts too.
- Only code :: All text counts.
> Total tokens per request. Re-read the matching lesson section for the full reasoning.

Q: What should you check when JSON output fails to parse?
+ The stop reason, in case the output was cut off
- The monitor colour :: No.
- The keyboard layout :: No.
- The DNS record :: No.
> max_tokens truncation. Re-read the matching lesson section for the full reasoning.

Q: How can you cut the cost of a large unchanging prefix?
+ Use prompt caching
- Use longer prompts :: More tokens.
- Disable logging :: Unrelated.
- Add more temperature :: Unrelated.
> Cache stable parts. Re-read the matching lesson section for the full reasoning.
```

```cards
Token :: small piece of text, about four characters
Context window :: total tokens per request, input plus output
Output limit :: max_tokens per reply
Check :: stop_reason
Save cost :: trim, summarise, cache
Measure :: log token counts per request
```
