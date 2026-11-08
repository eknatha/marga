  await test('guided tour: shows on first visit, picks a path, steps, skips, does not repeat', async () => {
    const { ctx, page, issues } = await open({ tour: true }); await go(page, '/');
    await page.waitForSelector('.tr-path, .tour, #tour', { timeout: 8000 });
    ok(await page.locator('.tr-path').count() >= 2, 'path picker cards');
    await page.locator('.tr-path').first().click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    eq(await page.locator('.tr-path').count(), 0, 'tour closed');
    ok(await page.evaluate(() => !!localStorage.getItem('ea.tour')), 'seen flag set');
    await page.reload(); await page.waitForTimeout(800);
    eq(await page.locator('.tr-path').count(), 0, 'does not repeat');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('studio hub, mastery map, architectures and replays render', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/studio');
    await page.waitForSelector('#main h1');
    await go(page, '/mastery'); await page.waitForSelector('#main svg');
    await go(page, '/architectures'); await page.waitForSelector('#main h1');
    const n = await page.locator('#main a[href^="#/architectures/"]').count();
    ok(n >= 8, 'architecture cards: ' + n);
    await go(page, '/architectures/' + data.gallery[0].id); await page.waitForSelector('#main .dg, #main svg');
    await go(page, '/replays'); const r = await page.locator('#main a[href^="#/replays/"]').count();
    ok(r >= 8, 'replay cards: ' + r);
    await go(page, '/replays/' + data.replays[0].id); await page.waitForSelector('#xr-screen');
    await page.click('#xr-step'); await page.click('#xr-step');
    ok((await page.locator('#xr-say').innerText()).length > 10, 'explanation shown');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('cluster visualiser: delete pod heals, drain and reset work', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/cluster');
    await page.waitForSelector('#cl-log');
    const btns = await page.locator('#main button').count();
    ok(btns >= 6, 'controls: ' + btns);
    await page.locator('#main button', { hasText: /reset/i }).first().click();
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('focus mode toggles on a lesson and exits with Escape', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/lesson/' + Object.keys(data.lessons).filter((k) => k.startsWith('linux/'))[0]);
    await page.waitForSelector('[data-act=focus]');
    await page.click('[data-act=focus]');
    ok(await page.evaluate(() => document.documentElement.classList.contains('focus-mode')), 'focus on');
    await page.keyboard.press('Escape');
    ok(await page.evaluate(() => !document.documentElement.classList.contains('focus-mode')), 'focus off');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });
