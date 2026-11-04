/* MARGA real Linux lab: a real Linux kernel running inside the page (v86 emulator, a small 32-bit kernel and BusyBox).
   Each scenario breaks something on purpose. You fix it in a real shell, then press Check. The checks run inside the machine and read its
   actual state (files, processes, mounts, ports). Nothing is sent anywhere. The files load only when you start a lab, then stay in the browser cache. */
var VM_VQ = (function () { try { var s = document.currentScript && document.currentScript.src; return s && s.indexOf('?') > 0 ? s.slice(s.indexOf('?')) : ''; } catch (x) { return ''; } }());
window.MargaLinux = function (A) {
'use strict';
var $ = A.$, $$ = A.$$, e = A.e, view = A.view, D = A.D, SC = D.vmlabs || [];
var LEVEL_ORDER = ['Beginner', 'Intermediate', 'Advanced'];

function bag() { var s = A.state(); if (!s.vm || typeof s.vm !== 'object' || Array.isArray(s.vm)) s.vm = {}; if (!s.vm.done || typeof s.vm.done !== 'object') s.vm.done = {}; if (!s.vm.h || typeof s.vm.h !== 'object') s.vm.h = {}; if (!s.vm.ok || typeof s.vm.ok !== 'object') s.vm.ok = {}; if (!s.vm.why || typeof s.vm.why !== 'object') s.vm.why = {}; return s.vm; }
function find(id) { for (var i = 0; i < SC.length; i++) if (SC[i].id === id) return SC[i]; return null; }
function isDone(id) { return !!bag().done[id]; }
function doneCount() { return SC.filter(function (x) { return isDone(x.id); }).length; }
A.vmLabs = { list: function () { return SC.slice(); }, done: isDone, find: find, view: function (id) { return labView(id); } };

var BANNER = '<p class="tl-warn" role="note"><strong>This is a real Linux kernel, but a small one.</strong> It runs inside your browser with BusyBox tools. There is no package manager and no internet. The systemctl and journalctl commands are a small imitation of systemd, made for learning. The network labs build private networks inside the machine. The machine starts fresh each time unless you save it, and every check reads the machine\'s real state.</p>';

/* ---------------------------------------------------------------- loading the emulator */
var loadP = null;
function script(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src + '. Check your connection and try again.')); }; document.head.appendChild(s); }); }
function loadLibs() {
  if (window.V86 && window.Terminal && window.FitAddon) return Promise.resolve();
  if (loadP) return loadP;
  if (!document.getElementById('vm-css')) { var l = document.createElement('link'); l.id = 'vm-css'; l.rel = 'stylesheet'; l.href = 'vm/xterm.css' + VM_VQ; document.head.appendChild(l); }
  loadP = script('vm/libv86.js' + VM_VQ).then(function () { return script('vm/xterm.js' + VM_VQ); }).then(function () { return script('vm/addon-fit.js' + VM_VQ); });
  loadP.catch(function () { loadP = null; });
  return loadP;
}

