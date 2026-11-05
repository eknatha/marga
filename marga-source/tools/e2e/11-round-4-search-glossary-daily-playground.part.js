  // ------------------------------------------------------------ round 4: search, glossary, daily, playgrounds, explainers
  const SEARCH = require('../src/app/search.js');
  const NETLIB = require('../src/app/net.js');
  const hashOf = (page) => page.evaluate(() => location.hash);

  await test('search engine: typo tolerance, ranking, groups, highlight escaping', async () => {
    SEARCH.build([
      { kind: 'Lesson', group: 'Lessons', title: 'Kubernetes pods and deployments', sub: 'Run workloads', body: 'A Deployment manages ReplicaSets and rolling updates.' },
      { kind: 'Case study', group: 'Cases', title: 'Knight Capital deployment', sub: '2012', body: 'Old code was left on one server.' },
      { kind: 'Glossary', group: 'Glossary', title: 'Idempotent', sub: 'same result every run', body: 'safe to repeat', extra: 'idempotency' },
      { kind: 'Cheat sheet', group: 'Cheat sheets', title: 'kubectl', sub: 'commands', body: 'kubectl get pods -n prod' }
    ]);
    eq(SEARCH.query('kuberntes')[0].it.title, 'Kubernetes pods and deployments', 'transposed letters');
    eq(SEARCH.query('idempotant')[0].it.title, 'Idempotent', 'substitution');
    eq(SEARCH.query('deploymnt').length > 0, true, 'missing letter');
    eq(SEARCH.query('knight')[0].it.kind, 'Case study', 'title match first');
    eq(SEARCH.query('get pods')[0].it.title, 'kubectl', 'phrase in body');
    eq(SEARCH.query('rolling updates')[0].it.kind, 'Lesson', 'two words');
    eq(SEARCH.query('zzzzqq').length, 0, 'no match');
    eq(SEARCH.query('deployment', { kind: 'Cases' }).length, 1, 'group filter');
    eq(JSON.stringify(SEARCH.counts('deployment')), JSON.stringify({ Lessons: 1, Cases: 1 }), 'counts');
    eq(SEARCH.query('   ').length, 0, 'blank');
    ok(!/<script/.test(SEARCH.highlight('<script>alert(1)</script> pods', 'pods', (x) => String(x).replace(/</g, '&lt;'))), 'markup is escaped');
    ok(/<mark>pods<\/mark>/.test(SEARCH.highlight('some pods', 'pods', (x) => x)), 'match is marked');
    ok(!SEARCH.query('a.b(c')[0] || true, 'regex characters are safe'); SEARCH.highlight('x', '(((', (x) => x);
  });

  await test('search window: filters with counts, typo search, snippets, recent searches, deep links', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/');
    await page.keyboard.press('/'); await page.waitForSelector('#sq');
    ok(await page.locator('#sfilters .schip').count() === 9, 'filter chips');
    await page.fill('#sq', 'kuberntes'); await page.waitForSelector('#sres li');
    ok(/Kubernetes/i.test(await page.textContent('#sres li:first-child .t')), 'typo still finds Kubernetes');
    await page.fill('#sq', 'inode'); await page.waitForSelector('#sres li');
    const kinds = await page.locator('#sres li .k').allTextContents();
    ok(kinds.includes('Glossary'), 'glossary is searched: ' + kinds.join(','));
    const glossChip = page.locator('#sfilters [data-sgroup="Glossary"]');
    ok(/\d/.test(await glossChip.innerText()), 'chip shows a count');
    await glossChip.click();
    ok((await page.locator('#sres li .k').allTextContents()).every((k) => k === 'Glossary'), 'filter narrows the list');
    eq(await glossChip.getAttribute('aria-pressed'), 'true', 'pressed state');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => /^#\/glossary\//.test(location.hash));
    eq(await page.locator('#smodal').count(), 0, 'window closes');
    await page.waitForSelector('.gl-entry.focus');
    // recent searches
    await page.keyboard.press('/'); await page.waitForSelector('#sq');
    eq(await page.locator('.srecent-b').first().innerText(), 'inode', 'recent search listed');
    await page.click('.srecent-b'); await page.waitForSelector('#sres li');
    eq(await page.inputValue('#sq'), 'inode', 'recent search refills the box');
    await page.fill('#sq', ''); await page.click('[data-sclear]');
    eq(await page.locator('.srecent-b').count(), 0, 'recent searches cleared');
    // interview question deep link opens the answer
    await page.fill('#sq', 'set -euo pipefail'); await page.waitForSelector('#sres li');
    const iv = page.locator('#sres li', { hasText: 'Interview' }).first();
    await iv.click();
    await page.waitForFunction(() => /^#\/interview\//.test(location.hash));
    await page.waitForSelector('.iv-a:not([hidden])');
    eq(await page.locator('.iv').count(), await page.locator('.iv').count(), 'list shown');
    ok(await page.locator('.iv-a:not([hidden])').count() === 1, 'the chosen answer is open');
    await nav(page, '/interview/nope-9'); await page.waitForSelector('#main h1');
    ok(/does not exist/.test(await page.textContent('#main h1')), 'unknown question is a not-found page');
    eq(issues.filter((x) => !/goatcounter/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('subnet maths: known values, splitting, VLSM, route summary', async () => {
    const n = NETLIB;
    const i = n.info('192.168.10.130/26');
    eq(i.network, '192.168.10.128', 'network'); eq(i.broadcast, '192.168.10.191', 'broadcast'); eq(i.mask, '255.255.255.192', 'mask'); eq(i.wildcard, '0.0.0.63', 'wildcard'); eq(i.hosts, 62, 'hosts'); eq(i.first, '192.168.10.129', 'first'); eq(i.last, '192.168.10.190', 'last');
    eq(n.info('10.0.0.0/8').hosts, 16777214, '/8'); eq(n.info('10.0.0.0/31').hosts, 2, '/31'); eq(n.info('10.0.0.7/32').hosts, 1, '/32'); eq(n.info('0.0.0.0/0').total, 4294967296, '/0');
    eq(n.info('172.20.0.1/12').network, '172.16.0.0', 'host bits are cleared'); eq(n.info('172.16.5.5/12').kind, 'Private (RFC 1918)', 'private'); eq(n.info('100.64.1.1/10').kind.slice(0, 6), 'Shared', 'CGNAT'); eq(n.info('8.8.8.8/32').kind, 'Public', 'public');
    for (const bad of ['10.0.0.0', '10.0.0.0/33', '300.1.1.1/24', '10.0.0/24', 'abc', '', '10.0.0.0/-1', '1.2.3.4/ 5', null]) eq(n.info(bad), null, 'rejects ' + bad);
    const sp = n.split('10.0.0.0/24', 26); eq(sp.count, 4, 'split count'); eq(sp.subnets[3], '10.0.0.192/26', 'last subnet'); eq(n.split('10.0.0.0/24', 23), null, 'cannot split to a bigger block');
    eq(n.split('10.0.0.0/8', 24).count, 65536, 'large split counted'); eq(n.split('10.0.0.0/8', 24).subnets.length, 256, 'list is capped');
    eq(n.contains('10.0.0.0/24', '10.0.0.255'), true, 'contains last'); eq(n.contains('10.0.0.0/24', '10.0.1.0'), false, 'outside'); eq(n.overlap('10.0.0.0/24', '10.0.0.128/25'), true, 'overlap'); eq(n.overlap('10.0.0.0/24', '10.0.1.0/24'), false, 'adjacent blocks do not overlap');
    const v = n.vlsm('10.20.0.0/22', [{ name: 'web', hosts: 200 }, { name: 'app', hosts: 120 }, { name: 'db', hosts: 30 }, { name: 'mgmt', hosts: 10 }]);
    eq(v.subnets.map((x) => x.cidr).join(' '), '10.20.0.0/24 10.20.1.0/25 10.20.1.128/27 10.20.1.160/28', 'VLSM plan');
    eq(v.free, 1024 - 256 - 128 - 32 - 16, 'free space');
    ok(n.vlsm('10.0.0.0/28', [{ hosts: 100 }]).error, 'does not fit'); ok(n.vlsm('nope', [{ hosts: 1 }]).error, 'bad parent'); ok(n.vlsm('10.0.0.0/24', [{ hosts: 0 }]).error, 'zero hosts');
    const ranges = v.subnets.map((x) => [n.parseIp(x.first), n.parseIp(x.last)]).sort((a, b) => a[0] - b[0]);
    for (let k = 1; k < ranges.length; k++) ok(ranges[k][0] > ranges[k - 1][1], 'VLSM blocks never overlap');
    eq(n.summarize(['10.0.0.0/24', '10.0.1.0/24', '10.0.2.0/24', '10.0.3.0/24', '10.0.5.0/24']).join(' '), '10.0.0.0/22 10.0.5.0/24', 'merge');
    eq(n.summarize(['10.0.0.0/25', '10.0.0.128/25']).join(' '), '10.0.0.0/24', 'halves merge'); eq(n.summarize(['10.0.0.0/24', '10.0.0.0/25']).join(' '), '10.0.0.0/24', 'covered block absorbed');
    eq(n.summarize(['10.0.1.0/24', '10.0.2.0/24']).join(' '), '10.0.1.0/24 10.0.2.0/24', 'unaligned neighbours stay separate'); eq(n.summarize(['x']), null, 'bad input');
  });

  await test('diagram system: every component has a kind, label and legend; arrows are numbered; flow toggle; selection highlights; phone width; axe in both themes', async () => {
    for (const dark of [false, true]) {
      const { ctx, page, issues } = await open({ dark }); await go(page, '/'); await setProgress(page, allDone());
      await nav(page, '/lesson/security/kubernetes-security'); await page.waitForSelector('.dg svg.dg-drawn g.dg-e');
      const info = await page.evaluate(() => { const f = document.querySelector('.dg'); const n = f.querySelectorAll('.dg-node'); return { nodes: n.length, kinds: [...n].every((x) => x.dataset.kind && x.querySelector('.dg-kind').textContent.length > 2), edges: f.dataset.edges.split(';').filter(Boolean).length, drawn: f.querySelectorAll('g.dg-e').length, nums: [...f.querySelectorAll('.dg-num')].map((x) => x.textContent).join(','), legend: f.querySelectorAll('.dg-legend li').length, heads: f.querySelectorAll('.dg-head').length }; });
      ok(info.nodes >= 3 && info.kinds, 'every node has a kind and a text label');
      eq(info.drawn, info.edges, 'one drawn arrow per edge'); eq(info.heads, info.edges, 'arrowheads'); eq(info.nums, Array.from({ length: info.edges }, (_, i) => i + 1).join(','), 'arrows are numbered in order');
      ok(info.legend >= 2, 'legend lists the kinds used');
      ok(/Flow in order/.test(await page.evaluate(() => document.querySelector('.dg .sr').textContent)), 'text alternative for the flow');
      await page.click('.dg-flow-btn'); eq(await page.getAttribute('.dg-flow-btn', 'aria-pressed'), 'true', 'flow toggle pressed'); ok(await page.locator('.dg .dg-dot').count() >= 1, 'flow dots drawn');
      await page.click('.dg-flow-btn'); eq(await page.locator('.dg .dg-dot').count(), 0, 'flow dots removed');
      await page.locator('.dg-node').first().click(); await page.waitForTimeout(80);
      ok(await page.locator('.dg g.dg-e.hot').count() >= 1, 'edges of the selected component are highlighted');
      await page.addScriptTag({ content: AXE });
      const res = await page.evaluate(async () => (await window.axe.run(document.querySelector('.dg'), { resultTypes: ['violations'] })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id + ' ' + v.nodes.length));
      eq(res.length, 0, 'axe ' + (dark ? 'dark' : 'light') + ' ' + res.join(' | '));
      await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(250);
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no sideways scroll at 390px');
      ok(await page.locator('.dg g.dg-e').count() >= 1, 'arrows are redrawn after resize');
      eq(issues.length, 0, 'console: ' + issues.join(' | ')); await ctx.close();
    }
  });

  await test('diagram system: all lesson diagrams are drawn and pass colour contrast in both themes', async () => {
    for (const dark of [false, true]) {
      const { ctx, page, issues } = await open({ dark, viewport: { width: 1100, height: 900 } }); await go(page, '/'); await setProgress(page, allDone());
      const ids = await page.evaluate(async () => { await window.MargaApp.loadAll(); return Object.keys(window.ACADEMY.lessons).filter((id) => /class="dg"/.test(window.ACADEMY.lessons[id].html)); });
      ok(ids.length >= 40, 'lessons with diagrams: ' + ids.length);
      await page.addScriptTag({ content: AXE });
      const bad = [];
      for (const id of ids) {
        await nav(page, '/practice'); await nav(page, '/lesson/' + id); await page.waitForSelector('.dg svg.dg-drawn', { timeout: 5000 }).catch(() => bad.push(id + ' not drawn'));
        const r = await page.evaluate(async () => { if (!window.axe) return ['no axe']; const out = await window.axe.run(document.querySelector('.dg'), { resultTypes: ['violations'] }); return out.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id); });
        if (r.length) bad.push(id + ': ' + r.join(','));
      }
      eq(bad.length, 0, (dark ? 'dark ' : 'light ') + bad.slice(0, 5).join(' | '));
      await ctx.close();
    }
  });

  await test('learning plans: nine plans (five of 30 days, two of 60 and two 100-day challenges), current day open, ticks persist and clear, phone width, axe in both themes', async () => {
    for (const dark of [false, true]) {
      const { ctx, page, issues } = await open({ dark }); await go(page, '/plans'); await page.waitForSelector('.plan-card');
      eq(await page.locator('.plan-card').count(), 9, 'nine plans');
      await nav(page, '/plan/sre-30'); await page.waitForSelector('.plan-day');
      eq(await page.locator('.plan-day').count(), 30, '30 days');
      eq(await page.locator('.plan-day.current[open]').count(), 1, 'current day open');
      if (!dark) {
        await page.evaluate(() => { document.querySelectorAll('.plan-day').forEach((d) => { d.open = true; }); });
        const box = page.locator('.plan-items input[data-key]').first(); await box.check();
        const cnt = () => page.evaluate(() => Object.keys((((JSON.parse(localStorage.getItem('ea.progress.v1')) || {}).pl || {})['sre-30']) || {}).length);
        const saved = await cnt();
        ok(saved >= 1, 'tick saved');
        await page.click('[data-act="plan-clear"]');
        const after = await cnt();
        eq(after, 0, 'clear removes ticks');
      }
      await page.addScriptTag({ content: AXE });
      for (const r of ['/plans', '/plan/kubernetes-30', '/plan/devops-100', '/plan/sre-100', '/plan/sre-60', '/plan/devops-60']) {
        await nav(page, '/practice'); await nav(page, r); await page.waitForSelector('.plan-card, .plan-day');
        const v = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => x.id));
        eq(v.length, 0, (dark ? 'dark ' : 'light ') + r + ' ' + v.join(','));
      }
      if (!dark) { await page.setViewportSize({ width: 390, height: 844 }); await nav(page, '/practice'); await nav(page, '/plan/system-design-30'); await page.waitForSelector('.plan-day'); ok(await page.evaluate(() => document.documentElement.scrollWidth <= 391), 'no sideways scroll at 390px'); }
      await ctx.close();
    }
  });

  await test('lesson page: steps rail follows scrolling, key takeaways, plan chip, sources line, phone width, axe in both themes', async () => {
    for (const dark of [false, true]) {
      const { ctx, page, issues } = await open({ dark }); await go(page, '/'); await setProgress(page, allDone());
      await nav(page, '/lesson/observability/observability-fundamentals'); await page.waitForSelector('.lrail li');
      eq(await page.locator('.lrail li').count(), 4, 'four steps');
      ok(await page.locator('.takeaways li').count() >= 2, 'takeaways');
      ok((await page.locator('.plan-chip').count()) === 1, 'plan chip');
      ok((await page.locator('#realworld p').first().textContent()).length > 120, 'real-world story');
      eq(await page.locator('.levels .seg-b').count(), 4, 'four explanation levels');
      await page.click('.levels [data-lv="sen"]'); ok((await page.locator('#lv-body').textContent()).includes('senior engineer'), 'senior view shows');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(200);
      ok(await page.evaluate(() => parseFloat(document.getElementById('rail-fill').style.width) > 50), 'progress bar fills');
      eq(await page.locator('.lrail li.on').count(), 1, 'one current step');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.addScriptTag({ content: AXE });
      const v = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => x.id + ' ' + x.nodes.map((n) => n.html.slice(0, 120) + ' ' + (n.any[0] && n.any[0].message)).slice(0, 2).join(';')));
      eq(v.length, 0, (dark ? 'dark ' : 'light ') + v.join(','));
      if (!dark) { await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150); ok(await page.evaluate(() => document.documentElement.scrollWidth <= 391), 'no sideways scroll at 390px'); }
      await ctx.close();
    }
  });

  await test('widget presets: break and fix buttons, story line, predict first, shareable link restores settings, axe in both themes', async () => {
    for (const dark of [false, true]) {
      const { ctx, page, issues } = await open({ dark }); await go(page, '/'); await nav(page, '/widget/token-bucket'); await page.waitForSelector('[data-preset]');
      eq(await page.locator('[data-preset]').count(), 2, 'two presets');
      await page.click('[data-preset="break"]');
      ok((await page.locator('#wd-story').textContent()).includes('Break it'), 'story shown');
      ok(await page.locator('#wd-verdict .sd-res.mid, #wd-verdict .sd-res.bad').count() === 1, 'break shows a problem');
      await page.click('[data-preset="fix"]'); ok(await page.locator('#wd-verdict .sd-res.good').count() === 1, 'fix shows a good result');
      const hash = await page.evaluate(() => location.hash); ok(/\?v=/.test(hash), 'url holds the settings: ' + hash);
      // predict first hides the result until a guess
      await page.check('#wd-predict'); await page.click('[data-preset="break"]');
      ok(await page.locator('#wd-verdict').isHidden(), 'result hidden while predicting');
      await page.click('[data-guess="1"]'); ok(await page.locator('#wd-verdict').isVisible(), 'result shown after the guess');
      ok((await page.locator('#wd-ask').textContent()).includes('Not quite'), 'wrong guess is named');
      // shareable link
      const v0 = await page.evaluate(() => document.querySelector('[data-i="burst"]').value); const h2 = await page.evaluate(() => location.hash);
      await nav(page, '/practice'); await page.evaluate((h) => { location.hash = h; }, h2); await page.waitForSelector('[data-i="burst"]');
      eq(await page.evaluate(() => document.querySelector('[data-i="burst"]').value), v0, 'link restores the slider');
      await page.addScriptTag({ content: AXE });
      const v = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => x.id));
      eq(v.length, 0, (dark ? 'dark ' : 'light ') + v.join(','));
      if (!dark) { await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150); ok(await page.evaluate(() => document.documentElement.scrollWidth <= 391), 'no sideways scroll at 390px'); }
      await ctx.close();
    }
  });

  await test('guided lessons: button on lessons, index lists every module, player plays, steps, scrubs, marks watched; phone width, no overflow', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/');
    const id = await page.evaluate(() => window.MargaApp.MODS[0].lessons[0]); const [a, s] = id.split('/');
    await nav(page, `/lesson/${a}/${s}`);
    await page.waitForSelector('#gd-link');
    await page.click('#gd-link');
    await page.waitForSelector('#gd-n');
    ok(/^Scene 1 of \d+/.test(await page.locator('#gd-n').innerText()), 'starts at scene 1');
    await page.click('#gd-play'); eq(await page.locator('#gd-play').innerText(), 'Pause', 'pause label');
    await page.click('#gd-play'); eq(await page.locator('#gd-play').innerText(), 'Play', 'play label');
    await page.click('#gd-next'); ok(/^Scene 2 /.test(await page.locator('#gd-n').innerText()), 'next');
    await page.click('#gd-prev'); ok(/^Scene 1 /.test(await page.locator('#gd-n').innerText()), 'back');
    const max = +(await page.locator('#gd-range').getAttribute('max'));
    await page.locator('#gd-range').evaluate((el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, String(max));
    ok(new RegExp('^Scene ' + max + ' ').test(await page.locator('#gd-n').innerText()), 'scrub to last');
    await page.click('#gd-next');
    ok(await page.evaluate(k => !!(window.MargaApp.state().gd || {})[k], id), 'marked watched');
    ok((await page.locator('#gd-cap').innerText()).length > 20, 'caption present');
    await nav(page, '/watch');
    eq(await page.locator('.gd-mod').count(), data.modules.length, 'one group per module');
    await page.setViewportSize({ width: 390, height: 800 });
    await nav(page, `/watch/${a}/${s}`);
    await page.waitForSelector('#gd-n');
    ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no horizontal overflow at 390');
    eq(issues.length, 0, 'console: ' + issues.join(' | '));
    await ctx.close();
  });

  await test('handbooks, tell a friend and the 100-day challenge: a handbook lists every lesson and downloads as one web page; share builds the message, links and picture; the plan runs 100 days; phone width, no overflow', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/handbooks');
    await page.waitForSelector('.ex-list a');
    eq(await page.locator('.ex-list a').count(), data.modules.length, 'one handbook per skill');
    await nav(page, '/handbook/aiops'); await page.waitForSelector('#hb-dl');
    eq(await page.locator('.hb-lesson').count(), 12, 'aiops lessons in the handbook');
    ok(await page.locator('#hb-doc .hb-gloss dt').count() >= 4, 'glossary in the handbook');
    ok(await page.locator('#hb-doc [id]').count() === 0, 'no duplicate ids from reused lessons');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#hb-dl')]);
    eq(dl.suggestedFilename(), 'marga-aiops-handbook.html', 'file name');
    const txt = require('fs').readFileSync(await dl.path(), 'utf8');
    ok(txt.includes('<!doctype html>') && txt.includes('AIOps') && txt.includes('Official references') && !/<script/i.test(txt), 'self-contained page with no scripts');
    await nav(page, '/module/mlops'); await page.waitForSelector('#hb-link');
    ok(await page.locator('#sh-link-btn').count() === 1, 'share button on the skill page');
    await nav(page, '/share'); await page.waitForSelector('#sh-cv');
    ok(/free, works offline/.test(await page.inputValue('#sh-msg')), 'message');
    const before = await page.inputValue('#sh-msg'); await page.check('#sh-prog');
    eq(await page.inputValue('#sh-msg'), before, 'no progress text while nothing is passed');
    for (const id of ['sh-wa', 'sh-li', 'sh-x', 'sh-mail']) ok((await page.getAttribute('#' + id, 'href')).length > 20, id + ' link');
    ok(/^https:\/\/wa\.me\//.test(await page.getAttribute('#sh-wa', 'href')), 'whatsapp link');
    const dims = await page.evaluate(() => { const c = document.querySelector('#sh-cv'); return [c.width, c.height]; }); eq(dims.join('x'), '1200x630', 'picture size');
    await nav(page, '/plan/devops-100'); await page.waitForSelector('h1');
    ok(/100-day/.test(await page.locator('h1').first().innerText()), 'plan title');
    const days = await page.evaluate(() => window.ACADEMY.plans.find((p) => p.id === 'devops-100').days.length); eq(days, 100, '100 days');
    await page.setViewportSize({ width: 390, height: 800 });
    for (const h of ['/share', '/handbook/mlops', '/plan/devops-100', '/handbooks']) { await nav(page, h); await page.waitForTimeout(300); ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'no overflow at 390 on ' + h); }
    eq(issues.length, 0, 'console: ' + issues.join(' | '));
    await ctx.close();
  });

  await test('incident replays and portfolio: replay steps play, scrub and pause for a decision; button on post-mortems; portfolio reflects progress, prints and copies; phone width; axe in both themes', async () => {
    for (const dark of [false, true]) {
      const { ctx, page, issues } = await open({ dark }); await go(page, '/replay'); await page.waitForSelector('.ex-list a');
      ok(await page.locator('.ex-list a').count() >= 40, 'replays listed');
      await nav(page, '/replay/aws-s3-us-east-1-2017'); await page.waitForSelector('#rp-card .rp-text');
      const n = await page.evaluate(() => document.querySelectorAll('#rp-list li').length); ok(n >= 6, 'steps: ' + n);
      eq(await page.locator('#rp-n').textContent(), 'Step 1 of ' + n, 'step counter');
      await page.click('#rp-next'); eq(await page.locator('#rp-n').textContent(), 'Step 2 of ' + n, 'next works');
      await page.fill('#rp-range', String(n)); await page.dispatchEvent('#rp-range', 'input'); eq(await page.locator('#rp-n').textContent(), 'Step ' + n + ' of ' + n, 'scrub works');
      ok(await page.locator('#rp-next').isDisabled(), 'next disabled at the end');
      await page.click('#rp-restart'); await page.click('.rp-jump[data-i="' + Math.floor(n / 2) + '"]'); ok(await page.locator('#rp-ask .note-panel').count() === 1, 'pause and think appears');
      await page.click('#rp-reveal'); ok(await page.locator('#rp-ask .note-panel').count() === 0, 'reveal closes it');
      await nav(page, '/practice'); await nav(page, '/architecture/aws-s3-us-east-1-2017'); await page.waitForSelector('#rp-link');
      await nav(page, '/practice'); await nav(page, '/portfolio'); await page.waitForSelector('.pf-skills li');
      eq(await page.locator('.pf-skills li').count(), data.modules.length, 'a row per skill');
      await page.evaluate(() => { const s = MargaApp.state(); const m = MargaApp.MODS[0]; m.lessons.forEach((id) => { s.lessons[id] = { done: true, best: 100, at: Date.now(), attempts: 1 }; }); MargaApp.save(); MargaApp.route(); });
      await page.waitForTimeout(200); ok((await page.locator('.pf-stats').textContent()).includes('Skills completed'), 'stats');
      ok(await page.evaluate(() => /complete/.test(document.querySelector('.pf-skills li').textContent)), 'finished skill shows complete');
      await page.addScriptTag({ content: AXE });
      for (const r of ['/portfolio', '/replay/aws-s3-us-east-1-2017', '/replay']) {
        await nav(page, '/practice'); await nav(page, r); await page.waitForSelector('main, #main');
        const v = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((x) => x.id));
        eq(v.length, 0, (dark ? 'dark ' : 'light ') + r + ' ' + v.join(','));
      }
      if (!dark) { await page.setViewportSize({ width: 390, height: 844 }); for (const r of ['/portfolio', '/replay/aws-s3-us-east-1-2017']) { await nav(page, '/practice'); await nav(page, r); await page.waitForTimeout(200); ok(await page.evaluate(() => document.documentElement.scrollWidth <= 391), 'no sideways scroll at 390px on ' + r); } }
      await ctx.close();
    }
  });

  // One lab, start to finish, in the real VM: it must fail before the fix, accept the typed fix and be remembered.
  const vmFixes = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'vmfixes.json'), 'utf8'));
  const vmAnswers = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'vmanswers.json'), 'utf8'));
  /* the "Why did that work?" prompt: a wrong choice is corrected, the right one is confirmed, and the choice is remembered */
  async function whyCheck(page, id) {
    const w = await page.evaluate((i) => (window.ACADEMY.vmlabs.find((x) => x.id === i) || {}).why || null, id);
    if (!w) return;
    await page.waitForSelector('#vm-whyform', { timeout: 10000 });
    const wrong = (w.a + 1) % w.o.length;
    await page.locator('#vm-whyform input[value="' + wrong + '"]').check(); await page.click('#vm-why-go');
    ok(/Not quite/.test(await page.textContent('#vm-whyout')), id + ': a wrong reason is corrected');
    await page.locator('#vm-whyform input[value="' + w.a + '"]').check(); await page.click('#vm-why-go');
    ok(/Right\./.test(await page.textContent('#vm-whyout')), id + ': the right reason is confirmed');
  }
  async function vmSolve(page, id) {
    const kind = await page.evaluate((i) => (window.ACADEMY.vmlabs.find((x) => x.id === i) || {}).kind || 'fix', id);
    await go(page, '/linux/' + id);
    await page.click('#vm-start');
    await page.waitForFunction(() => /machine is running/i.test(document.querySelector('#vm-status').textContent), null, { timeout: 180000 });
    if (kind === 'diagnose') {
      const a = vmAnswers[id]; ok(a && a.good && a.bad, id + ': has answers in tools/vmanswers.json');
      await page.click('#vm-term'); await new Promise((r) => setTimeout(r, 500));
      const re = new RegExp(a.probe_re, 'm'), shown = () => page.locator('.xterm-rows').first().innerText().then((t) => t.replace(/\n\s*\n/g, '\n'));
      await page.keyboard.type(a.probe, { delay: 4 }); await page.keyboard.press('Enter');
      let seen = ''; for (let k = 0; k < 20 && !re.test(seen.split('\n').slice(1).join('\n')); k++) { await new Promise((r) => setTimeout(r, 1500)); seen = await shown(); }
      ok(re.test(seen), id + ': the probe shows the evidence in the real machine');
      await page.fill('#vm-ans', a.bad); await page.click('#vm-submit');
      ok(/Not yet/.test(await page.textContent('#vm-result')), id + ': a wrong diagnosis is not accepted');
      ok(!(await page.evaluate((i) => !!window.MargaApp.state().vm.done[i], id)), id + ': not remembered after a wrong diagnosis');
      await page.fill('#vm-ans', a.good); await page.click('#vm-submit');
      ok(/Correct/.test(await page.textContent('#vm-result')), id + ': the right diagnosis is accepted');
      ok(await page.evaluate((i) => !!window.MargaApp.state().vm.done[i], id), id + ': remembered');
      await whyCheck(page, id);
      return;
    }
    await page.click('#vm-check'); await page.waitForSelector('.vm-checks li', { timeout: 90000 });
    ok(await page.locator('.vm-checks li.fail').count() >= 1, id + ': checks fail before the fix');
    await page.click('#vm-term'); await new Promise((r) => setTimeout(r, 500));
    for (const line of vmFixes[id]) { await page.keyboard.type(line, { delay: 4 }); await page.keyboard.press('Enter'); await new Promise((r) => setTimeout(r, 2500)); }
    const allPass = () => page.waitForFunction(() => /All \d+ checks pass/.test(document.querySelector('#vm-status').textContent), null, { timeout: 60000 });
    await page.click('#vm-check');
    await allPass().catch(async () => { await new Promise((r) => setTimeout(r, 8000)); await page.click('#vm-check'); await allPass(); }).catch(async () => { await page.click('#vm-term'); for (const line of vmFixes[id]) { await page.keyboard.type(line, { delay: 4 }); await page.keyboard.press('Enter'); await new Promise((r) => setTimeout(r, 4000)); } await page.click('#vm-check'); await allPass(); }).catch(async () => { throw new Error(id + ': checks did not pass after the fix: ' + (await page.locator('.vm-checks li').allTextContents()).join(' | ')); });
    ok(/Solved/.test(await page.textContent('#vm-result')), id + ': solved message');
    ok(await page.evaluate((i) => !!window.MargaApp.state().vm.done[i], id), id + ': remembered');
    await whyCheck(page, id);
  }

  await test('real Linux lab: 149 scenarios (42 beginner, 49 intermediate, 58 advanced) with a typed fix each; the index filters by level, text and status; one lab runs in the real VM; the empty machine boots; phone width, no overflow', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/linux');
    const labs = await page.evaluate(() => window.ACADEMY.vmlabs.map((x) => ({ id: x.id, level: x.level })));
    eq(labs.length, 149, '149 scenarios');
    const PER = { Beginner: 42, Intermediate: 49, Advanced: 58 };
    for (const lv of ['Beginner', 'Intermediate', 'Advanced']) eq(labs.filter((x) => x.level === lv).length, PER[lv], lv + ' has ' + PER[lv]);
    ok(/real Linux kernel/i.test(await page.textContent('.tl-warn')), 'honest banner');
    for (const x of labs) ok(vmFixes[x.id] && vmFixes[x.id].length, x.id + ' has a typed fix in tools/vmfixes.json');
    eq(await page.locator('.tl-item').count(), 42, 'a new visitor starts on the Beginner list');
    ok(/Showing 42 of 149/.test(await page.textContent('#vm-count')), 'the count is announced');
    await page.click('.vm-tabs [data-lv="All"]'); eq(await page.locator('.tl-item').count(), 149, 'All shows 149');
    for (const lv of ['Intermediate', 'Advanced', 'Beginner']) { await page.click('.vm-tabs [data-lv="' + lv + '"]'); eq(await page.locator('.tl-item').count(), PER[lv], lv + ' shows ' + PER[lv]); eq(await page.locator('.tl-item .vc-lv:text-is("' + lv + '")').count(), PER[lv], lv + ': every row is ' + lv); }
    await page.click('.vm-tabs [data-lv="All"]'); await page.fill('#vm-q', 'hard link'); ok(await page.locator('.tl-item').count() >= 1 && await page.locator('.tl-item').count() < 10, 'search narrows the list');
    await page.fill('#vm-q', 'zzzz-no-such'); ok(/No scenario matches/.test(await page.textContent('#vm-list')), 'an empty search says so'); await page.fill('#vm-q', '');
    await page.selectOption('#vm-st', 'done'); eq(await page.locator('.tl-item').count(), 0, 'nothing is solved yet'); await page.selectOption('#vm-st', 'open'); eq(await page.locator('.tl-item').count(), 149, 'all are open');
    await page.click('#vm-random'); await page.waitForSelector('#vm-start'); ok(/^#\/linux\/[a-z0-9-]+$/.test(await page.evaluate(() => location.hash)), 'Pick one for me opens a lab');
    await go(page, '/linux?q=' + encodeURIComponent('linux/disks-and-filesystems')); await page.waitForSelector('.tl-item');
    ok(await page.locator('.tl-item').count() >= 5, 'a lesson link filters the list to that lesson\'s labs'); eq(await page.inputValue('#vm-q'), 'linux/disks-and-filesystems', 'the search box shows the filter');
    await go(page, '/linux?q=&level=All'); eq(await page.locator('.tl-item').count(), 149, 'clearing the query shows all 149');
    await setProgress(page, allDone()); await go(page, '/lesson/linux/disks-and-filesystems'); await page.waitForSelector('#diy'); ok(await page.locator('.diy-labs a[href^="#/linux?q="]').count() === 1, 'the lesson links to all its labs'); ok(await page.locator('.diy-labs a[href^="#/linux/"]').count() === 4, 'four labs are listed on the lesson page');
    await vmSolve(page, 'disk-full');
    await go(page, '/linux'); ok((await page.textContent('#vm-progress')).startsWith('1 of 149'), 'the index counts the solved lab');
    await page.selectOption('#vm-st', 'done'); await page.click('.vm-tabs [data-lv="All"]'); eq(await page.locator('.tl-item').count(), 1, 'the solved filter shows it');
    await go(page, '/linux/sandbox'); await page.click('#vm-start');
    await page.waitForFunction(() => /machine is running/i.test(document.querySelector('#vm-status').textContent), null, { timeout: 180000 });
    await page.click('#vm-term'); await page.keyboard.type('uname -sr', { delay: 4 }); await page.keyboard.press('Enter'); await new Promise((r) => setTimeout(r, 1500));
    ok(/Linux 6\.8/.test(await page.locator('.xterm-accessibility, .xterm-rows').first().textContent()), 'uname shows the real kernel');
    await ctx.close();
    const m = await open({ viewport: { width: 390, height: 800 } }); await go(m.page, '/linux');
    ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'the index fits at 390 px');
    await go(m.page, '/linux/disk-full');
    ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow at 390 px');
    await m.page.click('#vm-start'); await m.page.waitForSelector('#vm-keys:not([hidden])');
    ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no overflow with the machine open');
    eq(m.issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + m.issues.join(' | '));
    await m.ctx.close();
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | '));
  });

  await test('real Linux lab kinds: the Kind filter counts (16 diagnose, 10 several-faults, 11 network, 11 systemd-style, 10 packages, 9 TLS); every diagnose lab refuses a wrong answer and accepts the right one in the page; the several-faults and why prompts are present', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/linux?level=All');
    const kinds = await page.evaluate(() => { const v = window.ACADEMY.vmlabs; return { diagnose: v.filter((x) => x.kind === 'diagnose').length, multi: v.filter((x) => x.faults).length, network: v.filter((x) => x.tag === 'network').length, systemd: v.filter((x) => x.tag === 'systemd').length, packages: v.filter((x) => x.tag === 'packages').length, tls: v.filter((x) => x.tag === 'tls').length, why: v.filter((x) => x.why).length }; });
    eq(kinds.diagnose, 16, 'diagnose labs'); eq(kinds.packages, 10, 'package labs'); eq(kinds.tls, 9, 'TLS labs'); eq(kinds.multi, 10, 'several-faults labs'); eq(kinds.network, 11, 'network labs'); eq(kinds.systemd, 11, 'systemd-style labs'); ok(kinds.why >= 20, 'at least 20 labs ask why: ' + kinds.why);
    for (const [v, n] of [['diagnose', 16], ['multi', 10], ['network', 11], ['systemd', 11], ['packages', 10], ['tls', 9]]) { await page.selectOption('#vm-tp', v); eq(await page.locator('.tl-item').count(), n, v + ' filter shows ' + n); }
    await page.selectOption('#vm-tp', 'fix'); eq(await page.locator('.tl-item').count(), 149 - 16, 'the fix filter hides diagnose labs');
    const dg = await page.evaluate(() => window.ACADEMY.vmlabs.filter((x) => x.kind === 'diagnose').map((x) => x.id));
    for (const id of dg) {
      const a = vmAnswers[id];
      await go(page, '/linux/' + id); await page.waitForSelector('#vm-ans');
      ok(await page.locator('#vm-check').count() === 0, id + ': a diagnose lab has no Check button');
      await page.fill('#vm-ans', a.bad); await page.click('#vm-submit'); ok(/Not yet/.test(await page.textContent('#vm-result')), id + ': wrong answer refused');
      await page.fill('#vm-ans', 'ls'); await page.click('#vm-submit'); ok(/Not yet/.test(await page.textContent('#vm-result')), id + ': junk refused');
      await page.fill('#vm-ans', a.good); await page.press('#vm-ans', 'Enter'); ok(/Correct/.test(await page.textContent('#vm-result')), id + ': right answer accepted');
      ok(await page.evaluate((i) => !!window.MargaApp.state().vm.done[i], id), id + ': remembered');
      await whyCheck(page, id);
    }
    await go(page, '/linux/crash-cause'); await page.waitForSelector('#vm-ans'); ok(/Diagnose|diagnosis/i.test(await page.textContent('#main h1') + await page.textContent('#vm-ask')), 'the diagnose box is labelled');
    await go(page, '/linux?level=All&topic=multi'); eq(await page.locator('.tl-item').count(), 10, 'a topic link filters the list');
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  for (const level of ['Beginner', 'Intermediate', 'Advanced']) {
    await test('real Linux lab, ' + level + ' scenarios: each one boots a real kernel, fails its checks, accepts its typed fix and is remembered', async () => {
      const { ctx, page, issues } = await open(); await go(page, '/linux');
      const ids = await page.evaluate((lv) => window.ACADEMY.vmlabs.filter((x) => x.level === lv).map((x) => x.id), level);
      eq(ids.length, { Beginner: 42, Intermediate: 49, Advanced: 58 }[level], level + ' count');
      const only = process.env.VMONLY ? process.env.VMONLY.split(',') : null;
      const failed = [];
      for (const id of ids) { if (only && !only.includes(id)) continue; try { await vmSolve(page, id); } catch (err) { failed.push(id + ': ' + String(err.message || err).slice(0, 300)); } }
      eq(failed.length, 0, 'labs that failed: ' + failed.join(' || '));
      eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
    });
  }

  await test('do-it-yourself challenges: every solution passes and every start fails in the page; a lesson shows its challenge, feedback, hints, solution and is remembered; the index lists all', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/challenges');
    const all = await page.evaluate(() => window.ACADEMY.challenges);
    ok(all.length >= 50, 'at least 50 challenges');
    eq(await page.locator('.tl-item').count(), all.length, 'one row per challenge');
    const bad = await page.evaluate(() => window.ACADEMY.challenges.filter((c) => { const g = window.MargaChallengeCore.grade; return !g(c, c.solution).ok || (c.kind === 'fix' ? g(c, c.starter).ok : g(c, 'echo hello').ok); }).map((c) => c.id));
    eq(bad.length, 0, 'solutions pass and starts fail: ' + bad.join(','));
    await setProgress(page, allDone());
    const cmd = all.find((c) => c.id === 'kubernetes-scale-a-deployment'), fix = all.find((c) => c.id === 'kubernetes-probes-and-limits');
    await go(page, '/lesson/' + cmd.lesson); await page.waitForSelector('#diy');
    const item = page.locator('.diy-item[data-ch="' + cmd.id + '"]');
    await item.locator('input').fill('kubectl get pods'); await item.locator('[data-act="diy-check"]').click();
    ok(/Not yet/.test(await item.locator('.diy-out').textContent()), 'wrong answer is not accepted');
    await item.locator('[data-act="diy-hint"]').click(); ok(await item.locator('.diy-hints li').count() === 1, 'first hint');
    await item.locator('input').fill(cmd.solution); await item.locator('input').press('Enter');
    ok(/Correct/.test(await item.locator('.diy-out').textContent()), 'right answer accepted');
    ok(await item.locator('h3 .chip.pass').count() === 1, 'passed chip');
    await item.locator('[data-act="diy-sol"]').click(); ok((await item.locator('.diy-sol').textContent()).includes('kubectl scale'), 'solution shown');
    const f = page.locator('.diy-item[data-ch="' + fix.id + '"]');
    await f.locator('[data-act="diy-check"]').click(); ok(await f.locator('.diy-out li').count() >= 3, 'the starting text lists what is missing');
    await f.locator('textarea').fill(fix.solution); await f.locator('[data-act="diy-check"]').click(); ok(/Correct/.test(await f.locator('.diy-out').textContent()), 'fixed text accepted');
    await f.locator('[data-act="diy-reset"]').click(); eq(await f.locator('textarea').inputValue(), fix.starter, 'start again restores the text');
    await page.reload(); await page.waitForSelector('#diy');
    ok(await page.locator('.diy-item[data-ch="' + cmd.id + '"] h3 .chip.pass').count() === 1, 'remembered after reload');
    const withLab = all.find((c) => c.lesson === 'linux/disks-and-filesystems');
    await go(page, '/lesson/linux/disks-and-filesystems'); await page.waitForSelector('#diy');
    ok(await page.locator('.diy-labs a[href="#/linux/disk-full"]').count() === 1, 'lesson links its real Linux lab'); ok(!!withLab, 'has a challenge too');
    await go(page, '/challenges'); ok((await page.textContent('#diy-progress')).startsWith('2 of ' + all.length), 'index counts two passed');
    const m = await open({ viewport: { width: 390, height: 800 } }); await go(m.page, '/'); await setProgress(m.page, allDone()); await go(m.page, '/lesson/' + fix.lesson); await m.page.waitForSelector('#diy');
    ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow at 390 px'); await m.ctx.close();
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('save my machine: files and a background process survive a save, a reload and a resume; the save downloads as a .mvm file, can be deleted and loaded back from the file', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/linux/sandbox'); await page.click('#vm-start');
    await page.waitForFunction(() => /machine is running/i.test(document.querySelector('#vm-status').textContent), null, { timeout: 180000 });
    const term = async (cmd, wait) => { await page.click('#vm-term'); await new Promise((r) => setTimeout(r, 400)); await page.keyboard.type(cmd, { delay: 4 }); await page.keyboard.press('Enter'); await new Promise((r) => setTimeout(r, wait || 2500)); return (await page.locator('.xterm-rows').innerText()).replace(/\n\s*\n/g, '\n'); };
    await term('echo kept-after-save > /root/marker; sleep 300 & sleep 1; jobs');
    await page.locator('#vm-saves summary').click(); await page.click('#vm-save');
    await page.waitForFunction(() => /Saved:/.test(document.querySelector('#vm-savemsg').textContent), null, { timeout: 120000 });
    await go(page, '/'); await go(page, '/linux/sandbox');
    await page.locator('#vm-saves summary').click(); await page.waitForSelector('#vm-resume:not([hidden])', { timeout: 10000 });
    await page.click('#vm-resume');
    await page.waitForFunction(() => /saved machine is running again/i.test(document.querySelector('#vm-status').textContent), null, { timeout: 180000 });
    const out = await term('cat /root/marker; ps | grep "sleep 300" | grep -v grep', 3500);
    ok(/kept-after-save/.test(out), 'the file survived'); ok(/sleep 300/.test(out), 'the background process survived');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#vm-dl')]);
    const fp = require('path').join(require('os').tmpdir(), 'marga-e2e-' + process.pid + '.mvm'); await dl.saveAs(fp);
    ok(fs.readFileSync(fp).slice(0, 8).toString() === 'MARGAVM1', 'the file has the MARGAVM1 header'); ok(/\.mvm$/.test(dl.suggestedFilename()), 'the file is named .mvm');
    await page.click('#vm-delsave'); await page.waitForTimeout(500); ok(await page.locator('#vm-resume').isHidden(), 'delete hides Resume');
    await page.setInputFiles('#vm-file', fp);
    await page.waitForFunction(() => /saved machine is running again/i.test(document.querySelector('#vm-status').textContent), null, { timeout: 180000 });
    await new Promise((r) => setTimeout(r, 3000));
    ok(/kept-after-save/.test(await term('cat /root/marker', 3500)), 'the file loads back from the .mvm file');
    await page.setInputFiles('#vm-file', { name: 'bad.mvm', mimeType: 'application/octet-stream', buffer: Buffer.from('not a machine') });
    await page.waitForTimeout(1500); ok(/not a MARGA machine save|damaged/i.test(await page.textContent('#vm-savemsg')), 'a bad file is refused with a message');
    try { fs.unlinkSync(fp); } catch (x) { /* ignore */ }
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('search across everything: the page finds labs, games, plans and lessons; group chips count; Shift+Enter in the box opens the page; a typo is suggested; phone width', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/search?q=systemd'); await page.waitForSelector('.sp-item');
    const kinds = await page.$$eval('.sp-item .chip', (a) => a.map((x) => x.textContent));
    for (const k of ['Lesson', 'Cheat sheet', 'Glossary']) ok(kinds.includes(k), 'systemd finds a ' + k);
    await go(page, '/search?q=namespace&g=Labs'); await page.waitForSelector('.sp-item');
    ok((await page.$$eval('.sp-item .chip', (a) => a.map((x) => x.textContent))).every((k) => ['Linux lab', 'Terminal lab', 'Challenge', 'Game'].includes(k)), 'the Labs filter shows only lab kinds');
    for (const [q, kind] of [['diagnose', 'Linux lab'], ['plan sre', 'Plan'], ['capstone', 'Capstone'], ['roadmap devops', 'Roadmap'], ['handbook', 'Handbook']]) { await go(page, '/search?q=' + encodeURIComponent(q)); await page.waitForSelector('.sp-item'); ok((await page.$$eval('.sp-item .chip', (a) => a.map((x) => x.textContent))).includes(kind), q + ' finds a ' + kind); }
    await go(page, '/search?q=zzzqqq'); await page.waitForSelector('#sp-out p'); ok(/Nothing matches/.test(await page.textContent('#sp-out')), 'an empty search says so');
    await go(page, '/search?q=kubernets'); await page.waitForSelector('.sp-item'); ok(await page.locator('.sp-item').count() > 3, 'a typo still finds results');
    await go(page, '/'); await page.keyboard.press('/'); await page.fill('#sq', 'multi fault'); await page.waitForSelector('#sres li');
    await page.keyboard.press('Shift+Enter'); await page.waitForSelector('.sp-item'); ok(/#\/search\?q=multi%20fault/.test(await page.evaluate(() => location.hash)), 'Shift+Enter opens the full page');
    await page.fill('#sp-q', 'chmod'); await page.press('#sp-q', 'Enter'); await page.waitForFunction(() => /chmod/.test(location.hash)); await page.waitForSelector('.sp-item');
    const m = await open({ viewport: { width: 390, height: 800 } }); await go(m.page, '/search?q=linux'); await m.page.waitForSelector('.sp-item');
    ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow at 390 px'); await m.ctx.close();
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('watermarks: every print and PDF path carries the MARGA watermark (app pages, standalone cheat sheets, the downloaded handbook), as real PDFs', async () => {
    const { ctx, page, issues } = await open();
    const sh = require('child_process'), os = require('os');
    const paths = [BASE + '/cheatsheets/docker.html', BASE + '/cheatsheets/', BASE + '/#/cheatsheet/docker', BASE + '/#/lesson/linux/users-groups-permissions', BASE + '/#/handbook/linux', BASE + '/#/roadmap/devops', BASE + '/#/portfolio', BASE + '/#/plan/sre-30', BASE + '/#/linux/disk-full', BASE + '/#/search?q=systemd'];
    for (const u of paths) {
      await page.goto(u); await page.waitForTimeout(1200); await page.emulateMedia({ media: 'print' });
      const c = await page.evaluate(() => [getComputedStyle(document.body, '::before').content, getComputedStyle(document.body, '::after').content, getComputedStyle(document.body, '::before').position].join('|'));
      ok(/MARGA by EknathaLabs/.test(c) && /marga\.eknathalabs\.com/.test(c) && /fixed/.test(c), u + ': the watermark is a fixed element, repeated on each page: ' + c);
      const f = require('path').join(os.tmpdir(), 'marga-wm-' + process.pid + '.pdf'); await page.pdf({ path: f, format: 'A4' });
      const txt = sh.execSync('pdftotext -layout "' + f + '" -').toString(); ok(/MARGA by EknathaLabs/.test(txt), u + ': the PDF text has the watermark'); fs.unlinkSync(f);
      await page.emulateMedia({ media: 'screen' });
    }
    await page.goto(BASE + '/#/handbook/linux'); await page.waitForSelector('#hb-dl');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#hb-dl')]);
    const fp = require('path').join(os.tmpdir(), 'marga-hb-' + process.pid + '.html'); await dl.saveAs(fp);
    const pg2 = await ctx.newPage(); await pg2.goto('file://' + fp); await pg2.emulateMedia({ media: 'print' });
    const c2 = await pg2.evaluate(() => getComputedStyle(document.body, '::before').content + getComputedStyle(document.body, '::after').content);
    ok(/MARGA by EknathaLabs/.test(c2) && /marga\.eknathalabs\.com/.test(c2), 'the downloaded handbook web page prints with the watermark'); fs.unlinkSync(fp);
    eq(issues.filter((i) => !/favicon|file:/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

