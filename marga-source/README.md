# MARGA by EknathaLabs

Role-based DevOps, cloud and SRE training: 15 modules, 196 lessons with quizzes and flashcards, 14 printable cheat sheets, InterviewHub, spoken voice, and watermarked print or PDF. Static site, works offline, progress stays in the browser. Free forever, no login, no ads, no cookies.

Live: https://marga.eknathalabs.com

    npm ci
    npm run build      # src/ -> dist/
    npm run validate   # content, graph, code syntax, links
    npm run e2e        # browser tests (npx playwright install chromium first)

See DEPLOY.md for hosting, DNS and the visitor counter.

## Terminal labs
72 break-and-fix labs (18 per stage) (Linux, Shell, Networking, Python) run in a simulated terminal in the browser. Sources: `src/termlabs/*.md`; engine: `src/app/term-*.js`; UI: `src/app/termlabs-ui.js`. It is a simulation, not a real server. Verify with `node tools/terminal-verify.js` and `node tools/term-diff.js`. See DEPLOY.md, Round 11.

## Round 16 additions

- **AI Engineering skill tree.** Four new skills with 8 lessons each (32 in total): **LLM fundamentals** (requires Python), **Prompting and structured output** (requires LLM fundamentals), **Claude Skills** (requires Prompting) and **Tool use and MCP** (requires Prompting and Networking). A new live path, **AI Engineer**, runs Linux, Git, Python, Networking and then the four AI skills. A "Build with AI" goal starter was added to the plan builder. Each AI skill ends with a debugging lesson and has a cheat sheet, interview answers, 8 drills, glossary terms, references and a reading list.
- **Incident games.** 2 per AI skill (8 in total), for example a reply cut off by the output limit, a bill that tripled, an instruction hidden in a ticket, a skill that never triggered, a downloaded skill that phoned home, an agent that deleted the wrong folder.
- **Animated explainers.** 12 or more per AI skill (49 new).
- **Skill-writing lab** at `#/skill-lab`. Six exercises (fix a header, rewrite a vague description, remove a secret, make an install step safe, shrink a giant body, write a skill from scratch). It checks the header, name, description, size, secrets and risky commands, and runs a rough trigger test. It works offline and sends nothing anywhere. The checks use commonly published limits and good habits; it is a learning aid, not the official validator, and the trigger test is a word-overlap estimate, not how Claude actually chooses a skill.
- **Case studies of real AI incidents.** 7 new cases (Anthropic quality bugs 2025, OpenAI shared connection bug 2023, Air Canada chatbot 2024, Microsoft Tay 2016, Google Gemini image pause 2024, Replit agent database deletion 2025, malicious postmark-mcp package 2025). Every AI skill has at least 2.
- **Architecture post-mortems.** 10 new studies (51 to 60): Anthropic 2025, OpenAI Redis client bug 2023, Replit and SaaStr 2025, Air Canada chatbot 2024, an AI agent running terraform destroy (DataTalks.Club, 2026), Ingress NGINX vulnerabilities 2025, the postmark-mcp package 2025, the Linux leap second bug 2012, Dirty Pipe 2022 and Dirty COW 2016. They are written from public sources and marked "as reported" where details are second-hand.
- **Certifications** in the top navigation is now a plain text link (new tab) to https://certs.eknathalabs.com instead of an icon.
- Reading and case sources may now use anthropic.com, claude.com, modelcontextprotocol.io and json-schema.org.
- Honest limits: the AI lessons describe product behaviour as it was when written; products, limits and model names change, so each lesson tells the learner to check the current documentation. The AI skills have no terminal labs.

## Round 15 additions

- New skills: **Go for DevOps engineers** (10 lessons, no prerequisites, placed after Python in all four paths) and **Helm for beginners** (8 lessons, requires Kubernetes, placed after Kubernetes). Each has a cheat sheet, interview answers, drills, glossary terms, 6 reading items, tagged case studies and badges.
- Incident games: 3 for Go and 2 for Helm. Every game answer now shows an **Explanation.** paragraph followed by an **Example.** paragraph.
- Linux for engineers: 5 new kernel lessons (modules and sysctl, memory and the OOM killer, system calls with strace and perf, filesystems and the page cache, kernel networking and conntrack). The debugging lesson stays last.
- 47 new animated explainers covering Go, Helm, the Linux kernel and every other skill.
- A Certifications link in the top navigation points to https://certs.eknathalabs.com (new tab).
- Rule change: the ban on the word "git" was narrowed to hosting and brand words (`/\bgit(hub|lab|ops|leaks|ea)/i`), so the Git skill can name the tool.
- Go and Helm have no terminal labs (Go has the existing playground exercises).
