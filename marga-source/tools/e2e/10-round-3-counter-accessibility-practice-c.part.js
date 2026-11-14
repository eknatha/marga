  // ------------------------------------------------------------ round 3: counter, accessibility, practice, cases
  const calcLib = require('../src/app/calc.js');
  const near = (a, b, t, m) => ok(Math.abs(a - b) <= (t || 1e-6), `${m}: got ${a}, expected ${b}`);
  await test('calculators: formulas give the expected numbers', async () => {
    const m = calcLib.math;
    near(m.budgetMinutes(99.9, 30), 43.2, 1e-9, 'budget');
    near(m.serial([0.999, 0.999, 0.999, 0.999]), 0.996006, 1e-6, 'serial');
    near(m.parallel([0.9, 0.9]), 0.99, 1e-12, 'parallel');
    near(m.kOfN(3, 2, 0.99), 0.999702, 1e-9, '2 of 3');
    near(m.kOfN(5, 1, 0.9), 1 - Math.pow(0.1, 5), 1e-12, '1 of 5');
    near(m.kOfN(4, 4, 0.9), Math.pow(0.9, 4), 1e-12, '4 of 4');
    const c = m.cloudCost({ instances: 10, hours: 500, rate: 0.2, reservedDiscount: 40, spotDiscount: 65, spotOverhead: 10 });
    near(c.onDemand, 1000, 1e-9, 'on demand'); near(c.reserved, 876, 1e-9, 'reserved'); near(c.spot, 385, 1e-9, 'spot'); near(c.breakEvenHours, 438, 1e-9, 'break even');
    const r = m.recovery({ sizeGb: 500, mbps: 200, backupHours: 24, detectMin: 20, opsMin: 60 });
    near(r.restoreMin, 500 * 1024 / 200 / 60, 1e-9, 'restore'); near(r.rtoMin, 500 * 1024 / 200 / 60 + 80, 1e-9, 'rto'); near(r.rpoMin, 1440, 1e-9, 'rpo');
    near(m.retryLoad(4, 3), 256, 1e-9, 'retry'); near(m.retryBudgetLoad(4, 10), 1.4641, 1e-9, 'budget retry');
    const k = m.cells({ users: 1e6, cells: 8, overheadPct: 4 });
    near(k.blastShare, 0.125, 1e-12, 'blast'); near(k.costMultiplier, 1.28, 1e-12, 'cell cost');
    const cap = m.capacity({ peakRps: 5000, perNodeRps: 400, targetUtil: 60, zones: 3, surviveZone: 1 });
    eq(cap.base, 21, 'base'); eq(cap.total, 33, 'total'); eq(cap.perZone, 11, 'per zone');
    eq(m.capacity({ peakRps: 5000, perNodeRps: 400, targetUtil: 60, zones: 1, surviveZone: 1 }).total, 21, 'single zone');
    for (const d of calcLib._defs) {
      const v = {}; d.inputs.forEach((i) => { v[i.id] = i.value; });
      const rows = d.compute(v);
      ok(rows.length >= 3 && rows.every((x) => x.length === 3 && !/NaN|undefined|Infinity/.test(x.join(' '))), `${d.id} outputs: ${JSON.stringify(rows).slice(0, 120)}`);
    }
  });

  await test('visitor count: counts each page view, shows unique visitors, keeps the last value, retries', async () => {
    const { ctx, page, hits } = await open({ counterBody: '{"count":"5 000","count_unique":"1987"}' });
    await ctx.addInitScript(() => { window.MARGA_FORCE_REMOTE = true; });
    await page.goto(BASE + '/#/cases');
    await page.waitForFunction(() => /^\d[\d ]* visitors?$/.test(document.querySelector('#visitors').textContent.trim()));
    eq((await page.textContent('#visitors')).trim(), '1987 visitors', 'prefers unique visitors');
    await nav(page, '/practice'); await nav(page, '/practice'); await nav(page, '/flashcards');
    await page.waitForTimeout(300);
    const paths = hits.map((u) => new URL(u).searchParams.get('p'));
    ok(paths.includes('/cases') && paths.includes('/practice') && paths.includes('/flashcards'), 'page views recorded: ' + paths.join(','));
    eq(paths.filter((x) => x === '/practice').length, 1, 'same route twice in a row is counted once');
    ok(hits.every((u) => /[?&]s=\d+,\d+,/.test(u) && /[?&]t=/.test(u)), 'hit carries size and title');
    await ctx.close();
    // counter goes down: last good value is still shown, and the page keeps working
    const second = await browser.newContext({ serviceWorkers: 'block' });
    await second.addInitScript(() => { window.MARGA_FORCE_REMOTE = true; localStorage.setItem('ea.vc', JSON.stringify({ n: '1987', t: Date.now() })); });
    let tries = 0;
    await second.route(/goatcounter\.com/, (r) => { if (/\/counter\//.test(r.request().url())) { tries++; return r.abort(); } return r.fulfill({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') }); });
    const p2 = await second.newPage(); const errs = []; p2.on('pageerror', (e) => errs.push(e.message));
    await p2.goto(BASE + '/'); await p2.waitForSelector('#main h1');
    await p2.waitForFunction(() => /^\d[\d ]* visitors?$/.test(document.querySelector('#visitors').textContent.trim()));
    eq((await p2.textContent('#visitors')).trim(), '1987 visitors', 'cached value while offline');
    await p2.waitForTimeout(4500);
    ok(tries >= 2, 'retried: ' + tries);
    eq(errs.length, 0, errs.join('|'));
    await second.close();
  });

  await test('visitor count: a small total is not shown, and the limit can be lowered', async () => {
    const { ctx, page } = await open({ counterBody: '{"count":"300","count_unique":"87"}' });
    await ctx.addInitScript(() => { window.MARGA_FORCE_REMOTE = true; });
    await page.goto(BASE + '/'); await page.waitForSelector('#main h1');
    await page.waitForTimeout(3000);
    ok(await page.locator('#visitors').isHidden(), 'hidden below 1000');
    eq((await page.textContent('#visitors')).trim(), '', 'no text');
    ok(/free/i.test(await page.textContent('.foot-proof')), 'the footer still says what the site is');
    await ctx.close();
    const low = await open({ counterBody: '{"count":"300","count_unique":"87"}' });
    await low.ctx.addInitScript(() => { window.MARGA_FORCE_REMOTE = true; window.MARGA_COUNTER_MIN = 50; });
    await low.page.goto(BASE + '/');
    await low.page.waitForFunction(() => /^87 visitors$/.test(document.querySelector('#visitors').textContent.trim()));
    await low.ctx.close();
  });

  await test('visitor count: standalone cheat sheet pages count a view and show the total', async () => {
    const { ctx, page, hits } = await open({ counterBody: '{"count":"3000","count_unique":"2007"}' });
    await ctx.addInitScript(() => { window.MARGA_FORCE_REMOTE = true; });
    await page.goto(`${BASE}/cheatsheets/aws.html`);
    await page.waitForFunction(() => /^\d[\d ]* visitors?$/.test(document.querySelector('#visitors').textContent.trim()));
    eq((await page.textContent('#visitors')).trim(), '2007 visitors', 'sheet total');
    ok(hits.some((u) => new URL(u).searchParams.get('p') === '/cheatsheets/aws.html'), 'sheet view recorded: ' + hits.join(' '));
    await page.goto(`${BASE}/cheatsheets/`);
    await page.waitForSelector('#visitors:not([hidden])');
    await ctx.close();
  });

  await test('accessibility panel: text size, fonts, spacing, contrast, motion, links, focus; saved and reset', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/');
    ok(await page.locator('#a11y-panel').isHidden(), 'panel closed at first');
    await page.click('[data-act=a11y]');
    ok(await page.locator('#a11y-panel').isVisible(), 'panel opens');
    eq(await page.getAttribute('[data-act=a11y]', 'aria-expanded'), 'true', 'aria-expanded');
    await page.selectOption('#a11y-fs', '130');
    eq(await page.getAttribute('html', 'data-a-fs'), '130', 'attr');
    eq(await page.evaluate(() => getComputedStyle(document.documentElement).zoom), '1.3', 'zoom applied');
    await page.selectOption('#a11y-font', 'dyslexic');
    ok(/OpenDyslexic/.test(await page.evaluate(() => getComputedStyle(document.body).fontFamily)), 'dyslexia-friendly font in use');
    await page.selectOption('#a11y-font', 'atkinson');
    ok(/Atkinson/.test(await page.evaluate(() => getComputedStyle(document.body).fontFamily)), 'Atkinson in use');
    await page.selectOption('#a11y-lh', 'loose');
    ok(await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.lede')).lineHeight) / parseFloat(getComputedStyle(document.querySelector('.lede')).fontSize) >= 2), 'loose line spacing');
    await page.selectOption('#a11y-sp', 'wide');
    ok(await page.evaluate(() => getComputedStyle(document.body).letterSpacing !== 'normal'), 'wide spacing');
    await page.selectOption('#a11y-contrast', 'high');
    eq(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim().toLowerCase()), '#000000', 'high contrast ink');
    await page.selectOption('#a11y-links', 'underline');
    ok(await page.evaluate(() => getComputedStyle(document.querySelector('#footer a')).textDecorationLine.includes('underline')), 'links underlined');
    await page.selectOption('#a11y-motion', 'reduce');
    eq(await page.getAttribute('html', 'data-a-motion'), 'reduce', 'motion attr');
    await page.selectOption('#a11y-focus', 'strong');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ea.a11y')));
    eq(saved.fs, '130', 'saved size'); eq(saved.font, 'atkinson', 'saved font');
    await page.keyboard.press('Escape');
    ok(await page.locator('#a11y-panel').isHidden(), 'Escape closes');
    eq(await page.evaluate(() => document.activeElement.getAttribute('data-act')), 'a11y', 'focus returns to the button');
    await page.reload(); await page.waitForSelector('#main h1');
    eq(await page.getAttribute('html', 'data-a-fs'), '130', 'persisted after reload');
    await page.click('[data-act=a11y]');
    eq(await page.inputValue('#a11y-font'), 'atkinson', 'panel shows saved font');
    await page.click('[data-a11y=reset]');
    eq(await page.evaluate(() => ['fs', 'font', 'lh', 'sp', 'contrast', 'motion', 'links', 'focus'].filter((k) => document.documentElement.hasAttribute('data-a-' + k)).length), 0, 'reset clears attributes');
    eq(await page.evaluate(() => localStorage.getItem('ea.a11y')), null, 'reset clears storage');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('accessibility: corrupt saved options are ignored; larger text does not overflow on a phone', async () => {
    const { ctx, page } = await open({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { try { if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); localStorage.setItem('ea.a11y', '{"fs":"999","font":"<script>","lh":5}'); } } catch (e) {} });
    await go(page, '/');
    eq(await page.evaluate(() => document.documentElement.hasAttribute('data-a-fs')), false, 'invalid size ignored');
    await page.evaluate(() => { MargaA11y.set('fs', '130'); MargaA11y.set('font', 'dyslexic'); MargaA11y.set('sp', 'wide'); });
    for (const r of ['/', '/cases', '/practice', '/drills/linux', '/flashcards', '/interview/mock', '/lesson/linux/filesystem-and-navigation', '/architecture/aws-s3-us-east-1-2017']) {
      await nav(page, r); await page.waitForSelector('#main h1'); await page.waitForTimeout(80);
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(ov <= 2, `${r}: overflow ${ov}px at 130% text with dyslexia font`);
    }
    await ctx.close();
  });

  await test('spoken text is highlighted while reading, and the highlight can be turned off', async () => {
    const { ctx, page } = await open();
    await ctx.addInitScript(() => {
      const voices = [{ name: 'Test Voice A', lang: 'en-US', voiceURI: 'a', default: true, localService: true }];
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      let speaking = false;
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, speak(u) { speaking = true; window.__u = u; }, cancel() { speaking = false; }, pause() {}, resume() {}, get speaking() { return speaking; }, get paused() { return false; }, addEventListener() {}, removeEventListener() {} } });
    });
    await page.goto(BASE + '/#/lesson/linux/filesystem-and-navigation');
    await page.waitForSelector('.voice .v-play');
    await page.click('.voice .v-play');
    for (let i = 0; i < 6 && !(await page.locator('.say-now').count()); i++) {
      await page.waitForFunction(() => window.__u); await page.evaluate(() => { const u = window.__u; window.__u = null; u.onend(); });
      await page.waitForTimeout(80);
    }
    await page.waitForSelector('.say-now');
    ok((await page.locator('.say-now').first().innerText()).length > 5, 'a paragraph is highlighted');
    await page.click('.voice .v-stop');
    eq(await page.locator('.say-now').count(), 0, 'highlight cleared on stop');
    await page.evaluate(() => MargaA11y.set('hl', 'off'));
    await page.click('.voice .v-play'); await page.waitForTimeout(200);
    for (let i = 0; i < 4; i++) { await page.evaluate(() => { const u = window.__u; window.__u = null; if (u) u.onend(); }); await page.waitForTimeout(80); }
    eq(await page.locator('.say-now').count(), 0, 'no highlight when turned off');
    await ctx.close();
  });

  await test('case studies: 50 or more, filter, search, open, source links, read marks, deep links', async () => {
    const { ctx, page, issues } = await open();
    ok(data.cases.length >= 50, 'case studies: ' + data.cases.length);
    await go(page, '/cases');
    await page.waitForSelector('#case-list .case');
    eq(await page.locator('#case-list .case').count(), data.cases.length, 'all listed');
    await page.selectOption('#cs-area', 'Security');
    const sec = data.cases.filter((c) => c.area === 'Security').length;
    eq(await page.locator('#case-list .case').count(), sec, 'type filter');
    await page.selectOption('#cs-area', '');
    await page.fill('#cs-q', 'CrowdStrike'); await page.waitForTimeout(80);
    eq(await page.locator('#case-list .case').count(), 1, 'search');
    const card = page.locator('#case-list .case').first();
    ok(await card.locator('.case-body').isHidden(), 'body collapsed');
    await card.locator('.case-toggle').click();
    ok(await card.locator('.case-body').isVisible(), 'body opens');
    const href = await card.locator('a[target=_blank]').first().getAttribute('href');
    ok(/^https:\/\//.test(href) && (await card.locator('a[target=_blank]').first().getAttribute('rel')).includes('noopener'), 'source link: ' + href);
    ok(/Lesson/.test(await card.innerText()) && /Cause/.test(await card.innerText()), 'has structure');
    await card.locator('[data-act=case-read]').click();
    ok(Object.keys((await progress(page)).cs).length === 1, 'read recorded');
    await page.reload(); await page.waitForSelector('#case-list .case');
    await page.fill('#cs-q', 'CrowdStrike'); await page.waitForTimeout(80);
    ok(await page.locator('#case-list .case.read').count() === 1, 'read mark persists');
    await page.fill('#cs-q', ''); await page.click('[data-act=case-all]'); await page.waitForTimeout(50);
    ok(await page.locator('#case-list .case-body:visible').count() === data.cases.length, 'open all');
    // deep links
    await nav(page, '/cases/kubernetes'); await page.waitForSelector('#case-list .case');
    eq(await page.locator('#case-list .case').count(), data.cases.filter((c) => c.modules.includes('kubernetes')).length, 'stage deep link');
    const one = data.cases[5].id;
    await nav(page, '/cases/' + one); await page.waitForSelector('#case-' + one + ' .case-body:visible');
    // every module has real-world cases, all fields are present
    for (const m of data.modules) ok(data.cases.filter((c) => c.modules.includes(m.id)).length >= 2, `cases for ${m.id}`);
    for (const c of data.cases) ok(c.what && c.cause && c.fix && c.lesson && c.year > 1990 && /^https:\/\//.test(c.source.u), `case ${c.id} complete`);
    eq(issues.filter((x) => !/goatcounter|ERR_/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('architecture post-mortems: each opens with sections, sources and working calculators', async () => {
    const { ctx, page } = await open();
    ok(data.arch.length >= 8, 'studies: ' + data.arch.length);
    for (const a of data.arch) {
      await go(page, '/architecture/' + a.id);
      await page.waitForSelector('#arch-body h2');
      const heads = await page.locator('#arch-body h2').allInnerTexts();
      for (const h of ['The system', 'Timeline as reported', 'Root cause', 'Trade-offs to weigh']) ok(heads.includes(h), `${a.id} lacks "${h}"`);
      ok(await page.locator('.refs a[href^="https://"]').count() >= 1, `${a.id} source link`);
      const n = await page.locator('.calc').count();
      ok(n >= 1 && n === a.calcs.length, `${a.id} calculators ${n}/${a.calcs.length}`);
      ok(await page.locator('.calc .calc-row').count() >= 3, `${a.id} calculator output`);
    }
    await go(page, '/calculators');
    eq(await page.locator('.calc').count(), calcLib.list.length, 'all calculators on the page');
    const box = page.locator('.calc[data-calc=error-budget]');
    const before = await box.locator('.calc-out').innerText();
    await box.locator('[data-in=slo]').fill('99.99');
    await page.waitForTimeout(50);
    const after = await box.locator('.calc-out').innerText();
    ok(before !== after && /4.3 minutes/.test(after), 'recalculates live: ' + after.slice(0, 60));
    await box.locator('[data-in=slo]').fill('');
    await page.waitForTimeout(50);
    ok(!/NaN|undefined/.test(await box.locator('.calc-out').innerText()), 'empty input is handled');
    await nav(page, '/calculators/cloud-costs-nope'); await page.waitForSelector('#main h1');
    await nav(page, '/calculators/retries'); await page.waitForSelector('.calc');
    eq(await page.locator('.calc').count(), 1, 'single calculator page');
    await ctx.close();
  });

  await test('troubleshooting drills: 5 per module, answer, explanation, retry, progress', async () => {
    const { ctx, page, issues } = await open();
    for (const m of data.modules) ok(data.drills.filter((d) => d.module === m.id).length >= 5, `drills for ${m.id}`);
    for (const d of data.drills) ok(d.options.length >= 3 && d.options.filter((o) => o.ok).length === 1 && d.evidence.length > 20 && d.why.length > 40, `drill ${d.id} well formed`);
    await go(page, '/drills/linux');
    eq(await page.locator('.drill').count(), 7, 'seven drills on the page');
    const first = page.locator('.drill').nth(0), second = page.locator('.drill').nth(1);
    await first.locator('[data-act=drill-check]').click();
    ok(/Choose an answer/.test(await page.textContent('#toast')), 'asks for an answer first');
    await first.locator('input[value="1"]').check();
    await first.locator('[data-act=drill-check]').click();
    ok(await first.locator('.drill-res.ok').isVisible(), 'correct feedback');
    ok(/Correct/.test(await first.locator('.drill-res').innerText()), 'text says correct');
    ok(await first.locator('input:disabled').count() >= 3, 'inputs locked after checking');
    await second.locator('input[value="0"]').first().check();
    await second.locator('[data-act=drill-check]').click();
    ok(await second.locator('.drill-res.no').isVisible(), 'wrong feedback');
    ok(await second.locator('.opt-r.good').count() === 1 && await second.locator('.opt-r.bad').count() === 1, 'marks right and wrong options');
    await second.locator('[data-act=drill-retry]').click();
    ok(await second.locator('input:enabled').count() >= 3 && await second.locator('input:checked').count() === 0, 'retry resets');
    const dr = (await progress(page)).dr;
    const ids = Object.keys(dr);
    ok(ids.length === 2 && ids.filter((k) => dr[k].ok).length === 1, 'progress recorded: ' + JSON.stringify(dr));
    ok(new RegExp('1 of ' + data.drills.length + ' solved').test(await page.textContent('#drill-stats')), 'stats');
    await page.reload(); await page.waitForSelector('.drill');
    eq(await page.locator('.drill.solved').count(), 1, 'solved state persists');
    await page.selectOption('#dr-mod', 'docker'); await page.waitForSelector('#dg-docker');
    eq(await page.evaluate(() => location.hash), '#/drills/docker', 'stage filter navigates');
    eq(issues.filter((x) => !/goatcounter|ERR_/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('mock interview: set up, timed questions, reveal, self-score, results, history, ratings', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/interview/mock');
    await page.waitForSelector('#mk-role');
    await page.selectOption('#mk-role', 'sre'); await page.selectOption('#mk-level', 'mid'); await page.selectOption('#mk-n', '5'); await page.selectOption('#mk-secs', '60');
    await page.click('[data-act=mock-start]');
    await page.waitForSelector('.mock-q h2');
    ok(/Time left 1:0\d|Time left 0:5\d/.test(await page.textContent('#mk-time')), 'timer shows: ' + await page.textContent('#mk-time'));
    ok(await page.locator('#mk-ans').isHidden(), 'answer hidden until revealed');
    const picked = [];
    const scores = [2, 1, 0, 0, 0];
    for (let i = 0; i < 5; i++) {
      eq((await page.textContent('.mock-q .small')).startsWith(`Question ${i + 1} of 5`), true, `counter ${i + 1}`);
      const q = (await page.textContent('#mk-h')).trim(); picked.push(q);
      await page.click('#mk-reveal');
      ok(await page.locator('#mk-ans').isVisible() && await page.locator('#mk-score').isVisible(), 'reveal shows answer and scoring');
      await page.click(`#mk-score [data-s="${scores[i]}"]`);
    }
    await page.waitForSelector('.mock-res');
    ok(/Your result: 30%/.test(await page.textContent('#mr-h')), 'score: ' + await page.textContent('#mr-h'));
    ok(await page.locator('.mock-res .modbars li').count() >= 1, 'topic breakdown');
    const prog = await progress(page);
    eq(prog.mock.length, 1, 'history saved'); eq(prog.mock[0].score, 30, 'history score');
    const byQ = Object.fromEntries(data.interview.map((x) => [x.q, x.id]));
    eq(prog.iv[byQ[picked[0]]], 'know', 'nailed becomes known'); eq(prog.iv[byQ[picked[1]]], 'review', 'partly becomes review'); eq(prog.iv[byQ[picked[4]]], 'review', 'missed becomes review');
    eq(new Set(picked).size, 5, 'no repeated question');
    eq(await page.locator('.mk-miss').count(), 4, 'missed questions listed with answers');
    // start again, skip everything
    await page.click('[data-act=mock-again]'); await page.waitForSelector('#mk-role');
    await page.selectOption('#mk-n', '5'); await page.selectOption('#mk-secs', '0'); await page.click('[data-act=mock-start]');
    for (let i = 0; i < 5; i++) { await page.waitForSelector('.mock-q h2'); await page.click('[data-act=mock-skip]'); }
    await page.waitForSelector('.mock-res');
    ok(/Your result: 0%/.test(await page.textContent('#mr-h')), 'skipping scores zero');
    await page.reload(); await page.waitForSelector('.mock-hist li');
    eq(await page.locator('.mock-hist li').count(), 2, 'history list after reload');
    // too few questions for a combination
    await page.waitForSelector('#mk-role');
    await page.evaluate(() => { const s = document.querySelector('#mk-level'); s.innerHTML += '<option value="none">none</option>'; });
    await page.selectOption('#mk-level', 'none'); await page.click('[data-act=mock-start]');
    ok(/Not enough questions/.test(await page.textContent('#mk-msg')), 'explains when nothing matches');
    eq(issues.filter((x) => !/goatcounter|ERR_/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('interactive flashcards: decks, flip, rate, keys, summary, persistence', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/flashcards');
    await page.waitForSelector('#fc-deck');
    await page.selectOption('#fc-deck', 'docker'); await page.selectOption('#fc-order', 'order');
    await page.click('[data-act=fc-start]');
    await page.waitForSelector('.fc-card');
    const dockerCards = data.modules.find((m) => m.id === 'docker').lessons.reduce((n, l) => n + data.lessons[l].cards.length, 0);
    ok(new RegExp(`Card 1 of ${dockerCards}`).test(await page.textContent('.fc .small')), 'deck size');
    const firstQ = data.lessons[data.modules.find((m) => m.id === 'docker').lessons[0]].cards[0];
    ok((await page.textContent('.fc-front')).includes(firstQ.f), 'in lesson order');
    ok(await page.locator('.fc-back').isHidden(), 'answer hidden');
    ok(await page.locator('#fc-rate').isHidden(), 'rating hidden until flipped');
    await page.keyboard.press('2');
    ok(/Card 1 of/.test(await page.textContent('.fc .small')), 'cannot rate before flipping');
    await page.keyboard.press('Space');
    ok(await page.locator('.fc-back').isVisible() && (await page.textContent('.fc-back')).includes(firstQ.b), 'flips on Space');
    eq(await page.getAttribute('.fc-card', 'aria-pressed'), 'true', 'aria-pressed');
    await page.keyboard.press('2');
    ok(/Card 2 of/.test(await page.textContent('.fc .small')), 'rating advances');
    eq((await progress(page)).fc[`${data.modules.find((m) => m.id === 'docker').lessons[0]}#0`], 'k', 'known stored');
    await page.click('[data-act=fc-flip-btn]'); await page.keyboard.press('1');
    await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
    ok(/Card 1 of/.test(await page.textContent('.fc .small')) && /marked this as known/.test(await page.textContent('.fc .small')), 'back to card 1 shows known');
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
    ok(/Card 3 of/.test(await page.textContent('.fc .small')), 'arrow keys move');
    // finish the deck quickly
    for (let i = 3; i <= dockerCards; i++) { await page.click('[data-act=fc-next]'); }
    await page.waitForSelector('#fc-done');
    ok(/1 of|[0-9]+ of/.test(await page.textContent('#fc-root')), 'summary');
    await page.click('[data-act=fc-again]'); await page.waitForSelector('.fc-card');
    ok(!new RegExp(`Card 1 of ${dockerCards}\\b`).test(await page.textContent('.fc .small')), 'second round skips the known card');
    await page.reload(); await page.waitForSelector('#fc-deck');
    ok(/1 cards marked as known/.test(await page.textContent('#fc-msg')), 'known count persists: ' + await page.textContent('#fc-msg'));
    await page.selectOption('#fc-deck', 'interview'); await page.click('[data-act=fc-start]'); await page.waitForSelector('.fc-card');
    ok(new RegExp(`Card 1 of ${data.interview.length}\\b`).test(await page.textContent('.fc .small')), 'InterviewHub deck');
    eq(issues.filter((x) => !/goatcounter|ERR_/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('practice hub and navigation: Practice, Case studies, search, module links, export and import keep new data', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    const links = await page.locator('#topnav > a').allInnerTexts();
    eq(links.join('|'), 'Skills|Skill trees|Practice|Real Linux labs|Progress|Interview questions|About', 'nav order');
    await nav(page, '/practice');
    eq(await page.locator('.prac li').count(), 47, 'hub cards');
    for (const href of ['#/drills', '#/interview/mock', '#/flashcards', '#/cases', '#/architecture', '#/calculators', '#/review', '#/terminal-labs']) ok(await page.locator(`.prac a[href="${href}"]`).count() === 1, 'hub links to ' + href);
    await nav(page, '/module/kubernetes');
    ok(await page.locator('a[href="#/drills/kubernetes"]').count() === 1 && await page.locator('a[href="#/cases/kubernetes"]').count() === 1, 'module page links to practice');
    // search finds case studies and post-mortems
    await page.keyboard.press('/'); await page.fill('#sinput, #smodal input', 'Knight Capital');
    await page.waitForTimeout(150);
    ok(/Case study/.test(await page.locator('#sres').innerText()), 'search finds the case study');
    await page.keyboard.press('Escape');
    // export / import round trip keeps the new fields
    const p = await progress(page) || emptyProgress();
    p.cs = { 'knight-capital-deployment': 1 }; p.dr = { 'linux-1': { n: 1, ok: true } }; p.fc = { 'linux/filesystem-and-navigation#0': 'k' }; p.mock = [{ score: 70, n: 5, label: 'x', day: '2026-01-01' }];
    await page.evaluate((o) => localStorage.setItem('ea.progress.v1', JSON.stringify(o)), p);
    await page.reload(); await nav(page, '/progress'); await page.waitForSelector('#import-file');
    const file = path.join(os.tmpdir(), 'marga-import.json'); fs.writeFileSync(file, JSON.stringify(p));
    await page.evaluate(() => localStorage.removeItem('ea.progress.v1'));
    await page.setInputFiles('#import-file', file);
    await page.waitForFunction(() => /"cs"/.test(localStorage.getItem('ea.progress.v1') || ''));
    const back = await progress(page);
    eq(back.cs['knight-capital-deployment'], 1, 'cases kept'); eq(back.dr['linux-1'].ok, true, 'drills kept'); eq(back.mock[0].score, 70, 'mock kept'); eq(Object.keys(back.fc).length, 1, 'flashcards kept');
    await ctx.close();
  });

  await test('print: case studies and drills print fully open with the watermark', async () => {
    const { ctx, page } = await open();
    await go(page, '/cases'); await page.waitForSelector('#case-list .case');
    await page.emulateMedia({ media: 'print' });
    ok(await page.locator('#case-list .case-body').first().evaluate((el) => getComputedStyle(el).display !== 'none'), 'bodies print even when collapsed');
    ok(/MARGA by EknathaLabs/.test(await page.evaluate(() => getComputedStyle(document.body, '::before').content)), 'watermark');
    ok(await page.locator('#a11y-panel').evaluate((el) => getComputedStyle(el).display === 'none'), 'panel hidden in print');
    const pdf = await page.pdf({ format: 'A4' });
    ok(pdf.length > 20000 && pdf.slice(0, 4).toString() === '%PDF', 'pdf produced');
    await ctx.close();
  });


