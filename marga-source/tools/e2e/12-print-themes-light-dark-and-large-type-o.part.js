  await test('print themes: Light, Dark and Large type on the print bar, remembered, each rendered as a real PDF that still carries the watermark', async () => {
    const { ctx, page, issues } = await open(); const sh = require('child_process'), os = require('os');
    await go(page, '/lesson/linux/filesystem-and-navigation'); await page.waitForSelector('[data-print-style]');
    eq(await page.locator('[data-print-style] option').count(), 3, 'three print styles');
    for (const v of ['light', 'dark', 'large']) {
      await page.selectOption('[data-print-style]', v);
      eq(await page.evaluate(() => document.documentElement.getAttribute('data-a-print') || 'light'), v, v + ': attribute set');
      await page.emulateMedia({ media: 'print' });
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      if (v === 'dark') ok(/^rgb\((\d+), (\d+), (\d+)\)$/.test(bg) && bg.match(/\d+/g).every((x) => +x < 90), 'dark print has a dark page: ' + bg); else ok(/255, 255, 255|rgba\(0, 0, 0, 0\)/.test(bg), v + ' print has a light page: ' + bg);
      const f = require('path').join(os.tmpdir(), 'marga-ps-' + process.pid + '.pdf'); await page.pdf({ path: f, format: 'A4', printBackground: true });
      ok(/MARGA by EknathaLabs/.test(sh.execSync('pdftotext -layout "' + f + '" -').toString()), v + ': the PDF has the watermark'); fs.unlinkSync(f);
      await page.emulateMedia({ media: 'screen' });
    }
    await go(page, '/handbook/linux'); await page.waitForSelector('[data-print-style]'); eq(await page.inputValue('[data-print-style]'), 'large', 'the choice is remembered on another page');
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('home page: the Real Linux labs band shows the scenario count and links to the labs, the Kind filters and the empty machine', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/'); await page.waitForSelector('.vmx');
    const t = await page.textContent('.vmx'); ok(/149 production-style scenarios/.test(t), 'count in the band: ' + t.slice(0, 160));
    ok(await page.locator('.vmx a[href="#/linux"]').count() >= 1 && await page.locator('.vmx a[href="#/linux/sandbox"]').count() === 1, 'buttons');
    for (const k of ['packages', 'tls']) ok(await page.locator('.vmx-kinds a[href*="topic=' + k + '"]').count() === 1, 'chip ' + k);
    await page.click('.vmx-kinds a[href*="topic=tls"]'); await page.waitForSelector('.tl-item'); eq(await page.locator('.tl-item').count(), 9, 'the TLS chip opens the nine TLS labs');
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('embed and workshop: bare embed pages, the embed builder, a workshop built, shared and read back from progress codes; phone width', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/embed');
    await page.selectOption('#em-kind', 'challenge'); await page.selectOption('#em-item', 'docker-run-a-web-server');
    ok(/<iframe src="https:\/\/[^"]+#\/embed\/challenge\/docker-run-a-web-server"/.test(await page.inputValue('#em-code')), 'iframe code for the challenge');
    await page.selectOption('#em-kind', 'linux'); ok(/#\/embed\/linux\//.test(await page.inputValue('#em-code')), 'iframe code for a lab');
    await go(page, '/embed/challenge/docker-run-a-web-server'); await page.waitForSelector('.embed-diy .diy-item');
    ok(await page.evaluate(() => document.body.classList.contains('embed') && getComputedStyle(document.querySelector('#chrome')).display === 'none'), 'site menus are hidden in embed mode');
    const it = page.locator('.diy-item'); await it.locator('input').fill('docker run -d --name web -p 8080:80 nginx'); await it.locator('[data-act="diy-check"]').click();
    ok(/Correct/.test(await it.locator('.diy-out').textContent()), 'embedded challenge is checked');
    ok(/MARGA by EknathaLabs/.test(await page.textContent('.embed-foot')), 'credit line');
    await go(page, '/embed/lesson/linux/disks-and-filesystems'); await page.waitForSelector('.embed-lesson .prose', { timeout: 20000 });
    ok((await page.textContent('.embed-lesson h1')).length > 5, 'embedded lesson title');
    await go(page, '/embed/linux/disk-full'); await page.waitForSelector('#vm-start');
    ok(await page.locator('.crumbs:visible').count() === 0, 'no breadcrumb in an embedded lab');
    await go(page, '/'); ok(await page.evaluate(() => !document.body.classList.contains('embed')), 'embed mode ends on other pages');
    await go(page, '/workshop');
    await page.fill('#ws-title', 'Linux basics night'); await page.fill('#ws-min', '60');
    await page.selectOption('#ws-kind', 'v'); await page.selectOption('#ws-item', 'disk-full'); await page.click('#ws-add');
    await page.selectOption('#ws-kind', 'c'); await page.selectOption('#ws-item', 'linux-biggest-memory-users'); await page.click('#ws-add');
    await page.selectOption('#ws-kind', 'l'); await page.selectOption('#ws-item', 'linux/users-groups-permissions'); await page.click('#ws-add');
    await page.click('#ws-add'); eq(await page.locator('#ws-list li').count(), 3, 'a duplicate is not added');
    await page.click('#ws-list li:nth-child(3) [data-up]'); ok(/Challenge|Lesson/.test(await page.textContent('#ws-list li:nth-child(2)')), 'reorder works');
    await page.click('#ws-make'); const url = await page.inputValue('#ws-url'); ok(/#\/workshop\/run\?t=Linux%20basics%20night&m=60&i=/.test(url), 'link has title, minutes and items');
    const rel = url.slice(url.indexOf('#') + 1);
    await go(page, rel); await page.waitForSelector('.ws-agenda');
    eq(await page.locator('.ws-agenda li').count(), 3, 'agenda items'); ok(/0 of 3 done/.test(await page.textContent('#ws-prog')), 'nothing done yet');
    ok(/60:00/.test(await page.textContent('#ws-clock')), 'timer shows the time box'); await page.click('#ws-t-go'); await page.waitForTimeout(1300); ok(!/^60:00/.test(await page.textContent('#ws-clock')), 'timer runs'); await page.click('#ws-t-reset');
    await page.evaluate(() => { const s = window.MargaApp.state(); s.vm = s.vm || { done: {}, h: {}, ok: {} }; s.vm.done['disk-full'] = 1; window.MargaApp.save(); });
    await page.reload(); await page.waitForSelector('.ws-agenda'); ok(/1 of 3 done/.test(await page.textContent('#ws-prog')), 'a solved lab ticks the agenda');
    await page.fill('#ws-name', 'Asha'); await page.click('#ws-code-btn'); const code = await page.inputValue('#ws-code'); ok(code.length > 20, 'progress code made');
    await page.locator('.ws-teacher summary').click(); await page.fill('#ws-codes', code + '\nnot-a-code'); await page.click('#ws-read');
    const tbl = await page.textContent('#ws-table'); ok(/Asha/.test(tbl) && /1 of 3/.test(tbl), 'teacher sees the learner and the count'); ok(/could not be read/.test(tbl), 'a bad code is reported');
    await go(page, '/workshop/run?t=x&i=l:nope/none'); ok(/no items/.test(await page.textContent('#main h1')), 'unknown items are dropped');
    const m = await open({ viewport: { width: 390, height: 800 } }); await go(m.page, rel); await m.page.waitForSelector('.ws-agenda');
    ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow at 390 px');
    await go(m.page, '/workshop'); ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'builder fits at 390 px'); await m.ctx.close();
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('hands-on interview rounds: every task exists, a round runs on a clock, scores hints and solves, gives a scorecard and a code the interviewer can read; a real lab solved inside a round counts', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/interview-lab');
    eq(await page.locator('.iv-round').count(), 5, 'five rounds');
    for (const r of await page.evaluate(() => window.MargaApp.interviewRounds)) {
      const ids = r.items.split(',').map((x) => x.split(':')); const known = await page.evaluate((a) => a.map(([k, id]) => k === 'v' ? !!window.MargaApp.vmLabs.find(id) : window.ACADEMY.challenges.some((c) => c.id === id)), ids);
      ok(known.every(Boolean), r.id + ': every task exists');
    }
    await go(page, '/interview-lab/round/warmup'); await page.waitForSelector('#iv-start');
    await page.fill('#iv-name', 'Ravi'); await page.click('#iv-start'); await page.waitForSelector('#iv-clock');
    ok(/^(19|20):/.test(await page.textContent('#iv-clock')), 'the clock starts at the time box');
    await go(page, '/linux/cpu-hog'); await page.waitForSelector('#iv-bar'); ok(/left/.test(await page.textContent('#iv-bar')), 'a bar shows the clock on other pages');
    await page.click('#vm-start'); await page.waitForFunction(() => /machine is running/i.test(document.querySelector('#vm-status').textContent), null, { timeout: 180000 });
    await page.click('#vm-hint');
    await page.click('#vm-term'); await new Promise((r) => setTimeout(r, 400));
    await page.keyboard.type('kill $(pidof report-job); kill $(pidof yes)', { delay: 4 }); await page.keyboard.press('Enter'); await new Promise((r) => setTimeout(r, 2500));
    await page.click('#vm-check'); await page.waitForFunction(() => /All \d+ checks pass/.test(document.querySelector('#vm-status').textContent), null, { timeout: 90000 });
    await go(page, '/interview-lab/round/warmup'); await page.waitForSelector('.iv-tasks');
    ok(/solved/.test(await page.textContent('.iv-tasks li:first-child')) && /1 hint/.test(await page.textContent('.iv-tasks li:first-child')), 'the solved lab and its hint show in the round');
    await page.click('#iv-done'); await page.waitForSelector('.iv-score');
    ok(/2 of 9 points/.test(await page.textContent('.iv-big')), 'one task solved with one hint scores 2 of 9');
    ok(/Solved/.test(await page.textContent('.iv-score tbody tr:first-child')) && /Not solved/.test(await page.textContent('.iv-score tbody tr:nth-child(2)')), 'scorecard rows');
    await page.click('#iv-code-btn'); const code = await page.inputValue('#iv-code'); ok(code.length > 20, 'code made');
    await go(page, '/interview-lab'); await page.fill('#iv-codes', code + '\nbroken'); await page.click('#iv-read');
    const t = await page.textContent('#iv-table'); ok(/Warm-up round/.test(t) && /2 of 9/.test(t), 'interviewer reads the code'); ok(/could not be read/.test(t), 'bad code reported');
    ok(/2 of 9 points/.test(await page.textContent('.iv-hist')), 'history keeps the round');
    await go(page, '/interview-lab/round/warmup'); await page.click('a:has-text("Try this round again")'); await page.waitForSelector('#iv-start'); await page.click('#iv-start'); await page.waitForSelector('#iv-clock');
    await page.evaluate(() => { const s = window.MargaApp.state(); s.ivl.run.start -= 25 * 60000; window.MargaApp.save(); });
    await go(page, '/interview-lab/round/warmup'); await page.waitForSelector('.iv-score'); ok(/0 of 9 points/.test(await page.textContent('.iv-big')), 'a round ends when the time is up');
    const m = await open({ viewport: { width: 390, height: 800 } }); await go(m.page, '/interview-lab/round/sre');
    ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow at 390 px'); await m.ctx.close();
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('role roadmaps: one map per role, a you-are-here marker that moves as skills are finished, jump button, print, phone width', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/roadmap');
    const paths = await page.evaluate(() => window.ACADEMY.paths.live);
    eq(await page.locator('.rm-card').count(), paths.length, 'one card per role');
    await go(page, '/roadmap/devops'); await page.waitForSelector('.rm-node');
    const dev = paths.find((p) => p.id === 'devops'); eq(await page.locator('.rm-node').count(), dev.modules.length, 'one node per skill');
    eq(await page.locator('#rm-here').count(), 1, 'exactly one marker'); ok(/Linux/i.test(await page.textContent('#rm-here h2')), 'the first skill is the starting point');
    ok(/You are here/.test(await page.textContent('#rm-here .rm-state')), 'marker text'); eq(await page.getAttribute('#rm-here', 'aria-current'), 'step', 'aria-current');
    const prog = emptyProgress(); prog.lessons = doneMap(MODS.linux.lessons); await setProgress(page, prog); await go(page, '/roadmap/devops'); await page.waitForSelector('.rm-node');
    ok(!/Linux/i.test(await page.textContent('#rm-here h2')), 'the marker moves on after Linux is finished'); ok(await page.locator('.rm-node.is-done').count() === 1, 'one finished node');
    await page.click('#rm-jump'); await page.waitForTimeout(500); ok(await page.evaluate(() => document.activeElement && document.activeElement.closest('#rm-cur, #rm-here') !== null), 'jump focuses the next lesson');
    ok((await page.getAttribute('#rm-next', 'href')).startsWith('#/lesson/'), 'continue link');
    await setProgress(page, allDone()); await go(page, '/roadmap/devops'); await page.waitForSelector('.rm-node');
    eq(await page.locator('#rm-here').count(), 0, 'no marker when everything is done'); eq(await page.locator('.rm-node.is-done').count(), dev.modules.length, 'all nodes done');
    await go(page, '/roadmap/nope'); ok(/does not exist/.test(await page.textContent('#main h1')), 'unknown role');
    const m = await open({ viewport: { width: 390, height: 800 } }); await go(m.page, '/roadmap/sre'); await m.page.waitForSelector('.rm-node');
    ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow at 390 px'); await m.ctx.close();
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('axe: the Linux lab, challenges, workshop, embed, interview rounds and roadmaps are accessible in both themes', async () => {
    const problems = [];
    for (const dark of [false, true]) {
      const { ctx, page } = await open({ dark }); await go(page, '/'); await setProgress(page, allDone());
      for (const r of ['/linux', '/linux/disk-full', '/challenges', '/lesson/kubernetes/pods-and-deployments', '/workshop', '/embed', '/interview-lab', '/interview-lab/round/linux', '/roadmap', '/roadmap/sre']) {
        await nav(page, r); await page.waitForSelector('#main h1'); await page.waitForTimeout(150);
        await page.addScriptTag({ content: AXE });
        const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'], rules: { 'color-contrast': { enabled: true } } })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id} (${v.nodes.length}) ${v.nodes[0].target.join(' ')} :: ${v.nodes[0].html.slice(0, 100)}`));
        for (const v of res) problems.push(`${dark ? 'dark' : 'light'} ${r}: ${v}`);
      }
      await ctx.close();
    }
    eq(problems.length, 0, '\n' + problems.slice(0, 20).join('\n'));
  });

  await test('real Linux lab offline: after one visit the machine starts again with no network', async () => {
    const { ctx, page } = await open({ sw: true }); await go(page, '/linux/broken-symlink');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.click('#vm-start'); await page.waitForFunction(() => /machine is running/i.test(document.querySelector('#vm-status').textContent), null, { timeout: 180000 });
    await page.waitForTimeout(1500);
    await page.evaluate(async () => { const c = await caches.keys(); window.__c = c.length; });
    await ctx.setOffline(true);
    await page.reload(); await page.waitForSelector('#vm-start');
    await page.click('#vm-start'); await page.waitForFunction(() => /machine is running/i.test(document.querySelector('#vm-status').textContent), null, { timeout: 180000 });
    await page.click('#vm-term'); await new Promise((r) => setTimeout(r, 400));
    await page.keyboard.type('ln -sfn releases/2024-09 /opt/app/current', { delay: 4 }); await page.keyboard.press('Enter'); await new Promise((r) => setTimeout(r, 1500));
    await page.click('#vm-check'); await page.waitForFunction(() => /All \d+ checks pass/.test(document.querySelector('#vm-status').textContent), null, { timeout: 90000 });
    await ctx.close();
  });

  await test('daily picks: Today page shows an incident game and a widget of the day, links work', async () => {
    const { ctx, page } = await open(); await go(page, '/today'); await page.waitForSelector('.today-case');
    eq(await page.locator('.today-case').count(), 3, 'case, incident game, widget');
    const g = await page.locator('a[href^="#/game/"]').first().getAttribute('href'); const w = await page.locator('a[href^="#/widget/"]').first().getAttribute('href');
    await nav(page, '/practice'); await nav(page, g.slice(1)); await page.waitForSelector('h1'); ok(!(await page.locator('h1').textContent()).includes('not found'), 'game opens');
    await nav(page, '/practice'); await nav(page, w.slice(1)); await page.waitForSelector('#wd-in'); ok(true, 'widget opens');
    await ctx.close();
  });

  await test('interactive widgets: every widget renders and responds, reset works, Try it on lessons, hub entry, phone width, axe in both themes', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/widgets'); await page.waitForSelector('.ex-list a');
    const WL = await page.evaluate(() => window.ACADEMY.widgets.map((w) => ({ id: w.id, module: w.module, lesson: w.lesson })));
    ok(WL.length >= 10, 'widgets exist');
    eq(await page.locator('.ex-list a').count(), WL.length, 'index lists every widget');
    for (const w of WL) {
      await go(page, '/practice'); await go(page, '/widget/' + w.id); await page.waitForSelector('#wd-dia svg.wd');
      const txt = await page.textContent('#main'); ok(!/NaN|undefined|Infinity|\[object/.test(txt), w.id + ' no bad numbers');
      ok(await page.locator('#wd-read .calc-row').count() >= 2, w.id + ' readouts');
      ok(await page.locator('#wd-verdict .sd-res').count() === 1, w.id + ' verdict');
      const before = await page.textContent('#wd-read');
      const moved = await page.evaluate(() => { const r = document.querySelector('#wd-in input[type=range]'); if (!r) return false; r.value = r.max; r.dispatchEvent(new Event('input', { bubbles: true })); return true; });
      if (moved) { await page.click('#wd-reset'); eq(await page.textContent('#wd-read'), before, w.id + ' reset restores the readouts'); }
      const tg = page.locator('.wdn.ctl').first();
      if (await tg.count()) { const a = await page.textContent('#wd-read'); await tg.focus(); await page.keyboard.press('Enter'); ok(await page.locator('#wd-dia svg.wd').count() === 1, w.id + ' node toggle keeps the diagram'); }
    }
    const tried = await page.evaluate(() => Object.keys((JSON.parse(localStorage.getItem('ea.progress.v1') || '{}')).wgt || {}).length);
    ok(tried >= 1, 'tried widgets are remembered');
    const first = WL.find((w) => w.lesson);
    { const prog = emptyProgress(); prog.lessons = doneMap(Object.keys(data.lessons)); prog.wgt = (await progress(page) || {}).wgt || {}; await setProgress(page, prog); }
    await go(page, '/practice'); await go(page, '/lesson/' + first.lesson); await page.waitForSelector('#try-it');
    ok(await page.locator('#try-it a[href="#/widget/' + first.id + '"]').count() === 1, 'lesson shows its widget under Try it');
    await page.click('#try-it a[href="#/widget/' + first.id + '"]'); await page.waitForSelector('#wd-dia svg.wd');
    const other = await page.evaluate(() => { const L = Object.keys(window.ACADEMY.lessons); const with_ = new Set(window.ACADEMY.widgets.map((w) => w.lesson)); return L.find((id) => !with_.has(id) && window.ACADEMY.widgets.some((w) => w.module === window.ACADEMY.lessons[id].module)); });
    if (other) { await go(page, '/practice'); await go(page, '/lesson/' + other); await page.waitForSelector('#try-it'); ok(/same skill/.test(await page.textContent('#try-it')), 'nearest widgets are offered for other lessons in the skill'); }
    await go(page, '/practice'); ok(await page.locator('a[href="#/widgets"]').count() >= 1, 'hub links to the widgets');
    eq(issues.length, 0, 'console: ' + issues.join(' | '));
    await ctx.close();
    const sample = WL.filter((w, i) => i % 7 === 0 || i < 10).map((w) => w.id);
    for (const dark of [false, true]) {
      const c = await open({ dark }); const pg = c.page;
      for (const id of sample) {
        await go(pg, '/practice'); await go(pg, '/widget/' + id); await pg.waitForSelector('#wd-dia svg.wd');
        await pg.addScriptTag({ content: AXE });
        const res = await pg.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id + ' ' + v.nodes.length).slice(0, 4));
        eq(res.length, 0, 'axe ' + id + ' ' + (dark ? 'dark' : 'light') + ' ' + res.join(' | '));
      }
      await pg.setViewportSize({ width: 390, height: 800 });
      for (const id of sample.slice(0, 6)) { await go(pg, '/practice'); await go(pg, '/widget/' + id); await pg.waitForSelector('#wd-dia svg.wd'); ok(await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), id + ' no sideways scroll at 390px'); }
      eq(c.issues.length, 0, 'console: ' + c.issues.join(' | '));
      await c.ctx.close();
    }
  });

  await test('system design lab: estimator, break-it simulator with fix toggle, case challenges, phone width, axe in both themes', async () => {
    const SD = await (async () => { const { ctx, page } = await open(); await go(page, '/system-design-lab'); await page.waitForSelector('#es-out .calc-row'); const r = await page.evaluate(() => { const e = window.MargaSD.estimate({ users: 20000000, perUser: 15, readPct: 70, respKb: 5, writeKb: 1, peak: 3, copies: 3, cap: 500, slo: 99.9 }); return { avg: Math.round(e.avg), peak: Math.round(e.peak), budget: e.budget, bad: window.MargaSD.estimate({ users: -1, perUser: 1, readPct: 1, respKb: 1, writeKb: 1, peak: 1, copies: 1, cap: 1, slo: 99 }).error }; }); await ctx.close(); return r; })();
    eq(SD.avg, 3472, 'average rps'); eq(SD.peak, 10417, 'peak rps'); ok(Math.abs(SD.budget - 43.2) < 0.01, 'budget minutes'); ok(/zero or more/.test(SD.bad), 'rejects negative input');
    for (const dark of [false, true]) {
      const { ctx, page, issues } = await open({ dark });
      await go(page, '/system-design-lab'); await page.waitForSelector('#sm-dia svg');
      ok(!/NaN|undefined|Infinity/.test(await page.textContent('#main')), 'no bad numbers');
      await page.fill('#es-u', '1000'); ok(/Peak requests per second/.test(await page.textContent('#es-out')), 'estimator updates'); await page.fill('#es-u', '-5'); ok(await page.locator('#es-out .calc-err').isVisible(), 'estimator error shows');
      await page.selectOption('#sm-d', 'config-push'); await page.click('[data-comp="cp"]');
      ok(/more than the whole month/.test(await page.textContent('#sm-out')), 'unfixed config push blows the budget');
      await page.check('#sm-fix'); ok(/5 percent/.test(await page.textContent('#sm-out')), 'fix reduces users affected');
      await page.focus('[data-comp="gen"]'); await page.keyboard.press('Enter'); ok(/file/.test(await page.textContent('#sm-out')), 'keyboard selects a component');
      await page.click('.sd-ch[data-ch="0"] .cf-opt[data-j="2"]'); ok(/Not quite/.test(await page.textContent('.sd-ch[data-ch="0"] .sd-fb')), 'wrong answer explained'); ok(/What the organisation changed/.test(await page.textContent('.sd-ch[data-ch="0"] .sd-fb')), 'after changes shown');
      ok(await page.locator('.sd-ch[data-ch="0"] a[href^="#/case-file/"]').count() === 1, 'case file link');
      eq(await page.locator('.sd-ch').count(), 8, 'eight challenges');
      await page.addScriptTag({ content: AXE });
      const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id + ': ' + v.nodes[0].target.join(' ')));
      eq(res.length, 0, 'axe ' + (dark ? 'dark' : 'light') + ' ' + res.join(' | '));
      await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(150);
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways scroll at 390px');
      eq(issues.length, 0, 'console: ' + issues.join(' | '));
      await ctx.close();
    }
  });

  await test('mock design interview: set up, six timed phases with notes, self-score, weak-phase links, history, phone width and axe', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/design-interview'); await page.waitForSelector('#sdi-go');
    await page.selectOption('#sdi-p', 'url-shortener'); await page.click('#sdi-go');
    await page.waitForSelector('#sdi-clock'); ok(/^\d+:\d\d$/.test(await page.textContent('#sdi-clock')), 'clock shows');
    for (let i = 0; i < 6; i++) { await page.fill('#sdi-n', 'notes ' + i); await page.click('#sdi-next'); }
    await page.waitForSelector('#sdi-score');
    eq(await page.locator('input[data-k]').count(), 18, 'eighteen checklist items');
    const boxes = await page.locator('input[data-k]').all(); for (let i = 0; i < 12; i++) await boxes[i].check();
    await page.click('#sdi-score'); await page.waitForSelector('#sdi-res');
    ok(/12 of 18 \(67 percent\)/.test(await page.textContent('#sdi-res')), 'score text');
    ok(await page.locator('#sdi-res a[href^="#/lesson/system-design/"]').count() >= 3, 'weak phase links and worked design link');
    ok(!/NaN|undefined/.test(await page.textContent('#main')), 'no bad text');
    await nav(page, '/practice'); await nav(page, '/design-interview'); await page.waitForSelector('#sdi-go');
    ok(/67 percent/.test(await page.textContent('#sdi')), 'history shows the last session');
    await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways scroll at 390px');
    await page.addScriptTag({ content: AXE });
    const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id + ': ' + v.nodes[0].target.join(' ')));
    eq(res.length, 0, 'axe ' + res.join(' | '));
    eq(issues.length, 0, 'console: ' + issues.join(' | '));
    await ctx.close();
  });

  await test('subnet playground: live results, errors, VLSM table, cloud reserve, summary', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/subnet');
    ok(/192\.168\.10\.128\/26/.test(await page.textContent('#sn-a-out')) && /255\.255\.255\.192/.test(await page.textContent('#sn-a-out')), 'inspect result');
    ok(await page.locator('.sn-bits .nb').count() === 26 && await page.locator('.sn-bits .hb').count() === 6, 'binary view marks 26 network bits');
    await page.fill('#sn-a', '10.1.2.3/8'); ok(/10\.0\.0\.0\/8/.test(await page.textContent('#sn-a-out')), 'live update');
    await page.fill('#sn-a', '10.1.2.3/40'); ok(await page.locator('#sn-a-out .calc-err').isVisible(), 'invalid prefix reports an error'); ok(!/NaN|undefined/.test(await page.textContent('#sn-a-out')), 'no NaN');
    await page.fill('#sn-a', '');
    ok(await page.locator('#sn-a-out .calc-err').count() === 1, 'blank reports an error');
    ok(/256 subnets|16 subnets/.test(await page.textContent('#sn-s-out')) || /16 subnets/.test(await page.textContent('#sn-s-out')), 'split output: ' + (await page.textContent('#sn-s-out')).slice(0, 50));
    await page.fill('#sn-sp', '10'); ok(/must be between/.test(await page.textContent('#sn-s-out')), 'prefix below parent is rejected');
    ok(/Yes|No/.test(await page.textContent('#sn-c-out')), 'check output'); eq(await page.locator('#sn-c-out .calc-big.ok').count(), 1, '10.0.0.200 is inside 10.0.0.0/24');
    await page.fill('#sn-c2', '10.0.1.9'); ok(/No, it is outside/.test(await page.textContent('#sn-c-out')), 'outside');
    await page.fill('#sn-c2', '10.0.0.128/25'); ok(/overlap/.test(await page.textContent('#sn-c-out')) && /inside the first/.test(await page.textContent('#sn-c-out')), 'overlap');
    await page.fill('#sn-c2', '10.0.1.0/24'); ok(/do not overlap/.test(await page.textContent('#sn-c-out')), 'no overlap');
    eq(await page.locator('#sn-v-out tbody tr').count(), 4, 'VLSM rows');
    const cloud = (await page.textContent('#sn-v-out')).replace(/\s+/g, ' ');
    ok(/web.*10\.20\.0\.0\/24/.test(cloud), 'cloud plan: ' + cloud.slice(0, 100));
    await page.uncheck('#sn-cloud'); const plain = (await page.textContent('#sn-v-out')).replace(/\s+/g, ' ');
    ok(/web.*10\.20\.0\.0\/24/.test(plain), 'plain plan'); await page.check('#sn-cloud');
    await page.fill('#sn-vl', 'big, 5000'); ok(await page.locator('#sn-v-out .calc-err').isVisible(), 'too big is explained');
    await page.fill('#sn-vl', ''); ok(await page.locator('#sn-v-out .calc-err').isVisible(), 'empty list is explained');
    ok(/5 networks became 2 routes/.test(await page.textContent('#sn-m-out')), 'summary: ' + await page.textContent('#sn-m-out'));
    await page.fill('#sn-m', '10.0.0.0/24\nbad'); ok(await page.locator('#sn-m-out .calc-err').isVisible(), 'bad line is explained');
    eq(issues.filter((x) => !/goatcounter/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('YAML playground: valid, risky, broken, JSON conversion, format, persistence', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/playground/yaml');
    ok(/Valid YAML/.test(await page.textContent('#yp-status')), 'good sample is valid: ' + await page.textContent('#yp-status'));
    eq(await page.locator('.yp-find .f-error, .yp-find .f-warn').count(), 0, 'good sample has no warnings or errors');
    await page.click('[data-s=risky]');
    const risky = await page.textContent('#yp-lint');
    ok(/does not match the pod template label/.test(risky), 'selector mismatch'); ok(/:latest/.test(risky), 'latest tag'); ok(/privileged/.test(risky), 'privileged'); ok(/hostNetwork/.test(risky), 'hostNetwork'); ok(/no resource requests/.test(risky), 'resources');
    ok(/problem/.test(await page.textContent('#yp-status')), 'status counts problems');
    await page.click('[data-s=broken]');
    ok(/Invalid YAML/.test(await page.textContent('#yp-status')) && /Line \d+/.test(await page.textContent('#yp-status')), 'broken gives a line number: ' + await page.textContent('#yp-status'));
    await page.fill('#yp-in', 'a: 1\n\tb: 2\n'); ok(/tab/i.test(await page.textContent('#yp-status')), 'tabs are explained');
    await page.fill('#yp-in', 'a: 1\na: 2\n'); ok(/duplicate/i.test(await page.textContent('#yp-status')), 'duplicate keys are reported');
    await page.fill('#yp-in', '   '); ok(/Nothing to check/.test(await page.textContent('#yp-status')), 'blank input');
    await page.fill('#yp-in', 'kind: Deployment\nspec:\n  replicas: 1\n'); const missing = await page.textContent('#yp-lint');
    ok(/apiVersion is missing/.test(missing) && /metadata\.name is missing/.test(missing) && /spec\.selector\.matchLabels is missing/.test(missing), 'missing fields: ' + missing.slice(0, 120));
    await page.fill('#yp-in', 'a: 1\n---\nb:\n  - x\n  - y\n'); ok(/2 documents/.test(await page.textContent('#yp-status')), 'multi-document');
    await page.click('[data-act=yaml-json]'); const js = JSON.parse(await page.textContent('#yp-out code')); eq(js.length, 2, 'two documents converted'); eq(js[1].b[1], 'y', 'values kept');
    await page.click('[data-s=json]'); await page.click('[data-act=yaml-format]');
    const y = await page.textContent('#yp-out code'); ok(/^service: billing/m.test(y) && /- 443/.test(y) && !/[{}]/.test(y), 'JSON became YAML: ' + y.slice(0, 60));
    await page.fill('#yp-in', 'a: [1, 2'); await page.click('[data-act=yaml-json]'); ok(/Fix the YAML/.test(await page.textContent('#toast')), 'conversion refuses broken input');
    await page.fill('#yp-in', 'keep: me\n'); await page.reload(); await page.waitForSelector('#yp-in');
    eq(await page.inputValue('#yp-in'), 'keep: me\n', 'text is remembered');
    eq(issues.filter((x) => !/goatcounter/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('Python playground: loads, runs, checks answers, explains errors, remembers, copes with no network', async () => {
    const NM = path.join(__dirname, '..', 'node_modules', 'pyodide');
    const { ctx, page, issues } = await open();
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/pyodide@[^/]+\//, (route) => {
      const f = path.join(NM, new URL(route.request().url()).pathname.split('/').pop());
      if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
      const type = f.endsWith('.wasm') ? 'application/wasm' : f.endsWith('.json') ? 'application/json' : f.endsWith('.zip') ? 'application/zip' : 'text/javascript';
      route.fulfill({ status: 200, contentType: type, headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(f) });
    });
    await go(page, '/playground/python');
    ok(await page.locator('#py-run').isDisabled(), 'Run is disabled until Python is loaded');
    await page.click('[data-act=py-load]');
    await page.waitForSelector('#py-run:not([disabled])', { timeout: 90000 });
    ok(/ready/.test(await page.textContent('#py-state')), 'ready message');
    await page.click('[data-act=py-run]'); await page.waitForSelector('#py-out:not([hidden])');
    ok(/"name": "api"/.test(await page.textContent('#py-out code')), 'free play runs: ' + await page.textContent('#py-out code'));
    await page.fill('#py-code', 'print(1/0)'); await page.click('[data-act=py-run]');
    await page.waitForFunction(() => /ZeroDivisionError/.test(document.querySelector('#py-out code').textContent));
    ok(await page.locator('#py-res .drill-res.no').isVisible(), 'error is flagged');
    await page.fill('#py-code', 'x = 5\nprint(x)'); await page.click('[data-act=py-run]');
    await page.waitForFunction(() => document.querySelector('#py-out code').textContent.trim() === '5');
    await page.fill('#py-code', 'print(x)'); await page.click('[data-act=py-run]');
    await page.waitForFunction(() => /NameError/.test(document.querySelector('#py-out code').textContent));
    // exercises
    await page.selectOption('#py-ex', 'backoff');
    ok(await page.locator('#py-check').isVisible() && /backoff/.test(await page.textContent('#py-task')), 'exercise shown');
    await page.click('[data-act=py-check]'); await page.waitForSelector('#py-res .drill-res.no');
    ok(/Not yet/.test(await page.textContent('#py-res')), 'starter code does not pass');
    await page.fill('#py-code', 'def backoff(attempt, base=1, cap=30):\n    return base * 2 ** attempt\n'); await page.click('[data-act=py-check]');
    await page.waitForFunction(() => /must stop at the cap/.test(document.querySelector('#py-res').textContent));
    ok(/the delay must stop at the cap/.test(await page.textContent('#py-res')), 'failing test message is shown: ' + await page.textContent('#py-res'));
    await page.click('[data-act=py-sol]'); ok(/min\(cap/.test(await page.textContent('#py-sol code')), 'solution can be shown');
    await page.fill('#py-code', 'def backoff(attempt, base=1, cap=30):\n    return min(cap, base * 2 ** attempt)\n'); await page.click('[data-act=py-check]');
    await page.waitForSelector('#py-res .drill-res.ok'); ok(/1 exercise solved/.test(await page.textContent('#py-res')), 'solved: ' + await page.textContent('#py-res'));
    eq((await progress(page)).py.backoff, 1, 'saved in progress');
    await page.selectOption('#py-ex', 'hosts'); await page.fill('#py-code', 'import ipaddress\ndef usable_hosts(c):\n    n = ipaddress.ip_network(c, strict=False)\n    return n.num_addresses if n.prefixlen >= 31 else n.num_addresses - 2\n');
    await page.click('[data-act=py-check]'); await page.waitForSelector('#py-res .drill-res.ok'); eq(Object.keys((await progress(page)).py).length, 2, 'two solved');
    await page.keyboard.press('Control+Enter');
    // no network: a clear message and the buttons stay usable
    const two = await open(); await two.ctx.route(/cdn\.jsdelivr\.net/, (r) => r.abort());
    await go(two.page, '/playground/python'); await two.page.click('[data-act=py-load]');
    await two.page.waitForFunction(() => /Could not download Python/.test(document.querySelector('#py-state').textContent), null, { timeout: 30000 });
    ok(await two.page.locator('#py-load').isEnabled(), 'can try again');
    eq(issues.filter((x) => !/goatcounter/.test(x)).length, 0, issues.join(' | '));
    await ctx.close(); await two.ctx.close();
  });

  await test('explainer filters: skill chips with counts, multi-select, search, watched, URL and remembered choice, empty state', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/explainers');
    await page.waitForSelector('.exf-chip');
    const total = await page.locator('#exf-list li').count();
    ok(total >= 380, 'explainers listed: ' + total);
    ok(/\d+ of \d+ explainers shown/.test(await page.textContent('#exf-count')), 'result count');
    eq(await page.locator('.exf-chip[data-mod="argocd"]').count(), 1, 'Argo CD chip');
    const n1 = Number((await page.textContent('.exf-chip[data-mod="argocd"] .exf-n')).trim());
    await page.click('.exf-chip[data-mod="argocd"]');
    eq(await page.locator('#exf-list li:not([hidden])').count(), n1, 'one skill narrows to its count');
    eq(await page.getAttribute('.exf-chip[data-mod="argocd"]', 'aria-pressed'), 'true', 'chip pressed');
    const n2 = Number((await page.textContent('.exf-chip[data-mod="k8s-ops"] .exf-n')).trim());
    await page.click('.exf-chip[data-mod="k8s-ops"]');
    eq(await page.locator('#exf-list li:not([hidden])').count(), n1 + n2, 'two skills add up');
    ok(/skill=argocd,k8s-ops/.test(await page.evaluate(() => location.hash)), 'URL keeps the skills: ' + await page.evaluate(() => location.hash));
    await page.fill('#exf-q', 'drift');
    const shown = await page.locator('#exf-list li:not([hidden])').count();
    ok(shown >= 1 && shown < n1 + n2, 'search narrows: ' + shown);
    await page.fill('#exf-q', 'zzzqqq');
    eq(await page.locator('#exf-empty').isVisible(), true, 'empty state');
    await page.click('#exf-empty [data-act="exf-clear"]');
    eq(await page.locator('#exf-list li:not([hidden])').count(), total, 'clear shows everything');
    await go(page, '/explainers?skill=argocd');
    await page.waitForSelector('.exf-chip');
    eq(await page.locator('#exf-list li:not([hidden])').count(), n1, 'URL restores the filter');
    await go(page, '/explainers/' + await page.locator('#exf-list li:not([hidden]) a').first().evaluate((a) => a.getAttribute('href').replace('#/explainers/', '')));
    await page.waitForSelector('.ex-svg');
    for (let i = 0; i < 40 && await page.locator('#ex-next').isEnabled(); i++) await page.click('#ex-next');
    await go(page, '/explainers');
    await page.waitForSelector('.exf-chip');
    ok(/1 of \d+ watched/.test(await page.textContent('.exf-g[data-mod="argocd"] .exf-prog')), 'watched counted');
    await page.check('#exf-unw');
    eq(await page.locator('#exf-list li:not([hidden])').count(), total - 1, 'hide watched removes one');
    await go(page, '/explainers');
    await page.waitForSelector('.exf-chip');
    eq(await page.isChecked('#exf-unw'), true, 'last choice is remembered');
    eq(issues.length, 0, 'no console issues: ' + issues.join('|'));
    await ctx.close();
  });

  await test('failure and recovery explainers: one filter, 85 stories, every skill has two, each linked to a lesson and its paths', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/explainers?kind=failure'); await page.waitForSelector('.exf-chip');
    eq(await page.locator('#exf-list li:not([hidden])').count(), 85, 'failure stories shown');
    eq(await page.isChecked('#exf-fail'), true, 'filter checked from the URL');
    eq(await page.locator('#exf-list .exf-g:not([hidden])').count(), data.modules.length, 'every skill has failure stories');
    for (const g of await page.locator('#exf-list .exf-g:not([hidden])').all()) ok((await g.locator('li:not([hidden])').count()) >= 2, 'two or more per skill');
    ok(/Failure and recovery/.test(await page.textContent('#exf-list li:not([hidden]) em')), 'tagged in the list');
    await page.uncheck('#exf-fail');
    ok((await page.locator('#exf-list li:not([hidden])').count()) >= 440, 'unchecking shows everything');
    ok(!/kind=failure/.test(await page.evaluate(() => location.hash)), 'URL drops the filter');
    await go(page, '/explainers/f-linux-disk-full'); await page.waitForSelector('.ex-svg');
    ok(/Failure and recovery/.test(await page.textContent('#main .page-head')), 'failure tag on the page');
    eq(await page.locator('#main .page-head a[href="#/lesson/linux/disks-and-filesystems"]').count(), 1, 'related lesson link');
    ok((await page.locator('#main .page-head a[href^="#/path/"]').count()) >= 3, 'path links');
    const prog = emptyProgress(); prog.lessons = doneMap(MODS.linux.lessons); await setProgress(page, prog);
    await go(page, '/lesson/linux/disks-and-filesystems'); await page.waitForSelector('#watch-it');
    ok(/full disk/.test(await page.textContent('#watch-it')), 'Watch it lists the tied explainer');
    await go(page, '/lesson/linux/filesystem-and-navigation'); await page.waitForSelector('#watch-it');
    ok(/same skill|for this lesson/.test(await page.textContent('#watch-it')), 'Watch it always has something');
    await go(page, '/module/linux');
    ok(/failure and recovery stor/.test(await page.textContent('#main')), 'skill page links failure stories');
    await go(page, '/path/sre');
    ok(/Watch along this path/.test(await page.textContent('#main')), 'path page watch row');
    eq(await page.locator('#main a[href*="kind=failure"]').count(), 1, 'path failure link');
    await go(page, '/explainers/f-linux-disk-full'); await page.waitForSelector('.ex-svg');
    for (let i = 0; i < 12 && await page.locator('#ex-next').isEnabled(); i++) await page.click('#ex-next');
    await go(page, '/lesson/linux/disks-and-filesystems'); await page.waitForSelector('#watch-it');
    ok(/Watched/.test(await page.textContent('#watch-it')), 'watched is shown on the lesson');
    ok(issues.filter((m) => !/goatcounter|ERR_/.test(m)).length === 0, 'no console issues: ' + issues.join('|'));
    await ctx.close();
  });

  await test('skill tree: default selection is the next skill, click shows details and highlights links, hover previews, locked skill points to its first prerequisite', async () => {
    const { ctx, page } = await open();
    await go(page, '/paths'); await page.waitForSelector('.tree .node');
    eq(await page.locator('.node.next').count(), 1, 'one next-up skill');
    eq(await page.locator('.tree').getAttribute('data-sel'), 'linux', 'linux selected at the start');
    ok(/Linux/.test(await page.textContent('.tree-detail h3')), 'panel shows linux');
    await page.waitForFunction(() => document.querySelectorAll('.tree-lines path').length >= 9);
    await page.click('.node[data-id="kubernetes"] a');
    eq(page.url().includes('/module/'), false, 'click selects instead of navigating');
    eq(await page.locator('.tree').getAttribute('data-sel'), 'kubernetes', 'selection moved');
    ok(/Kubernetes/.test(await page.textContent('.tree-detail h3')), 'panel updated');
    ok(/Docker and containers/.test(await page.textContent('.tree-detail')), 'panel lists prerequisites');
    ok(await page.locator('.tree-lines .ln.hl').count() >= 4, 'links to and from the selected skill are highlighted');
    ok(await page.locator('.node.rel').count() >= 4, 'related skills are marked');
    const first = page.locator('.tree-detail .td-cta a').first();
    ok(/First: /.test(await first.textContent()), 'locked skill points to the first prerequisite');
    await page.hover('.node[data-id="linux"] a');
    ok(await page.locator('.node[data-id="linux"].sel').count() === 1, 'hover previews');
    await page.mouse.move(2, 2);
    eq(await page.locator('.node[data-id="kubernetes"].sel').count(), 1, 'selection returns after hover');
    await page.focus('.node[data-id="linux"] a'); await page.keyboard.press('Enter');
    eq(await page.locator('.tree').getAttribute('data-sel'), 'linux', 'keyboard selects');
    ok(!/undefined|NaN|\[object Object\]/.test(await page.textContent('.tree-wrap')), 'clean text');
    for (const i of [1, 2, 3, 4]) { await page.locator('.tab').nth(i).click(); await page.waitForSelector('.tree .node'); ok(await page.locator('.tree-detail h3').count() === 1, 'panel on tab ' + i); }
    await ctx.close();
  });

  await test('skill tree on mobile: nodes in a list, tap opens a bottom sheet, close button hides it, no sideways scroll', async () => {
    const { ctx, page } = await open({ viewport: { width: 390, height: 844 } });
    await go(page, '/paths'); await page.waitForSelector('.tree .node');
    eq(await page.locator('.tree-detail').isHidden(), true, 'sheet hidden at first');
    await page.click('.node[data-id="kubernetes"] a');
    await page.waitForSelector('.tree-detail', { state: 'visible' });
    ok(await page.locator('.td-close').isVisible(), 'close button');
    eq(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'no sideways scroll');
    await page.click('.td-close');
    eq(await page.locator('.tree-detail').isHidden(), true, 'sheet closes');
    await ctx.close();
  });

  await test('skill trees panel: hover and keyboard open all five paths, links work, Escape closes, Real Linux labs sits beside Practice, no author line', async () => {
    const { ctx, page } = await open({ viewport: { width: 1700, height: 900 } });
    await go(page, '/');
    eq(await page.locator('#pmega').isHidden(), true, 'closed at rest');
    const names = await page.locator('#topnav > a').allInnerTexts();
    eq(names.indexOf('Real Linux labs'), names.indexOf('Practice') + 1, 'Real Linux labs right after Practice');
    await page.hover('#topnav a[data-nav="paths"]');
    await page.waitForSelector('#pmega:not([hidden]) .pm-col');
    eq(await page.locator('#pmega .pm-col').count(), 6, 'six path columns');
    const skills = await page.locator('#pmega .pm-col').first().locator('.pm-list li').count();
    ok(skills >= 15, 'first path lists its skills: ' + skills);
    const bad = /undefined|NaN|\[object Object\]/.test(await page.textContent('#pmega')); eq(bad, false, 'panel text clean');
    const box = await page.locator('#pmega').boundingBox(); ok(box.width >= 1200 && box.y < 120, 'panel under the header, full width');
    await page.click('#pmega .pm-list a >> nth=0'); await page.waitForFunction(() => /#\/module\//.test(location.hash));
    await page.mouse.move(5, 500); await page.waitForSelector('#pmega', { state: 'hidden' });
    eq(await page.locator('#pmega').isHidden(), true, 'closes after choosing a skill');
    await page.focus('#topnav a[data-nav="paths"]');
    await page.waitForSelector('#pmega:not([hidden])');
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    eq(await page.locator('#pmega').isVisible(), true, 'stays open while tabbing inside');
    await page.keyboard.press('Escape');
    eq(await page.locator('#pmega').isHidden(), true, 'Escape closes');
    await go(page, '/');
    ok(!/Built by Eknatha|Senior Platform Engineer at IBM/.test(await page.textContent('#main')), 'no author line on the landing page');
    await ctx.close();
  });

  await test('skill trees panel on mobile: tap expands inside the menu', async () => {
    const { ctx, page } = await open({ viewport: { width: 390, height: 844 } });
    await go(page, '/');
    await page.click('.menu-btn');
    eq(await page.locator('#pmega').isHidden(), true, 'collapsed in the menu');
    await page.click('.pm-toggle');
    await page.waitForSelector('#pmega:not([hidden]) .pm-col');
    eq(await page.locator('.pm-toggle').getAttribute('aria-expanded'), 'true', 'expanded flag');
    eq(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, 'no sideways scroll');
    await page.click('.pm-toggle');
    eq(await page.locator('#pmega').isHidden(), true, 'collapses again');
    await ctx.close();
  });

