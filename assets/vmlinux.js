/* MARGA real Linux lab: a real Linux kernel running inside the page (v86 emulator, a small 32-bit kernel and BusyBox).
   Each scenario breaks something on purpose. You fix it in a real shell, then press Check. The checks run inside the machine and read its
   actual state (files, processes, mounts, ports). Nothing is sent anywhere. The files load only when you start a lab, then stay in the browser cache. */
var VM_VQ = (function () { try { var s = document.currentScript && document.currentScript.src; return s && s.indexOf('?') > 0 ? s.slice(s.indexOf('?')) : ''; } catch (x) { return ''; } }());
window.MargaLinux = function (A) {
'use strict';
var $ = A.$, $$ = A.$$, e = A.e, view = A.view, D = A.D, SC = D.vmlabs || [];
var LEVEL_ORDER = ['Beginner', 'Intermediate', 'Advanced'];

function bag() { var s = A.state(); if (!s.vm || typeof s.vm !== 'object' || Array.isArray(s.vm)) s.vm = {}; if (!s.vm.done || typeof s.vm.done !== 'object') s.vm.done = {}; if (!s.vm.h || typeof s.vm.h !== 'object') s.vm.h = {}; if (!s.vm.ok || typeof s.vm.ok !== 'object') s.vm.ok = {}; return s.vm; }
function find(id) { for (var i = 0; i < SC.length; i++) if (SC[i].id === id) return SC[i]; return null; }
function isDone(id) { return !!bag().done[id]; }
function doneCount() { return SC.filter(function (x) { return isDone(x.id); }).length; }
A.vmLabs = { list: function () { return SC.slice(); }, done: isDone, find: find, view: function (id) { return labView(id); } };

var BANNER = '<p class="tl-warn" role="note"><strong>This is a real Linux kernel, but a small one.</strong> It runs inside your browser with BusyBox tools. There is no systemd, no package manager and no internet. The machine starts fresh each time, and every check reads the machine\'s real state.</p>';

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
function Machine(id, host, hooks) {
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
        uart1: true, autostart: true, disable_keyboard: true, disable_mouse: true, disable_speaker: true
      });
      var seen = '', stage = 0, PROMPT = /marga-lab:[^\n]*[$#] $/;
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
  m.stop = function () { m.stopped = true; if (m.raf) cancelAnimationFrame(m.raf); try { m.em && m.em.destroy(); } catch (x) { /* ignore */ } try { m.term && m.term.dispose(); } catch (x2) { /* ignore */ } m.em = null; m.term = null; };
  return m;
}

/* ---------------------------------------------------------------- index */
function row(x) {
  var lesson = x.lesson && A.LES[x.lesson] ? A.LES[x.lesson] : null;
  return '<li class="tl-item"><div><h3><a href="#/linux/' + e(x.id) + '">' + e(x.title) + '</a></h3><p>' + e(x.story) + '</p>' +
    '<p class="small">' + e(x.level) + ' | ' + x.minutes + ' min' + (lesson ? ' | Goes with the lesson <a href="' + A.hrefLesson(x.lesson) + '">' + e(lesson.title) + '</a>' : '') + '</p></div>' +
    '<span class="chip' + (isDone(x.id) ? ' pass' : '') + '">' + (isDone(x.id) ? 'Solved' : 'Not solved') + '</span></li>';
}
function indexView() {
  view.title = 'Real Linux lab | MARGA by EknathaLabs'; view.nav = 'practice'; view.after = null; view.cleanup = null; view.voice = '';
  var groups = LEVEL_ORDER.map(function (lv) { var xs = SC.filter(function (x) { return x.level === lv; }); return xs.length ? '<h2 class="sub-h">' + e(lv) + '</h2><ul class="tl-list">' + xs.map(row).join('') + '</ul>' : ''; }).join('');
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Real Linux lab</h1>' +
    '<p class="lede">A real Linux machine inside your browser. Something is broken. Find it with real commands, fix it, and press Check. ' + SC.length + ' scenarios, free, no sign-up, nothing leaves your device.</p>' +
    '<p class="small" id="vm-progress">' + doneCount() + ' of ' + SC.length + ' solved</p></section>' +
    '<div class="wrap narrow vm-index">' + BANNER +
    '<p class="small">The first start downloads about 5 MB (the emulator, a small kernel and the tools). After that the lab works offline. It needs a recent desktop or phone browser with WebAssembly.</p>' +
    '<p class="actions"><a class="btn btn-primary" href="#/linux/sandbox">Open an empty machine</a> <a class="btn btn-quiet" href="#/terminal-labs">Simulated terminal labs</a></p>' + groups + '</div>';
}

