---
title: The tool-use loop
minutes: 13
summary: Implement the request, tool call, tool result cycle correctly, handle errors and parallel calls, and put limits on the loop.
---

Tool use is a loop in your code. You send the conversation and the tools to the model; if the model wants a tool, it replies with a request instead of a final answer; you run the tool and send the result back; the model continues. Getting the loop right, with error handling and limits, is the core skill of agent building.

## What you will learn

- The cycle step by step
- Handle results, errors and parallel calls
- Limit the loop
- Log every step

## The cycle

1. Send `messages` and `tools` to the model.
2. If the reply's stop reason is `tool_use`, it contains one or more tool-use blocks with an ID, a tool name and arguments.
3. Run each tool in your code.
4. Append the assistant reply, then a user message with a **tool result** for each call (matching the ID).
5. Call the model again. Repeat until it returns a normal answer.

```python
messages = [{"role": "user", "content": question}]
for step in range(MAX_STEPS):
    reply = client.messages.create(model=MODEL, max_tokens=1000, tools=TOOLS, messages=messages)
    messages.append({"role": "assistant", "content": reply.content})
    if reply.stop_reason != "tool_use":
        break
    results = []
    for block in reply.content:
        if block.type == "tool_use":
            try:
                out, is_error = run_tool(block.name, block.input), False
            except Exception as err:
                out, is_error = "tool failed: " + str(err), True
            results.append({"type": "tool_result", "tool_use_id": block.id, "content": str(out), "is_error": is_error})
    messages.append({"role": "user", "content": results})
```

## Results and errors

Return results as compact text or JSON. When a tool fails, return an error result with a helpful message ("no ticket with ID TCK-9999") rather than raising out of the loop, so the model can correct itself. Truncate large outputs and say so ("first 50 of 1,240 rows"). Models may request several tools at once; run independent ones in parallel if your code is safe for that, and return one result per call.

## Limit the loop

Always cap the number of steps, the total tokens and the time. Detect repeated identical calls and stop. Make side-effecting tools safe to repeat (idempotent) or require confirmation, because a loop may retry. Add a budget for cost. When a limit is hit, return a clear message to the user, not a silent failure.

## Observe

Log each step: the model reply, tool name, arguments, result size, duration and errors, with a request ID linking them. These traces are how you debug a wrong answer, find slow tools and spot loops. Redact secrets and personal data. Keep a sample of full traces for your evaluation set.

```predict
Q: A model keeps calling the same search tool with the same arguments. What protections should the loop have?
???
A maximum step count, detection of repeated identical calls, and a message to the user or a changed instruction when it triggers.
> Loops need brakes.
```

## Incident: The agent that would not stop

> **Incident:** A support agent called a search tool 60 times for one question.

```console
$ jq -r '.steps[] | [.n, .tool, (.input|tostring)] | @tsv' trace-901.json | tail -3
58	search_kb	{"query":"refund policy"}
59	search_kb	{"query":"refund policy"}
60	search_kb	{"query":"refund policy"}
```

The tool returned an empty list without explanation, and the model kept trying. The fix was to return "no results; try different words or ask the user", cap steps at 8, stop on three identical calls, and alert on conversations that reach the cap.

## Common mistakes

- No step limit
- Raising exceptions instead of returning tool errors
- Huge tool outputs
- Not logging steps

```quiz
Q: What signals that the model wants to call a tool?
+ Stop reason tool_use with a tool-use block
- A pause :: No.
- A blank reply :: No.
- A 404 :: No.
> Then run it and return a result. Re-read the matching lesson section for the full reasoning.

Q: How do you return a tool's output?
+ As a tool result matching the call ID
- As a comment :: No.
- By email :: No.
- By restarting :: No.
> One result per call. Re-read the matching lesson section for the full reasoning.

Q: What should happen when a tool fails?
+ Return an error result with a clear message
- Crash the loop :: Unhelpful.
- Hide it :: Unhelpful.
- Retry forever :: Dangerous.
> Let the model adapt. Re-read the matching lesson section for the full reasoning.

Q: Which limits does a tool loop need?
+ Steps, tokens, time and cost
- None :: Risky.
- Only colour :: No.
- Only disk :: No.
> Budgets. Re-read the matching lesson section for the full reasoning.
```

```cards
Loop :: send, tool_use, run, tool_result, repeat
Match :: tool_use_id on each result
Errors :: return is_error with a message
Parallel :: one result per call
Limits :: steps, tokens, time, cost
Log :: every step with a request ID
```
