  // ------------------------------------------------------------ screenshots
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const dark of [false, true]) {
      for (const vp of [{ n: 'desktop', w: 1280, h: 900 }, { n: 'mobile', w: 390, h: 844 }]) {
        const { ctx, page } = await open({ dark, viewport: { width: vp.w, height: vp.h } });
        await go(page, '/');
        const prog = emptyProgress(); prog.lessons = doneMap([...MODS.linux.lessons, ...MODS.bash.lessons, ...MODS.networking.lessons.slice(0, 2)]);
        prog.days = [await today(page, 0), await today(page, -1), await today(page, -2)];
        await setProgress(page, prog);
        for (const [name, r] of [['home', '/'], ['paths', '/paths'], ['path', '/path/sre'], ['module', '/module/networking'], ['lesson', '/lesson/networking/http-and-tls'], ['sheet', '/cheatsheet/kubernetes'], ['sheets', '/cheatsheets'], ['progress', '/progress'], ['labs', '/labs'], ['locked', '/module/kubernetes']]) {
          await nav(page, r);
          await page.waitForSelector('#main h1');
          await page.waitForTimeout(700);
          await page.screenshot({ path: path.join(SHOTS, `${name}-${vp.n}-${dark ? 'dark' : 'light'}.png`), fullPage: name === 'lesson' ? false : true });
        }
        await ctx.close();
      }
    }
  }


  // ------------------------------------------------------------ badges
  const bdCode = (name, id, date) => {
    const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
    const AL = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const str = 'MARGA1|' + id + '|' + date + '|' + String(name || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const a = fnv('a' + str), b = fnv('b' + str); let out = '';
    for (let i = 0; i < 6; i++) out += AL[(a >>> (i * 5)) & 31];
    for (let j = 0; j < 2; j++) out += AL[(b >>> (j * 5)) & 31];
    return 'MG-' + out.slice(0, 4) + '-' + out.slice(4);
  };
  // linux, bash and every Ansible lesson except the last one are done, so passing the last quiz earns the stage badge only
  const ansibleAlmost = () => { const p = emptyProgress(); const a = MODS.ansible.lessons; p.lessons = doneMap([...MODS.linux.lessons, ...MODS.bash.lessons, ...a.slice(0, -1)]); return p; };
  const lastAnsible = () => MODS.ansible.lessons[MODS.ansible.lessons.length - 1];
  async function earnAnsible(page) {
    await go(page, '/');
    await setProgress(page, ansibleAlmost());
    await nav(page, `/lesson/${lastAnsible()}`);
    await page.waitForSelector('#qstart');
    await takeQuiz(page, lastAnsible(), 0);
    await page.waitForSelector('#badge-dlg');
  }
  const bytesOf = (file) => fs.readFileSync(file);

  await test('badges: the wall lists every stage and path badges, locked ones show progress, and the hub links to it', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/badges');
    eq(await page.locator('.bd-card').count(), data.modules.length + data.paths.live.length, 'badge cards');
    eq(await page.locator('.bd-card.on').count(), 0, 'none earned at first');
    ok(new RegExp('You have earned 0 of ' + (data.modules.length + data.paths.live.length)).test(await page.textContent('#main')), 'count text');
    const t = await page.textContent('.bd-caution');
    ok(/Not a certification/.test(t), 'caution on wall');
    await nav(page, '/badge/stage-ansible');
    await page.waitForSelector('.bd-locked');
    ok(/Not earned yet/.test(await page.textContent('#main')), 'locked text');
    await nav(page, '/practice');
    await page.waitForSelector('.prac');
    ok((await page.locator('.prac a[href="#/badges"]').count()) === 1, 'hub card');
    await nav(page, '/module/ansible'); await page.waitForSelector('.bd-line');
    ok(/stage badge/.test(await page.textContent('.bd-line')), 'module page line');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('badges: finishing a stage reveals the badge and asks for a name once; downloads work as PNG and PDF with the caution message', async () => {
    const { ctx, page, issues } = await open();
    await earnAnsible(page);
    eq(await page.getAttribute('#badge-dlg', 'role'), 'dialog', 'dialog role');
    eq(await page.getAttribute('#badge-dlg', 'aria-modal'), 'true', 'aria-modal');
    ok(await page.locator('#badge-dlg svg[role=img]').count() === 1, 'badge art in dialog');
    ok(/Completed the MARGA Ansible and configuration management stage/.test(await page.textContent('#badge-dlg svg title')), 'honest title');
    ok(!/certified/i.test(await page.textContent('#badge-dlg')), 'never says certified');
    ok(await page.isVisible('#bd-name'), 'name prompt');
    ok(await page.evaluate(() => document.activeElement && document.activeElement.id) === 'bd-name', 'focus in the name field');
    await page.fill('#bd-name', '  Asha   Rao ');
    await page.click('#bd-name-form button[type=submit]');
    await page.waitForFunction(() => location.hash === '#/badge/stage-ansible');
    await page.waitForSelector('#bd-show svg');
    const day = await today(page, 0);
    const p = await progress(page);
    eq(p.bd.name, 'Asha Rao', 'name stored cleaned');
    eq(p.bd.earned['stage-ansible'], day, 'date recorded');
    const code = (await page.textContent('#bd-code')).trim();
    eq(code, bdCode('Asha Rao', 'stage-ansible', day), 'code matches an independent computation');
    const svgText = await page.textContent('#bd-show svg');
    ok(svgText.includes('Asha Rao') && svgText.includes(code) && svgText.includes('Not a certification'), 'name, code and caution on the picture');
    ok(/Ansible and configuration/.test(svgText), 'stage name on the picture');
    ok(/Lessons passed/.test(svgText), 'covered list on the picture');
    const note = await page.textContent('#bd-caution');
    ok(/Not a certification/.test(note) && /does not confirm identity/.test(note) && /Asha Rao/.test(note), 'caution beside the buttons');
    const [png] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=badge-png]')]);
    eq(png.suggestedFilename(), 'marga-badge-stage-ansible.png', 'png name');
    const pf = path.join(os.tmpdir(), `bd-${Date.now()}.png`); await png.saveAs(pf);
    const pb = bytesOf(pf);
    eq(pb.slice(0, 8).toString('hex'), '89504e470d0a1a0a', 'png signature');
    eq(pb.readUInt32BE(16), 2400, 'png width'); eq(pb.readUInt32BE(20), 1600, 'png height');
    ok(pb.length > 20000, 'png has real content, size ' + pb.length);
    await page.waitForFunction(() => /not a certification/i.test(document.getElementById('toast').textContent));
    const [pdf] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=badge-pdf]')]);
    eq(pdf.suggestedFilename(), 'marga-badge-stage-ansible.pdf', 'pdf name');
    const df = path.join(os.tmpdir(), `bd-${Date.now()}.pdf`); await pdf.saveAs(df);
    const db = bytesOf(df), dt = db.toString('latin1');
    ok(dt.startsWith('%PDF-1.4'), 'pdf header'); ok(dt.trimEnd().endsWith('%%EOF'), 'pdf trailer');
    ok(dt.includes('/DCTDecode') && dt.includes('/MediaBox'), 'pdf image and page');
    ok(dt.includes('Not a certification, degree or qualification'), 'caution printed as text in the pdf');
    const xrefPos = Number(/startxref\n(\d+)/.exec(dt)[1]);
    ok(dt.slice(xrefPos, xrefPos + 4) === 'xref', 'xref offset points at the table');
    const offs = [...dt.slice(xrefPos).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    offs.forEach((o, i) => ok(dt.slice(o).startsWith(`${i + 1} 0 obj`), `object ${i + 1} offset`));
    // PDF renders: use poppler if present
    try { const cp = require('child_process'); const out = cp.spawnSync('pdftoppm', ['-r', '40', '-png', df, df + '.page'], { encoding: 'utf8' }); if (out.status === 0) ok(fs.existsSync(df + '.page-1.png'), 'pdf rasterised'); } catch (x) { /* poppler not installed */ }
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('badges: the name can be skipped, edited and deleted; it is exported, imported and never asked twice', async () => {
    const { ctx, page } = await open();
    await earnAnsible(page);
    await page.click('#bd-name-form [data-act=badge-skip]');
    await page.waitForSelector('#badge-dlg', { state: 'detached' });
    let p = await progress(page);
    eq(p.bd.asked, true, 'asked remembered'); eq(p.bd.name, '', 'no name saved');
    await nav(page, '/badge/stage-ansible'); await page.waitForSelector('#bd-show svg');
    ok((await page.textContent('#bd-show svg')).includes('Name not added'), 'picture says name not added');
    ok(/no name/.test(await page.textContent('#bd-caution')), 'caution says no name');
    ok(await page.isDisabled('[data-act=badge-delete-name]'), 'delete disabled without a name');
    // edit
    await page.fill('#bd-name', 'Zed Example'); await page.click('#bd-name-edit button[type=submit]');
    await page.waitForFunction(() => /Zed Example/.test(document.getElementById('bd-caution').textContent));
    const code1 = (await page.textContent('#bd-code')).trim();
    ok(code1 === bdCode('Zed Example', 'stage-ansible', (await progress(page)).bd.earned['stage-ansible']), 'code follows the name');
    // export contains the name
    await nav(page, '/progress');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=export]')]);
    const file = path.join(os.tmpdir(), `bd-export-${Date.now()}.json`); await dl.saveAs(file);
    const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
    eq(exported.bd.name, 'Zed Example', 'export carries the name'); ok(exported.bd.earned['stage-ansible'], 'export carries the badge');
    // delete with one button
    await nav(page, '/badge/stage-ansible'); await page.waitForSelector('[data-act=badge-delete-name]');
    await page.click('[data-act=badge-delete-name]');
    await page.waitForFunction(() => document.querySelector('#bd-show svg') && document.querySelector('#bd-show svg').textContent.includes('Name not added'));
    p = await progress(page); eq(p.bd.name, '', 'name deleted'); ok(p.bd.earned['stage-ansible'], 'badge kept');
    ok(!JSON.stringify(p).includes('Zed Example'), 'name gone from storage');
    // import restores
    await nav(page, '/progress'); await page.waitForSelector('#import-file');
    await page.setInputFiles('#import-file', file);
    await page.waitForFunction(() => (JSON.parse(localStorage.getItem('ea.progress.v1')).bd || {}).name === 'Zed Example');
    // a second badge does not ask again
    const q = await progress(page); q.bd.asked = true; q.lessons = Object.assign({}, q.lessons, doneMap(MODS.docker.lessons.slice(0, -1)), doneMap(MODS.networking.lessons)); await setProgress(page, q);
    const last = MODS.docker.lessons[MODS.docker.lessons.length - 1];
    await nav(page, `/lesson/${last}`); await page.waitForSelector('#qstart'); await takeQuiz(page, last, 0);
    await page.waitForSelector('#badge-dlg');
    ok(await page.locator('#bd-name').count() === 0, 'no second name prompt');
    ok(await page.isVisible('#bd-view'), 'view badge link');
    await ctx.close();
  });

  await test('badges: keyboard users stay inside the dialog and Escape closes it without saving a name', async () => {
    const { ctx, page } = await open();
    await earnAnsible(page);
    const ids = [];
    for (let i = 0; i < 6; i++) { ids.push(await page.evaluate(() => { const a = document.activeElement; return !!a.closest('#badge-dlg'); })); await page.keyboard.press('Tab'); }
    ok(ids.every(Boolean), 'focus never leaves the dialog: ' + ids.join(','));
    await page.keyboard.press('Escape');
    await page.waitForSelector('#badge-dlg', { state: 'detached' });
    const p = await progress(page); eq(p.bd.asked, true, 'asked'); eq(p.bd.name, '', 'no name');
    await ctx.close();
  });

  await test('badges: the verification page accepts matching details and rejects changed ones, and says what a match means', async () => {
    const { ctx, page } = await open();
    await go(page, '/badge-check');
    const date = '2026-03-04', good = bdCode('Asha Rao', 'stage-linux', date);
    ok(/anyone can make a matching code/i.test(await page.textContent('.bd-caution')), 'honest limits');
    async function tryIt(name, badge, d, code) {
      await page.fill('#bc-name', name); await page.selectOption('#bc-badge', badge); await page.fill('#bc-date', d); await page.fill('#bc-code', code);
      await page.click('#bd-check button[type=submit]'); await page.waitForSelector('#bc-result .bd-res');
      return page.textContent('#bc-result');
    }
    ok(/matches these details/.test(await tryIt('Asha Rao', 'stage-linux', date, good)), 'match');
    ok(/matches these details/.test(await tryIt('  asha   RAO ', 'stage-linux', date, good.toLowerCase())), 'case and spaces do not matter');
    ok(/does not match/.test(await tryIt('Asha Rao', 'stage-bash', date, good)), 'other badge');
    ok(/does not match/.test(await tryIt('Asha Rao', 'stage-linux', '2026-03-05', good)), 'other date');
    ok(/does not match/.test(await tryIt('Ashok Rao', 'stage-linux', date, good)), 'other name');
    ok(/does not confirm who the person is/.test(await tryIt('Asha Rao', 'stage-linux', date, good)), 'states the limit on a match');
    await ctx.close();
  });

  await test('badges: finishing every stage earns all stage badges and 6 path badges; shapes differ and the light and dark variants both draw', async () => {
    const { ctx, page } = await open();
    await go(page, '/'); await setProgress(page, allDone());
    await nav(page, '/badges'); await page.waitForSelector('.bd-card');
    eq(await page.locator(".bd-card.on").count(), data.modules.length + data.paths.live.length, 'all earned');
    ok(new RegExp('You have earned ' + (data.modules.length + data.paths.live.length) + ' of ').test(await page.textContent('#main')), 'count');
    ok(!/certified/i.test(await page.textContent('#main')), 'never says certified');
    await nav(page, '/badge/path-devops'); await page.waitForSelector('#bd-show svg');
    ok(await page.locator('#bd-show svg polygon').count() >= 2, 'path badge is a hexagon');
    ok(/Completed the MARGA DevOps Engineer path/.test(await page.textContent('#bd-show svg title')), 'path wording');
    await nav(page, '/badge/stage-linux'); await page.waitForSelector('#bd-show svg');
    ok(await page.locator('#bd-show svg circle').count() >= 2 && await page.locator('#bd-show svg polygon').count() === 0, 'stage badge is a circle');
    const symbols = new Set();
    for (const m of data.modules) { await nav(page, `/badge/stage-${m.id}`); await page.waitForSelector('#bd-show svg .bd-sym'); symbols.add(await page.getAttribute('#bd-show svg .bd-sym', 'transform').then(() => page.innerHTML('#bd-show svg .bd-sym'))); }
    eq(symbols.size, data.modules.length, 'every stage has its own symbol');
    const fill = () => page.getAttribute('#bd-show svg > rect', 'fill');
    await page.click('[data-act=badge-variant][data-v=dark]'); await page.waitForSelector('[data-v=dark][aria-pressed=true]');
    eq(await fill(), '#0B1220', 'dark variant');
    await page.click('[data-act=badge-variant][data-v=light]'); await page.waitForSelector('[data-v=light][aria-pressed=true]');
    eq(await fill(), '#FBF8F1', 'light variant');
    await ctx.close();
  });

  await test('badges: the reveal animates normally and is switched off when the visitor prefers reduced motion', async () => {
    for (const motion of [true, false]) {
      const { ctx, page } = await open({ motion });
      await earnAnsible(page);
      const anim = await page.evaluate(() => getComputedStyle(document.querySelector('#badge-dlg .bd-ring')).animationName);
      if (motion) ok(anim === 'bd-draw', 'animation runs, got ' + anim); else eq(anim, 'none', 'no animation under reduced motion');
      const op = await page.evaluate(() => getComputedStyle(document.querySelector('#badge-dlg .bd-fill')).opacity);
      if (!motion) eq(op, '1', 'artwork fully visible without motion');
      await ctx.close();
    }
  });

  await test('badges: accessibility checks pass for the wall, a badge, the checker and the open dialog in both themes', async () => {
    const problems = [];
    for (const dark of [false, true]) {
      const { ctx, page } = await open({ dark });
      await earnAnsible(page);
      const run = async (label) => {
        await page.addScriptTag({ content: AXE });
        const res = await page.evaluate(async (scope) => (await window.axe.run(scope ? document.querySelector(scope) : document, { resultTypes: ['violations'] })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id} ${v.nodes[0].target.join(' ')}`), label === 'dialog' ? '#badge-dlg' : null);
        for (const v of res) problems.push(`${dark ? 'dark' : 'light'} ${label}: ${v}`);
      };
      await run('dialog');
      await page.click('#bd-name-form [data-act=badge-skip]');
      for (const r of ['/badges', '/badge/stage-ansible', '/badge/stage-linux', '/badge-check']) { await nav(page, r); await page.waitForSelector('#main h1'); await run(r); }
      await ctx.close();
    }
    eq(problems.length, 0, '\n' + problems.join('\n'));
  });

  await test('badges on a phone: dialog, wall, badge page and downloads fit a 390 px screen with no sideways scrolling', async () => {
    const { ctx, page, issues } = await open({ viewport: { width: 390, height: 844 } });
    await earnAnsible(page);
    const box = await page.evaluate(() => { const r = document.querySelector('#badge-dlg').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight, ov: document.documentElement.scrollWidth - innerWidth }; });
    ok(box.l >= 0 && box.r <= box.w + 1, 'dialog inside the screen width'); ok(box.ov <= 1, 'no overflow with dialog open');
    ok(await page.isVisible('#bd-name'), 'name field visible'); ok(await page.isVisible('#bd-name-form button[type=submit]'), 'save button reachable');
    await page.fill('#bd-name', 'Asha Rao'); await page.click('#bd-name-form button[type=submit]');
    await page.waitForSelector('#bd-show svg');
    for (const r of ['/badges', '/badge/stage-ansible', '/badge-check', '/walkthroughs', '/walkthrough/online-payments-service']) {
      await nav(page, r); await page.waitForSelector('#main h1');
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      ok(ov <= 1, `${r} overflows by ${ov}px`);
    }
    await nav(page, '/badge/stage-ansible'); await page.waitForSelector('#bd-show svg');
    const svgW = await page.evaluate(() => document.querySelector('#bd-show svg').getBoundingClientRect().width);
    ok(svgW <= 390 && svgW > 300, 'badge scales to the screen, width ' + svgW);
    for (const sel of ['[data-act=badge-png]', '[data-act=badge-pdf]']) {
      const h = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().height, sel);
      ok(h >= 40, `${sel} is a comfortable tap target (${h}px)`);
    }
    const [png] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=badge-png]')]);
    const pf = path.join(os.tmpdir(), `bdm-${Date.now()}.png`); await png.saveAs(pf); eq(bytesOf(pf).slice(0, 4).toString('hex'), '89504e47', 'png on phone');
    const [pdf] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=badge-pdf]')]);
    const df = path.join(os.tmpdir(), `bdm-${Date.now()}.pdf`); await pdf.saveAs(df); ok(bytesOf(df).toString('latin1').startsWith('%PDF-1.4'), 'pdf on phone');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('badges: nothing about a badge or a name is sent over the network', async () => {
    const { ctx, page } = await open();
    const reqs = []; page.on('request', (r) => { const u = r.url(); if (!u.startsWith(BASE) && !/goatcounter/.test(u) && !u.startsWith('data:') && !u.startsWith('blob:')) reqs.push(u); });
    await earnAnsible(page); await page.fill('#bd-name', 'Private Person'); await page.click('#bd-name-form button[type=submit]');
    await page.waitForSelector('#bd-show svg');
    const posted = []; page.on('request', (r) => { if (r.method() !== 'GET') posted.push(r.url()); });
    const [png] = await Promise.all([page.waitForEvent('download'), page.click('[data-act=badge-png]')]); void png;
    await page.waitForTimeout(300);
    eq(reqs.length, 0, 'unexpected hosts: ' + reqs.join(', ')); eq(posted.length, 0, 'unexpected non-GET requests: ' + posted.join(', '));
    const src = fs.readFileSync(path.resolve(__dirname, '../src/app/badges.js'), 'utf8');
    ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|navigator\.share/.test(src), 'badges.js has no network code');
    ok(!/certified/i.test(src.replace(/Not a certification/g, '')), 'badges.js never claims certification');
    await ctx.close();
  });

  await test('architecture walkthroughs: six designs list, open with a diagram, flows and failure points, link to lessons and work on a phone', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/walkthroughs');
    eq(await page.locator('.cap-card').count(), 24, 'twenty-four walkthroughs');
    ok(/not the internal designs of any real company/.test(await page.textContent('#main')), 'honest note on the list');
    for (const w of data.walkthroughs) {
      await nav(page, `/walkthrough/${w.id}`); await page.waitForSelector('#wt-body .dg-node');
      ok(await page.locator('#wt-body .dg-node').count() >= 6, `${w.id}: components`);
      ok(await page.locator('#wt-body h2').count() >= 5, `${w.id}: sections`);
      ok(await page.locator('#wt-body table').count() >= 1, `${w.id}: failure table`);
      ok(await page.locator('#wt-body .predict').count() === 1, `${w.id}: predict question`);
      ok(await page.locator('section[aria-label="Related lessons"] a').count() >= 2, `${w.id}: lesson links`);
    }
    await nav(page, '/walkthrough/online-payments-service'); await page.waitForSelector('.dg-node');
    await page.locator('.dg-node').first().click();
    ok((await page.textContent('.dg-live')).length > 20, 'component detail shows');
    await page.click('[data-act=predict-reveal]'); ok(await page.locator('.predict-out').isVisible(), 'predict reveals');
    eq(issues.length, 0, issues.join(' | '));
    await ctx.close();
  });


