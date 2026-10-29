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
function fresh() { return { v: 1, lessons: {}, cards: {}, days: [], path: 'devops', iv: {} }; }
function load() {
  try {
    var s = localStorage.getItem(KEY);
    if (s) { var o = JSON.parse(s); if (o && o.v === 1 && o.lessons && o.cards && Array.isArray(o.days)) { if (!o.iv || typeof o.iv !== 'object') o.iv = {}; return o; } }
  } catch (x) { /* storage unavailable */ }
  return memStore || fresh();
}
var S = load();
function save() { memStore = S; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (x) { /* ignore */ } if (typeof refreshTree === 'function') refreshTree(); }

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


/* ---------- print, voice and references ---------- */
function printBar() {
  return '<button class="btn btn-quiet" type="button" data-act="print">Print</button>' +
    '<button class="btn btn-quiet" type="button" data-act="pdf">Save as PDF</button>';
}
function refsHtml(list, heading) {
  if (!list || !list.length) return '';
  return '<section class="refs" aria-labelledby="refs-h"><h2 id="refs-h">' + (heading || 'Official references') + '</h2>' +
    '<p class="small">Read the vendor and project documentation for the full, current detail.</p><ul>' +
    list.map(function (r) { return '<li><a href="' + e(r.u) + '" target="_blank" rel="noopener">' + e(r.t) + '</a><span class="host">' + e(r.u.replace(/^https:\/\/([^\/]+).*$/, '$1')) + '</span></li>'; }).join('') + '</ul></section>';
}
function voiceSlot() { return '<div id="voice-slot"></div>'; }
function wireSay(root) {
  $$('[data-say]', root || document).forEach(function (b) {
    if (b.getAttribute('data-wired')) return;
    b.setAttribute('data-wired', '1');
    if (window.MargaVoice) MargaVoice.sayButton(b, function () { return b.getAttribute('data-say'); }); else b.hidden = true;
  });
}
function mountVoice() {
  var slot = $('#voice-slot');
  if (slot && window.MargaVoice && view.voice) MargaVoice.mount(slot, function () { return $(view.voice); }, view.voiceLabel || '');
  wireSay(document);
}
function printTitle(title) {
  var old = document.title;
  document.title = title;
  setTimeout(function () { document.title = old; }, 1500);
}
function doPrint(pdf) {
  if (window.MargaVoice) MargaVoice.stop();
  if (pdf) toast('In the print dialog, choose "Save as PDF" as the destination.');
  var h = $('#main h1');
  printTitle('MARGA - ' + (h ? h.textContent : 'EknathaLabs'));
  setTimeout(function () { window.print(); }, pdf ? 400 : 0);
}

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
    '<div class="utilbar"><div class="wrap utilbar-in"><span class="util-promise">Free \u00b7 No login \u00b7 No ads \u00b7 No cookies</span>' +
    (D.counter ? '<span class="visitors" id="visitors" role="status" aria-label="Visitor count" hidden></span>' : '') + '</div></div>' +
    '<header class="topbar"><div class="wrap topbar-in">' +
    '<a class="brand" href="#/"><img src="icon.svg" alt="" width="26" height="26"><span><b>MARGA</b></span></a>' +
    '<nav class="topnav" id="topnav" aria-label="Main">' +
    '<a href="#/skills" data-nav="skills">Skills</a><a href="#/paths" data-nav="paths" aria-controls="pmega" aria-expanded="false">Skill trees</a>' +
    '<button class="pm-toggle" type="button" data-act="pm-toggle" aria-controls="pmega" aria-expanded="false" aria-label="Show the skills in each path"></button><div class="pmega" id="pmega" hidden></div>' +
    '<a href="#/cheatsheets" data-nav="cheatsheets">Cheat sheets</a><a href="#/cases" data-nav="cases">Case studies</a><a href="#/practice" data-nav="practice">Practice</a>' +
    '<a class="nav-certs" href="https://certs.eknathalabs.com" target="_blank" rel="noopener" title="Certifications (opens in a new tab)">Certifications</a><a href="#/progress" data-nav="progress">Progress</a><a href="#/interview" data-nav="interview">InterviewHub</a><a href="#/about" data-nav="about">About</a></nav>' +
    '<div class="tools">' +
    '<button class="btn btn-quiet search-btn" type="button" data-act="search" aria-label="Search lessons and cheat sheets">' + ICON.search + '<span>Search</span><kbd>/</kbd></button>' +
    '<a class="streak' + (st.cur ? ' on' : '') + '" href="#/progress" title="Current streak ' + plural(st.cur, 'day') + ', best ' + plural(st.best, 'day') + '" aria-label="Current streak ' + plural(st.cur, 'day') + '">' + ICON.flame + '<b>' + st.cur + '</b></a>' +
    '<button class="btn btn-quiet icon-btn a11y-btn" type="button" data-act="a11y" aria-label="Reading and accessibility options" aria-expanded="false" aria-controls="a11y-panel"><b aria-hidden="true">Aa</b></button>' +
    '<button class="btn btn-quiet icon-btn" type="button" data-act="theme" aria-label="Switch to ' + (theme() === 'dark' ? 'light' : 'dark') + ' theme">' + (theme() === 'dark' ? ICON.sun : ICON.moon) + '</button>' +
    '<button class="btn btn-quiet icon-btn menu-btn" type="button" data-act="menu" aria-label="Menu" aria-expanded="false"><span></span></button>' +
    '</div></div></header>';
  $('#footer').innerHTML =
    '<footer class="foot"><div class="wrap foot-in">' +
    '<span>MARGA by EknathaLabs</span>' +
    '<a href="cheatsheets/">Printable cheat sheets</a><a href="#/interview">InterviewHub</a><a href="#/practice">Practice</a><a href="#/glossary">Glossary</a><a href="#/terminal-labs">Terminal labs</a><a href="#/badges">Badges</a><a href="#/license">Open content license</a>' +
    '<span class="foot-note">Progress is saved in this browser only.</span>' +
    '<p class="foot-promise">Free \u00b7 No login \u00b7 No ads \u00b7 No cookies</p><p class="small foot-ver">Version ' + siteVer() + '</p></div></footer>';
  if (window.MargaCounter && D.counter) MargaCounter.rebind('#visitors');
}

/* ---------- Skill trees panel in the nav: every path and its skills ---------- */
var pmTimer = 0, pmSkip = false;
function pmWide() { return !window.matchMedia || window.matchMedia('(min-width: 901px)').matches; }
function pmHtml() {
  return '<div class="wrap pm-in">' + LIVE.map(function (p) {
    var pp = pathProgress(p), pct = pp.total ? Math.round(pp.done / pp.total * 100) : 0;
    return '<section class="pm-col" aria-label="' + e(p.title) + '"><h3><a href="#/path/' + p.id + '">' + e(p.title) + '</a></h3>' +
      '<p class="pm-meta">' + plural(p.modules.length, 'skill') + ', about ' + hours(pp.minutes) + '</p>' +
      '<div class="pm-bar" role="img" aria-label="' + pct + ' percent complete"><i style="width:' + pct + '%"></i></div>' +
      '<ol class="pm-list">' + p.modules.map(function (id) {
        var m = MOD[id], st = modStatus(m);
        return '<li class="m-' + st + '"><a href="#/module/' + id + '" title="' + e(m.title) + '"><i class="pm-dot" aria-hidden="true"></i><span>' + e(m.title) + '</span><em class="sr">' + ({ pass: ', passed', run: ', in progress', ready: ', ready', lock: ', locked' }[st]) + '</em></a></li>';
      }).join('') + '</ol></section>';
  }).join('') + '</div><div class="wrap pm-foot"><a href="#/paths">Open the skill tree view</a></div>';
}
function pmOpen(on) {
  var m = $('#pmega'); if (!m) return;
  clearTimeout(pmTimer);
  if (on && m.hidden) m.innerHTML = pmHtml();
  m.hidden = !on;
  var lk = $('#topnav a[data-nav="paths"]'), bt = $('.pm-toggle');
  if (lk) lk.setAttribute('aria-expanded', String(on));
  if (bt) bt.setAttribute('aria-expanded', String(on));
  $('#topnav').classList.toggle('pm-on', on);
}
function inPm(t) { return !!(t && t.closest && (t.closest('#pmega') || t.closest('#topnav a[data-nav="paths"]'))); }
document.addEventListener('mouseover', function (ev) { if (pmWide() && inPm(ev.target)) pmOpen(true); });
document.addEventListener('mouseout', function (ev) {
  if (pmWide() && inPm(ev.target) && !inPm(ev.relatedTarget)) { clearTimeout(pmTimer); pmTimer = setTimeout(function () { pmOpen(false); }, 180); }
});
document.addEventListener('focusin', function (ev) {
  var m = $('#pmega'); if (!m || pmSkip) return;
  if (pmWide() && inPm(ev.target)) pmOpen(true);
  else if (pmWide() && !m.hidden) pmOpen(false);
});

