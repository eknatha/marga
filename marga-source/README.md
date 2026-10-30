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

## Round 17

- Three new skills: Cloud security and IAM, Kubernetes administration and operations, and Continuous delivery with Argo CD (8 lessons each, each ending in a debugging lesson), with cheat sheets, interview answers, drills, incident games, glossary terms, case studies and architecture studies mapped to them. They sit in the DevOps, Cloud, SRE and DevSecOps paths.
- 82 more animated explainers (442 in total after Round 18), covering the new skills and every existing skill.
- Core filters on the Animated explainers page: skill chips with counts (multi-select), search across titles, summaries and step text, a Hide watched toggle, per-skill "N of M watched", a live result count, an empty state, a URL that keeps the filter (`#/explainers?skill=a,b&q=text&unwatched=1`) and a remembered last filter. An explainer counts as watched when its final step is reached.
- Caveats: the new skills have no terminal labs yet. Argo CD wording avoids the banned word list, and product behaviour is described as of writing.
- Practice page redesign: tools grouped into Featured (Animated explainers, Architecture post-mortems, Troubleshooting drills), Every day, Hands-on labs, Scenarios and Interview and study. A next-step panel suggests one action from your own progress (missed items, today's practice, then something new) with Run it, Skip and Why this. Filters are flag buttons (`--labs`, `--starred` and so on) plus a search box. Each tool shows a status (Ready, Running, Completed), progress, time and level tags and the skills it practises. Tools can be starred, groups collapse, and a week strip shows the days practised. Favourites, collapsed groups and the week strip come from this browser only. Skill pages now link to that skill's animated explainers and architecture post-mortems.
- Caveats: the time and level tags are fixed estimates, not measured. Every group starts open so every tool stays one click away.

## Round 18

- 51 failure-and-recovery explainers, two for each of the 25 skills. Each one runs from a healthy start, through the change and the failure, to the symptom, the diagnosis, the fix and the check that proves recovery. They carry `kind: "failure"` in `src/app/explainers.js` and a title that starts with "Failure and recovery:". A "Failure and recovery only" checkbox on the explainers page filters them (`#/explainers?kind=failure`).
- Every explainer now has a `lesson` field (`module/slug`). It is shown as "Related lesson" on the explainer page, together with the learning paths that include the skill. Lesson pages get a "Watch it" section, skill pages list their explainers and failure stories, and path pages have a "Watch along this path" row. The validator checks that every link resolves to a lesson in the same skill, that ids are unique and that each skill has at least two failure explainers.
- Lesson links for the 394 older explainers were matched automatically by keywords and then corrected by hand where the match was clearly off. A few may still be the second-best lesson in the skill. 63 lessons have no tied explainer; their "Watch it" section shows two from the same skill and says so.
- Three older explainers shared an id with another one. They were renamed so every id is unique.
- The Practice page layout from Round 17 is unchanged.


## Round 19

- Skill trees panel in the main nav: hover or focus opens all five paths with every skill and progress; on mobile a chevron expands it inside the menu.
- Path cards show a route of dots (one per skill, coloured by status, name on hover) with a Show all skills toggle.
- Certifications link now sits beside Practice.

## Round 20

- Skill tree view rebuilt: compact nodes in stage lanes, elbow connectors, a detail panel (needs, unlocks, lessons, next action), highlight of the selected skill links, hover preview, Next up tag, and a bottom sheet on phones.

## Round 21

- Case files: all 81 case cards have a full case file page at `#/case-file/<case-id>` with nine sections: overview, architecture, timeline, root cause, evidence, fix, before and after, learning activities, lessons.
- Data lives in `src/casefiles/<case-id>.json`; the build checks the JSON and that a case card with the same id exists; `tools/validate.js` checks the schema, labels, sources and wording.
- Diagrams are inline SVG drawn by `src/app/casefile.js`, each labelled Verified architecture or Conceptual diagram, with a text version. Evidence is labelled Quoted or Simulated; timeline times come only from the sources.
- Source depth varies. Each file has a verification note saying what was read. Some files rest on news reports or secondary summaries because the primary page could not be read (for example Facebook 2021 via Cloudflare, Equifax, Optus, Rogers, Tay, Gemini, Terraform 2026, Tesla), and a few describe a mechanism rather than one dated incident (Docker Hub rate limits, Let's Encrypt root expiry, ingress-nginx). Read the note before relying on a detail.
- The end-to-end test checks every case file for the nine sections, labels, sideways scroll on a phone width and accessibility.

## Round 22

New skill: **System design for platform and SRE** (`system-design`, Advanced, requires `sre`, `networking`, `databases`), placed at the end of the SRE path.

- 15 lessons in `src/content/system-design`: the design method and estimation; caching without stampedes; queues, retries and idempotency; consistency and availability; quorums, leaders and split brain; clocks and ordering; failure domains, cells and bulkheads; blast radius and shuffle sharding; graceful degradation and circuit breakers; rate limiting and load shedding; multi-region and global traffic; configuration and control plane change safety; hidden dependencies and single points of failure; and two worked designs (a global API at 99.99 percent, and a status page that survives the outage with an outage design review method).
- Each lesson has a "how it fails" section, an incident block tied to a case study (console output is labelled as a simulated illustration where it is not a quotation), an interview question, a quiz and flashcards.
- Also added: cheat sheet, 9 interview questions, 6 drills, 1 incident game, 8 glossary terms, 12 explainers (2 failure and recovery), reading list, references, badge hue and icon, and the `system-design` module on 22 cloud outage case cards.
- Not included in this release: terminal labs, and the planned Stage 1 and 2 link lessons beyond the design method, caching and queues (OS limits, load balancing, databases and containers are linked to the existing modules rather than re-taught).
- Reference links were chosen from well known stable pages but could not be fetched from the build sandbox; check them once online.

### System design lab (Round 22)

`#/system-design-lab`, script `src/app/sdlab.js`, listed in the Practice hub under Labs. No backend, no accounts, nothing is sent anywhere.

- **Estimator:** users, requests, read share, response size, peak factor, copies, per-instance capacity and an availability target give requests per second, peak writes, egress, storage growth, instance count and the monthly error budget, with rule-based notes on which number crosses a limit.
- **Break it:** six fixed designs (one region, two regions, configuration push, status page, retry chain, queue pipeline). Select a component to fail it; a "fix" switch shows the same fault with the design improved. Cost is the share of users affected times minutes to recover, compared with the monthly budget. It is a labelled model: the numbers are written in `DESIGNS` in `sdlab.js` as teaching assumptions, not measurements.
- **Case challenges:** eight multiple-choice challenges from real case files; the reveal shows what the organisation changed (`afterChanges`) and links to the case file and a lesson.

### System design round 2 (Round 22c)

- 12 new lessons in `system-design` (27 in total): partitioning and consistent hashing; storage engines and replication topologies; backup, restore and object storage; observability, security and cost and capacity by design; and six worked designs (URL shortener, rate limiter service, notification fan-out, metrics and log pipeline, multi-tenant Kubernetes platform, authoritative DNS).
- Mock design interview at `#/design-interview`: twelve prompts, six timed phases with notes, an 18-item self-score, links to the lesson for each weak phase and to the worked design, and the last five scores. Listed in the Practice hub under Study.
- Also added: 7 interview answers, 6 drills, 8 glossary terms, 4 explainers (1 failure and recovery), and cheat sheet sections. Console blocks that are not quotations are labelled as simulated illustrations; case claims were checked against the case file summaries.
- The mock interview is self-scored; nothing grades the notes.

### Interactive widgets (Round 23)

- 102 small simulations, at least 4 in each of the 25 skills, at `#/widgets` and `#/widget/<id>`. Each is plain data in `src/widgets/*.json`: inputs, derived values, a diagram of nodes and edges with animated request dots, readouts, a chart with a data table, a verdict, and things to try. The engine and pages are in `src/app/widgets.js`; `window.MargaWE` is the pure part.
- Every lesson now has a "Try it" panel: its own widget when one is tied to it, otherwise the nearest ones from the same skill. Skill pages link to their widgets and the Practice hub lists the set under Labs. Tried widgets are remembered in the browser.
- Motion stops under reduced-motion settings. Nodes marked as controls (a replica, a server) can be toggled with the keyboard.
- `tools/validate.js` loads the engine and evaluates every expression at the defaults, at every min/max combination of the sliders and with every toggle combination, and fails on bad numbers, unknown lessons, missing verdicts or a skill with fewer than 4 widgets.
- These are simplified models made for intuition. Some use round illustrative numbers (typical recovery times, relative costs, a goroutine stack size); they are labelled as such on the page and are not measurements.