/* ---------------------------------------------------------------- one lab */
var KEYS = [['Tab', '\t'], ['Ctrl+C', '\x03'], ['Ctrl+D', '\x04'], ['Esc', '\x1b'], ['Up', '\x1b[A'], ['Down', '\x1b[B'], ['Left', '\x1b[D'], ['Right', '\x1b[C'], ['|', '|'], ['/', '/'], ['-', '-'], ['~', '~']];
function labView(id) {
  var sb = id === 'sandbox', x = sb ? { id: 'none', title: 'Empty machine', level: 'Beginner', minutes: 10, lesson: '', story: 'A clean Linux machine to explore. Nothing is broken and nothing is checked.', goals: [], hints: [], solution: '' } : find(id);
  view.cleanup = null; view.after = null; view.voice = ''; view.nav = 'practice';
  if (!x) { view.title = 'Lab not found | MARGA'; view.html = '<section class="page-head wrap"><h1>That lab does not exist</h1><p class="lede"><a href="#/linux">See all Linux labs</a>.</p></section>'; return; }
  view.title = x.title + ' | Real Linux lab | MARGA by EknathaLabs';
  var lesson = x.lesson && A.LES[x.lesson] ? A.LES[x.lesson] : null, idx = SC.indexOf(x), nxt = !sb && idx >= 0 && SC[idx + 1] ? SC[idx + 1] : null;
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/linux">Real Linux lab</a></nav><h1>' + e(x.title) + '</h1><p class="lede">' + e(x.story) + '</p>' +
    '<p class="small">' + e(x.level) + ' | about ' + x.minutes + ' minutes' + (lesson ? ' | Goes with the lesson <a href="' + A.hrefLesson(x.lesson) + '">' + e(lesson.title) + '</a>' : '') + '</p></section>' +
    '<div class="wrap vm">' + BANNER +
    (x.goals.length ? '<h2 class="sub-h">Goals</h2><ul class="vm-goals">' + x.goals.map(function (g) { return '<li>' + e(g) + '</li>'; }).join('') + '</ul>' : '') +
    '<div class="actions vm-bar"><button type="button" class="btn btn-primary" id="vm-start">Start the machine</button>' +
    (sb ? '' : '<button type="button" class="btn btn-quiet" id="vm-check" disabled>Check my work</button><button type="button" class="btn btn-quiet" id="vm-hint">Show a hint</button><button type="button" class="btn btn-quiet" id="vm-sol">Show the solution</button>') +
    '<button type="button" class="btn btn-quiet" id="vm-reset" disabled>Restart the machine</button></div>' +
    '<p class="small" id="vm-status" role="status" aria-live="polite">The machine is off. Press Start. The first start downloads about 5 MB.</p>' +
    '<div id="vm-term" class="vm-term" hidden></div>' +
    '<div class="vm-keys" id="vm-keys" hidden>' + KEYS.map(function (k, i) { return '<button type="button" class="btn btn-quiet" data-k="' + i + '" aria-label="Send ' + e(k[0]) + '">' + e(k[0]) + '</button>'; }).join('') + '</div>' +
    '<div id="vm-result" class="vm-result" role="status" aria-live="polite"></div>' +
    '<div id="vm-hints" class="vm-hints"></div><div id="vm-solbox"></div>' +
    '<p class="actions">' + (nxt ? '<a class="btn btn-quiet" href="#/linux/' + e(nxt.id) + '">Next lab: ' + e(nxt.title) + '</a>' : '') + '<a class="btn btn-quiet" href="#/linux">All Linux labs</a></p></div>';
  view.after = function () {
    var mach = null, started = false, st = $('#vm-status');
    function say(t) { if (st) st.textContent = t; }
    function showHints() {
      var n = Math.min(bag().h[x.id] || 0, x.hints.length), box = $('#vm-hints'); if (!box) return;
      box.innerHTML = n ? '<h2 class="sub-h">Hints</h2><ol>' + x.hints.slice(0, n).map(function (h) { return '<li>' + e(h) + '</li>'; }).join('') + '</ol>' : '';
      var hb = $('#vm-hint'); if (hb) { hb.textContent = n >= x.hints.length ? 'No more hints' : 'Show a hint (' + n + ' of ' + x.hints.length + ' shown)'; hb.disabled = n >= x.hints.length; }
    }
    if (!sb) showHints();
    function begin() {
      if (started) return; started = true;
      var b = $('#vm-start'); b.disabled = true; say('Loading the emulator and the machine. This takes a few seconds.');
      $('#vm-term').hidden = false; var kb = $('#vm-keys'); if (kb) kb.hidden = false;
      mach = Machine(x.id, $('#vm-term'), { ready: function () {
        say(sb ? 'The machine is running. Type commands in the terminal.' : 'The machine is running. Fix the problem, then press Check my work.');
        var c = $('#vm-check'); if (c) c.disabled = false; var r = $('#vm-reset'); if (r) r.disabled = false; b.textContent = 'Machine running';
        if (mach.term) mach.term.focus();
      } });
      mach.start().catch(function (err) { started = false; b.disabled = false; say(err && err.message ? err.message : 'The machine could not start in this browser.'); });
    }
    $('#vm-start').addEventListener('click', begin);
    var kb = $('#vm-keys'); if (kb) kb.addEventListener('click', function (ev) { var b = ev.target.closest('button[data-k]'); if (b && mach) mach.type(KEYS[+b.getAttribute('data-k')][1]); });
    var rs = $('#vm-reset'); if (rs) rs.addEventListener('click', function () { if (mach) mach.stop(); mach = null; started = false; $('#vm-term').innerHTML = ''; $('#vm-result').innerHTML = ''; rs.disabled = true; var c = $('#vm-check'); if (c) c.disabled = true; var b = $('#vm-start'); b.textContent = 'Start the machine'; begin(); });
    window.addEventListener('resize', onResize); function onResize() { if (mach && mach.refit) mach.refit(); }
    var ck = $('#vm-check');
    if (ck) ck.addEventListener('click', function () {
      if (!mach) return; ck.disabled = true; say('Checking inside the machine...');
      mach.check().then(function (rows) {
        var ok = rows.length > 0 && rows.every(function (r) { return r.ok; });
        $('#vm-result').innerHTML = '<h2 class="sub-h">Check result</h2><ul class="vm-checks">' + rows.map(function (r) { return '<li class="' + (r.ok ? 'pass' : 'fail') + '"><strong>' + (r.ok ? 'Pass' : 'Not yet') + '</strong> ' + e(r.text) + '</li>'; }).join('') + '</ul>' +
          (ok ? '<p><strong>Solved.</strong> ' + (nxt ? '<a href="#/linux/' + e(nxt.id) + '">Try the next lab</a>.' : 'That is the last lab.') + '</p>' : '<p class="small">Keep going. Read each line above, or open a hint.</p>');
        if (ok) { bag().ok[x.id] = Date.now(); if (!bag().done[x.id]) { bag().done[x.id] = Date.now(); A.toast('Solved: ' + x.title); } A.save(); var p = $('#vm-progress'); if (p) p.textContent = doneCount() + ' of ' + SC.length + ' solved'; }
        say(ok ? 'All ' + rows.length + ' checks pass.' : rows.filter(function (r) { return r.ok; }).length + ' of ' + rows.length + ' checks pass.'); ck.disabled = false;
      }, function (err) { say(err && err.message ? err.message : 'The check failed.'); ck.disabled = false; });
    });
    var hb = $('#vm-hint'); if (hb) hb.addEventListener('click', function () { var b = bag(); b.h[x.id] = Math.min((b.h[x.id] || 0) + 1, x.hints.length); A.save(); showHints(); });
    var sbtn = $('#vm-sol'); if (sbtn) sbtn.addEventListener('click', function () { $('#vm-solbox').innerHTML = '<h2 class="sub-h">One way to solve it</h2><pre class="code-block"><code>' + e(x.solution) + '</code></pre><p class="small">There are other correct ways. Press Check to see if yours works.</p>'; sbtn.disabled = true; });
    view.cleanup = function () { window.removeEventListener('resize', onResize); if (mach) mach.stop(); mach = null; };
  };
}

A.addRoute(/^\/linux$/, indexView);
A.addRoute(/^\/linux\/([a-z0-9-]+)$/, labView);
};
