  // ---- helpers
  async function open(opts = {}) {
    const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, serviceWorkers: opts.sw ? 'allow' : 'block', colorScheme: opts.dark ? 'dark' : 'light', reducedMotion: opts.motion ? 'no-preference' : 'reduce' });
    const hits = [];
    await ctx.route(/goatcounter\.com/, (route) => {
      const u = route.request().url();
      if (opts.counterDown) return route.abort();
      if (/\/counter\//.test(u)) return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: opts.counterBody || '{"count":"1 234"}' });
      hits.push(u); return route.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') });
    });
    if (!opts.tour) await ctx.addInitScript(() => { try { localStorage.setItem('ea.tour', '1'); } catch (e) { /* ignore */ } });
    if (!opts.fresh) await ctx.addInitScript(() => { try { if (!localStorage.getItem('ea.me')) localStorage.setItem('ea.me', JSON.stringify({ n: 'Tester', c: 0, a: 'i' })); } catch (e) { /* ignore */ } });
    const page = await ctx.newPage();
    const issues = [];
    page.on('console', (m) => { if (m.type() === 'error') issues.push(`console: ${m.text()}`); });
    page.on('pageerror', (e) => issues.push(`pageerror: ${e.message} @ ${String(e.stack).split('\n').slice(1,3).join(' ')}`));
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
  const allDone = () => { const p = emptyProgress(); p.lessons = doneMap(Object.values(MODS).flatMap((m) => m.lessons)); return p; };
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
    const mod = Object.values(MODS).find((m) => m.lessons.includes(id));
    if (mod && mod.lessons[mod.lessons.length - 1] === id) { await page.waitForSelector('#badge-dlg', { timeout: 5000 }); await page.keyboard.press('Escape'); await page.waitForSelector('#badge-dlg', { state: 'detached' }); }
  }
  const today = (page, offset = 0) => page.evaluate((o) => {
    const d = new Date(); d.setDate(d.getDate() + o);
    const m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
  }, offset);

  const data = await (async () => { const { ctx, page } = await open(); await page.goto(BASE + '/'); const d = await A(page); await ctx.close(); return d; })();
  const MODS = Object.fromEntries(data.modules.map((m) => [m.id, m]));
  const allLessons = Object.keys(data.lessons);

