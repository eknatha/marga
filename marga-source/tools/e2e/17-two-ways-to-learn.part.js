  // ------------------------------------------------------------ two ways to learn
  await test('two doors on the home page: learn by skill and learn by path, plus goal starters', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/'); await page.waitForSelector('#doors');
    eq(await page.locator('#doors .door').count(), 2, 'two doors');
    eq(await page.locator('#doors .door').nth(0).locator('.chips a').count(), data.modules.length, 'every skill is listed');
    eq(await page.locator('#doors .door-paths li').count(), data.paths.live.length, 'every path is listed');
    eq(await page.locator('#doors .goals li').count(), 7, 'seven goals');
    ok(/Learn by skill/.test(await page.textContent('#doors')) && /Learn by path/.test(await page.textContent('#doors')), 'door names');
    const top = await page.evaluate(() => { const h = document.querySelector('.hero h1').getBoundingClientRect(), d = document.querySelector('#doors').getBoundingClientRect(); return d.top > h.top; });
    ok(top, 'doors are below the hero');
    await page.click('#doors a[href="#/skills"]'); await page.waitForSelector('.skill');
    eq(await page.locator('.skill').count(), data.modules.length, 'skills page lists every skill');
    await go(page, '/'); await page.click('#doors .goals a[href="#/build-path/interview"]'); await page.waitForSelector('.plan-steps .step');
    const names = await page.locator('.plan-steps .step strong').allInnerTexts();
    ok(names.indexOf('Linux for engineers') >= 0 && names.indexOf('Linux for engineers') < names.indexOf('Docker and containers') && names.indexOf('Docker and containers') < names.indexOf('Kubernetes'), 'plan is in prerequisite order: ' + names.join(', '));
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('skills page: each skill shows its time, where it is used, what it works best after, and a way in without the prerequisites', async () => {
    const { ctx, page } = await open();
    await go(page, '/skills'); await page.waitForSelector('.skill');
    const k = page.locator('#skill-kubernetes');
    ok(/Works best after Docker and containers and Networking essentials/.test(await k.textContent()), 'prerequisites are advice, not a wall');
    ok(/Used in \d+ paths?/.test(await k.textContent()), 'used in paths');
    ok(await k.locator('a[href="#/testout/kubernetes"]').count() === 1, 'test out link');
    ok(/No prerequisites/.test(await page.locator('#skill-git').textContent()), 'git has no prerequisites');
    await page.click('#skill-git a.btn-primary'); await page.waitForSelector('.jobs');
    eq(await page.locator('.jobs > li').count(), data.modules.find((m) => m.id === 'git').lessons.length, 'git lessons listed');
    ok(/Where this skill fits/.test(await page.textContent('#main')) && /Used in \d+ role paths?/.test(await page.textContent('#main')), 'module page says where it fits');
    await go(page, '/module/kubernetes'); await page.waitForSelector('.gate');
    ok(await page.locator('.gate a[href="#/testout/docker"]').count() === 1, 'locked page offers a test-out of the missing prerequisite');
    await ctx.close();
  });

  await test('plan builder: ticking a skill adds what it needs, saves in the browser and shows on the home page', async () => {
    const { ctx, page } = await open();
    await go(page, '/build-path'); await page.waitForSelector('#plan-form');
    ok(/Tick at least one skill/.test(await page.textContent('#plan-out')), 'empty plan hint');
    await page.check('input[name=plan][value=kubernetes]');
    await page.waitForSelector('.plan-steps .step');
    const names = await page.locator('.plan-steps .step strong').allInnerTexts();
    eq(names.join('|'), 'Linux for engineers|Networking essentials|Docker and containers|Kubernetes', 'dependencies added in order');
    ok(/Added because/.test(await page.textContent('.plan-steps')), 'says why a skill was added');
    ok(/3 skills added for you/.test(await page.textContent('.plan-meta')), 'meta counts added skills');
    await page.click('#plan-save'); ok(/saved/.test(await page.textContent('#plan-note')), 'saved note');
    await page.reload(); await page.waitForSelector('#plan-form');
    ok(await page.isChecked('input[name=plan][value=kubernetes]'), 'plan restored after reload');
    await go(page, '/'); await page.waitForSelector('#doors');
    ok(/Open your plan/.test(await page.textContent('#doors')), 'home offers the saved plan');
    await go(page, '/build-path'); await page.click('#plan-clear');
    ok(/Tick at least one skill/.test(await page.textContent('#plan-out')), 'cleared');
    await go(page, '/build-path/nonsense'); await page.waitForSelector('#main h1');
    ok(/Not found/.test(await page.textContent('#main h1')), 'unknown goal is a not-found page');
    await ctx.close();
  });

  await test('test out: eight right of ten marks every lesson passed and opens dependent skills; a miss lists lessons to read', async () => {
    const { ctx, page } = await open();
    const gitQ = {}; data.lessons && data.modules.find((m) => m.id === 'git').lessons.forEach((l) => data.lessons[l].quiz.forEach((q) => { gitQ[q.q] = q.answer; }));
    await go(page, '/testout/git'); await page.waitForSelector('#to .opt');
    for (let i = 0; i < 10; i++) {
      await page.waitForSelector('#to .opt:not([disabled])');
      const qt = await page.textContent('#to .qtext'); const ans = gitQ[qt];
      ok(ans !== undefined, 'question comes from the git lessons');
      await page.locator(`#to .opt:not([data-oi="${ans}"])`).first().click();
      await page.click('#to-next');
    }
    await page.waitForSelector('#to .result');
    ok(/0 of 10 correct/.test(await page.textContent('#to .result h2')), 'a miss is reported');
    ok(await page.locator('#to .result a[href^="#/lesson/git/"]').count() >= 1, 'missed lessons are linked');
    let prog = await page.evaluate(() => JSON.parse(localStorage.getItem('ea.progress.v1')));
    eq(prog && prog.lessons ? Object.keys(prog.lessons).filter((k) => prog.lessons[k].done).length : 0, 0, 'a miss changes no progress');
    await page.click('#to-again'); await page.waitForSelector('#to .opt');
    for (let i = 0; i < 10; i++) {
      await page.waitForSelector('#to .opt:not([disabled])');
      const qt = await page.textContent('#to .qtext'); const ans = gitQ[qt];
      await page.locator(`#to .opt[data-oi="${ans}"]`).click();
      await page.click('#to-next');
    }
    await page.waitForSelector('#to .result.pass');
    ok(/10 of 10 correct/.test(await page.textContent('#to .result h2')), 'pass reported');
    prog = await page.evaluate(() => JSON.parse(localStorage.getItem('ea.progress.v1')));
    const gl = data.modules.find((m) => m.id === 'git').lessons;
    ok(gl.every((l) => prog.lessons[l] && prog.lessons[l].done && prog.lessons[l].via === 'testout'), 'every git lesson is marked passed by test-out');
    await go(page, '/skills'); await page.waitForSelector('#skill-git.s-pass');
    ok(/Mastered/.test(await page.locator('#skill-git').textContent()), 'skill shows as mastered');
    await ctx.close();
  });

  await test('git skill: ten lessons ending with debugging, a cheat sheet, interview answers, drills, games and explainers, mapped into every path', async () => {
    const m = data.modules.find((x) => x.id === 'git');
    eq(m.lessons.length, 10, 'ten lessons'); ok(/debugging/.test(m.lessons[9]), 'last lesson is debugging');
    eq(m.requires.length, 0, 'git can be started on its own');
    ok(data.sheets.git && data.sheets.git.module === 'git', 'cheat sheet');
    ok(data.interview.filter((x) => x.module === 'git').length >= 8, 'interview answers');
    ok(data.drills.filter((x) => x.module === 'git').length >= 8, 'drills');
    ok(data.games.filter((x) => x.module === 'git').length >= 2, 'games');
    ok(EXPL_IDS.filter((x) => /^git-/.test(x)).length >= 12, 'explainers');
    for (const p of data.paths.live) ok(p.modules.indexOf('git') >= 0 && p.modules.indexOf('git') > p.modules.indexOf('linux') - 1, p.id + ' includes git');
    const { ctx, page } = await open();
    await go(page, '/'); await setProgress(page, allDone());
    await go(page, '/lesson/git/' + m.lessons[1].split('/')[1]); await page.waitForSelector('#prose');
    ok(await page.locator('#prose pre code').count() >= 3, 'code examples render');
    ok(/git restore/.test(await page.textContent('#prose')), 'the word git is allowed in the git skill');
    await ctx.close();
  });

  await test('go and helm skills, kernel lessons and the certifications link', async () => {
    const gm = data.modules.find((x) => x.id === 'go'), hm = data.modules.find((x) => x.id === 'helm');
    eq(gm.lessons.length, 10, 'ten go lessons'); ok(/debugging/.test(gm.lessons[9]), 'go ends with debugging'); eq(gm.requires.length, 0, 'go has no prerequisites');
    eq(hm.lessons.length, 8, 'eight helm lessons'); ok(/debugging/.test(hm.lessons[7]), 'helm ends with debugging'); eq(hm.requires.join(), 'kubernetes', 'helm requires kubernetes');
    for (const id of ['go', 'helm']) {
      ok(data.interview.filter((x) => x.module === id).length >= 8, id + ' interview');
      ok(data.drills.filter((x) => x.module === id).length >= 8, id + ' drills');
      ok(EXPL_IDS.filter((x) => new RegExp('^x-' + id + '-').test(x)).length >= 12, id + ' explainers');
    }
    ok(data.games.filter((x) => x.module === 'go').length >= 3, 'go incident games');
    ok(data.games.filter((x) => x.module === 'helm').length >= 2, 'helm games');
    for (const p of data.paths.live.filter((q) => !['ai','mlops'].includes(q.id))) { ok(p.modules.indexOf('go') > p.modules.indexOf('python'), p.id + ' go after python'); ok(p.modules.indexOf('helm') > p.modules.indexOf('kubernetes'), p.id + ' helm after kubernetes'); }
    const lx = data.modules.find((x) => x.id === 'linux');
    ok(lx.lessons.length >= 22 && lx.lessons.some((l) => /debugging/.test(l)), 'linux has a debugging lesson');
    for (const sl of ['kernel-modules-sysctl-and-boot-parameters', 'processes-memory-and-the-oom-killer', 'system-calls-strace-and-perf']) ok(lx.lessons.some((l) => l.endsWith(sl)), 'kernel lesson ' + sl);
    const { ctx, page } = await open();
    await go(page, '/');
    const a = page.locator('#topnav a.nav-certs:not(.nav-ih)');
    eq(await a.getAttribute('href'), 'https://certs.eknathalabs.com', 'certs href'); eq(await a.getAttribute('target'), '_blank', 'opens in new tab'); ok(/noopener/.test(await a.getAttribute('rel')), 'noopener');
    ok(/Certifications/.test(await a.textContent()), 'accessible name');
    await ctx.close();
  });

  await test('ai engineering tree, skill-writing lab, ai cases and post-mortems', async () => {
    const ids = ['llm', 'prompting', 'claude-skills', 'mcp'];
    for (const id of ids) {
      const m = data.modules.find((x) => x.id === id);
      eq(m.lessons.length, 8, id + ' lessons'); ok(/debugging/.test(m.lessons[7]), id + ' ends with debugging');
      ok(data.interview.filter((x) => x.module === id).length >= 8, id + ' interview');
      ok(data.drills.filter((x) => x.module === id).length >= 8, id + ' drills');
      ok(data.games.filter((x) => x.module === id).length >= 2, id + ' incident games');
      ok(EXPL_IDS.filter((x) => new RegExp('^x-' + id.replace('claude-skills', 'skills') + '-').test(x)).length >= 12, id + ' explainers');
      ok(data.cases.filter((c) => c.modules.indexOf(id) >= 0).length >= 2, id + ' case studies');
      ok(data.sheets[id], id + ' cheat sheet');
    }
    const ap = data.paths.live.find((p) => p.id === 'ai');
    ok(ap && ap.modules.join() === 'linux,git,python,networking,llm,prompting,claude-skills,mcp', 'ai path modules');
    ok(data.arch.length >= 60, 'architecture studies: ' + data.arch.length);
    for (const k of ['anthropic', 'openai-redis', 'replit', 'air-canada', 'datatalks-terraform', 'ingress-nginx', 'postmark', 'leap-second-2012', 'dirty-pipe', 'dirty-cow']) ok(data.arch.some((a) => a.id.indexOf(k) >= 0), 'study ' + k);
    ok(data.arch.some((a) => a.modules.indexOf('terraform') >= 0 && a.modules.length), 'terraform study');
    const { ctx, page } = await open();
    await go(page, '/skill-lab');
    ok(/Skill-writing lab/.test(await page.locator('h1').textContent()), 'lab heading');
    await go(page, '/skill-lab/secret');
    await page.click('[data-act=sl-check]');
    ok(/API key|secret|password/i.test(await page.locator('#sl-out').textContent()), 'secret flagged');
    ok(/Not solved/.test(await page.locator('#sl-out').textContent()), 'secret task not solved yet');
    await go(page, '/skill-lab/description');
    await page.fill('#sl-text', '---\nname: contract-review\ndescription: Reviews contracts and agreements for risky clauses such as indemnity, termination and liability caps. Use when the user asks to review, check or summarise a contract or agreement.\n---\n# Contract review\n\n1. Read the contract.\n2. List unusual clauses.\n3. Quote each clause and explain the risk.\n');
    await page.click('[data-act=sl-check]');
    ok(/Solved/.test(await page.locator('#sl-out h3').first().textContent()), 'description task solved');
    await go(page, '/skill-lab/script');
    await page.fill('#sl-text', '---\nname: log-summary\ndescription: Summarises application log files and lists the most frequent errors. Use when the user attaches a log file or asks what is failing in a log.\n---\n# Log summary\n\n1. Run scripts/summarise.py on the log file.\n2. Report the five most frequent errors with counts.\n');
    await page.click('[data-act=sl-check]');
    ok(/Solved/.test(await page.locator('#sl-out h3').first().textContent()), 'script task solved');
    await go(page, '/module/claude-skills');
    ok(await page.locator('a[href="#/skill-lab"]').count() >= 1, 'module links to the lab');
    await go(page, '/skills');
    ok(/Build with AI|AI Engineer/.test(await page.locator('body').textContent()), 'ai appears on skills page');
    await ctx.close();
  });

  await test('case files: nine sections, labelled diagrams and evidence, quiz feedback, card link, no overflow, axe clean', async () => {
    const ids = (data.casefiles || []).map((f) => f.id);
    ok(ids.length === (data.cases || []).length && ids.length >= 81, 'a case file for every case card, got ' + ids.length + ' of ' + (data.cases || []).length);
    const { ctx, page, issues } = await open();
    for (const id of ids) {
      await go(page, '/case-file/' + id);
      const h = await page.locator('#main h2').allTextContents();
      ok(h.length >= 9 && /Incident overview/.test(h[0]) && /Lessons learned/.test(h[8]), id + ' sections ' + h.length);
      ok(await page.locator('.cf-badge.ver, .cf-badge.con').count() >= 2, id + ' diagram labels');
      ok(await page.locator('.cf-badge.sim').count() >= 1, id + ' simulated label');
      ok(await page.locator('.cfd, svg').count() >= 2, id + ' diagrams');
      const txt = await page.locator('#main').innerText();
      ok(!/undefined|NaN|\[object Object\]/.test(txt), id + ' clean text');
    }
    await go(page, '/case-file/' + ids[0]);
    const q = page.locator('.cf-q').first(); const ans = await q.getAttribute('data-answer');
    await q.locator('.cf-opt').nth(Number(ans)).click();
    ok(await q.locator('.cf-why').isVisible(), 'explanation shown after answering');
    await page.click('.cf-jump >> nth=5');
    await go(page, '/cases/' + ids[0]);
    ok(/Open the full case file/.test(await page.locator('#main').innerText()), 'card links to the file');
    ok(issues.length === 0, 'page errors ' + issues.join('|'));
    await ctx.close();
    for (const dark of [false, true]) {
      const m = await open({ viewport: { width: 390, height: 844 }, dark });
      const sample = dark ? ids.filter((_, i) => i % 8 === 0) : ids;
      for (const id of sample) {
        await go(m.page, '/case-file/' + id);
        ok(await m.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2), id + ' no sideways scroll' + (dark ? ' (dark)' : ''));
        await m.page.addScriptTag({ content: AXE });
        const res = await m.page.evaluate(async () => (await axe.run('#main', { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target).join(',')));
        eq(res.length, 0, id + ' axe: ' + res.join(' | '));
      }
      await m.ctx.close();
    }
  });

  await test('round 32: Elsewhere menu, Continue strip, goal links, find-my-path quiz, goal pages', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/');
    ok(await page.locator('#nav-more-menu').isHidden(), 'Elsewhere menu closed at rest');
    await page.waitForTimeout(500);
    if (await page.locator('.menu-btn').isVisible()) await page.click('.menu-btn');
    await page.click('.nav-more-btn'); ok(await page.locator('#nav-more-menu').isVisible(), 'Elsewhere opens');
    eq(await page.getAttribute('.nav-more-btn', 'aria-expanded'), 'true', 'aria-expanded true');
    eq(await page.locator('#nav-more-menu a').count(), 4, 'four links in Elsewhere');
    await page.keyboard.press('Escape'); ok(await page.locator('#nav-more-menu').isHidden(), 'Escape closes it');
    eq(await page.locator('.goal-list a, .gs-list a').count() >= 5, true, 'home links to five goals');
    await go(page, '/find-my-path');
    const picks = [0, 0, 0, 1, 0];
    for (const n of picks) { await page.locator('.gq-opt').nth(n).click(); }
    ok(/Your goal:/.test(await page.textContent('.gq-res h2')), 'result shown');
    ok(await page.locator('.gq-res a[href^="#/plan/"]').count() === 1 && await page.locator('.gq-res a[href^="#/path/"]').count() === 1, 'result links a plan and a path');
    await page.click('[data-gq=again]'); ok(await page.locator('.gq-opt').count() > 0, 'retake restarts the quiz');
    for (const g of ['sre', 'linux', 'kubernetes', 'devops', 'cloud']) {
      await go(page, '/goal/' + g);
      ok(await page.locator('.gp-steps li').count() === 5, g + ': five first steps');
      for (const a of await page.locator('#main a[href^="#/"]').evaluateAll((els) => els.map((x) => x.getAttribute('href')))) {
        if (!/^#\/(plan|path|module|roadmap|terminal-labs|linux|goal|find-my-path|cheatsheets|interview)(\/|\?|$)/.test(a) && a !== '#/') ok(false, g + ': unexpected link ' + a);
      }
    }
    await go(page, '/goal/nope'); await page.waitForSelector('.gq-opt');
    ok(issues.length === 0, 'page errors ' + issues.join('|'));
    await ctx.close();
  });

  await test('round 32: explain this output, replay, break it again in a terminal lab', async () => {
    const { ctx, page, issues } = await open();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await go(page, '/terminal-lab/cl-aws-wrong-profile'); await page.waitForSelector('#tl-in'); await page.waitForTimeout(600);
    await page.click('[data-act=tl-explain]'); ok(/Run a command first/.test(await page.textContent('#tl-explain')), 'asks for a command first');
    await page.fill('#tl-in', 'aws s3 cp /nonexistent s3://shop-reports/'); await page.press('#tl-in', 'Enter'); await page.waitForTimeout(500);
    await page.click('[data-act=tl-explain]'); ok(/not an AI/.test(await page.textContent('#tl-explain')), 'explain box filled');
    await page.fill('#tl-in', 'ls /nonexistent'); await page.press('#tl-in', 'Enter'); await page.waitForTimeout(400);
    await page.click('[data-act=tl-explain]'); ok(/No such file or directory/.test(await page.textContent('#tl-explain')), 'ls error explained');
    await page.click('#tl-sol'); await page.click('#tl-check'); await page.waitForSelector('#tl-res .drill-res');
    ok(await page.locator('#tl-res .drill-res.no').count() === 1, 'not solved yet');
    await page.evaluate(() => { const b = document.createElement('button'); b.id = 'tl-replay'; b.setAttribute('data-act', 'tl-replay'); document.body.appendChild(b); });
    await page.click('#tl-replay'); await page.waitForTimeout(4500);
    await page.click('#tl-check'); await page.waitForSelector('#tl-res .drill-res.ok');
    ok(await page.locator('[data-act=tl-break]').count() === 1 && await page.locator('#tl-res [data-act=tl-replay]').count() === 1, 'break it again and replay offered after solving');
    await page.click('[data-act=tl-break]'); await page.waitForTimeout(300);
    ok(/different version of the fault|fault is back/.test(await page.textContent('#tl-out')), 'fault restored');
    ok(await page.isDisabled('#tl-hint') && await page.isDisabled('#tl-sol'), 'hints and solution off in break mode');
    await page.click('#tl-check'); await page.waitForSelector('#tl-res .drill-res');
    ok(await page.locator('#tl-res .drill-res.no').count() === 1, 'broken again, checks fail');
    ok(issues.length === 0, 'page errors ' + issues.join('|'));
    await ctx.close();
  });

  await test('round 32: Real Linux lab split view, failure panel, and page-head alignment', async () => {
    const { ctx, page } = await open({ viewport: { width: 1280, height: 900 } });
    await go(page, '/linux/disk-full');
    const l = await page.locator('.vm-left').boundingBox(), r = await page.locator('.vm-right').boundingBox();
    ok(r.x > l.x + l.width - 2 && Math.abs(r.y - l.y) < 60, 'goals on the left, machine on the right');
    const h1 = await page.locator('.page-head h1').boundingBox(), body = await page.locator('.vm-left').boundingBox();
    ok(Math.abs(h1.x - body.x) < 3, 'heading lines up with the body: ' + h1.x + ' vs ' + body.x);
    await ctx.close();
    const m = await open({ viewport: { width: 390, height: 844 } });
    await go(m.page, '/linux/disk-full');
    const lb = await m.page.locator('.vm-left').boundingBox(), rb = await m.page.locator('.vm-right').boundingBox();
    ok(rb.y >= lb.y + lb.height - 2, 'stacked on a phone');
    await m.ctx.close();
    const f = await open(); await f.page.route('**/libv86.js*', (rt) => rt.abort());
    await go(f.page, '/linux/disk-full'); await f.page.click('#vm-start'); await f.page.waitForSelector('#vm-fail:not([hidden])');
    ok(/Use the simulated terminal/.test(await f.page.textContent('#vm-fail')) && await f.page.locator('#vm-retry').count() === 1, 'failure panel with fallback');
    await f.ctx.close();
  });

  await test('round 32: 35 cloud labs, goals on the home page, no stale page script after leaving Interview', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/interview'); await page.goto(BASE + '/#/plans'); await page.waitForSelector('#main h1'); await page.waitForTimeout(700);
    ok(issues.length === 0, 'no page errors after quick navigation: ' + issues.join('|'));
    const data = await page.evaluate(() => MargaApp.D.termlabs.filter((l) => l.module === 'cloud').length);
    eq(data, 35, 'cloud labs in data');
    await ctx.close();
  });


  await test('round 33: five new skills in the tree, learning dashboard, lab before/after, step-through diagrams, Sources list', async () => {
    const { ctx, page, issues } = await open();
    const ids = ['virtualization', 'storage', 'sql-ops', 'gpu-serving', 'openstack'];
    for (const id of ids) ok(data.modules.some((m) => m.id === id), 'module ' + id);
    for (const id of ids) ok(data.termlabs.filter((l) => l.module === id).length >= 2, 'labs for ' + id);
    await go(page, '/dashboard'); await page.waitForSelector('.ld-grid');
    eq(await page.locator('.ld-row').count(), data.modules.length, 'a row per skill');
    await page.selectOption('#ld-goal', '5'); await page.waitForSelector('.ld-big');
    ok(/of 5 days/.test(await page.textContent('.ld-big')), 'goal saved');
    await go(page, '/progress'); await page.waitForSelector('#ld-link');
    await go(page, '/terminal-lab/helm-replicas-text'); await page.waitForSelector('#tl-in'); await page.waitForTimeout(1500);
    for (const c of ["sed -i 's/replicas: .*/replicas: 3/' shop/values.yaml", 'helm upgrade --install shop ./shop']) { await page.fill('#tl-in', c); await page.press('#tl-in', 'Enter'); await page.waitForTimeout(400); }
    await page.click('#tl-check'); await page.waitForSelector('.tl-diff', { timeout: 10000 });
    ok(await page.locator('.tl-difft tbody tr.chg').count() >= 1, 'a changed line in the diff');
    await page.evaluate(() => { MargaApp.D.modules.forEach((m) => m.lessons.forEach((id) => { MargaApp.state().lessons[id] = { done: true, best: 100, at: 1, attempts: 1 }; })); MargaApp.save(); });
    await go(page, '/lesson/networking/dns'); await page.waitForSelector('.dg-step');
    await page.click('[data-act=dg-next]'); await page.click('[data-act=dg-next]');
    ok(/^Step 2 of \d+: .+ to .+/.test(await page.textContent('.dg-say')), 'narration for step 2');
    await page.click('[data-act=dg-prev]'); ok(/^Step 1 of/.test(await page.textContent('.dg-say')), 'back one step');
    await go(page, '/lesson/virtualization/' + data.modules.find((m) => m.id === 'virtualization').lessons[0].split('/')[1]); await page.waitForSelector('.refs-list');
    ok(await page.locator('.refs-list li').count() >= 1, 'sources listed');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('round 32b: break it again gives a different version, and a lab with one version says so', async () => {
    const { ctx, page, issues } = await open();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await go(page, '/terminal-lab/cl-aws-wrong-profile'); await page.waitForSelector('#tl-in'); await page.waitForTimeout(600);
    const before = await page.textContent('#tl-story'); const goalsBefore = await page.textContent('#tl-goals');
    await page.evaluate(() => { const b = document.createElement('button'); b.id = 'tl-fake'; b.setAttribute('data-act', 'tl-break'); document.body.appendChild(b); });
    await page.click('#tl-fake'); await page.waitForTimeout(400);
    const after = await page.textContent('#tl-story');
    ok(before !== after && /shop-exports|shop-ledgers/.test(after), 'story uses new names: ' + after.slice(0, 80));
    ok(/Version 2 of 3/.test(await page.textContent('#tl-variant')), 'version label');
    ok(await page.textContent('#tl-goals') !== goalsBefore, 'goals use new names');
    ok(/different version/.test(await page.textContent('#tl-out')), 'terminal says the names changed');
    await page.fill('#tl-in', 'aws s3 ls s3://shop-exports'); await page.press('#tl-in', 'Enter'); await page.waitForTimeout(400);
    ok(!/shop-reports/.test(await page.textContent('#tl-out').then((t) => t.split('different version')[1] || '')), 'old bucket name gone from the new session');
    ok(issues.length === 0, 'page errors ' + issues.join('|'));
    await ctx.close();
  });

  await test('round 32b: why did that fail, command cheat bar, and cloud explain', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/terminal-lab/cl-aws-wrong-profile'); await page.waitForSelector('#tl-in'); await page.waitForTimeout(600);
    ok(await page.isHidden('#tl-whybtn'), 'why button hidden before a failure');
    await page.fill('#tl-in', 'lss'); await page.press('#tl-in', 'Enter'); await page.waitForTimeout(300);
    ok(await page.isVisible('#tl-whybtn'), 'why button shown after a failure');
    await page.click('#tl-whybtn');
    ok(/Did you mean: ls/.test(await page.textContent('#tl-explain')), 'did-you-mean: ' + await page.textContent('#tl-explain'));
    await go(page, '/terminal-lab/k8s-imagepull'); await page.waitForSelector('#tl-in'); await page.waitForTimeout(600);
    await page.fill('#tl-in', 'kubectl gett pods'); await page.press('#tl-in', 'Enter'); await page.waitForTimeout(300);
    await page.click('#tl-whybtn'); ok(/Did you mean: get/.test(await page.textContent('#tl-explain')), 'kubectl sub-command suggestion: ' + await page.textContent('#tl-explain'));
    await go(page, '/terminal-lab/cl-aws-wrong-profile'); await page.waitForSelector('#tl-in'); await page.waitForTimeout(600);
    await page.fill('#tl-in', 'cat /etc/hosst'); await page.press('#tl-in', 'Enter'); await page.waitForTimeout(300);
    await page.click('#tl-whybtn'); ok(/\/etc\/hosts/.test(await page.textContent('#tl-explain')), 'near file name suggested');
    await page.click('.tl-cheat summary'); await page.click('.tl-cheat-list button >> nth=0');
    ok((await page.inputValue('#tl-in')).length > 0, 'cheat bar typed a command');
    ok(/aws sts get-caller-identity/.test(await page.inputValue('#tl-in')), 'first cloud cheat is who am I');
    await page.press('#tl-in', 'Enter'); await page.waitForTimeout(500);
    await page.click('[data-act=tl-explain]'); ok(/account/i.test(await page.textContent('#tl-explain')) && /You are/.test(await page.textContent('#tl-explain')), 'identity explained: ' + await page.textContent('#tl-explain'));
    await page.fill('#tl-in', 'aws s3 ls s3://shop-reports'); await page.press('#tl-in', 'Enter'); await page.waitForTimeout(500);
    await page.click('[data-act=tl-explain]'); ok(/AWS refused|Access|bucket|not allowed/i.test(await page.textContent('#tl-explain')), 'cloud output explained beyond the generic line');
    ok(issues.length === 0, 'page errors ' + issues.join('|'));
    await ctx.close();
  });

  await test('round 32b: cloud compare page, link from cloud labs, glossary cards in labs, share card looks, interview links', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/cloud-compare'); await page.waitForSelector('.cc-row');
    ok(await page.locator('.cc-row').count() === 16, 'sixteen jobs');
    ok(await page.locator('.cc-row:not([hidden]) a[href^="#/terminal-lab/"]').count() >= 16, 'each job links to a lab');
    const ids = await page.$$eval('.cc-row a[href^="#/terminal-lab/"]', (as) => as.map((a) => a.getAttribute('href').split('/').pop()));
    const have = await page.evaluate(() => MargaApp.D.termlabs.map((l) => l.id));
    ok(ids.every((i) => have.includes(i)), 'every linked lab exists: ' + ids.filter((i) => !have.includes(i)).join(','));
    await page.selectOption('#cc-prov', 'aws'); ok(await page.locator('.cc-az:visible').count() === 0 && await page.locator('.cc-gcp:visible').count() === 0 && await page.locator('.cc-aws:visible').count() > 0, 'AWS only');
    await page.selectOption('#cc-prov', 'gcp'); ok(await page.locator('.cc-gcp:visible').count() === 16 && await page.locator('.cc-aws:visible').count() === 0, 'Google Cloud only');
    await page.selectOption('#cc-prov', 'both'); await page.selectOption('#cc-grp', 'Network');
    ok(await page.locator('.cc-row:visible').count() === 3 && await page.locator('.cc-gcp:visible').count() === 3, 'network area: ' + await page.locator('.cc-row:visible').count());
    await go(page, '/terminal-labs/cloud'); await page.waitForSelector('#cc-link');
    await go(page, '/terminal-lab/cl-aws-ssh-blocked'); await page.waitForSelector('#cc-link');
    await page.waitForTimeout(500);
    ok(await page.locator('.tl-side .gl').count() >= 1, 'glossary term in the lab story: ' + await page.locator('.tl-side').innerText().then((t) => t.slice(0, 60)));
    await page.locator('.tl-side .gl').first().hover(); await page.waitForSelector('#gl-tip', { state: 'visible' });
    ok(/Open in glossary/.test(await page.textContent('#gl-tip')), 'hover card has a glossary link');
    await go(page, '/progress'); await page.waitForSelector('#sc-cv');
    const a = await page.evaluate(() => document.querySelector('#sc-cv').toDataURL().length);
    await page.selectOption('#sc-theme', 'paper'); await page.waitForTimeout(150);
    const b = await page.evaluate(() => document.querySelector('#sc-cv').toDataURL().length);
    ok(a !== b, 'theme changes the picture');
    await page.selectOption('#sc-size', 'square'); await page.waitForTimeout(150);
    eq(await page.evaluate(() => [document.querySelector('#sc-cv').width, document.querySelector('#sc-cv').height].join('x')), '1080x1080', 'square card');
    await go(page, '/interview'); await page.waitForSelector('#iv-list .iv-a, .iv-a, #iv-list');
    const links = await page.evaluate(() => { const D = MargaApp.D; return D.interview.filter((x) => MargaCross.forQuestion(x).length).length; });
    ok(links >= 20, 'interview questions with lab links: ' + links);
    const bad = await page.evaluate(() => { const have = new Set(MargaApp.D.termlabs.map((l) => l.id).concat(MargaApp.D.vmlabs.map((v) => v.id))); let n = 0; MargaApp.D.interview.forEach((x) => MargaCross.forQuestion(x).forEach((l) => { const id = l.href.split('/').pop(); if (!have.has(id)) n++; })); return n; });
    eq(bad, 0, 'all interview links point to real labs');
    ok(issues.length === 0, 'page errors ' + issues.join('|'));
    await ctx.close();
  });

  await test('round 32: real Linux lab, replay of the typed fix and break it again', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/linux');
    await vmSolve(page, 'disk-full');
    ok(await page.locator('#vm-replay').count() === 1 && await page.locator('#vm-again').count() === 1, 'replay and break-again offered after solving');
    await page.click('#vm-replay');
    await page.waitForFunction(() => /Done\. Press Check my work/.test(document.querySelector('#vm-status').textContent), null, { timeout: 90000 });
    const shown = await page.locator('.xterm-rows').first().innerText();
    ok(/rm \/var\/log\/app|app\.log/.test(shown), 'the fix was typed into the terminal');
    await page.click('#vm-again');
    await page.waitForFunction(() => /machine is running/i.test(document.querySelector('#vm-status').textContent), null, { timeout: 180000 });
    await page.click('#vm-check'); await page.waitForSelector('.vm-checks li', { timeout: 90000 });
    ok(await page.locator('.vm-checks li.fail').count() >= 1, 'the fault is back after Break it again');
    ok(issues.length === 0, 'page errors ' + issues.join('|'));
    await ctx.close();
  });


  await test('round 32: lab cards, 100-day grid, winding skill map, progress share card, one-row phone header', async () => {
    const { ctx, page, issues } = await open({ viewport: { width: 1280, height: 900 } });
    await go(page, '/linux?level=All');
    ok(await page.locator('.vm-card').count() === 149 && await page.locator('.vm-card .vc-go a').count() === 149, 'lab cards with a Start button each');
    await go(page, '/plan/sre-100');
    eq(await page.locator('.pg-d').count(), 100, '100 grid cells');
    ok(await page.locator('.pg-d.pg-today').count() === 1 && await page.locator('.pg-d.pg-review').count() >= 10, 'today and review days marked');
    await page.click('.pg-d >> nth=9'); ok(await page.evaluate(() => document.querySelector('#day-10').open), 'a grid cell opens its day');
    await go(page, '/roadmap/devops');
    ok(await page.locator('.sn-n').count() >= 17 && await page.locator('.sn-n.here').count() === 1, 'winding map with a you-are-here step');
    await page.click('.sn-n a >> nth=0'); await page.waitForSelector('#main h1');
    await go(page, '/progress');
    await page.fill('#sc-name', 'Test Name');
    const png = await page.evaluate(() => document.querySelector('#sc-cv').toDataURL('image/png').length);
    ok(png > 5000, 'share card draws a picture');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#sc-dl')]);
    eq(dl.suggestedFilename(), 'marga-progress.png', 'card downloads as a PNG');
    ok(issues.length === 0, 'page errors ' + issues.join('|'));
    await ctx.close();
    const m = await open({ viewport: { width: 360, height: 700 } }); await go(m.page, '/');
    await m.page.waitForTimeout(700);
    const hh = (await m.page.locator('.topbar').boundingBox()).height; ok(hh < 70, 'header is one row on a phone, height ' + hh);
    await m.ctx.close();
  });


