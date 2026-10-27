/* MARGA terminal labs: break-and-fix practice in a simulated terminal, for Linux, Shell, Networking and Python.
   The engine (src/app/term-*.js) is loaded only when a lab is opened. Everything runs in the browser. Nothing is sent anywhere. */
var TL_VQ = (function () { try { var s = document.currentScript && document.currentScript.src; return s && s.indexOf('?') > 0 ? s.slice(s.indexOf('?')) : ''; } catch (x) { return ''; } }());
window.MargaTermLabs = function (A) {
'use strict';
var D = A.D, view = A.view, $ = A.$, e = A.e, plural = A.plural, LABS = D.termlabs || [];
var ENGINE = ['term-fs.js', 'term-parse.js', 'term-exec.js', 'term-cmds.js', 'term-text.js', 'term-awk.js', 'term-jq.js', 'term-sys.js', 'term-net.js', 'term-labs.js'];
var STAGES = ['linux', 'bash', 'networking', 'python'];
var BANNER = '<strong>This is a simulation.</strong> The terminal is a program written for MARGA that imitates a Linux shell, a small network and a few services. It is not a real kernel, a real network or Docker, and the output of real tools can differ in the details. Python labs run real Python (Pyodide) in your browser. Nothing you type leaves your device.';
function bag() { var s = A.state(); if (!s.tl || typeof s.tl !== 'object' || Array.isArray(s.tl)) s.tl = {}; return s.tl; }
function find(id) { for (var i = 0; i < LABS.length; i++) if (LABS[i].id === id) return LABS[i]; return null; }
function isDone(id) { return !!(bag()[id] && bag()[id].d); }
function doneCount(mod) { return LABS.filter(function (l) { return (!mod || l.module === mod) && isDone(l.id); }).length; }
function stageTitle(m) { return A.MOD[m] ? A.MOD[m].title : m; }

/* ---------------------------------------------------------------- engine loading */
var enginePromise = null;
function loadEngine() {
  if (window.MargaTerm && window.MargaTerm.newLab) return Promise.resolve(window.MargaTerm);
  if (enginePromise) return enginePromise;
  enginePromise = ENGINE.reduce(function (p, f) {
    return p.then(function () {
      return new Promise(function (res, rej) {
        var s = document.createElement('script'); s.src = 'assets/' + f + TL_VQ; s.onload = res;
        s.onerror = function () { rej(new Error('The terminal could not be loaded. Check your connection and reload the page.')); };
        document.head.appendChild(s);
      });
    });
  }, Promise.resolve()).then(function () { return window.MargaTerm; });
  enginePromise.catch(function () { enginePromise = null; });
  return enginePromise;
}

/* ---------------------------------------------------------------- index */
function labRow(l) {
  var lesson = l.lesson && A.LES[l.lesson] ? A.LES[l.lesson] : null;
  return '<li class="tl-item"><div><h3><a href="#/terminal-lab/' + e(l.id) + '">' + e(l.title) + '</a></h3><p>' + e(l.summary) + '</p>' +
    '<p class="small">' + e(l.level) + ' | ' + l.minutes + ' min' + (lesson ? ' | Goes with the lesson <a href="' + A.hrefLesson(l.lesson) + '">' + e(lesson.title) + '</a>' : '') + '</p></div>' +
    '<span class="chip' + (isDone(l.id) ? ' pass' : '') + '">' + (isDone(l.id) ? 'Done' : 'Not done') + '</span></li>';
}
function indexView(mod) {
  view.title = 'Terminal labs | MARGA by EknathaLabs'; view.nav = 'practice';
  var shown = STAGES.filter(function (m) { return !mod || m === mod; });
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Terminal labs</h1>' +
    '<p class="lede">Something is broken. Use the terminal to find out why and fix it. Each lab checks your work automatically, gives hints one at a time, and can show a solution when you are stuck.</p></section>' +
    '<div class="wrap"><div class="note-panel tl-banner" role="note"><h3>Read this first</h3><p>' + BANNER + '</p></div>' +
    '<p class="small tl-count">' + doneCount() + ' of ' + LABS.length + ' labs done' + (mod ? '. Showing ' + e(stageTitle(mod)) + '.' : '.') + '</p>' +
    '<ul class="chips tl-filter" aria-label="Filter by stage"><li><a href="#/terminal-labs"' + (!mod ? ' aria-current="page"' : '') + '>All stages</a></li>' +
    STAGES.map(function (m) { return '<li><a href="#/terminal-labs/' + m + '"' + (mod === m ? ' aria-current="page"' : '') + '>' + e(stageTitle(m)) + '</a></li>'; }).join('') + '</ul>' +
    shown.map(function (m) {
      var ls = LABS.filter(function (l) { return l.module === m; });
      return '<h2 class="sub-h">' + e(stageTitle(m)) + ' <span class="small">(' + doneCount(m) + ' of ' + ls.length + ' done)</span></h2><ul class="tl-list">' + ls.map(labRow).join('') + '</ul>';
    }).join('') +
    '<div class="note-panel"><h3>What is not here</h3><p>These labs do not give you a real Linux machine. A real one, running in the browser, would need a download of tens of megabytes and a third-party engine, so it was left out for now. For the real thing, use a virtual machine or container on your own computer. Kubernetes, Docker and Terraform labs are still planned.</p></div></div>';
  view.after = null;
}
A.addRoute(/^\/terminal-labs(?:\/(linux|bash|networking|python))?$/, indexView);

/* ---------------------------------------------------------------- one lab */
var cur = null;   /* { lab, T, s, hist, hi, pending, busy, hintsShown, solShown, comp } */

function out() { return $('#tl-out'); }
function put(text, cls) {
  var o = out(); if (!o || text === '') return;
  var idx = text.lastIndexOf('\x1b[2J');
  if (idx >= 0) { o.textContent = ''; text = text.slice(idx + 4).replace(/^\x1b\[H/, ''); }
  if (text === '') return;
  var sp = document.createElement('span'); if (cls) sp.className = cls; sp.textContent = text; o.appendChild(sp);
  while (o.childNodes.length > 800) o.removeChild(o.firstChild);
  o.scrollTop = o.scrollHeight;
}
function ensureNl() { var o = out(); if (o && o.lastChild && !/\n$/.test(o.lastChild.textContent)) put('\n', ''); }
function homeOf(s) { return s.eu === 'root' ? '/root' : '/home/' + s.eu; }
function psText() {
  var s = cur.s, c = s.cwd, h = homeOf(s);
  if (c === h) c = '~'; else if (c.indexOf(h + '/') === 0) c = '~' + c.slice(h.length);
  return s.eu + '@' + s.hostname + ':' + c + (s.eu === 'root' ? '# ' : '$ ');
}
function setPrompt() { var p = $('#tl-ps'); if (p) p.textContent = cur.pending ? '> ' : psText(); }
function isIncomplete(T, text) { return T.isIncomplete(text); }
function setBusy(b) { cur.busy = b; var i = $('#tl-in'); if (i) i.readOnly = b; }

async function submit(raw) {
  if (!cur || cur.busy) return;
  var T = cur.T, line = raw.replace(/\r/g, '');
  put((cur.pending ? '> ' : psText()) + line + '\n', 'tl-cmd');
  var full = cur.pending ? cur.pending + '\n' + line : line;
  if (isIncomplete(T, full)) { cur.pending = full; setPrompt(); return; }
  cur.pending = ''; setPrompt();
  if (!full.trim()) return;
  cur.hist.push(full); cur.hi = cur.hist.length;
  setBusy(true);
  try {
    var r = await cur.s.exec1(full);
    r.chunks.forEach(function (c) { put(c.s, c.fd === 2 ? 'tl-e' : ''); });
    ensureNl();
  } catch (x) { ensureNl(); put('terminal: internal error: ' + (x && x.message ? x.message : x) + '\n', 'tl-e'); }
  setBusy(false); setPrompt(); var i = $('#tl-in'); if (i) i.focus();
}

/* tab completion */
function complete() {
  var i = $('#tl-in'), v = i.value, T = cur.T, s = cur.s;
  var m = /(\S*)$/.exec(v), word = m[1], head = v.slice(0, v.length - word.length), first = !/\S/.test(head);
  var cands = [];
  if (first && word.indexOf('/') < 0) {
    var seen = {}; Object.keys(T.commands).forEach(function (k) { if (k.indexOf(word) === 0 && !seen[k]) { seen[k] = 1; cands.push(k); } });
  } else {
    var slash = word.lastIndexOf('/'), dir = slash >= 0 ? word.slice(0, slash + 1) : '', base = word.slice(slash + 1);
    try {
      s.listDir(dir || '.').forEach(function (n) {
        if (n.indexOf(base) !== 0 || (n[0] === '.' && base[0] !== '.')) return;
        var isDir = false; try { isDir = s.walk(s.abs(dir + n)).t === 'd'; } catch (x2) { /* not readable */ }
        cands.push(dir + n + (isDir ? '/' : ''));
      });
    } catch (x) { /* unreadable directory: no candidates */ }
  }
  if (!cands.length) return;
  cands.sort();
  var pre = cands[0]; cands.forEach(function (c) { while (c.indexOf(pre) !== 0) pre = pre.slice(0, -1); });
  if (cands.length === 1) { i.value = head + cands[0] + (/\/$/.test(cands[0]) ? '' : ' '); return; }
  if (pre.length > word.length) { i.value = head + pre; return; }
  if (cur.lastTab === v) { put(psText() + v + '\n', 'tl-cmd'); put(cands.join('  ') + '\n', ''); }
  cur.lastTab = v;
}
function histMove(d) {
  var i = $('#tl-in'); if (!cur.hist.length) return;
  cur.hi = Math.max(0, Math.min(cur.hist.length, cur.hi + d));
  i.value = cur.hi >= cur.hist.length ? '' : cur.hist[cur.hi].split('\n')[0];
  setTimeout(function () { i.setSelectionRange(i.value.length, i.value.length); }, 0);
}
function key(k) {
  var i = $('#tl-in'); if (!i || !cur) return;
  if (k === 'Tab') complete();
  else if (k === 'Up') histMove(-1);
  else if (k === 'Down') histMove(1);
  else if (k === 'Ctrl+C') { put((cur.pending ? '> ' : psText()) + i.value + '^C\n', 'tl-cmd'); i.value = ''; cur.pending = ''; setPrompt(); }
  else if (k === 'Clear') { out().textContent = ''; }
  i.focus();
}
document.addEventListener('keydown', function (ev) {
  var t = ev.target; if (!t || t.id !== 'tl-in' || !cur) return;
  if (ev.key === 'Enter') { ev.preventDefault(); var v = t.value; t.value = ''; submit(v); }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); key('Up'); }
  else if (ev.key === 'ArrowDown') { ev.preventDefault(); key('Down'); }
  else if (ev.key === 'Tab' && !ev.shiftKey) { if (cur.leave) { cur.leave = false; return; } ev.preventDefault(); key('Tab'); }
  else if (ev.key === 'Escape') { cur.leave = true; var h = $('#tl-leave'); if (h) h.textContent = 'Tab now moves focus out of the terminal.'; return; }
  else if (ev.ctrlKey && (ev.key === 'c' || ev.key === 'C') && !(t.selectionStart !== t.selectionEnd)) { ev.preventDefault(); key('Ctrl+C'); }
  else if (ev.ctrlKey && (ev.key === 'l' || ev.key === 'L')) { ev.preventDefault(); key('Clear'); }
  else if (ev.ctrlKey && (ev.key === 'u' || ev.key === 'U')) { ev.preventDefault(); t.value = ''; }
  if (ev.key !== 'Escape' && ev.key !== 'Tab' && cur) { cur.leave = false; var h2 = $('#tl-leave'); if (h2 && h2.textContent) h2.textContent = ''; }
});
document.addEventListener('paste', function (ev) {
  var t = ev.target; if (!t || t.id !== 'tl-in' || !cur) return;
  var txt = (ev.clipboardData || window.clipboardData).getData('text'); if (!txt || txt.indexOf('\n') < 0) return;
  ev.preventDefault();
  var lines = txt.replace(/\r/g, '').replace(/\n$/, '').split('\n'), pre = t.value; t.value = '';
  (async function () { for (var k = 0; k < lines.length; k++) { await submit((k === 0 ? pre : '') + lines[k]); } }());
});
A.onAct('tl-key', function (el) { key(el.getAttribute('data-key')); });
A.onAct('tl-focus', function () { var i = $('#tl-in'); if (i) i.focus(); });

