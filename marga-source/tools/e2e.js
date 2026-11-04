#!/usr/bin/env node
/*
 * End-to-end tests (Playwright + axe-core) against the built site in dist/.
 *   node tools/build.js && node tools/e2e.js
 * Starts its own static server. Exits 1 if any test fails.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright');

const DIST = process.env.DIST ? path.resolve(process.env.DIST) : path.resolve(__dirname, '../dist');
const SHOTS = process.env.SHOTS || '';
const EXPL_IDS = (() => { const w = { window: {} }; require('vm').runInNewContext(fs.readFileSync(path.resolve(__dirname, '../dist/assets/explainers.js'), 'utf8'), w); return w.window.MARGA_EXPLAINERS.map((x) => x.id); })();
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.wasm': 'application/wasm', '.webmanifest': 'application/manifest+json' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(DIST, p);
      if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(path.join(DIST, '404.html')));
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
      res.end(fs.readFileSync(f));
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

const results = [];
let current = '';
let TESTN = 0;
async function test(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return;
  if (process.env.SKIP && process.env.SKIP.split('|').some((x) => name.includes(x))) return;
  if (process.env.SHARD) { const [a, n] = process.env.SHARD.split('/').map(Number); if ((TESTN++) % n !== a) return; }
  current = name;
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`PASS  ${name} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push({ name, ok: false, err: e });
    console.log(`FAIL  ${name}\n      ${String(e.message || e).split('\n').join('\n      ')}`);
  }
}
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || 'expected equal'}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); }
function ok(c, msg) { if (!c) throw new Error(msg || 'assertion failed'); }

/* The tests themselves live in tools/e2e/*.part.js, in order. Each part is a slice of one async function, so they share helpers and variables.
   The parts are joined and run here, which keeps ONLY, SKIP and SHARD working exactly as before. */
const PARTS = fs.readdirSync(path.join(__dirname, 'e2e')).filter((n) => n.endsWith('.part.js')).sort();
const OPEN = '(async () => {\n  const srv = await serve();\n  const BASE = `http://127.0.0.1:${srv.address().port}`;\n  const browser = await chromium.launch();\n\n';
const CLOSE = '  await browser.close();\n  srv.close();\n\n  const failed = results.filter((r) => !r.ok);\n  console.log(`\\n${results.length - failed.length} of ${results.length} tests passed`);\n  process.exit(failed.length ? 1 : 0);\n})().catch((e) => { console.error(e); process.exit(2); });\n\n';
const SOURCE = OPEN + PARTS.map((n) => fs.readFileSync(path.join(__dirname, 'e2e', n), 'utf8')).join('\n') + CLOSE;
// eslint-disable-next-line no-eval
eval(SOURCE);
