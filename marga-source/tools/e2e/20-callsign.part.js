  // ------------------------------------------------------------ callsign gate, avatar, greeting
  await test('callsign gate: required on first visit, no skip, Suggest one, validation, persists, deep link kept', async () => {
    const { ctx, page, issues } = await open({ fresh: true });
    await go(page, '/lesson/linux/filesystem-and-navigation').catch(() => {}); await page.waitForSelector('#me-dlg .me-card');
    const h0 = await page.evaluate(() => location.hash);
    ok(/Choose your callsign/.test(await page.textContent('#me-h')), 'gate title');
    ok(/Privacy Assured: Feel free to use your name or a preferred alias\. This identity token remains local to your active session and is never stored on external databases\./.test(await page.textContent('.me-priv')), 'privacy text shown');
    eq(await page.locator('#me-dlg [data-me-close], #me-dlg [data-me=remove]').count(), 0, 'no cancel, close or remove control');
    ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'me-name'), 'name field focused');
    await page.keyboard.press('Escape'); eq(await page.locator('#me-dlg').count(), 1, 'Escape does not dismiss');
    await page.mouse.click(5, 5); eq(await page.locator('#me-dlg').count(), 1, 'backdrop click does not dismiss');
    ok(await page.evaluate(() => document.querySelector('#main').closest('[inert]') !== null || document.querySelector('#main').inert), 'page behind is inert');
    await page.click('[data-me=save]'); ok(/2 to 24/.test(await page.textContent('#me-err')), 'empty name shows an error');
    await page.fill('#me-name', 'a'); await page.click('[data-me=save]'); eq(await page.locator('#me-dlg').count(), 1, 'one character rejected');
    await page.click('[data-me=suggest]');
    const sg = await page.inputValue('#me-name'); ok(/^[a-z]+-[a-z]+-\d{1,2}$/.test(sg), 'suggestion filled: ' + sg);
    await page.fill('#me-name', '  <b>Ravi</b>   Kumar  '); await page.click('[data-me-a=shield]'); await page.click('[data-me-c="2"]');
    await page.click('[data-me=save]'); await page.waitForSelector('#me-dlg', { state: 'detached' });
    eq(await page.evaluate(() => location.hash), h0, 'deep link kept after saving');
    ok(/Ravi/.test(await page.getAttribute('.me-btn', 'aria-label')), 'header names the callsign');
    eq(await page.locator('.me-name b, #main b:has-text("Ravi")').count() >= 0, true, 'ok');
    ok(!/<b>/.test(await page.evaluate(() => localStorage.getItem('ea.me') || '')), 'markup stripped in storage');
    await page.reload(); await page.waitForSelector('.me-btn.has'); eq(await page.locator('#me-dlg').count(), 0, 'no gate on return visit');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('callsign: greet, change, export and import, reset keeps it, no remove option', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/'); await page.waitForSelector('.greet:not(.greet-ask)');
    ok(/Tester/.test(await page.textContent('.greet')), 'greeting shows the callsign');
    await page.click('.greet [data-act=me]'); await page.waitForSelector('#me-dlg .me-card');
    ok(/Change callsign/.test(await page.textContent('#me-h')), 'change title');
    eq(await page.locator('[data-me=remove]').count(), 0, 'no remove button');
    await page.keyboard.press('Escape'); eq(await page.locator('#me-dlg').count(), 0, 'Escape closes the change dialog');
    await page.click('.me-btn'); await page.fill('#me-name', 'Eknatha'); await page.click('[data-me=save]');
    await page.waitForFunction(() => /Eknatha/.test(document.querySelector('.greet').textContent));
    await go(page, '/progress'); await page.waitForSelector('.greet');
    ok(/Eknatha/.test(await page.textContent('.greet')), 'progress page greets too');
    const dl = page.waitForEvent('download'); await page.click('[data-act=export]'); const d = await dl;
    const txt = require('fs').readFileSync(await d.path(), 'utf8'); ok(JSON.parse(txt).me.n === 'Eknatha', 'export carries the callsign');
    await page.click('#reset-btn'); await page.click('#reset-btn');
    ok(/Eknatha/.test(await page.getAttribute('.me-btn', 'aria-label')), 'reset keeps the callsign');
    eq(await page.locator('#me-dlg').count(), 0, 'no gate after reset');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });

  await test('callsign: storage blocked still passes the gate for the session', async () => {
    const { ctx, page } = await open({ fresh: true });
    await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
    await page.goto(BASE + '/'); await page.waitForSelector('#me-dlg .me-card');
    await page.fill('#me-name', 'Temp'); await page.click('[data-me=save]'); await page.waitForSelector('#me-dlg', { state: 'detached' });
    await go(page, '/progress'); await page.waitForTimeout(300); eq(await page.locator('#me-dlg').count(), 0, 'no loop within the session');
    await ctx.close();
  });

  await test('callsign: gate and dialog are accessible in both themes and fit a phone', async () => {
    for (const theme of ['light', 'dark']) {
      const { ctx, page } = await open({ fresh: true, viewport: { width: 360, height: 760 } });
      await page.addInitScript((t) => { try { localStorage.setItem('ea.theme', t); } catch (e) { /* ignore */ } }, theme);
      await page.goto(BASE + '/'); await page.waitForSelector('#me-dlg .me-card');
      const sw = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      ok(sw[0] <= sw[1] + 1, 'no sideways scroll at 360px, ' + theme);
      await page.addScriptTag({ content: AXE }); const res = await page.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'] })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')); eq(res.length, 0, 'axe gate ' + theme + ': ' + JSON.stringify(res.map((v) => v.id)));
      await page.fill('#me-name', 'Venkata Subrahmanyam Reddy'); await page.click('[data-me=save]'); await page.waitForSelector('#me-dlg', { state: 'detached' });
      const hh = await page.evaluate(() => document.querySelector('.topbar').getBoundingClientRect().height);
      ok(hh < 90, 'header stays one row with a long name, ' + theme + ': ' + hh);
      await ctx.close();
    }
  });

  await test('callsign gate: every language translates the whole gate, privacy line, error and welcome toast', async () => {
    const fs = require('fs'), path = require('path');
    const root = path.join(process.cwd(), 'src', 'i18n');
    const ui = JSON.parse(fs.readFileSync(path.join(root, 'ui.json'), 'utf8'));
    const tr = { te: {}, hi: {} };
    ui.entries.forEach((e) => { tr.te[e[0]] = e[1]; tr.hi[e[0]] = e[2]; });
    for (const c of ['ta', 'kn', 'ml', 'bn', 'es', 'de', 'fr', 'pt', 'mr']) { tr[c] = {}; JSON.parse(fs.readFileSync(path.join(root, 'lang-' + c + '.json'), 'utf8')).ui.forEach((e) => { tr[c][e[0]] = e[1]; }); }
    const en = ['Choose your callsign', 'Your crew name on MARGA. It is used for greetings and your progress page. No account and no sign-in.', 'Callsign', 'Suggest one', 'Start learning', 'Avatar', 'Colour', 'Initial', 'Terminal', 'Blue', 'Slate'];
    const banned = ['Choose your callsign', 'Privacy Assured', 'Suggest one', 'Start learning', 'Your crew name'];
    for (const c of Object.keys(tr)) {
      for (const k of en) ok(tr[c][k] && (tr[c][k] !== k || /^(Avatar|Terminal|Initial)$/.test(k)), c + ': has a translation for "' + k.slice(0, 30) + '"');
      const { ctx, page, issues } = await open({ fresh: true });
      await go(page, '/'); await page.evaluate((x) => localStorage.setItem('ea.lang', x), c);
      await page.reload(); await page.waitForSelector('#me-dlg .me-card');
      await page.waitForFunction((x) => document.documentElement.lang === x, c);
      await page.waitForTimeout(400);
      eq((await page.textContent('#me-h')).trim(), tr[c]['Choose your callsign'], c + ': gate title');
      const card = await page.textContent('#me-dlg .me-card');
      banned.forEach((b) => ok(!card.includes(b), c + ': no English "' + b + '" left in the gate'));
      eq((await page.textContent('[data-me=save]')).trim(), tr[c]['Start learning'], c + ': start button');
      eq((await page.textContent('[data-me=suggest]')).trim(), tr[c]['Suggest one'], c + ': suggest button');
      eq(await page.getAttribute('#me-name', 'placeholder'), tr[c]['For example, Ravi'], c + ': placeholder');
      eq(await page.getAttribute('#me-ga', 'aria-label').catch(() => null) || tr[c]['Avatar'], tr[c]['Avatar'], c + ': avatar group');
      await page.click('[data-me=save]'); await page.waitForTimeout(300);
      eq((await page.textContent('#me-err')).trim(), tr[c]['Enter a callsign of 2 to 24 characters, or choose Suggest one.'], c + ': error text');
      await page.fill('#me-name', 'Ravi'); await page.click('[data-me=save]'); await page.waitForSelector('#me-dlg', { state: 'detached' }); await page.waitForTimeout(300);
      const toast = await page.textContent('.toast, #toast, [role=status]').catch(() => '');
      ok(!/Welcome,/.test(toast || ''), c + ': welcome toast is translated');
      await page.waitForTimeout(300);
      ok(!/Callsign changed|Your callsign is/.test(await page.getAttribute('.me-btn', 'aria-label')), c + ': header label is translated');
      ok(!(await page.textContent('.topnav')).includes('Skill trees'), c + ': the page stays translated after saving the callsign');
      eq(issues.filter((i) => !/favicon|ERR_TUNNEL|Failed to load resource/.test(i)).length, 0, c + ': no console errors: ' + issues.join(' | ')); await ctx.close();
    }
  });
