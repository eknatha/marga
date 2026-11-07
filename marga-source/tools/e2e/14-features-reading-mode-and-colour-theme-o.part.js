  await test('features: reading mode and colour theme options in the Aa panel', async () => {
    const { ctx, page } = await open(); await go(page, '/'); await setProgress(page, allDone()); await go(page, '/lesson/security/secrets-management');
    await page.click('[data-act=read-toggle]');
    eq(await page.evaluate(() => document.documentElement.getAttribute('data-a-read')), 'on', 'reading mode on');
    eq(await page.evaluate(() => getComputedStyle(document.querySelector('.toc')).display), 'none', 'toc hidden');
    await page.waitForSelector('#read-bar');
    await page.reload(); await page.waitForSelector('.prose');
    eq(await page.evaluate(() => document.documentElement.getAttribute('data-a-read')), 'on', 'reading mode remembered');
    await page.click('[data-act=a11y]'); await page.selectOption('#a11y-theme', 'dark');
    eq(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'dark', 'dark theme');
    await page.selectOption('#a11y-theme', 'auto');
    eq(await page.evaluate(() => document.documentElement.getAttribute('data-theme')), 'light', 'auto follows the device (light in tests)');
    await page.selectOption('#a11y-read', 'off');
    eq(await page.evaluate(() => document.documentElement.getAttribute('data-a-read')), null, 'reading mode off');
    await ctx.close();
  });

  await test('daily challenge: bonus drill and predict item appear and the drill can be answered', async () => {
    const { ctx, page } = await open(); await go(page, '/daily');
    await page.waitForSelector('#daily-bonus .drill'); ok(await page.locator('#daily-bonus .predict').count() === 1, 'predict bonus');
    await page.locator('#daily-bonus .drill input').first().check(); await page.click('#daily-bonus [data-act=drill-check]');
    await page.waitForSelector('#daily-bonus .drill-res:not([hidden])');
    await page.click('#daily-bonus [data-act=predict-reveal]'); ok(await page.locator('#daily-bonus .predict-out').isVisible(), 'reveal');
    await ctx.close();
  });

  await test('devsecops: path, skill tree node and requirements', async () => {
    const { ctx, page } = await open(); await go(page, '/paths');
    await page.waitForSelector('.tab'); const tabs = await page.locator('.tab').allTextContents();
    ok(tabs.some((t) => /DevSecOps/.test(t)), 'tab: ' + tabs.join(','));
    await page.locator('.tab', { hasText: 'DevSecOps' }).click(); await page.waitForSelector('.node[data-id="security"]');
    eq(await page.locator('.node').count(), data.paths.live.find((x) => x.id === 'devsecops').modules.length, 'devsecops tree skills');
    eq(await page.locator('.node[data-id="security"].s-lock').count(), 1, 'security is locked at the start');
    await ctx.close();
  });


  await test('next step panel: first lesson says take the check, a passed lesson links onward with related practice', async () => {
    const { ctx, page } = await open(); await go(page, '/lesson/linux/filesystem-and-navigation');
    await page.waitForSelector('#next-step');
    ok(/Take the lesson check/.test(await page.textContent('#next-step')), 'check first');
    ok((await page.locator('#next-step .ns-list a').count()) >= 4, 'related links');
    const hrefs = await page.locator('#next-step .ns-list a').evaluateAll((a) => a.map((x) => x.getAttribute('href')));
    ok(hrefs.some((h) => /^#\/drills\/linux/.test(h)) && hrefs.some((h) => /^#\/cheatsheet\/linux/.test(h)), 'drill and sheet: ' + hrefs.join(' '));
    await page.waitForSelector('#qstart'); await takeQuiz(page, 'linux/filesystem-and-navigation', 0); await page.waitForSelector('.result.pass');
    await page.waitForFunction(() => /Next lesson/.test(document.querySelector('#next-step').textContent), null, { timeout: 5000 });
    await ctx.close();
  });

  await test('weak spots: missed quiz questions and drills are listed, a correct answer clears them, a review session works', async () => {
    const { ctx, page } = await open(); await go(page, '/lesson/linux/filesystem-and-navigation');
    await page.waitForSelector('#qstart'); await takeQuiz(page, 'linux/filesystem-and-navigation', 4);
    await page.waitForSelector('.result.fail');
    let wk = (await progress(page)).wk || {};
    ok(Object.keys(wk).filter((k) => k.startsWith('q:')).length >= 4, 'quiz misses saved: ' + Object.keys(wk).join(','));
    await go(page, '/drills/linux'); await page.waitForSelector('.drill');
    const card = page.locator('.drill').first();
    await card.locator('input[value="0"]').first().check(); await card.locator('[data-act=drill-check]').click();
    wk = (await progress(page)).wk || {};
    ok(Object.keys(wk).some((k) => k.startsWith('d:')), 'drill miss saved');
    await go(page, '/weak'); await page.waitForSelector('#weak-count');
    ok(/5 to review/.test(await page.textContent('#weak-count')), await page.textContent('#weak-count'));
    await page.click('[data-act=weak-start]');
    for (let i = 0; i < 5; i++) {
      await page.waitForSelector('.opt[data-ok="1"]');
      await page.locator('.opt[data-ok="1"]').first().click(); await page.click('#wnext');
    }
    ok(/5 cleared/.test(await page.textContent('#weak-root')), await page.textContent('#weak-root'));
    wk = (await progress(page)).wk || {}; eq(Object.keys(wk).length, 0, 'list empty after clearing');
    await nav(page, '/practice'); await nav(page, '/weak'); await page.waitForSelector('#weak-root .empty');
    await go(page, '/practice'); ok(/Weak-spot review/.test(await page.textContent('#pr')), 'hub card');
    await ctx.close();
  });

  await test('weak spots: a hard flashcard is listed and comes back until marked Got it', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    const prog = allDone(); prog.wk = { 'c:linux/filesystem-and-navigation#0': { k: 'c', r: 'linux/filesystem-and-navigation#0', n: 2, at: 1 } };
    await setProgress(page, prog);
    await go(page, '/weak'); await page.waitForSelector('[data-act=weak-start]'); await page.click('[data-act=weak-start]');
    await page.click('#wcard'); await page.click('[data-act=weak-card][data-r=again]');
    await page.waitForSelector('.result'); ok(/1 still weak/.test(await page.textContent('#weak-root')), 'still weak');
    eq(Object.keys((await progress(page)).wk).length, 1, 'kept');
    await nav(page, '/practice'); await nav(page, '/weak'); await page.click('[data-act=weak-start]'); await page.click('#wcard'); await page.click('[data-act=weak-card][data-r=good]');
    await page.waitForSelector('.result'); eq(Object.keys((await progress(page)).wk).length, 0, 'cleared');
    await ctx.close();
  });

  await test('search: exercises and predicts are indexed, stage filter narrows, a close typo gets a suggestion', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    await page.keyboard.press('/'); await page.fill('#sq', 'token bucket');
    await page.waitForSelector('#sres li');
    ok((await page.locator('#sres li .k').allTextContents()).includes('Exercise'), 'exercise found');
    await page.fill('#sq', 'rollback');
    await page.waitForSelector('#sres li');
    const all = await page.locator('#sres li').count();
    await page.selectOption('#sstage', 'cicd');
    await page.waitForTimeout(100);
    const some = await page.locator('#sres li').count();
    ok(some >= 1 && some <= all, `stage filter ${some} of ${all}`);
    ok(/in CI\/CD|in .*CI/i.test(await page.textContent('#shint')), 'hint names the stage: ' + await page.textContent('#shint'));
    await page.selectOption('#sstage', '');
    await page.fill('#sq', 'terrafrmm');
    await page.waitForFunction(() => /Did you mean/.test(document.querySelector('#shint').textContent));
    await page.click('#shint [data-srecent]');
    await page.waitForSelector('#sres li');
    ok(/terraform/i.test(await page.inputValue('#sq')), 'suggestion applied');
    await page.fill('#sq', 'predict output');
    await page.waitForSelector('#sres li');
    await ctx.close();
  });


  await test('about page: nav link beside InterviewHub, full text, LinkedIn link', async () => {
    const { ctx, page } = await open({ viewport: { width: 1700, height: 900 } }); await go(page, '/');
    const links = await page.locator('#topnav a').allTextContents();
    eq(links[links.indexOf('Interview questions') + 1], 'About', 'About sits right after Interview questions: ' + links.join(','));
    await page.click('#topnav a[data-nav=about]'); await page.waitForSelector('.about');
    const txt = await page.textContent('.about');
    ok(/Pure Global Public Good/.test(txt) && /Free · No login · No ads · No cookies/.test(txt) && /localStorage/.test(txt) && /14 years/.test(txt), 'text');
    eq(await page.getAttribute('.about a[href*=linkedin]', 'href'), 'https://www.linkedin.com/in/eknathareddypuli/', 'linkedin');
    await ctx.close();
  });

  await test('capstones: 4 per path, listed on the hub and path pages, steps tick and persist, finished state shows', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    eq(data.capstones.length, 16, 'sixteen capstones');
    for (const pid of ['devops', 'cloud', 'sre', 'devsecops']) eq(data.capstones.filter((c) => c.path === pid).length, 4, pid + ' has four');
    await nav(page, '/practice'); ok(await page.locator('.prac a[href="#/capstones"]').count() === 1, 'hub card');
    await nav(page, '/capstones'); await page.waitForSelector('.cap-card');
    eq(await page.locator('.cap-card').count(), 16, 'all cards listed');
    await nav(page, '/path/sre'); await page.waitForSelector('.cap-card');
    eq(await page.locator('.cap-card').count(), 4, 'four on the path page');
    const c = data.capstones.find((x) => x.path === 'sre');
    await nav(page, '/capstone/' + c.id); await page.waitForSelector('.cap-step');
    eq(await page.locator('.cap-step').count(), c.steps.length + c.check.length, 'steps and checks shown');
    await page.locator('.cap-step input').first().check();
    ok(/1 of \d+ steps/.test(await page.textContent('#cap-prog')), await page.textContent('#cap-prog'));
    ok(Object.keys((await progress(page)).cap[c.id]).length === 1, 'tick saved');
    await page.reload(); await page.waitForSelector('.cap-step');
    ok(await page.locator('.cap-step input').first().isChecked(), 'tick persists after reload');
    const n = await page.locator('.cap-step input').count();
    for (let i = 0; i < n; i++) await page.locator('.cap-step input').nth(i).check();
    ok(/finished/.test(await page.textContent('#cap-prog')), 'finished');
    await nav(page, '/capstones'); ok(/Finished/.test(await page.locator('.cap-card', { hasText: c.title }).first().textContent()), 'card shows finished');
    await nav(page, '/capstone/nope'); await page.waitForSelector('#main h1'); ok(/not found/i.test(await page.textContent('#main h1')), 'unknown id');
    await ctx.close();
  });

  await test('debugging lessons: every stage ends with one, with a predict, a diagram and per-option reasons', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    await setProgress(page, allDone());
    for (const m of Object.values(MODS)) {
      const last = m.lessons[m.lessons.length - 1];
      ok(m.id === 'system-design' || m.lessons.some((l) => /debug|incident|investigating|troubleshoot|day-two|failures/.test(l)), m.id + ' has a debugging lesson (last lesson: ' + last + ')');
    }
    await go(page, '/lesson/kubernetes/debugging-kubernetes-workloads'); await page.waitForSelector('.predict');
    ok(await page.locator('.dg-node').count() > 0, 'diagram');
    await page.waitForSelector('#qstart'); await page.click('#qstart');
    await page.waitForSelector('.opt'); const qt = await page.textContent('.qtext'); const qq = (await A(page)).lessons['kubernetes/debugging-kubernetes-workloads'].quiz.find((x) => x.q === qt);
    await page.locator(`.opt:not([data-oi="${qq.answer}"])`).first().click();
    await page.waitForSelector('.why-others'); ok(/You chose/.test(await page.textContent('#fb')) && /correct answer/i.test(await page.textContent('#fb')), 'wrong answer is explained');
    await ctx.close();
  });

  await test('mixed practice: starts a 12-question mix from several stages and finishes', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    await setProgress(page, allDone());
    await go(page, '/mix'); await page.waitForSelector('[data-act=mix-start]'); await page.click('[data-act=mix-start]');
    for (let i = 0; i < 12; i++) { await page.waitForSelector('.opt[data-ok="1"]'); await page.locator('.opt[data-ok="1"]').first().click(); await page.click('#wnext'); }
    await page.waitForSelector('.result'); ok(/Mixed practice finished/.test(await page.textContent('#weak-root')), await page.textContent('#weak-root'));
    await ctx.close();
  });

  await test('playground aids: support levels fill the editor and the hint ladder is gated', async () => {
    const { ctx, page } = await open(); await go(page, '/playground/yaml');
    await page.selectOption('#yx-ex', { index: 1 }); await page.waitForSelector('#aids:not([hidden])');
    await page.click('[data-act=aids-level][data-lv=study]');
    const full = await page.inputValue('#yp-in'); ok(full.length > 10, 'study fills the answer');
    await page.click('[data-act=aids-level][data-lv=finish]');
    ok(/your turn/i.test(await page.inputValue('#yp-in')), 'finish leaves a gap');
    await page.click('[data-act=aids-level][data-lv=blank]');
    await page.click('#aids-next'); ok(/Hint 1/.test(await page.textContent('#aids-steps')), 'first hint');
    await page.click('#yx-check'); await page.waitForSelector('#yx-res .drill-res.no');
    await page.click('#aids-next'); ok(/Hint 2/.test(await page.textContent('#aids-steps')), 'second hint');
    ok(await page.locator('#aids-next').isDisabled() || /Unlocks after/.test(await page.textContent('#aids-gate')), 'partial solution is gated');
    await ctx.close();
  });

  await test('home page: no About block at the bottom, and the MARGA brand is large and highlighted', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    ok(!/About the Author/i.test(await page.textContent('#main')), 'about block removed from home');
    const fs0 = await page.$eval('.brand b', (el) => parseFloat(getComputedStyle(el).fontSize));
    const bg = await page.$eval('.brand b', (el) => getComputedStyle(el).backgroundColor);
    ok(fs0 >= 24, 'brand font size ' + fs0); ok(bg !== 'rgba(0, 0, 0, 0)', 'brand has a highlight background');
    await ctx.close();
  });

  await test('license page: MARGA by EknathaLabs, CC BY 4.0, linked from the footer', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    await page.click('#footer a[href="#/license"]'); await page.waitForSelector('.about');
    const txt = await page.textContent('#main');
    ok(/MARGA by EknathaLabs/.test(txt) && /CC BY 4\.0/.test(txt) && /MIT License/.test(txt) && /No warranty/.test(txt), 'license text');
    ok(/Source: MARGA by EknathaLabs/.test(await page.textContent('.about pre')), 'attribution line');
    await ctx.close();
  });

  await test('reading lists: six items per stage on the module page and on the reading page', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    for (const m of data.modules) ok((data.reading[m.id] || []).length >= 5, m.id + ' reading items');
    const RT = data.modules.reduce((n, m) => n + (data.reading[m.id] || []).length, 0);
    await nav(page, '/reading'); await page.waitForSelector('.reading');
    eq(await page.locator('.reading li').count(), RT, 'all items listed');
    ok(await page.locator('.reading a[target=_blank][rel*=noopener]').count() === RT, 'links open safely');
    await nav(page, '/module/sre'); await page.waitForSelector('.reading');
    eq(await page.locator('.reading li').count(), 6, 'items on module page');
    await ctx.close();
  });

  await test('incident games: one per stage, a choice shows feedback, a game reaches an ending and is remembered', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    eq(data.games.length, 142, '142 games');
    for (const m of data.modules) ok(data.games.some((g) => g.module === m.id), m.id + ' has a game');
    await nav(page, '/practice'); ok(await page.locator('.prac a[href="#/games"]').count() === 1, 'hub card');
    await nav(page, '/games'); await page.waitForSelector('.game-card'); eq(await page.locator('.game-card').count(), data.games.length, 'all games listed');
    const g = data.games[0];
    await nav(page, '/game/' + g.id); await page.waitForSelector('.gm-choice');
    ok((await page.textContent('.gm-intro')).length > 60, 'intro shown');
    // always take the best choice until an ending
    for (let i = 0; i < 20; i++) {
      if (await page.locator('.gm-end').count()) break;
      await page.waitForSelector('.gm-choice');
      const sc = g.scenes; const text = await page.textContent('.gm-scene');
      const scene = Object.values(sc).find((x) => x.text === text.trim());
      const best = scene.choices.findIndex((c) => c.pts === 2);
      await page.locator('.gm-choice').nth(best).click();
      await page.waitForSelector('.gm-fb'); ok(/Good call/.test(await page.textContent('.gm-fb')), 'feedback shown');
      await page.click('[data-act=gm-next]');
    }
    await page.waitForSelector('.gm-end'); ok(/Resolved well/.test(await page.textContent('.gm-end')), 'best path wins');
    eq((await progress(page)).gm[g.id].best, 'win', 'remembered');
    await page.click('[data-act=gm-again]'); await page.waitForSelector('.gm-choice');
    await ctx.close();
  });

  await test('incident games: every module has at least three games and every game explains the incident with cause, signs, fix and an example', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    for (const m of data.modules) ok(data.games.filter((g) => g.module === m.id).length >= (['virtualization', 'storage', 'sql-ops', 'gpu-serving', 'openstack'].includes(m.id) ? 2 : ['proxies', 'messaging', 'cfn-bicep', 'gcp', 'kubevirt', 'ceph', 'vault'].includes(m.id) ? 1 : 3), m.id + ' has enough games');
    for (const g of data.games) for (const k of ['cause', 'signs', 'fix', 'example']) ok(g.explain && g.explain[k] && g.explain[k].length >= 30, g.id + ' ' + k);
    const g = data.games.find((x) => x.id === 'the-retry-storm');
    await nav(page, '/game/' + g.id);
    for (let i = 0; i < 20; i++) {
      if (await page.locator('.gm-end').count()) break;
      await page.waitForSelector('.gm-choice');
      const text = await page.textContent('.gm-scene');
      const scene = Object.values(g.scenes).find((x) => x.text === text.trim());
      await page.locator('.gm-choice').nth(scene.choices.findIndex((c) => c.pts === 2)).click();
      await page.click('[data-act=gm-next]');
    }
    await page.waitForSelector('.gm-explain');
    const t = await page.textContent('.gm-explain');
    ok(/Root cause/.test(t) && /What you would see/.test(t) && /How to fix it/.test(t) && /Example/.test(t), 'four labelled parts');
    ok(t.indexOf(g.explain.cause.slice(0, 30)) >= 0, 'cause text shown');
    await ctx.close();
  });

  await test('incident games: every game explains every choice with an example, and the summary shows a better move', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    const fresh = data.games.filter((g) => Object.values(g.scenes).some((s) => s.choices.some((c) => /Example: /.test(c.fb))));
    eq(fresh.length, data.games.length, 'games with worked examples');
    for (const g of fresh) for (const sc of Object.values(g.scenes)) for (const c of sc.choices) ok(/ Example: /.test(c.fb) && c.fb.length > 30, g.id + ': ' + c.t);
    const g = fresh[0];
    await nav(page, '/game/' + g.id); await page.waitForSelector('.gm-choice');
    for (let i = 0; i < 20; i++) {
      if (await page.locator('.gm-end').count()) break;
      await page.waitForSelector('.gm-choice');
      const text = await page.textContent('.gm-scene');
      const scene = Object.values(g.scenes).find((x) => x.text === text.trim());
      const pick = i === 0 ? scene.choices.findIndex((c) => c.pts === 1) : scene.choices.findIndex((c) => c.pts === 2);
      await page.locator('.gm-choice').nth(pick).click();
      await page.waitForSelector('.gm-fb .gm-ex');
      ok(/Explanation\./.test(await page.textContent('.gm-fb')) && /Example\./.test(await page.textContent('.gm-fb')), 'explanation and example shown after a choice');
      await page.click('[data-act=gm-next]');
    }
    await page.waitForSelector('.gm-end');
    ok(/A better move:/.test(await page.textContent('#gm-root')), 'summary names the better move');
    ok(await page.locator('.gm-log .gm-ex').count() >= 5, 'every decision is explained in the summary');
    await ctx.close();
  });

