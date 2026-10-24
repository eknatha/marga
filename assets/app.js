(function () {
'use strict';

var D = window.ACADEMY;
var MODS = D.modules;
var MOD = {};
MODS.forEach(function (m) { MOD[m.id] = m; });
var LES = D.lessons;
var SHEETS = D.sheets;
var LIVE = D.paths.live;
var PLANNED = D.paths.planned;
var PATH = {};
LIVE.forEach(function (p) { PATH[p.id] = p; });

var PASS_RATIO = 0.7;
var INTERVALS = [0, 1, 3, 7, 14, 30];

/* ---------- helpers ---------- */
function $(s, el) { return (el || document).querySelector(s); }
function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
function e(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function hours(min) { var h = min / 60; return h < 1 ? Math.round(min) + ' min' : (Math.round(h * 10) / 10) + ' h'; }
function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

var ICON = {
  check: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  lock: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M5.5 7V5.5a2.5 2.5 0 015 0V7" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  flame: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 1.5c.4 2.2 3.8 3.6 3.8 7a3.8 3.8 0 01-7.6 0c0-1.3.6-2.2 1.3-3 .1 1 .6 1.6 1.2 1.8C6.4 5.4 6.8 3.2 8 1.5z" fill="currentColor"/></svg>',
  search: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="7" cy="7" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  moon: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M13 9.5A5.5 5.5 0 116.5 3 4.5 4.5 0 0013 9.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  sun: '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
};

/* ---------- storage ---------- */
var KEY = 'ea.progress.v1';
var memStore = null;
function fresh() { return { v: 1, lessons: {}, cards: {}, days: [], path: 'devops' }; }
function load() {
  try {
    var s = localStorage.getItem(KEY);
    if (s) { var o = JSON.parse(s); if (o && o.v === 1 && o.lessons && o.cards && Array.isArray(o.days)) return o; }
  } catch (x) { /* storage unavailable */ }
  return memStore || fresh();
}
var S = load();
function save() { memStore = S; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (x) { /* ignore */ } }

function dayKey(d) {
  d = d || new Date();
  var m = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
}
function daysBetween(a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000); }
function markActive() { var k = dayKey(); if (S.days.indexOf(k) < 0) { S.days.push(k); S.days.sort(); } }
function streaks() {
  var set = {}; S.days.forEach(function (k) { set[k] = 1; });
  var d = new Date(); var cur = 0;
  if (!set[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (set[dayKey(d)]) { cur++; d.setDate(d.getDate() - 1); }
  var best = 0, run = 0, prev = null;
  S.days.forEach(function (k) { run = (prev && daysBetween(prev, k) === 1) ? run + 1 : 1; if (run > best) best = run; prev = k; });
  return { cur: cur, best: best, today: !!set[dayKey()] };
}

/* ---------- progress model ---------- */
function isDone(id) { return !!(S.lessons[id] && S.lessons[id].done); }
function modCount(m) { return m.lessons.filter(isDone).length; }
function modDone(m) { return m.lessons.length > 0 && modCount(m) === m.lessons.length; }
function modUnlocked(m) { return m.requires.every(function (r) { return modDone(MOD[r]); }); }
function missingReqs(m) { return m.requires.filter(function (r) { return !modDone(MOD[r]); }).map(function (r) { return MOD[r]; }); }
function lessonState(id) {
  var l = LES[id], m = MOD[l.module], i = m.lessons.indexOf(id);
  if (!modUnlocked(m)) return 'locked';
  if (isDone(id)) return 'done';
  if (i === 0 || isDone(m.lessons[i - 1])) return 'open';
  return 'locked';
}
function lockReason(id) {
  var l = LES[id], m = MOD[l.module], i = m.lessons.indexOf(id);
  if (!modUnlocked(m)) return 'Finish ' + missingReqs(m).map(function (x) { return x.title; }).join(' and ') + ' first.';
  return 'Pass the check for "' + LES[m.lessons[i - 1]].title + '" first.';
}
function modStatus(m) {
  if (modDone(m)) return 'pass';
  if (!modUnlocked(m)) return 'lock';
  return modCount(m) > 0 ? 'run' : 'ready';
}
function totals() {
  var all = Object.keys(LES), done = all.filter(isDone).length;
  return { done: done, total: all.length };
}
function nextInPath(p) {
  for (var i = 0; i < p.modules.length; i++) {
    var m = MOD[p.modules[i]];
    if (modDone(m) || !modUnlocked(m)) continue;
    for (var j = 0; j < m.lessons.length; j++) if (!isDone(m.lessons[j])) return m.lessons[j];
  }
  return null;
}
function pathProgress(p) {
  var tot = 0, done = 0, min = 0;
  p.modules.forEach(function (id) { var m = MOD[id]; tot += m.lessons.length; done += modCount(m); min += m.minutes; });
  return { total: tot, done: done, minutes: min };
}
function hrefLesson(id) { return '#/lesson/' + id; }

/* ---------- toast ---------- */
var toastTimer;
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3600);
}

/* ---------- chrome ---------- */
function theme() { return document.documentElement.getAttribute('data-theme') || 'light'; }
function renderChrome() {
  var st = streaks();
  $('#chrome').innerHTML =
    '<header class="topbar"><div class="wrap topbar-in">' +
    '<a class="brand" href="#/"><img src="icon.svg" alt="" width="26" height="26"><span><b>MARGA</b><span class="bn"> by EknathaLabs</span></span></a>' +
    '<nav class="topnav" id="topnav" aria-label="Main">' +
    '<a href="#/paths" data-nav="paths">Paths</a><a href="#/cheatsheets" data-nav="cheatsheets">Cheat sheets</a>' +
    '<a href="#/review" data-nav="review">Review cards</a><a href="#/labs" data-nav="labs">Labs</a><a href="#/progress" data-nav="progress">Progress</a></nav>' +
    '<div class="tools">' +
    '<button class="btn btn-quiet search-btn" type="button" data-act="search" aria-label="Search lessons and cheat sheets">' + ICON.search + '<span>Search</span><kbd>/</kbd></button>' +
    '<a class="streak' + (st.cur ? ' on' : '') + '" href="#/progress" title="Current streak ' + plural(st.cur, 'day') + ', best ' + plural(st.best, 'day') + '" aria-label="Current streak ' + plural(st.cur, 'day') + '">' + ICON.flame + '<b>' + st.cur + '</b></a>' +
    '<button class="btn btn-quiet icon-btn" type="button" data-act="theme" aria-label="Switch to ' + (theme() === 'dark' ? 'light' : 'dark') + ' theme">' + (theme() === 'dark' ? ICON.sun : ICON.moon) + '</button>' +
    '<button class="btn btn-quiet icon-btn menu-btn" type="button" data-act="menu" aria-label="Menu" aria-expanded="false"><span></span></button>' +
    '</div></div></header>';
  $('#footer').innerHTML =
    '<footer class="foot"><div class="wrap foot-in">' +
    '<span>MARGA by EknathaLabs</span>' +
    '<a href="cheatsheets/">Printable cheat sheets</a><a href="https://eknathalabs.com" target="_blank" rel="noopener">Blog</a>' +
    '<a href="https://eknathalabs.substack.com" target="_blank" rel="noopener">Newsletter</a>' +
    (D.counter ? '<span class="visitors" id="visitors"' + (visitorText ? '' : ' hidden') + '>' + e(visitorText) + '</span>' : '') +
    '<span class="foot-note">Progress is saved in this browser only.</span></div></footer>';
}

/* ---------- visitor count (GoatCounter, optional, silent on failure) ---------- */
var visitorText = '';
function visitors() {
  if (!D.counter || !window.fetch) return;
  var base = 'https://' + D.counter + '.goatcounter.com/';
  var local = /^(localhost|127\..*|\[::1\]|)$/.test(location.hostname) || location.protocol === 'file:';
  try {
    if (!local && !sessionStorage.getItem('ea.hit')) {
      sessionStorage.setItem('ea.hit', '1');
      new Image().src = base + 'count?p=' + encodeURIComponent('/') + '&t=' + encodeURIComponent(document.title) + '&r=' + encodeURIComponent(document.referrer);
    }
  } catch (x) { /* storage blocked: skip the hit */ }
  // Count the hit before asking for the total, so a first visit includes itself.
  setTimeout(function () {
    fetch(base + 'counter/TOTAL.json').then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (j) {
      var n = String(j && j.count || '').replace(/\s/g, ' ').trim();
      if (!/^\d[\d ,.]*$/.test(n)) return;
      visitorText = n + (n === '1' ? ' visitor' : ' visitors');
      var el = $('#visitors'); if (el) { el.textContent = visitorText; el.hidden = false; }
    }).catch(function () { /* offline or counter not set up: stay hidden */ });
  }, local ? 0 : 900);
}
function setNav(name) {
  $$('#topnav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === name); });
}

/* ---------- pipeline component ---------- */
function stageHtml(m, i, animate) {
  var s = modStatus(m), n = modCount(m), tot = m.lessons.length;
  var pct = Math.round(n / tot * 100);
  var label = { pass: 'Passed', run: 'In progress', ready: 'Ready to start', lock: 'Locked' }[s];
  var inner = s === 'pass' ? ICON.check : s === 'lock' ? ICON.lock : '';
  return '<li class="stage s-' + s + '" style="--i:' + i + ';--p:' + pct + '">' +
    '<a href="#/module/' + m.id + '" aria-label="' + e(m.title) + ', ' + label + ', ' + n + ' of ' + tot + ' lessons passed">' +
    '<span class="rail"><span class="dot">' + inner + '</span><span class="line"><i></i></span></span>' +
    '<span class="name">' + e(m.title) + '</span><span class="sub">' + (s === 'lock' ? 'Locked' : n + ' of ' + tot + ' lessons') + '</span></a></li>';
}
function pipelineHtml(p, animate) {
  return '<ol class="pipe' + (animate ? ' run-anim' : '') + '">' + p.modules.map(function (id, i) { return stageHtml(MOD[id], i, animate); }).join('') + '</ol>';
}
function armPipeline() {
  var p = $('.pipe.run-anim');
  if (!p) return;
  requestAnimationFrame(function () { requestAnimationFrame(function () { p.classList.add('go'); }); });
}

/* ---------- views ---------- */
var view = { title: '', html: '', after: null, nav: '' };

function homeView() {
  var p = PATH[S.path] || LIVE[0];
  var t = totals(), st = streaks();
  var next = nextInPath(p);
  var started = pathProgress(p).done > 0;
  var cta = next
    ? '<a class="btn btn-primary" href="' + hrefLesson(next) + '">' + (started ? 'Continue: ' : 'Start: ') + e(LES[next].title) + '</a>'
    : '<a class="btn btn-primary" href="#/path/' + p.id + '">Path complete: review it</a>';
  var tabs = LIVE.map(function (x) {
    return '<button type="button" role="tab" class="tab' + (x.id === p.id ? ' on' : '') + '" data-act="pick-path" data-id="' + x.id + '" aria-selected="' + (x.id === p.id) + '">' + e(x.title) + '</button>';
  }).join('');
  var pp = pathProgress(p);
  view.title = 'MARGA by EknathaLabs: DevOps, cloud and SRE training';
  view.nav = '';
  view.html =
    '<section class="hero"><div class="wrap hero-grid">' +
    '<div class="hero-copy"><h1>Practical DevOps, cloud and SRE training from someone who runs production.</h1>' +
    '<p class="lede">Pick a role path. Pass each lesson check to unlock the next one. Every tool you learn comes with its own cheat sheet.</p>' +
    '<div class="actions">' + cta + '<a class="btn btn-quiet" href="#/cheatsheets">Browse cheat sheets</a></div></div>' +
    '<dl class="today"><div><dt>Day streak</dt><dd>' + st.cur + '</dd></div><div><dt>Lessons passed</dt><dd>' + t.done + '<small> of ' + t.total + '</small></dd></div>' +
    '<div><dt>Best streak</dt><dd>' + st.best + '</dd></div></dl></div>' +
    '<div class="wrap"><div class="pipe-panel"><div class="pipe-head"><div role="tablist" aria-label="Role paths" class="tabs">' + tabs + '</div>' +
    '<p class="pipe-meta">' + plural(p.modules.length, 'stage') + ', about ' + hours(pp.minutes) + ' of study. ' + pp.done + ' of ' + pp.total + ' lessons passed.</p></div>' +
    pipelineHtml(p, true) +
    '<p class="pipe-foot"><a href="#/path/' + p.id + '">See the full ' + e(p.title) + ' path</a></p></div></div></section>' +

    '<section class="band"><div class="wrap"><div class="band-head"><h2>Role paths</h2><p>Each path is an ordered set of stages. A stage opens when the stages it depends on are passed.</p></div>' +
    '<div class="rows">' + LIVE.map(pathRow).join('') + '</div>' +
    '<h3 class="sub-h">In development</h3><ul class="planned">' + PLANNED.map(function (x) { return '<li><strong>' + e(x.title) + '</strong><span>' + e(x.summary) + '</span><em>Planned</em></li>'; }).join('') + '</ul></div></section>' +

    '<section class="band alt"><div class="wrap two"><div><h2>A cheat sheet for every tool</h2><p>Linux, Bash, networking, Docker, Kubernetes, Terraform, CI/CD, AWS, Azure, Prometheus and SRE each have a separate, searchable, printable page. They are always open, no progress needed.</p>' +
    '<p><a class="btn btn-quiet" href="#/cheatsheets">Open cheat sheets</a></p></div>' +
    '<ul class="chips">' + Object.keys(SHEETS).map(function (id) { return '<li><a href="#/cheatsheet/' + id + '">' + e(SHEETS[id].title) + '</a></li>'; }).join('') + '</ul></div></section>' +

    '<section class="band"><div class="wrap two"><div><h2>How a lesson works</h2><ol class="steps"><li><strong>Read.</strong> Each lesson explains why, then shows commands with their output.</li><li><strong>Check.</strong> Answer a short quiz. Pass it to mark the lesson done and unlock the next.</li><li><strong>Remember.</strong> Flip the flashcards now, and review them again later from the Review cards page.</li></ol></div>' +
    '<div class="note-panel"><h3>Hands-on labs are planned</h3><p>Browser-based practice with automatic checking is in development. Until then, every lesson includes a written incident walkthrough with sample output so you can follow the reasoning.</p><p><a href="#/labs">What is planned</a></p></div></div></section>' +

    '<section class="band alt"><div class="wrap"><h2>About the author</h2><p class="prose-narrow">Eknatha Reddy is a Senior Platform Engineer and SRE with 14+ years in enterprise infrastructure, Linux, virtualization and production support. The lessons are written from incidents and migrations, not from vendor slides.</p></div></section>';
  view.after = armPipeline;
}

function pathRow(p) {
  var pp = pathProgress(p), pct = pp.total ? Math.round(pp.done / pp.total * 100) : 0;
  return '<article class="row"><div class="row-main"><h3><a href="#/path/' + p.id + '">' + e(p.title) + '</a></h3><p>' + e(p.summary) + '</p></div>' +
    '<ul class="row-mods">' + p.modules.map(function (id) { return '<li class="m-' + modStatus(MOD[id]) + '">' + e(MOD[id].title) + '</li>'; }).join('') + '</ul>' +
    '<div class="row-stat"><b>' + hours(pp.minutes) + '</b><span>' + plural(pp.total, 'lesson') + '</span>' +
    '<div class="bar" role="img" aria-label="' + pct + ' percent complete"><i style="width:' + pct + '%"></i></div></div></article>';
}

function pathsView() {
  view.title = 'Role paths | MARGA by EknathaLabs'; view.nav = 'paths';
  view.html = '<section class="page-head wrap"><h1>Role paths</h1><p class="lede">Pick the path that matches the job you want. Lessons are shared between paths, so progress carries over.</p></section>' +
    '<div class="wrap"><div class="rows">' + LIVE.map(pathRow).join('') + '</div>' +
    '<h2 class="sub-h">In development</h2><ul class="planned">' + PLANNED.map(function (x) { return '<li><strong>' + e(x.title) + '</strong><span>' + e(x.summary) + '</span><em>Planned</em></li>'; }).join('') + '</ul></div>';
  view.after = null;
}

function pathView(id) {
  var p = PATH[id];
  if (!p) return notFound();
  var pp = pathProgress(p), next = nextInPath(p);
  view.title = p.title + ' path | MARGA by EknathaLabs'; view.nav = 'paths';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/paths">Paths</a></nav><h1>' + e(p.title) + '</h1>' +
    '<p class="lede">' + e(p.summary) + '</p>' +
    '<dl class="facts"><div><dt>Who it is for</dt><dd>' + e(p.audience) + '</dd></div><div><dt>Study time</dt><dd>About ' + hours(pp.minutes) + '</dd></div><div><dt>Progress</dt><dd>' + pp.done + ' of ' + pp.total + ' lessons</dd></div></dl>' +
    '<div class="actions">' + (next ? '<a class="btn btn-primary" href="' + hrefLesson(next) + '">' + (pp.done ? 'Continue: ' : 'Start: ') + e(LES[next].title) + '</a>' : '<span class="chip pass">Path complete</span>') +
    '<button class="btn btn-quiet" type="button" data-act="pick-path" data-id="' + p.id + '" data-go="home">Make this my home path</button></div></section>' +
    '<div class="wrap"><div class="pipe-panel">' + pipelineHtml(p, true) + '</div>' +
    '<h2 class="sub-h">What you will be able to do</h2><ul class="outcomes">' + p.outcomes.map(function (o) { return '<li>' + e(o) + '</li>'; }).join('') + '</ul>' +
    '<h2 class="sub-h">Stages</h2><div class="stage-list">' + p.modules.map(function (mid, i) { return stageRow(MOD[mid], i); }).join('') + '</div></div>';
  view.after = armPipeline;
}

function stageRow(m, i) {
  var s = modStatus(m), n = modCount(m), tot = m.lessons.length;
  var req = m.requires.length ? 'Requires ' + m.requires.map(function (r) { return MOD[r].title; }).join(' and ') : 'No prerequisites';
  return '<article class="srow s-' + s + '"><span class="dot">' + (s === 'pass' ? ICON.check : s === 'lock' ? ICON.lock : '') + '</span>' +
    '<div><h3><a href="#/module/' + m.id + '">' + e(m.title) + '</a></h3><p>' + e(m.summary) + '</p><p class="small">' + e(req) + '. ' + plural(tot, 'lesson') + ', about ' + hours(m.minutes) + '.</p></div>' +
    '<div class="row-stat"><b>' + n + '/' + tot + '</b><span>' + ({ pass: 'Passed', run: 'In progress', ready: 'Ready', lock: 'Locked' }[s]) + '</span></div></article>';
}

function moduleView(id) {
  var m = MOD[id];
  if (!m) return notFound();
  var s = modStatus(m), n = modCount(m), tot = m.lessons.length, pct = Math.round(n / tot * 100);
  var sheets = Object.keys(SHEETS).filter(function (k) { return SHEETS[k].module === m.id; });
  view.title = m.title + ' | MARGA by EknathaLabs'; view.nav = 'paths';
  var lock = '';
  if (s === 'lock') {
    lock = '<div class="gate"><strong>This stage is locked.</strong> Pass ' + missingReqs(m).map(function (r) { return '<a href="#/module/' + r.id + '">' + e(r.title) + '</a>'; }).join(' and ') + ' to open it.</div>';
  }
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/paths">Paths</a></nav><h1>' + e(m.title) + '</h1>' +
    '<p class="lede">' + e(m.summary) + '</p>' +
    '<dl class="facts"><div><dt>Level</dt><dd>' + e(m.level) + '</dd></div><div><dt>Study time</dt><dd>About ' + hours(m.minutes) + '</dd></div><div><dt>Progress</dt><dd>' + n + ' of ' + tot + ' lessons</dd></div></dl>' +
    '<div class="bar wide" role="img" aria-label="' + pct + ' percent complete"><i style="width:' + pct + '%"></i></div>' + lock +
    (sheets.length ? '<p class="small">Cheat sheet: ' + sheets.map(function (k) { return '<a href="#/cheatsheet/' + k + '">' + e(SHEETS[k].title) + '</a>'; }).join(', ') + '</p>' : '') +
    '</section><div class="wrap"><ol class="jobs">' + m.lessons.map(function (lid, i) { return jobHtml(lid, i); }).join('') + '</ol></div>';
  view.after = null;
}

function jobHtml(lid, i) {
  var l = LES[lid], st = lessonState(lid);
  var dot = st === 'done' ? ICON.check : st === 'locked' ? ICON.lock : '';
  var state = { done: 'Passed', open: 'Up next', locked: 'Locked' }[st];
  var best = st === 'done' && S.lessons[lid].best != null ? ', best score ' + S.lessons[lid].best + '%' : '';
  return '<li class="job j-' + st + '"><a href="' + hrefLesson(lid) + '" ' + (st === 'locked' ? 'data-locked="' + e(lockReason(lid)) + '" ' : '') + 'aria-label="Lesson ' + (i + 1) + ': ' + e(l.title) + ', ' + state + '">' +
    '<span class="rail"><span class="dot">' + dot + '</span><span class="line"></span></span>' +
    '<span class="job-body"><span class="job-title">' + e(l.title) + '</span><span class="job-sum">' + e(l.summary) + '</span>' +
    '<span class="job-meta"><span>' + l.minutes + ' min</span><span>' + plural(l.quiz.length, 'question') + '</span><span class="job-state">' + state + best + '</span></span></span></a></li>';
}

function notFound() {
  view.title = 'Not found | MARGA by EknathaLabs'; view.nav = '';
  view.html = '<section class="page-head wrap"><h1>That page does not exist</h1><p class="lede">The link may be old. Go to the <a href="#/paths">learning paths</a> or the <a href="#/cheatsheets">cheat sheets</a>.</p></section>';
  view.after = null;
}

/* ----- lesson ----- */
var activeQuiz = null;
function lessonView(mid, slug) {
  var id = mid + '/' + slug, l = LES[id];
  if (!l) return notFound();
  var st = lessonState(id);
  if (st === 'locked') {
    toast('Locked. ' + lockReason(id));
    location.replace('#/module/' + mid);
    return 'redirect';
  }
  var m = MOD[mid], i = m.lessons.indexOf(id);
  var prev = i > 0 ? m.lessons[i - 1] : null, nxt = i < m.lessons.length - 1 ? m.lessons[i + 1] : null;
  view.title = l.title + ' | ' + m.title + ' | MARGA by EknathaLabs'; view.nav = 'paths';
  var toc = l.toc.length ? '<aside class="toc" aria-label="On this page"><p>On this page</p><ul>' + l.toc.map(function (t) { return '<li><a href="#" data-jump="' + t.id + '">' + e(t.text) + '</a></li>'; }).join('') + '<li><a href="#" data-jump="check">Lesson check</a></li><li><a href="#" data-jump="cards">Flashcards</a></li></ul></aside>' : '';
  view.html = '<article class="lesson wrap">' +
    '<nav class="crumbs" aria-label="Breadcrumb"><a href="#/paths">Paths</a><a href="#/module/' + m.id + '">' + e(m.title) + '</a></nav>' +
    '<header class="lesson-head"><h1>' + e(l.title) + '</h1><p class="meta"><span>Lesson ' + (i + 1) + ' of ' + m.lessons.length + '</span><span>' + l.minutes + ' min</span>' +
    (st === 'done' ? '<span class="chip pass">Passed</span>' : '') + '</p></header>' +
    '<div class="lesson-grid"><div class="prose" id="prose">' + l.html + '</div>' + toc + '</div>' +
    '<section class="check" id="check" aria-labelledby="check-h"><h2 id="check-h">Lesson check</h2><div id="quiz"></div></section>' +
    '<section class="cardsec" id="cards" aria-labelledby="cards-h"><h2 id="cards-h">Flashcards</h2><div id="deck"></div></section>' +
    '<nav class="pager" aria-label="Lesson navigation">' +
    (prev ? '<a class="btn btn-quiet" href="' + hrefLesson(prev) + '">Previous: ' + e(LES[prev].title) + '</a>' : '<span></span>') +
    '<span id="next-slot">' + nextButton(id, nxt) + '</span></nav></article>';
  view.after = function () {
    var q = $('#quiz'); if (q) startQuiz(id, q);
    var dk = $('#deck'); if (dk) startDeck(dk, l.cards.map(function (c, k) { return { key: id + '#' + k, lesson: id, idx: k, f: c.f, b: c.b }; }), 'lesson');
  };
}

function nextButton(id, nxt) {
  var m = MOD[LES[id].module];
  if (nxt) {
    return isDone(id) ? '<a class="btn btn-primary" href="' + hrefLesson(nxt) + '">Next: ' + e(LES[nxt].title) + '</a>'
      : '<span class="btn btn-disabled" aria-disabled="true">' + ICON.lock + ' Pass the check to unlock the next lesson</span>';
  }
  return isDone(id) ? '<a class="btn btn-primary" href="#/module/' + m.id + '">Stage complete: back to ' + e(m.title) + '</a>'
    : '<span class="btn btn-disabled" aria-disabled="true">' + ICON.lock + ' Pass the check to finish this stage</span>';
}

/* ----- quiz ----- */
function startQuiz(id, root) {
  var l = LES[id];
  var need = Math.ceil(l.quiz.length * PASS_RATIO);
  var done = isDone(id);
  function intro() {
    var best = S.lessons[id] && S.lessons[id].best;
    root.innerHTML = '<p>' + plural(l.quiz.length, 'question') + '. Answer ' + need + ' correctly to pass' + (done ? '. You passed this lesson' + (best != null ? ' with a best score of ' + best + '%' : '') + '.' : ' and unlock the next lesson.') + '</p>' +
      '<button class="btn btn-primary" type="button" id="qstart">' + (done ? 'Retake the check' : 'Start the check') + '</button>';
    $('#qstart', root).addEventListener('click', run);
  }
  function run() {
    var qs = shuffle(l.quiz.map(function (q, qi) { return { q: q, qi: qi }; }));
    var pos = 0, right = 0;
    function ask() {
      var item = qs[pos], q = item.q;
      var opts = shuffle(q.options.map(function (o, oi) { return { o: o, oi: oi }; }));
      root.innerHTML = '<div class="qprog" aria-hidden="true"><i style="width:' + (pos / qs.length * 100) + '%"></i></div>' +
        '<p class="qcount">Question ' + (pos + 1) + ' of ' + qs.length + '</p><h3 class="qtext">' + e(q.q) + '</h3>' +
        '<div class="opts" role="group" aria-label="Answer choices">' + opts.map(function (x, k) { return '<button type="button" class="opt" data-oi="' + x.oi + '"><span class="key">' + String.fromCharCode(65 + k) + '</span><span>' + e(x.o) + '</span></button>'; }).join('') + '</div>' +
        '<div class="feedback" id="fb" aria-live="polite"></div>';
      $$('.opt', root).forEach(function (b) {
        b.addEventListener('click', function () {
          var oi = Number(b.getAttribute('data-oi')), ok = oi === q.answer;
          if (ok) right++;
          $$('.opt', root).forEach(function (x) {
            x.disabled = true;
            if (Number(x.getAttribute('data-oi')) === q.answer) x.classList.add('right');
          });
          if (!ok) b.classList.add('wrong');
          var last = pos === qs.length - 1;
          $('#fb', root).innerHTML = '<p class="' + (ok ? 'ok' : 'bad') + '"><strong>' + (ok ? 'Correct.' : 'Not quite.') + '</strong> ' + e(q.why) + '</p>' +
            '<button class="btn btn-primary" type="button" id="qnext">' + (last ? 'See result' : 'Next question') + '</button>';
          var nb = $('#qnext', root); nb.focus();
          nb.addEventListener('click', function () { if (last) finish(); else { pos++; ask(); } });
        });
      });
    }
    function finish() {
      var pct = Math.round(right / qs.length * 100), pass = right >= need;
      if (pass) {
        var wasDone = isDone(id), mod = MOD[l.module], before = modDone(mod);
        var prev = S.lessons[id] || {};
        S.lessons[id] = { done: true, best: Math.max(prev.best || 0, pct), at: prev.at || Date.now(), attempts: (prev.attempts || 0) + 1 };
        markActive(); save(); renderChrome(); setNav('paths');
        var msg = '';
        if (!before && modDone(mod)) {
          var opened = MODS.filter(function (x) { return x.requires.indexOf(mod.id) >= 0 && modUnlocked(x); });
          msg = '<p class="stage-pass"><strong>Stage passed: ' + e(mod.title) + '.</strong> ' + (opened.length ? 'Now open: ' + opened.map(function (x) { return '<a href="#/module/' + x.id + '">' + e(x.title) + '</a>'; }).join(', ') + '.' : 'You have finished every lesson in this stage.') + '</p>';
        }
        root.innerHTML = '<div class="result pass"><h3>Passed with ' + pct + '%</h3><p>You answered ' + right + ' of ' + qs.length + ' correctly.' + (wasDone ? '' : ' The next lesson is now unlocked.') + '</p>' + msg +
          '<div class="actions"><button class="btn btn-quiet" type="button" id="qagain">Retake</button></div></div>';
        var slot = $('#next-slot'), m2 = MOD[l.module], i2 = m2.lessons.indexOf(id);
        if (slot) slot.innerHTML = nextButton(id, i2 < m2.lessons.length - 1 ? m2.lessons[i2 + 1] : null);
        var head = $('.lesson-head .meta'); if (head && !$('.chip', head)) head.insertAdjacentHTML('beforeend', '<span class="chip pass">Passed</span>');
        toast('Lesson passed.');
      } else {
        S.lessons[id] = Object.assign({}, S.lessons[id] || {}, { attempts: ((S.lessons[id] || {}).attempts || 0) + 1 }); save();
        root.innerHTML = '<div class="result fail"><h3>' + right + ' of ' + qs.length + ' correct</h3><p>You need ' + need + ' to pass. Re-read the sections you missed, then try again. The questions come in a new order each time.</p>' +
          '<div class="actions"><button class="btn btn-primary" type="button" id="qagain">Try again</button><a class="btn btn-quiet" href="#" data-jump="prose">Back to the lesson</a></div></div>';
      }
      var again = $('#qagain', root); if (again) again.addEventListener('click', run);
    }
    ask();
  }
  intro();
}

/* ----- flashcards (Leitner boxes) ----- */
function cardState(key) { return S.cards[key] || { box: 0, due: 0 }; }
function startDeck(root, items, mode) {
  if (!items.length) { root.innerHTML = '<p class="small">No flashcards for this lesson.</p>'; return; }
  var queue = items.slice(), total = items.length, seen = 0, flipped = false;
  function show() {
    if (!queue.length) {
      root.innerHTML = '<div class="result pass"><h3>Deck complete</h3><p>' + plural(total, 'card') + ' reviewed. Cards you rate "Got it" come back later; "Again" cards come back sooner.</p>' +
        (mode === 'lesson' ? '<div class="actions"><button class="btn btn-quiet" type="button" id="dagain">Go through the deck again</button></div>' : '<div class="actions"><a class="btn btn-quiet" href="#/review">Check for more</a></div>') + '</div>';
      var a = $('#dagain', root); if (a) a.addEventListener('click', function () { queue = items.slice(); seen = 0; show(); });
      return;
    }
    var c = queue[0]; flipped = false;
    root.innerHTML = '<p class="qcount">Card ' + Math.min(seen + 1, total) + ' of ' + total + '</p>' +
      '<button type="button" class="card" id="card" aria-live="polite"><span class="side">Question</span><span class="txt">' + e(c.f) + '</span><span class="hint">Select to show the answer</span></button>' +
      '<div class="rate" id="rate" hidden><button class="btn btn-quiet" type="button" data-r="again">Again</button><button class="btn btn-primary" type="button" data-r="good">Got it</button></div>';
    var card = $('#card', root);
    card.addEventListener('click', function () {
      flipped = !flipped;
      card.classList.toggle('back', flipped);
      card.innerHTML = '<span class="side">' + (flipped ? 'Answer' : 'Question') + '</span><span class="txt">' + e(flipped ? c.b : c.f) + '</span><span class="hint">' + (flipped ? 'Select to see the question' : 'Select to show the answer') + '</span>';
      $('#rate', root).hidden = !flipped;
    });
    $$('#rate button', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var good = b.getAttribute('data-r') === 'good';
        var cs = cardState(c.key), box = good ? Math.min(cs.box + 1, 5) : 1;
        var due = new Date(); due.setDate(due.getDate() + (good ? INTERVALS[box] : 0));
        S.cards[c.key] = { box: box, due: good ? due.getTime() : Date.now() };
        markActive(); save(); renderChrome(); setNav(view.nav);
        queue.shift(); seen++;
        if (!good) queue.push(c);
        show();
      });
    });
  }
  show();
}