/* editor (nano, vi) and Python hooks */
function editHook(path, text) {
  return new Promise(function (res) {
    var box = $('#tl-edit'); if (!box) { res(null); return; }
    $('#tl-edit-title').textContent = 'Editing ' + path; var ta = $('#tl-edit-text'); ta.value = text;
    box.hidden = false; cur.editRes = res; ta.focus();
  });
}
function editDone(save) {
  var box = $('#tl-edit'); if (!box || !cur || !cur.editRes) return;
  var r = cur.editRes; cur.editRes = null; var v = $('#tl-edit-text').value; box.hidden = true; r(save ? v : null);
}
A.onAct('tl-edit-save', function () { editDone(true); });
A.onAct('tl-edit-cancel', function () { editDone(false); });
var pyDriver = false;
function pyHook(spec) {
  var T = cur.T;
  if (!window.MARGA_PYLOAD) return Promise.resolve({ code: 1, out: '', err: 'Python is not available on this page.\n', files: {} });
  if (!(window.MARGA_PY_READY && window.MARGA_PY_READY())) put('Downloading Python (about 10 MB, once). Python itself comes from a public CDN, so this needs an internet connection...\n', 'tl-note');
  return window.MARGA_PYLOAD().then(function (py) {
    if (!pyDriver) { py.runPython(T.PY_DRIVER); pyDriver = true; }
    var f = py.globals.get('_marga_run'), r;
    try { r = f(JSON.stringify(spec)); } finally { if (f.destroy) f.destroy(); }
    return JSON.parse(r);
  }, function (err) { return { code: 1, out: '', err: (err && err.message ? err.message : 'Python could not be loaded.') + '\n', files: {} }; });
}

