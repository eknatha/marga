/* MARGA: compare role skill trees side by side (#/compare).
   A table of skills against roles, with what is shared and what is unique to each role.
   Registered by app.js through the same small API as the other extras. */
window.MargaCompare = function (A) {
'use strict';
var MOD = A.MOD, LIVE = A.LIVE, view = A.view, e = A.e, plural = A.plural, hours = A.hours;
var sel = null;

function pstats(p) {
  var tot = 0, min = 0;
  p.modules.forEach(function (id) { tot += MOD[id].lessons.length; min += MOD[id].minutes; });
  return { lessons: tot, minutes: min };
}
function state(m) {
  var n = m.lessons.filter(A.isDone).length;
  return n === m.lessons.length && n > 0 ? 'Passed' : n > 0 ? 'In progress' : '';
}
function defaults() {
  var home = A.S().path, out = [];
  [home, 'devops', 'sre', 'platform'].forEach(function (id) {
    if (out.length < 3 && out.indexOf(id) < 0 && LIVE.some(function (p) { return p.id === id; })) out.push(id);
  });
  return out;
}
function chosen() { return LIVE.filter(function (p) { return sel.indexOf(p.id) >= 0; }); }

function chips() {
  return '<div class="cmp-chips" role="group" aria-label="Roles to compare">' + LIVE.map(function (p) {
    var on = sel.indexOf(p.id) >= 0;
    return '<button type="button" class="cmp-chip' + (on ? ' on' : '') + '" data-act="cmp-toggle" data-id="' + p.id + '" aria-pressed="' + on + '">' + e(p.title) + '</button>';
  }).join('') + '</div>';
}

function body(onlyDiff) {
  var ps = chosen();
  if (ps.length < 2) return '<p class="note-panel">Pick at least two roles to compare.</p>';
  var inPath = {};
  ps.forEach(function (p) { inPath[p.id] = {}; p.modules.forEach(function (m) { inPath[p.id][m] = true; }); });
  var ids = [], seen = {};
  ps.forEach(function (p) { p.modules.forEach(function (m) { if (!seen[m]) { seen[m] = 1; ids.push(m); } }); });
  var info = ids.map(function (id) {
    var c = ps.filter(function (p) { return inPath[p.id][id]; }).length;
    return { id: id, n: c, all: c === ps.length };
  });
  var shared = info.filter(function (x) { return x.all; });
  // cards
  var cards = ps.map(function (p) {
    var st = pstats(p), uniq = p.modules.filter(function (m) { return info.filter(function (x) { return x.id === m; })[0].n === 1; });
    return '<article class="cmp-card"><h3><a href="#/path/' + p.id + '">' + e(p.title) + '</a></h3>' +
      '<p class="small">' + plural(p.modules.length, 'skill') + ', ' + plural(st.lessons, 'lesson') + ', about ' + hours(st.minutes) + '.</p>' +
      '<p class="cmp-uniq"><strong>Only here:</strong> ' + (uniq.length ? uniq.map(function (m) { return '<a href="#/module/' + m + '">' + e(MOD[m].title) + '</a>'; }).join(', ') : 'nothing; every skill is shared with another role you picked.') + '</p></article>';
  }).join('');
  // matrix
  var rows = info.filter(function (x) { return !onlyDiff || !x.all; });
  rows.sort(function (a, b) { return b.n - a.n; });
  var head = '<tr><th scope="col" class="cmp-skill">Skill</th>' + ps.map(function (p) { return '<th scope="col"><span>' + e(p.title) + '</span></th>'; }).join('') + '</tr>';
  var tb = rows.map(function (x) {
    var m = MOD[x.id], s = state(m);
    return '<tr class="' + (x.all ? 'cmp-all' : x.n === 1 ? 'cmp-one' : 'cmp-some') + '"><th scope="row" class="cmp-skill"><a href="#/module/' + m.id + '">' + e(m.title) + '</a>' +
      (m.why ? '<span class="cmp-why">' + e(m.why) + '</span>' : '') + (s ? '<span class="chip' + (s === 'Passed' ? ' pass' : '') + '">' + s + '</span>' : '') + '</th>' +
      ps.map(function (p) { var has = inPath[p.id][x.id]; return '<td class="' + (has ? 'yes' : 'no') + '"><span class="' + (has ? 'cmp-dot' : 'cmp-gap') + '" aria-hidden="true"></span><span class="sr">' + (has ? 'Included' : 'Not included') + '</span></td>'; }).join('') + '</tr>';
  }).join('');
  return '<p class="pipe-meta">' + plural(shared.length, 'skill') + ' shared by all ' + ps.length + ' roles, ' + plural(info.length - shared.length, 'skill') + ' that differ.</p>' +
    '<div class="cmp-cards">' + cards + '</div>' +
    '<label class="cmp-diff"><input type="checkbox" data-act="cmp-diff"' + (onlyDiff ? ' checked' : '') + '> Show only the skills that differ</label>' +
    '<div class="cmp-scroll" tabindex="0" role="region" aria-label="Skills by role"><table class="cmp-table"><caption class="sr">Which skills each selected role includes</caption><thead>' + head + '</thead><tbody>' + (tb || '<tr><td colspan="' + (ps.length + 1) + '">No differences: these roles share every skill.</td></tr>') + '</tbody></table></div>';
}

var diffOnly = false;
function paint() { var h = document.getElementById('cmp'); if (h) h.innerHTML = chips() + '<div id="cmp-body">' + body(diffOnly) + '</div>'; }

A.addRoute(/^\/compare$/, function () {
  if (!sel) sel = defaults();
  view.title = 'Compare roles | MARGA by EknathaLabs'; view.nav = 'paths';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/paths">Skill trees</a></nav><h1>Compare roles</h1>' +
    '<p class="lede">Not sure which role fits? Pick two or more and see which skills they share, which are unique to each, and how much study each one takes. Lessons are shared, so time spent on a shared skill counts for every role.</p></section>' +
    '<div class="wrap"><div id="cmp">' + chips() + '<div id="cmp-body">' + body(diffOnly) + '</div></div></div>';
  view.after = null;
});
A.onAct('cmp-toggle', function (el) {
  var id = el.getAttribute('data-id'), i = sel.indexOf(id);
  if (i >= 0) { if (sel.length > 2) sel.splice(i, 1); else A.toast('Keep at least two roles to compare.'); } else sel.push(id);
  paint();
  var b = document.querySelector('.cmp-chip[data-id="' + id + '"]'); if (b) b.focus();
});
A.onAct('cmp-diff', function (el) { diffOnly = !!el.checked; var b = document.getElementById('cmp-body'); if (b) b.innerHTML = body(diffOnly); });
};
