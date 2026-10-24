# MARGA by EknathaLabs

Static site. No server code, no runtime fetching.

## Deploy
1. Upload the contents of `dist/` to any static host (GitHub Pages, Netlify, Cloudflare Pages, S3 + CDN).
2. `dist/CNAME` already contains `marga.eknathalabs.com`.
3. DNS: create a `CNAME` record `marga` pointing to your host's target (for example `<user>.github.io`). Remove the old `learn` and `academy` records or redirect it with a 301 to `marga`.
4. Enable HTTPS on the host. Submit `https://marga.eknathalabs.com/sitemap.xml` to search consoles.

## Develop
    npm install
    npm run build      # src/ -> dist/
    npm run validate   # schema, graph, code syntax, links, forbidden strings
    npm run e2e        # browser tests (needs Playwright's Chromium)

Content: `src/content/<module>/NN-slug.md` (frontmatter, then prose, a `quiz` block and a `cards` block).
Cheat sheets: `src/cheatsheets/<id>.md`. Modules and prerequisites: `src/content/modules.json`. Paths: `src/content/paths.json`.

## Known limits
- Lesson gating and progress are client-side (localStorage). Content is readable in page source; gating guides learners, it is not access control.
- Progress is per browser; use Export/Import on the Progress page to move devices.
- Hands-on labs are planned and not implemented.

## Visitor count
The footer shows a total visitor count from GoatCounter (free, no cookies). One-time setup:
1. Create a site at goatcounter.com with the code `marga-eknathalabs` (or set `MARGA_COUNTER=yourcode` when building; `MARGA_COUNTER=` disables it).
2. In the site's Settings, enable "Allow adding visitor counts on your website".
Until that is done, or when offline, the count stays hidden. Visits from localhost are not recorded.

## Visitor count (GoatCounter, free, no cookies)
1. Create a site at goatcounter.com with the code `marga-eknathalabs` (or choose another and build with `MARGA_COUNTER=yourcode npm run build`).
2. In its settings, enable "Allow adding visitor counts on the website" so the public total can be read.
3. The footer shows the total once the counter responds. If the counter is unreachable or not set up, nothing is shown. Visits from localhost are never counted. Set `MARGA_COUNTER=` (empty) to remove the counter.
