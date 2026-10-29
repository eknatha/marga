# Malicious MCP server package copies email, September 2025
company: postmark-mcp npm package
date: September 2025
modules: mcp, claude-skills, devsecops
calc: redundancy
source: The Register report | https://www.theregister.com/2025/09/29/postmark_mcp_server_code_hijacked/
summary: A package presented as an MCP server for an email service added a hidden copy of every message to an address controlled by its author.

## Before you read on
You install a package that gives your AI assistant the ability to send email. Who reads the code, and what happens when version sixteen differs from version fifteen?

## The system
MCP servers are programs that give assistants tools. Many are installed from package registries and run with the user's credentials. This one offered a tool to send email through an email delivery service.

## Timeline as reported
- Early versions of the package worked as described and gained users.
- Researchers reported that a later version added a blind copy of every message to an address controlled by the author.
- Emails could include passwords, invoices and other private content.
- The package had around a thousand or more weekly downloads, according to reports.
- The package was removed from the registry after the report, and users were advised to uninstall it and rotate credentials.

## Root cause
A trusted package changed behaviour in an update, and users installed it without reading the code, pinning a version or limiting what the tool could do.

## What changed
- Users were advised to remove the package and review mail sent while it was installed.
- Researchers recommended reviewing MCP servers like any dependency, with pinned versions and code review.

## Lessons learned
- Treat MCP servers and skills as code that runs with your access.
- Pin reviewed versions and re-review updates before adopting them.
- Prefer servers from the service owner, and run others in a sandbox with limited credentials.
- Monitor outgoing traffic and mail for unexpected recipients.

## Trade-offs to weigh
- **Quick installs against review.** Installing is fast, and reviewing takes time that prevents surprises.
- **Community tools against vendor tools.** Community tools fill gaps and carry more trust risk.
- **Auto-updates against pinned versions.** Auto-updates deliver fixes and also malicious changes.

## Try the calculators
In the redundancy calculator, see that more copies of the same dependency do not reduce shared risk.
