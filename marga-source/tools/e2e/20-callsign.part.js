  // ------------------------------------------------------------ callsign, avatar, greeting
  await test('callsign: ask, save, greet, rename, persist, export and import, reset keeps it, remove clears it', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/'); await page.waitForSelector('.greet-ask');
    ok(/Add a callsign/.test(await page.textContent('.greet-ask')), 'home asks for a callsign');
    await page.click('.greet-ask [data-act=me]'); await page.waitForSelector('#me-dlg .me-card');
    ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'me-name'), 'name field has focus');
    await page.keyboard.press('Escape'); eq(await page.locator('#me-dlg').count(), 0, 'Escape closes');
    await page.click('.me-btn'); await page.fill('#me-name', '  <b>Ravi</b>   Kumar  ');
    await page.click('[data-me-a=shield]'); await page.click('[data-me-c="2"]');
    await page.click('[data-me=save]'); await page.waitForSelector('.greet:not(.greet-ask)');
    const g = await page.textContent('.greet');
    ok(/Good (morning|afternoon|evening), b Ravi \/b Kumar\./.test(g.replace(/\s+/g, ' ')) || /Ravi/.test(g), 'greeting shows the callsign: ' + g);
    eq(await page.locator('.greet b b, .greet script').count(), 0, 'markup is not injected');
    ok(/Ravi/.test(await page.getAttribute('.me-btn', 'aria-label')), 'header button names the callsign');
    await page.reload(); await page.waitForSelector('.greet');
    ok(/Ravi/.test(await page.textContent('.greet')), 'callsign persists after reload');
    await page.click('.greet [data-act=me]'); await page.fill('#me-name', 'Eknatha'); await page.click('[data-me=save]');
    await page.waitForFunction(() => /Eknatha/.test(document.querySelector('.greet').textContent));
    await go(page, '/progress'); await page.waitForSelector('.greet');
    ok(/Eknatha/.test(await page.textContent('.greet')), 'progress page greets too');
    const dl = page.waitForEvent('download'); await page.click('[data-act=export]'); const d = await dl;
    const txt = require('fs').readFileSync(await d.path(), 'utf8'); ok(JSON.parse(txt).me.n === 'Eknatha', 'export carries the callsign');
    await page.click('#reset-btn'); await page.click('#reset-btn');
    ok(/Eknatha/.test(await page.textContent('.me-btn')) || /Eknatha/.test(await page.getAttribute('.me-btn', 'aria-label')), 'reset keeps the callsign');
    await page.click('.me-btn'); await page.click('[data-me=remove]'); await page.click('[data-me=remove]');
    await page.waitForSelector('.greet-ask'); eq(await page.evaluate(() => localStorage.getItem('ea.me')), null, 'remove clears storage');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('callsign: dialog is accessible in both themes and the header fits a phone with a long name', async () => {
    for (const theme of ['light', 'dark']) {
      const { ctx, page } = await open({ viewport: { width: 360, height: 760 } });
      await go(page, '/'); await page.evaluate((t) => { localStorage.setItem('ea.theme', t); localStorage.setItem('ea.me', JSON.stringify({ n: 'Venkata Subrahmanyam Reddy', c: 4, a: 'i' })); }, theme);
      await page.reload(); await page.waitForSelector('.greet');
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      ok(sw[0] <= sw[1] + 1, 'no sideways scroll at 360px, ' + theme);
      const hh = await page.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().height);
      ok(hh < 90, 'header stays one row, ' + theme + ': ' + hh);
      await page.click('.me-btn'); await page.waitForSelector('#me-dlg .me-card');
      await page.addScriptTag({ content: AXE }); const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')); eq(res.length, 0, 'axe ' + theme + ': ' + JSON.stringify(res.map((v) => v.id)));
      await ctx.close();
    }
  });

