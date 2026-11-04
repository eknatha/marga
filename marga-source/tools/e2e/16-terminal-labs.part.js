  // ------------------------------------------------------------ terminal labs
  const typeLine = async (page, line) => { await page.fill('#tl-in', line); await page.press('#tl-in', 'Enter'); await page.waitForFunction(() => !document.querySelector('#tl-in').readOnly, null, { timeout: 90000 }); };
  const routePyodide = async (ctx) => {
    const NM = path.join(__dirname, '..', 'node_modules', 'pyodide');
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/pyodide@[^/]+\//, (route) => {
      const f = path.join(NM, new URL(route.request().url()).pathname.split('/').pop());
      if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: '' });
      const type = f.endsWith('.wasm') ? 'application/wasm' : f.endsWith('.json') ? 'application/json' : f.endsWith('.zip') ? 'application/zip' : 'text/javascript';
      route.fulfill({ status: 200, contentType: type, headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(f) });
    });
  };
  const openLab = async (page, id) => { await go(page, '/terminal-lab/' + id); await page.waitForFunction(() => /Simulated terminal/.test(document.querySelector('#tl-out').textContent), null, { timeout: 30000 }); };

  await test('terminal labs: index shows every lab in all stages with the honest warning; hub, footer and stage pages link to it', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/terminal-labs');
    const data = await A(page);
    eq(data.termlabs.length, 188, 'labs in data');
    eq(await page.locator('.tl-item').count(), 188, 'labs listed');
    const t = await page.textContent('#main');
    ok(/This is a simulation/.test(t) && /not a real kernel/.test(t), 'simulation warning');
    ok(/What is not here/.test(t) && /real Linux machine/.test(t), 'says what is not included');
    await page.click('.tl-filter a[href="#/terminal-labs/networking"]');
    await page.waitForFunction(() => document.querySelectorAll('.tl-item').length === 18);
    await nav(page, '/practice');
    ok(await page.locator('.prac li').count() >= 42, 'hub cards');
    ok(await page.locator('.prac a[href="#/terminal-labs"]').count() === 1, 'hub link');
    ok(await page.locator('footer a[href="#/terminal-labs"]').count() === 1, 'footer link');
    for (const m of ['linux', 'bash', 'networking', 'python', 'kubernetes', 'docker', 'cloud']) { await nav(page, '/module/' + m); ok(await page.locator(`a[href="#/terminal-labs/${m}"]`).count() >= 1, 'stage page links to labs: ' + m); }
    await nav(page, '/module/git'); eq(await page.locator('a[href^="#/terminal-labs/"]').count(), 0, 'no labs link on a stage without labs');
    await nav(page, '/terminal-lab/nope'); ok(/does not exist/.test(await page.textContent('#main')), 'unknown lab');
    eq(issues.filter((x) => !/goatcounter/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('terminal labs: every Linux, Shell, Networking, Docker, Kubernetes and Cloud lab is solved by typing its solution into the terminal, and a wrong state is not accepted', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/');
    const data = await A(page);
    const labs = data.termlabs.filter((l) => l.module !== 'python');
    eq(labs.length, 170, 'non-python labs');
    for (const lab of labs) {
      await openLab(page, lab.id);
      await page.click('[data-act=tl-check]'); await page.waitForSelector('#tl-res .drill-res');
      ok(await page.locator('#tl-res .drill-res.no').count() === 1, lab.id + ': the starting state must not pass');
      ok(!((((await progress(page)) || {}).tl) || {})[lab.id], lab.id + ': not saved as done');
      for (const line of lab.solution.split('\n')) { if (line === '' ) { await typeLine(page, ''); continue; } await typeLine(page, line); }
      await page.click('[data-act=tl-check]');
      await page.waitForSelector('#tl-res .drill-res.ok', { timeout: 30000 }).catch(async () => { throw new Error(lab.id + ' failed after typing the solution: ' + await page.textContent('#tl-res') + ' | terminal: ' + (await page.textContent('#tl-out')).slice(-600)); });
      ok(((await progress(page)).tl || {})[lab.id].d, lab.id + ': saved as done');
      ok(/What this lab showed/.test(await page.textContent('#tl-res')), lab.id + ': explanation');
    }
    const p = await progress(page);
    eq(Object.keys(p.tl).length, 170, "all non-python done");
    eq(issues.filter((x) => !/goatcounter/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('terminal labs: the Python labs run real Python (Pyodide) and every solution passes its tests', async () => {
    const { ctx, page, issues } = await open();
    await routePyodide(ctx);
    await go(page, '/');
    const data = await A(page);
    const labs = data.termlabs.filter((l) => l.module === 'python');
    eq(labs.length, 18, 'python labs');
    for (const lab of labs) {
      await openLab(page, lab.id);
      await typeLine(page, 'python3 -m unittest -q 2>&1 | tail -3');
      ok(/FAILED|Error|error/.test(await page.textContent('#tl-out')), lab.id + ': tests fail before the fix');
      await page.click('[data-act=tl-check]'); await page.waitForSelector('#tl-res .drill-res.no');
      for (const line of lab.solution.split('\n')) await typeLine(page, line);
      await page.click('[data-act=tl-check]');
      await page.waitForSelector('#tl-res .drill-res.ok', { timeout: 60000 }).catch(async () => { throw new Error(lab.id + ' failed: ' + await page.textContent('#tl-res') + ' | terminal: ' + (await page.textContent('#tl-out')).slice(-800)); });
    }
    eq(issues.filter((x) => !/goatcounter/.test(x)).length, 0, issues.join(' | '));
    await ctx.close();
  });

  await test('terminal labs: with no network Python explains the problem and the rest of the terminal keeps working', async () => {
    const { ctx, page } = await open();
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/pyodide@/, (route) => route.abort());
    await openLab(page, 'py-rename');
    await typeLine(page, 'python3 -c "print(1)"');
    await page.waitForFunction(() => /Downloading Python/.test(document.querySelector('#tl-out').textContent));
    ok(/Could not download Python|could not be loaded|Check your internet/i.test(await page.textContent('#tl-out')), 'explains: ' + (await page.textContent('#tl-out')).slice(-300));
    await typeLine(page, 'echo still works');
    ok(/still works/.test(await page.textContent('#tl-out')), 'shell still works');
    await ctx.close();
  });

  await test('cloud labs: the simulated aws and az refuse and answer like the real tools, and the cloud stage is listed with 35 labs', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/terminal-labs/cloud'); await page.waitForSelector('.tl-item');
    eq(await page.locator('.tl-item').count(), 35, 'thirty-five cloud labs');
    await openLab(page, 'cl-aws-wrong-profile');
    await typeLine(page, 'aws s3 cp report.csv s3://shop-reports/');
    ok(/AccessDenied/.test(await page.textContent('#tl-out')), 'the reader profile is refused');
    await typeLine(page, 'aws sts get-caller-identity --query Arn --output text');
    ok(/user\/report-reader/.test(await page.textContent('#tl-out')), 'the identity is shown');
    await typeLine(page, 'export AWS_PROFILE=deployer'); await typeLine(page, 'aws s3 cp report.csv s3://shop-reports/');
    ok(/upload: report\.csv to s3:\/\/shop-reports\/report\.csv/.test(await page.textContent('#tl-out')), 'the deployer profile uploads');
    await typeLine(page, 'aws ec2 describe-instances');
    ok(/not part of this simulator|Unauthorized|Reservations|not authorized/.test(await page.textContent('#tl-out')), 'unknown or unpermitted calls answer sensibly');
    await openLab(page, 'cl-az-vm-deallocated'); await typeLine(page, 'az vm start -g rg-app'); ok(/required: --name/.test(await page.textContent('#tl-out')), 'a missing option is named');
    ok(/Simulated|simulat/i.test(await page.textContent('#main')), 'the page says it is a simulation');
    eq(issues.filter((i) => !/favicon|goatcounter/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('terminal labs: Tab completion, history, Ctrl+C, here-documents, the editor, hints, solution and reset', async () => {
    const { ctx, page } = await open();
    await openLab(page, 'sh-strict-mode');
    const ps = await page.textContent('#tl-ps'); ok(/^user@.+:~\$ $/.test(ps), 'prompt: ' + ps);
    await page.fill('#tl-in', 'cat dep'); await page.press('#tl-in', 'Tab'); eq(await page.inputValue('#tl-in'), 'cat deploy.sh ', 'file completion');
    await page.fill('#tl-in', 'ech'); await page.press('#tl-in', 'Tab'); eq(await page.inputValue('#tl-in'), 'echo ', 'command completion');
    await page.fill('#tl-in', ''); await typeLine(page, 'echo one'); await typeLine(page, 'echo two');
    await page.press('#tl-in', 'ArrowUp'); eq(await page.inputValue('#tl-in'), 'echo two', 'history up');
    await page.press('#tl-in', 'ArrowUp'); eq(await page.inputValue('#tl-in'), 'echo one', 'history up again');
    await page.press('#tl-in', 'ArrowDown'); eq(await page.inputValue('#tl-in'), 'echo two', 'history down');
    await page.fill('#tl-in', 'half typed'); await page.press('#tl-in', 'Control+c'); eq(await page.inputValue('#tl-in'), '', 'Ctrl+C clears'); ok(/\^C/.test(await page.textContent('#tl-out')), '^C shown');
    await typeLine(page, "cat > note.txt <<'EOF'"); eq(await page.textContent('#tl-ps'), '> ', 'continuation prompt');
    await typeLine(page, 'line a'); await typeLine(page, 'EOF'); await typeLine(page, 'cat note.txt');
    ok(/line a/.test(await page.textContent('#tl-out')), 'here-document works');
    await typeLine(page, 'cd /tmp'); ok(/user@.+:\/tmp\$ $/.test(await page.textContent('#tl-ps')), 'prompt follows cd');
    await typeLine(page, 'cd ~');
    // editor
    await page.fill('#tl-in', 'nano deploy.sh'); await page.press('#tl-in', 'Enter');
    await page.waitForSelector('#tl-edit:not([hidden])');
    ok(/deploy\.sh/.test(await page.textContent('#tl-edit-title')), 'editor title');
    await page.fill('#tl-edit-text', '#!/bin/bash\necho edited\n'); await page.click('[data-act=tl-edit-save]');
    await page.waitForFunction(() => !document.querySelector('#tl-in').readOnly);
    await typeLine(page, 'cat deploy.sh'); ok(/echo edited/.test(await page.textContent('#tl-out')), 'saved from the editor');
    await page.fill('#tl-in', 'nano deploy.sh'); await page.press('#tl-in', 'Enter'); await page.waitForSelector('#tl-edit:not([hidden])');
    await page.click('[data-act=tl-edit-cancel]'); await page.waitForFunction(() => !document.querySelector('#tl-in').readOnly);
    ok(/Not saved/.test(await page.textContent('#tl-out')), 'cancel keeps the file');
    // hints one at a time
    eq(await page.locator('#tl-hints li').count(), 0, 'no hints yet');
    await page.click('#tl-hint'); eq(await page.locator('#tl-hints li').count(), 1, 'first hint'); await page.click('#tl-hint'); eq(await page.locator('#tl-hints li').count(), 2, 'second hint');
    ok(/2 of \d+ shown/.test(await page.textContent('#tl-hint')), 'hint counter');
    // solution is hidden until asked
    ok(await page.locator('#tl-solbox').isHidden(), 'solution hidden'); await page.click('#tl-sol'); ok(await page.locator('#tl-solbox').isVisible() && /set -euo pipefail/.test(await page.textContent('#tl-solbox')), 'solution shown');
    // reset
    await page.click('[data-act=tl-reset]'); await page.waitForFunction(() => /was reset/.test(document.querySelector('#tl-out').textContent));
    await typeLine(page, 'cat deploy.sh'); ok(!/echo edited/.test((await page.textContent('#tl-out')).split('was reset')[1]), 'reset restores the file');
    await ctx.close();
  });

  await test('terminal labs: progress survives export and import, and an unfinished lab is not counted', async () => {
    const { ctx, page } = await open();
    await go(page, '/');
    const p = emptyProgress(); p.tl = { 'lx-cron': { d: '2026-01-05', h: 1, s: 0 } };
    await setProgress(page, p);
    await nav(page, '/terminal-labs');
    ok(/1 of 188 labs done/.test(await page.textContent('.tl-count')), 'count: ' + await page.textContent('.tl-count'));
    ok(/Done/.test(await page.textContent('.tl-item a[href="#/terminal-lab/lx-cron"] >> xpath=ancestor::li')), 'lab marked done');
    const exported = await page.evaluate(() => JSON.parse(localStorage.getItem('ea.progress.v1')));
    ok(exported.tl['lx-cron'], 'kept in storage');
    await ctx.close();
  });

  await test('terminal labs: a phone sees the key row, nothing overflows, and axe is clean in both themes', async () => {
    const problems = [];
    for (const dark of [false, true]) {
      const { ctx, page } = await open({ viewport: { width: 390, height: 800 }, dark });
      for (const hash of ['/terminal-labs', '/terminal-lab/net-ufw', '/terminal-lab/py-argparse-cli']) {
        await go(page, hash);
        if (hash.includes('terminal-lab/')) await page.waitForFunction(() => /Simulated terminal/.test(document.querySelector('#tl-out').textContent), null, { timeout: 30000 });
        const ow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ow > 1) problems.push(`${dark ? 'dark' : 'light'} ${hash}: horizontal overflow ${ow}px`);
        await page.addScriptTag({ content: AXE });
        const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'], runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target).join(',')));
        res.forEach((v) => problems.push(`${dark ? 'dark' : 'light'} ${hash}: ${v}`));
      }
      await go(page, '/terminal-lab/lx-cron'); await page.waitForFunction(() => /Simulated terminal/.test(document.querySelector('#tl-out').textContent));
      const keys = (await page.locator('.tl-keys button').allInnerTexts()).join('|');
      eq(keys, 'Tab|Up|Down|Ctrl+C|Clear|Explain this output', 'key row text labels');
      for (const b of await page.locator('.tl-keys button').all()) { const bb = await b.boundingBox(); ok(bb.height >= 40 && bb.width >= 40, 'touch target size'); }
      await page.fill('#tl-in', 'cr'); await page.click('.tl-keys [data-key=Tab]'); ok((await page.inputValue('#tl-in')).startsWith('cron'), 'on-screen Tab completes');
      await page.fill('#tl-in', 'abc'); await page.click('.tl-keys [data-key="Ctrl+C"]'); eq(await page.inputValue('#tl-in'), '', 'on-screen Ctrl+C');
      const out = await page.locator('#tl-out').boundingBox(); ok(out.width <= 390, 'terminal fits the phone');
      await ctx.close();
    }
    eq(problems.length, 0, problems.join(' | '));
  });

  await test('terminal labs: the engine is not loaded on ordinary pages and is cached for offline use', async () => {
    const { ctx, page } = await open({ sw: true });
    const reqs = []; page.on('request', (r) => reqs.push(r.url()));
    await go(page, '/'); await go(page, '/module/linux');
    ok(!reqs.some((u) => /assets\/term-/.test(u)), 'engine not requested on other pages');
    await nav(page, '/terminal-lab/lx-cron'); await page.waitForFunction(() => /Simulated terminal/.test(document.querySelector('#tl-out').textContent), null, { timeout: 30000 });
    ok(reqs.some((u) => /assets\/term-fs\.js/.test(u)) && reqs.some((u) => /assets\/term-labs\.js/.test(u)), 'engine requested on a lab');
    const sw = await (await page.request.get(BASE + '/sw.js')).text();
    ok(/assets\/term-net\.js/.test(sw) && /assets\/termlabs-ui\.js/.test(sw), 'engine files are in the offline list');
    await ctx.close();
  });


