/* Differential test: run the same shell snippets in real bash (GNU coreutils) and in the MARGA terminal engine, and compare stdout and exit codes. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const T = require('../src/app/term-awk.js');
try { require('../src/app/term-jq.js'); } catch (e) { if (e.code !== 'MODULE_NOT_FOUND') throw e; }
const FIX = {
  'names.txt': 'alice\nbob\ncarol\ndave\nalice\nbob\nalice\n',
  'nums.txt': '10\n9\n100\n2\n33\n2\n',
  'log.txt': '2026-01-05 10:00:01 INFO api started\n2026-01-05 10:00:02 ERROR db timeout after 30s\n2026-01-05 10:00:03 WARN cache miss ratio 0.42\n2026-01-05 10:01:00 ERROR db timeout after 30s\n2026-01-05 10:02:10 INFO api request /health 200\n2026-01-05 10:02:11 ERROR api request /pay 500\n',
  'data.csv': 'name,team,score\nann,blue,10\nbo,red,7\ncy,blue,12\ndi,red,3\n',
  'words.txt': 'The quick brown fox\njumps over the lazy dog\nTHE END\n\nlast  line   here\n',
  'cfg.ini': '[main]\nhost = example.org\nport=8080\n# comment\nuser = root\n',
  'json.json': '{"items":[{"name":"web","ok":true,"n":3},{"name":"db","ok":false,"n":1},{"name":"cache","ok":false,"n":7}],"env":"prod"}\n'
};
const CASES = fs.readFileSync(path.join(__dirname, 'term-diff-cases.txt'), 'utf8').split('\n').filter(Boolean).map(l => l.replace(/@@NL@@/g, '\n'));
function real(cmd, dir) {
  const r = cp.spawnSync('bash', ['-c', cmd], { cwd: dir, env: { PATH: process.env.PATH, LC_ALL: 'C', HOME: dir }, encoding: 'utf8', timeout: 10000 });
  return { out: r.stdout, code: r.status };
}
(async () => {
  let pass = 0, fail = 0; const only = process.env.ONLY;
  for (const c of CASES) {
    if (only && c.indexOf(only) < 0) continue;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'td-'));
    for (const k in FIX) fs.writeFileSync(path.join(dir, k), FIX[k]);
    const exp = real(c, dir);
    const s = new T.Session({ files: Object.keys(FIX).map(k => ({ path: '/home/user/' + k, data: FIX[k], o: 'user' })) });
    let got;
    try { got = await s.exec1(c); } catch (e) { got = { out: 'CRASH ' + (e.stack || e), code: -1 }; }
    fs.rmSync(dir, { recursive: true, force: true });
    if (got.out === exp.out && got.code === exp.code) pass++;
    else { fail++; console.log('FAIL: ' + c + '\n  real  [' + exp.code + ']: ' + JSON.stringify(exp.out).slice(0, 300) + '\n  engine[' + got.code + ']: ' + JSON.stringify(got.out).slice(0, 300) + (got.err ? '\n  stderr: ' + got.err.slice(0, 200) : '')); }
  }
  console.log(`differential: ${pass} passed, ${fail} failed, of ${pass + fail}`);
  process.exit(fail ? 1 : 0);
})();
