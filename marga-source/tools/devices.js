/* Device-profile check. Runs the built site (dist) in Chromium with phone and tablet profiles (screen size, touch, user agent)
   and reports horizontal overflow, script errors and tap targets under 24 px on key pages.
   This is emulation, not a physical phone: it does not test real touch hardware, Safari or Firefox engines. Usage: node tools/devices.js */
const path = require('path');
const { chromium, devices } = require('playwright');
const DIST = path.resolve(__dirname, '..', 'dist', 'index.html');
const PROFILES = ['iPhone SE', 'iPhone 13', 'Pixel 7', 'Galaxy S9+', 'iPad Mini', 'iPad Pro 11', 'Galaxy Tab S4'];
const ROUTES = ['#/', '#/practice', '#/linux', '#/linux/disk-full', '#/terminal-labs/cloud', '#/terminal-lab/cl-aws-wrong-profile', '#/find-my-path', '#/goal/sre', '#/progress', '#/interview', '#/plans', '#/plan/sre-100', '#/cheatsheets', '#/about', '#/skills', '#/roadmap/devops', '#/progress'];
(async () => {
  const browser = await chromium.launch(); let bad = 0, n = 0;
  for (const name of PROFILES) {
    const d = devices[name]; if (!d) { console.log('skip (no such profile)', name); continue; }
    const { defaultBrowserType, ...opts } = d;
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ ...opts, colorScheme: theme }); const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      for (const r of ROUTES) {
        n++; await page.goto('file://' + DIST + r); await page.waitForTimeout(450);
        const res = await page.evaluate(() => {
          const w = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth;
          const small = [...document.querySelectorAll('a[href],button,input,select,textarea,[role=button]')].filter((el) => { const b = el.getBoundingClientRect(), cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && (b.height < 24) && !el.closest('.sr, [hidden]') && !(el.tagName === 'A' && cs.display === 'inline' && el.parentElement && /^(P|LI|TD|SPAN|DIV)$/.test(el.parentElement.tagName)); }).slice(0, 3).map((el) => (el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30));
          return { over: sw - w, small };
        });
        const probs = []; if (res.over > 2) probs.push('overflow ' + res.over + 'px'); if (res.small.length) probs.push('small targets: ' + res.small.join(' | '));
        if (probs.length) { bad++; console.log(`${name} ${theme} ${r}: ${probs.join('; ')}`); }
      }
      if (errs.length) { bad++; console.log(`${name} ${theme}: script errors: ${errs.slice(0, 2).join(' | ')}`); }
      await ctx.close();
    }
  }
  await browser.close(); console.log(`device check: ${n} page loads, ${bad} problems`); process.exit(bad ? 1 : 0);
})();
