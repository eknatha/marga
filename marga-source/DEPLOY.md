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
- Footer promise: Free forever, No login, No ads, No cookies.

## Known limits
- Gating and progress are client-side (localStorage). Content is readable in page source.
- Progress is per browser; use Export and Import on the Progress page to move devices.
- Official reference links were written from known documentation structure and could not be checked live from the build environment. Spot-check them and fix any that moved.
- Cloud CLI commands in lessons were checked for syntax only, not run against real accounts.
- Hands-on labs are planned and not implemented.

## Visitor count (GoatCounter, free, no cookies)
1. Create a site at goatcounter.com with the code `marga-eknathalabs` (or build with `MARGA_COUNTER=yourcode`; `MARGA_COUNTER=` disables it).
2. In its settings, enable "Allow adding visitor counts on the website".
The footer shows the total once the counter responds; otherwise nothing is shown.
