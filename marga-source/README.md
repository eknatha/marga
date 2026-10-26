# MARGA by EknathaLabs

Role-based DevOps, cloud and SRE training: 11 modules, 93 lessons with quizzes and flashcards, 14 printable cheat sheets, InterviewHub, spoken voice, and watermarked print or PDF. Static site, works offline, progress stays in the browser. Free forever, no login, no ads, no cookies.

Live: https://marga.eknathalabs.com

    npm ci
    npm run build      # src/ -> dist/
    npm run validate   # content, graph, code syntax, links
    npm run e2e        # browser tests (npx playwright install chromium first)

See DEPLOY.md for hosting, DNS and the visitor counter.

## Terminal labs
24 break-and-fix labs (Linux, Shell, Networking, Python) run in a simulated terminal in the browser. Sources: `src/termlabs/*.md`; engine: `src/app/term-*.js`; UI: `src/app/termlabs-ui.js`. It is a simulation, not a real server. Verify with `node tools/terminal-verify.js` and `node tools/term-diff.js`. See DEPLOY.md, Round 11.
