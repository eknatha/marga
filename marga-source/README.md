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

### Round 24: diagrams, plans, lesson page, widget presets

- **Diagram system.** Every ```diagram block now draws typed components (client, edge, service, data, queue, cache, control, observability, security, external), a legend, numbered arrows with a flow toggle, and highlights a component with its arrows on click. Code in `src/app/diagrams.js`; kinds are inferred from the label, or set with a 7th field on a `node:` line.
- **Learning plans** at `#/plans` and `#/plan/<id>`: five 30-day plans (SRE, system design, Kubernetes, Linux and shell, cloud and infrastructure as code) in `src/plans/plans.json`, built from contiguous lesson prefixes so the sequential lock never blocks a day. Lessons and widgets tick themselves; drills, case studies and links have a checkbox. No dates. Progress is stored under `pl` and travels with export and import.
- **Lesson page.** A four-step rail (In this lesson, Try it, Quiz, Next) with a reading progress bar, a Key takeaways box from the lesson's flashcards, a "Part of your plan, day N" chip and a sources line.
- **Widget presets.** Each widget has "Break it" and "Fix it" presets, found by searching the widget's own verdict rules (`/home/claude/gen/w/presets.js` was the generator; presets are stored in the JSON). "Predict first" hides the result until you guess. The URL keeps the slider values, so "Copy link to this setup" shares the exact state.

### Round 25: home proof, daily picks, stories, replays, portfolio, more incident games, split data

- **Home page.** "Free. Offline. No sign-up." is the first line under the headline, with a live "Ready to work offline" chip and the one-line proof: open it once, turn off wifi, keep learning.
- **Daily picks.** The Today page and the home strip show an incident game of the day and a widget of the day (picked by date, so the same all day, no server).
- **Real-world stories and a Senior view.** Every lesson has a short real-world story (`src/content/stories/<module>.json`, key `r`) and a third difficulty tier, "Senior view" (key `x`), next to Beginner and Intermediate. The stories are illustrative composites, labelled as such on the page. The validator checks length and banned text.
- **Incident replays** at `#/replay` and `#/replay/<id>`: a step-by-step, no-video replay of each architecture study (what happened, why, what changed), with Back, Play, Next, scrub, keyboard arrows and a "pause and think" in the middle. Steps are parsed from the study itself, so they cannot disagree with it.
- **Portfolio** at `#/portfolio`: skills, capstones, games won and plans from your own progress, printable and copyable as text. It says plainly that it is a record of practice, not a certificate.
- **Incident games: 111 (was 60).** Every skill has at least three. 51 new scenarios are in `src/games/extra-<module>.md`; each has four decisions, feedback with an example on every choice, and a new "The incident explained" block at the end (root cause, what you would see, how to fix it, an example) from `src/games/explain.json`. The validator requires all four parts for every game.
- **Split data.** Lesson bodies moved out of `data.js` into `assets/lessons/<module>.js` (8.6 MB to 4.3 MB for first load). Chunks load on demand, are prefetched when idle (not on data saver) and are in the offline cache. Search loads them all once.
- **Header.** Between 901 and 1240 px the navigation folds into the menu button so the header no longer scrolls sideways.
- Caveats: the new games and stories are machine-written teaching composites, not reports of real incidents, and need a human review before you rely on them. Models are simplified. Reference links are not checked live.

## Round 26

- **Kubernetes and Docker terminal labs (26 labs).** A simulated `kubectl` and `docker` in the browser terminal: pods, deployments, services, rollouts, drains, images, builds, networks, volumes and port conflicts. New files: `src/app/term-k8s.js`, `src/app/term-docker.js`, `src/termlabs/kubernetes.md`, `src/termlabs/docker.md`. Each lab has a checked end state, hints and a worked solution.
- **Guided lessons.** Every lesson has a short, video-style version at `#/watch/<skill>/<lesson>`: commands type out, output appears line by line, captions explain, with play, pause, back, scrub, speed and optional read-aloud (the voice on the visitor's device). It is built from the lesson text, so it cannot disagree with the page. No video files. New file: `src/app/guided.js`.
- Caveats: the terminals are models of kubectl and Docker, not the real tools, so odd flags or real-cluster behaviour will differ. The lab text is machine-written and needs a human review. Guided scenes are generated automatically, so a few may be dull or cut a long paragraph short.

## Round 27

- **MLOps and AIOps skills.** Two new skills of 8 and 7 lessons (each ends with a debugging lesson) (`src/content/mlops`, `src/content/aiops`), each with quizzes, flashcards, a cheat sheet, 6 interview questions, 7 drills, 2 incident games, 12 explainers (2 are failure and recovery), 4 widgets, glossary terms, references and a reading list. A new live path, "MLOps and AIOps Engineer". The lessons are machine-written and need a human review before you rely on them. The incident sections are labelled simulated illustrations; the case studies reused for these skills are existing, sourced ones.
- **System design pack.** Six more worked designs in the system-design skill: chat, news feed, video upload and streaming, a distributed key-value store, a payments ledger, and search autocomplete (lessons 28 to 33).
- **100-day challenge.** `src/plans/plans.json` gains `devops-100`: 89 lessons across Linux, Git, Bash, Python, networking, containers and pipelines, a review day every seventh day and a final practice day. Lessons unlock in order, so the plan follows the module order.
- **Handbooks.** `#/handbooks` and `#/handbook/<skill>`: each skill as one document (lessons, flashcards, cheat sheets, glossary, interview questions, references). Save as PDF or print with the existing print styles, or download one self-contained web page that has no scripts. New file `src/app/handbook.js`.
- **Tell a friend.** `#/share`, and a button on lesson and skill pages: a message, copy buttons, Email, WhatsApp, LinkedIn and X links that open only when pressed, and a downloadable 1200 by 630 picture drawn in the browser. Progress is added only if the visitor ticks the box. No tracking. New file `src/app/share.js`.
- Validator: the reference allow-list gained mlflow.org, kubeflow.org and evidentlyai.com; terminal-lab links in plans may name the kubernetes and docker stages.
- Caveats: the new skills and designs are machine-written teaching material. Reference links are not checked live. The 100-day plan is a suggested order, not a guarantee of job readiness.

## Round 28

- **Real Linux in the browser.** `#/linux`: break-and-fix scenarios (90 since Round 29) on a real Linux kernel (6.8, 32-bit) with BusyBox, run by the v86 emulator and shown in an xterm.js terminal. A second serial port is the grader: Check runs the scenario's `check.sh` inside the machine. Start boots in about 8 seconds, there is a free sandbox at `#/linux/sandbox`, and a key row for phones. After one visit it works offline (the service worker keeps the files). Files: `src/app/vmlinux.js`, `src/vm/*` (kernel, initrd, emulator, scenarios), `tools/mkvm.sh`, `tools/vmtest.sh`, `tools/vmfixes.json`. Licences and GPL source locations are in `src/vm/NOTICE.md`. The machine has no network and is not a security boundary for anything you care about; it runs in the visitor's own browser.
- **Do-it-yourself challenges.** 60 short, auto-checked challenges at the end of lessons (`src/challenges/diy.json`, `src/app/challenge.js`, `src/app/challenge-core.js`): type a command, answer or query, or fix a config against a list of rules. Index at `#/challenges`. The validator checks that every stored solution passes and every starter fails.
- **Workshop and embed modes.** `#/workshop` builds a run-of-show link (lessons, challenges, labs) with a timer, and `#/embed/...` shows one lesson, challenge or Linux lab without the site chrome, for an iframe. Progress codes are notes, not proof. `src/app/workshop.js`.
- **Interview mode.** `#/interview-lab`: five timed, hands-on rounds (warm-up, Linux, DevOps, SRE, platform) with a hint penalty, a scorecard and a shareable code. `src/app/interviewlab.js`.
- **Role roadmaps.** `#/roadmap` and `#/roadmap/<role>`: each path as an ordered map with a "you are here" marker, a jump button and a continue link; linked from the role pages. `src/app/roadmap.js`.
- Practice hub now has 41 cards. Tests added in `tools/e2e.js` for each feature, including an offline Linux test and axe checks.
- Machine-written content: the challenges and scenarios were written and tested by script and in a headless browser, but need a human read before you rely on them.

## Round 29

- **Real Linux lab: 90 scenarios, 30 each for Beginner, Intermediate and Advanced** (`src/vm/scenarios.json`, `src/vm/scenarios/<id>/{setup.sh,check.sh}`, typed fixes in `tools/vmfixes.json`). Beginner covers files, permissions, processes, archives, text counting and basic networking. Intermediate covers rotation, cron environment, services, ports and addresses, config surgery with sed and awk, and security audits (modes, setuid, SSH keys, service accounts). Advanced covers open-file limits, recovering deleted-but-open files, reading /proc, signals (HUP reload, graceful stop, SIGSTOP), sysctl, hard links and sparse files, busy and hidden mounts, safe shell patterns (locks, atomic writes, traps, wait), and security tasks (checksums, block lists, jails).
- **The index** is now a browser: level tabs with solved counts, a text search, a status filter and "Pick one for me". `#/linux?q=TEXT` opens it pre-filtered, which lesson pages use ("All N real Linux labs for this lesson").
- **Home page:** the hero demo gained a fifth, scripted "Real Linux" tab (fix a full log volume and see the check pass) that links to the real lab. It is a recording of typed commands, not a running machine, so the home page stays light.
- **Tests:** `tools/vmtest.sh` now runs every scenario on the host in a throwaway chroot with its own PID, mount and network namespaces, using the typed fixes from `tools/vmfixes.json`. The e2e suite runs each level's 30 scenarios in the real VM (`ONLY="real Linux lab, Beginner"`, and so on; `VMONLY=id1,id2` runs a few).
- Fixed a data bug in the older `find-error-spike` scenario: its log lines now carry the usual `+0000` so the status code really is field 9, as the story says.
- Like the other labs, these scenarios are machine-written and need a human read before you rely on them as teaching material.


## Round 30

- **Real Linux lab now has 130 scenarios** (Beginner 36, Intermediate 42, Advanced 52). New kinds, filterable with the Kind menu on `#/linux` (`?topic=diagnose|multi|network|systemd|fix`): 12 **diagnose-only** labs (look around with real commands, type the cause in a box under the terminal; graded in the page against `accept` patterns, answers in `tools/vmanswers.json`), 10 **several-faults** labs (Advanced, 2 to 6 independent faults, all must be fixed), 11 **network** labs and 11 **systemd-style** labs.
- **Networking inside the VM.** The kernel (`src/vm/kernel.config`) now has namespaces, NET_NS, veth, dummy, bridge and IP forwarding. Network labs build small private networks inside the machine with `src/vm/shims/netlib.sh` and `inns NAME cmd`; services are BusyBox `httpd`, clients `wget`. There is no internet and no route out of the browser.
- **systemd-style practice.** `systemctl` and `journalctl` are teaching shims (`src/vm/shims/`), not real systemd: units, enable, mask, drop-ins, `daemon-reload` warnings, restart policy, start limit and a simulated `sdboot` reboot. Behaviour is faithful to the common cases, not complete.
- **"Why did that work?"** After a lab is solved, many labs ask one multiple-choice question about the reason; the answer is remembered. Field `why` in `scenarios.json` (2 to 4 options).
- **Save my machine.** Save the whole running VM (files and processes) in this browser (IndexedDB, gzip, about 5 MB, under a second), resume it later, download it as a `.mvm` file and load it back. A save from an older lab version is refused.
- **Search across everything.** The `/` box now also finds Linux labs, terminal labs, challenges, games, widgets, plans, capstones, case files, reading, roadmaps and handbooks (new "Labs" and "More" filters). Shift+Enter, or `#/search?q=TEXT`, opens a full results page with counts per group (`src/app/searchpage.js`).
- **Watermarks.** Every print and Save as PDF path carries the diagonal "MARGA by EknathaLabs / marga.eknathalabs.com" mark on every page: app pages, standalone `cheatsheets/*.html`, and now the downloaded handbook web page too (it had none).
- **Tests.** `tools/validate.js` checks the new fields, shims and kernel options. `tools/e2e.js` has new tests for the Kind filter and diagnose labs, save and resume, search and watermarks (real PDFs through `pdftotext`), and the per-level real-VM tests now cover 36, 42 and 52 labs. `tools/vmtest.sh` runs all 130 on the host.
- Caveats: scenarios and answers are machine-written and need a human read. `systemctl` is an imitation. Tested in headless Chromium only. A full e2e run takes over two hours; use `ONLY=` and `SHARD=` to split it.

## Round 32

- **Header**: seven links (Skills, Skill trees, Practice, Real Linux labs, Progress, Interview questions, About) and an **Elsewhere** menu (InterviewHub, Certifications, Cheat sheets, Case studies). No overflow at 1024, 1280, 1366 or phone widths. On narrow screens the menu items sit flat inside the hamburger menu.
- **Home**: a Continue strip (next lesson, lab and plan day with progress bars), a goal strip linking the five goals, "Find my path" as the second hero button.
- **Learning path quiz** (`#/find-my-path`, `src/app/guide.js`): five questions, scores five goals from a fixed table, shows a goal, plan, path and first step. The result goal is kept in this browser.
- **Landing page per goal** (`#/goal/sre|linux|kubernetes|devops|cloud`): why, the first five steps, labs, plans, roadmap.
- **Real Linux lab as a split view** on screens 1000 px and wider: goals, hints, result and "why did that work" on the left, the machine on the right (sticky). One column on phones. Terminal labs already had a split layout.
- **Lab walkthrough replay**: after solving, "Watch a replay" (terminal labs) types the model solution into a fresh terminal; "Watch the fix typed in" (Real Linux labs) types the tested fix (`tools/vmfixes.json`, now also shipped in the scenario data) into the machine. Respects reduced motion; a Stop button ends the terminal replay.
- **Break it again**: after solving, restore the fault with hints and solution switched off (terminal labs also time the second attempt).
- **Explain this output** (terminal labs, `src/app/explain-out.js`): a fixed rules table that explains the last command and its output (ls, df, ps, ss, systemctl, curl, kubectl, docker, aws, az, common errors). It is not an AI and can miss things.
- **More cloud labs**: 23 in all (generator `/home/claude/gen/r32/cloud.py`, 8 new: database port open to the world, stop dev servers, bucket-name typo, detach AdministratorAccess, clean temp objects, Azure SSH open to everyone, start staging VMs, Reader at resource-group scope). Terminal labs total 121.
- **The machine could not start** panel for Real Linux labs: three ordered fixes, a browser report, a link to the simulated terminal, copy-the-error.
- **Theme polish**: page headings line up with the page body on every page; the path-map dots now have 24 px touch targets; axe (WCAG 2.2 AA) finds nothing on the checked pages in light and dark.
- **Device check** (`node tools/devices.js`): seven phone and tablet profiles, light and dark, 15 pages: no overflow, no script errors, tap targets at least 24 px. Found and fixed: leaving Interview questions ran its setup code on the next page (script error on slow devices), and on phones the Elsewhere links were unreachable.
- **Design boards added in a second pass** (`src/app/designs.js`, plus `vmlinux.js`, `plans.js`, CSS): Real Linux lab browser as cards (level, kind, minutes or Solved, Start lab); a 100-day grid on every plan of 28 days or more (done, today, review day, not yet; each cell jumps to its day); a winding skill map above each role roadmap; a progress share card on the Progress page (PNG drawn in the browser, optional name never stored); one-row header on phones; roadmap locked steps no longer use opacity (a contrast fix).
- Caveats: this is Chromium emulation, not a physical phone, Safari or Firefox (those engines could not be installed here). Cloud labs, explain rules and goal pages are machine-written and need a human read.

## Round 31

- **Package-manager and TLS labs in the real Linux VM** (19 new scenarios, 149 in all: Beginner 42, Intermediate 49, Advanced 58; Kind filter `?topic=packages` and `?topic=tls`). `apt`, `apt-get`, `apt-cache`, `dpkg` and `apt-mark` are **teaching shims** (`src/vm/shims/`) over a small local repository served by busybox httpd (stale index, wrong repository URL, held packages, unmet dependencies, lock file, hash mismatch, half-configured package, version pinning, which package owns a file). They are not the real tools. TLS labs use a **real OpenSSL 3.0.13** built static for 32-bit x86 (`src/vm/openssl`, inside the initrd) with certificates made on the host by `tools/mkcerts.sh` (key permissions, untrusted CA, expired certificate, hostname mismatch, missing intermediate, key mismatch, protocol mismatch, which certificate expires first, who issued this). `shop-tls` is a small `openssl s_server` wrapper and `update-ca-certificates` an imitation. BusyBox ash prefers applets over PATH, so `dpkg` is a shell function from `/usr/lib/marga-pkg/fn.sh` and checks call `/usr/local/bin/dpkg`. The initrd is larger, so the first download of the VM is bigger.
- **Cloud-provider labs without a cloud** (`#/terminal-labs/cloud`, 15 labs: 9 AWS, 5 Azure, 1 across both). New engine file `src/app/term-cloud.js`: an imitation `aws` (sts, s3, s3api, ec2, iam) and `az` (account, group, resource, vm, network nsg, storage, role assignment) over a small account described in each lab's `world.cloud`. It has profiles with allowed actions (Access Denied messages in the real wording), `--query` with a small JMESPath subset, and `--output json|text|table|tsv`. Nothing touches a real cloud and no account is needed. Content: `src/termlabs/cloud.md` (generated by `/home/claude/gen/r32/cloud.py`, not part of the shipped source). Verified with `node tools/terminal-verify.js` (113 terminal labs).
- **Print themes for PDFs**: a Light, Dark or Large print setting on every print bar, the handbook page, roadmap and standalone cheat sheets (`data-a-print`, `a11y.js` option `print`). Every theme keeps the watermark on every page.
- **InterviewHub link** (https://interviewhub.eknathalabs.com, new tab) at the top of every page and the footer; MARGA's own page is now "Interview questions".
- **Real Linux labs on the home page**: a band with the lab count, kind chips and an Open button.
- **100-day challenge for Site Reliability Engineers** (`#/plan/sre-100`, plan `sre-100` in `src/plans/plans.json`, generator `/home/claude/gen/r31/sre100.py`).
- Caveats: scenarios, answers and cloud labs are machine-written and need a human read. `apt`, `dpkg`, `aws` and `az` are imitations; real output differs in details. Tested in headless Chromium only. A full e2e run takes over two hours.