/* ---------------------------------------------------------------- the machine */
/* Machine(scenarioId, host element, hooks) -> { send, check, stop, ... } */
function Machine(id, host, hooks, saved) {
  var m = { em: null, term: null, fit: null, out1: '', ready: false, stopped: false, raf: 0, buf: [] };
  function flush() { m.raf = 0; if (!m.buf.length || !m.term) return; var a = new Uint8Array(m.buf); m.buf = []; m.term.write(a); }
  m.start = function () {
    return loadLibs().then(function () {
      if (m.stopped) return;
      m.term = new window.Terminal({ cursorBlink: true, fontSize: 14, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', scrollback: 2000, screenReaderMode: true, theme: { background: '#0e1624', foreground: '#e6edf7' } });
      var FA = window.FitAddon.FitAddon || window.FitAddon; m.fit = new FA(); m.term.loadAddon(m.fit);
      m.term.open(host); try { m.fit.fit(); } catch (x) { /* host not visible yet */ }
      m.term.textarea && m.term.textarea.setAttribute('aria-label', 'Linux terminal. Type a command and press Enter.');
      m.em = new window.V86({
        wasm_path: 'vm/v86.wasm' + VM_VQ, bios: { url: 'vm/seabios.bin' }, vga_bios: { url: 'vm/vgabios.bin' },
        bzimage: { url: 'vm/bzImage' + VM_VQ }, initrd: { url: 'vm/initrd.gz' + VM_VQ },
        cmdline: 'console=ttyS0 quiet loglevel=1 marga=' + id, memory_size: 96 * 1024 * 1024, vga_memory_size: 2 * 1024 * 1024,
        uart1: true, autostart: !saved, disable_keyboard: true, disable_mouse: true, disable_speaker: true
      });
      if (saved) {
        /* a saved machine: restore the whole memory and CPU state once the emulator is loaded, then wake the shell */
        m.em.add_listener('emulator-loaded', function () {
          m.em.restore_state(saved).then(function () {
            m.em.run(); m.ready = true; setTimeout(function () { sizeGuest(); if (m.em) m.em.serial0_send('\n'); hooks.ready && hooks.ready(true); }, 300);
          }, function () { hooks.failed && hooks.failed(new Error('That saved machine could not be restored.')); });
        });
      }
      var seen = '', stage = saved ? 2 : 0, PROMPT = /marga-lab:[^\n]*[$#] $/;
      m.em.add_listener('serial0-output-byte', function (c) {
        m.buf.push(c); if (!m.raf) m.raf = requestAnimationFrame(flush);
        if (stage < 2) {
          seen = (seen + String.fromCharCode(c)).slice(-240);
          if (PROMPT.test(seen.replace(/\u001b\[[0-9;?]*[a-zA-Z]/g, ''))) {
            if (stage === 0) { stage = 1; seen = ''; sizeGuest(); }
            else { stage = 2; m.ready = true; hooks.ready && hooks.ready(); }
          }
        }
      });
      m.em.add_listener('serial1-output-byte', function (c) { m.out1 += String.fromCharCode(c); });
      m.term.onData(function (d) { if (m.em && m.ready) m.em.serial0_send(d); });
    });
  };
  function sizeGuest() {
    if (!m.term) return;
    m.em.serial0_send('stty cols ' + m.term.cols + ' rows ' + m.term.rows + '; clear\n');
  }
  m.type = function (s) { if (m.em && m.ready) { m.em.serial0_send(s); m.term && m.term.focus(); } };
  m.refit = function () { try { m.fit && m.fit.fit(); } catch (x) { /* ignore */ } };
  m.check = function () {
    return new Promise(function (res, rej) {
      if (!m.em || !m.ready) { rej(new Error('Start the machine first.')); return; }
      m.out1 = ''; m.em.serial_send_bytes(1, new TextEncoder().encode('CHECK\n'));
      var t0 = Date.now();
      (function poll() {
        if (m.stopped) { rej(new Error('stopped')); return; }
        if (/@@DONE/.test(m.out1)) { res(m.out1.split('\n').map(function (x) { return x.replace(/\r/g, ''); }).filter(function (x) { return /^(PASS|FAIL) /.test(x); }).map(function (x) { return { ok: x.slice(0, 4) === 'PASS', text: x.slice(5) }; })); return; }
        if (Date.now() - t0 > 60000) { rej(new Error('The check did not finish. The machine may be busy, wait a moment and try again.')); return; }
        setTimeout(poll, 300);
      }());
    });
  };
  m.save = function () { if (!m.em || !m.ready) return Promise.reject(new Error('Start the machine first.')); return m.em.save_state(); };
  m.stop = function () { m.stopped = true; if (m.raf) cancelAnimationFrame(m.raf); try { m.em && m.em.destroy(); } catch (x) { /* ignore */ } try { m.term && m.term.dispose(); } catch (x2) { /* ignore */ } m.em = null; m.term = null; };
  return m;
}

/* ---------------------------------------------------------------- index */
function tagsOf(x) {
  var t = [];
  if (x.kind === 'diagnose') t.push('Diagnose only');
  if (x.faults) t.push(x.faults + ' faults');
  if (x.tag === 'network') t.push('Network');
  if (x.tag === 'systemd') t.push('systemd-style');
  return t;
}
function row(x) {
  var lesson = x.lesson && A.LES[x.lesson] ? A.LES[x.lesson] : null, done = isDone(x.id);
  return '<li class="tl-item vm-card' + (done ? ' is-done' : '') + '"><div class="vc-top"><span class="chip vc-lv">' + e(x.level) + '</span>' + tagsOf(x).map(function (t) { return '<span class="chip">' + e(t) + '</span>'; }).join('') + '<span class="vc-m' + (done ? ' ok' : '') + '">' + (done ? 'Solved' : x.minutes + ' min') + '</span></div>' +
    '<h3><a href="#/linux/' + e(x.id) + '">' + e(x.title) + '</a></h3><p class="vc-s">' + e(x.story) + '</p>' +
    (lesson ? '<p class="small">Goes with the lesson <a href="' + A.hrefLesson(x.lesson) + '">' + e(lesson.title) + '</a></p>' : '') +
    '<p class="vc-go"><a class="btn ' + (done ? 'btn-quiet' : 'btn-primary') + '" href="#/linux/' + e(x.id) + '" aria-label="' + (done ? 'Open again: ' : 'Start lab: ') + e(x.title) + '">' + (done ? 'Open again' : 'Start lab') + '</a></p><span class="sr">' + (done ? 'Solved' : 'Not solved') + '</span></li>';
}
var IDX = { level: '', q: '', st: 'all', tp: '' };
var TOPICS = [['', 'All kinds'], ['fix', 'Fix it'], ['diagnose', 'Diagnose only'], ['multi', 'Several faults'], ['network', 'Network'], ['systemd', 'systemd-style'], ['packages', 'Packages'], ['tls', 'TLS and certificates']];
function inTopic(x, tp) { return !tp || (tp === 'fix' ? x.kind !== 'diagnose' : tp === 'diagnose' ? x.kind === 'diagnose' : tp === 'multi' ? !!x.faults : x.tag === tp); }
function levelCount(lv) { var xs = SC.filter(function (x) { return x.level === lv; }); return { n: xs.length, done: xs.filter(function (x) { return isDone(x.id); }).length }; }
function firstOpenLevel() { for (var i = 0; i < LEVEL_ORDER.length; i++) { var c = levelCount(LEVEL_ORDER[i]); if (c.n && c.done < c.n) return LEVEL_ORDER[i]; } return 'All'; }
function visible() {
  var q = IDX.q.toLowerCase().replace(/\s+/g, ' ').trim();
  return SC.filter(function (x) {
    if (IDX.level !== 'All' && x.level !== IDX.level) return false;
    if (IDX.st === 'open' && isDone(x.id)) return false;
    if (IDX.st === 'done' && !isDone(x.id)) return false;
    if (!inTopic(x, IDX.tp)) return false;
    if (q && (x.title + ' ' + x.story + ' ' + x.id + ' ' + (x.lesson || '') + ' ' + tagsOf(x).join(' ')).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}
function listHtml() {
  var xs = visible();
  if (!xs.length) return '<p class="tl-warn" role="note">No scenario matches. Clear the search or choose another level.</p>';
  return '<ul class="tl-list vm-cards">' + xs.map(row).join('') + '</ul>';
}
function indexView(qs) {
  view.title = 'Real Linux lab | MARGA by EknathaLabs'; view.nav = 'practice'; view.voice = '';
  if (qs) qs.split('&').forEach(function (p) {
    var kv = p.split('='), k = kv[0], v = ''; try { v = decodeURIComponent(kv.slice(1).join('=').replace(/\+/g, ' ')); } catch (x) { return; }
    if (k === 'q') { IDX.q = v.slice(0, 80); IDX.level = 'All'; IDX.st = 'all'; IDX.tp = ''; }
    if (k === 'topic' && TOPICS.some(function (t) { return t[0] === v; })) IDX.tp = v;
    if (k === 'level' && (v === 'All' || LEVEL_ORDER.indexOf(v) >= 0)) IDX.level = v;
  });
  if (!IDX.level) IDX.level = firstOpenLevel();
  var lv = ['All'].concat(LEVEL_ORDER);
  var tabs = lv.map(function (l) {
    var c = l === 'All' ? { n: SC.length, done: doneCount() } : levelCount(l);
    return '<button type="button" class="btn btn-quiet" data-lv="' + e(l) + '" aria-pressed="' + (IDX.level === l) + '">' + e(l) + ' <span class="small">' + c.done + ' of ' + c.n + '</span></button>';
  }).join('');
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Real Linux lab</h1>' +
    '<p class="lede">A real Linux machine inside your browser. Something is broken. Find it with real commands, fix it, and press Check. ' + SC.length + ' scenarios: ' + LEVEL_ORDER.map(function (l) { return levelCount(l).n + ' ' + l; }).join(', ') + '. Fix it, diagnose it, or untangle several faults at once, including networks and a systemd-style service manager. Free, no sign-up, nothing leaves your device.</p>' +
    '<p class="small" id="vm-progress">' + doneCount() + ' of ' + SC.length + ' solved</p></section>' +
    '<div class="wrap vm-index">' + BANNER +
    '<p class="small">The first start downloads about 8 MB (the emulator, a small kernel and the tools). After that the lab works offline. It needs a recent desktop or phone browser with WebAssembly.</p>' +
    '<p class="actions"><a class="btn btn-primary" href="#/linux/sandbox">Open an empty machine</a> <button type="button" class="btn btn-quiet" id="vm-random">Pick one for me</button> <a class="btn btn-quiet" href="#/terminal-labs">Simulated terminal labs</a></p>' +
    '<div class="vm-browse" role="group" aria-label="Choose scenarios"><div class="vm-tabs">' + tabs + '</div>' +
    '<div class="vm-filter"><label class="field"><span>Search the scenarios</span><input type="search" id="vm-q" value="' + e(IDX.q) + '" autocomplete="off" spellcheck="false"></label>' +
    '<label class="field"><span>Kind</span><select id="vm-tp">' + TOPICS.map(function (t) { return '<option value="' + e(t[0]) + '"' + (IDX.tp === t[0] ? ' selected' : '') + '>' + e(t[1]) + '</option>'; }).join('') + '</select></label>' +
    '<label class="field"><span>Show</span><select id="vm-st"><option value="all"' + (IDX.st === 'all' ? ' selected' : '') + '>All</option><option value="open"' + (IDX.st === 'open' ? ' selected' : '') + '>Not solved yet</option><option value="done"' + (IDX.st === 'done' ? ' selected' : '') + '>Solved</option></select></label></div>' +
    '<p class="small" id="vm-count" role="status" aria-live="polite"></p></div><div id="vm-list">' + listHtml() + '</div></div>';
  view.after = function () {
    function paint() {
      var xs = visible(); $('#vm-list').innerHTML = listHtml();
      $('#vm-count').textContent = 'Showing ' + xs.length + ' of ' + SC.length + ' scenarios.';
      $$('.vm-tabs [data-lv]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-lv') === IDX.level)); });
    }
    $$('.vm-tabs [data-lv]').forEach(function (b) { b.addEventListener('click', function () { IDX.level = b.getAttribute('data-lv'); paint(); }); });
    var q = $('#vm-q'); if (q) q.addEventListener('input', function () { IDX.q = q.value; paint(); });
    var st = $('#vm-st'); if (st) st.addEventListener('change', function () { IDX.st = st.value; paint(); });
    var tp = $('#vm-tp'); if (tp) tp.addEventListener('change', function () { IDX.tp = tp.value; paint(); });
    var rnd = $('#vm-random'); if (rnd) rnd.addEventListener('click', function () {
      var pool = SC.filter(function (x) { return !isDone(x.id) && (IDX.level === 'All' || x.level === IDX.level); }); if (!pool.length) pool = SC;
      location.hash = '/linux/' + pool[Math.floor(Math.random() * pool.length)].id;
    });
    paint();
  };
}

/* ---------------------------------------------------------------- saved machines (kept in this browser, or in a file you download) */
var DBN = 'marga-vm', STORE = 'saves', MAGIC = 'MARGAVM1';
function dbOpen() { return new Promise(function (res, rej) { if (!window.indexedDB) { rej(new Error('This browser cannot keep saved machines. You can still download a save file.')); return; } var r = indexedDB.open(DBN, 1); r.onupgradeneeded = function () { r.result.createObjectStore(STORE); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error || new Error('The browser storage is not available.')); }; }); }
function dbDo(mode, fn) { return dbOpen().then(function (db) { return new Promise(function (res, rej) { var tx = db.transaction(STORE, mode), st = tx.objectStore(STORE), rq = fn(st); tx.oncomplete = function () { db.close(); res(rq && rq.result); }; tx.onerror = tx.onabort = function () { db.close(); rej(tx.error || new Error('Could not use the browser storage.')); }; }); }); }
function dbGet(k) { return dbDo('readonly', function (st) { return st.get(k); }); }
function dbPut(k, v) { return dbDo('readwrite', function (st) { return st.put(v, k); }); }
function dbDel(k) { return dbDo('readwrite', function (st) { return st['delete'](k); }); }
function pipe(buf, stream) { return new Response(new Blob([buf]).stream().pipeThrough(stream)).arrayBuffer(); }
function packState(buf) { if (!window.CompressionStream) return Promise.resolve({ z: false, data: buf }); return pipe(buf, new CompressionStream('gzip')).then(function (d) { return { z: true, data: d }; }); }
function unpackState(rec) { return rec.z ? pipe(rec.data, new DecompressionStream('gzip')) : Promise.resolve(rec.data); }
function toFile(rec) {
  var head = new TextEncoder().encode(JSON.stringify({ id: rec.id, t: rec.t, z: rec.z, ver: rec.ver, size: rec.size })), pre = new Uint8Array(12 + head.length), dv = new DataView(pre.buffer);
  pre.set(new TextEncoder().encode(MAGIC), 0); dv.setUint32(8, head.length, true); pre.set(head, 12);
  return new Blob([pre, rec.data], { type: 'application/octet-stream' });
}
function fromFile(buf) {
  var u = new Uint8Array(buf); if (u.length < 13 || new TextDecoder().decode(u.slice(0, 8)) !== MAGIC) throw new Error('That file is not a MARGA machine save.');
  var n = new DataView(buf).getUint32(8, true), meta; try { meta = JSON.parse(new TextDecoder().decode(u.slice(12, 12 + n))); } catch (x) { throw new Error('That save file is damaged.'); }
  meta.data = buf.slice(12 + n); return meta;
}
function megabytes(n) { return (n / 1048576).toFixed(n < 10485760 ? 1 : 0) + ' MB'; }
function clock(t) { var d = new Date(t); return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); }

/* ---------------------------------------------------------------- one lab */
var KEYS = [['Tab', '\t'], ['Ctrl+C', '\x03'], ['Ctrl+D', '\x04'], ['Esc', '\x1b'], ['Up', '\x1b[A'], ['Down', '\x1b[B'], ['Left', '\x1b[D'], ['Right', '\x1b[C'], ['|', '|'], ['/', '/'], ['-', '-'], ['~', '~']];
function labView(id) {
  var sb = id === 'sandbox', x = sb ? { id: 'none', title: 'Empty machine', level: 'Beginner', minutes: 10, lesson: '', story: 'A clean Linux machine to explore. Nothing is broken and nothing is checked.', goals: [], hints: [], solution: '' } : find(id);
  view.cleanup = null; view.after = null; view.voice = ''; view.nav = 'practice';
  if (!x) { view.title = 'Lab not found | MARGA'; view.html = '<section class="page-head wrap"><h1>That lab does not exist</h1><p class="lede"><a href="#/linux">See all Linux labs</a>.</p></section>'; return; }
  var dg = x.kind === 'diagnose', saveKey = sb ? 'sandbox' : x.id;
  view.title = x.title + ' | Real Linux lab | MARGA by EknathaLabs';
  var lesson = x.lesson && A.LES[x.lesson] ? A.LES[x.lesson] : null, idx = SC.indexOf(x), nxt = !sb && idx >= 0 && SC[idx + 1] ? SC[idx + 1] : null;
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/linux">Real Linux lab</a></nav><h1>' + e(x.title) + '</h1><p class="lede">' + e(x.story) + '</p>' +
    '<p class="small">' + e(x.level) + ' | about ' + x.minutes + ' minutes' + tagsOf(x).map(function (t) { return ' | <span class="chip">' + e(t) + '</span>'; }).join('') + (lesson ? ' | Goes with the lesson <a href="' + A.hrefLesson(x.lesson) + '">' + e(lesson.title) + '</a>' : '') + '</p></section>' +
    '<div class="wrap vm">' + BANNER +
    '<div class="vm-split"><div class="vm-left">' +
    (x.goals.length ? '<h2 class="sub-h">Goals</h2><ul class="vm-goals">' + x.goals.map(function (g) { return '<li>' + e(g) + '</li>'; }).join('') + '</ul>' : '') +
    (dg ? '<section class="vm-ask" id="vm-ask" aria-labelledby="vm-ask-h"><h2 class="sub-h" id="vm-ask-h">Your diagnosis</h2><p>' + e(x.ask) + '</p><label class="field"><span>Your answer</span><input type="text" id="vm-ans" autocomplete="off" spellcheck="false" autocapitalize="off"></label><div class="actions"><button type="button" class="btn btn-primary" id="vm-submit">Submit diagnosis</button></div></section>' : '') +
    '<div id="vm-result" class="vm-result" role="status" aria-live="polite"></div><div id="vm-why" class="vm-why"></div>' +
    '<div id="vm-hints" class="vm-hints"></div><div id="vm-solbox"></div>' +
    '</div><div class="vm-right">' +
    '<div class="actions vm-bar"><button type="button" class="btn btn-primary" id="vm-start">Start the machine</button>' +
    (sb ? '' : (dg ? '' : '<button type="button" class="btn btn-quiet" id="vm-check" disabled>Check my work</button>') + '<button type="button" class="btn btn-quiet" id="vm-hint">Show a hint</button><button type="button" class="btn btn-quiet" id="vm-sol">' + (dg ? 'Show the answer' : 'Show the solution') + '</button>') +
    '<button type="button" class="btn btn-quiet" id="vm-reset" disabled>Restart the machine</button></div>' +
    '<p class="small" id="vm-status" role="status" aria-live="polite">The machine is off. Press Start. The first start downloads about 8 MB.</p>' +
    '<div id="vm-fail" class="vm-fail" role="alert" hidden></div><div id="vm-term" class="vm-term" hidden></div>' +
    '<div class="vm-keys" id="vm-keys" hidden>' + KEYS.map(function (k, i) { return '<button type="button" class="btn btn-quiet" data-k="' + i + '" aria-label="Send ' + e(k[0]) + '">' + e(k[0]) + '</button>'; }).join('') + '</div>' +
    (window.MargaExplain ? '<details class="tl-cheat vm-cheat" id="vm-cheat"><summary>Command cheat bar</summary><div class="tl-cheat-list" role="group" aria-label="Common commands. Pressing one types it into the machine.">' + window.MargaExplain.cheats(x.module || 'linux').map(function (c) { return '<button type="button" class="btn btn-quiet" data-vc="' + e(c[1]) + '"><span>' + e(c[0]) + '</span><code>' + e(c[1].trim()) + '</code></button>'; }).join('') + '</div><p class="small">Pressing a button types the command without running it. Start the machine first.</p></details>' : '') +
    '<details class="vm-saves" id="vm-saves"><summary>Save my machine</summary><p class="small">Save the whole machine as it is now, files, processes and all, and carry on later. The save stays in this browser. You can also download it as a file and load it on another device. It is only for this lab, and it never leaves your device unless you move the file yourself.</p>' +
    '<div class="actions"><button type="button" class="btn btn-quiet" id="vm-save" disabled>Save my machine</button><button type="button" class="btn btn-quiet" id="vm-resume" hidden>Resume my saved machine</button><button type="button" class="btn btn-quiet" id="vm-dl" hidden>Download the save file</button><button type="button" class="btn btn-quiet" id="vm-delsave" hidden>Delete the save</button></div>' +
    '<label class="field"><span>Load a save file</span><input type="file" id="vm-file" accept=".mvm"></label><p class="small" id="vm-savemsg" role="status" aria-live="polite"></p></details>' +
    '</div></div>' +
    '<p class="actions">' + (nxt ? '<a class="btn btn-quiet" href="#/linux/' + e(nxt.id) + '">Next lab: ' + e(nxt.title) + '</a>' : '') + '<a class="btn btn-quiet" href="#/linux">All Linux labs</a></p></div>';
  view.after = function () {
    var mach = null, started = false, st = $('#vm-status'), savedRec = null;
    function say(t) { if (st) st.textContent = t; }
    function showFail(err) {
      var box = $('#vm-fail'); if (!box) return; var msg = err && err.message ? err.message : String(err || 'unknown error'), wasm = typeof WebAssembly === 'object';
      box.hidden = false;
      box.innerHTML = '<h2>The machine could not start</h2><p>Your progress is safe. Nothing was lost.</p><b>Try these, in order</b><ol><li>Close other tabs, then press Start again.</li><li>Use the simulated terminal instead. It needs far less memory.</li><li>Open MARGA in a desktop browser. Phones and older tablets often cannot run the real machine.</li></ol>' +
        '<ul class="vm-fail-facts"><li><span>WebAssembly</span><strong>' + (wasm ? 'Supported' : 'Not supported') + '</strong></li><li><span>Browser memory hint</span><strong>' + (navigator.deviceMemory ? 'about ' + navigator.deviceMemory + ' GB' : 'not reported') + '</strong></li></ul>' +
        '<pre class="vm-fail-err" tabindex="0">' + e(msg) + '</pre>' +
        '<p class="actions"><button type="button" class="btn btn-primary" id="vm-retry">Start again</button><a class="btn btn-quiet" href="#/terminal-labs/linux">Use the simulated terminal</a><button type="button" class="btn btn-quiet" id="vm-copyerr">Copy the error to report it</button></p>';
      var r = $('#vm-retry'); if (r) r.addEventListener('click', function () { box.hidden = true; var sbtn = $('#vm-start'); if (sbtn) sbtn.click(); });
      var c = $('#vm-copyerr'); if (c) c.addEventListener('click', function () { var t = 'MARGA machine error: ' + msg + ' | ' + navigator.userAgent; (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { c.textContent = 'Copied'; }, function () { c.textContent = 'Select the error above and copy it'; }); });
      var h = box.querySelector('h2'); if (h) { h.tabIndex = -1; h.focus(); }
    }
    function saymsg(t) { var m = $('#vm-savemsg'); if (m) m.textContent = t; }
    function showHints() {
      var n = Math.min(bag().h[x.id] || 0, x.hints.length), box = $('#vm-hints'); if (!box) return;
      box.innerHTML = n ? '<h2 class="sub-h">Hints</h2><ol>' + x.hints.slice(0, n).map(function (h) { return '<li>' + e(h) + '</li>'; }).join('') + '</ol>' : '';
      var hb = $('#vm-hint'); if (hb) { hb.textContent = n >= x.hints.length ? 'No more hints' : 'Show a hint (' + n + ' of ' + x.hints.length + ' shown)'; hb.disabled = n >= x.hints.length; }
    }
    if (!sb) showHints();
    /* ---- "Why did that work?" */
    function showWhy() {
      var w = x.why, box = $('#vm-why'); if (!w || !box) return;
      if (!isDone(x.id)) { box.innerHTML = ''; return; }
      var prev = bag().why[x.id];
      box.innerHTML = '<h2 class="sub-h" id="vm-why-h">Why did that work?</h2><form id="vm-whyform" aria-labelledby="vm-why-h"><fieldset><legend>' + e(w.q) + '</legend>' +
        w.o.map(function (o, i) { return '<label class="vm-opt"><input type="radio" name="why" value="' + i + '"' + (prev && prev.c === i ? ' checked' : '') + '> <span>' + e(o) + '</span></label>'; }).join('') +
        '</fieldset><div class="actions"><button type="submit" class="btn btn-quiet" id="vm-why-go">Check my answer</button></div></form><div id="vm-whyout" role="status" aria-live="polite"></div>';
      function verdict(c) { var ok = c === w.a; $('#vm-whyout').innerHTML = '<p class="' + (ok ? 'diy-pass' : 'diy-fail') + '"><strong>' + (ok ? 'Right.' : 'Not quite.') + '</strong> ' + e(w.x) + '</p>'; return ok; }
      if (prev) verdict(prev.c);
      $('#vm-whyform').addEventListener('submit', function (ev) {
        ev.preventDefault(); var r = $('input[name="why"]:checked', this);
        if (!r) { $('#vm-whyout').innerHTML = '<p class="diy-fail">Choose an answer first.</p>'; return; }
        var c = +r.value, ok = verdict(c); bag().why[x.id] = { c: c, ok: ok, t: Date.now() }; A.save();
      });
    }
    function solved() {
      bag().ok[x.id] = Date.now(); if (!bag().done[x.id]) { bag().done[x.id] = Date.now(); A.toast('Solved: ' + x.title); } A.save();
      var p = $('#vm-progress'); if (p) p.textContent = doneCount() + ' of ' + SC.length + ' solved'; showWhy();
    }
    showWhy();
    /* ---- the machine */
    function begin(saved) {
      if (started) return; started = true;
      var b = $('#vm-start'); b.disabled = true; say(saved ? 'Loading the emulator and restoring your saved machine.' : 'Loading the emulator and the machine. This takes a few seconds.');
      $('#vm-term').hidden = false; var kb = $('#vm-keys'); if (kb) kb.hidden = false;
      mach = Machine(x.id, $('#vm-term'), {
        ready: function (restored) {
          say(restored ? 'Your saved machine is running again. Carry on where you stopped.' : dg ? 'The machine is running. Look around with real commands, then submit your diagnosis.' : sb ? 'The machine is running. Type commands in the terminal.' : 'The machine is running. Fix the problem, then press Check my work.');
          var c = $('#vm-check'); if (c) c.disabled = false; var r = $('#vm-reset'); if (r) r.disabled = false; var sv = $('#vm-save'); if (sv) sv.disabled = false; b.textContent = 'Machine running';
          if (mach && mach.term) mach.term.focus();
        },
        failed: function (err) { if (mach) mach.stop(); mach = null; started = false; $('#vm-term').innerHTML = ''; b.disabled = false; say('The machine could not start.'); showFail(err); }
      }, saved);
      mach.start().catch(function (err) { started = false; b.disabled = false; say('The machine could not start in this browser.'); showFail(err); });
    }
    function stopMachine() { if (mach) mach.stop(); mach = null; started = false; $('#vm-term').innerHTML = ''; $('#vm-result').innerHTML = ''; var rs = $('#vm-reset'); if (rs) rs.disabled = true; var c = $('#vm-check'); if (c) c.disabled = true; var sv = $('#vm-save'); if (sv) sv.disabled = true; var b = $('#vm-start'); b.textContent = 'Start the machine'; b.disabled = false; }
    $('#vm-start').addEventListener('click', function () { begin(null); });
    var kb = $('#vm-keys'); if (kb) kb.addEventListener('click', function (ev) { var b = ev.target.closest('button[data-k]'); if (b && mach) mach.type(KEYS[+b.getAttribute('data-k')][1]); });
    var vc = $('#vm-cheat'); if (vc) vc.addEventListener('click', function (ev) { var b = ev.target.closest('button[data-vc]'); if (b && mach && mach.ready) mach.type(b.getAttribute('data-vc')); else if (b) say('Start the machine first, then press a command to type it.'); });
    var rs = $('#vm-reset'); if (rs) rs.addEventListener('click', function () { stopMachine(); begin(null); });
    document.addEventListener('click', function vmx(ev) {
      if (!$('#vm-term')) { document.removeEventListener('click', vmx); return; }
      var t = ev.target && ev.target.id;
      if (t === 'vm-again') { stopMachine(); begin(null); say('The fault is back in a fresh machine. Fix it again without looking at the solution.'); }
      if (t === 'vm-replay' && mach && x.fix && !x.replaying) {
        x.replaying = true; var cmds = x.fix.slice(), quick = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        say('Typing the fix into the machine. Watch the terminal.');
        (function next() {
          if (!cmds.length || !mach) { x.replaying = false; say('Done. Press Check my work.'); return; }
          var line = cmds.shift(), i = 0;
          (function ch() { if (!mach) { x.replaying = false; return; } if (i < line.length) { mach.type(line[i++]); setTimeout(ch, quick ? 0 : 35); } else { setTimeout(function () { if (mach) mach.type('\r'); setTimeout(next, quick ? 600 : 1800); }, quick ? 0 : 400); } }());
        }());
      }
    });
    window.addEventListener('resize', onResize); function onResize() { if (mach && mach.refit) mach.refit(); }
    /* ---- check (fix labs) */
    var ck = $('#vm-check');
    if (ck) ck.addEventListener('click', function () {
      if (!mach) return; ck.disabled = true; say('Checking inside the machine...');
      mach.check().then(function (rows) {
        var ok = rows.length > 0 && rows.every(function (r) { return r.ok; });
        $('#vm-result').innerHTML = '<h2 class="sub-h">Check result</h2><ul class="vm-checks">' + rows.map(function (r) { return '<li class="' + (r.ok ? 'pass' : 'fail') + '"><strong>' + (r.ok ? 'Pass' : 'Not yet') + '</strong> ' + e(r.text) + '</li>'; }).join('') + '</ul>' +
          (ok ? '<p><strong>Solved.</strong> ' + (nxt ? '<a href="#/linux/' + e(nxt.id) + '">Try the next lab</a>.' : 'That is the last lab.') + '</p><p class="actions"><button type="button" class="btn btn-quiet" id="vm-again">Break it again</button>' + (x.fix ? '<button type="button" class="btn btn-quiet" id="vm-replay">Watch the fix typed in</button>' : '') + '</p>' : '<p class="small">Keep going. Read each line above, or open a hint.</p>');
        if (ok) solved();
        say(ok ? 'All ' + rows.length + ' checks pass.' : rows.filter(function (r) { return r.ok; }).length + ' of ' + rows.length + ' checks pass.'); ck.disabled = false;
      }, function (err) { say(err && err.message ? err.message : 'The check failed.'); ck.disabled = false; });
    });
    /* ---- submit a diagnosis (diagnose-only labs) */
    var sub = $('#vm-submit');
    if (sub) {
      var go = function () {
        var r = window.MargaChallengeCore.grade({ kind: 'answer', accept: x.accept || [], ci: true }, $('#vm-ans').value);
        if (r.ok) { $('#vm-result').innerHTML = '<h2 class="sub-h">Diagnosis</h2><p class="diy-pass"><strong>Correct.</strong> ' + e(x.answer || '') + '. ' + (nxt ? '<a href="#/linux/' + e(nxt.id) + '">Try the next lab</a>.' : '') + '</p>'; say('Correct diagnosis.'); solved(); }
        else { $('#vm-result').innerHTML = '<h2 class="sub-h">Diagnosis</h2><p class="diy-fail"><strong>Not yet.</strong> ' + e(r.fails[0] || 'That is not the cause.') + ' Look again in the machine, or open a hint.</p>'; say('Not yet.'); }
      };
      sub.addEventListener('click', go); $('#vm-ans').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); go(); } });
    }
    var hb = $('#vm-hint'); if (hb) hb.addEventListener('click', function () { var b = bag(); b.h[x.id] = Math.min((b.h[x.id] || 0) + 1, x.hints.length); A.save(); showHints(); });
    var sbtn = $('#vm-sol'); if (sbtn) sbtn.addEventListener('click', function () { $('#vm-solbox').innerHTML = '<h2 class="sub-h">' + (dg ? 'The answer and how to find it' : 'One way to solve it') + '</h2><pre class="code-block"><code>' + e(x.solution) + '</code></pre>' + (dg ? '' : '<p class="small">There are other correct ways. Press Check to see if yours works.</p>'); sbtn.disabled = true; });
    /* ---- save my machine */
    function paintSave() {
      var has = !!savedRec;
      var r = $('#vm-resume'), d = $('#vm-dl'), del = $('#vm-delsave'); if (r) r.hidden = !has; if (d) d.hidden = !has; if (del) del.hidden = !has;
      if (has) saymsg('A saved machine is in this browser: ' + clock(savedRec.t) + ', ' + megabytes(savedRec.data.byteLength) + '.');
    }
    function loadSaved() { return dbGet(saveKey).then(function (rec) { savedRec = rec && rec.data ? rec : null; paintSave(); }, function () { savedRec = null; }); }
    loadSaved();
    function usable(rec) { if (!rec) return 'There is no saved machine.'; if ((rec.ver || '') !== VM_VQ) return 'That save was made by an older version of the lab and cannot be resumed.'; return ''; }
    function resume(rec) {
      var bad = usable(rec); if (bad) { saymsg(bad); return; }
      saymsg('Restoring...'); if (mach) stopMachine();
      unpackState(rec).then(function (buf) { begin(buf); saymsg('Restoring your saved machine. This takes a few seconds.'); }, function () { saymsg('That save could not be read.'); });
    }
    var sv = $('#vm-save'); if (sv) sv.addEventListener('click', function () {
      if (!mach) return; sv.disabled = true; saymsg('Saving the machine...');
      mach.save().then(function (buf) { var raw = buf.byteLength; return packState(buf).then(function (p) { return { id: saveKey, t: Date.now(), z: p.z, ver: VM_VQ, size: raw, data: p.data }; }); })
        .then(function (rec) { savedRec = rec; return dbPut(saveKey, rec).then(function () { paintSave(); saymsg('Saved: ' + clock(rec.t) + ', ' + megabytes(rec.data.byteLength) + '. Resume it from this page whenever you like.'); }, function (err) { paintSave(); saymsg((err && err.message ? err.message : 'The browser would not keep it.') + ' You can still download the save file.'); }); })
        .catch(function (err) { saymsg(err && err.message ? err.message : 'The machine could not be saved.'); }).then(function () { if (mach) sv.disabled = false; });
    });
    var rb = $('#vm-resume'); if (rb) rb.addEventListener('click', function () { resume(savedRec); });
    var dl = $('#vm-dl'); if (dl) dl.addEventListener('click', function () {
      if (!savedRec) return; var url = URL.createObjectURL(toFile(savedRec)), a = document.createElement('a'); a.href = url; a.download = 'marga-' + saveKey + '.mvm'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 4000); saymsg('The save file is downloading.');
    });
    var dd = $('#vm-delsave'); if (dd) dd.addEventListener('click', function () { dbDel(saveKey).then(function () { savedRec = null; paintSave(); ['#vm-resume', '#vm-dl', '#vm-delsave'].forEach(function (q) { var b = $(q); if (b) b.hidden = true; }); saymsg('The save was deleted.'); }, function () { saymsg('The save could not be deleted.'); }); });
    var fi = $('#vm-file'); if (fi) fi.addEventListener('change', function () {
      var f = fi.files && fi.files[0]; if (!f) return;
      f.arrayBuffer().then(function (buf) {
        var rec = fromFile(buf);
        if (rec.id !== saveKey) { saymsg('That save belongs to the lab "' + rec.id + '". Open that lab and load it there.'); return; }
        rec.size = rec.size || 0; savedRec = rec; dbPut(saveKey, rec).catch(function () { /* the file still works for this visit */ });
        paintSave(); resume(rec);
      }).catch(function (err) { saymsg(err && err.message ? err.message : 'That file could not be read.'); }).then(function () { fi.value = ''; });
    });
    view.cleanup = function () { window.removeEventListener('resize', onResize); if (mach) mach.stop(); mach = null; };
  };
}

A.addRoute(/^\/linux(?:\?(.*))?$/, indexView);
A.addRoute(/^\/linux\/([a-z0-9-]+)$/, labView);
};