function reviewView() {
  view.title = 'Review cards | MARGA by EknathaLabs'; view.nav = 'review';
  var now = Date.now(), due = [], learned = 0;
  Object.keys(LES).forEach(function (id) {
    if (!isDone(id)) return;
    LES[id].cards.forEach(function (c, k) {
      learned++;
      var cs = cardState(id + '#' + k);
      if (cs.box === 0 || cs.due <= now) due.push({ key: id + '#' + k, lesson: id, idx: k, f: c.f, b: c.b });
    });
  });
  due = shuffle(due).slice(0, 20);
  view.html = '<section class="page-head wrap"><h1>Review cards</h1><p class="lede">Flashcards from lessons you have passed. Cards you know come back less often.</p></section>' +
    '<div class="wrap narrow"><div id="review-deck">' + (learned === 0
      ? '<div class="empty"><h3>Nothing to review yet</h3><p>Pass your first lesson check and its flashcards appear here.</p><p><a class="btn btn-primary" href="#/paths">Choose a path</a></p></div>'
      : due.length === 0 ? '<div class="empty"><h3>You are all caught up</h3><p>' + plural(learned, 'card') + ' from passed lessons are scheduled for later. Come back tomorrow to keep them fresh.</p></div>' : '') + '</div></div>';
  view.after = function () { if (due.length) startDeck($('#review-deck'), due, 'review'); };
}

