/* MARGA practice labs: Go, Terraform (HCL), SQL for SREs and the YAML exercises.
   Exercise data comes from window.ACADEMY.labs (built from src/labs). Registered by app.js through the same small API as the other extras. */
window.MargaLabs = function (A) {
'use strict';
var D = A.D, view = A.view, $ = A.$, $$ = A.$$, e = A.e, plural = A.plural, LABS = D.labs || {};
var Lab = window.MargaLab;
function S() { return A.state(); }
function bag(name) { var s = S(); if (!s[name] || typeof s[name] !== 'object' || Array.isArray(s[name])) s[name] = {}; return s[name]; }
function head(title, lede) { return '<section class="page-head wrap"><h1>' + e(title) + '</h1><p class="lede">' + lede + '</p></section>'; }
function solvedKey(lang, id) { return lang + ':' + id; }
function isSolved(lang, id) { return !!bag('lab')[solvedKey(lang, id)]; }
function countSolved(lang) { var m = bag('lab'), n = 0; (LABS[lang] || []).forEach(function (x) { if (m[solvedKey(lang, x.id)]) n++; }); return n; }
function markSolved(lang, id) {
  var m = bag('lab'), k = solvedKey(lang, id); if (m[k]) return false;
  m[k] = 1; A.markActive(); A.save(); A.renderChrome(); A.setNav(view.nav); return true;
}
function find(lang, id) { var l = LABS[lang] || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
function options(lang, free) {
  return '<option value="free">' + e(free) + '</option>' + (LABS[lang] || []).map(function (x, i) { return '<option value="' + e(x.id) + '">' + (isSolved(lang, x.id) ? 'Solved: ' : '') + (i + 1) + '. ' + e(x.title) + '</option>'; }).join('');
}
function shell(p) {
  /* p: lang, free label, editor label, rows, extraButtons, intro */
  var l = p.lang, n = (LABS[l] || []).length;
  return '<div class="wrap narrow lab" data-lang="' + l + '">' + (p.pre || '') +
    '<label class="field"><span>Exercise</span><select id="lab-ex">' + options(l, p.free) + '</select></label>' +
    '<p class="small" id="lab-count">' + countSolved(l) + ' of ' + n + ' exercises solved</p>' +
    '<p id="lab-task" class="py-task"></p><details id="lab-hintbox" hidden><summary>Hint</summary><p id="lab-hint"></p></details>' +
    '<label class="field"><span>' + e(p.editor) + '</span><textarea id="lab-code" class="editor" rows="' + (p.rows || 14) + '" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea></label>' +
    '<div class="actions">' + (p.buttons || '') + '<button type="button" class="btn btn-quiet" data-act="lab-reset">Reset code</button><button type="button" class="btn btn-quiet" id="lab-solbtn" data-act="lab-sol" aria-expanded="false" hidden>Show a solution</button></div>' +
    '<div id="lab-res" role="status" aria-live="polite"></div><div id="lab-out"></div><pre class="evidence" id="lab-sol" hidden aria-label="A solution"><code></code></pre>' +
    (p.post || '') + '</div>';
}
var cur = { lang: '', free: '' };
function show(id) {
  var l = cur.lang, x = id === 'free' ? null : find(l, id);
  $('#lab-task').textContent = x ? x.task : cur.freeTask;
  $('#lab-hintbox').hidden = !x; if (x) { $('#lab-hint').textContent = x.hint; $('#lab-hintbox').open = false; }
  $('#lab-code').value = x ? x.start : cur.free;
  $('#lab-solbtn').hidden = !x; $('#lab-sol').hidden = true; $('#lab-solbtn').setAttribute('aria-expanded', 'false');
  $('#lab-res').innerHTML = ''; $('#lab-out').innerHTML = '';
  var chk = $('#lab-check'); if (chk) chk.hidden = !x && !!$('#lab-run');
  if (cur.onShow) cur.onShow(x);
}
function refreshChrome() {
  var l = cur.lang, sel = $('#lab-ex'), v = sel.value;
  sel.innerHTML = options(l, cur.freeLabel); sel.value = v;
  $('#lab-count').textContent = countSolved(l) + ' of ' + (LABS[l] || []).length + ' exercises solved';
}
function ok(msg) { return '<div class="drill-res ok"><p><strong>' + msg + '</strong></p></div>'; }
function no(msg, list) { return '<div class="drill-res no"><p><strong>Not yet.</strong> ' + msg + '</p>' + (list && list.length ? '<ul>' + list.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>' : '') + '</div>'; }
function solved(l, x, extra) {
  var first = markSolved(l, x.id); refreshChrome();
  return ok('All checks passed.' + (extra || '') + ' ' + plural(countSolved(l), 'exercise') + ' solved.');
}
document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'lab-ex') show(ev.target.value); });
A.onAct('lab-reset', function () { show($('#lab-ex').value); });
A.onAct('lab-sol', function () {
  var x = find(cur.lang, $('#lab-ex').value), box = $('#lab-sol'); if (!x) return;
  var open = box.hidden; box.hidden = !open; box.querySelector('code').textContent = x.sol; $('#lab-solbtn').setAttribute('aria-expanded', String(open));
});
document.addEventListener('keydown', function (ev) {
  if (ev.target && ev.target.id === 'lab-code' && (ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); var b = $('#lab-run') || $('#lab-check'); if (b && !b.disabled) b.click(); }
});
function setup(lang, o) { cur = { lang: lang, free: o.free, freeTask: o.freeTask, freeLabel: o.freeLabel, onShow: o.onShow }; }

/* ---------------------------------------------------------------- Go (public Go Playground, only when you press Run) */
var GO_URLS = ['https://go.dev/_/compile', 'https://play.golang.org/compile'];
function goCompile(code) {
  function tryUrl(i) {
    var body = new URLSearchParams(); body.set('version', '2'); body.set('body', code); body.set('withVet', 'false');
    return fetch(GO_URLS[i], { method: 'POST', body: body, headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' } })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .catch(function (err) { if (i + 1 < GO_URLS.length) return tryUrl(i + 1); throw err; });
  }
  return tryUrl(0);
}
function goText(r) { return (r.Events || []).map(function (ev) { return ev.Message; }).join(''); }
function goView() {
  view.title = 'Go playground | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = head('Go playground', 'Fifty Go exercises for operations work: errors, goroutines, JSON, networking and testing. Press Run to compile and run your code on the public Go Playground at go.dev. Your code is sent there when you run it, and nowhere else.') +
    shell({ lang: 'go', free: 'Free play (no check)', editor: 'Go code', rows: 18,
      buttons: '<button type="button" class="btn btn-primary" id="lab-run" data-act="go-run">Run (Ctrl+Enter)</button><button type="button" class="btn btn-quiet" id="lab-check" data-act="go-check">Check my answer</button><button type="button" class="btn btn-quiet" data-act="go-copy">Copy code</button>',
      post: '<p class="small">Programs run for at most a few seconds with no network access. The Go Playground is run by the Go team; if it is not reachable you will see a message, and you can copy the code and run it with <code>go run</code> on your own machine. Check compares the printed output with the expected output of the exercise.</p>' });
  view.after = function () {
    setup('go', { free: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hello from Go")\n}\n', freeTask: 'Free play: write any Go program and press Run.', freeLabel: 'Free play (no check)' });
    show('free');
  };
}
function goRun(check) {
  var code = $('#lab-code').value, x = find('go', $('#lab-ex').value), run = $('#lab-run'), chk = $('#lab-check');
  run.disabled = true; chk.disabled = true; $('#lab-res').innerHTML = '<p class="small">Running on the Go Playground...</p>';
  goCompile(code).then(function (r) {
    run.disabled = false; chk.disabled = false;
    var out = goText(r), errs = r.Errors || '';
    $('#lab-out').innerHTML = '<pre class="evidence" tabindex="0" aria-label="Program output"><code>' + e((errs ? errs + '\n' : '') + out || '(no output)') + '</code></pre>';
    if (errs) { $('#lab-res').innerHTML = no('The program did not compile or run. Read the first error line.'); return; }
    if (!check) { $('#lab-res').innerHTML = ''; return; }
    if (x && out.trim() === (x.expect || '').trim()) $('#lab-res').innerHTML = solved('go', x);
    else $('#lab-res').innerHTML = no('The output is different from what the exercise expects.', ['Expected output:\n' + (x ? x.expect.trim() : '')]);
  }, function () {
    run.disabled = false; chk.disabled = false;
    $('#lab-res').innerHTML = no('Could not reach the Go Playground. Check your internet connection, or copy the code and run it with go run on your computer.');
  });
}
A.onAct('go-run', function () { goRun(false); });
A.onAct('go-check', function () { goRun(true); });
A.onAct('go-copy', function () { var t = $('#lab-code').value; if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { A.toast('Code copied.'); }, function () { A.toast('Copy failed. Select the text and copy it.'); }); });
A.addRoute(/^\/playground\/go$/, goView);

/* ---------------------------------------------------------------- Terraform (HCL) */
function hclEval(text, x) {
  var obj, lint = [];
  try { obj = Lab.hclObject(text); } catch (err) { return { error: err }; }
  lint = Lab.hclLint(text, obj);
  var fails = x ? Lab.runChecks([obj], x.checks, text, true) : [];
  return { obj: obj, lint: lint, fails: fails };
}
function hclView() {
  view.title = 'Terraform (HCL) playground | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = head('Terraform (HCL) playground', 'Fifty exercises in Terraform configuration language. Write the HCL and press Check. The page reads your file, finds syntax mistakes with a line number, and checks that the right blocks and arguments are there. It does not run Terraform or talk to any cloud, and nothing leaves your browser.') +
    shell({ lang: 'hcl', free: 'Free play (syntax and risk check)', editor: 'Terraform (HCL) code', rows: 16,
      buttons: '<button type="button" class="btn btn-primary" id="lab-check" data-act="hcl-check">Check my answer (Ctrl+Enter)</button>',
      post: '<div id="lab-lint"></div><p class="small">This is a structure check, not <code>terraform validate</code>. It does not know every provider argument, so a file can pass here and still fail with real Terraform. Use it to practise the language.</p>' });
  view.after = function () {
    setup('hcl', { free: 'resource "aws_s3_bucket" "logs" {\n  bucket = "acme-logs"\n}\n', freeTask: 'Free play: paste or write HCL. The page reports syntax errors and a few common risks, such as keys in code or a port opened to the whole internet.', freeLabel: 'Free play (syntax and risk check)', onShow: function () { $('#lab-lint').innerHTML = ''; hclLive(); } });
    show('free'); $('#lab-code').addEventListener('input', hclLive);
  };
}
function hclErrBox(err) { return '<div class="drill-res no"><p><strong>Syntax problem.</strong> Line ' + (err.line || '?') + ': ' + e(err.message) + '</p></div>'; }
function hclLive() {
  var code = $('#lab-code'); if (!code) return;
  var r = hclEval(code.value, null), box = $('#lab-lint');
  if (r.error) { box.innerHTML = hclErrBox(r.error); return; }
  box.innerHTML = r.lint.length ? '<ul class="yp-find">' + r.lint.map(function (f) { return '<li class="f-' + f.level + '"><b>' + (f.level === 'error' ? 'Error' : f.level === 'warn' ? 'Warning' : 'Tip') + '</b> ' + e(f.msg) + '</li>'; }).join('') + '</ul>' : '';
}
A.onAct('hcl-check', function () {
  var x = find('hcl', $('#lab-ex').value), r = hclEval($('#lab-code').value, x);
  if (r.error) { $('#lab-res').innerHTML = hclErrBox(r.error); return; }
  if (!x) { $('#lab-res').innerHTML = ok('The file reads as valid HCL.') ; hclLive(); return; }
  $('#lab-res').innerHTML = r.fails.length ? no(plural(r.fails.length, 'thing') + ' still to do:', r.fails) : solved('hcl', x);
});
A.addRoute(/^\/playground\/hcl$/, hclView);

/* ---------------------------------------------------------------- SQL for SREs (SQLite in your browser, no network) */
var SQLJS = { promise: null, SQL: null };
function sqlLoad() {
  if (SQLJS.SQL) return Promise.resolve(SQLJS.SQL);
  if (SQLJS.promise) return SQLJS.promise;
  SQLJS.promise = new Promise(function (res, rej) {
    function boot() { window.initSqlJs({ locateFile: function () { return 'assets/sql-wasm.wasm'; } }).then(function (SQL) { SQLJS.SQL = SQL; res(SQL); }, rej); }
    if (window.initSqlJs) return boot();
    var s = document.createElement('script'); s.src = 'assets/sql-wasm.js'; s.async = true; s.onload = boot;
    s.onerror = function () { rej(new Error('Could not load the SQL engine.')); }; document.head.appendChild(s);
  });
  SQLJS.promise.catch(function () { SQLJS.promise = null; });
  return SQLJS.promise;
}
function sqlRun(SQL, q) {
  var db = new SQL.Database(); db.run(LABS.sqlSchema || '');
  try { var r = db.exec(q); return r.length ? r[r.length - 1] : { columns: [], values: [] }; } finally { db.close(); }
}
function sqlTable(r) {
  if (!r.columns.length) return '<p class="small">The statement ran and returned no rows.</p>';
  var rows = r.values.slice(0, 200);
  return '<div class="table-wrap"><table><thead><tr>' + r.columns.map(function (c) { return '<th>' + e(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
    rows.map(function (v) { return '<tr>' + v.map(function (c) { return '<td>' + (c === null ? '<em>NULL</em>' : e(String(c))) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
    '<p class="small">' + plural(r.values.length, 'row') + (r.values.length > 200 ? ', first 200 shown' : '') + '.</p>';
}
function sqlNorm(v) { return typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v; }
function sqlSame(a, b, ordered) {
  if (a.columns.length !== b.columns.length || a.values.length !== b.values.length) return false;
  var x = a.values.map(function (r) { return JSON.stringify(r.map(sqlNorm)); }), y = b.values.map(function (r) { return JSON.stringify(r.map(sqlNorm)); });
  if (!ordered) { x.sort(); y.sort(); }
  return x.join('|') === y.join('|');
}
function sqlSchemaHtml() {
  var out = [], re = /CREATE TABLE (\w+) \(([^;]*?)\);/g, m, src = (LABS.sqlSchema || '').replace(/\n/g, ' ');
  while ((m = re.exec(src))) { var cols = m[2].split(/,\s*(?![^()]*\))/).map(function (c) { return c.trim().split(/\s+/)[0]; }).filter(function (c) { return !/^(PRIMARY|FOREIGN)$/i.test(c); }); out.push('<li><strong>' + e(m[1]) + '</strong> (' + e(cols.join(', ')) + ')</li>'); }
  return '<details class="note-panel"><summary>Tables you can query</summary><ul>' + out.join('') + '</ul><p class="small">Dates are text like 2026-03-01 09:10:00. Use julianday(a) - julianday(b) for the difference in days. The data is a small made-up example, and it is reset every time you run a query.</p></details>';
}
function sqlView() {
  view.title = 'SQL for SREs | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = head('SQL for SREs', 'Fifty exercises that use SQL the way an on-call engineer does: deploys, incidents, alerts and SLO numbers. A real SQLite database runs inside your browser, works offline after the first load, and nothing leaves your device.') +
    shell({ lang: 'sql', free: 'Free play (any query)', editor: 'SQL query', rows: 8,
      buttons: '<button type="button" class="btn btn-primary" id="lab-run" data-act="sql-run" disabled>Run (Ctrl+Enter)</button><button type="button" class="btn btn-quiet" id="lab-check" data-act="sql-check" disabled>Check my answer</button>',
      pre: '<p class="small" id="sql-state" role="status" aria-live="polite">Loading the SQL engine...</p>' + sqlSchemaHtml() });
  view.after = function () {
    setup('sql', { free: 'SELECT name, tier FROM services ORDER BY tier, name;', freeTask: 'Free play: run any SELECT, or experiment with INSERT and UPDATE. The data is reset on every run.', freeLabel: 'Free play (any query)' });
    show('free');
    sqlLoad().then(function () { $('#sql-state').textContent = 'SQL engine ready.'; $('#lab-run').disabled = false; $('#lab-check').disabled = false; },
      function (err) { $('#sql-state').textContent = err.message; });
  };
}
A.onAct('sql-run', function () {
  if (!SQLJS.SQL) return;
  try { var r = sqlRun(SQLJS.SQL, $('#lab-code').value); $('#lab-res').innerHTML = ''; $('#lab-out').innerHTML = sqlTable(r); }
  catch (err) { $('#lab-out').innerHTML = ''; $('#lab-res').innerHTML = '<div class="drill-res no"><p><strong>SQL error.</strong> ' + e(err.message) + '</p></div>'; }
});
A.onAct('sql-check', function () {
  var x = find('sql', $('#lab-ex').value); if (!x || !SQLJS.SQL) return;
  var mine;
  try { mine = sqlRun(SQLJS.SQL, $('#lab-code').value); } catch (err) { $('#lab-out').innerHTML = ''; $('#lab-res').innerHTML = '<div class="drill-res no"><p><strong>SQL error.</strong> ' + e(err.message) + '</p></div>'; return; }
  var want = sqlRun(SQLJS.SQL, x.sol); $('#lab-out').innerHTML = sqlTable(mine);
  if (sqlSame(mine, want, /ORDER\s+BY/i.test(x.sol))) $('#lab-res').innerHTML = solved('sql', x);
  else {
    var why = mine.columns.length !== want.columns.length ? 'Your query returns ' + plural(mine.columns.length, 'column') + ' and the answer has ' + want.columns.length + '.' : mine.values.length !== want.values.length ? 'Your query returns ' + plural(mine.values.length, 'row') + ' and the answer has ' + want.values.length + '.' : 'The rows are different, or in a different order.';
    $('#lab-res').innerHTML = no(why);
  }
});
A.addRoute(/^\/playground\/sql$/, sqlView);

/* ---------------------------------------------------------------- YAML exercises (inside the YAML playground page) */
function yamlDocs(text) { return window.jsyaml.loadAll(text, { schema: window.jsyaml.YAML11_SCHEMA }); }
var YX = { id: 'free' };
A.yamlExercises = function () {
  var box = $('#yx'); if (!box) return;
  var n = (LABS.yaml || []).length;
  box.innerHTML = '<h2 class="sub-h">Practice: ' + n + ' YAML exercises</h2><p class="small">Pick an exercise. Its starting file replaces the editor above, and the checks read what you write. ' + '<span id="yx-count"></span></p>' +
    '<label class="field"><span>Exercise</span><select id="yx-ex">' + '<option value="free">Choose an exercise</option>' + (LABS.yaml || []).map(function (x, i) { return '<option value="' + e(x.id) + '">' + (isSolved('yaml', x.id) ? 'Solved: ' : '') + (i + 1) + '. ' + e(x.title) + '</option>'; }).join('') + '</select></label>' +
    '<p id="yx-task" class="py-task"></p><details id="yx-hintbox" hidden><summary>Hint</summary><p id="yx-hint"></p></details>' +
    '<div class="actions"><button type="button" class="btn btn-primary" id="yx-check" data-act="yx-check" hidden>Check my answer</button><button type="button" class="btn btn-quiet" id="yx-reset" data-act="yx-reset" hidden>Reset to the starting file</button><button type="button" class="btn btn-quiet" id="yx-solbtn" data-act="yx-sol" aria-expanded="false" hidden>Show a solution</button></div>' +
    '<div id="yx-res" role="status" aria-live="polite"></div><pre class="evidence" id="yx-sol" hidden aria-label="A solution"><code></code></pre>';
  yxCount();
};
function yxCount() { var c = $('#yx-count'); if (c) c.textContent = countSolved('yaml') + ' of ' + (LABS.yaml || []).length + ' solved.'; }
function yxShow(id) {
  var x = id === 'free' ? null : find('yaml', id); YX.id = id;
  $('#yx-task').textContent = x ? x.task : ''; $('#yx-hintbox').hidden = !x; if (x) { $('#yx-hint').textContent = x.hint; $('#yx-hintbox').open = false; }
  ['yx-check', 'yx-reset', 'yx-solbtn'].forEach(function (i) { $('#' + i).hidden = !x; });
  $('#yx-sol').hidden = true; $('#yx-res').innerHTML = '';
  if (x) { var inp = $('#yp-in'); inp.value = x.start; inp.dispatchEvent(new Event('input')); }
}
document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'yx-ex') yxShow(ev.target.value); });
A.onAct('yx-reset', function () { yxShow(YX.id); });
A.onAct('yx-sol', function () { var x = find('yaml', YX.id), b = $('#yx-sol'); if (!x) return; var open = b.hidden; b.hidden = !open; b.querySelector('code').textContent = x.sol; $('#yx-solbtn').setAttribute('aria-expanded', String(open)); });
A.onAct('yx-check', function () {
  var x = find('yaml', YX.id); if (!x || !window.jsyaml) return;
  var text = $('#yp-in').value, docs;
  try { docs = yamlDocs(text); } catch (err) { $('#yx-res').innerHTML = '<div class="drill-res no"><p><strong>Invalid YAML.</strong> Line ' + (err.mark ? err.mark.line + 1 : '?') + ': ' + e(err.reason || err.message) + '</p></div>'; return; }
  docs = docs.filter(function (d, i) { return !(d === null && docs.length > 1 && i === docs.length - 1); });
  var fails = Lab.runChecks(docs, x.checks, text, false);
  if (fails.length) $('#yx-res').innerHTML = no(plural(fails.length, 'thing') + ' still to do:', fails);
  else { markSolved('yaml', x.id); var sel = $('#yx-ex'), v = sel.value; sel.innerHTML = '<option value="free">Choose an exercise</option>' + (LABS.yaml || []).map(function (q, i) { return '<option value="' + e(q.id) + '">' + (isSolved('yaml', q.id) ? 'Solved: ' : '') + (i + 1) + '. ' + e(q.title) + '</option>'; }).join(''); sel.value = v; yxCount(); $('#yx-res').innerHTML = ok('All checks passed. ' + plural(countSolved('yaml'), 'exercise') + ' solved.'); }
});
};