/* ---------- visitor count: see counter.js ---------- */
function siteVer() { try { var m = /[?&]v=([0-9a-f]+)/.exec(document.querySelector('script[src*="app.js"]').getAttribute('src')); return m ? m[1] : 'dev'; } catch (x) { return 'dev'; } }
function visitors() { if (window.MargaCounter && D.counter) MargaCounter.init(D.counter, '#visitors'); }
function setNav(name) {
  $$('#topnav a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('data-nav') === name); });
}

/* ---------- skill tree component ---------- */
var TIER_NAMES = ['Foundations', 'Core skills', 'Platform skills', 'Advanced skills', 'Mastery'];
function treeTiers(p) {
  var inPath = {}; p.modules.forEach(function (id) { inPath[id] = true; });
  var depth = {};
  function d(id) {
    if (depth[id] !== undefined) return depth[id];
    var r = MOD[id].requires.filter(function (x) { return inPath[x]; });
    depth[id] = r.length ? 1 + Math.max.apply(null, r.map(d)) : 0;
    return depth[id];
  }
  p.modules.forEach(d);
  var tiers = [];
  p.modules.forEach(function (id) { (tiers[depth[id]] = tiers[depth[id]] || []).push(id); });
  return tiers.filter(Boolean);
}
var treeSel = '';
var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
function nodeHtml(m, pid, nextId) {
  var s = modStatus(m), n = modCount(m), tot = m.lessons.length, pct = Math.round(n / tot * 100);
  var label = { pass: 'Mastered', run: 'In progress', ready: 'Ready to unlock skills', lock: 'Locked' }[s];
  var badge = s === 'pass' ? ICON.check : s === 'lock' ? ICON.lock : s === 'ready' ? PLAY : '<span>' + pct + '%</span>';
  var need = s === 'lock' ? m.requires.map(function (r) { return MOD[r].title; }).join(' and ') : '';
  var nx = m.id === nextId;
  return '<li class="node s-' + s + (nx ? ' next' : '') + '" data-id="' + m.id + '" data-req="' + e(m.requires.join(' ')) + '" style="--p:' + pct + '">' +
    '<a href="#/module/' + m.id + '" aria-label="' + e(m.title) + ', ' + label + ', ' + n + ' of ' + tot + ' lessons passed' + (need ? '. Needs ' + e(need) : '') + (nx ? '. Next up' : '') + '. Select to see details">' +
    (nx ? '<span class="nexttag">Next up</span>' : '') +
    '<span class="ring"><span class="badge">' + badge + '</span></span>' +
    '<span class="name">' + e(m.title) + '</span><span class="sub">' + (s === 'lock' ? 'Needs ' + e(need) : 'Level ' + n + ' of ' + tot) + '</span></a></li>';
}
function treeNextMod(p) { var nx = nextInPath(p); return nx ? LES[nx].module : ''; }
function treeDefaultSel(p) { return treeNextMod(p) || p.modules[0]; }
function treeDetail(p, id) {
  var m = MOD[id]; if (!m) return '';
  var s = modStatus(m), n = modCount(m), tot = m.lessons.length;
  var word = { pass: 'Mastered', run: 'In progress', ready: 'Ready', lock: 'Locked' }[s];
  var unlocks = p.modules.filter(function (x) { return MOD[x].requires.indexOf(id) >= 0; });
  var rw = { pass: 'Mastered', run: 'In progress', ready: 'Ready', lock: 'Locked' };
  var needs = m.requires.length ? '<h4>Needs first</h4><ul class="td-list">' + m.requires.map(function (r) {
    var rs = modStatus(MOD[r]);
    return '<li class="m-' + rs + '"><i class="td-dot" aria-hidden="true"></i><a href="#/module/' + r + '">' + e(MOD[r].title) + '</a><span>' + rw[rs] + '</span></li>';
  }).join('') + '</ul>' : '<p class="td-note">No prerequisites. A good place to start.</p>';
  var unl = unlocks.length ? '<h4>Unlocks</h4><ul class="td-list">' + unlocks.map(function (x) {
    return '<li class="m-' + modStatus(MOD[x]) + '"><i class="td-dot" aria-hidden="true"></i><a href="#/module/' + x + '">' + e(MOD[x].title) + '</a></li>';
  }).join('') + '</ul>' : '';
  var cta;
  if (s === 'lock') { var mr = missingReqs(m)[0]; cta = '<a class="btn btn-primary" href="#/module/' + mr.id + '">First: ' + e(mr.title) + '</a>'; }
  else {
    var nl = m.lessons.filter(function (l) { return !isDone(l); })[0];
    cta = nl ? '<a class="btn btn-primary" href="' + hrefLesson(nl) + '">' + (n ? 'Continue: ' : 'Start: ') + e(LES[nl].title) + '</a>' : '<span class="chip pass">All lessons passed</span>';
  }
  return '<button class="td-close" type="button" data-act="tree-close" aria-label="Close details">' + '&times;' + '</button>' +
    '<p class="td-state s-' + s + '">' + word + '</p><h3>' + e(m.title) + '</h3><p class="td-sum">' + e(m.summary) + '</p>' +
    '<dl class="td-stats"><div><dt>Lessons</dt><dd>' + tot + '</dd></div><div><dt>Study time</dt><dd>' + hours(m.minutes) + '</dd></div><div><dt>Passed</dt><dd>' + n + '/' + tot + '</dd></div></dl>' +
    needs + unl + '<div class="td-cta">' + cta + '<a class="btn btn-quiet" href="#/module/' + m.id + '">Open the ' + e(m.title) + ' page</a></div>' +
    '<h4>Lessons</h4><ol class="td-lessons">' + m.lessons.slice(0, 8).map(function (l) { return '<li class="' + (isDone(l) ? 'done' : '') + '"><a href="' + hrefLesson(l) + '">' + e(LES[l].title) + '</a></li>'; }).join('') + '</ol>' + (m.lessons.length > 8 ? '<p class="td-note"><a href="#/module/' + m.id + '">All ' + m.lessons.length + ' lessons</a></p>' : '');
}
function treeHtml(p) {
  var tiers = treeTiers(p), pp = pathProgress(p), nextId = treeNextMod(p);
  var sel = treeSel && p.modules.indexOf(treeSel) >= 0 ? treeSel : treeDefaultSel(p);
  var xp = pp.done * 100, rank = pp.done === 0 ? 'Newcomer' : pp.done < pp.total * .25 ? 'Apprentice' : pp.done < pp.total * .6 ? 'Practitioner' : pp.done < pp.total ? 'Senior' : 'Master';
  var mastered = p.modules.filter(function (id) { return modDone(MOD[id]); }).length;
  return '<div class="tree-wrap"><p class="tree-meta"><span><b>' + xp + '</b> skill points</span><span>Rank: <b>' + rank + '</b></span><span>' + pp.done + ' of ' + pp.total + ' lessons passed</span><span>' + mastered + ' of ' + p.modules.length + ' skills mastered</span></p>' +
    '<div class="tree-layout"><div class="tree" data-path="' + p.id + '" data-sel="' + e(sel) + '" role="group" aria-label="' + e(p.title) + ' skill tree"><svg class="tree-lines" aria-hidden="true" focusable="false"></svg>' +
    tiers.map(function (t, i) { return '<div class="tier"><p class="tier-name">' + (TIER_NAMES[i] || 'Tier ' + (i + 1)) + '</p><ol class="tier-nodes">' + t.map(function (id) { return nodeHtml(MOD[id], p.id, nextId); }).join('') + '</ol></div>'; }).join('') +
    '</div><aside class="tree-detail" aria-live="polite" aria-label="Skill details">' + treeDetail(p, sel) + '</aside></div>' +
    '<ul class="tree-key" aria-label="Key"><li class="k-pass">Mastered</li><li class="k-run">In progress</li><li class="k-ready">Ready</li><li class="k-lock">Locked</li><li class="k-line">Needs or unlocks the selected skill</li></ul>' +
    '<p class="tree-legend small">Select a skill to see what it needs and unlocks. Pass every lesson check in a skill to master it. Locked skills open when the skills that lead into them are mastered.</p></div>';
}
function treeApply(tr, id) {
  if (!tr) return;
  var sel = id || tr.getAttribute('data-sel'), rel = {};
  var ns = $$('.node', tr);
  ns.forEach(function (n) {
    var nid = n.getAttribute('data-id'), req = ' ' + (n.getAttribute('data-req') || '') + ' ';
    if (nid === sel) { (n.getAttribute('data-req') || '').split(' ').forEach(function (r) { if (r) rel[r] = 1; }); }
    else if (req.indexOf(' ' + sel + ' ') >= 0) rel[nid] = 1;
  });
  ns.forEach(function (n) { var nid = n.getAttribute('data-id'); n.classList.toggle('sel', nid === sel); n.classList.toggle('rel', !!rel[nid] && nid !== sel); var a = $('a', n); if (a) { if (nid === tr.getAttribute('data-sel')) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); } });
  $$('.tree-lines .ln', tr).forEach(function (l) { l.classList.toggle('hl', l.getAttribute('data-f') === sel || l.getAttribute('data-t') === sel); });
  tr.classList.toggle('has-sel', !!sel);
}
function treeSelect(tr, id, sheet) {
  var p = PATH[tr.getAttribute('data-path')]; if (!p || !MOD[id]) return;
  treeSel = id; tr.setAttribute('data-sel', id);
  var wrap = tr.closest('.tree-wrap'), det = $('.tree-detail', wrap);
  if (det) det.innerHTML = treeDetail(p, id);
  if (sheet) wrap.classList.add('tsheet');
  treeApply(tr);
}
document.addEventListener('click', function (ev) {
  var a = ev.target.closest && ev.target.closest('.tree .node a'); if (!a) return;
  ev.preventDefault(); var n = a.closest('.node'), tr = n.closest('.tree'); treeSelect(tr, n.getAttribute('data-id'), true);
});
document.addEventListener('mouseover', function (ev) { var n = ev.target.closest && ev.target.closest('.tree .node'); if (n) treeApply(n.closest('.tree'), n.getAttribute('data-id')); });
document.addEventListener('mouseout', function (ev) { var n = ev.target.closest && ev.target.closest('.tree .node'); if (n && !(ev.relatedTarget && ev.relatedTarget.closest && ev.relatedTarget.closest('.tree .node'))) treeApply(n.closest('.tree')); });
document.addEventListener('focusin', function (ev) { var n = ev.target.closest && ev.target.closest('.tree .node'); if (n) treeApply(n.closest('.tree'), n.getAttribute('data-id')); });
document.addEventListener('focusout', function (ev) { var n = ev.target.closest && ev.target.closest('.tree .node'); if (n) treeApply(n.closest('.tree')); });
function drawTree() {
  $$('.tree').forEach(function (tr) {
    var svg = $('.tree-lines', tr); if (!svg) return;
    var box = tr.getBoundingClientRect(), w = tr.offsetWidth, h = tr.offsetHeight, k = box.width ? w / box.width : 1;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    var nodes = {}; $$('.node', tr).forEach(function (n) { nodes[n.getAttribute('data-id')] = n; });
    var out = '<defs><marker id="tl-ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>';
    Object.keys(nodes).forEach(function (id) {
      (nodes[id].getAttribute('data-req') || '').split(' ').forEach(function (r) {
        if (!r || !nodes[r]) return;
        var pn = nodes[r], cn = nodes[id];
        var pr = $('.ring', pn).getBoundingClientRect(), nm = $('.name', pn).getBoundingClientRect(), cr = $('.ring', cn).getBoundingClientRect(), pt = pn.closest('.tier').getBoundingClientRect();
        var x1 = (pr.left + pr.width / 2 - box.left) * k, y1 = (nm.bottom - box.top) * k + 5, x2 = (cr.left + cr.width / 2 - box.left) * k, y2 = (cr.top - box.top) * k - 3;
        var ym = (pt.bottom - box.top) * k + 18, rr = 10, dx = x2 - x1, sg = dx > 0 ? 1 : -1, d;
        if (Math.abs(dx) < 1) d = 'M' + x1 + ' ' + y1 + ' V' + y2;
        else if (Math.abs(dx) < 2 * rr) d = 'M' + x1 + ' ' + y1 + ' V' + ym + ' H' + x2 + ' V' + y2;
        else d = 'M' + x1 + ' ' + y1 + ' V' + (ym - rr) + ' Q' + x1 + ' ' + ym + ' ' + (x1 + sg * rr) + ' ' + ym + ' H' + (x2 - sg * rr) + ' Q' + x2 + ' ' + ym + ' ' + x2 + ' ' + (ym + rr) + ' V' + y2;
        var done = pn.classList.contains('s-pass'), cs = cn.classList;
        var cls = done && cs.contains('s-pass') ? 'ln done' : done && cs.contains('s-run') ? 'ln active run' : done && cs.contains('s-ready') ? 'ln active' : 'ln';
        out += '<path d="' + d + '" class="' + cls + '" data-f="' + r + '" data-t="' + id + '"/>';
      });
    });
    svg.innerHTML = out;
    treeApply(tr);
  });
}
var treeRO = null;
function armTree() {
  var tr = $('.tree'); if (!tr) return;
  treeSig = treeState();
  requestAnimationFrame(function () { requestAnimationFrame(drawTree); });
  if (window.ResizeObserver) { if (treeRO) treeRO.disconnect(); treeRO = new ResizeObserver(function () { drawTree(); }); treeRO.observe(tr); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawTree);
}
window.addEventListener('resize', function () { drawTree(); });
/* Live tree: rebuild the nodes whenever progress changes (same tab, other tab, or returning to the tab). */
var treeSig = '';
function treeState() { return JSON.stringify(S.lessons || {}); }
function refreshTree() {
  var wrap = $('.tree-wrap'); if (!wrap) { treeSig = ''; return; }
  var tr = $('.tree', wrap), p = tr && PATH[tr.getAttribute('data-path')]; if (!p) return;
  var sig = treeState(); if (sig === treeSig) return; var first = !treeSig; treeSig = sig;
  if (first) return;
  var before = {}; $$('.node', wrap).forEach(function (n) { before[n.getAttribute('data-id')] = n.className; });
  var tmp = document.createElement('div'); tmp.innerHTML = treeHtml(p);
  wrap.innerHTML = tmp.firstChild.innerHTML;
  $$('.node', wrap).forEach(function (n) { if (before[n.getAttribute('data-id')] !== n.className) n.classList.add('just'); });
  armTree();
}
window.addEventListener('storage', function (ev) {
  if (ev.key !== KEY) return;
  try { var v = JSON.parse(ev.newValue || 'null'); if (v && v.lessons) { S.lessons = v.lessons; refreshTree(); } } catch (x) { /* ignore */ }
});
document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshTree(); });