/* ----- cheat sheets ----- */
function sheetsView() {
  view.title = 'Cheat sheets | MARGA by EknathaLabs'; view.nav = 'cheatsheets';
  var ids = Object.keys(SHEETS);
  view.html = '<section class="page-head wrap"><h1>Cheat sheets</h1><p class="lede">One page for each tool. Always open, searchable and printable.</p>' +
    '<label class="field"><span class="sr">Filter cheat sheets</span><input id="sheet-filter" type="search" placeholder="Filter by tool or command" autocomplete="off"></label></section>' +
    '<div class="wrap"><ul class="sheet-list" id="sheet-list">' + ids.map(function (id) {
      var s = SHEETS[id];
      return '<li data-hay="' + e((s.title + ' ' + s.summary + ' ' + s.text).toLowerCase()) + '"><a href="#/cheatsheet/' + id + '"><strong>' + e(s.title) + '</strong><span>' + e(s.summary) + '</span></a></li>';
    }).join('') + '</ul><p class="empty hidden" id="sheet-empty">No cheat sheet matches that. Try a tool name such as "kubectl" or "terraform".</p></div>';
  view.after = function () {
    var f = $('#sheet-filter');
    f.addEventListener('input', function () {
      var q = f.value.trim().toLowerCase(), any = false;
      $$('#sheet-list li').forEach(function (li) { var ok = !q || li.getAttribute('data-hay').indexOf(q) >= 0; li.classList.toggle('hidden', !ok); if (ok) any = true; });
      $('#sheet-empty').classList.toggle('hidden', any);
    });
  };
}
function sheetView(id) {
  var s = SHEETS[id];
  if (!s) return notFound();
  view.title = s.title + ' cheat sheet | MARGA by EknathaLabs'; view.nav = 'cheatsheets';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/cheatsheets">Cheat sheets</a></nav><h1>' + e(s.title) + ' cheat sheet</h1><p class="lede">' + e(s.summary) + '</p>' +
    '<div class="actions"><button class="btn btn-quiet" type="button" onclick="window.print()">Print or save as PDF</button><a class="btn btn-quiet" href="cheatsheets/' + id + '.html" target="_blank" rel="noopener">Open standalone page</a>' +
    (s.module && MOD[s.module] ? '<a class="btn btn-quiet" href="#/module/' + s.module + '">Open the ' + e(MOD[s.module].title) + ' stage</a>' : '') + '</div></section>' +
    '<div class="wrap"><article class="sheet">' + s.html + '</article></div>';
  view.after = null;
}

