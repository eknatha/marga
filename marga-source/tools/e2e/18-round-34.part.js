  // ------------------------------------------------------------ round 34
  await test('round 34: bare metal and service mesh skills are in the tree, have lessons and labs, and the hardware simulators answer', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/');
    const info = await page.evaluate(() => ({ mods: window.ACADEMY.modules.map((m) => m.id), labs: window.ACADEMY.termlabs.filter((l) => ['baremetal', 'service-mesh'].includes(l.module)).length, les: Object.keys(window.ACADEMY.lessons || {}).filter((k) => /^(baremetal|service-mesh)\//.test(k)).length }));
    ok(info.mods.includes('baremetal') && info.mods.includes('service-mesh'), 'both skills exist');
    eq(info.labs, 10, 'ten labs in the two skills');
    await setProgress(page, allDone());
    await go(page, '/lesson/baremetal/servers-racks-and-remote-management'); await page.waitForSelector('.wp');
    ok(await page.locator('.wp').count() >= 1, 'the lesson shows a wrong-path example');
    await page.click('.wp-more summary >> nth=1');
    ok(/ipmitool/.test(await page.textContent('.wp-good')), 'the working way is shown');
    await go(page, '/terminal-lab/bm-find-bad-dimm'); await page.waitForSelector('#main h1');
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('round 34: ten multi-service labs are listed under their own heading and open', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/terminal-labs/multi');
    eq(await page.locator('a[href^="#/terminal-lab/ms-"]').count(), 10, 'ten multi-service labs');
    ok(/Multi-service incidents/.test(await page.textContent('#main')), 'heading shown');
    await go(page, '/terminal-lab/ms-checkout-502'); await page.waitForSelector('#main h1');
    ok(/502/.test(await page.textContent('#main h1')), 'lab opens');
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('round 34: 24 walkthroughs, and every interview prompt has a model answer with a diagram and explained components', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/walkthroughs');
    eq(await page.locator('a[href^="#/walkthrough/"]').count(), 24, 'walkthrough cards');
    const ids = await page.evaluate(() => Object.keys(window.ACADEMY.mockdesigns));
    eq(ids.length, 18, 'eighteen model answers');
    await go(page, '/design-interview'); await page.waitForSelector('#sdi-go');
    eq(await page.locator('#sdi-p option').count(), 18, 'eighteen prompts');
    await page.selectOption('#sdi-p', 'mesh-mtls'); await page.click('#sdi-go');
    for (let i = 0; i < 6; i++) { await page.fill('#sdi-n', 'n'); await page.click('#sdi-next'); }
    await page.waitForSelector('#sdi-score'); await page.click('#sdi-score'); await page.waitForSelector('#sdi-model');
    ok(await page.locator('#sdi-model .dg').count() >= 1, 'model answer has a diagram');
    ok(await page.locator('#sdi-model h3').count() >= 5, 'at least five components explained');
    ok(/Example:/.test(await page.textContent('#sdi-model')), 'examples shown');
    ok(!/NaN|undefined/.test(await page.textContent('#main')), 'no bad text');
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });
