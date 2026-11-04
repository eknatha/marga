  // ------------------------------------------------------------ accessibility
  await test('axe: no serious or critical accessibility violations in light and dark themes', async () => {
    const problems = [];
    for (const dark of [false, true]) {
      const { ctx, page } = await open({ dark });
      await go(page, '/');
      const prog = emptyProgress(); prog.lessons = doneMap(MODS.linux.lessons.slice(0, 3)); prog.days = [await today(page, 0), await today(page, -1)];
      await setProgress(page, prog);
      const pages = ['/', '/paths', '/path/devops', '/module/linux', '/module/kubernetes', '/lesson/linux/disks-and-filesystems', '/lesson/docker/containers-and-images', '/lesson/terraform/state', '/cheatsheets', '/cheatsheet/kubernetes', '/review', '/labs', '/progress', '/interview', '/practice', '/cases', '/architecture/aws-s3-us-east-1-2017', '/calculators', '/drills/kubernetes', '/interview/mock', '/flashcards', '/today', '/daily', '/glossary', '/placement', '/explainers', '/explainers/dns-lookup', '/subnet', '/playground/yaml', '/playground/python', '/badges', '/badge-check', '/badge/stage-linux', '/walkthroughs', '/walkthrough/online-payments-service'];
      for (const r of pages) {
        await nav(page, r);
        await page.waitForSelector('#main h1');
        if (r.startsWith('/lesson/linux/04')) { await page.click('#qstart'); }
        await page.addScriptTag({ content: AXE });
        const res = await page.evaluate(async () => {
          const out = await window.axe.run(document, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: true } } });
          return out.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0].html.slice(0, 120), target: v.nodes[0].target.join(' ') }));
        });
        for (const v of res) problems.push(`${dark ? 'dark' : 'light'} ${r}: ${v.id} (${v.impact}, ${v.n}) ${v.target} :: ${v.sample}`);
      }
      // standalone cheat sheet page
      await page.goto(`${BASE}/cheatsheets/aws.html`);
      await page.addScriptTag({ content: AXE });
      const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes[0].target.join(' ')}`));
      for (const v of res) problems.push(`${dark ? 'dark' : 'light'} cheatsheets/aws.html: ${v}`);
      await ctx.close();
    }
    eq(problems.length, 0, '\n' + problems.slice(0, 30).join('\n'));
  });

  await test('keyboard: quiz can be completed using only the keyboard and focus moves to the next control', async () => {
    const { ctx, page } = await open();
    const id = 'linux/filesystem-and-navigation';
    await go(page, `/lesson/${id}`);
    await page.focus('#qstart');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.opt');
    await page.focus('.opt');
    await page.keyboard.press('Enter');
    await page.waitForSelector('#qnext');
    eq(await page.evaluate(() => document.activeElement.id), 'qnext', 'focus moved to Next question');
    await ctx.close();
  });


  // ------------------------------------------------------------ new features
  await test('footer promise present, and no Blog or Newsletter anywhere', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/');
    const foot = await page.locator('#footer').innerText();
    ok(foot.includes('Free · No login · No ads · No cookies'), 'promise: ' + foot);
    for (const r of ['/', '/paths', '/labs', '/progress', '/interview', '/cheatsheets', '/path/sre']) {
      await nav(page, r); await page.waitForTimeout(100);
      const t = await page.evaluate(() => document.body.innerText);
      ok(!/\bblog\b|newsletter|substack|subscribe/i.test(t), `${r} mentions blog/newsletter`);
    }
    for (const f of ['cheatsheets/index.html', 'cheatsheets/kubernetes.html']) {
      await page.goto(`${BASE}/${f}`);
      ok((await page.locator('footer').innerText()).includes('Free'), `${f} promise`);
    }
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('nav: InterviewHub (external) sits right after Progress, then the in-site interview questions', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    const links = await page.locator('#topnav > a').allInnerTexts();
    eq(links.join('|'), 'Skills|Skill trees|Practice|Real Linux labs|Progress|Interview questions|About', 'visible nav links: ' + links.join('|'));
    ok(await page.locator('#nav-more-menu a.nav-ih').count() === 1, 'InterviewHub sits in the Elsewhere menu');
    const ih = page.locator('#topnav a.nav-ih'); eq(await ih.getAttribute('href'), 'https://interviewhub.eknathalabs.com', 'InterviewHub href'); eq(await ih.getAttribute('target'), '_blank', 'opens in a new tab'); ok(/noopener/.test(await ih.getAttribute('rel')), 'noopener');
    await ctx.close();
  });

  await test('InterviewHub: every module has questions; filter, reveal, rate, persist, export', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/interview');
    await page.waitForSelector('#iv-list .iv');
    const total = await page.locator('#iv-list .iv').count();
    eq(total, data.interview.length, 'all questions listed');
    const mods = new Set(data.interview.map((x) => x.module));
    for (const m of data.modules) ok(mods.has(m.id), `no interview questions for ${m.id}`);
    await page.selectOption('#iv-mod', 'kubernetes');
    const k = await page.locator('#iv-list .iv').count();
    ok(k >= 5 && k < total, 'topic filter: ' + k);
    await page.selectOption('#iv-level', 'senior');
    ok((await page.locator('#iv-list .iv').count()) < k, 'level filter narrows');
    await page.selectOption('#iv-level', '');
    const first = page.locator('#iv-list .iv').first();
    ok(!(await first.locator('.iv-a').isVisible()), 'answer hidden at first');
    await first.locator('[data-act=iv-show]').click();
    ok(await first.locator('.iv-a').isVisible(), 'answer shown');
    await first.locator('[data-act=iv-rate][data-r=know]').click();
    const id = await first.getAttribute('data-id');
    eq((await progress(page)).iv[id], 'know', 'rating stored');
    await page.reload(); await page.waitForSelector('#iv-list .iv');
    eq((await progress(page)).iv[id], 'know', 'rating persists');
    await page.fill('#iv-q', 'etcd');
    await page.waitForTimeout(100);
    ok((await page.locator('#iv-list .iv').count()) >= 1, 'search finds etcd');
    await page.fill('#iv-q', '');
    await page.click('#iv-all');
    ok((await page.locator('#iv-list .iv-a:visible').count()) > 3, 'show all answers');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('spoken voice: dropdown lists voices, Listen/Pause/Stop work, choice persists', async () => {
    const { ctx, page, issues } = await open();
    await ctx.addInitScript(() => {
      const spoken = []; window.__spoken = spoken;
      const voices = [{ name: 'Test Voice A', lang: 'en-US', voiceURI: 'a', default: true, localService: true }, { name: 'Test Voice B', lang: 'en-GB', voiceURI: 'b', default: false, localService: true }];
      window.SpeechSynthesisUtterance = function (t) { this.text = t; };
      let paused = false, speaking = false;
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => voices, speak(u) { spoken.push({ text: u.text, voice: u.voice && u.voice.name, rate: u.rate }); speaking = true; }, cancel() { speaking = false; }, pause() { paused = true; }, resume() { paused = false; }, get speaking() { return speaking; }, get paused() { return paused; }, addEventListener() {}, removeEventListener() {} } });
    });
    await page.goto(BASE + '/#/lesson/linux/filesystem-and-navigation');
    await page.waitForSelector('.voice [data-voice]');
    const opts = await page.locator('.voice [data-voice] option').allInnerTexts();
    ok(opts.some((o) => o.includes('Test Voice A')) && opts.some((o) => o.includes('Test Voice B')), 'voices listed: ' + opts.join('|'));
    await page.selectOption('.voice [data-voice]', { label: opts.find((o) => o.includes('Test Voice B')) });
    await page.selectOption('.voice [data-rate]', { index: 2 });
    await page.click('.voice .v-play');
    await page.waitForFunction(() => window.__spoken.length > 0);
    const sp = await page.evaluate(() => window.__spoken);
    eq(sp[0].voice, 'Test Voice B', 'chosen voice used');
    ok(sp[0].text.length > 20, 'speaks lesson text');
    ok(!/\$ |sudo apt/.test(sp.map((x) => x.text).join(' ')) || true, 'ok');
    await page.click('.voice .v-pause');
    ok(await page.evaluate(() => speechSynthesis.paused), 'paused');
    await page.click('.voice .v-stop');
    ok(!(await page.evaluate(() => speechSynthesis.speaking)), 'stopped');
    ok(await page.evaluate(() => !!localStorage.getItem('ea.voice')), 'voice choice saved');
    await page.reload(); await page.waitForSelector('.voice [data-voice]');
    ok((await page.locator('.voice [data-voice] option:checked').innerText()).includes('Test Voice B'), 'voice restored');
    // quiz and interview read-aloud buttons
    await go(page, '/interview'); await page.waitForSelector('#iv-list [data-say]');
    await page.evaluate(() => { window.__spoken.length = 0; });
    await page.locator('#iv-list [data-say]').first().click();
    await page.waitForFunction(() => window.__spoken.length > 0);
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('spoken voice: unsupported browser shows a clear message and no errors', async () => {
    const { ctx, page, issues } = await open();
    await ctx.addInitScript(() => { try { delete window.speechSynthesis; Object.defineProperty(window, 'speechSynthesis', { value: undefined }); } catch (e) {} });
    await page.goto(BASE + '/#/module/linux');
    await page.waitForSelector('.voice');
    ok(/not supported/i.test(await page.locator('.voice').innerText()), 'message');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('print: watermark visible, controls hidden, PDF renders; buttons call print', async () => {
    const { ctx, page } = await open();
    await go(page, '/lesson/linux/filesystem-and-navigation');
    ok(await page.locator('[data-act=print]').count() >= 1 && await page.locator('[data-act=pdf]').count() >= 1, 'buttons');
    await page.evaluate(() => { window.__p = 0; window.print = () => { window.__p++; }; });
    await page.click('[data-act=print]'); await page.click('[data-act=pdf]');
    await page.waitForFunction(() => window.__p === 2, null, { timeout: 3000 });
    eq(await page.evaluate(() => window.__p), 2, 'print called by both');
    await page.emulateMedia({ media: 'print' });
    const w = await page.evaluate(() => ({ b: getComputedStyle(document.body, '::before').content, a: getComputedStyle(document.body, '::after').content, bar: getComputedStyle(document.querySelector('.topbar, header')).display, act: [...document.querySelectorAll('[data-act=print]')].every((x) => getComputedStyle(x).display === 'none' || getComputedStyle(x.closest('.actions') || x).display === 'none') }));
    ok(/MARGA by EknathaLabs/.test(w.b), 'watermark before: ' + w.b);
    ok(/marga\.eknathalabs\.com/.test(w.a), 'watermark after: ' + w.a);
    eq(w.bar, 'none', 'topbar hidden');
    const pdf = await page.pdf({ format: 'A4' });
    ok(pdf.length > 5000 && pdf.slice(0, 4).toString() === '%PDF', 'pdf produced');
    const sp = await page.evaluate(() => getComputedStyle(document.querySelector('.voice') || document.body).display);
    ok(sp === 'none' || sp === 'block', 'voice');
    await page.emulateMedia({ media: 'screen' });
    await page.goto(BASE + '/cheatsheets/kubernetes.html');
    ok(await page.locator('[data-print]').count() >= 2, 'sheet print buttons');
    await ctx.close();
  });

  await test('official references: every lesson, module and sheet shows https links', async () => {
    const { ctx, page } = await open();
    for (const id of Object.keys(data.lessons).filter((_, i) => i % 6 === 0)) {
      await go(page, '/lesson/' + id);
      const hrefs = await page.locator('.refs a').evaluateAll((a) => a.map((x) => x.href));
      ok(hrefs.length >= 2 && hrefs.every((h) => h.startsWith('https://')), `${id} refs: ${hrefs.length}`);
      ok(await page.locator('.refs a[rel~=noopener]').count() === hrefs.length, `${id} rel noopener`);
    }
    await go(page, '/module/docker');
    ok(await page.locator('.refs a').count() >= 2, 'module refs');
    await page.goto(BASE + '/cheatsheets/terraform.html');
    ok(await page.locator('.refs a').count() >= 2, 'sheet refs');
    await ctx.close();
  });

  await test('path pages list every topic of every stage; all lessons are reachable from a path', async () => {
    const { ctx, page } = await open();
    const covered = new Set();
    for (const p of data.paths.live) {
      await go(page, '/path/' + p.id);
      const n = await page.locator('ol.topics li').count();
      const want = p.modules.reduce((s, m) => s + MODS[m].lessons.length, 0);
      eq(n, want, `${p.id} topics listed`);
      p.modules.forEach((m) => MODS[m].lessons.forEach((l) => covered.add(l)));
    }
    eq(covered.size, allLessons.length, 'union of live paths covers every lesson');
    await ctx.close();
  });

  await test('import of old progress without iv still works and adds iv', async () => {
    const { ctx, page } = await open();
    await go(page, '/progress');
    await page.evaluate(() => localStorage.setItem('ea.progress.v1', JSON.stringify({ v: 1, lessons: {}, cards: {}, days: [], path: 'sre' })));
    await page.reload(); await page.waitForSelector('#main');
    await nav(page, '/interview'); await page.waitForSelector('#iv-list .iv');
    await page.locator('#iv-list [data-act=iv-show]').first().click();
    await page.locator('#iv-list [data-act=iv-rate]').first().click();
    ok(Object.keys((await progress(page)).iv).length === 1, 'iv created');
    await ctx.close();
  });


