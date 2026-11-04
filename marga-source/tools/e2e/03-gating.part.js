  // ------------------------------------------------------------ gating
  await test('fresh learner: only the first lesson of a root module opens; others redirect', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    await nav(page, '/lesson/linux/users-groups-permissions');
    await page.waitForFunction(() => location.hash === '#/module/linux');
    eq(await page.evaluate(() => location.hash), '#/module/linux', 'redirected to module');
    ok(/Locked/.test(await page.textContent('#toast')), 'toast says Locked');
    await nav(page, '/lesson/docker/containers-and-images');
    await page.waitForFunction(() => location.hash === '#/module/docker');
    eq(await page.evaluate(() => location.hash), '#/module/docker', 'locked module redirects');
    await nav(page, '/module/docker');
    ok(await page.locator('.gate').count() > 0, 'locked module shows a gate message');
    ok(/Linux/.test(await page.textContent('.gate')), 'gate names the prerequisite');
    await nav(page, '/lesson/linux/filesystem-and-navigation');
    await page.waitForSelector('#qstart');
    ok(await page.locator('.btn-disabled').count() > 0, 'next lesson button is locked before passing');
    await ctx.close();
  });

  await test('every module that requires another is locked until all prerequisites are complete', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    for (const m of data.modules.filter((x) => x.requires.length)) {
      // all prerequisites done except one at a time
      for (const missing of m.requires) {
        const have = m.requires.filter((r) => r !== missing).flatMap((r) => MODS[r].lessons);
        // make prerequisites of prerequisites irrelevant: gating only checks direct requires
        const prog = emptyProgress(); prog.lessons = doneMap(have);
        await setProgress(page, prog);
        await nav(page, `/lesson/${MODS[m.id].lessons[0]}`);
        await page.waitForTimeout(80);
        eq(await page.evaluate(() => location.hash), `#/module/${m.id}`, `${m.id} must stay locked while ${missing} is incomplete`);
      }
      const prog = emptyProgress(); prog.lessons = doneMap(m.requires.flatMap((r) => MODS[r].lessons));
      await setProgress(page, prog);
      await nav(page, `/lesson/${MODS[m.id].lessons[0]}`);
      await page.waitForSelector('#qstart');
      eq(await page.evaluate(() => location.hash), `#/lesson/${MODS[m.id].lessons[0]}`, `${m.id} should open when all prerequisites are done`);
    }
    await ctx.close();
  });

  await test('lessons inside a module unlock strictly one after another', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    const lessons = MODS.linux.lessons;
    for (let k = 1; k < lessons.length; k++) {
      const prog = emptyProgress(); prog.lessons = doneMap(lessons.slice(0, k - 1));
      await setProgress(page, prog);
      await nav(page, `/lesson/${lessons[k]}`);
      await page.waitForTimeout(60);
      eq(await page.evaluate(() => location.hash), '#/module/linux', `lesson ${k + 1} must be locked when ${k - 1} lessons are done`);
      prog.lessons = doneMap(lessons.slice(0, k));
      await setProgress(page, prog);
      await nav(page, `/lesson/${lessons[k]}`);
      await page.waitForSelector('#qstart');
      eq(await page.evaluate(() => location.hash), `#/lesson/${lessons[k]}`, `lesson ${k + 1} opens after lesson ${k}`);
    }
    await ctx.close();
  });

