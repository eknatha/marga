  // ------------------------------------------------------------ home and structure
  await test('home renders with no console errors, failed requests or git references', async () => {
    const { ctx, page, issues } = await open();
    await page.goto(BASE + '/');
    await page.waitForSelector('#main h1');
    const h1 = await page.textContent('#main h1');
    ok(/Learn to fix production/i.test(h1), `unexpected h1: ${h1}`);
    eq(await page.title(), 'MARGA by EknathaLabs: DevOps, cloud and SRE training', 'title');
    const text = await page.evaluate(() => document.body.innerText);
    ok(!/\bgit(ops|leaks|ea)/i.test(text), 'visible text mentions git');
    ok(/Labs/.test(text) && /planned/i.test(text), 'home should mention planned labs');
    ok(text.includes('Free. Offline. No sign-up.') && text.includes('Open it once, turn off wifi, and keep learning') && text.includes('No account needed. Start now.'), 'home free/no login lines');
    ok(!/Free forever/.test(text), 'no Free forever wording');
    eq(await page.locator('.tree .node').count() >= 8, true, 'skill tree nodes rendered');
    eq(await page.getAttribute('html', 'lang'), 'en', 'html lang');
    const canon = await page.getAttribute('link[rel=canonical]', 'href');
    eq(canon, 'https://marga.eknathalabs.com/', 'canonical');
    eq(issues.length, 0, 'issues: ' + issues.join(' | '));
    await ctx.close();
  });

  await test('brand is MARGA and the visitor count shows at the top right', async () => {
    const { ctx, page, issues, hits } = await open();
    await page.goto(BASE + '/');
    await page.waitForSelector('#main h1');
    eq((await page.textContent('.brand')).trim(), 'MARGA', 'header brand is just MARGA');
    ok(await page.evaluate(() => { const r = document.querySelector('#visitors').getBoundingClientRect(), w = document.querySelector('.utilbar .wrap').getBoundingClientRect(); return r.right > w.right - 64 && r.top < 40; }), 'visitor count sits at the top right');
    ok(!/Academy/i.test(await page.evaluate(() => document.title + document.body.innerText)), 'no leftover "Academy" wording');
    await page.waitForFunction(() => /^\d[\d ]* visitors?$/.test(document.querySelector('#visitors').textContent.trim()));
    eq((await page.textContent('#visitors')).trim(), '1 234 visitors', 'visitor text');
    await page.reload(); await page.waitForSelector('#visitors:not([hidden])');
    eq(hits.length, 0, 'no hit is recorded from localhost');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('visitor count says it is unavailable, with no errors on the page, when the counter is unreachable', async () => {
    const { ctx, page } = await open({ counterDown: true });
    const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(BASE + '/');
    await page.waitForSelector('#main h1');
    await page.waitForTimeout(500);
    ok(/^(Counting visitors|Visitor count unavailable)$/.test((await page.textContent('#visitors')).trim()), 'a visible state: ' + await page.textContent('#visitors'));
    ok(await page.locator('#visitors').isVisible(), 'the footer line is visible');
    eq(errs.length, 0, errs.join(' | '));
    await ctx.close();
  });

  await test('three role paths are live and four more are shown as planned', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/paths');
    const live = await page.locator('.path-row, .row').count();
    const text = await page.evaluate(() => document.body.innerText);
    for (const t of ['DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer', 'DevSecOps Engineer']) ok(text.includes(t), `missing path ${t}`);
    for (const t of ['Platform Engineer', 'Kubernetes Administrator', 'MLOps']) ok(text.includes(t), `missing planned ${t}`);
    eq(await page.locator('.planned li em').count() >= 3, true, 'planned badges');
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

