  // ------------------------------------------------------------ full run through each role path
  for (const p of data.paths.live) {
    await test(`complete the ${p.title} path through the UI, in order`, async () => {
      const { ctx, page, issues } = await open();
      await go(page, `/path/${p.id}`);
      await page.evaluate((id) => { const s = JSON.parse(localStorage.getItem('ea.progress.v1') || 'null'); void s; }, p.id);
      let lessonsDone = 0;
      for (const mid of p.modules) {
        const m = MODS[mid];
        await nav(page, `/module/${mid}`);
        await page.waitForSelector('.jobs');
        eq(await page.locator('.gate').count(), 0, `${mid} should be unlocked when its turn comes in the ${p.id} path`);
        for (const lid of m.lessons) {
          await passLesson(page, lid);
          lessonsDone++;
        }
        const prog = await progress(page);
        ok(m.lessons.every((l) => prog.lessons[l]?.done), `${mid} fully recorded`);
        await nav(page, `/module/${mid}`);
        ok(/Passed/.test(await page.textContent('.stage-hero, .page-head, #main')), `${mid} shows passed`);
      }
      await nav(page, `/path/${p.id}`);
      const text = await page.evaluate(() => document.querySelector('#main').innerText);
      ok(/100%/.test(text) || p.modules.every((m) => text.includes(MODS[m].title)), 'path page after completion');
      eq(issues.length, 0, issues.join(' | '));
      ok(lessonsDone >= 30, `lessons completed: ${lessonsDone}`);
      await ctx.close();
    });
  }

  await test('completing the last lesson of a module announces the stage and what it opens', async () => {
    const { ctx, page } = await open();
    const lessons = MODS.linux.lessons;
    await go(page, '/');
    const prog = emptyProgress(); prog.lessons = doneMap(lessons.slice(0, -1));
    await setProgress(page, prog);
    await nav(page, `/lesson/${lessons[lessons.length - 1]}`);
    await page.waitForSelector('#qstart');
    await takeQuiz(page, lessons[lessons.length - 1], 0);
    await page.waitForSelector('.stage-pass');
    const t = await page.textContent('.stage-pass');
    ok(/Stage passed: Linux/.test(t), t);
    ok(/Shell scripting/.test(t) && /Networking/.test(t) && /Docker/.test(t) && /Terraform/.test(t) && /Observability/.test(t), 'names what opens: ' + t);
    ok(!/Kubernetes/.test(t), 'must not claim Kubernetes opens');
    await ctx.close();
  });

  // ------------------------------------------------------------ streaks and progress
  await test('streak: consecutive days, a gap, and best streak', async () => {
    const { ctx, page } = await open();
    await go(page, '/progress');
    const t0 = await today(page, 0), t1 = await today(page, -1), t2 = await today(page, -2), t5 = await today(page, -5), t6 = await today(page, -6);
    const cases = [
      { days: [t2, t1, t0], cur: 3, best: 3 },
      { days: [t5, t2, t1], cur: 2, best: 2 },       // today not done yet: streak still alive from yesterday
      { days: [t6, t5, t2], cur: 0, best: 2 },       // gap of two days: streak broken
      { days: [], cur: 0, best: 0 }
    ];
    for (const c of cases) {
      const prog = emptyProgress(); prog.days = c.days;
      await setProgress(page, prog);
      await nav(page, '/progress');
      const vals = await page.locator('.today dd').allTextContents();
      const cur = parseInt(vals[0], 10), best = parseInt(vals[1], 10);
      eq(cur, c.cur, `current streak for ${JSON.stringify(c.days)}`);
      eq(best, c.best, `best streak for ${JSON.stringify(c.days)}`);
      eq(parseInt(await page.textContent('.streak b'), 10), c.cur, 'header streak badge');
    }
    await ctx.close();
  });

  await test('passing a quiz and rating a card both count as activity for today', async () => {
    const { ctx, page } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    const t0 = await today(page, 0);
    eq((await progress(page))?.days?.length || 0, 0, 'no activity yet');
    await page.evaluate(() => document.getElementById('cards').scrollIntoView());
    await page.click('#card');
    await page.click('#rate button[data-r="good"]');
    let p = await progress(page);
    eq(JSON.stringify(p.days), JSON.stringify([t0]), 'card rating records today');
    ok(p.cards[`${id}#0`] && p.cards[`${id}#0`].box === 1, 'card moved to box 1');
    await takeQuiz(page, id, 0);
    await page.waitForSelector('.result.pass');
    p = await progress(page);
    eq(p.days.length, 1, 'still one active day');
    eq(parseInt(await page.textContent('.streak b'), 10), 1, 'streak badge shows 1');
    await ctx.close();
  });

  await test('per-module completion and totals on the progress page', async () => {
    const { ctx, page } = await open();
    await go(page, '/progress');
    const prog = emptyProgress();
    prog.lessons = doneMap([...MODS.linux.lessons, ...MODS.bash.lessons.slice(0, 2)]);
    await setProgress(page, prog);
    await nav(page, '/progress');
    const rows = await page.locator('.modbars li').allTextContents();
    ok(rows.some((r) => /Linux/.test(r) && r.includes(`${MODS.linux.lessons.length}/${MODS.linux.lessons.length}`)), 'linux full');
    ok(rows.some((r) => /Shell scripting/.test(r) && r.includes(`2/${MODS.bash.lessons.length}`)), 'bash partial: ' + rows.join(' | '));
    ok(rows.some((r) => /Kubernetes/.test(r) && r.includes(`0/${MODS.kubernetes.lessons.length}`)), 'kubernetes zero');
    const total = await page.locator('.today dd').nth(2).textContent();
    ok(total.startsWith(String(MODS.linux.lessons.length + 2)), 'lessons passed total: ' + total);
    await ctx.close();
  });

  await test('progress persists after reload, exports, resets after two clicks, and imports back', async () => {
    const { ctx, page } = await open();
    const lessons = MODS.linux.lessons;
    const prog = emptyProgress(); prog.lessons = doneMap(lessons.slice(0, 2)); prog.days = [await today(page, 0)];
    await go(page, '/');
    await setProgress(page, prog);
    await nav(page, '/progress');
    await page.reload(); await page.waitForSelector('.modbars');
    eq((await progress(page)).lessons[lessons[1]].done, true, 'persisted across reload');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="export"]')]);
    const file = path.join(require('os').tmpdir(), `export-${Date.now()}.json`);
    await dl.saveAs(file);
    const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
    eq(exported.v, 1, 'export version');
    ok(exported.lessons[lessons[0]].done, 'export has lessons');
    ok(/^marga-progress-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), 'file name ' + dl.suggestedFilename());
    // reset needs two clicks
    await page.click('#reset-btn');
    eq(Object.keys((await progress(page)).lessons).length, 2, 'first click does not reset');
    ok(/confirm/i.test(await page.textContent('#reset-btn')), 'button asks to confirm');
    await page.click('#reset-btn');
    eq(Object.keys((await progress(page)).lessons).length, 0, 'second click resets');
    // import
    await page.setInputFiles('#import-file', file);
    await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('ea.progress.v1')).lessons).length === 2);
    // bad file rejected
    const bad = path.join(require('os').tmpdir(), `bad-${Date.now()}.json`);
    fs.writeFileSync(bad, '{"hello":1}');
    await page.setInputFiles('#import-file', bad);
    await page.waitForFunction(() => /not a MARGA progress export/.test(document.getElementById('toast').textContent));
    eq(Object.keys((await progress(page)).lessons).length, 2, 'bad import leaves data intact');
    await ctx.close();
  });

  await test('corrupt or foreign localStorage data does not break the app', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/');
    for (const junk of ['not json', '{"v":2}', '{"v":1,"lessons":null}', '[]']) {
      await page.evaluate((j) => localStorage.setItem('ea.progress.v1', j), junk);
      await page.reload();
      await page.waitForSelector('#main h1');
      ok(await page.locator('.tree .node').count() > 0, `app renders with ${junk}`);
    }
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('works when localStorage is unavailable (memory fallback)', async () => {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(BASE + '/#/lesson/linux/filesystem-and-navigation');
    await page.waitForSelector('#me-dlg .me-card'); await page.fill('#me-name', 'Temp'); await page.click('[data-me=save]'); await page.waitForSelector('#me-dlg', { state: 'detached' });
    await page.waitForSelector('#qstart');
    await takeQuiz(page, 'linux/filesystem-and-navigation', 0);
    await page.waitForSelector('.result.pass');
    eq(errs.length, 0, errs.join(' | '));
    await ctx.close();
  });

