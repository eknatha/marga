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

## Round 15 additions

- New skills: **Go for DevOps engineers** (10 lessons, no prerequisites, placed after Python in all four paths) and **Helm for beginners** (8 lessons, requires Kubernetes, placed after Kubernetes). Each has a cheat sheet, interview answers, drills, glossary terms, 6 reading items, tagged case studies and badges.
- Incident games: 3 for Go and 2 for Helm. Every game answer now shows an **Explanation.** paragraph followed by an **Example.** paragraph.
- Linux for engineers: 5 new kernel lessons (modules and sysctl, memory and the OOM killer, system calls with strace and perf, filesystems and the page cache, kernel networking and conntrack). The debugging lesson stays last.
- 47 new animated explainers covering Go, Helm, the Linux kernel and every other skill.
- A Certifications icon in the top navigation links to https://certs.eknathalabs.com (new tab).
- Rule change: the ban on the word "git" was narrowed to hosting and brand words (`/\bgit(hub|lab|ops|leaks|ea)/i`), so the Git skill can name the tool.
- Go and Helm have no terminal labs (Go has the existing playground exercises).
