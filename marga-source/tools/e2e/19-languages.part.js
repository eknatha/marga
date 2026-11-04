  // ------------------------------------------------------------ round 36: languages
  await test('languages: Telugu and Hindi switch the interface, persist across reload, and English restores', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/');
    await page.waitForSelector('#lang-pick');
    eq(await page.$$eval('#lang-pick option', (o) => o.map((x) => x.value).join(',')), 'en,te,hi,ta,kn,ml,bn,es,de,fr,pt', 'eleven languages offered');
    await page.selectOption('#lang-pick', 'te');
    await page.waitForFunction(() => document.documentElement.lang === 'te');
    ok(/[ఀ-౿]/.test(await page.textContent('.topnav')), 'nav is in Telugu');
    ok(/[ఀ-౿]/.test(await page.textContent('.hero-mark')), 'hero mark is Telugu script');
    await page.reload(); await page.waitForSelector('#lang-pick');
    await page.waitForFunction(() => document.documentElement.lang === 'te');
    eq(await page.inputValue('#lang-pick'), 'te', 'choice survives reload');
    await page.selectOption('#lang-pick', 'hi');
    await page.waitForFunction(() => document.documentElement.lang === 'hi');
    ok(/[ऀ-ॿ]/.test(await page.textContent('.topnav')), 'nav is in Hindi');
    await setProgress(page, allDone());
    await go(page, '/lesson/linux/filesystem-and-navigation'); await page.waitForSelector('.prose');
    ok(/[ऀ-ॿ]/.test(await page.textContent('.lesson-head')), 'lesson chrome is Hindi');
    ok(!/[ऀ-ॿ]/.test(await page.textContent('.prose')), 'lesson body stays English');
    await page.selectOption('#lang-pick', 'en');
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    eq(await page.evaluate(() => localStorage.getItem('ea.lang')), null, 'saved choice cleared');
    ok(!/[ऀ-ॿ]/.test(await page.textContent('.topnav')), 'English restored');
    eq(issues.filter((i) => !/favicon/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

  await test('languages: every language shows its own script, the English home has no Telugu word, and nothing overflows', async () => {
    const { ctx, page, issues } = await open();
    await go(page, '/'); await page.waitForSelector('#lang-pick');
    eq(await page.evaluate(() => getComputedStyle(document.querySelector('.hero-mark')).display), 'none', 'no foreign-script word on the English home');
    const ranges = { te: /[\u0C00-\u0C7F]/, hi: /[\u0900-\u097F]/, ta: /[\u0B80-\u0BFF]/, kn: /[\u0C80-\u0CFF]/, ml: /[\u0D00-\u0D7F]/, bn: /[\u0980-\u09FF]/ };
    for (const [code, re] of Object.entries(ranges)) {
      await page.selectOption('#lang-pick', code);
      await page.waitForFunction((c) => document.documentElement.lang === c, code);
      await page.waitForTimeout(300);
      ok(re.test(await page.textContent('.hero2 h1')), code + ': headline is in its own script');
      ok(re.test(await page.textContent('.hero-mark')), code + ': brand word is in its own script');
      ok(await page.evaluate(() => getComputedStyle(document.querySelector('.hero-mark')).display !== 'none'), code + ': brand word shown');
      ok(re.test(await page.textContent('.roles')), code + ': role cards are translated');
      eq(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, code + ': no sideways scroll');
    }
    const latin = { es: 'Aprende', de: 'Lerne', fr: 'Apprenez', pt: 'Aprenda' };
    for (const [code, word] of Object.entries(latin)) {
      await page.selectOption('#lang-pick', code);
      await page.waitForFunction((c) => document.documentElement.lang === c, code);
      await page.waitForTimeout(300);
      ok((await page.textContent('.hero2 h1')).includes(word), code + ': headline is translated');
      eq(await page.evaluate(() => getComputedStyle(document.querySelector('.hero-mark')).display), 'none', code + ': no foreign-script brand word on a Latin-script page');
      ok(/[a-zà-ÿ]/i.test(await page.textContent('.roles')) && !(await page.textContent('.roles')).includes('Choose your role'), code + ': role cards are translated');
      eq(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), true, code + ': no sideways scroll');
    }
    await page.selectOption('#lang-pick', 'en'); await page.waitForFunction(() => document.documentElement.lang === 'en');
    eq(issues.filter((i) => !/favicon|ERR_TUNNEL|Failed to load resource/.test(i)).length, 0, 'no console errors: ' + issues.join(' | ')); await ctx.close();
  });

