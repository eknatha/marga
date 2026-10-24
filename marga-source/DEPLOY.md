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
- Animated explainers (`src/app/explainers.js`, 7): DNS, TCP, TLS, pod scheduling, rolling update, Terraform, a pipeline. Play, step, slider, speed, read aloud.
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
