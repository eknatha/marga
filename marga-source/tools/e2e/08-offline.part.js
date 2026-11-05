  // ------------------------------------------------------------ offline
  await test('service worker installs and the site works offline after one visit', async () => {
    const { ctx, page } = await open({ sw: true });
    await page.goto(BASE + '/');
    await page.waitForSelector('#main h1');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForSelector('#main h1');
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector('#main h1', { timeout: 8000 });
    ok(/Learn to fix production/.test(await page.textContent('#main h1')), 'home renders offline');
    await page.goto(BASE + '/cheatsheets/docker.html');
    ok(/Docker/.test(await page.title()), 'cheat sheet page available offline');
    await ctx.setOffline(false);
    await ctx.close();
  });

  // ------------------------------------------------------------ every page: errors, git, overflow, structure
  const unlockedAll = () => { const p = emptyProgress(); p.lessons = doneMap(allLessons); return p; };
  for (const vp of [{ name: 'desktop', viewport: { width: 1280, height: 900 } }, { name: 'mobile', viewport: { width: 390, height: 844 } }]) {
    await test(`all ${allLessons.length} lessons, modules and views render cleanly on ${vp.name}`, async () => {
      const { ctx, page, issues } = await open({ viewport: vp.viewport });
      await go(page, '/');
      await setProgress(page, unlockedAll());
      const routes = ['/', '/paths', ...data.paths.live.map((p) => `/path/${p.id}`), ...data.modules.map((m) => `/module/${m.id}`), '/cheatsheets', ...Object.keys(data.sheets).map((s) => `/cheatsheet/${s}`), '/review', '/labs', '/progress', '/interview', '/practice', '/cases', '/architecture', ...data.arch.map((a) => `/architecture/${a.id}`), '/calculators', '/drills', ...data.modules.map((m) => `/drills/${m.id}`), '/interview/mock', '/flashcards', '/today', '/daily', '/glossary', '/glossary/inode', '/placement', '/skills', '/build-path', '/build-path/interview', '/testout/git', '/playground/go', '/playground/hcl', '/playground/sql', '/skill-lab', ...['header', 'description', 'secret', 'script', 'size', 'scratch'].map((x) => `/skill-lab/${x}`), '/explainers', ...EXPL_IDS.map((x) => `/explainers/${x}`), '/subnet', '/playground/yaml', '/playground/python', '/games', '/reading', '/license', '/capstones', '/badges', '/badge-check', '/badge/stage-linux', '/badge/stage-ansible', '/badge/path-devops', '/badge/path-devsecops', '/walkthroughs', ...data.walkthroughs.map((w) => `/walkthrough/${w.id}`), ...data.games.map((g) => `/game/${g.id}`), ...data.capstones.map((c) => `/capstone/${c.id}`), ...allLessons.map((l) => `/lesson/${l}`)];
      const problems = [];
      for (const r of routes) {
        await nav(page, r);
        await page.waitForSelector('#main h1');
        const info = await page.evaluate(() => ({
          h1: document.querySelectorAll('#main h1').length,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          text: document.body.innerText,
          emptyBtn: [...document.querySelectorAll('button')].filter((b) => !(b.innerText.trim() || b.getAttribute('aria-label'))).length,
          imgNoAlt: [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).length,
          hash: location.hash
        }));
        if (info.hash !== '#' + r) problems.push(`${r}: ended at ${info.hash}`);
        if (info.h1 !== 1) problems.push(`${r}: ${info.h1} h1 elements`);
        if (info.overflow > 1) problems.push(`${r}: horizontal overflow ${info.overflow}px`);
        if (/\bgit(ops|leaks|ea)/i.test(info.text)) problems.push(`${r}: mentions git`);
        if (info.emptyBtn) problems.push(`${r}: ${info.emptyBtn} unnamed buttons`);
        if (info.imgNoAlt) problems.push(`${r}: image without alt`);
        if (/undefined|\[object Object\]|NaN/.test(info.text)) problems.push(`${r}: shows undefined/NaN/[object Object]`);
        if (r.startsWith('/lesson/')) {
          const l = data.lessons[r.slice(8)];
          const h2 = await page.locator('#prose h2').count();
          if (h2 < 4) problems.push(`${r}: only ${h2} sections`);
          if (!(await page.locator('#qstart').count())) problems.push(`${r}: no quiz start button`);
          if (!(await page.locator('#card').count())) problems.push(`${r}: no flashcards`);
          void l;
        }
      }
      eq(problems.length, 0, '\n' + problems.slice(0, 25).join('\n'));
      eq(issues.length, 0, issues.slice(0, 5).join(' | '));
      await ctx.close();
    });
  }

  await test('mobile navigation menu opens and links work', async () => {
    const { ctx, page } = await open({ viewport: { width: 390, height: 844 } });
    await page.goto(BASE + '/');
    await page.waitForSelector('#main h1');
    ok(!(await page.isVisible('#topnav a[data-nav="paths"]')), 'nav hidden before opening');
    await page.click('[data-act="menu"]');
    ok(await page.isVisible('#topnav a[data-nav="paths"]'), 'nav visible after opening');
    eq(await page.getAttribute('[data-act="menu"]', 'aria-expanded'), 'true', 'aria-expanded');
    await page.click('#topnav a[data-nav="cheatsheets"]');
    await page.waitForSelector('#sheet-list');
    ok(!(await page.isVisible('#topnav a[data-nav="paths"]')), 'menu closes after navigation');
    await ctx.close();
  });

