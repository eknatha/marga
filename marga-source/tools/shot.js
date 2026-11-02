const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const errs = [];
  async function page(w, h, theme) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: theme });
    const p = await ctx.newPage();
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    p.on('pageerror', e => errs.push('pageerror ' + e.message));
    return p;
  }
  const base = 'http://localhost:8765/';
  let p = await page(1280, 900, 'light');
  await p.goto(base); await p.waitForTimeout(1200);
  await p.screenshot({ path: out + '/home-light.png', fullPage: true });
  await p.goto(base + '#/module/linux'); await p.waitForTimeout(300);
  await p.screenshot({ path: out + '/module-light.png' });
  await p.goto(base + '#/lesson/linux/filesystem-and-navigation'); await p.waitForTimeout(400);
  await p.screenshot({ path: out + '/lesson-light.png', fullPage: true });
  p = await page(1280, 900, 'dark');
  await p.goto(base + '#/lesson/linux/filesystem-and-navigation'); await p.waitForTimeout(400);
  await p.screenshot({ path: out + '/lesson-dark.png' });
  await p.goto(base); await p.waitForTimeout(1200);
  await p.screenshot({ path: out + '/home-dark.png' });
  p = await page(390, 844, 'light');
  await p.goto(base); await p.waitForTimeout(1200);
  await p.screenshot({ path: out + '/home-mobile.png' });
  await p.goto(base + '#/lesson/linux/filesystem-and-navigation'); await p.waitForTimeout(400);
  await p.screenshot({ path: out + '/lesson-mobile.png' });
  console.log('errors:', JSON.stringify(errs));
  await b.close();
})();