/* ---------- views ---------- */
var view = { title: '', html: '', after: null, nav: '', voice: '', voiceLabel: '' };

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
  var roles = LIVE.map(function (x) {
    var pr = pathProgress(x), on = x.id === p.id;
    return '<button type="button" role="radio" class="role' + (on ? ' on' : '') + '" data-act="pick-path" data-id="' + x.id + '" aria-checked="' + on + '"><i class="dot" aria-hidden="true"></i><strong>' + e(x.title) + '</strong><span>' + plural(pr.total, 'lesson') + ', ' + plural(x.modules.length, 'stage') + '</span></button>';
  }).join('');
  var nCases = (D.cases || []).length, nArch = (D.arch || []).length, nDrills = (D.drills || []).length, nIv = (IV || []).length, nEx = (window.MARGA_EXPLAINERS || []).length;
  var stats = [[t.total, 'lessons with checks'], [nCases, 'real incidents'], [nDrills, 'troubleshooting drills'], [nIv, 'interview answers'], [nEx, 'animated explainers']].map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('');
  var TL = [['09:37', 'An engineer runs a command to remove a few servers.'], ['09:37', 'A mistyped input removes far more than intended.', 1], ['After', 'The index and placement subsystems stop serving requests.'], ['Midday', 'A full restart takes much longer than expected.'], ['About four hours', 'S3 is fully back.']];
  var tools = [['#/subnet', 'Subnet and CIDR', 'Split networks, plan VLSM, merge routes.'], ['#/playground/yaml', 'YAML playground', 'Find errors and risky Kubernetes settings.'], ['#/playground/python', 'Python playground', 'Run Python with built-in tests.'], ['#/playground/go', 'Go playground', '50 Go exercises run on the Go Playground.'], ['#/playground/hcl', 'Terraform playground', '50 HCL exercises checked in the browser.'], ['#/playground/sql', 'SQL for SREs', '50 SQL exercises on a real SQLite engine.'], ['#/explainers', 'Animated explainers', 'DNS, TLS, pods, rolling updates and more.'], ['#/skill-lab', 'Skill-writing lab', 'Write a SKILL.md and check its header, description, size and safety.']];
  view.html =
    '<section class="hero hero2"><div class="wrap hero-grid2">' +
    '<div class="hero-copy"><h1>Learn to fix production before production breaks.</h1>' +
    '<p class="hero-free"><strong>Free. No login. No payment. Just practice and learn.</strong></p>' +
    '<p class="lede">Practical DevOps, cloud and SRE training from someone who runs production. Real incidents, real commands, no login, no ads.</p>' +
    '<div class="roles" role="radiogroup" aria-label="Choose your role">' + roles + '</div>' +
    '<div class="actions">' + cta + '<a class="btn btn-quiet" href="#/placement">Take the 10-question placement check</a></div>' +
    '<p class="small">No account needed. Start now. Progress stays in your browser on this device; export it to move it.</p>' +
    '<dl class="today"><div><dt>Day streak</dt><dd>' + st.cur + '</dd></div><div><dt>Lessons passed</dt><dd>' + t.done + '<small> of ' + t.total + '</small></dd></div>' +
    '<div><dt>Best streak</dt><dd>' + st.best + '</dd></div></dl></div>' +
    heroDemoHtml() + '</div></section>' +

    '<section class="stats" aria-label="What is on MARGA"><div class="wrap">' + stats + '</div></section>' +
    (api.doorsHtml ? api.doorsHtml() : '') +

    '<section class="band"><div class="wrap"><div class="band-head"><h2>Pick a skill tree. Pass each check to unlock the next skill.</h2><p>Each role is a tree of skills. A skill unlocks when the skills that lead into it are mastered.</p></div>' +
    '<div class="pipe-panel"><div class="pipe-head"><div role="tablist" aria-label="Role paths" class="tabs">' + tabs + '</div>' +
    '<p class="pipe-meta">' + plural(p.modules.length, 'skill') + ', about ' + hours(pp.minutes) + ' of study. ' + pp.done + ' of ' + pp.total + ' lessons passed.</p></div>' +
    treeHtml(p) +
    '<p class="pipe-foot"><a href="#/path/' + p.id + '">See the full ' + e(p.title) + ' path</a></p></div>' +
    '<div class="rows">' + LIVE.map(pathRow).join('') + '</div>' +
    '<h3 class="sub-h">In development</h3><ul class="planned">' + PLANNED.map(function (x) { return '<li><strong>' + e(x.title) + '</strong><span>' + e(x.summary) + '</span><em>Planned</em></li>'; }).join('') + '</ul></div></section>' +

    (api.todayStrip ? api.todayStrip() : '') +

    '<section class="band"><div class="wrap two"><div><h2>Learn from the incidents that made the news</h2><p>' + nCases + ' short case studies and ' + nArch + ' detailed post-mortems, each with the cause, the fix and the lesson. Start with one that is easy to follow.</p>' +
    '<p class="actions"><a class="btn btn-primary" href="#/architecture/aws-s3-us-east-1-2017">Read the S3 post-mortem</a><a class="btn btn-quiet" href="#/cases">All case studies</a></p></div>' +
    '<div class="tl-card"><h3>AWS S3, US-East-1, 28 February 2017</h3><ul>' + TL.map(function (x) { return '<li' + (x[2] ? ' class="x"' : '') + '><time>' + e(x[0]) + '</time><span>' + e(x[1]) + '</span></li>'; }).join('') + '</ul>' +
    '<p class="small">As reported by the provider. The post-mortem page links to the original report.</p></div></div></section>' +

    '<section class="band alt"><div class="wrap"><div class="band-head"><h2>Tools you can use in the browser</h2><p>Nothing to install. Your work stays on your device.</p></div><ul class="prac">' +
    tools.map(function (x) { return '<li><a href="' + x[0] + '"><strong>' + e(x[1]) + '</strong><span>' + e(x[2]) + '</span></a></li>'; }).join('') + '</ul></div></section>' +

    '<section class="band alt"><div class="wrap two"><div><h2>A cheat sheet for every tool</h2><p>Linux, Bash, Python, networking, Docker, Kubernetes, Helm, Terraform, CI/CD, AWS, Azure, Prometheus and SRE each have a separate, searchable page with official references. Print them with a watermark or save them as PDF. They are always open, no progress needed.</p>' +
    '<p><a class="btn btn-quiet" href="#/cheatsheets">Open cheat sheets</a></p></div>' +
    '<ul class="chips">' + Object.keys(SHEETS).map(function (id) { return '<li><a href="#/cheatsheet/' + id + '">' + e(SHEETS[id].title) + '</a></li>'; }).join('') + '</ul></div></section>' +

    '<section class="band"><div class="wrap two"><div><h2>Prepare for the interview</h2><p>InterviewHub has model answers for common DevOps, cloud and SRE questions, grouped by topic and level. Mark what you know, revisit what you do not, and listen to any answer read aloud.</p>' +
    '<p><a class="btn btn-quiet" href="#/interview">Open InterviewHub</a></p></div>' +
    '<div class="note-panel"><h3>Listen while you learn</h3><p>Every lesson, cheat sheet and interview answer can be read aloud. Pick any voice installed on your device from the Voice dropdown.</p></div></div></section>' +

    '<section class="band"><div class="wrap two"><div><h2>How a lesson works</h2><ol class="steps"><li><strong>Read.</strong> Each lesson explains why, then shows commands with their output.</li><li><strong>Check.</strong> Answer a short quiz. Pass it to mark the lesson done and unlock the next.</li><li><strong>Remember.</strong> Flip the flashcards now, and review them again later from the Review cards page.</li></ol></div>' +
    '<div class="note-panel"><h3>Terminal labs</h3><p>Break-and-fix practice for Linux, Shell, Networking and Python, in a simulated terminal in your browser, with automatic checks. It is a simulation, not a real server. Labs for Kubernetes, Docker and Terraform are still planned.</p><p><a href="#/terminal-labs">Open the terminal labs</a> | <a href="#/labs">What is planned</a></p></div></div></section>';
  view.after = function () { armTree(); armTerm(); };
}

