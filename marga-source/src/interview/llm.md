## What is an LLM and how does it produce text?
level: junior
A large language model is trained on a huge amount of text to predict the next token. At each step it scores every possible next token, one is chosen by sampling, and the process repeats. It has no built-in access to live data or exact computation, so for those I give it tools or put the facts into the prompt.

## What is a token and why does it matter?
level: junior
A token is a small piece of text, roughly four characters of English. Limits and prices are counted in tokens, and the context window covers input and output together. I measure token usage per request, trim history, and check the stop reason so I notice when an answer is cut off.

## What does temperature do?
level: junior
Temperature changes how the next token is sampled. Low values make the most likely token win almost every time, good for extraction and classification. Higher values give more varied output, good for brainstorming. It does not guarantee identical output, so I test properties of answers and run them several times.

## Why do models hallucinate and how do you reduce it?
level: mid
The model produces plausible text, and when the fact is not in its training or the prompt, the plausible answer can be invented. I reduce it by supplying source text, instructing it to answer only from that text and to say when it is not stated, asking for quotes I can verify, and checking outputs with code where possible.

## How do you handle rate limits and errors when calling a model API?
level: mid
I retry 429 and temporary 5xx errors with exponential backoff and jitter, respect retry-after headers, limit concurrency, and set client timeouts. I do not retry 400 class errors. I log request IDs, token counts and latency, keep keys in a secret manager, and alert on error rates and spend.

## How would you choose between two models for a feature?
level: mid
I build a test set from real examples with expected properties, run both models and prompts several times, and compare pass rate, cost and latency. Public benchmarks only guide the shortlist. I choose the cheapest option that meets the quality bar, pin the version, and re-run the set before upgrades.

## How do you reduce the cost and latency of an LLM feature?
level: mid
I use the smallest model that passes the tests for each step, shorten prompts, cache stable prefixes with prompt caching, batch non-urgent work, stream responses for perceived speed, and limit output length. I track tokens per feature and set budget alerts so a loop cannot run up a bill unnoticed.

## An LLM feature gives wrong answers in production but passed tests. How do you investigate?
level: senior
I pull the stored traces: the exact prompt, retrieved text, parameters, model version, reply and stop reason. I check whether the needed fact was in the context, whether limits or errors occurred, and whether production inputs differ from my tests. I reproduce, change one thing, add the cases to the evaluation set, and add monitors for the signal I missed.

## How do you operate LLM features safely at scale?
level: senior
I treat model output as untrusted, validate it before use, and keep side effects behind approvals and least-privilege credentials. I version prompts and models, run evaluations in CI, release gradually, and keep rollback simple. I monitor quality signals, cost, latency and refusals, log traces with privacy controls, and plan for provider outages with fallbacks.
