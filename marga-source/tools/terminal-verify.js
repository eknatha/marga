/* Proves every terminal lab: the starting state does not pass, and the written solution makes every check pass.
   Python labs run with the real python3 on this machine (the browser uses Pyodide with the same driver). */
'use strict';
const cp = require('child_process');
const T = require('../src/app/term-labs.js');
const labsLib = require('./termlabs.js');
const path = require('path');

function nodePython(spec) {
  const code = T.PY_DRIVER + '\nimport sys\nprint(_marga_run(sys.stdin.read()))\n';
  const r = cp.spawnSync('python3', ['-I', '-c', code], { input: JSON.stringify(spec), encoding: 'utf8', timeout: 20000, maxBuffer: 20e6 });
  if (r.error) throw new Error('python3 failed: ' + r.error.message);
  if (r.status !== 0) throw new Error('python driver error: ' + r.stderr.slice(0, 300));
  return Promise.resolve(JSON.parse(r.stdout));
}
T.nodePython = nodePython;
async function verifyLab(lab) {
  const problems = [];
  const s = T.newLab(lab, { python: nodePython });
  const start = await T.evalChecks(s, lab.checks);
  const startPass = start.filter(x => x.ok).length;
  if (startPass === start.length) problems.push('starting state already passes every check');
  const bad = start.filter(x => x.detail && /unknown check|Cannot|undefined|is not/.test(x.detail));
  bad.forEach(b => problems.push('check error at start: ' + b.label + ': ' + b.detail));
  /* the solution: run it as a series of lines the way a learner would, as the lab user */
  const res = await s.exec1(lab.solution);
  const end = await T.evalChecks(s, lab.checks);
  end.filter(x => !x.ok).forEach(x => problems.push('after the solution this check still fails: ' + x.label + (x.detail ? ' (' + x.detail + ')' : '') + '\n      solution output: ' + res.text.slice(0, 400).replace(/\n/g, '\n      ')));
  return { problems, startPass, total: start.length, solCode: res.code };
}
(async () => {
  const labs = labsLib.load(path.join(__dirname, '..', 'src', 'termlabs'));
  const only = process.env.ONLY; let bad = 0, n = 0;
  for (const lab of labs) {
    if (only && lab.id.indexOf(only) < 0) continue;
    n++;
    let r;
    try { r = await verifyLab(lab); } catch (e) { r = { problems: ['crash: ' + (e.stack || e)], startPass: 0, total: 0 }; }
    lab.errors.forEach(e => r.problems.push(e));
    if (r.problems.length) { bad++; console.log('FAIL ' + lab.id + '\n  - ' + r.problems.join('\n  - ')); }
    else console.log('ok   ' + lab.id + '  (start ' + r.startPass + '/' + r.total + ' checks pass, solution ' + r.total + '/' + r.total + ')');
  }
  console.log(`terminal labs: ${n - bad} verified, ${bad} failed`);
  process.exit(bad ? 1 : 0);
})();