var HD = [
  { tab: 'Terminal lab', title: 'lab: SSH refuses the key', cap: 'Terminal lab: fix SSH key permissions', href: '#/terminal-lab/lx-ssh-perms', go: 'Try this lab', items: [
    ['cmd', 'ls -l ~/.ssh/id_ed25519'], ['out bad', '-rw-r--r-- 1 user user 411 Jan  5 id_ed25519'], ['out warn', "Permissions 0644 for 'id_ed25519' are too open."],
    ['cmd', 'chmod 600 ~/.ssh/id_ed25519'], ['cmd', 'ls -l ~/.ssh/id_ed25519'], ['out ok', '-rw------- 1 user user 411 Jan  5 id_ed25519'],
    ['note', '<b>Check passed.</b> A private key must be readable only by its owner. Labs like this run in your browser.']] },
  { tab: 'Incident game', title: 'game: Healthy Pods, no traffic', cap: 'Incident game: choose, then see why', href: '#/game/healthy-pods-no-traffic', go: 'Play this game', items: [
    ['out dim', 'The shop returns 503 after a rollout.'], ['out', 'All 3 new Pods are Running, but READY shows 0/1.'], ['out warn', 'What do you do first?'],
    ['choice', 'Delete the Pods so they are recreated'], ['choice pick', 'Describe a Pod and read the readiness events'], ['choice', 'Scale the Deployment to ten replicas'],
    ['note', '<b>Why:</b> describe shows why a Pod is not Ready. <b>Example:</b> "Readiness probe failed: connection refused on port 8080" while the app listens on 9090.']] },
  { tab: 'Explainer', title: 'explainer: How a DNS lookup works', cap: 'Animated explainer: step through a DNS lookup', href: '#/explainers/dns-lookup', go: 'Watch it', items: [
    ['flow', 'Browser', 'Where is app.example.com?', 'Resolver'], ['flow', 'Resolver', 'Who handles .com?', 'Root server'], ['flow', 'Root server', 'Ask the .com servers', 'Resolver'],
    ['flow', 'Resolver', 'Who handles example.com?', 'TLD server'], ['flow', 'Resolver', 'What is app.example.com?', 'Authoritative'], ['flow', 'Authoritative', 'It is 203.0.113.10', 'Resolver'],
    ['note', '<b>Cached.</b> The resolver keeps the answer for its TTL, so the next lookup is instant. Explainers cover every skill.']] },
  { tab: 'Architecture', title: 'walkthrough: Online payments service', cap: 'Architecture walkthrough: find where it breaks', href: '#/walkthrough/online-payments-service', go: 'Read the design', items: [
    ['node', 'Client'], ['node', 'API gateway'], ['node', 'Payment service'], ['node', 'Queue'], ['node bad', 'Card network'],
    ['out warn', 'Where it breaks: the card network is slow.'], ['note', '<b>Effect:</b> the queue grows and clients retry. <b>Fix:</b> make every payment request safe to repeat, with an idempotency key. Every design lists where it breaks.']] }
];
function heroDemoHtml() {
  var tabs = HD.map(function (x, n) { return '<button type="button" role="tab" class="hd-tab' + (n ? '' : ' on') + '" id="hd-t' + n + '" aria-selected="' + (n === 0) + '" aria-controls="hd-stage" data-n="' + n + '">' + e(x.tab) + '</button>'; }).join('');
  var sr = HD.map(function (x) { return x.cap; }).join('. ');
  return '<div class="term hd" id="term" aria-label="Short demos of MARGA">' +
    '<div class="hd-tabs" role="tablist" aria-label="Demos">' + tabs + '</div>' +
    '<div class="tbar"><i></i><i></i><i></i><span id="hd-title">' + e(HD[0].title) + '</span></div>' +
    '<div class="tb hd-stage" id="hd-stage" role="tabpanel" tabindex="0" aria-labelledby="hd-t0">' + hdItems(HD[0], true) + '</div>' +
    '<p class="hd-sr">Four short demos that play in turn: ' + e(sr) + '.</p>' +
    '<div class="tcap"><span id="hd-cap">' + e(HD[0].cap) + '</span><span class="hd-ctl"><button type="button" class="hd-pause" id="hd-pause" aria-pressed="false">Pause</button><a id="hd-link" href="' + HD[0].href + '">' + e(HD[0].go) + '</a></span></div></div>';
}
function hdItems(sc, shown) {
  return sc.items.map(function (it) {
    var k = it[0].split(' '), kind = k[0], cls = k.slice(1).join(' '), h;
    if (kind === 'cmd') h = '<p class="tl-l' + (shown ? '' : ' pend') + '"><span class="pr">$</span> <span class="hd-cmd" data-t="' + e(it[1]) + '">' + (shown ? e(it[1]) : '') + '</span></p>';
    else if (kind === 'out') h = '<p class="tl-l ' + cls + (shown ? '' : ' pend') + '">' + e(it[1]) + '</p>';
    else if (kind === 'note') h = '<div class="tl-l term-hint' + (shown ? '' : ' pend') + '">' + it[1] + '</div>';
    else if (kind === 'choice') h = '<p class="tl-l hd-ch ' + cls + (shown ? '' : ' pend') + '"><i aria-hidden="true"></i>' + e(it[1]) + '</p>';
    else if (kind === 'flow') h = '<p class="tl-l hd-flow' + (shown ? '' : ' pend') + '"><b>' + e(it[1]) + '</b><span>' + e(it[2]) + '</span><b>' + e(it[3]) + '</b></p>';
    else h = '<p class="tl-l hd-node ' + cls + (shown ? '' : ' pend') + '"><b>' + e(it[1]) + '</b></p>';
    return h;
  }).join('');
}
function armTerm() {
  var root = $('#term'); if (!root || !root.classList.contains('hd')) return;
  var reduce = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.getAttribute('data-a-motion') === 'reduce';
  var stage = $('#hd-stage'), cur = 0, gen = 0, paused = false, timer = null, pauseBtn = $('#hd-pause');
  function alive() { return document.body.contains(root); }
  function show(n, play) {
    gen++; clearTimeout(timer); cur = n;
    $$('.hd-tab', root).forEach(function (b, i) { b.classList.toggle('on', i === n); b.setAttribute('aria-selected', String(i === n)); });
    stage.setAttribute('aria-labelledby', 'hd-t' + n);
    $('#hd-title').textContent = HD[n].title; $('#hd-cap').textContent = HD[n].cap;
    var l = $('#hd-link'); l.setAttribute('href', HD[n].href); l.textContent = HD[n].go;
    stage.innerHTML = hdItems(HD[n], !play);
    if (play) run(n, gen);
  }
  function run(n, g) {
    var ls = $$('.tl-l', stage), i = 0;
    (function step() {
      if (g !== gen || !alive() || paused) return;
      if (i >= ls.length) { timer = setTimeout(function () { if (g === gen && alive() && !paused) show((n + 1) % HD.length, true); }, 3200); return; }
      var el = ls[i++]; el.classList.remove('pend');
      var c = $('.hd-cmd', el);
      if (c) { var t = c.getAttribute('data-t'), k = 0; (function type() { if (g !== gen || !alive()) return; c.textContent = t.slice(0, ++k); if (k < t.length) setTimeout(type, 26); else timer = setTimeout(step, 420); })(); }
      else timer = setTimeout(step, el.classList.contains('term-hint') ? 600 : 560);
    })();
    run.resume = function () { if (g === gen) { step0(); } };
    function step0() { /* resume from the first hidden line */ var rest = $$('.tl-l.pend', stage); if (!rest.length) { timer = setTimeout(function () { if (g === gen && alive() && !paused) show((n + 1) % HD.length, true); }, 1500); return; } ls = rest; i = 0; step(); }
  }
  $$('.hd-tab', root).forEach(function (b) { b.addEventListener('click', function () { show(parseInt(b.getAttribute('data-n'), 10), !reduce && !paused); }); });
  root.querySelector('.hd-tabs').addEventListener('keydown', function (ev) {
    var d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
    ev.preventDefault(); var n = (cur + d + HD.length) % HD.length; show(n, !reduce && !paused); $('#hd-t' + n).focus();
  });
  if (reduce) { pauseBtn.hidden = true; return; }
  pauseBtn.addEventListener('click', function () {
    paused = !paused; pauseBtn.textContent = paused ? 'Play' : 'Pause'; pauseBtn.setAttribute('aria-pressed', String(paused));
    if (paused) { clearTimeout(timer); } else if (run.resume) run.resume();
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { clearTimeout(timer); } else if (!paused && alive() && run.resume) run.resume(); });
  show(0, true);
}

