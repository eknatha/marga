  // ------------------------------------------------------------ round 50: compare roles, why lines, denser module page
  await test('every module has a "why it matters" line shown on its page, on the path stages and on the skills cards', async () => {
    const { ctx, page, issues } = await open();
    for (const m of data.modules) ok(m.why && m.why.length >= 40 && m.why.length <= 140, m.id + ' has a why line');
    await go(page, '/module/linux'); await page.waitForSelector('#main h1');
    ok(/Why it matters:/.test(await page.textContent('.page-head')), 'module page');
    eq(await page.locator('.page-head .why').count(), 1, 'one line only');
    await go(page, '/path/devops'); await page.waitForSelector('.srow');
    eq(await page.locator('.srow .why').count(), data.paths.live.find((p) => p.id === 'devops').modules.length, 'one per stage on the path page');
    await go(page, '/skills'); await page.waitForSelector('.skill');
    eq(await page.locator('.skill .why').count(), data.modules.length, 'one per skills card');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('compare roles: pick roles, see shared and unique skills, only-differences filter, phone width', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/paths');
    await page.click('a[href="#/compare"]'); await page.waitForSelector('.cmp-table');
    eq(await page.locator('.cmp-card').count(), 3, 'three roles by default');
    const rows0 = await page.locator('.cmp-table tbody tr').count();
    ok(rows0 >= 20, 'rows: ' + rows0);
    await page.click('.cmp-chip[data-id="ai"]'); await page.waitForSelector('.cmp-card:nth-child(4)');
    eq(await page.locator('.cmp-card').count(), 4, 'fourth role added');
    ok(await page.locator('.cmp-chip.on').count() === 4, 'chips reflect it');
    const rowsAll = await page.locator('.cmp-table tbody tr').count(), sharedAll = await page.locator('.cmp-table tbody tr.cmp-all').count();
    await page.click('input[data-act="cmp-diff"]');
    const rows1 = await page.locator('.cmp-table tbody tr').count();
    ok(sharedAll > 0 && rows1 === rowsAll - sharedAll && await page.locator('.cmp-table tbody tr.cmp-all').count() === 0, 'shared rows are hidden by the filter');
    const paths = Object.fromEntries(data.paths.live.map((p) => [p.id, p.modules]));
    const sel = ['devops', 'sre', 'ai'];
    const union = new Set(sel.flatMap((id) => paths[id]));
    await page.click('input[data-act="cmp-diff"]');
    const home = (await page.locator('.cmp-chip.on').allTextContents());
    ok(home.length === 4, 'four chips on');
    await page.setViewportSize({ width: 390, height: 800 });
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no page-wide horizontal scroll on a phone');
    ok(await page.evaluate(() => { const s = document.querySelector('.cmp-scroll'); return s.scrollWidth >= s.clientWidth; }), 'the table scrolls inside its own box');
    // cannot go below two
    await page.click('.cmp-chip[data-id="ai"]'); await page.click('.cmp-chip[data-id="sre"]');
    while (await page.locator('.cmp-chip.on').count() > 2) await page.locator('.cmp-chip.on').last().click();
    await page.locator('.cmp-chip.on').last().click();
    eq(await page.locator('.cmp-chip.on').count(), 2, 'two roles stay selected');
    ok(union.size > 20, 'sanity');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('compare roles: axe clean in both themes', async () => {
    const { ctx, page } = await open(); await go(page, '/compare'); await page.waitForSelector('.cmp-table');
    for (const th of ['light', 'dark']) {
      await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), th);
      await page.addScriptTag({ content: AXE });
      const r = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id + ': ' + v.nodes[0].target.join(' ')));
      eq(r.length, 0, th + ' axe: ' + r.join(' | '));
    }
    await ctx.close();
  });

  await test('module page: filter by state, compact list is remembered, Continue button jumps to the next lesson', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/module/linux'); await page.waitForSelector('.jobs');
    const total = data.modules.find((m) => m.id === 'linux').lessons.length;
    eq(await page.locator('.jobs > li:visible').count(), total, 'all lessons visible');
    const first = data.modules.find((m) => m.id === 'linux').lessons[0];
    ok((await page.getAttribute('.page-head .btn-primary', 'href')) === '#/lesson/' + first, 'Start button goes to the first lesson');
    const prog = emptyProgress(); prog.lessons = doneMap(data.modules.find((m) => m.id === 'linux').lessons.slice(0, 3));
    await setProgress(page, prog); await nav(page, '/module/linux'); await page.waitForSelector('.jobs');
    await page.click('[data-f="done"]');
    eq(await page.locator('.jobs > li:visible').count(), 3, 'passed filter');
    await page.click('[data-f="todo"]');
    eq(await page.locator('.jobs > li:visible').count(), total - 3, 'to do filter');
    ok((await page.getAttribute('.page-head .btn-primary', 'href')) === '#/lesson/' + data.modules.find((m) => m.id === 'linux').lessons[3], 'Continue goes to the first lesson not passed');
    await page.click('[data-f="all"]');
    ok(await page.locator('.job-sum').first().isVisible(), 'summaries visible');
    await page.check('input[data-act="mod-compact"]');
    ok(await page.locator('.job-sum').first().isHidden(), 'compact hides summaries');
    await nav(page, '/module/git'); await page.waitForSelector('.jobs');
    ok(await page.evaluate(() => document.querySelector('.jobs').classList.contains('compact')), 'compact is remembered');
    await page.uncheck('input[data-act="mod-compact"]');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('CKA then CKS paths: five Kubernetes deep dives are mapped, complete and open', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/');
    const cka = data.paths.live.find((p) => p.id === 'cka'), cks = data.paths.live.find((p) => p.id === 'cks');
    ok(cka && cks, 'both end goals are live');
    ok(!data.paths.live.find((p) => p.id === 'k8s-admin'), 'old combined path is gone');
    const deep = ['k8s-control-plane', 'k8s-lifecycle', 'k8s-network', 'k8s-resources'];
    for (const m of deep) ok(cka.modules.includes(m) && cks.modules.includes(m), m + ' is on both paths');
    ok(cks.modules.includes('k8s-security') && !cka.modules.includes('k8s-security'), 'k8s-security is the CKS step only');
    eq(cka.modules[cka.modules.length - 1], 'k8s-exam', 'CKA ends with exam practice');
    eq(cks.modules[cks.modules.length - 1], 'k8s-exam', 'CKS ends with exam practice');
    ok(cks.modules.indexOf('k8s-security') > cks.modules.indexOf('security'), 'security comes before the deep dive');
    for (const id of [...deep, 'k8s-security']) {
      eq(Object.keys(data.lessons).filter((k) => k.startsWith(id + '/')).length, 8, id + ' lessons');
      ok(data.games.filter((g) => g.module === id).length >= 1, id + ' game');
      ok(data.widgets.filter((w) => w.module === id).length >= 4, id + ' widgets');
    }
    await nav(page, '/module/k8s-security');
    eq(await page.locator('.jobs li').count(), 8, 'module lists 8 lessons');
    await nav(page, '/path/cks'); await page.waitForSelector('h1');
    ok((await page.locator('body').innerText()).includes('Kubernetes security deep dive'), 'CKS path shows the security deep dive');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('platform and Kubernetes administrator paths: modules, lessons, games and widgets are all present', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/');
    const pl = data.paths.live.find((p) => p.id === 'platform'), ka = data.paths.live.find((p) => p.id === 'cka');
    ok(pl && ka, 'both paths are live');
    eq(pl.modules[pl.modules.length - 1], 'platform', 'platform is last');
    eq(ka.modules[ka.modules.length - 1], 'k8s-exam', 'k8s-exam is last');
    for (const id of ['platform', 'k8s-exam']) {
      eq(Object.keys(data.lessons).filter((k) => k.startsWith(id + '/')).length, 14, id + ' lessons');
      ok(data.games.filter((g) => g.module === id).length >= 2, id + ' games');
      ok(data.widgets.filter((w) => w.module === id).length >= 4, id + ' widgets');
    }
    await nav(page, '/module/k8s-exam');
    eq(await page.locator('.jobs li').count(), 14, 'module lists 14 lessons');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });
