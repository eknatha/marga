  // ------------------------------------------------------------ round 51: eight new modules
  await test('eight new modules (observability in depth, supply chain, IaC beyond Terraform, leadership, AI infra, Rust, database ops, Python ops): content, paths and pages', async () => {
    const { ctx, page, issues } = await open(); await go(page, '/');
    const NEW = ['obs-deep', 'k8s-supply-chain', 'iac-beyond', 'leadership', 'ai-infra', 'rust-infra', 'db-ops', 'python-ops'];
    const where = { 'obs-deep': ['devops', 'sre', 'platform', 'mlops'], 'k8s-supply-chain': ['devsecops', 'cks'], 'iac-beyond': ['devops', 'cloud', 'devsecops', 'platform'], leadership: ['devops', 'sre', 'platform'], 'ai-infra': ['mlops', 'sre'], 'rust-infra': ['devops', 'sre', 'platform'], 'db-ops': ['devops', 'cloud', 'sre'], 'python-ops': ['devops', 'cloud', 'sre', 'platform'] };
    const mods = Object.fromEntries(data.modules.map((m) => [m.id, m]));
    for (const id of NEW) {
      ok(mods[id], id + ' is registered');
      eq(Object.keys(data.lessons).filter((k) => k.startsWith(id + '/')).length, 6, id + ' has six lessons');
      ok(data.games.filter((g) => g.module === id).length >= 1, id + ' has a game');
      ok(data.widgets.filter((w) => w.module === id).length >= 4, id + ' has four widgets');
      for (const pid of where[id]) {
        const p = data.paths.live.find((x) => x.id === pid), mm = p.modules;
        ok(mm.includes(id), id + ' is on ' + pid);
        for (const r of mods[id].requires) ok(mm.indexOf(r) >= 0 && mm.indexOf(r) < mm.indexOf(id), id + ' needs ' + r + ' first on ' + pid);
      }
    }
    const pl = data.paths.live.find((p) => p.id === 'platform'), ck = data.paths.live.find((p) => p.id === 'cks');
    eq(pl.modules[pl.modules.length - 1], 'platform', 'platform stays last');
    eq(ck.modules[ck.modules.length - 1], 'k8s-exam', 'k8s-exam stays last on CKS');
    await nav(page, '/module/db-ops'); await page.waitForSelector('.jobs li');
    eq(await page.locator('.jobs li').count(), 6, 'module page lists six lessons');
    ok((await page.locator('body').innerText()).includes('Database operations in production'), 'title shown');
    await nav(page, '/lesson/python-ops/working-with-cloud-and-kubernetes-sdks-with-safe-patterns'); await page.waitForSelector('h1');
    ok((await page.locator('body').innerText()).includes('Cloud and Kubernetes SDKs'), 'lesson opens');
    eq(issues.length, 0, issues.slice(0, 3).join(' | '));
    await ctx.close();
  });