/* ----- labs ----- */
function labsView() {
  view.title = 'Labs | MARGA by EknathaLabs'; view.nav = 'labs';
  view.html = '<section class="page-head wrap"><h1>Hands-on labs</h1><p class="lede">Planned. Labs are not available yet, and nothing on this site depends on them.</p></section>' +
    '<div class="wrap narrow prose"><h2>What is planned</h2><ul>' +
    '<li><strong>Terminal practice in the browser</strong> for Linux and Bash, with each task checked automatically.</li>' +
    '<li><strong>Break and fix scenarios</strong> where a service is failing and you find the cause, based on real incidents.</li>' +
    '<li><strong>Kubernetes and Docker exercises</strong> that match the lesson you just passed, including CKA and CKS style tasks.</li>' +
    '<li><strong>Infrastructure as code exercises</strong> for Terraform plans and state problems.</li></ul>' +
    '<h2>What you can do today</h2><p>Each lesson contains a written incident walkthrough with sample output, a lesson check and flashcards. Cheat sheets cover the commands you will use when labs arrive.</p>' +
    '<p><a class="btn btn-primary" href="https://eknathalabs.substack.com" target="_blank" rel="noopener">Get launch news in the newsletter</a></p></div>';
  view.after = null;
}

/* ----- progress ----- */
function progressView() {
  view.title = 'Your progress | MARGA by EknathaLabs'; view.nav = 'progress';
  var st = streaks(), t = totals();
  var cells = '', set = {}; S.days.forEach(function (k) { set[k] = 1; });
  var start = new Date(); start.setDate(start.getDate() - 83);
  for (var b = 0; b < start.getDay(); b++) cells += '<i class="pad"></i>';
  for (var i = 0; i < 84; i++) {
    var d = new Date(start); d.setDate(start.getDate() + i);
    cells += '<i class="' + (set[dayKey(d)] ? 'on' : '') + '" title="' + dayKey(d) + (set[dayKey(d)] ? ': active' : '') + '"></i>';
  }
  var mods = MODS.map(function (m) {
    var n = modCount(m), pct = Math.round(n / m.lessons.length * 100);
    return '<li><a href="#/module/' + m.id + '"><span>' + e(m.title) + '</span><span class="bar"><i style="width:' + pct + '%"></i></span><b>' + n + '/' + m.lessons.length + '</b></a></li>';
  }).join('');
  view.html = '<section class="page-head wrap"><h1>Your progress</h1><p class="lede">Saved in this browser. Export a backup if you switch devices.</p></section>' +
    '<div class="wrap"><dl class="today wide"><div><dt>Current streak</dt><dd>' + st.cur + '<small> ' + (st.cur === 1 ? 'day' : 'days') + '</small></dd></div><div><dt>Best streak</dt><dd>' + st.best + '<small> ' + (st.best === 1 ? 'day' : 'days') + '</small></dd></div>' +
    '<div><dt>Lessons passed</dt><dd>' + t.done + '<small> of ' + t.total + '</small></dd></div><div><dt>Active days</dt><dd>' + S.days.length + '</dd></div></dl>' +
    (st.cur && !st.today ? '<p class="small">Do one lesson check or review a card today to keep your streak.</p>' : '') +
    '<h2 class="sub-h">Activity, last 12 weeks</h2><div class="heat" aria-hidden="true">' + cells + '</div>' +
    '<h2 class="sub-h">Completion by stage</h2><ul class="modbars">' + mods + '</ul>' +
    '<h2 class="sub-h">Your data</h2><div class="actions"><button class="btn btn-quiet" type="button" data-act="export">Export progress</button>' +
    '<label class="btn btn-quiet file">Import progress<input type="file" accept="application/json" id="import-file"></label>' +
    '<button class="btn btn-quiet danger" type="button" data-act="reset" id="reset-btn">Reset all progress</button></div></div>';
  view.after = function () {
    $('#import-file').addEventListener('change', function (ev) {
      var f = ev.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var o = JSON.parse(r.result);
          if (!o || o.v !== 1 || typeof o.lessons !== 'object' || !Array.isArray(o.days)) throw new Error('bad');
          S = { v: 1, lessons: o.lessons || {}, cards: o.cards || {}, days: o.days, path: o.path || 'devops' };
          save(); renderChrome(); toast('Progress imported.'); route();
        } catch (x) { toast('That file is not a MARGA progress export.'); }
      };
      r.readAsText(f);
    });
  };
}

/* ---------- router ---------- */
var routes = [
  [/^\/$/, homeView], [/^\/paths$/, pathsView], [/^\/path\/([\w-]+)$/, pathView],
  [/^\/module\/([\w-]+)$/, moduleView], [/^\/lesson\/([\w-]+)\/([\w-]+)$/, lessonView],
  [/^\/cheatsheets$/, sheetsView], [/^\/cheatsheet\/([\w-]+)$/, sheetView],
  [/^\/review$/, reviewView], [/^\/labs$/, labsView], [/^\/progress$/, progressView]
];
function route() {
  var h = location.hash.replace(/^#/, '') || '/';
  if (h.charAt(0) !== '/') h = '/';
  var res;
  for (var i = 0; i < routes.length; i++) {
    var m = h.match(routes[i][0]);
    if (m) { res = routes[i][1].apply(null, m.slice(1)); break; }
  }
  if (res === undefined && !routes.some(function (r) { return r[0].test(h); })) notFound();
  if (res === 'redirect') return;
  document.title = view.title;
  $('#main').innerHTML = view.html;
  setNav(view.nav);
  window.scrollTo(0, 0);
  if (view.after) view.after();
  var hd = $('#main h1'); if (hd) { hd.setAttribute('tabindex', '-1'); }
}

/* ---------- search ---------- */
var INDEX = null;
function buildIndex() {
  INDEX = [];
  MODS.forEach(function (m) { INDEX.push({ kind: 'Stage', title: m.title, sub: m.summary, href: '#/module/' + m.id, hay: (m.title + ' ' + m.summary).toLowerCase(), t: m.title.toLowerCase() }); });
  Object.keys(LES).forEach(function (id) {
    var l = LES[id];
    INDEX.push({ kind: 'Lesson', title: l.title, sub: MOD[l.module].title, href: hrefLesson(id), lesson: id, hay: (l.title + ' ' + l.summary + ' ' + l.toc.map(function (x) { return x.text; }).join(' ')).toLowerCase(), t: l.title.toLowerCase() });
  });
  Object.keys(SHEETS).forEach(function (id) {
    var s = SHEETS[id];
    INDEX.push({ kind: 'Cheat sheet', title: s.title, sub: s.summary, href: '#/cheatsheet/' + id, hay: (s.title + ' ' + s.summary + ' ' + s.text).toLowerCase(), t: s.title.toLowerCase() });
  });
}
function searchResults(q) {
  if (!INDEX) buildIndex();
  var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  var out = [];
  INDEX.forEach(function (it) {
    var ok = terms.every(function (t) { return it.hay.indexOf(t) >= 0; });
    if (!ok) return;
    var score = 0;
    terms.forEach(function (t) { if (it.t.indexOf(t) >= 0) score += 3; if (it.t.indexOf(t) === 0) score += 2; });
    if (it.kind === 'Lesson') score += 1;
    out.push({ it: it, score: score });
  });
  out.sort(function (a, b) { return b.score - a.score; });
  return out.slice(0, 12).map(function (x) { return x.it; });
}
var sel = 0, results = [], lastFocus = null;
function openSearch() {
  lastFocus = document.activeElement;
  $('#search-root').innerHTML = '<div class="modal" id="smodal"><div class="modal-back" data-act="close-search"></div>' +
    '<div class="modal-box" role="dialog" aria-modal="true" aria-label="Search"><label class="sr" for="sq">Search lessons and cheat sheets</label>' +
    '<input id="sq" type="search" placeholder="Search lessons, tools and commands" autocomplete="off">' +
    '<ul id="sres" role="listbox" aria-label="Results"></ul><p class="small" id="shint">Type to search. Use the arrow keys and Enter. Press Escape to close.</p></div></div>';
  var inp = $('#sq'); inp.focus();
  inp.addEventListener('input', function () { results = searchResults(inp.value); sel = 0; paintResults(inp.value); });
  inp.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); sel = Math.min(sel + 1, results.length - 1); paintResults(inp.value); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); sel = Math.max(sel - 1, 0); paintResults(inp.value); }
    else if (ev.key === 'Enter' && results[sel]) { ev.preventDefault(); go(results[sel]); }
  });
}
function paintResults(q) {
  var ul = $('#sres'); if (!ul) return;
  if (!q.trim()) { ul.innerHTML = ''; $('#shint').textContent = 'Type to search. Use the arrow keys and Enter. Press Escape to close.'; return; }
  $('#shint').textContent = results.length ? plural(results.length, 'result') : 'Nothing matches "' + q + '". Try a tool name or a command.';
  ul.innerHTML = results.map(function (r, i) {
    var locked = r.lesson && lessonState(r.lesson) === 'locked';
    return '<li role="option" aria-selected="' + (i === sel) + '" class="' + (i === sel ? 'sel' : '') + '" data-i="' + i + '"><span class="k">' + r.kind + '</span><span class="t">' + e(r.title) + (locked ? ' ' + ICON.lock : '') + '</span><span class="s">' + e(r.sub) + '</span></li>';
  }).join('');
}
function go(r) { closeSearch(true); location.hash = r.href.replace(/^#/, ''); }
function closeSearch(skipFocus) { $('#search-root').innerHTML = ''; if (!skipFocus && lastFocus && lastFocus.focus) lastFocus.focus(); }

/* ---------- events ---------- */
document.addEventListener('click', function (ev) {
  var t = ev.target;
  var jump = t.closest('[data-jump]');
  if (jump) {
    ev.preventDefault();
    var el = document.getElementById(jump.getAttribute('data-jump'));
    if (el) { el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); }
    return;
  }
  var lock = t.closest('a[data-locked]');
  if (lock) { ev.preventDefault(); toast('Locked. ' + lock.getAttribute('data-locked')); return; }
  var copy = t.closest('.copy');
  if (copy) {
    var txt = copy.getAttribute('data-copy') || '', old = copy.textContent;
    var done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = old; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { toast('Copy failed. Select the text and copy it manually.'); });
    else { var ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (x) { toast('Copy failed.'); } ta.remove(); }
    return;
  }
  var li = t.closest('#sres li');
  if (li) { go(results[Number(li.getAttribute('data-i'))]); return; }
  var act = t.closest('[data-act]');
  if (!act) return;
  var a = act.getAttribute('data-act');
  if (a === 'search') openSearch();
  else if (a === 'close-search') closeSearch();
  else if (a === 'theme') {
    var n = theme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', n);
    try { localStorage.setItem('ea.theme', n); } catch (x) { /* ignore */ }
    renderChrome(); setNav(view.nav);
  } else if (a === 'menu') {
    var nav = $('#topnav'), open = !nav.classList.contains('open');
    nav.classList.toggle('open', open); act.setAttribute('aria-expanded', String(open));
  } else if (a === 'pick-path') {
    S.path = act.getAttribute('data-id'); save();
    if (act.getAttribute('data-go') === 'home') { location.hash = '/'; toast('Home path set to ' + PATH[S.path].title + '.'); } else route();
  } else if (a === 'export') {
    var blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'marga-progress-' + dayKey() + '.json'; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('Progress exported.');
  } else if (a === 'reset') {
    if (act.getAttribute('data-armed')) { S = fresh(); save(); renderChrome(); toast('Progress reset.'); route(); }
    else { act.setAttribute('data-armed', '1'); act.textContent = 'Select again to confirm reset'; setTimeout(function () { if (act.isConnected) { act.removeAttribute('data-armed'); act.textContent = 'Reset all progress'; } }, 5000); }
  }
});
document.addEventListener('keydown', function (ev) {
  var tag = (document.activeElement && document.activeElement.tagName) || '';
  var typing = /INPUT|TEXTAREA|SELECT/.test(tag);
  if (ev.key === 'Escape') { if ($('#smodal')) closeSearch(); var nv = $('#topnav'); if (nv) nv.classList.remove('open'); return; }
  if ((ev.key === 'k' && (ev.metaKey || ev.ctrlKey)) || (ev.key === '/' && !typing)) { ev.preventDefault(); if (!$('#smodal')) openSearch(); }
});
window.addEventListener('hashchange', function () { var nv = $('#topnav'); if (nv) nv.classList.remove('open'); route(); });

/* ---------- start ---------- */
renderChrome();
route();
visitors();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache is optional */ }); });
}
})();
