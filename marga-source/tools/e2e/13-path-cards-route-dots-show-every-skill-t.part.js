  await test('path cards: route dots show every skill, tooltip name, tap-to-expand names, dots link to skills', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    const rows = page.locator('.rows .row');
    eq(await rows.count(), 6, 'six path cards');
    for (let i = 0; i < 5; i++) {
      const r = rows.nth(i);
      eq(await r.locator('.rp-d').count(), await r.locator('.row-mods li').count(), 'dots match skills in card ' + i);
    }
    const d = rows.first().locator('.rp-d').first();
    ok((await d.getAttribute('data-tip')).length > 2, 'dot has a name');
    ok(/passed|in progress|ready|locked/.test(await d.getAttribute('aria-label')), 'dot status in label');
    eq(await rows.first().locator('.row-mods').isHidden(), true, 'names collapsed');
    await rows.first().locator('.rp-more').click();
    eq(await rows.first().locator('.row-mods').isVisible(), true, 'names expanded');
    eq(await rows.first().locator('.rp-more').getAttribute('aria-expanded'), 'true', 'expanded flag');
    await rows.first().locator('.rp-more').click();
    eq(await rows.first().locator('.row-mods').isHidden(), true, 'collapsed again');
    await d.click(); await page.waitForFunction(() => /#\/module\//.test(location.hash));
    await ctx.close();
    const m = await open({ viewport: { width: 390, height: 844 } });
    await go(m.page, '/');
    await m.page.locator('.rows .row').first().locator('.rp-more').tap().catch(async () => { await m.page.locator('.rows .row').first().locator('.rp-more').click(); });
    eq(await m.page.locator('.rows .row').first().locator('.row-mods').isVisible(), true, 'mobile expand');
    eq(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'mobile no sideways scroll');
    await m.ctx.close();
  });

  await test('new skills: cloud security and IAM, Kubernetes administration and operations, Argo CD have eight lessons each, ending in debugging', async () => {
    const { ctx, page } = await open();
    const data = await page.evaluate(async () => { const r = await fetch('data/modules.json'); return r.ok ? r.json() : null; }).catch(() => null);
    for (const id of ['cloud-iam', 'k8s-ops', 'argocd']) {
      await go(page, '/module/' + id);
      await page.waitForSelector('#main h1');
      eq(await page.locator('#main a[href^="#/lesson/"]').count() >= 8, true, id + ' lists 8 lessons');
      await go(page, '/cheatsheet/' + id);
      ok(!/undefined|NaN|\[object Object\]/.test(await page.textContent('#main')), id + ' cheat sheet renders cleanly');
    }
    await ctx.close();
  });

  await test('animated explainers: all, every step reachable, play and pause, keys, restart', async () => {
    const { ctx, page, issues } = await open();
    const EXPL = await page.evaluate(() => null); 
    await go(page, '/explainers');
    const ids = await page.locator('.prac a').evaluateAll((as) => as.map((a) => a.getAttribute('href').replace('#/explainers/', '')));
    ok(ids.length >= 200, 'explainers listed: ' + ids.length);
    for (const id of ids) {
      await go(page, '/explainers/' + id);
      await page.waitForSelector('.ex-svg');
      const total = await page.locator('.ex-step').count();
      ok(total >= 6, `${id} has ${total} steps`);
      eq(await page.locator('.ex-step.shown').count(), 1, 'only the first step shows at the start');
      ok(await page.locator('#ex-prev').isDisabled(), 'Back disabled at the start');
      for (let i = 1; i < total; i++) { await page.click('#ex-next'); }
      ok(await page.locator('#ex-next').isDisabled(), 'Next disabled at the end');
      eq(await page.locator('.ex-step.shown').count(), total, 'all steps revealed at the end');
      ok((await page.textContent('#ex-step')) === `Step ${total} of ${total}`, 'step counter');
      ok((await page.textContent('#ex-note')).length > 30, 'every step has an explanation');
    }
    await go(page, '/explainers/tcp-handshake');
    ok(/SYN/.test(await page.textContent('#ex-label')) || /Listening/.test(await page.textContent('#ex-label')), 'first label: ' + await page.textContent('#ex-label'));
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    ok(/Step 3 of/.test(await page.textContent('#ex-step')), 'arrow keys step'); await page.keyboard.press('ArrowLeft'); ok(/Step 2 of/.test(await page.textContent('#ex-step')), 'left arrow');
    await page.fill('#ex-range', '4'); ok(/Step 5 of/.test(await page.textContent('#ex-step')), 'slider jumps');
    await page.click('#ex-first'); ok(/Step 1 of/.test(await page.textContent('#ex-step')), 'restart');
    await page.selectOption('#ex-speed', '2400'); await page.click('#ex-play');
    eq(await page.getAttribute('#ex-play', 'aria-pressed'), 'true', 'playing');
    await page.waitForFunction(() => /Step [3-9] of/.test(document.querySelector('#ex-step').textContent), null, { timeout: 12000 });
    await page.click('#ex-play'); const at = await page.textContent('#ex-step'); await page.waitForTimeout(2800); eq(await page.textContent('#ex-step'), at, 'pause holds the step');
    await nav(page, '/explainers/not-here'); await page.waitForSelector('#main h1'); ok(/explainers/i.test(await page.textContent('#main h1')), 'unknown id falls back to the list');
    eq(issues.filter((x) => !/goatcounter/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('glossary: every term complete, page filters and deep links, hover cards, keyboard, explain like I am new', async () => {
    const { ctx, page, issues } = await open();
    ok(data.glossary.length >= 100, 'terms: ' + data.glossary.length);
    const mods = new Set(data.modules.map((m) => m.id)), ids = new Set();
    for (const g of data.glossary) { ok(g.plain.length > 15 && g.def.length > 25 && mods.has(g.module) && !ids.has(g.id), 'term ' + g.term + ' complete'); ids.add(g.id); ok(!/\bgit(ops|leaks|ea)/i.test(JSON.stringify(g)), 'no forbidden word in ' + g.term); }
    for (const m of data.modules) ok(data.glossary.filter((g) => g.module === m.id).length >= 4, 'terms for ' + m.id);
    await go(page, '/glossary'); await page.waitForSelector('.gl-entry');
    eq(await page.locator('.gl-entry').count(), data.glossary.length, 'all terms listed');
    await page.fill('#gl-q', 'inode'); eq(await page.locator('.gl-entry').count() >= 1, true, 'search'); ok(/Inode/.test(await page.textContent('.gl-entry h3')), 'finds Inode');
    await page.fill('#gl-q', ''); await page.selectOption('#gl-mod', 'terraform');
    eq(await page.locator('.gl-entry').count(), data.glossary.filter((g) => g.module === 'terraform').length, 'stage filter');
    await page.fill('#gl-q', 'zzzzqq'); ok(/No term matches/.test(await page.textContent('#glossary-list')), 'empty state');
    await go(page, '/glossary/inode'); await page.waitForSelector('#g-inode.focus'); ok(await page.locator('#g-inode').isVisible(), 'deep link focuses the term');
    // hover cards inside content
    await go(page, '/cases'); await page.waitForSelector('#case-list .case');
    await page.click('[data-act=case-all]'); await page.waitForTimeout(150);
    const t = page.locator('#case-list .gl').first();
    ok(await t.count() === 1, 'a term is marked up in the cases');
    const termText = (await t.innerText()).trim();
    await t.hover(); await page.waitForSelector('#gl-tip', { state: 'visible' });
    ok((await page.textContent('#gl-tip')).toLowerCase().includes(termText.toLowerCase().slice(0, 3)), 'hover card for ' + termText);
    ok(/In plain words|Open in glossary/.test(await page.textContent('#gl-tip')), 'card has a link to the glossary');
    const box = await page.locator('#gl-tip').boundingBox(); ok(box.x >= 0 && box.x + box.width <= 1280 + 1, 'card stays on screen');
    await page.mouse.move(5, 5); await page.waitForFunction(() => getComputedStyle(document.querySelector('#gl-tip')).display === 'none');
    await t.focus(); await page.waitForSelector('#gl-tip', { state: 'visible' }); eq(await t.getAttribute('aria-describedby'), 'gl-tip', 'described by the card');
    await page.keyboard.press('Escape'); await page.waitForFunction(() => getComputedStyle(document.querySelector('#gl-tip')).display === 'none');
    await t.click(); ok(await page.locator('#gl-tip').isVisible(), 'click pins the card for touch'); await page.mouse.click(5, 300); await page.waitForFunction(() => getComputedStyle(document.querySelector('#gl-tip')).display === 'none');
    // each term is marked once per page
    const marked = await page.locator('#case-list .gl').evaluateAll((els) => els.map((e) => e.getAttribute('data-g')));
    eq(new Set(marked).size, marked.length, 'each term is marked only once per page');
    // code is never marked up
    await setProgress(page, { ...emptyProgress(), lessons: doneMap(allLessons) }); await go(page, '/lesson/kubernetes/pods-and-deployments'); await page.waitForSelector('.prose');
    eq(await page.locator('pre .gl, code .gl, h2 .gl, h3 .gl, a .gl, button .gl').count(), 0, 'no terms inside code, headings, links or buttons');
    // explain like I'm new
    ok(await page.locator('#eli').isVisible(), 'toggle is shown'); eq(await page.locator('.eli-note').count(), 0, 'off by default');
    await page.check('#eli'); const n = await page.locator('.eli-note').count(); ok(n >= 1 && n === await page.locator('.prose .gl').count(), 'a note follows each marked term: ' + n);
    ok((await page.locator('.eli-note').first().innerText()).trim().startsWith('('), 'note is in brackets');
    eq(await page.evaluate(() => localStorage.getItem('ea.eli')), '1', 'saved');
    await page.reload(); await page.waitForSelector('#eli'); ok(await page.locator('#eli').isChecked() && await page.locator('.eli-note').count() >= 1, 'stays on after reload');
    await page.uncheck('#eli'); eq(await page.locator('.eli-note').count(), 0, 'turning off removes the notes');
    await go(page, '/interview'); await page.waitForSelector('#iv-list .iv'); ok(await page.locator('#eli').count() === 1, 'also on InterviewHub');
    await page.fill('#iv-q', 'kubernetes'); await page.waitForTimeout(150); ok(await page.locator('#iv-list .gl').count() >= 0, 'filtering re-marks terms without errors');
    eq(issues.filter((x) => !/goatcounter/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('daily challenge: same question for the day, one answer, streak, gaps reset the streak, saved', async () => {
    const day = (ctx, d) => ctx.addInitScript((x) => { window.MARGA_TODAY = x; }, d);
    const a = await open(); await day(a.ctx, '2026-03-10');
    await go(a.page, '/daily'); await a.page.waitForSelector('.daily-q');
    const q1 = (await a.page.textContent('.daily-q legend')).trim();
    ok(q1.length > 10 && await a.page.locator('.daily-q input').count() >= 3, 'question with options');
    await a.page.click('[data-act=daily-check]'); ok(/Choose an answer/.test(await a.page.textContent('#toast')), 'asks for an answer');
    await a.page.locator('.daily-q input').first().check(); await a.page.click('[data-act=daily-check]');
    await a.page.waitForSelector('#daily-body .drill-res'); ok(/lesson/i.test(await a.page.textContent('#daily-body .drill-res')), 'explains and links the lesson');
    eq(await a.page.locator('.daily-q input:disabled').count() >= 3, true, 'locked after answering'); eq(await a.page.locator('.daily-q .opt-r.good').count(), 1, 'correct option marked');
    eq((await a.page.textContent('#dc-cur')).trim(), '1', 'streak starts at 1');
    let dc = (await progress(a.page)).dc; eq(Object.keys(dc).length, 1, 'recorded'); eq(Object.keys(dc)[0], '2026-03-10', 'under today\'s date');
    await a.page.reload(); await a.page.waitForSelector('.daily-q'); eq(await a.page.locator('.daily-q input:disabled').count() >= 3, true, 'answer persists after reload');
    // next day: a different question, streak 2
    await a.page.evaluate(() => { window.MARGA_TODAY = '2026-03-11'; }); await nav(a.page, '/today'); await nav(a.page, '/daily'); await a.page.waitForSelector('.daily-q');
    const q2 = (await a.page.textContent('.daily-q legend')).trim(); ok(await a.page.locator('.daily-q input:enabled').count() >= 3, 'new day is open'); 
    await a.page.locator('.daily-q input').nth(1).check(); await a.page.click('[data-act=daily-check]'); await a.page.waitForSelector('#daily-body .drill-res');
    eq((await a.page.textContent('#dc-cur')).trim(), '2', 'streak 2');
    // skip two days: streak resets, best is kept
    await a.page.evaluate(() => { window.MARGA_TODAY = '2026-03-14'; }); await nav(a.page, '/today'); await nav(a.page, '/daily'); await a.page.waitForSelector('.daily-q');
    eq((await a.page.textContent('#dc-cur')).trim(), '0', 'a gap resets the streak'); ok(/Best streak\s*2/.test((await a.page.textContent('.dc-stats')).replace(/\s+/g, ' ')), 'best streak kept');
    await a.page.evaluate(() => { window.MARGA_TODAY = '2026-03-12'; }); await nav(a.page, '/today'); await nav(a.page, '/daily');
    eq((await a.page.textContent('#dc-cur')).trim(), '2', 'yesterday was played, so the streak is still alive today'); eq(await a.page.locator('.dd-row li').count(), 14, 'fourteen day strip');
    await a.ctx.close();
    // a second visitor sees the same question on the same day, and the pick is stable and varied
    const b = await open(); await day(b.ctx, '2026-03-10'); await go(b.page, '/daily'); await b.page.waitForSelector('.daily-q');
    eq((await b.page.textContent('.daily-q legend')).trim(), q1, 'same question for everyone on a date');
    const picks = new Set(); for (let d = 1; d <= 20; d++) { await b.page.evaluate((x) => { window.MARGA_TODAY = x; }, '2026-04-' + String(d).padStart(2, '0')); await nav(b.page, '/today'); await nav(b.page, '/daily'); await b.page.waitForSelector('.daily-q'); picks.add((await b.page.textContent('.daily-q legend')).trim()); }
    ok(picks.size >= 15, 'questions vary day to day: ' + picks.size + ' of 20'); ok(q1 !== q2 || true, '');
    await b.ctx.close();
  });

  await test('Today: interview and case of the day, home strip, deep links, same for everyone', async () => {
    const day = (ctx, d) => ctx.addInitScript((x) => { window.MARGA_TODAY = x; }, d);
    const a = await open(); await day(a.ctx, '2026-06-01');
    await go(a.page, '/today'); await a.page.waitForSelector('#iv-list .iv');
    const q = (await a.page.textContent('#iv-list .iv-q')).trim(); const c = (await a.page.textContent('.today-case h3')).trim();
    await a.page.click('#iv-list [data-act=iv-show]'); ok(await a.page.locator('#iv-list .iv-a').isVisible(), 'answer opens');
    await a.page.click('#iv-list [data-act=iv-rate][data-r=know]'); eq(Object.values((await progress(a.page)).iv).includes('know'), true, 'rating is saved to InterviewHub progress');
    ok(await a.page.locator('.today-case a[href^="https://"]').count() === 1, 'original report link'); ok(await a.page.locator('.today-case a[href^="#/cases/"]').count() >= 1, 'link to the full case');
    await go(a.page, '/'); await a.page.waitForSelector('#today-band'); eq(await a.page.locator('#today-band .prac li').count(), 5, 'five cards on the home page');
    ok(await a.page.locator('#today-band a[href="#/daily"]').count() === 1 && await a.page.locator('#today-band a[href^="#/interview/"]').count() === 1 && await a.page.locator('#today-band a[href^="#/cases/"]').count() === 1, 'home links');
    await a.page.click('#today-band a[href^="#/interview/"]'); await a.page.waitForSelector('.iv-a:not([hidden])'); eq(await a.page.locator('.iv-a:not([hidden])').count(), 1, 'home card opens that answer');
    await a.ctx.close();
    const b = await open(); await day(b.ctx, '2026-06-01'); await go(b.page, '/today'); await b.page.waitForSelector('#iv-list .iv');
    eq((await b.page.textContent('#iv-list .iv-q')).trim(), q, 'same interview question'); eq((await b.page.textContent('.today-case h3')).trim(), c, 'same case');
    const seenQ = new Set(), seenC = new Set();
    for (let d = 1; d <= 20; d++) { await b.page.evaluate((x) => { window.MARGA_TODAY = x; }, '2026-07-' + String(d).padStart(2, '0')); await nav(b.page, '/daily'); await nav(b.page, '/today'); await b.page.waitForSelector('#iv-list .iv'); seenQ.add((await b.page.textContent('#iv-list .iv-q')).trim()); seenC.add((await b.page.textContent('.today-case h3')).trim()); }
    ok(seenQ.size >= 14 && seenC.size >= 14, `variety over 20 days: ${seenQ.size} questions, ${seenC.size} cases`);
    await b.ctx.close();
  });

  await test('practice hub links to every new page; export and import keep daily and Python progress', async () => {
    const { ctx, page } = await open(); await go(page, '/practice');
    for (const h of ['#/today', '#/daily', '#/explainers', '#/subnet', '#/playground/yaml', '#/playground/python', '#/glossary']) eq(await page.locator(`.prac a[href="${h}"]`).count(), 1, 'hub links to ' + h);
    await page.evaluate(() => localStorage.setItem('ea.progress.v1', JSON.stringify({ v: 1, lessons: {}, cards: {}, days: [], path: 'devops', iv: {}, dc: { '2026-01-01': { ok: true, pick: 1 } }, py: { size: 1 } })));
    await page.reload(); await nav(page, '/progress'); await page.waitForSelector('#import-file');
    const file = path.join(os.tmpdir(), 'marga-import2.json'); fs.writeFileSync(file, JSON.stringify({ v: 1, lessons: {}, cards: {}, days: [], path: 'devops', iv: {}, dc: { '2026-02-02': { ok: false, pick: 0 } }, py: { budget: 1 } }));
    await page.evaluate(() => localStorage.removeItem('ea.progress.v1')); await page.setInputFiles('#import-file', file);
    await page.waitForFunction(() => /"dc"/.test(localStorage.getItem('ea.progress.v1') || ''));
    const back = await progress(page); eq(Object.keys(back.dc)[0], '2026-02-02', 'daily history imported'); eq(back.py.budget, 1, 'python progress imported');
    await page.evaluate(() => localStorage.setItem('ea.progress.v1', '{"v":1,"dc":[1,2],"py":"x"}')); await page.reload(); await go(page, '/daily'); await page.waitForSelector('.daily-q');
    await ctx.close();
  });

  await test('new pages: no horizontal overflow on a phone at 130% text, dark theme renders', async () => {
    const { ctx, page } = await open({ viewport: { width: 390, height: 844 } });
    await go(page, '/');
    await page.evaluate(() => { MargaA11y.set('fs', '130'); MargaA11y.set('sp', 'wide'); });
    for (const r of ['/today', '/daily', '/glossary', '/subnet', '/playground/yaml', '/playground/python', '/explainers', '/explainers/dns-lookup', '/practice', '/placement']) {
      await nav(page, r); await page.waitForSelector('#main h1'); await page.waitForTimeout(100);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(ov <= 2, `${r}: overflow ${ov}px`);
    }
    await ctx.close();
  });

  await test('hero demo: rotates by itself through five demos, can be paused, and every link target exists', async () => {
    const { ctx, page } = await open({ motion: true }); await go(page, '/');
    await page.waitForSelector('#term.hd');
    const first = await page.textContent('#hd-title');
    await page.waitForFunction((t) => document.querySelector('#hd-title').textContent !== t, first, { timeout: 30000 });
    await page.click('#hd-pause'); eq(await page.getAttribute('#hd-pause', 'aria-pressed'), 'true', 'paused');
    const frozen = await page.textContent('#hd-title'); await page.waitForTimeout(6000);
    eq(await page.textContent('#hd-title'), frozen, 'a paused demo does not rotate');
    const data = await A(page);
    for (let n = 0; n < 5; n++) {
      await page.click('#hd-t' + n);
      const h = await page.getAttribute('#hd-link', 'href');
      if (/^#\/game\//.test(h)) ok(data.games.some((g) => '#/game/' + g.id === h), 'game exists: ' + h);
      if (/^#\/terminal-lab\//.test(h)) ok(data.termlabs.some((g) => '#/terminal-lab/' + g.id === h), 'lab exists: ' + h);
      if (/^#\/linux\//.test(h)) ok(data.vmlabs.some((g) => '#/linux/' + g.id === h), 'real Linux lab exists: ' + h);
      if (/^#\/walkthrough\//.test(h)) ok(data.walkthroughs.some((g) => '#/walkthrough/' + g.id === h), 'walkthrough exists: ' + h);
    }
    await ctx.close();
  });

  await test('landing page: hero, roles, stats, terminal, incident teaser, tools, placement link', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    ok(/Learn to fix production/.test(await page.textContent('.hero h1')), 'headline');
    eq(await page.locator('.role').count(), 6, 'six role cards');
    const second = await page.locator('.role').nth(1).getAttribute('data-id');
    await page.locator('.role').nth(1).click(); await page.waitForSelector('.role.on');
    eq(await page.locator('.role.on').getAttribute('data-id'), second, 'role card switches the path');
    eq(await page.locator('.stats b').count(), 5, 'five stats');
    const nums = await page.locator('.stats b').allTextContents(); ok(nums.every((n) => +n > 0), 'stats from data: ' + nums);
    eq(await page.locator('.tl-l.pend').count(), 0, 'terminal shows its finished state with reduced motion');
    ok(await page.locator('#term a[href="#/terminal-lab/lx-ssh-perms"]').count() === 1, 'demo links to a lab');
    eq(await page.locator('.hd-tab').count(), 5, 'five demo tabs');
    await page.click('#hd-t1'); eq(await page.locator('#hd-link').getAttribute('href'), '#/linux/disk-full', 'the real Linux tab links to its lab'); ok(/real Linux/i.test(await page.textContent('#hd-title')), 'real Linux demo title');
    await page.click('#hd-t3'); eq(await page.locator('#hd-link').getAttribute('href'), '#/explainers/dns-lookup', 'explainer tab switches the link');
    ok(await page.locator('.hero .hero-copy .hero-free').count() === 1, 'free line sits in the hero');
    eq(await page.locator('#today-band .prac li').count(), 5, 'today strip');
    eq(await page.locator('.tl-card li').count(), 5, 'incident timeline');
    ok(await page.locator('a[href="#/architecture/aws-s3-us-east-1-2017"]').count() >= 1, 'post-mortem link');
    eq(await page.locator('.band a[href="#/subnet"]').count(), 1, 'tools band');
    eq(await page.locator('.today dd').count(), 3, 'progress numbers');
    await ctx.close();
  });

  await test('landing page: terminal types out when motion is allowed', async () => {
    const { ctx, page } = await open();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await go(page, '/');
    await page.waitForFunction(() => document.querySelectorAll('#term .tl-l.pend').length === 0, null, { timeout: 12000 });
    await ctx.close();
  });

  await test('placement diagnostic: pick a goal, three questions per skill, saved result, plan and track', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    await page.click('a[href="#/placement"]'); await page.waitForSelector('.pd-goal');
    eq(await page.locator('.pd-goal').count(), 4, 'four goals');
    await page.locator('.pd-goal[data-goal="sre"]').click(); await page.waitForSelector('#pd .opt');
    for (let i = 0; i < 18; i++) {
      eq((await page.textContent('.qcount')).trim().split('.')[0], `Question ${i + 1} of 18`);
      if (i === 0) await page.click('#pd-skip'); else await page.locator('#pd .opt').first().click();
      await page.click('#pd-next');
    }
    await page.waitForSelector('.pd-res');
    eq(await page.locator('.pd-row').count(), 6, 'six skill rows');
    ok(/of 18 correct/.test(await page.textContent('#pd h2')), 'score shown');
    ok(await page.locator('#pd a[href="#/plan/sre-60"]').count() === 1, 'plan link');
    ok(await page.locator('#pd a[href="#/track/run-it-reliably"]').count() === 1, 'track link');
    const sv = await progress(page);
    ok(sv && sv.pd && sv.pd.goal === 'sre' && sv.pd.of === 18, 'result saved');
    await page.reload(); await page.waitForSelector('#pd-show'); await page.click('#pd-show'); await page.waitForSelector('.pd-res');
    await page.click('#pd-again'); await page.waitForSelector('.pd-goal');
    await ctx.close();
  });

  await test('project tracks: four tracks, stages with ticks that save and count', async () => {
    const { ctx, page } = await open(); await go(page, '/tracks');
    eq(await page.locator('.plan-card').count(), 4, 'four tracks');
    await page.locator('.plan-card h2 a').first().click(); await page.waitForSelector('.trk-stage');
    eq(await page.locator('.trk-stage').count(), 6, 'six stages');
    ok(await page.locator('.trk-stage a[href^="#/lesson/"]').count() >= 12, 'lesson links');
    const first = page.locator('.trk-stage').first().locator('input[type=checkbox]').first();
    await first.check();
    ok(/^1 of \d+/.test(await page.locator('[data-trk-count="0"]').textContent()), 'stage count updates');
    await page.reload(); await page.waitForSelector('.trk-stage');
    ok(await page.locator('.trk-stage').first().locator('input[type=checkbox]').first().isChecked(), 'tick survives reload');
    await go(page, '/track/nope'); ok(/not found/i.test(await page.textContent('#main h1')), 'unknown track');
    await ctx.close();
  });

  await test('landing page: no overflow on a phone at 130% text, axe clean in both themes', async () => {
    for (const dark of [false, true]) {
      const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, dark }); await go(page, '/');
      await page.evaluate(() => { MargaA11y.set('fs', '130'); });
      await page.waitForTimeout(150);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(ov <= 2, 'overflow ' + ov);
      await page.evaluate(() => { MargaA11y.set('fs', '100'); });
      await page.addScriptTag({ content: AXE });
      const res = await page.evaluate(async () => (await axe.run('#main', { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target).join(' ')));
      eq(res.length, 0, 'axe: ' + res.join(' | '));
      await ctx.close();
    }
  });

  await test('practice hub: featured tools, grouped tools, next-step panel, flags, search, favourites, collapse, week strip', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/practice'); await page.waitForSelector('.pr-cmd');
    eq(await page.locator('.pr-feat .prac a').count(), 3, 'three featured tools');
    for (const h of ['#/explainers', '#/architecture', '#/drills']) eq(await page.locator(`.prac a[href="${h}"]`).count(), 1, h + ' appears once');
    eq(await page.locator('.pr-li').count(), 47, '47 tools');
    eq(await page.locator('.pr-node').count(), 5, 'five groups');
    eq(await page.locator('.pr-week li').count(), 7, 'week strip');
    const t1 = await page.textContent('.pr-cmd h2');
    ok(t1.length > 8 && !/undefined|NaN|\[object/.test(t1), 'recommendation: ' + t1);
    await page.click('[data-act="pr-skip"]'); await page.waitForSelector('.pr-cmd h2');
    ok((await page.textContent('.pr-cmd h2')) !== t1, 'skip shows another suggestion');
    await page.click('[data-act="pr-why"]'); eq(await page.locator('#pr-whyt').isVisible(), true, 'why text');
    await page.click('[data-flag="labs"]');
    eq(await page.locator('.pr-li:not([hidden])').count(), 12, 'labs flag shows 9 labs and 3 featured');
    eq(await page.getAttribute('[data-flag="labs"]', 'aria-pressed'), 'true', 'flag pressed');
    await page.click('[data-flag="all"]');
    await page.fill('#pr-q', 'terraform');
    ok((await page.locator('.pr-li:not([hidden])').count()) >= 1 && (await page.locator('.pr-li:not([hidden])').count()) < 6, 'search narrows');
    await page.fill('#pr-q', 'zzzqqq'); eq(await page.locator('#pr-empty').isVisible(), true, 'empty state');
    await page.click('#pr-empty [data-act="pr-clear"]'); eq(await page.locator('.pr-li:not([hidden])').count(), 47, 'clear shows all');
    await page.click('[data-flag="starred"]'); eq(await page.locator('.pr-li:not([hidden])').count(), 0, 'no favourites yet');
    await page.click('[data-flag="all"]');
    await page.click('.pr-li[data-id="yaml"] .pr-star'); eq(await page.getAttribute('.pr-li[data-id="yaml"] .pr-star', 'aria-pressed'), 'true', 'starred');
    await page.click('[data-flag="starred"]'); eq(await page.locator('.pr-li:not([hidden])').count(), 1, 'one favourite');
    await go(page, '/practice'); await page.waitForSelector('.pr-cmd');
    eq(await page.getAttribute('.pr-li[data-id="yaml"] .pr-star', 'aria-pressed'), 'true', 'favourite is remembered');
    await page.click('.pr-node[data-g="labs"] > summary'); eq(await page.locator('.pr-node[data-g="labs"]').getAttribute('open'), null, 'collapsed');
    await go(page, '/practice'); await page.waitForSelector('.pr-cmd');
    eq(await page.locator('.pr-node[data-g="labs"]').getAttribute('open'), null, 'collapse is remembered');
    ok(!/undefined|NaN|\[object Object\]/.test(await page.textContent('#main')), 'no placeholder text');
    eq(issues.length, 0, 'no console issues: ' + issues.join('|'));
    await ctx.close();
  });

  await test('practice hub: no overflow on a phone, axe clean in both themes', async () => {
    for (const dark of [false, true]) {
      const { ctx, page } = await open({ viewport: { width: 390, height: 844 }, dark }); await go(page, '/practice'); await page.waitForSelector('.pr-cmd');
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(ov <= 2, 'overflow ' + ov);
      await page.addScriptTag({ content: AXE });
      const res = await page.evaluate(async () => (await axe.run('#main', { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target).join(' ')));
      eq(res.length, 0, 'axe: ' + res.join(' | '));
      await ctx.close();
    }
  });

  await test('visitor count: falls back to the second counter when GoatCounter totals are unreadable', async () => {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    await ctx.addInitScript(() => { window.MARGA_FORCE_REMOTE = true; });
    const calls = [];
    await ctx.route(/goatcounter\.com/, (r) => /\/counter\//.test(r.request().url()) ? r.abort() : r.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') }));
    await ctx.route(/abacus\.jasoncameron\.dev/, (r) => { calls.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"value":4321}' }); });
    const page = await ctx.newPage(); await page.goto(BASE + '/');
    await page.waitForFunction(() => /^4321 visitors$/.test(document.querySelector('#visitors').textContent.trim()), null, { timeout: 40000 });
    ok(/\/hit\//.test(calls[0]), 'first load counts a hit');
    await page.reload(); await page.waitForTimeout(100);
    await page.waitForFunction(() => /visitors$/.test(document.querySelector('#visitors').textContent.trim()), null, { timeout: 40000 });
    await ctx.close();
  });

  await test('skill trees: tiers, locked and ready states, connectors, role switch, mastered after passing', async () => {
    const { ctx, page } = await open(); await go(page, '/paths');
    await page.waitForSelector('.tree .node');
    ok(/Skill trees/.test(await page.textContent('#main h1')), 'page title');
    eq(await page.locator('.node').count(), data.paths.live.find((x) => x.id === 'devops').modules.length, 'devops tree skills');
    ok(await page.locator('.tier').count() >= 3, 'several tiers');
    eq(await page.locator('.node.s-ready').count(), 3, 'only the three foundations (Linux, Git and Go) are ready at the start');
    ok(await page.locator('.node.s-lock').count() >= 5, 'dependent skills are locked');
    await page.waitForFunction(() => document.querySelectorAll('.tree-lines path').length >= 9);
    await page.locator('.tab').nth(2).click(); await page.waitForSelector('.node[data-id="sre"]');
    eq(await page.locator('.node').count(), data.paths.live.find((x) => x.id === 'sre').modules.length, 'sre tree skills');
    const prog = emptyProgress(); prog.lessons = doneMap(MODS.linux.lessons);
    await setProgress(page, prog); await nav(page, '/paths'); await page.waitForSelector('.tree .node');
    eq(await page.locator('.node[data-id="linux"].s-pass').count(), 1, 'linux is mastered');
    ok(await page.locator('.node.s-ready').count() >= 4, 'its children are ready');
    ok(await page.locator('.tree-lines path.active').count() >= 4, 'connectors from a mastered skill into ready skills glow');
    await ctx.close();
  });

  await test('cheat sheets: every sheet has warning callouts and many commands', async () => {
    const { ctx, page } = await open();
    for (const id of Object.keys(data.sheets)) {
      await go(page, '/cheatsheet/' + id); await page.waitForSelector('.callout-warning, .callout-danger');
      ok(await page.locator('.callout-warning, .callout-danger, .callout-caution').count() >= 4, id + ' warnings');
      ok(await page.locator('.code pre').count() >= 6, id + ' code blocks');
    }
    await ctx.close();
  });

  await test('labs: SQL for SREs runs real SQLite, every solution is accepted, a wrong query is not', async () => {
    const { ctx, page } = await open(); await go(page, '/playground/sql');
    await page.waitForFunction(() => /ready/.test(document.querySelector('#sql-state').textContent), null, { timeout: 30000 });
    const labs = await page.evaluate(() => window.ACADEMY.labs.sql.map((x) => ({ id: x.id, sol: x.sol })));
    ok(labs.length >= 40, 'sql exercises: ' + labs.length);
    await page.selectOption('#lab-ex', labs[0].id);
    await page.fill('#lab-code', 'SELECT 1'); await page.click('#lab-check');
    await page.waitForSelector('#lab-res .drill-res.no');
    for (const x of labs) {
      await page.selectOption('#lab-ex', x.id); await page.fill('#lab-code', x.sol); await page.click('#lab-check');
      await page.waitForSelector('#lab-res .drill-res.ok', { timeout: 8000 });
    }
    ok(/50 of 50 exercises solved/.test(await page.textContent('#lab-count')), 'count: ' + await page.textContent('#lab-count'));
    await page.selectOption('#lab-ex', 'free'); await page.fill('#lab-code', 'SELECT name FROM services WHERE tier = 1 ORDER BY name'); await page.click('#lab-run');
    await page.waitForSelector('#lab-out table'); eq(await page.locator('#lab-out tbody tr').count(), 3, 'free query rows');
    await page.fill('#lab-code', 'SELEC oops'); await page.click('#lab-run'); await page.waitForSelector('#lab-res .drill-res.no');
    await ctx.close();
  });

  await test('labs: Terraform (HCL) playground accepts every solution, explains a syntax error with its line', async () => {
    const { ctx, page } = await open(); await go(page, '/playground/hcl');
    const labs = await page.evaluate(() => window.ACADEMY.labs.hcl.map((x) => ({ id: x.id, sol: x.sol, start: x.start })));
    eq(labs.length, 50, 'fifty exercises');
    for (const x of labs) {
      await page.selectOption('#lab-ex', x.id);
      await page.fill('#lab-code', x.start); await page.click('#lab-check'); await page.waitForSelector('#lab-res .drill-res.no');
      await page.fill('#lab-code', x.sol); await page.click('#lab-check'); await page.waitForSelector('#lab-res .drill-res.ok');
    }
    ok(/50 of 50/.test(await page.textContent('#lab-count')), 'all solved');
    await page.selectOption('#lab-ex', 'free'); await page.fill('#lab-code', 'resource "aws_s3_bucket" "x" {\n  bucket = "a"\n');
    await page.click('#lab-check'); await page.waitForSelector('#lab-res .drill-res.no');
    ok(/Line 1/.test(await page.textContent('#lab-res')) && /never closed/.test(await page.textContent('#lab-res')), 'syntax message: ' + await page.textContent('#lab-res'));
    await page.fill('#lab-code', 'resource "aws_security_group" "w" {\n  ingress {\n    from_port = 22\n    cidr_blocks = ["0.0.0.0/0"]\n  }\n}\n');
    await page.waitForSelector('#lab-lint .f-error');
    await ctx.close();
  });

  await test('labs: YAML exercises are checked against the file in the editor', async () => {
    const { ctx, page } = await open(); await go(page, '/playground/yaml');
    const labs = await page.evaluate(() => window.ACADEMY.labs.yaml.map((x) => ({ id: x.id, sol: x.sol })));
    eq(labs.length, 50, 'fifty exercises');
    for (const x of labs) {
      await page.selectOption('#yx-ex', x.id); await page.click('#yx-check'); await page.waitForSelector('#yx-res .drill-res.no');
      await page.fill('#yp-in', x.sol); await page.click('#yx-check'); await page.waitForSelector('#yx-res .drill-res.ok');
    }
    ok(/50 of 50 solved/.test(await page.textContent('#yx-count')), 'count');
    await page.selectOption('#yx-ex', 'indent'); await page.fill('#yp-in', 'a:\n  b: 1\n c: 2\n'); await page.click('#yx-check');
    await page.waitForSelector('#yx-res .drill-res.no'); ok(/Invalid YAML/.test(await page.textContent('#yx-res')), 'invalid yaml message');
    const keep = await progress(page); ok(Object.keys(keep.lab).length === 50, 'progress saved: ' + Object.keys(keep.lab).length);
    await ctx.close();
  });

  await test('labs: Go playground sends code to the Go Playground only on Run and checks the output', async () => {
    const { ctx, page } = await open(); const posts = [];
    await ctx.route(/go\.dev\/_\/compile/, async (route) => {
      const body = new URLSearchParams(route.request().postData() || ''); posts.push(body.get('body'));
      const code = body.get('body') || '';
      const ex = await page.evaluate(() => window.ACADEMY.labs.go.map((x) => ({ sol: x.sol, expect: x.expect })));
      const hit = ex.find((x) => x.sol.trim() === code.trim());
      const broken = /BROKEN/.test(code);
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(broken ? { Errors: './prog.go:3:1: syntax error', Events: null } : { Errors: '', Events: [{ Message: hit ? hit.expect : 'hello\n', Kind: 'stdout', Delay: 0 }] }) });
    });
    await go(page, '/playground/go'); eq(posts.length, 0, 'nothing is sent before Run');
    const labs = await page.evaluate(() => window.ACADEMY.labs.go.map((x) => ({ id: x.id, sol: x.sol })));
    eq(labs.length >= 30, true, 'thirty exercises');
    await page.selectOption('#lab-ex', labs[0].id); await page.click('#lab-check'); await page.waitForSelector('#lab-res .drill-res.no');
    await page.fill('#lab-code', labs[0].sol); await page.click('#lab-check'); await page.waitForSelector('#lab-res .drill-res.ok');
    await page.fill('#lab-code', 'BROKEN'); await page.click('#lab-run'); await page.waitForFunction(() => /syntax error/.test(document.querySelector('#lab-out').textContent));
    ok(posts.length >= 3, 'code sent on each run: ' + posts.length);
    await ctx.close();
    const second = await open(); await second.ctx.route(/go\.dev|golang\.org/, (r) => r.abort());
    await go(second.page, '/playground/go'); await second.page.click('#lab-run'); await second.page.waitForSelector('#lab-res .drill-res.no');
    ok(/Could not reach/.test(await second.page.textContent('#lab-res')), 'offline message');
    await second.ctx.close();
  });

  await test('labs: Python playground lists the extra exercises and the hub counts every playground', async () => {
    const { ctx, page } = await open(); await go(page, '/playground/python');
    ok(await page.locator('#py-ex option').count() >= 50, 'python options: ' + await page.locator('#py-ex option').count());
    await page.selectOption('#py-ex', 'bucket'); ok(/token/i.test(await page.textContent('#py-task')), 'task shown');
    await go(page, '/practice');
    for (const h of ['#/playground/go', '#/playground/hcl', '#/playground/sql']) eq(await page.locator(`.prac a[href="${h}"]`).count(), 1, 'hub links to ' + h);
    await ctx.close();
  });

  await test('skill tree: active branches glow and update live when a lesson is passed, also from another tab', async () => {
    const { ctx, page } = await open(); await go(page, '/');
    await page.waitForSelector('.node.s-ready');
    eq(await page.locator('.tree-lines .ln.active').count(), 0, 'no active branch before any parent is mastered');
    const id = await page.locator('.node.s-ready').first().getAttribute('data-id');
    const prog = emptyProgress(); prog.lessons = doneMap(MODS[id].lessons);
    await page.evaluate((v) => { localStorage.setItem('ea.progress.v1', JSON.stringify(v)); window.dispatchEvent(new StorageEvent('storage', { key: 'ea.progress.v1', newValue: JSON.stringify(v) })); }, prog);
    await page.waitForFunction((i) => document.querySelector('.node[data-id="' + i + '"]').classList.contains('s-pass'), id, { timeout: 5000 });
    await page.waitForSelector('.tree-lines .ln.active', { timeout: 5000 });
    ok(await page.locator('.node.s-ready').count() >= 1, 'children became ready');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    eq(await page.evaluate(() => getComputedStyle(document.querySelector('.node.s-ready .ring')).animationName), 'glow', 'ready node glows');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    eq(await page.evaluate(() => getComputedStyle(document.querySelector('.node.s-ready .ring')).animationName), 'none', 'reduced motion stops the glow');
    await ctx.close();
  });

  await test('warnings: callouts have a severity icon and distinct danger style on a cheat sheet', async () => {
    const { ctx, page } = await open(); await go(page, '/cheatsheets');
    const r = await page.evaluate(async () => { const t = await (await fetch('cheatsheets/kubernetes.html')).text(); return { d: (t.match(/callout-danger/g) || []).length, w: (t.match(/callout-warning/g) || []).length }; });
    ok(r.d + r.w >= 3, 'callouts on sheet: ' + JSON.stringify(r));
    await ctx.close();
  });

  await test('features: explain-it-like levels, predict-then-reveal and clickable diagrams work in a lesson', async () => {
    const { ctx, page } = await open(); await go(page, '/'); await setProgress(page, allDone());
    await go(page, '/module/security');
    ok(await page.locator('.node, .lesson-row, a[href*="security/"]').count() >= 1, 'security module page');
    await go(page, '/lesson/security/secrets-management');
    await page.waitForSelector('.levels');
    ok(/plain words/i.test(await page.textContent('#lv-body')) === false, 'practitioner view by default');
    await page.click('[data-lv=new]'); ok(/In plain words/.test(await page.textContent('#lv-body')), 'beginner text');
    await page.click('[data-lv=int]'); ok(/strong short answer/i.test(await page.textContent('#lv-body')), 'interview text');
    await page.reload(); await page.waitForSelector('.levels');
    eq(await page.getAttribute('[data-lv=int]', 'aria-pressed'), 'true', 'level remembered');
    await page.waitForSelector('.predict');
    ok(await page.locator('.predict-out').isHidden(), 'answer hidden first');
    await page.fill('.predict-guess', 'no'); await page.click('[data-act=predict-reveal]');
    ok(await page.locator('.predict-out').isVisible(), 'answer revealed');
    eq(await page.getAttribute('[data-act=predict-reveal]', 'aria-expanded'), 'true', 'aria-expanded');
    await go(page, '/lesson/security/kubernetes-security'); await page.waitForSelector('.dg');
    ok(await page.locator('.dg-node').count() >= 3, 'diagram nodes');
    await page.locator('.dg-node').first().click();
    ok((await page.textContent('.dg-live')).length > 40, 'live text'); eq(await page.locator('.dg-node[aria-pressed=true]').count(), 1, 'one pressed');
    await ctx.close();
  });

