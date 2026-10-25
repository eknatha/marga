/* MARGA features: explain-it-like levels, reading mode, predict-then-reveal, clickable diagrams and the daily challenge bonus tasks. */
(function () {
'use strict';
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (x) { /* ignore */ } return null; }

var LV = [['new', 'I am new to this'], ['pro', 'A practitioner'], ['int', 'In an interview']];
function level() { var v = store('ea.level'); return v === 'new' || v === 'int' ? v : 'pro'; }
function levelBody(l, v) {
  if (v === 'new') return '<p><strong>In plain words.</strong> ' + esc(l.lv.s) + '</p><p class="small">The full lesson below goes step by step.</p>';
  if (v === 'int') return '<p><strong>A strong short answer.</strong> ' + esc(l.lv.i) + '</p><p class="small">Practise saying it aloud, then try the <a href="#/interview">InterviewHub</a> questions for this stage.</p>';
  return '<p>The full lesson below is written for people who will run this in production. Use the other two views for a quick analogy or an interview-ready summary.</p>';
}
function levelsHtml(l) {
  if (!l || !l.lv) return '';
  var v = level();
  return '<section class="levels" aria-labelledby="lv-h" data-lesson="' + esc(l.id) + '"><h2 id="lv-h" class="levels-h">Explain it to me like...</h2>' +
    '<div class="seg" role="group" aria-label="Explanation level">' + LV.map(function (x) { return '<button type="button" class="seg-b" data-act="lv-set" data-lv="' + x[0] + '" aria-pressed="' + (x[0] === v) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<div class="levels-body" id="lv-body" aria-live="polite">' + levelBody(l, v) + '</div></section>';
}
window.MargaFeatures = function (A) {
  var D = A.D, $ = A.$, $$ = A.$$, e = A.e, view = A.view;
  window.MargaFeatures.levelsHtml = levelsHtml;

  A.onAct('lv-set', function (b) {
    var v = b.getAttribute('data-lv'), sec = b.closest('.levels'), l = A.LES[sec.getAttribute('data-lesson')];
    if (!l || !l.lv) return;
    store('ea.level', v);
    $$('.seg-b', sec).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $('#lv-body', sec).innerHTML = levelBody(l, v);
  });

  function readOn() { return document.documentElement.getAttribute('data-a-read') === 'on'; }
  function syncRead() { $$('[data-act=read-toggle]').forEach(function (b) { b.setAttribute('aria-pressed', String(readOn())); b.textContent = readOn() ? 'Leave reading mode' : 'Reading mode'; }); if (window.MargaA11y) MargaA11y.sync(); bar(); }
  A.onAct('read-toggle', function () { if (!window.MargaA11y) return; MargaA11y.set('read', readOn() ? 'off' : 'on'); syncRead(); A.toast(readOn() ? 'Reading mode is on. Change it in the Aa panel.' : 'Reading mode is off.'); });
  function bar() {
    var b = $('#read-bar');
    if (!readOn()) { if (b) b.remove(); return; }
    if (!b) { b = document.createElement('div'); b.id = 'read-bar'; b.setAttribute('aria-hidden', 'true'); b.innerHTML = '<i></i>'; document.body.appendChild(b); }
    upd();
  }
  function upd() { var b = $('#read-bar i'); if (!b) return; var h = document.documentElement, max = h.scrollHeight - h.clientHeight; b.style.width = (max > 0 ? Math.min(100, Math.round(h.scrollTop / max * 100)) : 0) + '%'; }
  window.addEventListener('scroll', upd, { passive: true });
  document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'a11y-read') setTimeout(syncRead, 0); });

  A.onAct('predict-reveal', function (b) {
    var box = b.closest('.predict'), out = $('.predict-out', box), open = out.hidden;
    out.hidden = !open; b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'Hide the answer' : 'Reveal the answer';
  });

  A.onAct('dg-pick', function (b) {
    var fig = b.closest('.dg'), id = b.getAttribute('data-id'), item = null;
    $$('.dg-node', fig).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    $$('.dg-item', fig).forEach(function (x) { var on = x.getAttribute('data-id') === id; x.classList.toggle('on', on); if (on) item = x; });
    if (!item) return;
    $('.dg-live', fig).innerHTML = '<p><strong>' + e($('dt', item).textContent) + '</strong></p>' + $$('dd', item).map(function (d) { return '<p>' + d.innerHTML + '</p>'; }).join('');
  });

  /* daily challenge bonus tasks: a drill and a predict item, the same for everyone on the same date */
  function hashKey(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0); }
  function todayKey() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function drillBonus(d) {
    var opts = A.shuffle(d.options.slice());
    return '<article class="drill" id="drill-' + e(d.id) + '" data-id="' + e(d.id) + '"><h3>' + e(d.title) + '</h3><p>' + e(d.story) + '</p>' +
      '<pre class="evidence" tabindex="0" aria-label="Evidence"><code>' + e(d.evidence) + '</code></pre>' +
      '<fieldset class="drill-q"><legend>' + e(d.q) + '</legend>' + opts.map(function (o) { return '<label class="opt-r"><input type="radio" name="dq-' + e(d.id) + '" value="' + (o.ok ? '1' : '0') + '"> <span>' + e(o.t) + '</span></label>'; }).join('') + '</fieldset>' +
      '<div class="actions"><button type="button" class="btn btn-primary" data-act="drill-check">Check answer</button></div><div class="drill-res" role="status" aria-live="polite" hidden></div></article>';
  }
  function predictBonus(p) {
    return '<div class="predict"><p class="predict-q"><strong>Predict first.</strong> ' + e(p.q) + '</p>' + (p.shown ? '<pre class="predict-code" tabindex="0"><code>' + e(p.shown) + '</code></pre>' : '') +
      '<label class="predict-l">Your guess<textarea rows="2" class="predict-guess" placeholder="Type what you expect, then reveal the answer."></textarea></label>' +
      '<button type="button" class="btn btn-primary" data-act="predict-reveal" aria-expanded="false">Reveal the answer</button>' +
      '<div class="predict-out" hidden><p class="predict-ans"><strong>Answer:</strong> ' + e(p.out) + '</p>' + (p.why ? '<p>' + e(p.why) + '</p>' : '') + '<p class="small">From the lesson <a href="' + A.hrefLesson(p.lesson) + '">' + e((A.LES[p.lesson] || {}).title || '') + '</a>.</p></div></div>';
  }


  /* ---------------------------------------------------------- About page */
  A.addRoute(/^\/about$/, function () {
    view.title = 'About | MARGA by EknathaLabs'; view.nav = 'about';
    view.html = '<section class="page-head wrap"><h1>About the Author</h1></section>' +
      '<div class="wrap narrow prose about">' +
      '<p><strong>Eknatha Reddy Puli</strong> is a Senior Platform Engineer and SRE with over 14 years of experience managing enterprise infrastructure, Linux environments, and critical virtualization layers. <a href="https://www.linkedin.com/in/eknathareddypuli/" target="_blank" rel="noopener noreferrer">Connect on LinkedIn</a>.</p>' +
      '<p>MARGA, part of the EknathaLabs ecosystem, was born out of a simple mission: to make world-class DevOps and SRE education free and accessible to everyone globally. Every lesson, playground task, and troubleshooting drill on this platform is forged from real-world production incidents and complex data migrations, not vendor slides.</p>' +
      '<h2>Our Commitment: A Pure Global Public Good</h2>' +
      '<p class="about-pledge"><strong>Free forever · No login · No ads · No cookies</strong></p>' +
      '<p>Most ed-tech platforms lock real troubleshooting tools behind paywalls, leaving self-directed learners in emerging markets at a massive disadvantage. MARGA changes that.</p>' +
      '<p>We do not collect your data, we do not track your habits, and we do not sell ads. The platform is designed from the ground up to be an open, serverless engineering laboratory that scales effortlessly to millions of students worldwide. We believe the tech industry thrives when knowledge is shared transparently, not gatekept.</p>' +
      '<h2>Privacy-First, Offline-Resilient Progress</h2>' +
      '<p>Because we use no tracking scripts and require zero account sign-ups, your curriculum checkpoints, playground status indicators, and completed Skill Tree nodes are saved securely on your device using your browser\'s local storage (localStorage). Your data never leaves your computer. You can cache the core tracks, step away from the internet, and practice deep infrastructure triage completely offline, anytime, anywhere.</p>' +
      '<p>Education should be a human right, not a subscription tier. MARGA is our contribution to empowering the next generation of global infrastructure engineers, completely free.</p>' +
      '</div>';
    view.after = null;
  });

  /* ---------------------------------------------------------- weak spots: what you missed comes back */
  function wk() { var st = A.state(); if (!st.wk || typeof st.wk !== 'object' || Array.isArray(st.wk)) st.wk = {}; return st.wk; }
  function note(kind, key, ok) {
    var w = wk(), id = kind + ':' + key;
    if (ok) { if (w[id]) delete w[id]; else return; }
    else { var prev = w[id] || { n: 0 }; w[id] = { k: kind, r: key, n: prev.n + 1, at: Date.now() }; }
    A.save();
  }
  window.MargaFeatures.note = note;
  window.MargaFeatures.weakCount = function () { return Object.keys(wk()).length; };
  function resolve(it) {
    if (it.k === 'q') {
      var p = it.r.split('#'), l = A.LES[p[0]], q = l && l.quiz[Number(p[1])];
      return q ? { kind: 'q', title: q.q, from: l.title, opts: q.options.map(function (o, i) { return { t: o, ok: i === q.answer }; }), why: q.why, href: A.hrefLesson(p[0]) } : null;
    }
    if (it.k === 'd') {
      var d = (D.drills || []).filter(function (x) { return x.id === it.r; })[0];
      return d ? { kind: 'd', title: d.q, from: d.title, story: d.story, evidence: d.evidence, opts: d.options.map(function (o) { return { t: o.t, ok: !!o.ok }; }), why: d.why, href: '#/drills/' + d.module } : null;
    }
    if (it.k === 'c') {
      var c = it.r.split('#'), ls = A.LES[c[0]], cd = ls && ls.cards[Number(c[1])];
      return cd ? { kind: 'c', title: cd.f, from: ls.title, back: cd.b, href: A.hrefLesson(c[0]) } : null;
    }
    return null;
  }
  var KIND = { q: 'Lesson question', d: 'Troubleshooting drill', c: 'Flashcard' };
  var WS = null;
  function weakItems() {
    var w = wk(), out = [];
    Object.keys(w).forEach(function (id) { var r = resolve(w[id]); if (r) { r.id = id; r.k = w[id].k; r.rk = w[id].r; r.n = w[id].n; out.push(r); } else delete w[id]; });
    return out.sort(function (a, b) { return b.n - a.n; });
  }
  function weakView() {
    view.title = 'Weak-spot review | MARGA by EknathaLabs'; view.nav = 'practice';
    var items = weakItems(), by = { q: 0, d: 0, c: 0 };
    items.forEach(function (x) { by[x.k]++; });
    view.html = '<section class="page-head wrap"><h1>Weak-spot review</h1><p class="lede">Quiz questions, drills and flashcards you got wrong come back here. Answer one correctly and it leaves the list.</p></section>' +
      '<div class="wrap narrow" id="weak-root">' + (items.length
        ? '<p id="weak-count"><strong>' + items.length + '</strong> to review: ' + by.q + ' lesson question' + (by.q === 1 ? '' : 's') + ', ' + by.d + ' drill' + (by.d === 1 ? '' : 's') + ', ' + by.c + ' flashcard' + (by.c === 1 ? '' : 's') + '.</p>' +
          '<div class="actions"><button type="button" class="btn btn-primary" data-act="weak-start">Start a review of up to 10</button></div>'
        : '<div class="empty"><h3>No weak spots yet</h3><p>Miss a lesson question, a drill or a flashcard and it shows up here. Nothing to catch up on right now.</p><p><a class="btn btn-primary" href="#/practice">Back to practice</a></p></div>') + '</div>';
    view.after = null;
  }
  A.addRoute(/^\/weak$/, weakView);
  A.onAct('weak-start', function () {
    var list = A.shuffle(weakItems()).slice(0, 10);
    WS = { list: list, pos: 0, cleared: 0, again: 0 };
    weakAsk();
  });
  function weakAsk() {
    var root = $('#weak-root'); if (!root) return;
    if (WS.pos >= WS.list.length) {
      root.innerHTML = '<div class="result pass"><h3>Review finished</h3><p>' + WS.cleared + ' cleared, ' + WS.again + ' still weak. ' + (WS.again ? 'They stay on the list for next time.' : 'Nice work.') + '</p><div class="actions"><a class="btn btn-primary" href="#/weak">Check the list</a><a class="btn btn-quiet" href="#/practice">Back to practice</a></div></div>';
      return;
    }
    var it = WS.list[WS.pos], head = '<div class="qprog" aria-hidden="true"><i style="width:' + (WS.pos / WS.list.length * 100) + '%"></i></div><p class="qcount">' + KIND[it.k] + ' ' + (WS.pos + 1) + ' of ' + WS.list.length + ' <span class="small">from ' + e(it.from) + '</span></p>';
    if (it.k === 'c') {
      root.innerHTML = head + '<button type="button" class="card" id="wcard"><span class="side">Question</span><span class="txt">' + e(it.title) + '</span><span class="hint">Select to show the answer</span></button>' +
        '<div class="rate" id="wrate" hidden><button class="btn btn-quiet" type="button" data-act="weak-card" data-r="again">Again</button><button class="btn btn-primary" type="button" data-act="weak-card" data-r="good">Got it</button></div>';
      $('#wcard').addEventListener('click', function () { this.classList.add('back'); this.innerHTML = '<span class="side">Answer</span><span class="txt">' + e(it.back) + '</span>'; $('#wrate').hidden = false; });
      return;
    }
    var opts = A.shuffle(it.opts);
    root.innerHTML = head + (it.story ? '<p>' + e(it.story) + '</p>' : '') + (it.evidence ? '<pre class="evidence" tabindex="0"><code>' + e(it.evidence) + '</code></pre>' : '') + '<h3 class="qtext">' + e(it.title) + '</h3>' +
      '<div class="opts" role="group" aria-label="Answer choices">' + opts.map(function (o, i) { return '<button type="button" class="opt" data-act="weak-pick" data-ok="' + (o.ok ? '1' : '0') + '"><span class="key">' + String.fromCharCode(65 + i) + '</span><span>' + e(o.t) + '</span></button>'; }).join('') + '</div><div class="feedback" id="wfb" aria-live="polite"></div>';
  }
  function weakDone(ok) {
    var it = WS.list[WS.pos];
    note(it.k, it.rk, ok);
    if (ok) WS.cleared++; else WS.again++;
    WS.pos++;
    weakAsk();
  }
  A.onAct('weak-card', function (b) { weakDone(b.getAttribute('data-r') === 'good'); });
  A.onAct('weak-pick', function (b) {
    var root = $('#weak-root'), ok = b.getAttribute('data-ok') === '1', it = WS.list[WS.pos];
    $$('.opt', root).forEach(function (x) { x.disabled = true; if (x.getAttribute('data-ok') === '1') x.classList.add('right'); });
    if (!ok) b.classList.add('wrong');
    $('#wfb').innerHTML = '<p class="' + (ok ? 'ok' : 'bad') + '"><strong>' + (ok ? 'Correct. Removed from your list.' : 'Not quite. It stays on your list.') + '</strong> ' + e(it.why) + '</p><button class="btn btn-primary" type="button" id="wnext">' + (WS.pos === WS.list.length - 1 ? 'Finish' : 'Next') + '</button>';
    var nb = $('#wnext'); nb.focus(); nb.addEventListener('click', function () { weakDone(ok); });
  });

  /* ---------------------------------------------------------- lesson next-step panel */
  var PLAY = { python: 'python', bash: 'python', linux: 'python', terraform: 'hcl', cloud: 'hcl', kubernetes: 'yaml', docker: 'yaml', cicd: 'yaml', security: 'yaml', sre: 'sql', observability: 'sql' };
  var PLAYN = { python: 'Python playground', hcl: 'Terraform playground', yaml: 'YAML playground', sql: 'SQL for SREs playground' };
  function nextPanel() {
    var m = location.hash.match(/^#\/lesson\/([\w-]+)\/([\w-]+)/);
    var old = $('#next-step');
    if (!m) { if (old) old.remove(); return; }
    var id = m[1] + '/' + m[2], l = A.LES[id]; if (!l) return;
    var mod = A.MOD[l.module], i = mod.lessons.indexOf(id), nxt = i < mod.lessons.length - 1 ? mod.lessons[i + 1] : null, done = A.isDone(id);
    var primary;
    if (!done) primary = '<a class="btn btn-primary" href="#" data-jump="check">Take the lesson check</a> <span class="small">Pass it to unlock the next lesson.</span>';
    else if (nxt) primary = '<a class="btn btn-primary" href="' + A.hrefLesson(nxt) + '">Next lesson: ' + e(A.LES[nxt].title) + '</a>';
    else primary = '<a class="btn btn-primary" href="#/module/' + mod.id + '">Stage complete: back to ' + e(mod.title) + '</a>';
    var dr = A.state().dr || {}, rel = [];
    var drill = (D.drills || []).filter(function (x) { return x.module === l.module; }).sort(function (a, b) { return (dr[a.id] && dr[a.id].ok ? 1 : 0) - (dr[b.id] && dr[b.id].ok ? 1 : 0); })[0];
    if (drill) rel.push(['#/drills/' + l.module, 'Troubleshooting drill', drill.title]);
    var ex = (window.MARGA_EXPLAINERS || []).filter(function (x) { return x.module === l.module; })[0];
    if (ex) rel.push(['#/explainers/' + ex.id, 'Animated explainer', ex.title]);
    var pm = (D.arch || []).filter(function (a) { return (a.modules || []).indexOf(l.module) >= 0; })[0];
    if (pm) rel.push(['#/architecture/' + pm.id, 'Post-mortem', pm.title]);
    var iv = (D.interview || []).filter(function (x) { return x.module === l.module; })[0];
    if (iv) rel.push(['#/interview/' + iv.id, 'Interview question', iv.q]);
    rel.push(['#/cheatsheet/' + l.module, 'Cheat sheet', mod.title + ' commands']);
    var pl = PLAY[l.module]; if (pl) rel.push(['#/playground/' + pl, 'Playground', PLAYN[pl]]);
    var wc = Object.keys(wk()).length;
    var html = '<section class="nextstep" id="next-step" aria-labelledby="ns-h"><h2 id="ns-h">What to do next</h2><p class="ns-main">' + primary + '</p>' +
      '<ul class="ns-list">' + rel.slice(0, 5).map(function (r) { return '<li><a href="' + e(r[0]) + '"><span class="ns-k">' + e(r[1]) + '</span><span class="ns-t">' + e(r[2]) + '</span></a></li>'; }).join('') + '</ul>' +
      (wc ? '<p class="small">You have <a href="#/weak">' + wc + ' weak spot' + (wc === 1 ? '' : 's') + '</a> to review.</p>' : '') + '</section>';
    if (old) old.outerHTML = html;
    else { var pager = $('.pager'); if (pager) pager.insertAdjacentHTML('beforebegin', html); }
    var slot = $('#next-slot');
    if (slot && !slot.getAttribute('data-ns') && window.MutationObserver) { slot.setAttribute('data-ns', '1'); new MutationObserver(function () { nextPanel(); }).observe(slot, { childList: true, subtree: true }); }
  }

  A.afterRoute(function () {
    nextPanel();
    syncRead();
    if (!/^#\/daily\/?$/.test(location.hash) || $('#daily-bonus')) return;
    var card = $('#daily-card'); if (!card) return;
    var key = todayKey(), drills = D.drills || [], preds = D.predicts || [], html = '';
    if (drills.length) html += '<h2 class="sub-h">Bonus: drill of the day</h2>' + drillBonus(drills[hashKey(key + 'drill') % drills.length]);
    if (preds.length) html += '<h2 class="sub-h">Bonus: predict it</h2>' + predictBonus(preds[hashKey(key + 'predict') % preds.length]);
    var d = document.createElement('div'); d.id = 'daily-bonus'; d.innerHTML = html; card.parentNode.insertBefore(d, card.nextSibling);
  });
};
})();
