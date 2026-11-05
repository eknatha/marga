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
      ok(!/\bgit(ops|leaks|ea)/i.test(txt), `${id} mentions git`);
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
    await ctx.addInitScript(() => { try { localStorage.setItem('ea.me', JSON.stringify({ n: 'Tester', c: 0, a: 'i' })); } catch (e) { /* ignore */ } });
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

