## The agent that deleted the wrong folder
module: mcp
level: Intermediate
minutes: 7
lesson: mcp/permissions-auth-and-prompt-injection-defence
summary: A coding assistant with file tools removed a directory it should not have touched. Find the control gap and fix the design.
intro: During a cleanup task an assistant with a delete tool removed the shared fixtures directory. The tool ran without any prompt, using the developer's full access.

### s1
text: The directory was removed with no confirmation. What do you do first?
- Restore from backup or version history, then record exactly what was called and with which arguments => s2 | 2 | Recovery and evidence come first. Example: The folder is restored in minutes, and the log shows the delete call with path set to fixtures.
- Ask the assistant to explain itself and trust the answer => s2 | 1 | The log is evidence, the explanation is not. Example: The model gives a confident but wrong account.
- Remove all tools from all assistants => s2 | 0 | You overreact and lose benefits. Example: Developers stop using the assistant and work around it.

### s2
text: Given what you have found so far: What was the real design weakness?
- A destructive tool with broad permissions and no approval or path limit => s3 | 2 | Capability, not wording, was the gap. Example: The delete tool accepted any path and ran with the developer's credentials.
- The model should have been smarter => s3 | 1 | Any model can make mistakes. Example: A better model still misreads an ambiguous task sometimes.
- The task description was too short => s3 | 0 | Clear tasks help but are not a safeguard. Example: A detailed task can still be misunderstood.

### s3
text: Given what you have found so far: What is the best lasting fix?
- Limit the tool to an allowed directory, prefer a trash move over delete, require approval showing the exact path, and use least-privilege credentials => end-win | 2 | Several layers limit the damage of any mistake. Example: Deletes are now restricted to the scratch folder and need a click showing the path.
- Add an instruction saying never delete important files => end-ok | 1 | The model cannot know what is important. Example: The next run still removes a folder that looks temporary.
- Run the assistant as administrator for convenience => end-fail | 0 | Wider access increases damage. Example: A mistake can now reach the whole disk.

### end-win
end: win
text: Mistakes are now limited to a safe area, risky actions need approval, and recovery is easy.
takeaway: Limit what a tool can do, require approval for destructive actions, and keep recovery simple.

### end-ok
end: ok
text: The folder is restored, but the same mistake could happen again.
takeaway: Recover first, then redesign permissions.

### end-fail
end: fail
text: The data stays lost and the tool stays dangerous.
takeaway: Instructions do not replace permissions and approvals.


## The tool the assistant ignored
module: mcp
level: Intermediate
minutes: 7
lesson: mcp/debugging-tool-use-and-mcp
summary: A new MCP tool does not appear to the assistant. Work from the server up to the model to find the break.
intro: You added a create_ticket tool to the support MCP server. In the host the assistant answers that it cannot create tickets, though the code looks right.

### s1
text: The assistant says it has no ticket tool. Where do you start?
- Call the server with an inspector and list tools to see what it exposes => s2 | 2 | Test the server alone before blaming the model. Example: tools/list returns get_ticket and search_tickets but not create_ticket.
- Rewrite the system prompt => s2 | 1 | The tool is not even offered. Example: The prompt change makes no difference.
- Restart the laptop => s2 | 0 | Random restarts do not locate the break. Example: Nothing changes.

### s2
text: The tool is missing from tools/list. What is a likely cause?
- The server process running is an old version, or the decorator or registration was not applied => s3 | 2 | Missing registration or a stale process explains it. Example: The host is still using a process started before the code change.
- The model does not like the name => s3 | 1 | The model never saw it. Example: The name is irrelevant if it is not listed.
- JSON-RPC is deprecated => s3 | 0 | It is not. Example: The protocol works for the other tools.

### s3
text: After the fix, how do you stop this from happening again?
- Add a test asserting the set of tool names, plus a conversation test that checks the right tool is chosen => end-win | 2 | The tool list is part of your API contract. Example: CI fails when create_ticket disappears, and a scripted chat confirms the assistant calls it.
- Rely on users to report missing tools => end-ok | 1 | Failures reach users first. Example: Support finds out a week later.
- Skip tests for small servers => end-fail | 0 | Small servers break too. Example: A typo removes a tool unnoticed.

### end-win
end: win
text: The tool is exposed, chosen correctly, and covered by tests.
takeaway: Debug bottom-up: server, tool list, host, then model choice. Test the tool contract.

### end-ok
end: ok
text: The tool works now, but a repeat would go unnoticed.
takeaway: Fix the break and add a test for the tool list.

### end-fail
end: fail
text: The assistant stays unable to act and users lose trust.
takeaway: Blaming the model hides a registration or deployment bug.

