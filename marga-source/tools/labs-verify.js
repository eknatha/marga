/* Proves that each exercise starts out failing and that its own solution passes, using real Python, Go, SQLite and the lab engine.
   Usage: node tools/labs-verify.js [python|go|hcl|sql|yaml] [--fill]   (--fill writes Go expected output into src/labs/go.md) */
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const { load } = require('./labs');
const Lab = require('../src/app/lab.js');
const labs = load(path.resolve(__dirname, '../src/labs'));
const only = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null, fill = process.argv.includes('--fill');
let bad = 0, n = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'labs-'));
function py(code, tests) {
  const f = path.join(tmp, 't.py'); fs.writeFileSync(f, code + '\n' + tests + '\n');
  return cp.spawnSync('python3', ['-I', f], { encoding: 'utf8', timeout: 20000 });
}
if (!only || only === 'python') {
  const seen = new Set();
  for (const x of labs.python) {
    n++; if (seen.has(x.id)) fail('python duplicate id ' + x.id); seen.add(x.id);
    for (const k of ['id', 'task', 'hint', 'start', 'sol', 'tests']) if (!x[k]) fail(`python ${x.id || x.title}: missing ${k}`);
    const good = py(x.sol, x.tests); if (good.status !== 0) fail(`python ${x.id}: solution fails: ${good.stderr.split('\n').slice(-3).join(' ')}`);
    const start = py(x.start, x.tests); if (start.status === 0) fail(`python ${x.id}: starter already passes`);
  }
}
if (!only || only === 'go') {
  const seen = new Set();
  for (const x of labs.go) {
    n++; if (seen.has(x.id)) fail('go duplicate id ' + x.id); seen.add(x.id);
    for (const k of ['id', 'task', 'hint', 'start', 'sol']) if (!x[k]) fail(`go ${x.id || x.title}: missing ${k}`);
    const run = (code) => { const d = path.join(tmp, 'g' + n); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'main.go'), code); fs.writeFileSync(path.join(d, 'go.mod'), 'module x\ngo 1.21\n'); return cp.spawnSync('go', ['run', '.'], { cwd: d, encoding: 'utf8', timeout: 60000, env: { ...process.env, GOFLAGS: '-mod=mod', GOCACHE: path.join(tmp, 'gocache') } }); };
    const g = run(x.sol); if (g.status !== 0) { fail(`go ${x.id}: solution does not run: ${(g.stderr || '').split('\n').slice(0, 4).join(' ')}`); continue; }
    if (fill) x.expect = g.stdout; else if ((x.expect || '').trim() !== g.stdout.trim()) fail(`go ${x.id}: expected output differs from the real output`);
    const s = run(x.start); if (s.status === 0 && s.stdout.trim() === g.stdout.trim()) fail(`go ${x.id}: starter already gives the right output`);
    if (!/^package main/m.test(x.sol) || !/func main\(/.test(x.sol)) fail(`go ${x.id}: needs package main and func main`);
  }
  if (fill) {
    const f = path.resolve(__dirname, '../src/labs/go.md'); let out = '';
    for (const x of labs.go) {
      out += `## ${x.title}\nid: ${x.id}\ntask: ${x.task}\nhint: ${x.hint}\n@@ start\n${x.start}@@ sol\n${x.sol}@@ expect\n${x.expect}\n`;
    }
    fs.writeFileSync(f, out); console.log('filled expected output for ' + labs.go.length + ' Go exercises');
  }
}
if (!only || only === 'hcl' || only === 'yaml') {
  const yaml = require('js-yaml');
  for (const lang of ['hcl', 'yaml']) {
    if (only && only !== lang) continue;
    const seen = new Set();
    for (const x of labs[lang]) {
      n++; if (seen.has(x.id)) fail(lang + ' duplicate id ' + x.id); seen.add(x.id);
      for (const k of ['id', 'task', 'hint', 'start', 'sol', 'checks']) if (!x[k]) fail(`${lang} ${x.id || x.title}: missing ${k}`);
      const docs = (t) => lang === 'hcl' ? [Lab.hclObject(t)] : yaml.loadAll(t, { schema: yaml.YAML11_SCHEMA });
      try { const f = Lab.runChecks(docs(x.sol), x.checks, x.sol, lang === 'hcl'); if (f.length) fail(`${lang} ${x.id}: solution fails: ${f.join('; ')}`); } catch (e) { fail(`${lang} ${x.id}: solution does not parse: ${e.message}`); }
      try { const f = Lab.runChecks(docs(x.start), x.checks, x.start, lang === 'hcl'); if (!f.length) fail(`${lang} ${x.id}: starter already passes`); } catch (e) { /* a starter may be unparsable on purpose */ }
    }
  }
}
if (!only || only === 'sql') {
  const initSqlJs = require('sql.js');
  (async () => {
    const SQL = await initSqlJs();
    const run = (db, q) => { const r = db.exec(q); return r.length ? r[r.length - 1] : { columns: [], values: [] }; };
    const seen = new Set();
    for (const x of labs.sql) {
      n++; if (seen.has(x.id)) fail('sql duplicate id ' + x.id); seen.add(x.id);
      for (const k of ['id', 'task', 'hint', 'start', 'sol']) if (!x[k]) fail(`sql ${x.id || x.title}: missing ${k}`);
      const db = new SQL.Database(); db.run(labs.sqlSchema);
      try { const r = run(db, x.sol); if (!r.values.length) fail(`sql ${x.id}: solution returns no rows`); } catch (e) { fail(`sql ${x.id}: solution error ${e.message}`); }
      try { const a = run(db, x.start), b = run(db, x.sol); if (JSON.stringify(a) === JSON.stringify(b)) fail(`sql ${x.id}: starter already matches`); } catch (e) { /* starter may be invalid */ }
    }
    done();
  })();
} else done();
function done() { console.log(`${n} exercises checked, ${bad} problem(s)`); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(bad ? 1 : 0); }
