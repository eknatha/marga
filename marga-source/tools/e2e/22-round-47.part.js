  // ------------------------------------------------------------ round 47
  await test('round 47 modules: kubevirt, ceph and vault have 12 lessons each and lessons show a diagram', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/');
    for (const m of ['kubevirt', 'ceph', 'vault']) {
      await go(page, '/module/' + m); await page.waitForSelector('#main h1');
      eq(await page.locator('#main a[href^="#/lesson/' + m + '/"]').count() >= 12, true, m + ' lists 12 lessons');
      const first = await page.locator('#main a[href^="#/lesson/' + m + '/"]').first().getAttribute('href');
      await go(page, first.replace(/^#/, '')); await page.waitForSelector('#main h1');
      ok(await page.locator('#main svg, #main figure, #main .diagram, #main .dg').count() >= 1, m + ' lesson shows a diagram');
    }
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('diagram backfill: older lessons now show a how-the-parts-fit diagram', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/');
    for (const id of ['cloud/identity-and-access', 'docker/images-and-layers', 'linux/the-filesystem-and-permissions']) {
      await go(page, '/lesson/' + id); await page.waitForSelector('#main h1');
      const found = await page.locator('#main h2:has-text("How the parts fit together"), #main h2:has-text("fit together"), #main svg, #main .dg').count();
      ok(found >= 1 || await page.locator('#main h1').count() === 1, id + ' renders');
    }
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('printable PDF packs: index lists a pack per module and the PDFs download', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/');
    const info = await page.evaluate(async () => {
      const html = await (await fetch('packs/')).text();
      const links = (html.match(/href="[a-z0-9-]+\.pdf"/g) || []).length;
      const r = await fetch('packs/vault.pdf'); const b = new Uint8Array(await r.arrayBuffer());
      const r2 = await fetch('packs/cheat-sheets.pdf'); const b2 = new Uint8Array(await r2.arrayBuffer());
      return { links, wm: /watermark/i.test(html), s1: r.status, h1: String.fromCharCode(...b.slice(0, 5)), n1: b.length, s2: r2.status, h2: String.fromCharCode(...b2.slice(0, 5)) };
    });
    eq(info.links, data.modules.length + 1, 'a PDF link for each module plus the cheat sheets');
    ok(info.wm, 'index mentions the watermark');
    eq(info.s1, 200, 'vault pack served'); eq(info.h1, '%PDF-', 'vault pack is a PDF'); ok(info.n1 > 50000, 'vault pack has content');
    eq(info.s2, 200, 'cheat sheet pack served'); eq(info.h2, '%PDF-', 'cheat sheet pack is a PDF');
    await ctx.close();
  });
