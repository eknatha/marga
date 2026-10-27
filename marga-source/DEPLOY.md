# MARGA by EknathaLabs: deploy and develop

Static site. No server code, no GitHub Actions, no cookies.

## Deploy with GitHub Pages (web upload)
1. Unzip `marga-upload.zip`.
2. In github.com/eknatha/marga choose Add file, then Upload files, and drag in everything from the unzipped folder (including `.nojekyll` and `CNAME`). Commit to the main branch.
3. Settings, Pages: Source = Deploy from a branch, branch main, folder / (root).
4. DNS: a CNAME record `marga` pointing to `eknatha.github.io`. Enable Enforce HTTPS once the certificate is issued.

## Develop
    npm install
    npm run build      # src/ -> dist/
    npm run validate   # schema, prerequisites, code syntax, references, footer, voice, print
    npm run e2e        # browser tests (needs Playwright's Chromium)

- Lessons: `src/content/<module>/NN-slug.md`. Modules and prerequisites: `src/content/modules.json`. Paths: `src/content/paths.json`.
- Cheat sheets: `src/cheatsheets/<id>.md`.
- Official reference links: edit `src/content/refs.json` (3 per lesson, module and sheet; https and an allow-listed host are enforced by the validator).
- InterviewHub: `src/interview/<module>.md`, each question as `## Question`, then `level: junior|mid|senior`, then the answer.

## Features
- Role paths (DevOps, Cloud, SRE) covering 11 modules and 93 lessons, with gated progression (quiz of 70% or more unlocks the next lesson; modules unlock when their prerequisites are done).
- Quizzes, flashcards, streaks, 14 cheat sheets, InterviewHub (91 questions, self-rating).
- Spoken voice: Listen, Pause, Stop, a Voice dropdown and Speed on lessons, modules, paths, cheat sheets and InterviewHub. Uses the browser's built-in speech engine; available voices depend on the browser and operating system.
- Print and Save as PDF with a MARGA watermark. Both open the browser print dialog; choose Save as PDF as the destination.
- Real-world case studies (56, `src/cases/*.md`): what happened, cause, fix, lesson, link to the original report. Filter by type and stage, search, mark as read.
- Architecture post-mortems (10, `src/architecture/*.md`) with interactive trade-off calculators (error budget, serial/parallel availability, cloud cost, backup recovery, retry storms, cell blast radius, capacity with zone loss).
- Troubleshooting drills (33, `src/drills/<module>.md`): 3 per module, with logs or command output and a choice of fixes.
- Mock interview mode (role, level, count, timer, self-scoring, history), interactive flashcards (flip, keyboard, known/learning), Practice hub at `#/practice`.
- Accessibility panel (Aa button): text size, Atkinson Hyperlegible and OpenDyslexic fonts (loaded only when chosen), spacing, high contrast, reduced motion, link underlines, strong focus, read-aloud highlight. Saved in this browser.
- Better search (`/` or Ctrl+K): typo tolerant, ranked, with filters (Lessons, Cases, Cheat sheets, Interview, Glossary, Practice), snippets and recent searches. Indexes lessons, cases, post-mortems, cheat sheets, interview answers, glossary, drills, explainers and tools.
- Glossary (`src/glossary.md`, 136 terms): dotted terms inside lessons, cases and answers show a hover or focus card; the "Explain like I am new" switch adds a plain-words note after each marked term.
- Daily challenge (`#/daily`), plus Today (`#/today`) with the interview of the day and the case of the day. The pick is made from the date, so everyone sees the same ones; no server involved.
- Animated explainers (`src/app/explainers.js`, 48, at least four per stage): at least two for every stage (boot, permissions, processes, shell expansion, pipelines, imports, retries, DNS, TCP, TLS, load balancing, Docker build and run, blue-green, Services, autoscaling, Terraform apply and locking, IAM, auto scaling, multi-AZ failover, alerting, tracing, logging, incidents, error budgets, retry storms). Play, step, slider, speed, read aloud. Add one by appending an object to the array; the validator checks it.
- Landing page: role cards, typed terminal demo (finished state with reduced motion), live stats, path pipeline, Today strip, incident teaser, browser tools. The 10-question placement check is at `#/placement`; it suggests a stage and unlocks nothing.
- Subnet and CIDR playground, YAML playground (js-yaml, Kubernetes checks) and Python playground (8 exercises with tests). Python (Pyodide, pinned in `more.js`) is downloaded from cdn.jsdelivr.net only when a visitor presses Load; keep `PY_VER` equal to the installed `pyodide` package version.
- Footer promise: Free forever, No login, No ads, No cookies.

## Known limits
- Gating and progress are client-side (localStorage). Content is readable in page source.
- Progress is per browser; use Export and Import on the Progress page to move devices.
- Official reference links were written from known documentation structure and could not be checked live from the build environment. Spot-check them and fix any that moved.
- Cloud CLI commands in lessons were checked for syntax only, not run against real accounts.
- Hands-on labs are planned and not implemented.
- Case studies and post-mortems are short summaries of public reports, written without live access to the sources. Check dates, times and numbers against the linked original before relying on them.
- The Python playground needs internet the first time (about 10 MB from a public CDN) and cannot stop an infinite loop. It is the only feature that contacts a third party, and only on request.
- Daily and Today use the visitor's local date.
- Calculators give estimates from the numbers a visitor enters; they do not model real systems.
- Text size uses CSS zoom; it is reset for print.

## Visitor count (GoatCounter, free, no cookies)
1. Create a site at goatcounter.com with the code `marga-eknathalabs` (or build with `MARGA_COUNTER=yourcode`; `MARGA_COUNTER=` disables it).
2. In its settings, enable "Allow adding visitor counts on the website".
The footer shows unique visitors once the counter responds (falls back to page views), keeps the last value if the counter is unreachable, and retries. Every page view (each route, plus each cheat sheet page) is recorded; hits are skipped on localhost and when the browser sends Do Not Track.
The line always shows in the footer: "Counting visitors", then the number, or "Visitor count unavailable" if GoatCounter cannot be reached or step 2 was not done.
If the number does not appear: open the browser console and look for the "visitor count unavailable" message; the usual cause is the setting in step 2, or a different site code.

- Skill trees replace the linear pipeline on the home page, the Skill trees page and each path page. A tree is built from each stage's `requires` list; no extra data is needed.
- Visitor count sits in a strip at the top right. It reads the GoatCounter total; if that cannot be read it falls back to a second free counter (abacus.jasoncameron.dev, namespace marga-eknathalabs), counted once per browser session. For the GoatCounter number to show, enable "Allow adding visitor counts on your website" in its settings.
- Every cheat sheet has more commands and red Warning boxes on risky ones (`> **Warning:** ...` in the markdown).


## Playgrounds and labs (added)
- Python playground now has 31 exercises. YAML playground has 30 exercises checked against the file in the editor. Terraform (HCL) playground has 30 exercises and SQL for SREs has 20; Go has 31.
- The HCL check is structural (a small HCL reader plus rules). It is not `terraform validate` and does not know provider schemas.
- SQL runs on sql.js (SQLite compiled to WebAssembly), vendored in `assets/sql-wasm.js` and `assets/sql-wasm.wasm`. It loads on first use and is then cached by the service worker for offline use.
- The Go playground sends the code in the editor to the public Go Playground (go.dev) only when the visitor presses Run or Check. It needs internet. Whether go.dev accepts cross-origin requests from your domain was not verified from the build machine; test it once after deploy.
- Exercise sources are in `src/labs/*.md`; `node tools/labs-verify.js` checks that every solution passes and every starter fails (Go needs a local Go toolchain).
- Skill tree branches glow when the parent skill is mastered and the child is ready or in progress. They refresh from the storage event, so a lesson passed in another tab updates the tree.
- Warnings: `> **Danger:**`, `> **Caution:**` and `> **Warning:**` blockquotes get an icon and distinct styles (also in print).
- Content added from memory (explainers, drills, 30 architecture post-mortems) should be spot-checked against the cited sources.

## Round 5 additions
- New stage "DevSecOps and security" (`src/content/security`, 7 lessons, cheat sheet, interview questions, drills, explainers) and a live DevSecOps Engineer path with its own skill tree.
- Lesson blocks: ```predict (Q: line, optional code, `???`, answer, `>` explanation) and ```diagram (title, `node: id | label | col | row | what it does | what fails`, `edge: a | b`). Both are checked by `tools/validate.js`.
- "Explain it to me like..." text for every lesson is in `src/content/levels.json` (new, practitioner, interview).
- The Aa panel now has Colour theme (match device, light, dark) and Reading mode. Lessons also have a Reading mode button.
- The daily challenge shows a bonus drill and a predict item chosen from the date.
- SQL for SREs has 41 exercises. Troubleshooting drills: 7 per stage (84). Animated explainers: 77. Architecture post-mortems: 50, each with a "Lessons learned" section.
- All post-mortems, drills and explainers were written from memory against the cited sources. Spot-check dates, numbers and URLs before relying on them.

## Round 6 additions
- DevSecOps stage now has 12 lessons (added: identity and zero trust, application security, policy as code, network and edge security, ransomware resilience). Refs, levels text, cheat sheet, interview questions, glossary, drills (10) and explainers were extended.
- Predict-then-reveal and a clickable diagram now appear in the other 11 stages as well (35 predicts and 19 diagrams in total).
- Every playground now has 50 exercises: Python (8 built in + 42), Go, Terraform (HCL), YAML and SQL. Run `node tools/labs-verify.js` (Go needs a local Go toolchain).
- Animated explainers: 104. Each lesson page ends with a "What to do next" panel (next lesson or check, related drill, explainer, post-mortem, interview question, cheat sheet, playground).
- Weak-spot review (`#/weak`): quiz questions, drills and flashcards answered wrongly are stored in the `wk` bag of the progress object; a correct answer removes them. It is included in progress export and import.
- Search: stage filter, "Did you mean" for close typos, and playground exercises and predict questions are indexed.
- Reminder: the new lessons, predicts, explainers, drills and exercises were written from memory and checked by the build tools and tests, not by a domain reviewer. Spot-check commands, numbers and policy examples before relying on them. External links, the live counter and the Go Playground are not machine-verified.

## Round 7 additions
- Case studies: 74 (added 18 in `src/cases/04-data-kubernetes-and-change.md`: databases, Kubernetes DNS, cloud networking and cooling, identity, supply chain, ransomware, migrations, Terraform state). Each source URL was opened and read when the entries were written; links can still change over time.
- About page (`#/about`, nav link after InterviewHub) with the author text and a LinkedIn link.

## Round 8 additions
- A debugging and troubleshooting lesson is now the last lesson of every stage (12 new lessons, 117 in total). Each has a predict, a clickable diagram, an incident walkthrough, 4 quiz questions with a reason for every wrong option, and 5 flashcards.
- Explain-the-wrong-answer: after a wrong quiz answer the page shows what you chose, the correct answer and (where authored) why each other option fails. Reasons use ` :: reason` after an option in lesson markdown. Only the new lessons carry them; the older 420 questions still show the short explanation.
- Interleaved practice (`#/mix`): 12 shuffled questions and drills from stages you have passed.
- Playground aids on Python, YAML, Go, HCL and SQL: support levels (study the answer, finish a half-solved one, start blank) and a four-step hint ladder (hint, what failed, partial solution after 2 failed checks, full solution after 3).
- Capstone projects (`#/capstones`): 4 guided builds per path (16), in `src/capstones/<path>.md`. Steps and self-check items are ticked off and saved in the `cap` bag; included in export and import.
- Home page: the About block at the bottom was removed (the About page remains). The MARGA brand in the header is larger and highlighted.
- Reminder: lessons, capstones, hints and per-option reasons were written from memory. Spot-check commands and numbers. External links, the live counter and the Go Playground are not machine-verified.

## Round 9 additions
- Lessons: 141 (two new lessons per stage, 24 in all, placed before each stage's debugging lesson, which stays last). Refs and levels text were added for each.
- Animated explainers: 152 (48 new, four per stage, covering the new lessons and earlier gaps).
- Incident games (`#/games`): 12 branching on-call scenarios, one per stage, in `src/games/<module>.md`. Each choice is scored 0 to 2 with feedback; endings are win, ok or fail; results are stored in the `gm` bag (kept on import).
- Reading lists (`#/reading` and each module page): six resources per stage in `src/content/reading.json`. URLs were written from memory and hosts are checked against the allow list in `tools/validate.js`; open them to confirm they still resolve.
- Open content license page (`#/license`, footer link, `LICENSE.md`): learning content under CC BY 4.0 with the credit line "MARGA by EknathaLabs", site code under the MIT License. Confirm these licence choices are the ones you want before publishing.
- Reminder: all new lessons, scenarios, explainers and reading entries were written from memory. Spot-check commands, numbers and links. The live counter, external links and the Go Playground are not machine-verified.

## Round 10 additions
- Two new stages: Ansible and configuration management (`ansible`, requires Bash) and Databases for operators (`databases`, requires Networking). 17 new lessons (8 and 9), each with a predict, a clickable diagram, an incident, 4 quiz questions and 5 flashcards; the debugging lesson is last in each. They also have interview questions, drills, glossary terms, an incident game, 5 animated explainers each, a cheat sheet, reading lists and refs. Existing case studies were tagged with the new stages where relevant.
- Skill tree: Ansible is in the DevOps, SRE and DevSecOps paths (after Terraform); Databases is in all four live paths (after Cloud in three of them). Prerequisites are in `src/content/modules.json`; path order is in `src/content/paths.json`.
- Architecture walkthroughs (`#/walkthroughs`, practice hub): six reference designs in `src/walkthroughs/*.md` (payments, video streaming, chat, read-heavy web app, multi-region platform, telemetry platform). Each has a clickable component diagram, a request flow, scaling decisions, a failure table, trade-offs, a predict question and links to lessons. They are teaching designs and say so; they are not descriptions of any real company's systems.
- Badges (`#/badges`, `#/badge/<id>`, `#/badge-check`, footer link, practice hub): one badge per stage (14) and per path (4), earned when every lesson check is passed. Wording is "Completed the MARGA ... stage", never "certified". The name is optional, asked once when the first badge is earned, editable and deletable with one button. It is stored in the `bd` bag of the progress object (so it is in export and import) and is never sent anywhere. Each badge shows the name, stage or path, date, MARGA by EknathaLabs, a badge id, a verification code and the lessons covered. Download as PNG or PDF is generated in the browser, with a caution message beside the buttons and printed on the file. Light and dark variants, circle (stage) or hexagon (path) shapes plus a distinct symbol per badge, and a reveal animation that is off for reduced motion.
- Verification code: a short code from the name, badge id and date (`MG-XXXX-XXXX`). The method is public, so it only shows that the details on a picture agree with each other. It cannot prove identity. The Check a badge page says so.
- Reminder: the new lessons, drills, walkthroughs and reading entries were written from memory. Spot-check commands, numbers and links. External links, the live counter and the Go Playground are not machine-verified. Confirm the licence choices (CC BY 4.0 for content, MIT for code). The About page says no personal data is collected; a cookie-free visitor counter exists, and badge names stay in the browser only.

## Round 11 additions: terminal labs
- Terminal labs (`#/terminal-labs`, `#/terminal-lab/<id>`): 24 break-and-fix labs, 6 each for Linux, Shell, Networking and Python, in a simulated terminal in the browser. Lab sources are in `src/termlabs/<stage>.md` (format described at the top of `tools/termlabs.js`). Each lab has a story, goals, 3 or more hints shown one at a time, automatic checks, a solution and an explanation. Completion is stored in the `tl` bag of the progress object (included in export and import).
- The terminal is a program written for MARGA (`src/app/term-*.js`), not a real Linux system. It has a virtual file system with users and permissions, a shell language (pipes, redirects, here-documents, functions, arrays, arithmetic, `set -euo pipefail`, `trap EXIT`), and these commands: . : [ alias awk basename bash bg break cat cd chgrp chmod chown clear cmp command continue cp cron-tick crontab curl cut date declare df diff dig dirname disown du echo edit egrep env eval exec exit export expr false fg fgrep find free from gawk getent grep groupadd groups hash head help history host hostname id ifconfig ip journalctl jq kill killall let ln local ls lsof mawk mkdir mv nano nc ncat netstat nl nohup nproc nslookup paste pgrep ping pkill printenv printf ps pwd python python3 read readlink readonly realpath return rev rm rmdir sed seq service set sh shift sleep sort source ss stat sudo systemctl tac tail tee test top touch tr tracepath traceroute trap true truncate type typeset ufw ulimit umask unalias uname uniq unset uptime useradd usermod vi vim wait wc wget which whoami xargs yes. Python labs run real Python in the browser (Pyodide, loaded from the CDN the first time, about 10 MB); the other labs work offline once the page has been cached.
- Limits, stated on every lab page: a simulation, not a real kernel, network or Docker; output of real tools can differ in the details. Known gaps: pipeline stages run one after another, not at the same time; awk `for (k in a)` order is not real awk order; no sed N or D; no jq reduce or foreach; `ip` and `ss` print simplified output; group changes apply at once; sorting follows the C locale; an endless Python loop freezes the tab (reload to recover). The commands `from MACHINE curl ...` and `cron-tick` exist only in the simulator.
- A real Linux in the browser (for example a WebAssembly virtual machine) was NOT built. It needs a download of tens of megabytes, a third-party engine with its own licence and CDN terms, and could not be verified in the build sandbox. It can be added later.
- The engine files load only when a lab is opened (not on other pages) and are in the offline cache list. `tools/build.js` has them in the ENGINE list.
- Verification tools: `node tools/terminal-verify.js` proves for all 72 labs that the starting state does not pass every check and that the written solution passes all of them (Python labs use the local python3). `node tools/term-diff.js` compares the simulated shell with real bash on 341 commands (needs bash and python3 on the build machine; awk is mawk or gawk). The e2e suite types every solution into the real terminal in a browser, including the Python labs on real Pyodide, and checks a phone viewport and accessibility.
- Reminder: the labs and the simulator were written from memory and tested against the checks above, not by a domain reviewer. Real servers behave in more ways than the simulation does. Spot-check the lab explanations. The Pyodide download, external links, the live counter and the Go Playground are not machine-verified from the build sandbox.

## Round 12 additions
- Home page: the line "Free. No login. No payment. Just practice and learn." under the headline, and "No account needed. Start now." under the main button. The footer promise reads "Free · No login · No ads · No cookies".
- Architecture walkthroughs: 16 (10 new, `src/walkthroughs/07` to `16`).
- Incident games: 38. The 24 new games explain every choice and give a worked example (feedback written as "explanation. Example: ..."). The 14 older games now have worked examples too (all 38 games, every choice).
- Terminal labs: 72 (18 per stage, 6 more added in Round 13). Two small engine fixes came with them: `read` now keeps the rest of the line for the last variable, and `ufw allow|delete PORT/proto` parses a bare port. `node tools/term-diff.js` still matches real bash on 341 commands.
- Animated explainers: 202, with at least 12 per module (Ansible and Databases were the thinnest and received the most).
- Validator minimums raised: 16 walkthroughs, 12 labs per stage, 200 explainers and 12 per module.
- Content was written from memory. Spot-check commands, figures and examples before relying on them.

## Round 13 additions
- Home page: the hero demo rotates by itself through four scenes (terminal lab, incident game, animated explainer, architecture walkthrough). Tabs, arrow keys and a Pause/Play button control it; it stays still with reduced motion. The line "Free. No login. No payment. ..." sits under the headline in the left column, with the demo in the right column. On a wide desktop it is beside the demo, not strictly above it; on mobile it is above.
- The 14 older incident games now give a worked example on every choice.
- Terminal labs: 72 (18 per stage). Engine fixes: `ln -f/-n`, separate `readlink` and `realpath`, `"${!arr[@]}"` splitting, `systemctl enable|disable --now`, `read` rest-of-line, `ufw` bare port.
- Lessons: 186 (28 new, 2 per module). Each has a worked example, quiz, flashcards, level texts and 2 official references.
- Assumptions: +6 labs per stage and +2 lessons per module were chosen without asking.
- Content was written from memory. Spot-check commands, figures and links before relying on them.
