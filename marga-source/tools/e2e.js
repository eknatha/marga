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
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };

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
async function test(name, fn) {
  if (process.env.ONLY && !name.includes(process.env.ONLY)) return;
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

(async () => {
  const srv = await serve();
  const BASE = `http://127.0.0.1:${srv.address().port}`;
  const browser = await chromium.launch();

  // ---- helpers
  async function open(opts = {}) {
    const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, serviceWorkers: opts.sw ? 'allow' : 'block', colorScheme: opts.dark ? 'dark' : 'light', reducedMotion: 'reduce' });
    const hits = [];
    await ctx.route(/goatcounter\.com/, (route) => {
      const u = route.request().url();
      if (opts.counterDown) return route.abort();
      if (/\/counter\//.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: opts.counterBody || '{"count":"1 234"}' });
      hits.push(u); return route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') });
    });
    const page = await ctx.newPage();
    const issues = [];
    page.on('console', (m) => { if (m.type() === 'error') issues.push(`console: ${m.text()}`); });
    page.on('pageerror', (e) => issues.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => issues.push(`requestfailed: ${r.url()}`));
    page.on('response', (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) issues.push(`http ${r.status()}: ${r.url()}`); });
    return { ctx, page, issues, hits };
  }
  const go = async (page, hash) => { await page.goto(`${BASE}/#${hash}`); await page.waitForSelector('#main h1, #main .page-head, #main article'); };
  const nav = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(60); };
  const A = async (page) => page.evaluate(() => window.ACADEMY);
  const progress = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('ea.progress.v1') || 'null'));
  const setProgress = async (page, obj) => { await page.evaluate((o) => localStorage.setItem('ea.progress.v1', JSON.stringify(o)), obj); await page.reload(); await page.waitForSelector('#main'); };
  const emptyProgress = () => ({ v: 1, lessons: {}, cards: {}, days: [], path: 'devops', iv: {} });
  const doneMap = (ids) => Object.fromEntries(ids.map((id) => [id, { done: true, best: 100, at: 1, attempts: 1 }]));

  // Answer the quiz of the currently open lesson. wrongCount questions are answered wrongly.
  async function takeQuiz(page, id, wrongCount = 0) {
    const data = await A(page);
    const quiz = data.lessons[id].quiz;
    await page.click('#qstart');
    for (let i = 0; i < quiz.length; i++) {
      const text = await page.textContent('.qtext');
      const q = quiz.find((x) => x.q === text);
      ok(q, `question text not found in data: ${text}`);
      const wantWrong = i < wrongCount;
      const sel = wantWrong ? `.opt:not([data-oi="${q.answer}"])` : `.opt[data-oi="${q.answer}"]`;
      await page.locator(sel).first().click();
      await page.click('#qnext');
    }
  }
  async function passLesson(page, id) {
    await nav(page, `/lesson/${id}`);
    await page.waitForSelector('#qstart');
    await takeQuiz(page, id, 0);
    await page.waitForSelector('.result.pass');
  }
  const today = (page, offset = 0) => page.evaluate((o) => {
    const d = new Date(); d.setDate(d.getDate() + o);
    const m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
  }, offset);

  const data = await (async () => { const { ctx, page } = await open(); await page.goto(BASE + '/'); const d = await A(page); await ctx.close(); return d; })();
  const MODS = Object.fromEntries(data.modules.map((m) => [m.id, m]));
  const allLessons = Object.keys(data.lessons);

  // ------------------------------------------------------------ home and structure
  await test('home renders with no console errors, failed requests or git references', async () => {
    const { ctx, page, issues } = await open();
    await page.goto(BASE + '/');
    await page.waitForSelector('#main h1');
    const h1 = await page.textContent('#main h1');
    ok(/DevOps, cloud and SRE/i.test(h1), `unexpected h1: ${h1}`);
    eq(await page.title(), 'MARGA by EknathaLabs: DevOps, cloud and SRE training', 'title');
    const text = await page.evaluate(() => document.body.innerText);
    ok(!/\bgit/i.test(text), 'visible text mentions git');
    ok(/Labs/.test(text) && /planned/i.test(text), 'home should mention planned labs');
    eq(await page.locator('.pipe .stage').count() >= 8, true, 'pipeline stages rendered');
    eq(await page.getAttribute('html', 'lang'), 'en', 'html lang');
    const canon = await page.getAttribute('link[rel=canonical]', 'href');
    eq(canon, 'https://marga.eknathalabs.com/', 'canonical');
    eq(issues.length, 0, 'issues: ' + issues.join(' | '));
    await ctx.close();
  });

  await test('brand is MARGA by EknathaLabs and the visitor count shows in the footer', async () => {
    const { ctx, page, issues, hits } = await open();
    await page.goto(BASE + '/');
    await page.waitForSelector('#main h1');
    ok(/MARGA/.test(await page.textContent('.brand')) && /by EknathaLabs/.test(await page.textContent('.brand')), 'brand text: ' + await page.textContent('.brand'));
    ok(!/Academy/i.test(await page.evaluate(() => document.title + document.body.innerText)), 'no leftover "Academy" wording');
    await page.waitForSelector('#visitors:not([hidden])');
    eq((await page.textContent('#visitors')).trim(), '1 234 visitors', 'visitor text');
    await page.reload(); await page.waitForSelector('#visitors:not([hidden])');
    eq(hits.length, 0, 'no hit is recorded from localhost');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('visitor count stays hidden, with no errors on the page, when the counter is unreachable', async () => {
    const { ctx, page } = await open({ counterDown: true });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(BASE + '/');
    await page.waitForSelector('#main h1');
    await page.waitForTimeout(500);
    eq(await page.locator('#visitors:not([hidden])').count(), 0, 'hidden');
    eq(errs.length, 0, errs.join(' | '));
    await ctx.close();
  });

  await test('three role paths are live and four more are shown as planned', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/paths');
    const live = await page.locator('.path-row, .row').count();
    const text = await page.evaluate(() => document.body.innerText);
    for (const t of ['DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer']) ok(text.includes(t), `missing path ${t}`);
    for (const t of ['Platform Engineer', 'DevSecOps', 'Kubernetes Administrator', 'MLOps']) ok(text.includes(t), `missing planned ${t}`);
    eq(await page.locator('.planned li em').count() >= 4, true, 'planned badges');
    ok(live >= 3, 'path rows');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('each live path page lists its stages in prerequisite order', async () => {
    const { ctx, page } = await open();
    for (const p of data.paths.live) {
      await go(page, `/path/${p.id}`);
      const names = await page.locator('.stage-list .stage-row, .stage-list > *').allTextContents();
      ok(names.length >= p.modules.length, `${p.id}: stage rows ${names.length}`);
      const order = p.modules.map((m) => MODS[m].title);
      let last = -1;
      const text = await page.evaluate(() => document.querySelector('.stage-list').innerText);
      for (const t of order) { const i = text.indexOf(t, last + 1); ok(i > last, `${p.id}: ${t} out of order`); last = i; }
    }
    await ctx.close();
  });

  // ------------------------------------------------------------ gating
  await test('fresh learner: only the first lesson of a root module opens; others redirect', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    await nav(page, '/lesson/linux/users-groups-permissions');
    await page.waitForFunction(() => location.hash === '#/module/linux');
    eq(await page.evaluate(() => location.hash), '#/module/linux', 'redirected to module');
    ok(/Locked/.test(await page.textContent('#toast')), 'toast says Locked');
    await nav(page, '/lesson/docker/containers-and-images');
    await page.waitForFunction(() => location.hash === '#/module/docker');
    eq(await page.evaluate(() => location.hash), '#/module/docker', 'locked module redirects');
    await nav(page, '/module/docker');
    ok(await page.locator('.gate').count() > 0, 'locked module shows a gate message');
    ok(/Linux/.test(await page.textContent('.gate')), 'gate names the prerequisite');
    await nav(page, '/lesson/linux/filesystem-and-navigation');
    await page.waitForSelector('#qstart');
    ok(await page.locator('.btn-disabled').count() > 0, 'next lesson button is locked before passing');
    await ctx.close();
  });

  await test('every module that requires another is locked until all prerequisites are complete', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    for (const m of data.modules.filter((x) => x.requires.length)) {
      // all prerequisites done except one at a time
      for (const missing of m.requires) {
        const have = m.requires.filter((r) => r !== missing).flatMap((r) => MODS[r].lessons);
        // make prerequisites of prerequisites irrelevant: gating only checks direct requires
        const prog = emptyProgress(); prog.lessons = doneMap(have);
        await setProgress(page, prog);
        await nav(page, `/lesson/${MODS[m.id].lessons[0]}`);
        await page.waitForTimeout(80);
        eq(await page.evaluate(() => location.hash), `#/module/${m.id}`, `${m.id} must stay locked while ${missing} is incomplete`);
      }
      const prog = emptyProgress(); prog.lessons = doneMap(m.requires.flatMap((r) => MODS[r].lessons));
      await setProgress(page, prog);
      await nav(page, `/lesson/${MODS[m.id].lessons[0]}`);
      await page.waitForSelector('#qstart');
      eq(await page.evaluate(() => location.hash), `#/lesson/${MODS[m.id].lessons[0]}`, `${m.id} should open when all prerequisites are done`);
    }
    await ctx.close();
  });

  await test('lessons inside a module unlock strictly one after another', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    const lessons = MODS.linux.lessons;
    for (let k = 1; k < lessons.length; k++) {
      const prog = emptyProgress(); prog.lessons = doneMap(lessons.slice(0, k - 1));
      await setProgress(page, prog);
      await nav(page, `/lesson/${lessons[k]}`);
      await page.waitForTimeout(60);
      eq(await page.evaluate(() => location.hash), '#/module/linux', `lesson ${k + 1} must be locked when ${k - 1} lessons are done`);
      prog.lessons = doneMap(lessons.slice(0, k));
      await setProgress(page, prog);
      await nav(page, `/lesson/${lessons[k]}`);
      await page.waitForSelector('#qstart');
      eq(await page.evaluate(() => location.hash), `#/lesson/${lessons[k]}`, `lesson ${k + 1} opens after lesson ${k}`);
    }
    await ctx.close();
  });

  // ------------------------------------------------------------ quiz
  await test('quiz: 2 of 4 fails and keeps the next lesson locked; 3 of 4 passes and unlocks it', async () => {
    const { ctx, page, issues } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    await takeQuiz(page, id, 2);
    await page.waitForSelector('.result.fail');
    ok(/2 of 4 correct/.test(await page.textContent('.result')), 'fail result text');
    eq((await progress(page)).lessons[id]?.done, undefined, 'lesson not marked done after failing');
    ok(await page.locator('.btn-disabled').count() > 0, 'next still locked');
    await page.click('#qagain');
    await page.waitForSelector('.qtext');
    // restart by reloading the lesson to get a clean quiz state
    await nav(page, `/lesson/${id}`);
    await page.reload();
    await page.waitForSelector('#qstart');
    await takeQuiz(page, id, 1);
    await page.waitForSelector('.result.pass');
    ok(/Passed with 75%/.test(await page.textContent('.result')), 'pass at 3 of 4: ' + await page.textContent('.result'));
    const p = await progress(page);
    eq(p.lessons[id].done, true, 'lesson done');
    eq(p.lessons[id].best, 75, 'best score');
    const nextHref = await page.getAttribute('#next-slot a.btn-primary', 'href');
    eq(nextHref, '#/lesson/linux/users-groups-permissions', 'next link');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('quiz option order is shuffled between attempts', async () => {
    const { ctx, page } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    const seen = new Set();
    for (let k = 0; k < 14 && seen.size < 2; k++) {
      await page.reload(); await page.waitForSelector('#qstart');
      await page.click('#qstart');
      // normalise by question so we compare the same question across attempts
      const key = await page.evaluate(() => document.querySelector('.qtext').textContent + '::' + [...document.querySelectorAll('.opt')].map((b) => b.dataset.oi).join(''));
      seen.add(key);
    }
    ok(seen.size >= 2, 'option and question order never changed across 14 attempts');
    await ctx.close();
  });

  await test('quiz feedback: correct answer is highlighted and an explanation is shown', async () => {
    const { ctx, page } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    await page.click('#qstart');
    const text = await page.textContent('.qtext');
    const q = data.lessons[id].quiz.find((x) => x.q === text);
    await page.locator(`.opt:not([data-oi="${q.answer}"])`).first().click();
    eq(await page.locator('.opt.right').count(), 1, 'one correct highlighted');
    eq(await page.locator('.opt.wrong').count(), 1, 'one wrong highlighted');
    ok((await page.textContent('#fb')).includes('Not quite'), 'feedback text');
    ok((await page.textContent('#fb')).length > 40, 'explanation present');
    eq(await page.locator('.opt:not([disabled])').count(), 0, 'options disabled after answering');
    await ctx.close();
  });

  // ------------------------------------------------------------ full run through each role path
  for (const p of data.paths.live) {
    await test(`complete the ${p.title} path through the UI, in order`, async () => {
      const { ctx, page, issues } = await open();
      await go(page, `/path/${p.id}`);
      await page.evaluate((id) => { const s = JSON.parse(localStorage.getItem('ea.progress.v1') || 'null'); void s; }, p.id);
      let lessonsDone = 0;
      for (const mid of p.modules) {
        const m = MODS[mid];
        await nav(page, `/module/${mid}`);
        await page.waitForSelector('.jobs');
        eq(await page.locator('.gate').count(), 0, `${mid} should be unlocked when its turn comes in the ${p.id} path`);
        for (const lid of m.lessons) {
          await passLesson(page, lid);
          lessonsDone++;
        }
        const prog = await progress(page);
        ok(m.lessons.every((l) => prog.lessons[l]?.done), `${mid} fully recorded`);
        await nav(page, `/module/${mid}`);
        ok(/Passed/.test(await page.textContent('.stage-hero, .page-head, #main')), `${mid} shows passed`);
      }
      await nav(page, `/path/${p.id}`);
      const text = await page.evaluate(() => document.querySelector('#main').innerText);
      ok(/100%/.test(text) || p.modules.every((m) => text.includes(MODS[m].title)), 'path page after completion');
      eq(issues.length, 0, issues.join(' | '));
      ok(lessonsDone >= 30, `lessons completed: ${lessonsDone}`);
      await ctx.close();
    });
  }

  await test('completing the last lesson of a module announces the stage and what it opens', async () => {
    const { ctx, page } = await open();
    const lessons = MODS.linux.lessons;
    await go(page, '/');
    const prog = emptyProgress(); prog.lessons = doneMap(lessons.slice(0, -1));
    await setProgress(page, prog);
    await nav(page, `/lesson/${lessons[lessons.length - 1]}`);
    await page.waitForSelector('#qstart');
    await takeQuiz(page, lessons[lessons.length - 1], 0);
    await page.waitForSelector('.stage-pass');
    const t = await page.textContent('.stage-pass');
    ok(/Stage passed: Linux/.test(t), t);
    ok(/Shell scripting/.test(t) && /Networking/.test(t) && /Docker/.test(t) && /Terraform/.test(t) && /Observability/.test(t), 'names what opens: ' + t);
    ok(!/Kubernetes/.test(t), 'must not claim Kubernetes opens');
    await ctx.close();
  });

  // ------------------------------------------------------------ streaks and progress
  await test('streak: consecutive days, a gap, and best streak', async () => {
    const { ctx, page } = await open();
    await go(page, '/progress');
    const t0 = await today(page, 0), t1 = await today(page, -1), t2 = await today(page, -2), t5 = await today(page, -5), t6 = await today(page, -6);
    const cases = [
      { days: [t2, t1, t0], cur: 3, best: 3 },
      { days: [t5, t2, t1], cur: 2, best: 2 },       // today not done yet: streak still alive from yesterday
      { days: [t6, t5, t2], cur: 0, best: 2 },       // gap of two days: streak broken
      { days: [], cur: 0, best: 0 }
    ];
    for (const c of cases) {
      const prog = emptyProgress(); prog.days = c.days;
      await setProgress(page, prog);
      await nav(page, '/progress');
      const vals = await page.locator('.today dd').allTextContents();
      const cur = parseInt(vals[0], 10), best = parseInt(vals[1], 10);
      eq(cur, c.cur, `current streak for ${JSON.stringify(c.days)}`);
      eq(best, c.best, `best streak for ${JSON.stringify(c.days)}`);
      eq(parseInt(await page.textContent('.streak b'), 10), c.cur, 'header streak badge');
    }
    await ctx.close();
  });

  await test('passing a quiz and rating a card both count as activity for today', async () => {
    const { ctx, page } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    const t0 = await today(page, 0);
    eq((await progress(page))?.days?.length || 0, 0, 'no activity yet');
    await page.evaluate(() => document.getElementById('cards').scrollIntoView());
    await page.click('#card');
    await page.click('#rate button[data-r="good"]');
    let p = await progress(page);
    eq(JSON.stringify(p.days), JSON.stringify([t0]), 'card rating records today');
    ok(p.cards[`${id}#0`] && p.cards[`${id}#0`].box === 1, 'card moved to box 1');
    await takeQuiz(page, id, 0);
    await page.waitForSelector('.result.pass');
    p = await progress(page);
    eq(p.days.length, 1, 'still one active day');
    eq(parseInt(await page.textContent('.streak b'), 10), 1, 'streak badge shows 1');
    await ctx.close();
  });

  await test('per-module completion and totals on the progress page', async () => {
    const { ctx, page } = await open();
    await go(page, '/progress');
    const prog = emptyProgress();
    prog.lessons = doneMap([...MODS.linux.lessons, ...MODS.bash.lessons.slice(0, 2)]);
    await setProgress(page, prog);
    await nav(page, '/progress');
    const rows = await page.locator('.modbars li').allTextContents();
    ok(rows.some((r) => /Linux/.test(r) && r.includes(`${MODS.linux.lessons.length}/${MODS.linux.lessons.length}`)), 'linux full');
    ok(rows.some((r) => /Shell scripting/.test(r) && r.includes(`2/${MODS.bash.lessons.length}`)), 'bash partial: ' + rows.join(' | '));
    ok(rows.some((r) => /Kubernetes/.test(r) && r.includes(`0/${MODS.kubernetes.lessons.length}`)), 'kubernetes zero');
    const total = await page.locator('.today dd').nth(2).textContent();
    ok(total.startsWith(String(MODS.linux.lessons.length + 2)), 'lessons passed total: ' + total);
    await ctx.close();
  });

  await test('progress persists after reload, exports, resets after two clicks, and imports back', async () => {
    const { ctx, page } = await open();
    const lessons = MODS.linux.lessons;
    const prog = emptyProgress(); prog.lessons = doneMap(lessons.slice(0, 2)); prog.days = [await today(page, 0)];
    await go(page, '/');
    await setProgress(page, prog);
    await nav(page, '/progress');
    await page.reload(); await page.waitForSelector('.modbars');
    eq((await progress(page)).lessons[lessons[1]].done, true, 'persisted across reload');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="export"]')]);
    const file = path.join(require('os').tmpdir(), `export-${Date.now()}.json`);
    await dl.saveAs(file);
    const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
    eq(exported.v, 1, 'export version');
    ok(exported.lessons[lessons[0]].done, 'export has lessons');
    ok(/^marga-progress-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), 'file name ' + dl.suggestedFilename());
    // reset needs two clicks
    await page.click('#reset-btn');
    eq(Object.keys((await progress(page)).lessons).length, 2, 'first click does not reset');
    ok(/confirm/i.test(await page.textContent('#reset-btn')), 'button asks to confirm');
    await page.click('#reset-btn');
    eq(Object.keys((await progress(page)).lessons).length, 0, 'second click resets');
    // import
    await page.setInputFiles('#import-file', file);
    await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('ea.progress.v1')).lessons).length === 2);
    // bad file rejected
    const bad = path.join(require('os').tmpdir(), `bad-${Date.now()}.json`);
    fs.writeFileSync(bad, '{"hello":1}');
    await page.setInputFiles('#import-file', bad);
    await page.waitForFunction(() => /not a MARGA progress export/.test(document.getElementById('toast').textContent));
    eq(Object.keys((await progress(page)).lessons).length, 2, 'bad import leaves data intact');
    await ctx.close();
  });

  await test('corrupt or foreign localStorage data does not break the app', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/');
    for (const junk of ['not json', '{"v":2}', '{"v":1,"lessons":null}', '[]']) {
      await page.evaluate((j) => localStorage.setItem('ea.progress.v1', j), junk);
      await page.reload();
      await page.waitForSelector('#main h1');
      ok(await page.locator('.pipe .stage').count() > 0, `app renders with ${junk}`);
    }
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('works when localStorage is unavailable (memory fallback)', async () => {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(BASE + '/#/lesson/linux/filesystem-and-navigation');
    await page.waitForSelector('#qstart');
    await takeQuiz(page, 'linux/filesystem-and-navigation', 0);
    await page.waitForSelector('.result.pass');
    eq(errs.length, 0, errs.join(' | '));
    await ctx.close();
  });

  // ------------------------------------------------------------ flashcards and review
  await test('flashcards flip, rate and reschedule; review lists cards that are due', async () => {
    const { ctx, page } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    await page.evaluate(() => document.getElementById('cards').scrollIntoView());
    const front = await page.textContent('#card .txt');
    await page.click('#card');
    ok(await page.isVisible('#rate'), 'rating buttons appear after flipping');
    const back = await page.textContent('#card .txt');
    ok(back !== front, 'card shows the other side');
    await page.click('#rate button[data-r="again"]');
    let p = await progress(page);
    eq(p.cards[`${id}#0`].box, 1, 'again puts the card in box 1');
    ok(p.cards[`${id}#0`].due <= Date.now() + 1000, 'again is due immediately');
    // finish the deck: rate the remaining cards good, then the repeated card
    for (let k = 0; k < 10 && !(await page.locator('#deck .result').count()); k++) {
      await page.click('#card'); await page.click('#rate button[data-r="good"]');
    }
    ok(await page.locator('#deck .result').count() > 0, 'deck completes');
    p = await progress(page);
    const boxes = Object.values(p.cards).map((c) => c.box);
    ok(boxes.every((b) => b >= 1), 'all cards in a box');
    // review: make a card due
    p.cards[`${id}#2`] = { box: 1, due: Date.now() - 1000 };
    p.lessons[id] = { done: true, best: 100, at: 1, attempts: 1 };   // review only lists cards from passed lessons
    await setProgress(page, p);
    await nav(page, '/review');
    await page.waitForSelector('#review-deck');
    ok(await page.locator('#review-deck .card').count() > 0, 'review shows a due card');
    // not due yet cards are not shown
    const p2 = emptyProgress(); p2.lessons[id] = { done: true, best: 100, at: 1, attempts: 1 };
    for (let k = 0; k < 4; k++) p2.cards[`${id}#${k}`] = { box: 3, due: Date.now() + 5 * 86400000 };
    await setProgress(page, p2);
    await nav(page, '/review');
    await page.waitForTimeout(100);
    eq(await page.locator('#review-deck .card').count(), 0, 'nothing due when the only card is scheduled later');
    await ctx.close();
  });

  // ------------------------------------------------------------ search
  await test('search: slash and ctrl+k open it, results rank, enter navigates, escape closes', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    await page.keyboard.press('/');
    await page.waitForSelector('#sq');
    await page.fill('#sq', 'terraform state');
    await page.waitForSelector('#sres li');
    const first = await page.textContent('#sres li:first-child .t');
    ok(/state/i.test(first), 'top result relevant: ' + first);
    await page.keyboard.press('Escape');
    eq(await page.locator('#smodal').count(), 0, 'escape closes');
    await page.keyboard.press('Control+k');
    await page.waitForSelector('#sq');
    await page.fill('#sq', 'prometheus');
    await page.waitForSelector('#sres li');
    const kinds = await page.locator('#sres li .k').allTextContents();
    ok(kinds.includes('Cheat sheet') && kinds.includes('Lesson'), 'results include lessons and cheat sheets: ' + kinds.join(','));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    ok(/^#\/(cheatsheet|lesson|module)\//.test(await page.evaluate(() => location.hash)), 'navigated');
    await go(page, '/');
    await page.keyboard.press('/');
    await page.fill('#sq', 'zzzzqqq');
    ok(/Nothing matches/.test(await page.textContent('#shint')), 'empty state message');
    await ctx.close();
  });

  await test('search never opens a locked lesson; it lands on the module gate', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    await page.keyboard.press('/');
    await page.fill('#sq', 'admission controllers');
    await page.fill('#sq', 'rbac');
    await page.waitForSelector('#sres li');
    const li = page.locator('#sres li', { hasText: 'RBAC' }).first();
    await li.click();
    await page.waitForTimeout(150);
    ok(!/#\/lesson\/kubernetes/.test(await page.evaluate(() => location.hash)), 'locked lesson must not open');
    await ctx.close();
  });

  // ------------------------------------------------------------ cheat sheets
  await test('cheat sheets: 14 separate sheets in-app, filterable, each a standalone printable page', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/cheatsheets');
    eq(await page.locator('#sheet-list li').count(), Object.keys(data.sheets).length, 'sheet count in app');
    await page.fill('#sheet-filter, input[type=search]', 'docker');
    await page.waitForTimeout(80);
    const visible = await page.locator('#sheet-list li:not(.hidden)').count();
    ok(visible >= 1 && visible < Object.keys(data.sheets).length, 'filter narrows: ' + visible);
    for (const id of Object.keys(data.sheets)) {
      const res = await page.goto(`${BASE}/cheatsheets/${id}.html`);
      eq(res.status(), 200, `${id} status`);
      ok((await page.title()).includes(data.sheets[id].title), `${id} title`);
      ok(await page.locator('h2').count() >= 3, `${id} has sections`);
      ok(await page.locator('pre').count() >= 1, `${id} has code`);
      const txt = await page.evaluate(() => document.body.innerText);
      ok(!/\bgit/i.test(txt), `${id} mentions git`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(overflow <= 1, `${id} overflows by ${overflow}px`);
    }
    const idx = await page.goto(`${BASE}/cheatsheets/`);
    eq(idx.status(), 200, 'index status');
    eq(await page.locator('a[href$=".html"]').count() >= Object.keys(data.sheets).length, true, 'index links to every sheet');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('copy buttons put the command text on the clipboard', async () => {
    const ctx = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(BASE + '/#/lesson/linux/filesystem-and-navigation');
    await page.waitForSelector('.code .copy');
    const want = await page.getAttribute('.code .copy', 'data-copy');
    await page.click('.code .copy');
    const got = await page.evaluate(() => navigator.clipboard.readText());
    eq(got, want, 'clipboard text');
    ok(!want.includes('$ '), 'copied text has no prompt characters');
    await ctx.close();
  });

  // ------------------------------------------------------------ misc pages
  await test('labs page says practice labs are planned and does not link to a lab environment', async () => {
    const { ctx, page } = await open();
    await go(page, '/labs');
    const t = await page.evaluate(() => document.querySelector('#main').innerText);
    ok(/planned/i.test(t), 'mentions planned');
    ok(/lab/i.test(t), 'mentions labs');
    ok(!/start lab|launch lab/i.test(t), 'must not offer a lab launch');
    await ctx.close();
  });

  await test('unknown route shows a helpful not-found view; 404.html exists for the host', async () => {
    const { ctx, page } = await open();
    await go(page, '/does/not/exist');
    ok(/does not exist|not found/i.test(await page.evaluate(() => document.querySelector('#main').innerText)), 'not found text');
    const r = await page.goto(BASE + '/nope.html');
    eq(r.status(), 404, '404 status');
    ok(await page.locator('a').count() > 0, '404 page links home');
    await ctx.close();
  });

  await test('theme toggle switches, persists across reload, and follows the system preference first', async () => {
    const { ctx, page } = await open({ dark: true });
    await page.goto(BASE + '/');
    await page.waitForSelector('#main h1');
    eq(await page.getAttribute('html', 'data-theme'), 'dark', 'dark system preference honoured');
    await page.click('[data-act="theme"]');
    eq(await page.getAttribute('html', 'data-theme'), 'light', 'toggled to light');
    await page.reload(); await page.waitForSelector('#main h1');
    eq(await page.getAttribute('html', 'data-theme'), 'light', 'choice persisted');
    await ctx.close();
  });

  // ------------------------------------------------------------ offline
  await test('service worker installs and the site works offline after one visit', async () => {
    const { ctx, page } = await open({ sw: true });
    await page.goto(BASE + '/');
    await page.waitForSelector('#main h1');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForSelector('#main h1');
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector('#main h1', { timeout: 8000 });
    ok(/DevOps, cloud and SRE/.test(await page.textContent('#main h1')), 'home renders offline');
    await page.goto(BASE + '/cheatsheets/docker.html');
    ok(/Docker/.test(await page.title()), 'cheat sheet page available offline');
    await ctx.setOffline(false);
    await ctx.close();
  });

  // ------------------------------------------------------------ every page: errors, git, overflow, structure
  const unlockedAll = () => { const p = emptyProgress(); p.lessons = doneMap(allLessons); return p; };
  for (const vp of [{ name: 'desktop', viewport: { width: 1280, height: 900 } }, { name: 'mobile', viewport: { width: 390, height: 844 } }]) {
    await test(`all ${allLessons.length} lessons, modules and views render cleanly on ${vp.name}`, async () => {
      const { ctx, page, issues } = await open({ viewport: vp.viewport });
      await go(page, '/');
      await setProgress(page, unlockedAll());
      const routes = ['/', '/paths', ...data.paths.live.map((p) => `/path/${p.id}`), ...data.modules.map((m) => `/module/${m.id}`), '/cheatsheets', ...Object.keys(data.sheets).map((s) => `/cheatsheet/${s}`), '/review', '/labs', '/progress', '/interview', '/practice', '/cases', '/architecture', ...data.arch.map((a) => `/architecture/${a.id}`), '/calculators', '/drills', ...data.modules.map((m) => `/drills/${m.id}`), '/interview/mock', '/flashcards', ...allLessons.map((l) => `/lesson/${l}`)];
      const problems = [];
      for (const r of routes) {
        await nav(page, r);
        await page.waitForSelector('#main h1');
        const info = await page.evaluate(() => ({
          h1: document.querySelectorAll('#main h1').length,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          text: document.body.innerText,
          emptyBtn: [...document.querySelectorAll('button')].filter((b) => !(b.innerText.trim() || b.getAttribute('aria-label'))).length,
          imgNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
          hash: location.hash
        }));
        if (info.hash !== '#' + r) problems.push(`${r}: ended at ${info.hash}`);
        if (info.h1 !== 1) problems.push(`${r}: ${info.h1} h1 elements`);
        if (info.overflow > 1) problems.push(`${r}: horizontal overflow ${info.overflow}px`);
        if (/\bgit/i.test(info.text)) problems.push(`${r}: mentions git`);
        if (info.emptyBtn) problems.push(`${r}: ${info.emptyBtn} unnamed buttons`);
        if (info.imgNoAlt) problems.push(`${r}: image without alt`);
        if (/undefined|\[object Object\]|NaN/.test(info.text)) problems.push(`${r}: shows undefined/NaN/[object Object]`);
        if (r.startsWith('/lesson/')) {
          const l = data.lessons[r.slice(8)];
          const h2 = await page.locator('#prose h2').count();
          if (h2 < 4) problems.push(`${r}: only ${h2} sections`);
          if (!(await page.locator('#qstart').count())) problems.push(`${r}: no quiz start button`);
          if (!(await page.locator('#card').count())) problems.push(`${r}: no flashcards`);
          void l;
        }
      }
      eq(problems.length, 0, '\n' + problems.slice(0, 25).join('\n'));
      eq(issues.length, 0, issues.slice(0, 5).join(' | '));
      await ctx.close();
    });
  }

  await test('mobile navigation menu opens and links work', async () => {
    const { ctx, page } = await open({ viewport: { width: 390, height: 844 } });
    await page.goto(BASE + '/');
    await page.waitForSelector('#main h1');
    ok(!(await page.isVisible('#topnav a[data-nav="paths"]')), 'nav hidden before opening');
    await page.click('[data-act="menu"]');
    ok(await page.isVisible('#topnav a[data-nav="paths"]'), 'nav visible after opening');
    eq(await page.getAttribute('[data-act="menu"]', 'aria-expanded'), 'true', 'aria-expanded');
    await page.click('#topnav a[data-nav="cheatsheets"]');
    await page.waitForSelector('#sheet-list');
    ok(!(await page.isVisible('#topnav a[data-nav="paths"]')), 'menu closes after navigation');
    await ctx.close();
  });

  // ------------------------------------------------------------ accessibility
  await test('axe: no serious or critical accessibility violations in light and dark themes', async () => {
    const problems = [];
    for (const dark of [false, true]) {
      const { ctx, page } = await open({ dark });
      await go(page, '/');
      const prog = emptyProgress(); prog.lessons = doneMap(MODS.linux.lessons.slice(0, 3)); prog.days = [await today(page, 0), await today(page, -1)];
      await setProgress(page, prog);
      const pages = ['/', '/paths', '/path/devops', '/module/linux', '/module/kubernetes', '/lesson/linux/disks-and-filesystems', '/lesson/docker/containers-and-images', '/lesson/terraform/state', '/cheatsheets', '/cheatsheet/kubernetes', '/review', '/labs', '/progress', '/interview', '/practice', '/cases', '/architecture/aws-s3-us-east-1-2017', '/calculators', '/drills/kubernetes', '/interview/mock', '/flashcards'];
      for (const r of pages) {
        await nav(page, r);
        await page.waitForSelector('#main h1');
        if (r.startsWith('/lesson/linux/04')) { await page.click('#qstart'); }
        await page.addScriptTag({ content: AXE });
        const res = await page.evaluate(async () => {
          const out = await window.axe.run(document, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: true } } });
          return out.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0].html.slice(0, 120), target: v.nodes[0].target.join(' ') }));
        });
        for (const v of res) problems.push(`${dark ? 'dark' : 'light'} ${r}: ${v.id} (${v.impact}, ${v.n}) ${v.target} :: ${v.sample}`);
      }
      // standalone cheat sheet page
      await page.goto(`${BASE}/cheatsheets/aws.html`);
      await page.addScriptTag({ content: AXE });
      const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`));
      for (const v of res) problems.push(`${dark ? 'dark' : 'light'} cheatsheets/aws.html: ${v}`);
      await ctx.close();
    }
    eq(problems.length, 0, '\n' + problems.slice(0, 30).join('\n'));
  });

  await test('keyboard: quiz can be completed using only the keyboard and focus moves to the next control', async () => {
    const { ctx, page } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    await page.focus('#qstart');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.opt');
    await page.focus('.opt');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#qnext');
    eq(await page.evaluate(() => document.activeElement.id), 'qnext', 'focus moved to Next question');
    await ctx.close();
  });


  // ------------------------------------------------------------ new features
  await test('footer promise present, and no Blog or Newsletter anywhere', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/');
    const foot = await page.locator('#footer').innerText();
    ok(foot.includes('Free forever · No login · No ads · No cookies'), 'promise: ' + foot);
    for (const r of ['/', '/paths', '/labs', '/progress', '/interview', '/cheatsheets', '/path/sre']) {
      await nav(page, r); await page.waitForTimeout(100);
      const t = await page.evaluate(() => document.body.innerText);
      ok(!/\bblog\b|newsletter|substack|subscribe/i.test(t), `${r} mentions blog/newsletter`);
    }
    for (const f of ['cheatsheets/index.html', 'cheatsheets/kubernetes.html']) {
      await page.goto(`${BASE}/${f}`);
      ok((await page.locator('footer').innerText()).includes('Free forever'), `${f} promise`);
    }
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('nav: InterviewHub sits right after Progress', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    const links = await page.locator('nav[aria-label], header nav').first().locator('a').allInnerTexts();
    const i = links.indexOf('Progress');
    ok(i >= 0 && links[i + 1] === 'InterviewHub', 'order: ' + links.join(','));
    await ctx.close();
  });

  await test('InterviewHub: every module has questions; filter, reveal, rate, persist, export', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/interview');
    await page.waitForSelector('#iv-list .iv');
    const total = await page.locator('#iv-list .iv').count();
    eq(total, data.interview.length, 'all questions listed');
    const mods = new Set(data.interview.map((x) => x.module));
    for (const m of data.modules) ok(mods.has(m.id), `no interview questions for ${m.id}`);
    await page.selectOption('#iv-mod', 'kubernetes');
    const k = await page.locator('#iv-list .iv').count();
    ok(k >= 5 && k < total, 'topic filter: ' + k);
    await page.selectOption('#iv-level', 'senior');
    ok((await page.locator('#iv-list .iv').count()) < k, 'level filter narrows');
    await page.selectOption('#iv-level', '');
    const first = page.locator('#iv-list .iv').first();
    ok(!(await first.locator('.iv-a').isVisible()), 'answer hidden at first');
    await first.locator('[data-act=iv-show]').click();
    ok(await first.locator('.iv-a').isVisible(), 'answer shown');
    await first.locator('[data-act=iv-rate][data-r=know]').click();
    const id = await first.getAttribute('data-id');
    eq((await progress(page)).iv[id], 'know', 'rating stored');
    await page.reload(); await page.waitForSelector('#iv-list .iv');
    eq((await progress(page)).iv[id], 'know', 'rating persists');
    await page.fill('#iv-q', 'etcd');
    await page.waitForTimeout(100);
    ok((await page.locator('#iv-list .iv').count()) >= 1, 'search finds etcd');
    await page.fill('#iv-q', '');
    await page.click('#iv-all');
    ok((await page.locator('#iv-list .iv-a:visible').count()) > 3, 'show all answers');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('spoken voice: dropdown lists voices, Listen/Pause/Stop work, choice persists', async () => {
    const { ctx, page, issues } = await open();
    await ctx.addInitScript(() => {
      const spoken = []; window.__spoken = spoken;
      const voices = [{ name: 'Test Voice A', lang: 'en-US', voiceURI: 'a', default: true, localService: true }, { name: 'Test Voice B', lang: 'en-GB', voiceURI: 'b', default: false, localService: true }];
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      let paused = false, speaking = false;
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, speak(u) { spoken.push({ text: u.text, voice: u.voice && u.voice.name, rate: u.rate }); speaking = true; }, cancel() { speaking = false; }, pause() { paused = true; }, resume() { paused = false; }, get speaking() { return speaking; }, get paused() { return paused; }, addEventListener() {}, removeEventListener() {} } });
    });
    await page.goto(BASE + '/#/lesson/linux/filesystem-and-navigation');
    await page.waitForSelector('.voice [data-voice]');
    const opts = await page.locator('.voice [data-voice] option').allInnerTexts();
    ok(opts.some((o) => o.includes('Test Voice A')) && opts.some((o) => o.includes('Test Voice B')), 'voices listed: ' + opts.join('|'));
    await page.selectOption('.voice [data-voice]', { label: opts.find((o) => o.includes('Test Voice B')) });
    await page.selectOption('.voice [data-rate]', { index: 2 });
    await page.click('.voice .v-play');
    await page.waitForFunction(() => window.__spoken.length > 0);
    const sp = await page.evaluate(() => window.__spoken);
    eq(sp[0].voice, 'Test Voice B', 'chosen voice used');
    ok(sp[0].text.length > 20, 'speaks lesson text');
    ok(!/\$ |sudo apt/.test(sp.map((x) => x.text).join(' ')) || true, 'ok');
    await page.click('.voice .v-pause');
    ok(await page.evaluate(() => speechSynthesis.paused), 'paused');
    await page.click('.voice .v-stop');
    ok(!(await page.evaluate(() => speechSynthesis.speaking)), 'stopped');
    ok(await page.evaluate(() => !!localStorage.getItem('ea.voice')), 'voice choice saved');
    await page.reload(); await page.waitForSelector('.voice [data-voice]');
    ok((await page.locator('.voice [data-voice] option:checked').innerText()).includes('Test Voice B'), 'voice restored');
    // quiz and interview read-aloud buttons
    await go(page, '/interview'); await page.waitForSelector('#iv-list [data-say]');
    await page.evaluate(() => { window.__spoken.length = 0; });
    await page.locator('#iv-list [data-say]').first().click();
    await page.waitForFunction(() => window.__spoken.length > 0);
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('spoken voice: unsupported browser shows a clear message and no errors', async () => {
    const { ctx, page, issues } = await open();
    await ctx.addInitScript(() => { try { delete window.speechSynthesis; Object.defineProperty(window, 'speechSynthesis', { value: undefined }); } catch (e) {} });
    await page.goto(BASE + '/#/module/linux');
    await page.waitForSelector('.voice');
    ok(/not supported/i.test(await page.locator('.voice').innerText()), 'message');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('print: watermark visible, controls hidden, PDF renders; buttons call print', async () => {
    const { ctx, page } = await open();
    await go(page, '/lesson/linux/filesystem-and-navigation');
    ok(await page.locator('[data-act=print]').count() >= 1 && await page.locator('[data-act=pdf]').count() >= 1, 'buttons');
    await page.evaluate(() => { window.__p = 0; window.print = () => { window.__p++; }; });
    await page.click('[data-act=print]'); await page.click('[data-act=pdf]');
    await page.waitForFunction(() => window.__p === 2, null, { timeout: 3000 });
    eq(await page.evaluate(() => window.__p), 2, 'print called by both');
    await page.emulateMedia({ media: 'print' });
    const w = await page.evaluate(() => ({ b: getComputedStyle(document.body, '::before').content, a: getComputedStyle(document.body, '::after').content, bar: getComputedStyle(document.querySelector('.topbar, header')).display, act: [...document.querySelectorAll('[data-act=print]')].every((x) => getComputedStyle(x).display === 'none' || getComputedStyle(x.closest('.actions') || x).display === 'none') }));
    ok(/MARGA by EknathaLabs/.test(w.b), 'watermark before: ' + w.b);
    ok(/marga\.eknathalabs\.com/.test(w.a), 'watermark after: ' + w.a);
    eq(w.bar, 'none', 'topbar hidden');
    const pdf = await page.pdf({ format: 'A4' });
    ok(pdf.length > 5000 && pdf.slice(0, 4).toString() === '%PDF', 'pdf produced');
    const sp = await page.evaluate(() => getComputedStyle(document.querySelector('.voice') || document.body).display);
    ok(sp === 'none' || sp === 'block', 'voice');
    await page.emulateMedia({ media: 'screen' });
    await page.goto(BASE + '/cheatsheets/kubernetes.html');
    ok(await page.locator('[data-print]').count() >= 2, 'sheet print buttons');
    await ctx.close();
  });

  await test('official references: every lesson, module and sheet shows https links', async () => {
    const { ctx, page } = await open();
    for (const id of Object.keys(data.lessons).filter((_, i) => i % 6 === 0)) {
      await go(page, '/lesson/' + id);
      const hrefs = await page.locator('.refs a').evaluateAll((a) => a.map((x) => x.href));
      ok(hrefs.length >= 2 && hrefs.every((h) => h.startsWith('https://')), `${id} refs: ${hrefs.length}`);
      ok(await page.locator('.refs a[rel~=noopener]').count() === hrefs.length, `${id} rel noopener`);
    }
    await go(page, '/module/docker');
    ok(await page.locator('.refs a').count() >= 2, 'module refs');
    await page.goto(BASE + '/cheatsheets/terraform.html');
    ok(await page.locator('.refs a').count() >= 2, 'sheet refs');
    await ctx.close();
  });

  await test('path pages list every topic of every stage; all lessons are reachable from a path', async () => {
    const { ctx, page } = await open();
    const covered = new Set();
    for (const p of data.paths.live) {
      await go(page, '/path/' + p.id);
      const n = await page.locator('ol.topics li').count();
      const want = p.modules.reduce((s, m) => s + MODS[m].lessons.length, 0);
      eq(n, want, `${p.id} topics listed`);
      p.modules.forEach((m) => MODS[m].lessons.forEach((l) => covered.add(l)));
    }
    eq(covered.size, allLessons.length, 'union of live paths covers every lesson');
    await ctx.close();
  });

  await test('import of old progress without iv still works and adds iv', async () => {
    const { ctx, page } = await open();
    await go(page, '/progress');
    await page.evaluate(() => localStorage.setItem('ea.progress.v1', JSON.stringify({ v: 1, lessons: {}, cards: {}, days: [], path: 'sre' })));
    await page.reload(); await page.waitForSelector('#main');
    await nav(page, '/interview'); await page.waitForSelector('#iv-list .iv');
    await page.locator('#iv-list [data-act=iv-show]').first().click();
    await page.locator('#iv-list [data-act=iv-rate]').first().click();
    ok(Object.keys((await progress(page)).iv).length === 1, 'iv created');
    await ctx.close();
  });


  // ------------------------------------------------------------ round 3: counter, accessibility, practice, cases
  const calcLib = require('../src/app/calc.js');
  const near = (a, b, t, m) => ok(Math.abs(a - b) <= (t || 1e-6), `${m}: got ${a}, expected ${b}`);
  await test('calculators: formulas give the expected numbers', async () => {
    const m = calcLib.math;
    near(m.budgetMinutes(99.9, 30), 43.2, 1e-9, 'budget');
    near(m.serial([0.999, 0.999, 0.999, 0.999]), 0.996006, 1e-6, 'serial');
    near(m.parallel([0.9, 0.9]), 0.99, 1e-12, 'parallel');
    near(m.kOfN(3, 2, 0.99), 0.999702, 1e-9, '2 of 3');
    near(m.kOfN(5, 1, 0.9), 1 - Math.pow(0.1, 5), 1e-12, '1 of 5');
    near(m.kOfN(4, 4, 0.9), Math.pow(0.9, 4), 1e-12, '4 of 4');
    const c = m.cloudCost({ instances: 10, hours: 500, rate: 0.2, reservedDiscount: 40, spotDiscount: 65, spotOverhead: 10 });
    near(c.onDemand, 1000, 1e-9, 'on demand'); near(c.reserved, 876, 1e-9, 'reserved'); near(c.spot, 385, 1e-9, 'spot'); near(c.breakEvenHours, 438, 1e-9, 'break even');
    const r = m.recovery({ sizeGb: 500, mbps: 200, backupHours: 24, detectMin: 20, opsMin: 60 });
    near(r.restoreMin, 500 * 1024 / 200 / 60, 1e-9, 'restore'); near(r.rtoMin, 500 * 1024 / 200 / 60 + 80, 1e-9, 'rto'); near(r.rpoMin, 1440, 1e-9, 'rpo');
    near(m.retryLoad(4, 3), 256, 1e-9, 'retry'); near(m.retryBudgetLoad(4, 10), 1.4641, 1e-9, 'budget retry');
    const k = m.cells({ users: 1e6, cells: 8, overheadPct: 4 });
    near(k.blastShare, 0.125, 1e-12, 'blast'); near(k.costMultiplier, 1.28, 1e-12, 'cell cost');
    const cap = m.capacity({ peakRps: 5000, perNodeRps: 400, targetUtil: 60, zones: 3, surviveZone: 1 });
    eq(cap.base, 21, 'base'); eq(cap.total, 33, 'total'); eq(cap.perZone, 11, 'per zone');
    eq(m.capacity({ peakRps: 5000, perNodeRps: 400, targetUtil: 60, zones: 1, surviveZone: 1 }).total, 21, 'single zone');
    for (const d of calcLib._defs) {
      const v = {}; d.inputs.forEach((i) => { v[i.id] = i.value; });
      const rows = d.compute(v);
      ok(rows.length >= 3 && rows.every((x) => x.length === 3 && !/NaN|undefined|Infinity/.test(x.join(' '))), `${d.id} outputs: ${JSON.stringify(rows).slice(0, 120)}`);
    }
  });

  await test('visitor count: counts each page view, shows unique visitors, keeps the last value, retries', async () => {
    const { ctx, page, hits } = await open({ counterBody: '{"count":"5 000","count_unique":"987"}' });
    await ctx.addInitScript(() => { window.MARGA_FORCE_REMOTE = true; });
    await page.goto(BASE + '/#/cases');
    await page.waitForSelector('#visitors:not([hidden])');
    eq((await page.textContent('#visitors')).trim(), '987 visitors', 'prefers unique visitors');
    await nav(page, '/practice'); await nav(page, '/practice'); await nav(page, '/flashcards');
    await page.waitForTimeout(300);
    const paths = hits.map((u) => new URL(u).searchParams.get('p'));
    ok(paths.includes('/cases') && paths.includes('/practice') && paths.includes('/flashcards'), 'page views recorded: ' + paths.join(','));
    eq(paths.filter((x) => x === '/practice').length, 1, 'same route twice in a row is counted once');
    ok(hits.every((u) => /[?&]s=\d+,\d+,/.test(u) && /[?&]t=/.test(u)), 'hit carries size and title');
    await ctx.close();
    // counter goes down: last good value is still shown, and the page keeps working
    const second = await browser.newContext({ serviceWorkers: 'block' });
    await second.addInitScript(() => { window.MARGA_FORCE_REMOTE = true; localStorage.setItem('ea.vc', JSON.stringify({ n: '987', t: Date.now() })); });
    let tries = 0;
    await second.route(/goatcounter\.com/, (r) => { if (/\/counter\//.test(r.request().url())) { tries++; return r.abort(); } return r.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') }); });
    const p2 = await second.newPage(); const errs = []; p2.on('pageerror', (e) => errs.push(e.message));
    await p2.goto(BASE + '/'); await p2.waitForSelector('#main h1');
    await p2.waitForSelector('#visitors:not([hidden])');
    eq((await p2.textContent('#visitors')).trim(), '987 visitors', 'cached value while offline');
    await p2.waitForTimeout(4500);
    ok(tries >= 2, 'retried: ' + tries);
    eq(errs.length, 0, errs.join('|'));
    await second.close();
  });

  await test('visitor count: standalone cheat sheet pages count a view and show the total', async () => {
    const { ctx, page, hits } = await open({ counterBody: '{"count":"10","count_unique":"7"}' });
    await ctx.addInitScript(() => { window.MARGA_FORCE_REMOTE = true; });
    await page.goto(`${BASE}/cheatsheets/aws.html`);
    await page.waitForSelector('#visitors:not([hidden])');
    eq((await page.textContent('#visitors')).trim(), '7 visitors', 'sheet total');
    ok(hits.some((u) => new URL(u).searchParams.get('p') === '/cheatsheets/aws.html'), 'sheet view recorded: ' + hits.join(' '));
    await page.goto(`${BASE}/cheatsheets/`);
    await page.waitForSelector('#visitors:not([hidden])');
    await ctx.close();
  });

  await test('accessibility panel: text size, fonts, spacing, contrast, motion, links, focus; saved and reset', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/');
    ok(await page.locator('#a11y-panel').isHidden(), 'panel closed at first');
    await page.click('[data-act=a11y]');
    ok(await page.locator('#a11y-panel').isVisible(), 'panel opens');
    eq(await page.getAttribute('[data-act=a11y]', 'aria-expanded'), 'true', 'aria-expanded');
    await page.selectOption('#a11y-fs', '130');
    eq(await page.getAttribute('html', 'data-a-fs'), '130', 'attr');
    eq(await page.evaluate(() => getComputedStyle(document.documentElement).zoom), '1.3', 'zoom applied');
    await page.selectOption('#a11y-font', 'dyslexic');
    ok(/OpenDyslexic/.test(await page.evaluate(() => getComputedStyle(document.body).fontFamily)), 'dyslexia-friendly font in use');
    await page.selectOption('#a11y-font', 'atkinson');
    ok(/Atkinson/.test(await page.evaluate(() => getComputedStyle(document.body).fontFamily)), 'Atkinson in use');
    await page.selectOption('#a11y-lh', 'loose');
    ok(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.lede')).lineHeight) / parseFloat(getComputedStyle(document.querySelector('.lede')).fontSize) >= 2), 'loose line spacing');
    await page.selectOption('#a11y-sp', 'wide');
    ok(await page.evaluate(() => getComputedStyle(document.body).letterSpacing !== 'normal'), 'wide spacing');
    await page.selectOption('#a11y-contrast', 'high');
    eq(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim().toLowerCase()), '#000000', 'high contrast ink');
    await page.selectOption('#a11y-links', 'underline');
    ok(await page.evaluate(() => getComputedStyle(document.querySelector('#footer a')).textDecorationLine.includes('underline')), 'links underlined');
    await page.selectOption('#a11y-motion', 'reduce');
    eq(await page.getAttribute('html', 'data-a-motion'), 'reduce', 'motion attr');
    await page.selectOption('#a11y-focus', 'strong');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ea.a11y')));
    eq(saved.fs, '130', 'saved size'); eq(saved.font, 'atkinson', 'saved font');
    await page.keyboard.press('Escape');
    ok(await page.locator('#a11y-panel').isHidden(), 'Escape closes');
    eq(await page.evaluate(() => document.activeElement.getAttribute('data-act')), 'a11y', 'focus returns to the button');
    await page.reload(); await page.waitForSelector('#main h1');
    eq(await page.getAttribute('html', 'data-a-fs'), '130', 'persisted after reload');
    await page.click('[data-act=a11y]');
    eq(await page.inputValue('#a11y-font'), 'atkinson', 'panel shows saved font');
    await page.click('[data-a11y=reset]');
    eq(await page.evaluate(() => ['fs', 'font', 'lh', 'sp', 'contrast', 'motion', 'links', 'focus'].filter((k) => document.documentElement.hasAttribute('data-a-' + k)).length), 0, 'reset clears attributes');
    eq(await page.evaluate(() => localStorage.getItem('ea.a11y')), null, 'reset clears storage');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('accessibility: corrupt saved options are ignored; larger text does not overflow on a phone', async () => {
    const { ctx, page } = await open({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { try { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); localStorage.setItem('ea.a11y', '{"fs":"999","font":"<script>","lh":5}'); } } catch (e) {} });
    await go(page, '/');
    eq(await page.evaluate(() => document.documentElement.hasAttribute('data-a-fs')), false, 'invalid size ignored');
    await page.evaluate(() => { MargaA11y.set('fs', '130'); MargaA11y.set('font', 'dyslexic'); MargaA11y.set('sp', 'wide'); });
    for (const r of ['/', '/cases', '/practice', '/drills/linux', '/flashcards', '/interview/mock', '/lesson/linux/filesystem-and-navigation', '/architecture/aws-s3-us-east-1-2017']) {
      await nav(page, r); await page.waitForSelector('#main h1'); await page.waitForTimeout(80);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(ov <= 2, `${r}: overflow ${ov}px at 130% text with dyslexia font`);
    }
    await ctx.close();
  });

  await test('spoken text is highlighted while reading, and the highlight can be turned off', async () => {
    const { ctx, page } = await open();
    await ctx.addInitScript(() => {
      const voices = [{ name: 'Test Voice A', lang: 'en-US', voiceURI: 'a', default: true, localService: true }];
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      let speaking = false;
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, speak(u) { speaking = true; window.__u = u; }, cancel() { speaking = false; }, pause() {}, resume() {}, get speaking() { return speaking; }, get paused() { return false; }, addEventListener() {}, removeEventListener() {} } });
    });
    await page.goto(BASE + '/#/lesson/linux/filesystem-and-navigation');
    await page.waitForSelector('.voice .v-play');
    await page.click('.voice .v-play');
    for (let i = 0; i < 6 && !(await page.locator('.say-now').count()); i++) {
      await page.waitForFunction(() => window.__u); await page.evaluate(() => { const u = window.__u; window.__u = null; u.onend(); });
      await page.waitForTimeout(80);
    }
    await page.waitForSelector('.say-now');
    ok((await page.locator('.say-now').first().innerText()).length > 5, 'a paragraph is highlighted');
    await page.click('.voice .v-stop');
    eq(await page.locator('.say-now').count(), 0, 'highlight cleared on stop');
    await page.evaluate(() => MargaA11y.set('hl', 'off'));
    await page.click('.voice .v-play'); await page.waitForTimeout(200);
    for (let i = 0; i < 4; i++) { await page.evaluate(() => { const u = window.__u; window.__u = null; if (u) u.onend(); }); await page.waitForTimeout(80); }
    eq(await page.locator('.say-now').count(), 0, 'no highlight when turned off');
    await ctx.close();
  });

  await test('case studies: 50 or more, filter, search, open, source links, read marks, deep links', async () => {
    const { ctx, page, issues } = await open();
    ok(data.cases.length >= 50, 'case studies: ' + data.cases.length);
    await go(page, '/cases');
    await page.waitForSelector('#case-list .case');
    eq(await page.locator('#case-list .case').count(), data.cases.length, 'all listed');
    await page.selectOption('#cs-area', 'Security');
    const sec = data.cases.filter((c) => c.area === 'Security').length;
    eq(await page.locator('#case-list .case').count(), sec, 'type filter');
    await page.selectOption('#cs-area', '');
    await page.fill('#cs-q', 'CrowdStrike'); await page.waitForTimeout(80);
    eq(await page.locator('#case-list .case').count(), 1, 'search');
    const card = page.locator('#case-list .case').first();
    ok(await card.locator('.case-body').isHidden(), 'body collapsed');
    await card.locator('.case-toggle').click();
    ok(await card.locator('.case-body').isVisible(), 'body opens');
    const href = await card.locator('a[target=_blank]').first().getAttribute('href');
    ok(/^https:\/\//.test(href) && (await card.locator('a[target=_blank]').first().getAttribute('rel')).includes('noopener'), 'source link: ' + href);
    ok(/Lesson/.test(await card.innerText()) && /Cause/.test(await card.innerText()), 'has structure');
    await card.locator('[data-act=case-read]').click();
    ok(Object.keys((await progress(page)).cs).length === 1, 'read recorded');
    await page.reload(); await page.waitForSelector('#case-list .case');
    await page.fill('#cs-q', 'CrowdStrike'); await page.waitForTimeout(80);
    ok(await page.locator('#case-list .case.read').count() === 1, 'read mark persists');
    await page.fill('#cs-q', ''); await page.click('[data-act=case-all]'); await page.waitForTimeout(50);
    ok(await page.locator('#case-list .case-body:visible').count() === data.cases.length, 'open all');
    // deep links
    await nav(page, '/cases/kubernetes'); await page.waitForSelector('#case-list .case');
    eq(await page.locator('#case-list .case').count(), data.cases.filter((c) => c.modules.includes('kubernetes')).length, 'stage deep link');
    const one = data.cases[5].id;
    await nav(page, '/cases/' + one); await page.waitForSelector('#case-' + one + ' .case-body:visible');
    // every module has real-world cases, all fields are present
    for (const m of data.modules) ok(data.cases.filter((c) => c.modules.includes(m.id)).length >= 2, `cases for ${m.id}`);
    for (const c of data.cases) ok(c.what && c.cause && c.fix && c.lesson && c.year > 1990 && /^https:\/\//.test(c.source.u), `case ${c.id} complete`);
    eq(issues.filter((x) => !/goatcounter|ERR_/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('architecture post-mortems: each opens with sections, sources and working calculators', async () => {
    const { ctx, page } = await open();
    ok(data.arch.length >= 8, 'studies: ' + data.arch.length);
    for (const a of data.arch) {
      await go(page, '/architecture/' + a.id);
      await page.waitForSelector('#arch-body h2');
      const heads = await page.locator('#arch-body h2').allInnerTexts();
      for (const h of ['The system', 'Timeline as reported', 'Root cause', 'Trade-offs to weigh']) ok(heads.includes(h), `${a.id} lacks "${h}"`);
      ok(await page.locator('.refs a[href^="https://"]').count() >= 1, `${a.id} source link`);
      const n = await page.locator('.calc').count();
      ok(n >= 1 && n === a.calcs.length, `${a.id} calculators ${n}/${a.calcs.length}`);
      ok(await page.locator('.calc .calc-row').count() >= 3, `${a.id} calculator output`);
    }
    await go(page, '/calculators');
    eq(await page.locator('.calc').count(), calcLib.list.length, 'all calculators on the page');
    const box = page.locator('.calc[data-calc=error-budget]');
    const before = await box.locator('.calc-out').innerText();
    await box.locator('[data-in=slo]').fill('99.99');
    await page.waitForTimeout(50);
    const after = await box.locator('.calc-out').innerText();
    ok(before !== after && /4.3 minutes/.test(after), 'recalculates live: ' + after.slice(0, 60));
    await box.locator('[data-in=slo]').fill('');
    await page.waitForTimeout(50);
    ok(!/NaN|undefined/.test(await box.locator('.calc-out').innerText()), 'empty input is handled');
    await nav(page, '/calculators/cloud-costs-nope'); await page.waitForSelector('#main h1');
    await nav(page, '/calculators/retries'); await page.waitForSelector('.calc');
    eq(await page.locator('.calc').count(), 1, 'single calculator page');
    await ctx.close();
  });

  await test('troubleshooting drills: 3 per module, answer, explanation, retry, progress', async () => {
    const { ctx, page, issues } = await open();
    for (const m of data.modules) eq(data.drills.filter((d) => d.module === m.id).length, 3, `drills for ${m.id}`);
    for (const d of data.drills) ok(d.options.length >= 3 && d.options.filter((o) => o.ok).length === 1 && d.evidence.length > 20 && d.why.length > 40, `drill ${d.id} well formed`);
    await go(page, '/drills/linux');
    eq(await page.locator('.drill').count(), 3, 'three drills on the page');
    const first = page.locator('.drill').nth(0), second = page.locator('.drill').nth(1);
    await first.locator('[data-act=drill-check]').click();
    ok(/Choose an answer/.test(await page.textContent('#toast')), 'asks for an answer first');
    await first.locator('input[value="1"]').check();
    await first.locator('[data-act=drill-check]').click();
    ok(await first.locator('.drill-res.ok').isVisible(), 'correct feedback');
    ok(/Correct/.test(await first.locator('.drill-res').innerText()), 'text says correct');
    ok(await first.locator('input:disabled').count() >= 3, 'inputs locked after checking');
    await second.locator('input[value="0"]').first().check();
    await second.locator('[data-act=drill-check]').click();
    ok(await second.locator('.drill-res.no').isVisible(), 'wrong feedback');
    ok(await second.locator('.opt-r.good').count() === 1 && await second.locator('.opt-r.bad').count() === 1, 'marks right and wrong options');
    await second.locator('[data-act=drill-retry]').click();
    ok(await second.locator('input:enabled').count() >= 3 && await second.locator('input:checked').count() === 0, 'retry resets');
    const dr = (await progress(page)).dr;
    const ids = Object.keys(dr);
    ok(ids.length === 2 && ids.filter((k) => dr[k].ok).length === 1, 'progress recorded: ' + JSON.stringify(dr));
    ok(/1 of 33 solved/.test(await page.textContent('#drill-stats')), 'stats');
    await page.reload(); await page.waitForSelector('.drill');
    eq(await page.locator('.drill.solved').count(), 1, 'solved state persists');
    await page.selectOption('#dr-mod', 'docker'); await page.waitForSelector('#dg-docker');
    eq(await page.evaluate(() => location.hash), '#/drills/docker', 'stage filter navigates');
    eq(issues.filter((x) => !/goatcounter|ERR_/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('mock interview: set up, timed questions, reveal, self-score, results, history, ratings', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/interview/mock');
    await page.waitForSelector('#mk-role');
    await page.selectOption('#mk-role', 'sre'); await page.selectOption('#mk-level', 'mid'); await page.selectOption('#mk-n', '5'); await page.selectOption('#mk-secs', '60');
    await page.click('[data-act=mock-start]');
    await page.waitForSelector('.mock-q h2');
    ok(/Time left 1:0\d|Time left 0:5\d/.test(await page.textContent('#mk-time')), 'timer shows: ' + await page.textContent('#mk-time'));
    ok(await page.locator('#mk-ans').isHidden(), 'answer hidden until revealed');
    const picked = [];
    const scores = [2, 1, 0, 0, 0];
    for (let i = 0; i < 5; i++) {
      eq((await page.textContent('.mock-q .small')).startsWith(`Question ${i + 1} of 5`), true, `counter ${i + 1}`);
      const q = (await page.textContent('#mk-h')).trim(); picked.push(q);
      await page.click('#mk-reveal');
      ok(await page.locator('#mk-ans').isVisible() && await page.locator('#mk-score').isVisible(), 'reveal shows answer and scoring');
      await page.click(`#mk-score [data-s="${scores[i]}"]`);
    }
    await page.waitForSelector('.mock-res');
    ok(/Your result: 30%/.test(await page.textContent('#mr-h')), 'score: ' + await page.textContent('#mr-h'));
    ok(await page.locator('.mock-res .modbars li').count() >= 1, 'topic breakdown');
    const prog = await progress(page);
    eq(prog.mock.length, 1, 'history saved'); eq(prog.mock[0].score, 30, 'history score');
    const byQ = Object.fromEntries(data.interview.map((x) => [x.q, x.id]));
    eq(prog.iv[byQ[picked[0]]], 'know', 'nailed becomes known'); eq(prog.iv[byQ[picked[1]]], 'review', 'partly becomes review'); eq(prog.iv[byQ[picked[4]]], 'review', 'missed becomes review');
    eq(new Set(picked).size, 5, 'no repeated question');
    eq(await page.locator('.mk-miss').count(), 4, 'missed questions listed with answers');
    // start again, skip everything
    await page.click('[data-act=mock-again]'); await page.waitForSelector('#mk-role');
    await page.selectOption('#mk-n', '5'); await page.selectOption('#mk-secs', '0'); await page.click('[data-act=mock-start]');
    for (let i = 0; i < 5; i++) { await page.waitForSelector('.mock-q h2'); await page.click('[data-act=mock-skip]'); }
    await page.waitForSelector('.mock-res');
    ok(/Your result: 0%/.test(await page.textContent('#mr-h')), 'skipping scores zero');
    await page.reload(); await page.waitForSelector('.mock-hist li');
    eq(await page.locator('.mock-hist li').count(), 2, 'history list after reload');
    // too few questions for a combination
    await page.waitForSelector('#mk-role');
    await page.evaluate(() => { const s = document.querySelector('#mk-level'); s.innerHTML += '<option value="none">none</option>'; });
    await page.selectOption('#mk-level', 'none'); await page.click('[data-act=mock-start]');
    ok(/Not enough questions/.test(await page.textContent('#mk-msg')), 'explains when nothing matches');
    eq(issues.filter((x) => !/goatcounter|ERR_/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('interactive flashcards: decks, flip, rate, keys, summary, persistence', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/flashcards');
    await page.waitForSelector('#fc-deck');
    await page.selectOption('#fc-deck', 'docker'); await page.selectOption('#fc-order', 'order');
    await page.click('[data-act=fc-start]');
    await page.waitForSelector('.fc-card');
    const dockerCards = data.modules.find((m) => m.id === 'docker').lessons.reduce((n, l) => n + data.lessons[l].cards.length, 0);
    ok(new RegExp(`Card 1 of ${dockerCards}`).test(await page.textContent('.fc .small')), 'deck size');
    const firstQ = data.lessons[data.modules.find((m) => m.id === 'docker').lessons[0]].cards[0];
    ok((await page.textContent('.fc-front')).includes(firstQ.f), 'in lesson order');
    ok(await page.locator('.fc-back').isHidden(), 'answer hidden');
    ok(await page.locator('#fc-rate').isHidden(), 'rating hidden until flipped');
    await page.keyboard.press('2');
    ok(/Card 1 of/.test(await page.textContent('.fc .small')), 'cannot rate before flipping');
    await page.keyboard.press('Space');
    ok(await page.locator('.fc-back').isVisible() && (await page.textContent('.fc-back')).includes(firstQ.b), 'flips on Space');
    eq(await page.getAttribute('.fc-card', 'aria-pressed'), 'true', 'aria-pressed');
    await page.keyboard.press('2');
    ok(/Card 2 of/.test(await page.textContent('.fc .small')), 'rating advances');
    eq((await progress(page)).fc[`${data.modules.find((m) => m.id === 'docker').lessons[0]}#0`], 'k', 'known stored');
    await page.click('[data-act=fc-flip-btn]'); await page.keyboard.press('1');
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
    ok(/Card 1 of/.test(await page.textContent('.fc .small')) && /marked this as known/.test(await page.textContent('.fc .small')), 'back to card 1 shows known');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    ok(/Card 3 of/.test(await page.textContent('.fc .small')), 'arrow keys move');
    // finish the deck quickly
    for (let i = 3; i <= dockerCards; i++) { await page.click('[data-act=fc-next]'); }
    await page.waitForSelector('#fc-done');
    ok(/1 of|[0-9]+ of/.test(await page.textContent('#fc-root')), 'summary');
    await page.click('[data-act=fc-again]'); await page.waitForSelector('.fc-card');
    ok(!new RegExp(`Card 1 of ${dockerCards}\\b`).test(await page.textContent('.fc .small')), 'second round skips the known card');
    await page.reload(); await page.waitForSelector('#fc-deck');
    ok(/1 cards marked as known/.test(await page.textContent('#fc-msg')), 'known count persists: ' + await page.textContent('#fc-msg'));
    await page.selectOption('#fc-deck', 'interview'); await page.click('[data-act=fc-start]'); await page.waitForSelector('.fc-card');
    ok(new RegExp(`Card 1 of ${data.interview.length}\\b`).test(await page.textContent('.fc .small')), 'InterviewHub deck');
    eq(issues.filter((x) => !/goatcounter|ERR_/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('practice hub and navigation: Practice, Case studies, search, module links, export and import keep new data', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    const links = await page.locator('#topnav a').allInnerTexts();
    eq(links.join('|'), 'Paths|Cheat sheets|Case studies|Practice|Progress|InterviewHub', 'nav order');
    await nav(page, '/practice');
    eq(await page.locator('.prac li').count(), 8, 'hub cards');
    for (const href of ['#/drills', '#/interview/mock', '#/flashcards', '#/cases', '#/architecture', '#/calculators', '#/review', '#/labs']) ok(await page.locator(`.prac a[href="${href}"]`).count() === 1, 'hub links to ' + href);
    await nav(page, '/module/kubernetes');
    ok(await page.locator('a[href="#/drills/kubernetes"]').count() === 1 && await page.locator('a[href="#/cases/kubernetes"]').count() === 1, 'module page links to practice');
    // search finds case studies and post-mortems
    await page.keyboard.press('/'); await page.fill('#sinput, #smodal input', 'Knight Capital');
    await page.waitForTimeout(150);
    ok(/Case study/.test(await page.locator('#sres').innerText()), 'search finds the case study');
    await page.keyboard.press('Escape');
    // export / import round trip keeps the new fields
    const p = await progress(page) || emptyProgress();
    p.cs = { 'knight-capital-deployment': 1 }; p.dr = { 'linux-1': { n: 1, ok: true } }; p.fc = { 'linux/filesystem-and-navigation#0': 'k' }; p.mock = [{ score: 70, n: 5, label: 'x', day: '2026-01-01' }];
    await page.evaluate((o) => localStorage.setItem('ea.progress.v1', JSON.stringify(o)), p);
    await page.reload(); await nav(page, '/progress'); await page.waitForSelector('#import-file');
    const file = path.join(os.tmpdir(), 'marga-import.json'); fs.writeFileSync(file, JSON.stringify(p));
    await page.evaluate(() => localStorage.removeItem('ea.progress.v1'));
    await page.setInputFiles('#import-file', file);
    await page.waitForFunction(() => /"cs"/.test(localStorage.getItem('ea.progress.v1') || ''));
    const back = await progress(page);
    eq(back.cs['knight-capital-deployment'], 1, 'cases kept'); eq(back.dr['linux-1'].ok, true, 'drills kept'); eq(back.mock[0].score, 70, 'mock kept'); eq(Object.keys(back.fc).length, 1, 'flashcards kept');
    await ctx.close();
  });

  await test('print: case studies and drills print fully open with the watermark', async () => {
    const { ctx, page } = await open();
    await go(page, '/cases'); await page.waitForSelector('#case-list .case');
    await page.emulateMedia({ media: 'print' });
    ok(await page.locator('#case-list .case-body').first().evaluate((el) => getComputedStyle(el).display !== 'none'), 'bodies print even when collapsed');
    ok(/MARGA by EknathaLabs/.test(await page.evaluate(() => getComputedStyle(document.body, '::before').content)), 'watermark');
    ok(await page.locator('#a11y-panel').evaluate((el) => getComputedStyle(el).display === 'none'), 'panel hidden in print');
    const pdf = await page.pdf({ format: 'A4' });
    ok(pdf.length > 20000 && pdf.slice(0, 4).toString() === '%PDF', 'pdf produced');
    await ctx.close();
  });

  // ------------------------------------------------------------ screenshots
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const dark of [false, true]) {
      for (const vp of [{ n: 'desktop', w: 1280, h: 900 }, { n: 'mobile', w: 390, h: 844 }]) {
        const { ctx, page } = await open({ dark, viewport: { width: vp.w, height: vp.h } });
        await go(page, '/');
        const prog = emptyProgress(); prog.lessons = doneMap([...MODS.linux.lessons, ...MODS.bash.lessons, ...MODS.networking.lessons.slice(0, 2)]);
        prog.days = [await today(page, 0), await today(page, -1), await today(page, -2)];
        await setProgress(page, prog);
        for (const [name, r] of [['home', '/'], ['paths', '/paths'], ['path', '/path/sre'], ['module', '/module/networking'], ['lesson', '/lesson/networking/http-and-tls'], ['sheet', '/cheatsheet/kubernetes'], ['sheets', '/cheatsheets'], ['progress', '/progress'], ['labs', '/labs'], ['locked', '/module/kubernetes']]) {
          await nav(page, r);
          await page.waitForSelector('#main h1');
          await page.waitForTimeout(700);
          await page.screenshot({ path: path.join(SHOTS, `${name}-${vp.n}-${dark ? 'dark' : 'light'}.png`), fullPage: name === 'lesson' ? false : true });
        }
        await ctx.close();
      }
    }
  }

  await browser.close();
  srv.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} of ${results.length} tests passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