function pathRow(p) {
  var pp = pathProgress(p), pct = pp.total ? Math.round(pp.done / pp.total * 100) : 0;
  var word = { pass: 'passed', run: 'in progress', ready: 'ready', lock: 'locked' }, lab = 'Show all ' + p.modules.length + ' skills';
  return '<article class="row"><div class="row-main"><h3><a href="#/path/' + p.id + '">' + e(p.title) + '</a></h3><p>' + e(p.summary) + '</p></div>' +
    '<div class="row-route"><div class="rp" role="group" aria-label="Skill route for ' + e(p.title) + '">' + p.modules.map(function (id) {
      var m = MOD[id], st = modStatus(m);
      return '<a class="rp-d m-' + st + '" href="#/module/' + id + '" data-tip="' + e(m.title) + '" aria-label="' + e(m.title) + ', ' + word[st] + '"></a>';
    }).join('') + '</div>' +
    '<button class="rp-more" type="button" data-act="rp-toggle" data-label="' + lab + '" aria-expanded="false">' + lab + '</button>' +
    '<ul class="row-mods" hidden>' + p.modules.map(function (id) { return '<li class="m-' + modStatus(MOD[id]) + '">' + e(MOD[id].title) + '</li>'; }).join('') + '</ul></div>' +
    '<div class="row-stat"><b>' + hours(pp.minutes) + '</b><span>' + plural(pp.total, 'lesson') + '</span>' +
    '<div class="bar" role="img" aria-label="' + pct + ' percent complete"><i style="width:' + pct + '%"></i></div></div></article>';
}

function pathsView() {
  var p = PATH[S.path] || LIVE[0], pp = pathProgress(p);
  var tabs = LIVE.map(function (x) {
    return '<button type="button" role="tab" class="tab' + (x.id === p.id ? ' on' : '') + '" data-act="pick-path" data-id="' + x.id + '" aria-selected="' + (x.id === p.id) + '">' + e(x.title) + '</button>';
  }).join('');
  view.title = 'Skill trees | MARGA'; view.nav = 'paths';
  view.html = '<section class="page-head wrap"><h1>Skill trees</h1><p class="lede">Each role is a tree of skills. Master a skill by passing its lesson checks and the skills it leads to unlock. Lessons are shared between roles, so progress carries over.</p></section>' +
    '<div class="wrap"><div class="pipe-panel"><div class="pipe-head"><div role="tablist" aria-label="Role skill trees" class="tabs">' + tabs + '</div>' +
    '<p class="pipe-meta">' + plural(p.modules.length, 'skill') + ', about ' + hours(pp.minutes) + ' of study.</p></div>' + treeHtml(p) +
    '<p class="pipe-foot"><a href="#/path/' + p.id + '">See the full ' + e(p.title) + ' path with every topic</a></p></div>' +
    '<h2 class="sub-h">All roles</h2><div class="rows">' + LIVE.map(pathRow).join('') + '</div>' +
    '<h2 class="sub-h">In development</h2><ul class="planned">' + PLANNED.map(function (x) { return '<li><strong>' + e(x.title) + '</strong><span>' + e(x.summary) + '</span><em>Planned</em></li>'; }).join('') + '</ul></div>';
  view.after = armTree;
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
    '<button class="btn btn-quiet" type="button" data-act="pick-path" data-id="' + p.id + '" data-go="home">Make this my home path</button>' + printBar() + '</div>' + voiceSlot() + '</section>' +
    '<div class="wrap"><div class="pipe-panel">' + treeHtml(p) + '</div>' +
    '<h2 class="sub-h">What you will be able to do</h2><ul class="outcomes">' + p.outcomes.map(function (o) { return '<li>' + e(o) + '</li>'; }).join('') + '</ul>' +
    (window.MargaFeatures && MargaFeatures.pathCaps ? MargaFeatures.pathCaps(p.id) : '') + (window.MargaExLinks ? MargaExLinks.path(p) : '') + '<h2 class="sub-h">Stages</h2><div class="stage-list">' + p.modules.map(function (mid, i) { return stageRow(MOD[mid], i); }).join('') + '</div></div>';
  view.voice = '#main'; view.voiceLabel = p.title + ' path';
  view.after = armTree;
}

function stageRow(m, i) {
  var s = modStatus(m), n = modCount(m), tot = m.lessons.length;
  var req = m.requires.length ? 'Requires ' + m.requires.map(function (r) { return MOD[r].title; }).join(' and ') : 'No prerequisites';
  return '<article class="srow s-' + s + '"><span class="dot">' + (s === 'pass' ? ICON.check : s === 'lock' ? ICON.lock : '') + '</span>' +
    '<div><h3><a href="#/module/' + m.id + '">' + e(m.title) + '</a></h3><p>' + e(m.summary) + '</p><p class="small">' + e(req) + '. ' + plural(tot, 'lesson') + ', about ' + hours(m.minutes) + '.</p>' +
    '<ol class="topics" aria-label="Topics in ' + e(m.title) + '">' + m.lessons.map(function (lid) { return '<li><a href="' + hrefLesson(lid) + '">' + e(LES[lid].title) + '</a></li>'; }).join('') + '</ol></div>' +
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
    lock = '<div class="gate"><strong>This stage is locked.</strong> Pass ' + missingReqs(m).map(function (r) { return '<a href="#/module/' + r.id + '">' + e(r.title) + '</a>'; }).join(' and ') + ' to open it. Know it already? ' + missingReqs(m).map(function (r) { return '<a href="#/testout/' + r.id + '">Test out of ' + e(r.title) + '</a>'; }).join(' or ') + '.</div>';
  }
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/paths">Paths</a></nav><h1>' + e(m.title) + '</h1>' +
    '<p class="lede">' + e(m.summary) + '</p>' +
    '<dl class="facts"><div><dt>Level</dt><dd>' + e(m.level) + '</dd></div><div><dt>Study time</dt><dd>About ' + hours(m.minutes) + '</dd></div><div><dt>Progress</dt><dd>' + n + ' of ' + tot + ' lessons</dd></div></dl>' +
    '<div class="bar wide" role="img" aria-label="' + pct + ' percent complete"><i style="width:' + pct + '%"></i></div>' + lock +
    '<p class="small">Practice this stage: <a href="#/drills/' + m.id + '">troubleshooting drills</a>, <a href="#/cases/' + m.id + '">case studies</a>, <a href="#/flashcards">flashcards</a>.</p>' +
    (function () {
      var pm = (D.arch || []).filter(function (a) { return a.modules && a.modules.indexOf(m.id) >= 0; }).length, bits = [];
      var exl = window.MargaExLinks ? MargaExLinks.module(m.id) : '';
      if (exl) bits.push(exl);
      if (pm) bits.push('<a href="#/architecture">' + plural(pm, 'architecture post-mortem') + '</a>');
      return bits.length ? '<p class="small">Watch and study: ' + bits.join(', ') + '.</p>' : '';
    })() +
    (sheets.length ? '<p class="small">Cheat sheet: ' + sheets.map(function (k) { return '<a href="#/cheatsheet/' + k + '">' + e(SHEETS[k].title) + '</a>'; }).join(', ') + '</p>' : '') +
    '<div class="actions">' + printBar() + '</div>' + voiceSlot() +
    '</section><div class="wrap"><ol class="jobs">' + m.lessons.map(function (lid, i) { return jobHtml(lid, i); }).join('') + '</ol>' + refsHtml(m.refs, 'Official documentation for this stage') + (window.MargaFeatures && MargaFeatures.moduleExtras ? MargaFeatures.moduleExtras(m.id) : '') + (api.chooseModule ? api.chooseModule(m.id) : '') + '</div>';
  view.voice = '#main'; view.voiceLabel = m.title;
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
    '<div class="actions lesson-tools">' + printBar() + '<button type="button" class="btn btn-quiet" data-act="read-toggle" aria-pressed="false">Reading mode</button></div>' + voiceSlot() +
    (window.MargaFeatures ? MargaFeatures.levelsHtml(l) : '') +
    '<div class="lesson-grid"><div class="prose" id="prose">' + l.html + refsHtml(l.refs) + '</div>' + toc + '</div>' +
    (window.MargaExLinks ? MargaExLinks.lesson(id) : '') +
    '<section class="check" id="check" aria-labelledby="check-h"><h2 id="check-h">Lesson check</h2><div id="quiz"></div></section>' +
    '<section class="cardsec" id="cards" aria-labelledby="cards-h"><h2 id="cards-h">Flashcards</h2><div id="deck"></div></section>' +
    '<nav class="pager" aria-label="Lesson navigation">' +
    (prev ? '<a class="btn btn-quiet" href="' + hrefLesson(prev) + '">Previous: ' + e(LES[prev].title) + '</a>' : '<span></span>') +
    '<span id="next-slot">' + nextButton(id, nxt) + '</span></nav></article>';
  view.voice = '#prose'; view.voiceLabel = l.title;
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
function wrongExplain(q, oi, ok) {
  var ox = q.ox || [], any = ox.some(function (x) { return x; }), h = '';
  if (!ok) {
    h += '<p class="wrong-pick"><strong>You chose:</strong> ' + e(q.options[oi]) + (ox[oi] ? '. ' + e(ox[oi]) : '. It does not answer the question as asked.') + '</p>' +
      '<p class="wrong-right"><strong>The correct answer:</strong> ' + e(q.options[q.answer]) + '</p>';
  }
  if (any) {
    var rest = q.options.map(function (o, i) { return i !== q.answer && i !== oi && ox[i] ? '<li><strong>' + e(o) + '</strong>: ' + e(ox[i]) + '</li>' : ''; }).join('');
    if (rest) h += '<details class="why-others"' + (ok ? '' : ' open') + '><summary>Why the other options are wrong</summary><ul>' + rest + '</ul></details>';
  }
  return h;
}
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
        '<p class="qcount">Question ' + (pos + 1) + ' of ' + qs.length + '</p><h3 class="qtext">' + e(q.q) + '</h3><p class="say-row"><button type="button" class="btn btn-quiet say" data-say="' + e(q.q + ' ' + opts.map(function (x, k) { return 'Option ' + String.fromCharCode(65 + k) + '. ' + x.o + '.'; }).join(' ')) + '">Read aloud</button></p>' +
        '<div class="opts" role="group" aria-label="Answer choices">' + opts.map(function (x, k) { return '<button type="button" class="opt" data-oi="' + x.oi + '"><span class="key">' + String.fromCharCode(65 + k) + '</span><span>' + e(x.o) + '</span></button>'; }).join('') + '</div>' +
        '<div class="feedback" id="fb" aria-live="polite"></div>';
      wireSay(root);
      $$('.opt', root).forEach(function (b) {
        b.addEventListener('click', function () {
          var oi = Number(b.getAttribute('data-oi')), ok = oi === q.answer;
          if (ok) right++;
          if (window.MargaFeatures && MargaFeatures.note) MargaFeatures.note('q', id + '#' + item.qi, ok);
          $$('.opt', root).forEach(function (x) {
            x.disabled = true;
            if (Number(x.getAttribute('data-oi')) === q.answer) x.classList.add('right');
          });
          if (!ok) b.classList.add('wrong');
          var last = pos === qs.length - 1;
          $('#fb', root).innerHTML = '<p class="' + (ok ? 'ok' : 'bad') + '"><strong>' + (ok ? 'Correct.' : 'Not quite.') + '</strong> ' + e(q.why) + '</p>' + wrongExplain(q, oi, ok) +
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
        if (window.MargaBadges && MargaBadges.check) MargaBadges.check(true);
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
      '<p class="say-row"><button type="button" class="btn btn-quiet say" data-say="' + e(c.f) + '">Read aloud</button></p>' +
      '<div class="rate" id="rate" hidden><button class="btn btn-quiet" type="button" data-r="again">Again</button><button class="btn btn-primary" type="button" data-r="good">Got it</button></div>';
    var card = $('#card', root);
    card.addEventListener('click', function () {
      flipped = !flipped;
      card.classList.toggle('back', flipped);
      card.innerHTML = '<span class="side">' + (flipped ? 'Answer' : 'Question') + '</span><span class="txt">' + e(flipped ? c.b : c.f) + '</span><span class="hint">' + (flipped ? 'Select to see the question' : 'Select to show the answer') + '</span>';
      $('#rate', root).hidden = !flipped;
      var sb = $('[data-say]', root); if (sb) sb.setAttribute('data-say', flipped ? c.b : c.f);
    });
    wireSay(root);
    $$('#rate button', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var good = b.getAttribute('data-r') === 'good';
        var cs = cardState(c.key), box = good ? Math.min(cs.box + 1, 5) : 1;
        var due = new Date(); due.setDate(due.getDate() + (good ? INTERVALS[box] : 0));
        S.cards[c.key] = { box: box, due: good ? due.getTime() : Date.now() };
        if (window.MargaFeatures && MargaFeatures.note) MargaFeatures.note('c', c.key, good);
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
    '<div class="actions">' + printBar() + '<a class="btn btn-quiet" href="cheatsheets/' + id + '.html" target="_blank" rel="noopener">Open standalone page</a>' +
    (s.module && MOD[s.module] ? '<a class="btn btn-quiet" href="#/module/' + s.module + '">Open the ' + e(MOD[s.module].title) + ' stage</a>' : '') + '</div>' + voiceSlot() + '</section>' +
    '<div class="wrap"><article class="sheet">' + s.html + '</article>' + refsHtml(s.refs) + '</div>';
  view.voice = '.sheet'; view.voiceLabel = s.title + ' cheat sheet';
  view.after = null;
}


/* ----- InterviewHub ----- */
var IV = D.interview || [];
var ivFilter = { mod: '', level: '', status: '', q: '' };
var LEVELS = { junior: 'Junior', mid: 'Mid-level', senior: 'Senior' };
function ivItems() {
  var q = ivFilter.q.trim().toLowerCase();
  return IV.filter(function (x) {
    if (ivFilter.mod && x.module !== ivFilter.mod) return false;
    if (ivFilter.level && x.level !== ivFilter.level) return false;
    var r = (S.iv || {})[x.id];
    if (ivFilter.status === 'know' && r !== 'know') return false;
    if (ivFilter.status === 'review' && r !== 'review') return false;
    if (ivFilter.status === 'new' && r) return false;
    if (q && (x.q + ' ' + x.text).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}
function ivListHtml(items) {
  if (!items.length) return '<div class="empty"><h3>No questions match</h3><p>Clear a filter or search for a different term.</p></div>';
  return items.map(function (x) {
    var r = (S.iv || {})[x.id] || '';
    return '<article class="iv' + (r ? ' r-' + r : '') + '" data-id="' + e(x.id) + '">' +
      '<h3 class="iv-q">' + e(x.q) + '</h3>' +
      '<p class="iv-meta"><span class="chip">' + e(MOD[x.module] ? MOD[x.module].title : x.module) + '</span><span class="chip lvl-' + x.level + '">' + e(LEVELS[x.level] || x.level) + '</span>' +
      (r === 'know' ? '<span class="chip pass">Known</span>' : r === 'review' ? '<span class="chip warn">Review</span>' : '') + '</p>' +
      '<div class="iv-a" id="a-' + e(x.id) + '" hidden>' + x.html + '</div>' +
      '<div class="actions iv-tools"><button type="button" class="btn btn-quiet" data-act="iv-show" aria-expanded="false" aria-controls="a-' + e(x.id) + '">Show answer</button>' +
      '<button type="button" class="btn btn-quiet say" data-say="' + e(x.q + ' ' + x.text) + '">Read aloud</button>' +
      '<span class="iv-rate" hidden><button type="button" class="btn btn-quiet" data-act="iv-rate" data-r="review">Need review</button><button type="button" class="btn btn-primary" data-act="iv-rate" data-r="know">I know this</button></span></div></article>';
  }).join('');
}
function ivStats() {
  var iv = S.iv || {}, know = 0, rev = 0;
  IV.forEach(function (x) { if (iv[x.id] === 'know') know++; else if (iv[x.id] === 'review') rev++; });
  return plural(IV.length, 'question') + ' across ' + plural(MODS.filter(function (m) { return IV.some(function (x) { return x.module === m.id; }); }).length, 'topic') + '. You know ' + know + ', marked ' + rev + ' for review.';
}
function interviewDeep(id) {
  var x = IV.filter(function (q) { return q.id === id; })[0];
  if (!x) return notFound();
  ivFilter.mod = x.module; ivFilter.level = ''; ivFilter.status = ''; ivFilter.q = '';
  interviewView();
  var base = view.after;
  view.after = function () { if (base) base(); var c = $('.iv[data-id="' + id + '"]'); if (c) { ivToggle(c, true); try { c.scrollIntoView({ block: 'center' }); } catch (x2) { /* ignore */ } } };
}
function interviewView() {
  view.title = 'InterviewHub | MARGA by EknathaLabs'; view.nav = 'interview';
  var modOpts = '<option value="">All topics</option>' + MODS.filter(function (m) { return IV.some(function (x) { return x.module === m.id; }); }).map(function (m) { return '<option value="' + m.id + '"' + (ivFilter.mod === m.id ? ' selected' : '') + '>' + e(m.title) + '</option>'; }).join('');
  var lvOpts = '<option value="">All levels</option>' + Object.keys(LEVELS).map(function (k) { return '<option value="' + k + '"' + (ivFilter.level === k ? ' selected' : '') + '>' + LEVELS[k] + '</option>'; }).join('');
  var stOpts = [['', 'All questions'], ['new', 'Not rated yet'], ['review', 'Need review'], ['know', 'I know these']].map(function (p) { return '<option value="' + p[0] + '"' + (ivFilter.status === p[0] ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('');
  view.html = '<section class="page-head wrap"><h1>InterviewHub</h1>' +
    '<p class="lede">Common DevOps, cloud and SRE interview questions with model answers. Open any question, say your answer out loud first, then compare. Everything here is open: no lesson needs to be passed.</p>' +
    '<p class="small" id="iv-stats">' + e(ivStats()) + '</p>' +
    '<div class="actions"><a class="btn btn-primary" href="#/interview/mock">Start a mock interview</a>' + printBar() + '<button type="button" class="btn btn-quiet" data-act="iv-all" id="iv-all">Show all answers</button></div>' + voiceSlot() +
    '<div class="iv-filters"><label class="field"><span>Topic</span><select id="iv-mod">' + modOpts + '</select></label>' +
    '<label class="field"><span>Level</span><select id="iv-level">' + lvOpts + '</select></label>' +
    '<label class="field"><span>Show</span><select id="iv-status">' + stOpts + '</select></label>' +
    '<label class="field grow"><span>Search</span><input id="iv-q" type="search" placeholder="Search questions and answers" autocomplete="off" value="' + e(ivFilter.q) + '"></label></div></section>' +
    '<div class="wrap narrow"><p class="small" id="iv-count" role="status"></p><div id="iv-list"></div></div>';
  view.voice = '#iv-list'; view.voiceLabel = 'Interview hub';
  view.after = function () {
    function paint() {
      var items = ivItems();
      $('#iv-list').innerHTML = ivListHtml(items);
      $('#iv-count').textContent = plural(items.length, 'question') + ' shown.';
      $('#iv-stats').textContent = ivStats();
      wireSay($('#iv-list'));
    }
    $('#iv-mod').addEventListener('change', function (ev) { ivFilter.mod = ev.target.value; paint(); });
    $('#iv-level').addEventListener('change', function (ev) { ivFilter.level = ev.target.value; paint(); });
    $('#iv-status').addEventListener('change', function (ev) { ivFilter.status = ev.target.value; paint(); });
    $('#iv-q').addEventListener('input', function (ev) { ivFilter.q = ev.target.value; paint(); });
    paint();
  };
}
function ivToggle(card, open) {
  var a = $('.iv-a', card), b = $('[data-act=iv-show]', card), r = $('.iv-rate', card);
  a.hidden = !open; r.hidden = !open;
  b.setAttribute('aria-expanded', String(open)); b.textContent = open ? 'Hide answer' : 'Show answer';
}

/* ----- labs ----- */
function labsView() {
  view.title = 'Labs | MARGA by EknathaLabs'; view.nav = 'labs';
  view.html = '<section class="page-head wrap"><h1>Hands-on labs</h1><p class="lede">Terminal labs for Linux, Shell, Networking and Python are available. The labs listed under planned are not available yet, and nothing on this site depends on them.</p></section>' +
    '<div class="wrap narrow prose"><h2>Available now</h2><p><strong>Terminal labs</strong> are break-and-fix exercises in a simulated terminal in your browser. They are checked automatically. They are a simulation, not a real server.</p><p><a class="btn btn-primary" href="#/terminal-labs">Open the terminal labs</a></p><h2>What is planned</h2><ul>' +
    '<li><strong>More break-and-fix scenarios</strong> based on real incidents, beyond the four stages that have terminal labs.</li>' +
    '<li><strong>Kubernetes and Docker exercises</strong> that match the lesson you just passed, including CKA and CKS style tasks.</li>' +
    '<li><strong>Infrastructure as code exercises</strong> for Terraform plans and state problems.</li></ul>' +
    '<h2>What you can do today</h2><p>Each lesson contains a written incident walkthrough with sample output, a lesson check and flashcards. Cheat sheets cover the commands you will use in the labs.</p>' +
    '<p><a class="btn btn-primary" href="#/paths">Choose a learning path</a></p></div>';
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
          S = { v: 1, lessons: o.lessons || {}, cards: o.cards || {}, days: o.days, path: o.path || 'devops', iv: (o.iv && typeof o.iv === 'object') ? o.iv : {} };
          ['cs', 'dr', 'fc', 'dc', 'py', 'lab', 'wk', 'cap', 'gm', 'bd', 'tl'].forEach(function (k) { if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) S[k] = o[k]; });
          if (Array.isArray(o.mock)) S.mock = o.mock.slice(-20);
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
  [/^\/review$/, reviewView], [/^\/labs$/, labsView], [/^\/progress$/, progressView], [/^\/interview$/, interviewView],
  [/^\/interview\/((?!mock$)[\w-]+)$/, interviewDeep]
];
function route() {
  var h = location.hash.replace(/^#/, '') || '/';
  if (h.charAt(0) !== '/') h = '/';
  var res;
  view.voice = ''; view.voiceLabel = '';
  for (var i = 0; i < routes.length; i++) {
    var m = h.match(routes[i][0]);
    if (m) { res = routes[i][1].apply(null, m.slice(1)); break; }
  }
  if (res === undefined && !routes.some(function (r) { return r[0].test(h); })) notFound();
  if (res === 'redirect') return;
  document.title = view.title;
  if (window.MargaVoice) MargaVoice.stop();
  $('#main').innerHTML = view.html;
  setNav(view.nav);
  window.scrollTo(0, 0);
  if (view.after) view.after();
  mountVoice();
  afterHooks.forEach(function (fn) { try { fn(h); } catch (x) { if (window.console) console.error(x); } });
  var hd = $('#main h1'); if (hd) { hd.setAttribute('tabindex', '-1'); }
  if (window.MargaCounter && D.counter) MargaCounter.hit(h === '/' ? '/' : h, view.title);
}

/* ---------- search (ranking in search.js) ---------- */
var INDEX = null, GROUPS = ['Lessons', 'Cases', 'Cheat sheets', 'Interview', 'Glossary', 'Practice'];
function addIdx(kind, group, title, sub, href, body, extra, lesson, mod) { INDEX.push({ kind: kind, group: group, title: title, sub: sub || '', href: href, body: body || '', extra: extra || '', lesson: lesson, module: mod || '' }); }
function buildIndex() {
  INDEX = [];
  MODS.forEach(function (m) { addIdx('Stage', 'Lessons', m.title, m.summary, '#/module/' + m.id, m.summary, '', null, m.id); });
  Object.keys(LES).forEach(function (id) {
    var l = LES[id];
    addIdx('Lesson', 'Lessons', l.title, MOD[l.module].title, hrefLesson(id), l.summary + ' ' + (l.text || '').slice(0, 9000), l.toc.map(function (x) { return x.text; }).join(' '), id, l.module);
  });
  (D.cases || []).forEach(function (c) { addIdx('Case study', 'Cases', c.title, c.company + ', ' + c.year, '#/cases/' + c.id, c.what + ' ' + c.cause + ' ' + c.fix + ' ' + c.lesson, c.company + ' ' + c.area, null, (c.modules || [])[0]); });
  (D.arch || []).forEach(function (a) { addIdx('Post-mortem', 'Cases', a.title, a.summary, '#/architecture/' + a.id, a.text, a.company, null, (a.modules || [])[0]); });
  Object.keys(SHEETS).forEach(function (id) { var x = SHEETS[id]; addIdx('Cheat sheet', 'Cheat sheets', x.title, x.summary, '#/cheatsheet/' + id, x.text, '', null, id); });
  (D.walkthroughs || []).forEach(function (w) { addIdx('Walkthrough', 'Practice', w.title, w.summary, '#/walkthrough/' + w.id, w.text, 'architecture design system walkthrough', null, (w.modules || [])[0]); });
  (D.interview || []).forEach(function (x) { addIdx('Interview', 'Interview', x.q, MOD[x.module] ? MOD[x.module].title : '', '#/interview/' + x.id, x.text, x.level, null, x.module); });
  (D.glossary || []).forEach(function (g) { addIdx('Glossary', 'Glossary', g.term, g.plain, '#/glossary/' + g.id, g.def, g.aliases.join(' '), null, g.module); });
  (D.drills || []).forEach(function (d) { addIdx('Drill', 'Practice', d.title, MOD[d.module] ? MOD[d.module].title : '', '#/drills/' + d.module, d.story + ' ' + d.q, '', null, d.module); });
  (window.MARGA_EXPLAINERS || []).forEach(function (x) { addIdx('Explainer', 'Practice', x.title, x.summary, '#/explainers/' + x.id, x.steps.map(function (s) { return s.l + ' ' + s.n; }).join(' '), 'animated how it works', null, x.module); });
  Object.keys(D.labs || {}).forEach(function (lang) {
    if (!Array.isArray(D.labs[lang])) return;
    var nm = { python: 'Python', go: 'Go', hcl: 'Terraform', yaml: 'YAML', sql: 'SQL' }[lang] || lang;
    D.labs[lang].forEach(function (x) { addIdx('Exercise', 'Practice', x.title, nm + ' playground exercise', '#/playground/' + lang, x.task, lang + ' exercise playground practice'); });
  });
  (D.predicts || []).forEach(function (p) { addIdx('Predict', 'Practice', p.q, 'Predict then reveal', p.lesson ? hrefLesson(p.lesson) : '#/daily', p.out + ' ' + (p.why || ''), 'predict output guess', p.lesson, p.lesson ? p.lesson.split('/')[0] : ''); });
  [['Subnet and CIDR playground', 'Split networks, check addresses, plan VLSM, summarise routes', '#/subnet', 'ip cidr subnet mask vlsm netmask'],
   ['YAML playground', 'Check YAML and Kubernetes manifests in the browser', '#/playground/yaml', 'yaml validate kubernetes manifest json lint'],
   ['Python playground', 'Run Python in the browser', '#/playground/python', 'python run code exercises'],
   ['Go playground', 'Go exercises run on the Go Playground', '#/playground/go', 'go golang run code exercises'],
   ['Terraform playground', 'HCL exercises checked in the browser', '#/playground/hcl', 'terraform hcl lint exercises'],
   ['SQL for SREs', 'SQL exercises on SQLite in the browser', '#/playground/sql', 'sql sqlite query exercises'],
   ['Skill-writing lab', 'Write a SKILL.md and check it in the browser', '#/skill-lab', 'claude skill skill.md description lab check'],
   ['Daily challenge', 'One question a day with a streak', '#/daily', 'quiz question streak'],
   ['Today: interview and case of the day', 'A fresh question and incident every day', '#/today', 'interview of the day case of the day']].forEach(function (x) { addIdx('Tool', 'Practice', x[0], x[1], x[2], x[1], x[3]); });
  if (window.MargaSearch) MargaSearch.build(INDEX);
}
function searchResults(q) {
  if (!INDEX) buildIndex();
  var out = MargaSearch.query(q, { kind: searchGroup, module: searchStage, limit: 12 });
  return out.map(function (x) { var it = x.it; return { kind: it.kind, title: it.title, sub: it.sub, href: it.href, lesson: it.lesson, snippet: x.snippet }; });
}
var sel = 0, results = [], lastFocus = null, searchGroup = '', searchStage = '';
function recents() { try { var r = JSON.parse(localStorage.getItem('ea.recent') || '[]'); return Array.isArray(r) ? r.filter(function (x) { return typeof x === 'string'; }).slice(0, 5) : []; } catch (x) { return []; } }
function pushRecent(q) {
  q = (q || '').trim(); if (q.length < 2) return;
  try { var r = recents().filter(function (x) { return x !== q; }); r.unshift(q); localStorage.setItem('ea.recent', JSON.stringify(r.slice(0, 5))); } catch (x) { /* ignore */ }
}
function openSearch() {
  lastFocus = document.activeElement; searchGroup = ''; searchStage = '';
  if (!INDEX) buildIndex();
  $('#search-root').innerHTML = '<div class="modal" id="smodal"><div class="modal-back" data-act="close-search"></div>' +
    '<div class="modal-box" role="dialog" aria-modal="true" aria-label="Search"><label class="sr" for="sq">Search lessons, cases, cheat sheets, interview questions and the glossary</label>' +
    '<input id="sq" type="search" placeholder="Search lessons, commands, incidents, terms" autocomplete="off">' +
    '<div class="sfilters" id="sfilters" role="group" aria-label="Filter results"></div>' +
    '<label class="sstage"><span>Stage</span><select id="sstage"><option value="">All stages</option>' + MODS.map(function (m) { return '<option value="' + e(m.id) + '">' + e(m.title) + '</option>'; }).join('') + '</select></label>' +
    '<ul id="sres" role="listbox" aria-label="Results"></ul><p class="small" id="shint">Type to search. Use the arrow keys and Enter. Press Escape to close.</p></div></div>';
  var inp = $('#sq'); inp.focus();
  paintResults('');
  inp.addEventListener('input', function () { results = searchResults(inp.value); sel = 0; paintResults(inp.value); });
  $('#sstage').addEventListener('change', function () { searchStage = this.value; results = searchResults(inp.value); sel = 0; paintResults(inp.value); inp.focus(); });
  inp.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); sel = Math.min(sel + 1, results.length - 1); paintResults(inp.value); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); sel = Math.max(sel - 1, 0); paintResults(inp.value); }
    else if (ev.key === 'Enter' && results[sel]) { ev.preventDefault(); pushRecent(inp.value); go(results[sel]); }
  });
}
function paintFilters(q) {
  var box = $('#sfilters'); if (!box) return;
  var cnt = q.trim() ? MargaSearch.counts(q, searchStage) : {}, total = 0; GROUPS.forEach(function (g) { total += cnt[g] || 0; });
  box.innerHTML = ['All'].concat(GROUPS).map(function (g) {
    var on = (g === 'All' ? '' : g) === searchGroup, n = g === 'All' ? total : (cnt[g] || 0);
    return '<button type="button" class="schip' + (on ? ' on' : '') + '" data-sgroup="' + (g === 'All' ? '' : e(g)) + '" aria-pressed="' + on + '">' + e(g) + (q.trim() ? ' <span>' + n + '</span>' : '') + '</button>';
  }).join('');
}
function paintResults(q) {
  var ul = $('#sres'); if (!ul) return;
  paintFilters(q);
  if (!q.trim()) {
    var rc = recents();
    ul.innerHTML = rc.length ? '<li class="srecent-h" role="presentation">Recent searches <button type="button" class="schip" data-sclear="1">Clear</button></li>' + rc.map(function (r) { return '<li class="srecent" role="presentation"><button type="button" class="srecent-b" data-srecent="' + e(r) + '">' + e(r) + '</button></li>'; }).join('') : '';
    $('#shint').textContent = 'Type to search. Use the arrow keys and Enter. Press Escape to close.'; return;
  }
  var hint = $('#shint'), alt = results.length ? '' : MargaSearch.suggest(q);
  hint.textContent = results.length ? plural(results.length, 'result') + (searchGroup ? ' in ' + searchGroup : '') + (searchStage ? ' in ' + MOD[searchStage].title : '') : 'Nothing matches "' + q + '"' + (searchGroup ? ' in ' + searchGroup : '') + (searchStage ? ' in ' + MOD[searchStage].title : '') + '. Try a tool name, a command or fewer words.';
  if (alt) hint.insertAdjacentHTML('beforeend', ' Did you mean <button type="button" class="schip" data-srecent="' + e(alt) + '">' + e(alt) + '</button>?');
  ul.innerHTML = results.map(function (r, i) {
    var locked = r.lesson && lessonState(r.lesson) === 'locked';
    return '<li role="option" aria-selected="' + (i === sel) + '" class="' + (i === sel ? 'sel' : '') + '" data-i="' + i + '"><span class="k">' + r.kind + '</span><span class="t"><span>' + MargaSearch.highlight(r.title, q, e) + '</span>' + (locked ? ICON.lock : '') + '</span><span class="s">' + MargaSearch.highlight(r.snippet || r.sub, q, e) + '</span></li>';
  }).join('');
  var cur = ul.querySelector('li.sel'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
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
  var sg = t.closest('[data-sgroup]');
  if (sg) { searchGroup = sg.getAttribute('data-sgroup'); var si = $('#sq'); results = searchResults(si.value); sel = 0; paintResults(si.value); si.focus(); return; }
  var sr = t.closest('[data-srecent]');
  if (sr) { var si2 = $('#sq'); si2.value = sr.getAttribute('data-srecent'); results = searchResults(si2.value); sel = 0; paintResults(si2.value); si2.focus(); return; }
  if (t.closest('[data-sclear]')) { try { localStorage.removeItem('ea.recent'); } catch (x2) { /* ignore */ } paintResults(''); return; }
  if (li) { pushRecent($('#sq').value); go(results[Number(li.getAttribute('data-i'))]); return; }
  var act = t.closest('[data-act]');
  if (!act) return;
  var a = act.getAttribute('data-act');
  if (actions[a]) { actions[a](act, ev); return; }
  if (a === 'iv-show') { var cardEl = act.closest('.iv'); ivToggle(cardEl, act.getAttribute('aria-expanded') !== 'true'); }
  else if (a === 'iv-all') {
    var openAll = act.getAttribute('data-open') !== '1';
    $$('#iv-list .iv').forEach(function (c) { ivToggle(c, openAll); });
    act.setAttribute('data-open', openAll ? '1' : '0'); act.textContent = openAll ? 'Hide all answers' : 'Show all answers';
  } else if (a === 'iv-rate') {
    var c2 = act.closest('.iv'), id2 = c2.getAttribute('data-id'), rv = act.getAttribute('data-r');
    S.iv = S.iv || {}; S.iv[id2] = rv; markActive(); save(); renderChrome(); setNav(view.nav);
    c2.classList.remove('r-know', 'r-review'); c2.classList.add('r-' + rv);
    var meta = $('.iv-meta', c2); $$('.chip.pass, .chip.warn', meta).forEach(function (x) { x.remove(); });
    meta.insertAdjacentHTML('beforeend', rv === 'know' ? '<span class="chip pass">Known</span>' : '<span class="chip warn">Review</span>');
    var st2 = $('#iv-stats'); if (st2) st2.textContent = ivStats();
    toast(rv === 'know' ? 'Marked as known.' : 'Marked for review.');
  } else if (a === 'print') doPrint(false);
  else if (a === 'pdf') doPrint(true);
  else if (a === 'search') openSearch();
  else if (a === 'close-search') closeSearch();
  else if (a === 'theme') {
    var n = theme() === 'dark' ? 'light' : 'dark';
    if (window.MargaA11y) { MargaA11y.set('theme', n); MargaA11y.sync(); } else { document.documentElement.setAttribute('data-theme', n); try { localStorage.setItem('ea.theme', n); } catch (x) { /* ignore */ } }
    renderChrome(); setNav(view.nav);
  } else if (a === 'menu') {
    var nav = $('#topnav'), open = !nav.classList.contains('open');
    nav.classList.toggle('open', open); act.setAttribute('aria-expanded', String(open));
  } else if (a === 'tree-close') {
    var tw = act.closest('.tree-wrap'); if (tw) tw.classList.remove('tsheet');
  } else if (a === 'pm-toggle') {
    var pmx = $('#pmega'); pmOpen(!!(pmx && pmx.hidden));
  } else if (a === 'rp-toggle') {
    var rl = act.parentNode.querySelector('.row-mods'), ro = rl.hidden;
    rl.hidden = !ro; act.setAttribute('aria-expanded', String(ro)); act.textContent = ro ? 'Hide skill names' : act.getAttribute('data-label');
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
  if (ev.key === 'Escape') { var pm = $('#pmega'); if (pm && !pm.hidden) { pmOpen(false); var pl = $('#topnav a[data-nav="paths"]'); if (pl && pm.contains(document.activeElement)) { pmSkip = true; pl.focus(); pmSkip = false; } } if ($('#smodal')) closeSearch(); var nv = $('#topnav'); if (nv) nv.classList.remove('open'); return; }
  if ((ev.key === 'k' && (ev.metaKey || ev.ctrlKey)) || (ev.key === '/' && !typing)) { ev.preventDefault(); if (!$('#smodal')) openSearch(); }
});
window.addEventListener('hashchange', function () { pmOpen(false); var nv = $('#topnav'); if (nv) nv.classList.remove('open'); route(); });

/* ---------- extension API (extras.js registers more views through this) ---------- */
var actions = {};
var afterHooks = [];
var api = {
  D: D, MODS: MODS, MOD: MOD, LES: LES, LIVE: LIVE, PATH: PATH, LEVELS: LEVELS, IV: IV,
  $: $, $$: $$, e: e, plural: plural, shuffle: shuffle, hours: hours,
  state: function () { return S; }, save: save, markActive: markActive, renderChrome: renderChrome, setNav: setNav,
  view: view, toast: toast, printBar: printBar, voiceSlot: voiceSlot, wireSay: wireSay, refsHtml: refsHtml,
  hrefLesson: hrefLesson, isDone: isDone, route: route,
  addRoute: function (re, fn) { routes.push([re, fn]); },
  afterRoute: function (fn) { afterHooks.push(fn); }, ivListHtml: ivListHtml,
  lessonState: lessonState, ICON: ICON, S: function () { return S; },
  onAct: function (name, fn) { actions[name] = fn; }
};
window.MargaApp = api;
if (typeof window.MargaExtras === 'function') window.MargaExtras(api);
if (typeof window.MargaMore === 'function') window.MargaMore(api);
if (typeof window.MargaLabs === 'function') window.MargaLabs(api);
if (typeof window.MargaTermLabs === 'function') window.MargaTermLabs(api);
if (typeof window.MargaFeatures === 'function') window.MargaFeatures(api);
if (typeof window.MargaBadges === 'function') window.MargaBadges(api);
if (typeof window.MargaChoose === 'function') window.MargaChoose(api);
if (typeof window.MargaSkillLabPage === 'function') window.MargaSkillLabPage(api);
if (typeof window.MargaCaseFile === 'function') window.MargaCaseFile(api);
if (typeof window.MargaSDLab === 'function') window.MargaSDLab(api);

/* ---------- accessibility panel ---------- */
(function () {
  var root = $('#a11y-root');
  if (!root || !window.MargaA11y) return;
  root.innerHTML = MargaA11y.panelHtml();
  var panel = $('#a11y-panel');
  function setOpen(open) {
    panel.hidden = !open;
    var b = $('[data-act=a11y]'); if (b) b.setAttribute('aria-expanded', String(open));
    if (open) { var f = $('select', panel); if (f) f.focus(); } else if (b) b.focus();
  }
  actions.a11y = function () { setOpen(panel.hidden); };
  panel.addEventListener('change', function (ev) {
    var id = ev.target.getAttribute('data-a11y-set');
    if (id) MargaA11y.set(id, ev.target.value);
  });
  panel.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-a11y]'); if (!b) return;
    if (b.getAttribute('data-a11y') === 'close') setOpen(false);
    else if (b.getAttribute('data-a11y') === 'reset') { MargaA11y.reset(); MargaA11y.sync(); toast('Reading options reset.'); }
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !panel.hidden) setOpen(false); });
  document.addEventListener('click', function (ev) {
    if (panel.hidden) return;
    if (ev.target.closest('#a11y-panel') || ev.target.closest('[data-act=a11y]')) return;
    panel.hidden = true; var b = $('[data-act=a11y]'); if (b) b.setAttribute('aria-expanded', 'false');
  });
})();

/* ---------- start ---------- */
renderChrome();
route();
visitors();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  var hadSW = !!navigator.serviceWorker.controller, reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadSW && !reloaded) { reloaded = true; location.reload(); } });
  window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (r) { try { r.update(); } catch (x) { /* ignore */ } }).catch(function () { /* offline cache is optional */ }); });
}
})();
