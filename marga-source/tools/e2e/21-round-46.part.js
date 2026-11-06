  // ------------------------------------------------------------ round 46
  await test('broken servers: lists labs by tier, filters, links to a lab with a Check button', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/broken-servers'); await page.waitForSelector('#bs-body .tl-item');
    ok(await page.locator('#bs-body .tl-item').count() >= 20, 'many labs listed');
    for (const t of ['Easy', 'Medium', 'Hard']) ok(await page.locator(`[data-act=bs-tier][data-t=${t}]`).count() === 1, t + ' filter');
    await page.click('[data-act=bs-tier][data-t=Hard]');
    ok(await page.locator('#bs-body .tl-item').count() >= 1, 'hard labs');
    const href = await page.locator('#bs-body .tl-item h3 a').first().getAttribute('href');
    await go(page, href.replace(/^#/, ''));
    await page.waitForSelector('#main h1');
    ok(await page.locator('button:has-text("Check")').count() >= 1, 'lab has a check button');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('track stages: every stage has a Break it step', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/tracks'); await page.waitForSelector('#main a[href^="#/track/"]');
    const href = await page.locator('#main a[href^="#/track/"]').first().getAttribute('href');
    await go(page, href.replace(/^#/, '')); await page.waitForSelector('.trk-stage');
    const n = await page.locator('.trk-stage').count();
    const b = await page.locator('.trk-stage', { hasText: /Break it/ }).count();
    eq(b, n, 'break-it in every stage');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('round 46 modules: lessons render with a diagram', async () => {
    const { ctx, page, issues } = await open();
    const data = await page.evaluate(() => null);
    for (const m of ['proxies', 'messaging', 'cfn-bicep', 'gcp']) {
      await go(page, '/module/' + m); await page.waitForSelector('#main h1');
      const first = await page.locator('#main a[href^="#/lesson/' + m + '/"]').first().getAttribute('href');
      await go(page, first.replace(/^#/, '')); await page.waitForSelector('#main h1');
      ok(await page.locator('#main svg, #main figure, #main pre.diagram, #main .diagram').count() >= 1, m + ' lesson shows a diagram');
    }
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

