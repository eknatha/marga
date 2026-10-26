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
      '<p class="small">Reuse of this material is welcome with credit. See the <a href="#/license">open content license</a>.</p>' +
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
      return q ? { kind: 'q', stage: A.MOD[l.module].title, title: q.q, from: l.title, opts: q.options.map(function (o, i) { return { t: o, ok: i === q.answer, x: (q.ox || [])[i] || '' }; }), why: q.why, href: A.hrefLesson(p[0]) } : null;
    }
    if (it.k === 'd') {
      var d = (D.drills || []).filter(function (x) { return x.id === it.r; })[0];
      return d ? { kind: 'd', stage: A.MOD[d.module] ? A.MOD[d.module].title : '', title: d.q, from: d.title, story: d.story, evidence: d.evidence, opts: d.options.map(function (o) { return { t: o.t, ok: !!o.ok }; }), why: d.why, href: '#/drills/' + d.module } : null;
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
    if (WS.pos >= WS.list.length && WS.mode === 'mix') {
      root.innerHTML = '<div class="result pass"><h3>Mixed practice finished</h3><p>' + WS.cleared + ' of ' + WS.list.length + ' right. ' + (WS.again ? 'The ones you missed are now on your <a href="#/weak">weak-spot list</a>.' : 'Nothing to add to your weak-spot list.') + '</p><div class="actions"><button type="button" class="btn btn-primary" data-act="mix-start">Another mix</button><a class="btn btn-quiet" href="#/practice">Back to practice</a></div></div>';
      return;
    }
    if (WS.pos >= WS.list.length) {
      root.innerHTML = '<div class="result pass"><h3>Review finished</h3><p>' + WS.cleared + ' cleared, ' + WS.again + ' still weak. ' + (WS.again ? 'They stay on the list for next time.' : 'Nice work.') + '</p><div class="actions"><a class="btn btn-primary" href="#/weak">Check the list</a><a class="btn btn-quiet" href="#/practice">Back to practice</a></div></div>';
      return;
    }
    var it = WS.list[WS.pos], head = '<div class="qprog" aria-hidden="true"><i style="width:' + (WS.pos / WS.list.length * 100) + '%"></i></div><p class="qcount">' + KIND[it.k] + ' ' + (WS.pos + 1) + ' of ' + WS.list.length + ' <span class="small">' + (it.stage ? e(it.stage) + ': ' : 'from ') + e(it.from) + '</span></p>';
    if (it.k === 'c') {
      root.innerHTML = head + '<button type="button" class="card" id="wcard"><span class="side">Question</span><span class="txt">' + e(it.title) + '</span><span class="hint">Select to show the answer</span></button>' +
        '<div class="rate" id="wrate" hidden><button class="btn btn-quiet" type="button" data-act="weak-card" data-r="again">Again</button><button class="btn btn-primary" type="button" data-act="weak-card" data-r="good">Got it</button></div>';
      $('#wcard').addEventListener('click', function () { this.classList.add('back'); this.innerHTML = '<span class="side">Answer</span><span class="txt">' + e(it.back) + '</span>'; $('#wrate').hidden = false; });
      return;
    }
    var opts = A.shuffle(it.opts);
    root.innerHTML = head + (it.story ? '<p>' + e(it.story) + '</p>' : '') + (it.evidence ? '<pre class="evidence" tabindex="0"><code>' + e(it.evidence) + '</code></pre>' : '') + '<h3 class="qtext">' + e(it.title) + '</h3>' +
      '<div class="opts" role="group" aria-label="Answer choices">' + opts.map(function (o, i) { return '<button type="button" class="opt" data-act="weak-pick" data-ok="' + (o.ok ? '1' : '0') + '" data-x="' + e(o.x || '') + '"><span class="key">' + String.fromCharCode(65 + i) + '</span><span>' + e(o.t) + '</span></button>'; }).join('') + '</div><div class="feedback" id="wfb" aria-live="polite"></div>';
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
    var cx = b.getAttribute('data-x');
    $('#wfb').innerHTML = '<p class="' + (ok ? 'ok' : 'bad') + '"><strong>' + (ok ? (WS.mode === 'mix' ? 'Correct.' : 'Correct. Removed from your list.') : (WS.mode === 'mix' ? 'Not quite. Added to your weak-spot list.' : 'Not quite. It stays on your list.')) + '</strong> ' + e(it.why) + '</p>' + (!ok ? '<p class="wrong-pick"><strong>You chose:</strong> ' + e(b.querySelector('span:last-child').textContent) + (cx ? '. ' + e(cx) : '') + '</p><p class="wrong-right"><strong>The correct answer:</strong> ' + e($('.opt[data-ok="1"]', root).querySelector('span:last-child').textContent) + '</p>' : '') + '<button class="btn btn-primary" type="button" id="wnext">' + (WS.pos === WS.list.length - 1 ? 'Finish' : 'Next') + '</button>';
    var nb = $('#wnext'); nb.focus(); nb.addEventListener('click', function () { weakDone(ok); });
  });


  /* ---------------------------------------------------------- interleaved practice: a mix from many stages */
  function mixPool() {
    var ids = Object.keys(A.LES).filter(function (id) { return A.isDone(id); }), fallback = ids.length < 3;
    if (fallback) ids = Object.keys(A.LES);
    var by = {};
    ids.forEach(function (id) {
      var l = A.LES[id];
      l.quiz.forEach(function (q, qi) { (by[l.module] = by[l.module] || []).push({ k: 'q', r: id + '#' + qi }); });
    });
    (D.drills || []).forEach(function (d) { if (fallback || by[d.module]) (by[d.module] = by[d.module] || []).push({ k: 'd', r: d.id }); });
    return { by: by, fallback: fallback };
  }
  function mixPick(n) {
    var pool = mixPool(), mods = A.shuffle(Object.keys(pool.by)), lists = {}, out = [];
    mods.forEach(function (m) { lists[m] = A.shuffle(pool.by[m].slice()); });
    var i = 0, guard = 0;
    while (out.length < n && guard++ < 500 && mods.length) {
      var m = mods[i % mods.length], it = lists[m].shift();
      if (it) { var r = resolve(it); if (r) { r.k = it.k; r.rk = it.r; r.n = 0; out.push(r); } }
      if (!lists[m].length) { mods.splice(i % mods.length, 1); if (!mods.length) break; continue; }
      i++;
    }
    return out;
  }
  A.addRoute(/^\/mix$/, function () {
    view.title = 'Mixed practice | MARGA by EknathaLabs'; view.nav = 'practice';
    var pool = mixPool(), n = 0; Object.keys(pool.by).forEach(function (m) { n += pool.by[m].length; });
    view.html = '<section class="page-head wrap"><h1>Mixed practice</h1><p class="lede">Questions from different stages in a shuffled order. Mixing topics feels harder than studying one at a time, and it helps you remember more.</p></section>' +
      '<div class="wrap narrow" id="weak-root"><p>' + n + ' questions and drills from ' + Object.keys(pool.by).length + ' stages' + (pool.fallback ? ' (pass a few lessons and the mix will use only what you have studied)' : ', taken from the lessons you passed') + '.</p>' +
      '<div class="actions"><button type="button" class="btn btn-primary" data-act="mix-start">Start a mix of 12</button></div></div>';
    view.after = null;
  });
  A.onAct('mix-start', function () {
    WS = { list: mixPick(12), pos: 0, cleared: 0, again: 0, mode: 'mix' };
    if (!WS.list.length) { A.toast('No questions available yet.'); return; }
    weakAsk();
  });



  /* ---------------------------------------------------------- capstone projects: guided builds with step checklists */
  function capBag() { var st = A.state(); if (!st.cap || typeof st.cap !== 'object' || Array.isArray(st.cap)) st.cap = {}; return st.cap; }
  function capList() { return (A.D && A.D.capstones) || []; }
  function capDone(c) { var b = capBag()[c.id] || {}, n = 0; for (var i = 0; i < c.steps.length; i++) if (b['s' + i]) n++; return n; }
  function capCheckDone(c) { var b = capBag()[c.id] || {}, n = 0; for (var i = 0; i < c.check.length; i++) if (b['c' + i]) n++; return n; }
  function capFinished(c) { return capDone(c) === c.steps.length && capCheckDone(c) === c.check.length; }
  function inl(t) { return esc(t).replace(/`([^`]+)`/g, '<code>$1</code>'); }
  var PATH_NAMES = { devops: 'DevOps Engineer', cloud: 'Cloud Engineer', sre: 'Site Reliability Engineer', devsecops: 'DevSecOps Engineer' };
  function capCard(c) {
    var d = capDone(c), t = c.steps.length, fin = capFinished(c);
    return '<article class="row cap-card"><div class="row-main"><h3><a href="#/capstone/' + esc(c.id) + '">' + esc(c.title) + '</a></h3><p>' + esc(c.summary) + '</p>' +
      '<p class="small">' + esc(c.level) + ' &middot; about ' + c.hours + ' hours &middot; ' + esc(c.modules.join(', ')) + '</p></div>' +
      '<div class="row-side"><span class="chip' + (fin ? ' pass' : '') + '">' + (fin ? 'Finished' : d + ' of ' + t + ' steps') + '</span></div></article>';
  }
  function capCount() { var l = capList(), f = 0; l.forEach(function (c) { if (capFinished(c)) f++; }); return f + ' of ' + l.length + ' finished'; }
  function pathCaps(pid) {
    var l = capList().filter(function (c) { return c.path === pid; });
    if (!l.length) return '';
    return '<h2 class="sub-h">Capstone projects</h2><p class="lede-s">Four guided builds that put this path together. Tick off each step as you go.</p><div class="cap-cards">' + l.map(capCard).join('') + '</div>';
  }
  A.addRoute(/^\/capstones$/, function () {
    view.title = 'Capstone projects | MARGA by EknathaLabs'; view.nav = 'practice';
    var l = capList();
    view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Capstone projects</h1><p class="lede">Each path ends with four guided builds. You make something real, check it against a list, and keep it as proof of what you can do. ' + capCount() + '.</p></section>' +
      '<div class="wrap">' + Object.keys(PATH_NAMES).map(function (pid) {
        var items = l.filter(function (c) { return c.path === pid; });
        return '<h2 class="sub-h" id="cap-' + pid + '">' + esc(PATH_NAMES[pid]) + ' path</h2><div class="cap-cards">' + items.map(capCard).join('') + '</div>';
      }).join('') + '</div>';
    view.after = null;
  });
  A.addRoute(/^\/capstone\/([\w-]+)$/, function (cid) {
    var c = capList().filter(function (x) { return x.id === cid; })[0];
    if (!c) { view.title = 'Not found | MARGA'; view.nav = 'practice'; view.html = '<section class="page-head wrap"><h1>Capstone not found</h1><p><a href="#/capstones">See all capstone projects</a></p></section>'; view.after = null; return; }
    var b = capBag()[c.id] || {};
    function box(k, text, i) { return '<li><label class="cap-step"><input type="checkbox" data-act="cap-tick" data-id="' + esc(c.id) + '" data-k="' + k + i + '"' + (b[k + i] ? ' checked' : '') + '> <span>' + inl(text) + '</span></label></li>'; }
    view.title = c.title + ' | Capstone | MARGA by EknathaLabs'; view.nav = 'practice';
    view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/capstones">Capstone projects</a></nav><h1>' + esc(c.title) + '</h1><p class="lede">' + esc(c.summary) + '</p>' +
      '<dl class="facts"><div><dt>Path</dt><dd>' + esc(PATH_NAMES[c.path] || c.path) + '</dd></div><div><dt>Level</dt><dd>' + esc(c.level) + '</dd></div><div><dt>Time</dt><dd>About ' + c.hours + ' hours</dd></div><div><dt>Progress</dt><dd id="cap-prog"></dd></div></dl></section>' +
      '<div class="wrap narrow prose cap-body"><h2>Goal</h2><p>' + inl(c.goal) + '</p><h2>What you will build</h2><p>' + inl(c.build) + '</p>' +
      '<h2>Related stages</h2><p>' + c.modules.map(function (mid) { var mm = A.MOD[mid]; return mm ? '<a href="#/module/' + esc(mid) + '">' + esc(mm.title) + '</a>' : esc(mid); }).join(', ') + '</p>' +
      '<h2>Steps</h2><ol class="cap-list">' + c.steps.map(function (t, i) { return box('s', t, i); }).join('') + '</ol>' +
      '<h2>Self-check</h2><p>You are done when every line is true.</p><ul class="cap-list">' + c.check.map(function (t, i) { return box('c', t, i); }).join('') + '</ul>' +
      '<h2>Stretch goal</h2><p>' + inl(c.stretch) + '</p>' +
      '<p class="small">Your ticks are saved only in this browser. Work in a test account or a local cluster, and delete what you create so nothing keeps billing.</p></div>';
    view.after = function () { capPaint(c); };
  });
  window.MargaFeatures.capCount = capCount;
  window.MargaFeatures.pathCaps = pathCaps;
  function capPaint(c) {
    var el = $('#cap-prog'); if (!el) return;
    var d = capDone(c), k = capCheckDone(c);
    el.textContent = d + ' of ' + c.steps.length + ' steps, ' + k + ' of ' + c.check.length + ' checks' + (capFinished(c) ? ' (finished)' : '');
  }
  A.onAct('cap-tick', function (el) {
    var id = el.getAttribute('data-id'), k = el.getAttribute('data-k'), bag = capBag();
    var b = bag[id] || (bag[id] = {});
    if (el.checked) b[k] = 1; else delete b[k];
    var c = capList().filter(function (x) { return x.id === id; })[0];
    if (c) capPaint(c);
    A.markActive(); A.save(); A.renderChrome();
  });


  /* ---------------------------------------------------------- reading lists per stage */
  function readingFor(mid) { return ((D.reading || {})[mid]) || []; }
  function readingHtml(mid) {
    var l = readingFor(mid);
    if (!l.length) return '';
    return '<ul class="reading">' + l.map(function (r) {
      return '<li><a href="' + esc(r.u) + '" target="_blank" rel="noopener noreferrer">' + esc(r.t) + '</a> <span class="chip">' + esc(r.kind) + '</span><br><span class="small">' + esc(r.by) + '. ' + esc(r.why) + '</span></li>';
    }).join('') + '</ul>';
  }
  A.addRoute(/^\/reading$/, function () {
    view.title = 'Reading lists | MARGA by EknathaLabs'; view.nav = 'practice';
    view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Reading lists</h1><p class="lede">Where to go next for each stage: official documentation, specifications, books and articles that practising engineers return to. Links open on other sites, so they need a network connection.</p></section>' +
      '<div class="wrap">' + D.modules.map(function (m) { return '<h2 class="sub-h" id="read-' + esc(m.id) + '">' + esc(m.title) + '</h2>' + readingHtml(m.id); }).join('') + '</div>';
    view.after = null;
  });

  /* ---------------------------------------------------------- open content license */
  A.addRoute(/^\/license$/, function () {
    view.title = 'Open content license | MARGA by EknathaLabs'; view.nav = 'about';
    view.html = '<section class="page-head wrap"><h1>Open content license</h1><p class="lede">MARGA by EknathaLabs is free to learn from, and free to reuse with credit.</p></section>' +
      '<div class="wrap narrow prose about">' +
      '<h2>Copyright</h2><p>Copyright &copy; 2026 EknathaLabs. MARGA by EknathaLabs, at marga.eknathalabs.com.</p>' +
      '<h2>The learning content</h2><p>All lessons, quiz questions, flashcards, drills, case study summaries, explainers, incident games, capstone projects, reading lists, cheat sheets and glossary entries on MARGA by EknathaLabs are licensed under the <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 4.0 International license (CC BY 4.0)</a>.</p>' +
      '<p>You may copy, share, translate, adapt and use the content for any purpose, including teaching and commercial training, as long as you give credit and say if you made changes.</p>' +
      '<h2>How to give credit</h2><p>Use this line, or something close to it, next to the material you reuse:</p><pre class="evidence"><code>Source: MARGA by EknathaLabs (https://marga.eknathalabs.com), licensed under CC BY 4.0.</code></pre>' +
      '<h2>The site source code</h2><p>The code that runs the site is released under the MIT License. You may use, copy, modify and distribute it, provided that the copyright notice and the license text stay with it. The full text is in the file <code>LICENSE.md</code> in the source download.</p>' +
      '<h2>What this license does not cover</h2><ul>' +
      '<li>The name MARGA, the name EknathaLabs and the logo are not licensed for use as your own brand. You may refer to them to give credit.</li>' +
      '<li>Linked websites, documents, standards and company incident reports belong to their owners. Case studies give a short summary in our own words and link to the original source.</li>' +
      '<li>Fonts and third-party libraries keep their own licenses.</li></ul>' +
      '<h2>No warranty</h2><p>The material is provided as it is, without any warranty. It was written to teach, not as advice for your particular systems. Test commands in a safe environment before using them in production, and check facts against the official documentation linked from each lesson.</p>' +
      '<p class="about-pledge"><strong>Free forever &middot; No login &middot; No ads &middot; No cookies</strong></p>' +
      '</div>';
    view.after = null;
  });

  /* ---------------------------------------------------------- incident games */
  function gameList() { return D.games || []; }
  function gmBag() { var st = A.state(); if (!st.gm || typeof st.gm !== 'object' || Array.isArray(st.gm)) st.gm = {}; return st.gm; }
  var GM = null;
  var RANK = { win: 3, ok: 2, fail: 1 };
  var OUTLABEL = { win: 'Resolved well', ok: 'Resolved, with lessons', fail: 'Went badly' };
  function gameCard(g) {
    var r = gmBag()[g.id], m = A.MOD[g.module];
    return '<article class="row game-card"><div class="row-main"><h3><a href="#/game/' + esc(g.id) + '">' + esc(g.title) + '</a></h3><p>' + esc(g.summary) + '</p>' +
      '<p class="small">' + esc(m ? m.title : g.module) + ' &middot; ' + esc(g.level) + ' &middot; about ' + g.minutes + ' minutes</p></div>' +
      '<div class="row-side"><span class="chip' + (r && r.best === 'win' ? ' pass' : '') + '">' + (r ? 'Best: ' + OUTLABEL[r.best] : 'Not played') + '</span></div></article>';
  }
  function gameCount() { var b = gmBag(), n = 0; gameList().forEach(function (g) { if (b[g.id] && b[g.id].best === 'win') n++; }); return n + ' of ' + gameList().length + ' resolved well'; }
  window.MargaFeatures.gameCount = gameCount;
  function gamesForModule(mid) {
    var l = gameList().filter(function (g) { return g.module === mid; });
    if (!l.length) return '';
    return '<div class="gm-list">' + l.map(gameCard).join('') + '</div>';
  }
  window.MargaFeatures.moduleExtras = function (mid) {
    var g = gamesForModule(mid), r = readingHtml(mid);
    return (g ? '<h2 class="sub-h">Incident game</h2><p class="lede-s">Make the calls during a realistic outage and see what each choice leads to.</p>' + g : '') +
      (r ? '<h2 class="sub-h">Reading list</h2>' + r + '<p class="small"><a href="#/reading">See the reading lists for every stage</a></p>' : '');
  };
  A.addRoute(/^\/games$/, function () {
    view.title = 'Incident games | MARGA by EknathaLabs'; view.nav = 'practice';
    var l = gameList();
    view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Incident games</h1><p class="lede">You are on call. Each game is a real kind of outage told in steps. Choose what to do, see what happens, and learn why. There is more than one way through, and some ways make things worse. ' + gameCount() + '.</p></section>' +
      '<div class="wrap">' + A.D.modules.map(function (m) {
        var items = l.filter(function (g) { return g.module === m.id; });
        return items.length ? '<h2 class="sub-h">' + esc(m.title) + '</h2><div class="cap-cards">' + items.map(gameCard).join('') + '</div>' : '';
      }).join('') + '</div>';
    view.after = null;
  });
  A.addRoute(/^\/game\/([\w-]+)$/, function (gid) {
    var g = gameList().filter(function (x) { return x.id === gid; })[0];
    if (!g) { view.title = 'Not found | MARGA'; view.nav = 'practice'; view.html = '<section class="page-head wrap"><h1>Game not found</h1><p><a href="#/games">See all incident games</a></p></section>'; view.after = null; return; }
    GM = { g: g, at: g.start, pts: 0, max: 0, log: [] };
    view.title = g.title + ' | Incident game | MARGA by EknathaLabs'; view.nav = 'practice';
    var les = A.LES[g.lesson];
    view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/games">Incident games</a></nav><h1>' + esc(g.title) + '</h1><p class="lede">' + esc(g.summary) + '</p>' +
      '<p class="small">' + esc(g.level) + ' &middot; about ' + g.minutes + ' minutes' + (les ? ' &middot; Related lesson: <a href="' + A.hrefLesson(g.lesson) + '">' + esc(les.title) + '</a>' : '') + '</p></section>' +
      '<div class="wrap narrow"><div id="gm-root" aria-live="polite"></div></div>';
    view.after = function () { gmPaint(); };
  });
  function gmPaint(fb) {
    var root = $('#gm-root'); if (!root || !GM) return;
    var g = GM.g, sc = g.scenes[GM.at], html = '';
    if (GM.at === g.start && !GM.log.length && !fb) html += '<p class="gm-intro">' + esc(g.intro) + '</p>';
    if (fb) {
      html += '<div class="gm-fb gm-' + fb.pts + '" role="status"><p><strong>' + (fb.pts === 2 ? 'Good call.' : fb.pts === 1 ? 'Acceptable, but not the best.' : 'That made things worse or wasted time.') + '</strong> ' + esc(fb.fb) + '</p><div class="actions"><button type="button" class="btn btn-primary" data-act="gm-next" data-to="' + esc(fb.to) + '">Continue</button></div></div>';
      root.innerHTML = html; var b = $('[data-act=gm-next]', root); if (b) b.focus(); return;
    }
    if (sc.end) {
      var best = gmBag()[g.id], rank = RANK[sc.end];
      if (!best || RANK[best.best] < rank) gmBag()[g.id] = { best: sc.end, n: ((best && best.n) || 0) + 1 };
      else best.n = (best.n || 0) + 1;
      A.markActive(); A.save(); A.renderChrome();
      html += '<div class="gm-end gm-end-' + sc.end + '"><h2>' + OUTLABEL[sc.end] + '</h2><p>' + esc(sc.text) + '</p><p><strong>What to take away.</strong> ' + esc(sc.takeaway) + '</p>' +
        '<p class="small">Good decisions: ' + GM.pts + ' of ' + GM.max + ' points.</p></div>' +
        '<h3 class="sub-h">Your decisions</h3><ol class="gm-log">' + GM.log.map(function (x) { return '<li><span class="small">' + esc(x.scene) + '</span><br>' + esc(x.choice) + ' <span class="chip' + (x.pts === 2 ? ' pass' : '') + '">' + (x.pts === 2 ? 'Best' : x.pts === 1 ? 'Acceptable' : 'Poor') + '</span></li>'; }).join('') + '</ol>' +
        '<div class="actions"><button type="button" class="btn btn-primary" data-act="gm-again">Play again and try other choices</button> <a class="btn btn-quiet" href="#/games">More games</a></div>';
      root.innerHTML = html; return;
    }
    html += '<div class="gm-scene"><p>' + esc(sc.text) + '</p></div><p class="gm-q"><strong>What do you do?</strong></p><ul class="gm-choices">' +
      sc.choices.map(function (c, i) { return '<li><button type="button" class="btn btn-quiet gm-choice" data-act="gm-pick" data-i="' + i + '">' + esc(c.t) + '</button></li>'; }).join('') + '</ul>';
    root.innerHTML = html;
  }
  A.onAct('gm-pick', function (b) {
    if (!GM) return;
    var sc = GM.g.scenes[GM.at], c = sc.choices[Number(b.getAttribute('data-i'))]; if (!c) return;
    GM.pts += c.pts; GM.max += 2; GM.log.push({ scene: sc.text.length > 90 ? sc.text.slice(0, 90) + '...' : sc.text, choice: c.t, pts: c.pts });
    GM.at = c.to; gmPaint({ pts: c.pts, fb: c.fb, to: c.to });
  });
  A.onAct('gm-next', function () { gmPaint(); var h = $('#gm-root'); if (h) h.scrollIntoView({ block: 'start' }); });
  A.onAct('gm-again', function () { if (!GM) return; GM = { g: GM.g, at: GM.g.start, pts: 0, max: 0, log: [] }; gmPaint(); });

  /* ---------------------------------------------------------- playground learning aids: worked-example fading and a hint ladder */
  var CFG = [
    { sel: '#lab-ex', code: '#lab-code', res: '#lab-res', anchor: '#lab-hintbox', lang: function () { var l = $('.lab'); return l ? l.getAttribute('data-lang') : ''; } },
    { sel: '#yx-ex', code: '#yp-in', res: '#yx-res', anchor: '#yx-hintbox', lang: function () { return 'yaml'; } },
    { sel: '#py-ex', code: '#py-code', res: '#py-res', anchor: '#py-hintbox', lang: function () { return 'python'; } }
  ];
  var AID = { cfg: null, fails: 0, rung: 0, id: '' };
  function exList(lang) { return lang === 'python' ? (window.MARGA_PY_EX || (D.labs || {}).python || []) : ((D.labs || {})[lang] || []); }
  function curEx() {
    if (!AID.cfg) return null; var sel = $(AID.cfg.sel); if (!sel || sel.value === 'free') return null;
    var l = exList(AID.cfg.lang()); for (var i = 0; i < l.length; i++) if (l[i].id === sel.value) return l[i]; return null;
  }
  function comment(lang) { return lang === 'go' ? '// ' : lang === 'sql' ? '-- ' : '# '; }
  function halfOf(x, lang) {
    var sol = x.sol.replace(/\n+$/, '');
    if (lang === 'sql') { var w = sol.split(/\s+/), k = Math.max(2, Math.ceil(w.length / 2)); return w.slice(0, k).join(' ') + '\n' + comment(lang) + 'your turn: finish the query\n'; }
    var ln = sol.split('\n'), keep = ln.length <= 2 ? 1 : Math.max(2, Math.ceil(ln.length / 2));
    return ln.slice(0, keep).join('\n') + '\n' + comment(lang) + 'your turn: finish this\n';
  }
  function solvedCount(lang) {
    var st = A.state(); if (lang === 'python') return Object.keys(st.py || {}).length;
    var m = st.lab || {}; return Object.keys(m).filter(function (k) { return k.indexOf(lang + ':') === 0; }).length;
  }
  function setCode(txt) { var ed = $(AID.cfg.code); if (!ed) return; ed.value = txt; ed.dispatchEvent(new Event('input')); }
  function aidsPaint() {
    var box = $('#aids'); if (!box || !AID.cfg) return;
    var x = curEx(); box.hidden = !x; if (!x) return;
    var lang = AID.cfg.lang(), n = solvedCount(lang), sug = n < 3 ? 'study' : n < 8 ? 'finish' : 'blank';
    $$('.seg-b', box).forEach(function (b) { b.classList.toggle('suggest', b.getAttribute('data-lv') === sug); });
    $('#aids-suggest').textContent = 'Suggested for you: ' + ({ study: 'study the answer first', finish: 'finish a half-solved one', blank: 'start from a blank file' }[sug]) + ' (you have solved ' + n + ').';
    if (AID.id !== x.id) { AID.id = x.id; AID.fails = 0; AID.rung = 0; $('#aids-steps').innerHTML = ''; }
    aidsNextBtn();
  }
  function aidsNextBtn() {
    var b = $('#aids-next'); if (!b) return;
    var t = ['Show hint 1: the exercise hint', 'Show hint 2: what failed', 'Show hint 3: a partial solution', 'Show hint 4: the full solution'];
    b.hidden = AID.rung >= 4; b.textContent = t[AID.rung] || '';
    var need = AID.rung === 2 ? 2 : AID.rung === 3 ? 3 : 0;
    $('#aids-gate').textContent = need && AID.fails < need ? 'Unlocks after ' + need + ' failed checks. You have ' + AID.fails + '.' : '';
    b.disabled = !!(need && AID.fails < need);
  }
  function firstFail() {
    var r = $(AID.cfg.res), f = r && $('.drill-res.no', r); if (!f) return '';
    var df = f.getAttribute('data-fail'); if (df) return 'The first test that failed is: ' + df;
    var li = $('li', f); if (li) return li.textContent;
    return f.textContent.replace(/^\s*(Not yet\.|Error\.)\s*/, '').trim();
  }
  A.onAct('aids-level', function (b) {
    var x = curEx(); if (!x) return; var lv = b.getAttribute('data-lv'), lang = AID.cfg.lang();
    $$('#aids .seg-b').forEach(function (y) { y.setAttribute('aria-pressed', String(y === b)); });
    setCode(lv === 'study' ? x.sol : lv === 'finish' ? halfOf(x, lang) : x.start);
    $('#aids-note').textContent = lv === 'study' ? 'The full answer is in the editor. Read it, say what each part does, then try Finish it.' : lv === 'finish' ? 'The first half is written. Complete the rest and press Check.' : 'You are on your own now. Use the hint ladder if you get stuck.';
  });
  A.onAct('aids-next', function () {
    var x = curEx(); if (!x) return; var ol = $('#aids-steps'), html = '', lang = AID.cfg.lang();
    if (AID.rung === 0) html = '<strong>Hint 1.</strong> ' + e(x.hint || 'Re-read the task and the first line of your code.');
    else if (AID.rung === 1) { var f = firstFail(); html = '<strong>Hint 2.</strong> ' + (f ? 'Look at this first: ' + e(f) : 'Press Check first. This step then points at the first thing that failed.'); }
    else if (AID.rung === 2) html = '<strong>Hint 3.</strong> A partial solution. Complete the rest yourself:<pre class="evidence"><code>' + e(halfOf(x, lang)) + '</code></pre>';
    else html = '<strong>Hint 4.</strong> The full solution:<pre class="evidence"><code>' + e(x.sol) + '</code></pre>';
    ol.insertAdjacentHTML('beforeend', '<li>' + html + '</li>'); AID.rung++; aidsNextBtn();
  });
  function aidsInit() {
    var cfg = null; CFG.forEach(function (c) { if (!cfg && $(c.sel)) cfg = c; });
    if (!cfg) { AID.cfg = null; return; }
    AID.cfg = cfg;
    if (!$('#aids')) {
      var anchor = $(cfg.anchor); if (!anchor) return;
      anchor.insertAdjacentHTML('afterend', '<div class="aids" id="aids" hidden><p class="aids-h"><strong>Support level</strong> <span id="aids-suggest" class="small"></span></p>' +
        '<div class="seg" role="group" aria-label="Support level"><button type="button" class="seg-b" data-act="aids-level" data-lv="study" aria-pressed="false">Study the answer</button><button type="button" class="seg-b" data-act="aids-level" data-lv="finish" aria-pressed="false">Finish it</button><button type="button" class="seg-b" data-act="aids-level" data-lv="blank" aria-pressed="false">Start blank</button></div>' +
        '<p class="small" id="aids-note" aria-live="polite"></p><div class="aids-ladder"><p class="aids-h"><strong>Stuck?</strong> <span class="small">Hints come one step at a time.</span></p><ol id="aids-steps"></ol><button type="button" class="btn btn-quiet" id="aids-next" data-act="aids-next">Show the first hint</button> <span class="small" id="aids-gate"></span></div></div>');
      var res = $(cfg.res);
      if (res && window.MutationObserver) new MutationObserver(function () {
        if (!$('.drill-res.no', res)) return;
        AID.fails++; aidsNextBtn();
      }).observe(res, { childList: true, subtree: true });
    }
    aidsPaint();
  }
  document.addEventListener('change', function (ev) { if (ev.target && /^(lab-ex|yx-ex|py-ex)$/.test(ev.target.id)) { setTimeout(aidsPaint, 0); } });

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
    aidsInit();
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
