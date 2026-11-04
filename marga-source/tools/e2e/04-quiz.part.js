  // ------------------------------------------------------------ quiz
  await test('quiz: 2 of 4 fails and keeps the next lesson locked; 3 of 4 passes and unlocks it', async () => {
    const { ctx, page, issues } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    await takeQuiz(page, id, 2);
    await page.waitForSelector('.result.fail');
    ok(/2 of 4 correct/.test(await page.textContent('.result')), 'fail result text');
    eq((await progress(page)).lessons[id]?.done, undefined, 'lesson not marked done after failing');
    ok(await page.locator('.btn-disabled').count() > 0, 'next still locked');
    await page.click('#qagain');
    await page.waitForSelector('.qtext');
    // restart by reloading the lesson to get a clean quiz state
    await nav(page, `/lesson/${id}`);
    await page.reload();
    await page.waitForSelector('#qstart');
    await takeQuiz(page, id, 1);
    await page.waitForSelector('.result.pass');
    ok(/Passed with 75%/.test(await page.textContent('.result')), 'pass at 3 of 4: ' + await page.textContent('.result'));
    const p = await progress(page);
    eq(p.lessons[id].done, true, 'lesson done');
    eq(p.lessons[id].best, 75, 'best score');
    const nextHref = await page.getAttribute('#next-slot a.btn-primary', 'href');
    eq(nextHref, '#/lesson/linux/users-groups-permissions', 'next link');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('quiz option order is shuffled between attempts', async () => {
    const { ctx, page } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    const seen = new Set();
    for (let k = 0; k < 14 && seen.size < 2; k++) {
      await page.reload(); await page.waitForSelector('#qstart');
      await page.click('#qstart');
      // normalise by question so we compare the same question across attempts
      const key = await page.evaluate(() => document.querySelector('.qtext').textContent + '::' + [...document.querySelectorAll('.opt')].map((b) => b.dataset.oi).join(''));
      seen.add(key);
    }
    ok(seen.size >= 2, 'option and question order never changed across 14 attempts');
    await ctx.close();
  });

  await test('quiz feedback: correct answer is highlighted and an explanation is shown', async () => {
    const { ctx, page } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    await page.click('#qstart');
    const text = await page.textContent('.qtext');
    const q = data.lessons[id].quiz.find((x) => x.q === text);
    await page.locator(`.opt:not([data-oi="${q.answer}"])`).first().click();
    eq(await page.locator('.opt.right').count(), 1, 'one correct highlighted');
    eq(await page.locator('.opt.wrong').count(), 1, 'one wrong highlighted');
    ok((await page.textContent('#fb')).includes('Not quite'), 'feedback text');
    ok((await page.textContent('#fb')).length > 40, 'explanation present');
    eq(await page.locator('.opt:not([disabled])').count(), 0, 'options disabled after answering');
    await ctx.close();
  });

