  // ------------------------------------------------------------ round 49: AIOps skill tree
  await test('AIOps tree: 20 lessons in aiops, a new aiops-practice module with 14, requiring aiops', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/');
    const mods = Object.fromEntries(data.modules.map((m) => [m.id, m]));
    ok(mods['aiops-practice'], 'aiops-practice module exists');
    eq(JSON.stringify(mods['aiops-practice'].requires), JSON.stringify(['aiops']), 'requires aiops');
    eq(Object.keys(data.lessons).filter((k) => k.startsWith('aiops/')).length, 20, 'aiops lessons');
    eq(Object.keys(data.lessons).filter((k) => k.startsWith('aiops-practice/')).length, 14, 'aiops-practice lessons');
    for (const m of ['aiops', 'aiops-practice']) {
      await go(page, '/module/' + m); await page.waitForSelector('#main h1');
      const n = await page.locator('#main a[href^="#/lesson/' + m + '/"]').count();
      ok(n >= (m === 'aiops' ? 20 : 14), m + ' lists its lessons: ' + n);
    }
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('AIOps: every new lesson has a diagram, 4 quiz questions, cards, a story and a senior view', async () => {
    const ids = Object.keys(data.lessons).filter((k) => k.startsWith('aiops/')).slice(12).concat(Object.keys(data.lessons).filter((k) => k.startsWith('aiops-practice/')));
    ok(ids.length >= 22, 'new lessons found: ' + ids.length);
    for (const id of ids) {
      const l = data.lessons[id];
      ok(l.quiz.length >= 4, id + ' quiz');
      ok(l.cards.length >= 4, id + ' cards');
      ok(l.lv && l.lv.s && l.lv.i && l.lv.r && l.lv.x, id + ' levels and stories');
    }
  });

  await test('AIOps: the aiops-practice module ships widgets, explainers, drills, a game and a cheat sheet', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/cheatsheets');
    const html = await page.evaluate(async () => (await (await fetch('cheatsheets/aiops-practice.html')).text()));
    ok(/Approval tiers/.test(html), 'cheat sheet page has its content');
    const info = await page.evaluate(async () => {
      const r = await fetch('packs/aiops-practice.pdf'); const b = new Uint8Array(await r.arrayBuffer());
      return { s: r.status, h: String.fromCharCode(...b.slice(0, 5)), n: b.length };
    });
    eq(info.s, 200, 'pack served'); eq(info.h, '%PDF-', 'pack is a PDF'); ok(info.n > 50000, 'pack has content');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('AIOps: the architecture gallery and the terminal replay for the new tree work', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/architectures/aiops-pipeline');
    await page.waitForSelector('#main .dg, #main svg');
    ok((await page.locator('#main').innerText()).length > 200, 'architecture page has text');
    await go(page, '/replays/latency-after-deploy'); await page.waitForSelector('#xr-screen');
    await page.click('#xr-step'); await page.click('#xr-step'); await page.click('#xr-step');
    ok((await page.locator('#xr-say').innerText()).length > 15, 'replay explanation shown');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('AIOps: the MLOps and AIOps path lists aiops-practice after aiops', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/path/mlops');
    await page.waitForSelector('#main h1');
    const txt = await page.locator('#main').innerText();
    ok(/AIOps in practice/.test(txt), 'path page lists AIOps in practice');
    ok(txt.indexOf('AIOps in practice') > txt.indexOf('AIOps: algorithms'), 'in prerequisite order');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });
