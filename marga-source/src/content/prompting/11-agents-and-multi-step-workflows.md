---
title: Agents and multi-step workflows
minutes: 13
summary: Choose between fixed workflows and open-ended agents, design the loop, set limits and checkpoints and know when a simple chain is better.
---

Not every multi-step task needs an agent. Understanding the simpler patterns lets you pick the least complex design that works, which is usually cheaper, faster and easier to debug.

## What you will learn

- Workflow patterns: chaining, routing and parallelization
- The agent loop and when it is needed
- Limits, checkpoints and error handling
- Observability and human approval

## Workflows

- **Chaining:** step one extracts, step two transforms, step three formats. Each has a focused prompt and a check between steps.
- **Routing:** classify the request, then send it to a specialized prompt or tool.
- **Parallelization:** run independent subtasks at the same time, then combine the results.

```python
def handle(ticket, llm):
    kind = llm(f"Classify as bug, billing or question. One word.\n{ticket}").strip().lower()
    if kind not in {"bug", "billing", "question"}:
        return escalate(ticket)
    return {"bug": handle_bug, "billing": handle_billing, "question": handle_question}[kind](ticket, llm)
```

## The agent loop

```python
def run_agent(goal, tools, llm, max_steps=8, budget_usd=0.50):
    messages = [{"role": "user", "content": goal}]
    spent = 0.0
    for step in range(max_steps):
        reply = llm(messages, tools=tools)
        spent += reply.cost
        if spent > budget_usd:
            return "stopped: budget reached"
        if not reply.tool_calls:
            return reply.text
        for call in reply.tool_calls:
            messages.append(run_tool_with_checks(call))
    return "stopped: step limit reached"
```

An agent calls tools, sees results and decides the next step until it finishes. Use it when the sequence cannot be known in advance, such as investigating an unfamiliar problem.

## Controls

Set **step limits**, **time and cost budgets** and tool allowlists. Save checkpoints so work can resume. Handle tool errors by retrying a limited number of times and then asking for help. Log every step with inputs and outputs for review, and require approval for actions with side effects.

## How the parts fit together

The lesson in one picture: each box is a section of this lesson, in the order you meet it. Select a box to see what it does and the mistake that usually goes with it.

```diagram
title: How Agents and multi-step workflows fits together
node: n1 | Workflows | 0 | 0 | Chaining: step one extracts, step two transforms, step three formats. | No step or budget limits. | queue
node: n2 | The agent loop | 1 | 1 | An agent calls tools, sees results and decides the next step until it finishes. | Using an agent where a workflow would do. | process
node: n3 | Controls | 2 | 0 | Set step limits, time and cost budgets and tool allowlists. | Unlimited retries of a failing tool. | process
edge: n1 | n2
edge: n2 | n3
```

## Incident: A dozen calls for one task

> **Incident:** An agent looped on a simple task and exceeded its budget.

```console
step 9: tool format_table failed: invalid column
step 10: retry format_table
step 11: retry format_table
budget exceeded after 11 calls
```

The task needed a fixed three-step transformation, but the agent chose its own path and kept retrying one failing call. The team replaced it with a fixed workflow with validation, and kept the agent only for open-ended investigations with step and cost limits.

## Common mistakes

- Using an agent where a workflow would do
- No step or budget limits
- Unlimited retries of a failing tool
- No logs of agent decisions

```quiz
Q: When is a fixed workflow better?
+ When the steps are known
- When nothing is known :: No.
- Never :: No.
- When tools are missing :: No.
> Predictable tasks suit workflows.

Q: What does an agent loop do?
+ Calls tools and decides next steps
- Runs once :: No.
- Trains a model :: No.
- Deletes logs :: No.
> The model chooses the path.

Q: What limits protect agents?
+ Step, time and cost budgets
- None needed :: No.
- Larger prompts :: No.
- More tools :: No.
> Stop runaway behavior.

Q: What needs human approval?
+ Actions with side effects
- Reading help text :: No.
- Logging :: No.
- Formatting :: No.
> Risky steps need review.
```

```cards
Workflow :: Fixed sequence of model and code steps
Agent :: Model that chooses actions in a loop
Routing :: Sending a task to a specialized path
Checkpoint :: Saved state for resuming work
```
