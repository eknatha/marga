/* MARGA portfolio: one page that gathers what you have finished (skills, capstones, incident games, plans, widgets, badges).
   It reads your own progress in this browser, prints cleanly, and copies as plain text for a resume or profile.
   It is a record of practice you did, not a certificate, and it says so. */
window.MargaPortfolio = function (A) {
'use strict';
var $ = A.$, e = A.e, view = A.view, D = A.D;

function bagOf(k) { var S = A.state(); if (!S[k] || typeof S[k] !== 'object' || Array.isArray(S[k])) S[k] = {}; return S[k]; }
function nameOf() { var b = A.state().bd; return b && typeof b.name === 'string' ? b.name : ''; }
function capDone(c) { var b = bagOf('cap')[c.id] || {}, i; for (i = 0; i < c.steps.length; i++) if (!b['s' + i]) return false; for (i = 0; i < c.check.length; i++) if (!b['c' + i]) return false; return true; }

function gather() {
  var skills = A.MODS.map(function (m) { var done = m.lessons.filter(A.isDone).length; return { id: m.id, title: m.title, done: done, total: m.lessons.length, full: done === m.lessons.length && done > 0 }; });
  var caps = (D.capstones || []).filter(capDone);
  var gm = bagOf('gm'), games = (D.games || []).filter(function (g) { return gm[g.id] && gm[g.id].best === 'win'; });
  var plans = window.MargaPlanInfo && MargaPlanInfo.all ? MargaPlanInfo.all() : [];
  var badges = (A.state().bd && A.state().bd.earned) ? Object.keys(A.state().bd.earned).length : 0;
  var wgt = Object.keys(bagOf('wgt')).length;
  var lessons = skills.reduce(function (n, s) { return n + s.done; }, 0), total = skills.reduce(function (n, s) { return n + s.total; }, 0);
  return { skills: skills, caps: caps, games: games, plans: plans, badges: badges, wgt: wgt, lessons: lessons, total: total };
}

function asText(g) {
  var n = nameOf(), L = [];
  L.push((n ? n + ': ' : '') + 'MARGA by EknathaLabs practice record');
  L.push(g.lessons + ' of ' + g.total + ' lesson checks passed; ' + g.skills.filter(function (s) { return s.full; }).length + ' skills completed; ' + g.badges + ' badges.');
  var sk = g.skills.filter(function (s) { return s.done > 0; }).map(function (s) { return s.title + ' (' + s.done + '/' + s.total + ')'; });
  if (sk.length) L.push('Skills: ' + sk.join(', ') + '.');
  if (g.caps.length) L.push('Capstones finished: ' + g.caps.map(function (c) { return c.title; }).join('; ') + '.');
  if (g.games.length) L.push('Incident games won: ' + g.games.length + ' (' + g.games.slice(0, 6).map(function (x) { return x.title; }).join('; ') + (g.games.length > 6 ? '; and more' : '') + ').');
  var pl = g.plans.filter(function (p) { return p.s.done > 0; }).map(function (p) { return p.plan.title + ' (' + p.s.done + ' of ' + p.s.total + ' days)'; });
  if (pl.length) L.push('Learning plans: ' + pl.join(', ') + '.');
  L.push('Self-tracked in the browser at marga.eknathalabs.com. This is a record of practice, not a certificate.');
  return L.join('\n');
}

function view_() {
  view.title = 'Portfolio | MARGA by EknathaLabs'; view.nav = 'practice';
  var g = gather(), n = nameOf(), started = g.lessons > 0;
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>' + (n ? e(n) + ': ' : '') + 'Portfolio</h1><p class="lede">What you have finished on MARGA, on one page. It reads your progress from this browser. Print it, save it as a PDF or copy it as text for your resume.</p></section>' +
    '<div class="wrap narrow pf" id="pf"><div class="pf-name no-print"><label class="field"><span>Name on the portfolio (optional)</span><input type="text" id="pf-name" maxlength="60" value="' + e(n) + '" autocomplete="name"></label></div>' +
    '<dl class="today pf-stats"><div><dt>Lesson checks passed</dt><dd>' + g.lessons + '<small> of ' + g.total + '</small></dd></div><div><dt>Skills completed</dt><dd>' + g.skills.filter(function (s) { return s.full; }).length + '<small> of ' + g.skills.length + '</small></dd></div>' +
    '<div><dt>Capstones</dt><dd>' + g.caps.length + '</dd></div><div><dt>Incident games won</dt><dd>' + g.games.length + '</dd></div><div><dt>Widgets tried</dt><dd>' + g.wgt + '</dd></div><div><dt>Badges</dt><dd>' + g.badges + '</dd></div></dl>' +
    (started ? '' : '<p class="note-panel">Nothing here yet. Pass a lesson check, play an incident game or finish a plan day and this page fills in. <a href="#/placement">Start with the placement check</a>.</p>') +
    '<h2 class="sub-h">Skills</h2><ul class="pf-skills">' + g.skills.map(function (s) {
      var pct = s.total ? Math.round(s.done / s.total * 100) : 0;
      return '<li><span class="pf-sn">' + e(s.title) + '</span><span class="pf-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span class="pf-sv">' + s.done + ' of ' + s.total + (s.full ? ', complete' : '') + '</span></li>';
    }).join('') + '</ul>' +
    '<h2 class="sub-h">Capstone projects</h2>' + (g.caps.length ? '<ul class="pf-list">' + g.caps.map(function (c) { return '<li><a href="#/capstone/' + e(c.id) + '"><strong>' + e(c.title) + '</strong></a><span>' + e(c.summary) + '</span></li>'; }).join('') + '</ul>' : '<p class="small">No capstones finished yet. <a href="#/capstones">See the projects</a>.</p>') +
    '<h2 class="sub-h">Incident games won</h2>' + (g.games.length ? '<ul class="pf-list">' + g.games.map(function (x) { return '<li><a href="#/game/' + e(x.id) + '"><strong>' + e(x.title) + '</strong></a><span>' + e(A.MOD[x.module] ? A.MOD[x.module].title : '') + ' | ' + e(x.level) + '</span></li>'; }).join('') + '</ul>' : '<p class="small">No games won yet. <a href="#/games">Play an incident</a>.</p>') +
    '<h2 class="sub-h">Learning plans</h2>' + (g.plans.some(function (p) { return p.s.done > 0; }) ? '<ul class="pf-list">' + g.plans.filter(function (p) { return p.s.done > 0; }).map(function (p) { return '<li><a href="#/plan/' + e(p.plan.id) + '"><strong>' + e(p.plan.title) + '</strong></a><span>' + p.s.done + ' of ' + p.s.total + ' days done</span></li>'; }).join('') + '</ul>' : '<p class="small">No plan days done yet. <a href="#/plans">Pick a plan</a>.</p>') +
    '<p class="small pf-note">This is a record of practice you did in this browser. It is not a certificate and nobody has verified it. Export your progress from the footer to keep it safe.</p>' +
    '<p class="actions no-print"><button type="button" class="btn btn-primary" data-act="pf-print">Print or save as PDF</button><button type="button" class="btn btn-quiet" data-act="pf-copy">Copy as text</button></p><p class="small" id="pf-msg" role="status"></p></div>';
  view.after = function () {
    var inp = $('#pf-name');
    if (inp) inp.addEventListener('change', function () {
      var S = A.state(); if (!S.bd || typeof S.bd !== 'object' || Array.isArray(S.bd)) S.bd = {}; if (!S.bd.earned || typeof S.bd.earned !== 'object') S.bd.earned = {};
      S.bd.name = inp.value.replace(/[\u0000-\u001f<>]/g, '').slice(0, 60); A.save(); A.route();
    });
  };
}
A.onAct('pf-print', function () { window.print(); });
A.onAct('pf-copy', function () {
  var t = asText(gather()), m = $('#pf-msg');
  function done(ok) { if (m) m.textContent = ok ? 'Copied. Paste it into your resume or profile.' : 'Copy failed. Select the page text and copy it instead.'; }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { done(true); }, function () { done(false); }); else done(false);
});
A.addRoute(/^\/portfolio$/, view_);
};
