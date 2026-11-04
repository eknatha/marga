  // ------------------------------------------------------------ flashcards and review
  await test('flashcards flip, rate and reschedule; review lists cards that are due', async () => {
    const { ctx, page } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    await page.evaluate(() => document.getElementById('cards').scrollIntoView());
    const front = await page.textContent('#card .txt');
    await page.click('#card');
    ok(await page.isVisible('#rate'), 'rating buttons appear after flipping');
    const back = await page.textContent('#card .txt');
    ok(back !== front, 'card shows the other side');
    await page.click('#rate button[data-r="again"]');
    let p = await progress(page);
    eq(p.cards[`${id}#0`].box, 1, 'again puts the card in box 1');
    ok(p.cards[`${id}#0`].due <= Date.now() + 1000, 'again is due immediately');
    // finish the deck: rate the remaining cards good, then the repeated card
    for (let k = 0; k < 10 && !(await page.locator('#deck .result').count()); k++) {
      await page.click('#card'); await page.click('#rate button[data-r="good"]');
    }
    ok(await page.locator('#deck .result').count() > 0, 'deck completes');
    p = await progress(page);
    const boxes = Object.values(p.cards).map((c) => c.box);
    ok(boxes.every((b) => b >= 1), 'all cards in a box');
    // review: make a card due
    p.cards[`${id}#2`] = { box: 1, due: Date.now() - 1000 };
    p.lessons[id] = { done: true, best: 100, at: 1, attempts: 1 };   // review only lists cards from passed lessons
    await setProgress(page, p);
    await nav(page, '/review');
    await page.waitForSelector('#review-deck');
    ok(await page.locator('#review-deck .card').count() > 0, 'review shows a due card');
    // not due yet cards are not shown
    const p2 = emptyProgress(); p2.lessons[id] = { done: true, best: 100, at: 1, attempts: 1 };
    for (let k = 0; k < 4; k++) p2.cards[`${id}#${k}`] = { box: 3, due: Date.now() + 5 * 86400000 };
    await setProgress(page, p2);
    await nav(page, '/review');
    await page.waitForTimeout(100);
    eq(await page.locator('#review-deck .card').count(), 0, 'nothing due when the only card is scheduled later');
    await ctx.close();
  });

  // ------------------------------------------------------------ search
  await test('search: slash and ctrl+k open it, results rank, enter navigates, escape closes', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    await page.keyboard.press('/');
    await page.waitForSelector('#sq');
    await page.fill('#sq', 'terraform state');
    await page.waitForSelector('#sres li');
    const first = await page.textContent('#sres li:first-child .t');
    ok(/state/i.test(first), 'top result relevant: ' + first);
    await page.keyboard.press('Escape');
    eq(await page.locator('#smodal').count(), 0, 'escape closes');
    await page.keyboard.press('Control+k');
    await page.waitForSelector('#sq');
    await page.fill('#sq', 'prometheus');
    await page.waitForSelector('#sres li');
    const kinds = await page.locator('#sres li .k').allTextContents();
    ok(kinds.includes('Cheat sheet') && kinds.includes('Lesson'), 'results include lessons and cheat sheets: ' + kinds.join(','));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);
    ok(/^#\/(cheatsheet|lesson|module|glossary|interview|explainers)\//.test(await page.evaluate(() => location.hash)), 'navigated: ' + await page.evaluate(() => location.hash));
    await go(page, '/');
    await page.keyboard.press('/');
    await page.fill('#sq', 'zzzzqqq');
    ok(/Nothing matches/.test(await page.textContent('#shint')), 'empty state message');
    await ctx.close();
  });

  await test('search never opens a locked lesson; it lands on the module gate', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    await page.keyboard.press('/');
    await page.fill('#sq', 'admission controllers');
    await page.fill('#sq', 'rbac');
    await page.waitForSelector('#sres li');
    const li = page.locator('#sres li', { hasText: 'RBAC' }).first();
    await li.click();
    await page.waitForTimeout(150);
    ok(!/#\/lesson\/kubernetes/.test(await page.evaluate(() => location.hash)), 'locked lesson must not open');
    await ctx.close();
  });