/* ---------------------------------------------------------------- checks, hints, solution */
function goalsHtml(l) { return l.goals.map(function (g, i) { return '<li>' + g.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/`([^`]+)`/g, '<code>$1</code>') + '</li>'; }).join(''); }
function plain(t) { return e(t).replace(/`([^`]+)`/g, '<code>$1</code>'); }
function resultsHtml(rs) {
  return '<ul class="tl-results">' + rs.map(function (r) { return '<li class="' + (r.ok ? 'ok' : 'no') + '"><strong>' + (r.ok ? 'Passed' : 'Not yet') + ':</strong> ' + e(r.label) + (!r.ok && r.detail ? ' <span class="small">(' + e(r.detail) + ')</span>' : '') + '</li>'; }).join('') + '</ul>';
}
async function runChecks() {
  if (!cur || cur.busy) return;
  var btn = $('#tl-check'); btn.disabled = true; setBusy(true);
  var box = $('#tl-res'); box.innerHTML = '<p class="small">Checking...</p>';
  var rs;
  try { rs = await cur.T.evalChecks(cur.s, cur.lab.checks); } catch (x) { rs = [{ ok: false, label: 'The checker failed', detail: String(x && x.message || x) }]; }
  setBusy(false); btn.disabled = false;
  var pass = rs.filter(function (r) { return r.ok; }).length, all = pass === rs.length;
  var html = '<div class="drill-res ' + (all ? 'ok' : 'no') + '"><p><strong>' + (all ? 'All checks passed.' : pass + ' of ' + rs.length + ' checks passed.') + '</strong></p>' + resultsHtml(rs) + '</div>';
  if (all) {
    var b = bag(), first = !b[cur.lab.id] || !b[cur.lab.id].d;
    b[cur.lab.id] = { d: (b[cur.lab.id] && b[cur.lab.id].d) || new Date().toISOString().slice(0, 10), h: cur.hintsShown, s: cur.solShown ? 1 : 0 };
    if (first) { A.markActive(); A.save(); A.renderChrome(); A.setNav(view.nav); }
    html += '<div class="tl-explain"><h3>What this lab showed</h3><p>' + plain(cur.lab.explain) + '</p></div>' +
      '<p><a class="btn btn-quiet" href="#/terminal-labs/' + e(cur.lab.module) + '">More ' + e(stageTitle(cur.lab.module)) + ' labs</a></p>';
    var chip = $('#tl-status'); if (chip) { chip.textContent = 'Done'; chip.className = 'chip pass'; }
  }
  box.innerHTML = html;
}
A.onAct('tl-check', runChecks);
A.onAct('tl-hint', function () {
  var l = cur.lab; if (cur.hintsShown >= l.hints.length) return;
  cur.hintsShown++;
  var ol = $('#tl-hints'); ol.hidden = false;
  var li = document.createElement('li'); li.innerHTML = plain(l.hints[cur.hintsShown - 1]); ol.appendChild(li);
  var b = $('#tl-hint'); b.textContent = cur.hintsShown >= l.hints.length ? 'No more hints' : 'Show the next hint (' + cur.hintsShown + ' of ' + l.hints.length + ' shown)';
  if (cur.hintsShown >= l.hints.length) b.disabled = true;
});
A.onAct('tl-sol', function () {
  var box = $('#tl-solbox'), b = $('#tl-sol'), open = box.hidden; box.hidden = !open; b.setAttribute('aria-expanded', String(open));
  b.textContent = open ? 'Hide the solution' : 'Show a solution'; if (open) { cur.solShown = true; box.querySelector('code').textContent = cur.lab.solution; }
});
A.onAct('tl-reset', function () { if (cur) startSession(true); });

async function startSession(reset) {
  var T = cur.T, lab = cur.lab;
  cur.s = T.newLab(lab, { tty: true, edit: editHook, python: pyHook });
  cur.hist = []; cur.hi = 0; cur.pending = ''; cur.busy = false;
  var o = out(); o.textContent = '';
  put((reset ? 'The lab was reset to its starting state.\n' : '') + 'Simulated terminal. Type help to list the commands. Tab completes, Up and Down show history.\n', 'tl-note');
  $('#tl-res').innerHTML = ''; setPrompt();
  var i = $('#tl-in'); if (i) { i.readOnly = false; if (!reset) i.value = ''; }
}

function labView(id) {
  var lab = find(id);
  if (!lab) {
    view.title = 'Lab not found | MARGA by EknathaLabs'; view.nav = 'practice';
    view.html = '<section class="page-head wrap"><h1>That lab does not exist</h1><p class="lede"><a href="#/terminal-labs">See all terminal labs</a></p></section>'; view.after = null; return;
  }
  var lesson = lab.lesson && A.LES[lab.lesson] ? A.LES[lab.lesson] : null;
  view.title = lab.title + ' | Terminal labs | MARGA by EknathaLabs'; view.nav = 'practice';
  var python = lab.module === 'python';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a> <a href="#/terminal-labs">Terminal labs</a> <a href="#/terminal-labs/' + e(lab.module) + '">' + e(stageTitle(lab.module)) + '</a></nav>' +
    '<h1>' + e(lab.title) + '</h1><p class="lede">' + e(lab.summary) + '</p>' +
    '<p class="small">' + e(lab.level) + ' | about ' + lab.minutes + ' minutes | <span id="tl-status" class="chip' + (isDone(lab.id) ? ' pass' : '') + '">' + (isDone(lab.id) ? 'Done' : 'Not done') + '</span>' + (lesson ? ' | Goes with the lesson <a href="' + A.hrefLesson(lab.lesson) + '">' + e(lesson.title) + '</a>' : '') + '</p></section>' +
    '<div class="wrap tl-wrap"><div class="note-panel tl-banner" role="note"><p>' + BANNER + (python ? ' The first Python command downloads Python (about 10 MB) from a public CDN, so it needs an internet connection once; a loop that never ends will freeze this tab.' : '') + '</p></div>' +
    '<button type="button" class="btn btn-quiet tl-jump" data-act="tl-focus">Go to the terminal</button>' +
    '<div class="tl-grid"><div class="tl-side"><h2 class="sub-h">The situation</h2><p>' + plain(lab.story) + '</p>' +
    '<h2 class="sub-h">Goals</h2><ul class="tl-goals">' + goalsHtml(lab) + '</ul>' +
    '<div class="actions"><button type="button" class="btn btn-primary" id="tl-check" data-act="tl-check">Check my work</button>' +
    '<button type="button" class="btn btn-quiet" id="tl-hint" data-act="tl-hint">Show the next hint (0 of ' + lab.hints.length + ' shown)</button>' +
    '<button type="button" class="btn btn-quiet" id="tl-sol" data-act="tl-sol" aria-expanded="false">Show a solution</button>' +
    '<button type="button" class="btn btn-quiet" data-act="tl-reset">Reset the lab</button></div>' +
    '<ol id="tl-hints" class="tl-hints" hidden aria-label="Hints"></ol>' +
    '<div id="tl-solbox" hidden><p class="small">Try the hints first. A solution is one way to do it; yours can differ and still pass.</p><pre class="evidence" tabindex="0" aria-label="A solution"><code></code></pre></div>' +
    '<div id="tl-res" role="status" aria-live="polite"></div></div>' +
    '<div class="tl-termwrap"><div class="tl-term"><div class="tl-bar"><span id="tl-title">Simulated terminal</span></div>' +
    '<div class="tl-out" id="tl-out" role="log" aria-label="Terminal output" tabindex="0"></div>' +
    '<div class="tl-edit" id="tl-edit" hidden><p id="tl-edit-title" class="small"></p><label class="field"><span>File contents</span><textarea id="tl-edit-text" class="editor" rows="10" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea></label>' +
    '<div class="actions"><button type="button" class="btn btn-primary" data-act="tl-edit-save">Save the file</button><button type="button" class="btn btn-quiet" data-act="tl-edit-cancel">Cancel</button></div></div>' +
    '<div class="tl-line"><label class="tl-ps" id="tl-ps" for="tl-in">$ </label><input id="tl-in" class="tl-in" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-label="Terminal input"></div>' +
    '<div class="tl-keys" role="group" aria-label="Terminal keys"><button type="button" class="btn btn-quiet" data-act="tl-key" data-key="Tab">Tab</button><button type="button" class="btn btn-quiet" data-act="tl-key" data-key="Up">Up</button><button type="button" class="btn btn-quiet" data-act="tl-key" data-key="Down">Down</button><button type="button" class="btn btn-quiet" data-act="tl-key" data-key="Ctrl+C">Ctrl+C</button><button type="button" class="btn btn-quiet" data-act="tl-key" data-key="Clear">Clear</button></div>' +
    '<p class="small tl-help">Press Enter to run a command. Press Escape and then Tab to move focus out of the terminal. <span id="tl-leave" role="status"></span></p></div></div></div></div>';
  view.after = function () {
    cur = { lab: lab, T: null, s: null, hist: [], hi: 0, pending: '', busy: false, hintsShown: 0, solShown: false, leave: false };
    var o = out(); o.textContent = 'Loading the terminal...\n';
    loadEngine().then(function (T) {
      if (!cur || cur.lab !== lab || !$('#tl-out')) return;
      cur.T = T; startSession(false);
    }, function (err) { var o2 = out(); if (o2) { o2.textContent = (err && err.message) || 'The terminal could not be loaded.'; } });
  };
}
A.addRoute(/^\/terminal-lab\/([\w-]+)$/, labView);
A.afterRoute(function () { if (cur && !$('#tl-out')) cur = null; });

window.MargaTermLabs.count = function () { return plural(LABS.length, 'lab') + ', ' + doneCount() + ' done'; };
window.MargaTermLabs.total = function () { return LABS.length; };
window.MargaTermLabs.moduleLine = function (mid) {
  var n = LABS.filter(function (l) { return l.module === mid; }).length;
  if (!n) return '';
  return '<h2 class="sub-h">Terminal labs</h2><p class="lede-s">' + plural(n, 'break-and-fix lab') + ' for this stage, in a simulated terminal in your browser (' + doneCount(mid) + ' done).</p><p><a class="btn btn-quiet" href="#/terminal-labs/' + e(mid) + '">Open the labs for this stage</a></p>';
};
};
