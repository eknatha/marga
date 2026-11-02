## What is MCP and why was it created?
level: junior
The Model Context Protocol is an open standard for connecting AI applications to tools and data. Instead of custom integrations for every assistant and system, a server exposes tools, resources and prompts in a common format over JSON-RPC, and any compatible host can use it. It standardises connecting, not trust.

## How does function calling work?
level: junior
I describe tools with a name, description and JSON schema. The model may reply with a request to call a tool and its arguments. My code validates and runs it, and returns a tool result tied to the call ID, then calls the model again. The model never executes the tool itself.

## What makes a good tool definition?
level: mid
A specific name, a description saying what it does, what it returns, when to use it and when not, and a schema with precise types, enums and required fields. I keep the toolset small and focused, return concise results with clear errors, and validate every call in code.

## What limits does a tool-use loop need?
level: mid
A maximum number of steps, token and time budgets, and a cost cap. I detect repeated identical calls, make side-effecting tools idempotent or approval-gated, return tool errors as results so the model can adapt, and log every step with a request ID to debug later.

## What are MCP transports?
level: mid
Stdio runs a server as a local child process exchanging JSON-RPC over standard input and output, so logs must go to standard error. Streamable HTTP runs a server remotely, with authentication such as OAuth and TLS. The choice affects security, deployment and who can share the server.

## How do tools, resources and prompts differ in MCP?
level: mid
Tools are model-controlled actions, resources are data identified by URIs that the application or user attaches, and prompts are templates the user chooses. I use a tool for actions or computation, a resource for reference data, and a prompt for a repeatable workflow, and I check host support.

## How do you defend a tool-using agent against prompt injection?
level: senior
I assume tool results can carry instructions. I use least privilege and read-only credentials where possible, require approval showing exact arguments for risky actions, restrict recipients and domains, and avoid combining private data, untrusted content and an outbound channel. I review third-party tool descriptions, log actions, and test injection cases.

## An MCP-based assistant ignores a new tool. How do you debug it?
level: senior
I work bottom-up: call the tool in the inspector, check the host starts the server and stdout is clean, confirm tools/list returns it and the host refreshed its list, then review the name and description and read traces to see whether the model considered it. I add tests for the tool list and tool choice.
