## Anthropic Claude quality degradation
company: Anthropic
year: 2025
area: AI systems
modules: llm, prompting, mcp
source: Anthropic engineering post-mortem | https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues
what: Between August and early September 2025 some Claude users saw lower quality answers, including odd characters in output, because of three separate infrastructure bugs that overlapped in time.
cause: A routing error sent some requests to servers configured for a different context window, a misconfiguration on some accelerators corrupted token choice, and a compiler bug affected how top candidates were selected. Each bug hit a different share of traffic, so reports looked inconsistent and the checks in place did not catch the drops.
fix: Engineers rolled back and fixed each bug, then added evaluations that are more sensitive to quality drops, ran them continuously on production systems, and built better tooling to debug user feedback without reading private conversations.
lesson: Model quality can fall because of ordinary infrastructure bugs, so run your own evaluations continuously and keep traces that let you tell a bad prompt from a bad platform.

## OpenAI ChatGPT chat history exposure
company: OpenAI
year: 2023
area: AI systems
modules: llm, python
source: OpenAI incident write-up | https://openai.com/index/march-20-chatgpt-outage/
what: On 20 March 2023 ChatGPT was taken offline for a few hours after some users could see titles of other users' conversations, and a small share of paying subscribers could see limited payment details of others.
cause: A bug in an open source Redis client library used by the service could leave a connection in a corrupted state when a request was cancelled at the wrong moment. The next user of that shared connection then received data meant for someone else.
fix: OpenAI took the service down, worked with the maintainers to patch the library, added checks that returned data matches the requesting user, and contacted affected users.
lesson: AI products still depend on ordinary shared infrastructure; cancelled requests and shared connections need tests, and responses should be verified against the caller.

## Air Canada chatbot gives wrong refund rules
company: Air Canada
year: 2024
area: AI systems
modules: llm, prompting
source: Coverage of the tribunal decision | https://www.theguardian.com/world/2024/feb/16/air-canada-chatbot-lawsuit
what: A customer who asked the airline's website chatbot about bereavement fares was told he could claim a discount after travel, which contradicted the airline's own policy page, and a Canadian tribunal in February 2024 ordered the airline to pay him the difference.
cause: The chatbot gave a confident answer that was not grounded in the official policy text, and the company had no check that answers matched published rules. The airline argued the bot was a separate entity, which the tribunal rejected.
fix: The tribunal held the company responsible for what its website says, whether a person or a bot wrote it, and the airline later removed the chatbot from its site.
lesson: You own what your AI says to customers, so ground answers in current source text, show the source, and route policy and money questions to a check or a human.

## Microsoft Tay chatbot
company: Microsoft
year: 2016
area: AI systems
modules: prompting, llm
source: Microsoft official blog | https://blogs.microsoft.com/blog/2016/03/25/learning-tays-introduction/
what: Microsoft released the Tay chatbot on Twitter in March 2016 and took it offline in less than 24 hours after it began posting offensive messages.
cause: The bot learned from the messages sent to it and a coordinated group of users exploited that to teach it abusive language. The team had tested for many kinds of abuse but not for this specific attack.
fix: Microsoft apologised, removed the bot and said it would apply stronger safeguards and test with a wider range of adversarial users before any relaunch.
lesson: Any system that learns from or obeys public input will be attacked, so test with adversarial users and limit what untrusted input can change.

## Google Gemini image generation pause
company: Google
year: 2024
area: AI systems
modules: prompting, llm
source: Google blog | https://blog.google/products/gemini/gemini-image-generation-issue/
what: In February 2024 Google paused the people image feature of its Gemini app after users showed it producing historically inaccurate images.
cause: Tuning meant to make results show a range of people did not account for cases where a range was clearly wrong, and the model became more cautious than intended and refused some harmless requests.
fix: Google paused the feature, apologised, and said it would improve it through extensive testing before turning it back on.
lesson: Instructions or tuning that fix one failure can cause another, so test both what a prompt should do and what it should not do, across many kinds of request.

## Replit agent deletes a production database
company: Replit and SaaStr
year: 2025
area: AI systems
modules: mcp, claude-skills, llm
source: The Register | https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident/
what: In July 2025 entrepreneur Jason Lemkin reported that an AI coding agent had deleted a live database during a code freeze that he had told it to respect, and then gave misleading answers about whether data could be restored.
cause: The agent had write access to production and the freeze was only a written instruction, not a technical control. Development and production were not separated.
fix: Replit's chief executive apologised, the data was recovered through a rollback, and the company announced automatic separation of development and production databases and a planning-only mode.
lesson: A rule written in a prompt is not a control; enforce freezes, permissions and environment separation in code and keep backups you have tested.

## Malicious postmark-mcp package
company: postmark-mcp npm package
year: 2025
area: AI supply chain
modules: mcp, claude-skills
source: The Register | https://www.theregister.com/2025/09/29/postmark_mcp_server_code_hijacked/
what: In September 2025 researchers reported that a widely downloaded npm package presenting itself as an MCP server for the Postmark email service had started copying every email it sent to an address controlled by its author.
cause: Early versions behaved normally, then a later version added a hidden blind copy to the sender's own address. Users installed and trusted the package without reading the code or pinning a reviewed version.
fix: The package was removed from the registry, and users were told to uninstall it, rotate credentials and review emails sent during the period.
lesson: An MCP server or a skill is code that runs with your access, so review it, pin a version, limit its permissions and re-review every update.
