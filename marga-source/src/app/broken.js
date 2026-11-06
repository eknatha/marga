/* MARGA broken servers: one page for every fix-it lab (simulated terminal labs and real in-browser Linux labs),
   sorted into Easy, Medium and Hard. Each lab has its own Check my work button. Nothing is sent anywhere. */
window.MargaBroken = function (A) {
'use strict';
var D = A.D, view = A.view, $ = A.$, $$ = A.$$, e = A.e, plural = A.plural;
var TIER = { Beginner: 'Easy', Intermediate: 'Medium', Advanced: 'Hard' };
var TIERS = ['Easy', 'Medium', 'Hard'];
function tlDone(id) { var b = A.state().tl; return !!(b && b[id] && b[id].d); }
function all() {
  var out = [];
  (D.termlabs || []).forEach(function (l) { out.push({ id: l.id, title: l.title, tier: TIER[l.level] || 'Medium', mod: l.module, min: l.minutes, sum: l.summary, href: '#/terminal-lab/' + l.id, real: false, done: tlDone(l.id) }); });
  var vm = A.vmLabs ? A.vmLabs.list() : [];
  vm.forEach(function (l) { if (l.id === 'sandbox') return; out.push({ id: l.id, title: l.title, tier: TIER[l.level] || 'Medium', mod: 'linux', min: l.minutes, sum: l.story, href: '#/linux/' + l.id, real: true, done: A.vmLabs.done(l.id) }); });
  return out;
}
function modTitle(m) { return m === 'multi' ? 'Multi-service incidents' : (A.MOD[m] ? A.MOD[m].title : m); }
var F = { tier: '', mod: '' };
function row(x) {
  return '<li class="tl-item"><div><h3><a href="' + x.href + '">' + e(x.title) + '</a></h3><p>' + e(x.sum.length > 170 ? x.sum.slice(0, 167) + '...' : x.sum) + '</p>' +
    '<p class="small">' + x.tier + ' | ' + x.min + ' min | ' + e(modTitle(x.mod)) + (x.real ? ' | Real Linux in your browser' : ' | Simulated terminal') + '</p></div>' +
    '<span class="chip' + (x.done ? ' pass' : '') + '">' + (x.done ? 'Fixed' : 'Broken') + '</span></li>';
}
function paint() {
  var box = $('#bs-body'); if (!box) return;
  var L = all(), shown = L.filter(function (x) { return (!F.tier || x.tier === F.tier) && (!F.mod || x.mod === F.mod); });
  var mods = []; L.forEach(function (x) { if (mods.indexOf(x.mod) < 0) mods.push(x.mod); });
  var bars = TIERS.map(function (t) {
    var tt = L.filter(function (x) { return x.tier === t; }), d = tt.filter(function (x) { return x.done; }).length;
    return '<li><button type="button" class="chipbtn" data-act="bs-tier" data-t="' + t + '" aria-pressed="' + (F.tier === t) + '"><strong>' + t + '</strong> ' + d + ' of ' + tt.length + ' fixed</button><span class="pd-bar" aria-hidden="true"><i style="width:' + (tt.length ? Math.round(d / tt.length * 100) : 0) + '%"></i></span></li>';
  }).join('');
  box.innerHTML = '<ul class="bs-tiers">' + bars + '</ul>' +
    '<label class="field"><span>Area</span><select id="bs-mod"><option value="">All areas</option>' + mods.map(function (m) { return '<option value="' + e(m) + '"' + (F.mod === m ? ' selected' : '') + '>' + e(modTitle(m)) + '</option>'; }).join('') + '</select></label>' +
    '<p class="actions"><button type="button" class="btn btn-primary" data-act="bs-random">Break a random server</button>' + (F.tier || F.mod ? '<button type="button" class="btn btn-quiet" data-act="bs-clear">Show everything</button>' : '') + '</p>' +
    '<p class="small" id="bs-count" role="status">' + plural(shown.length, 'broken server') + ' shown, ' + shown.filter(function (x) { return x.done; }).length + ' fixed.</p>' +
    '<ul class="tl-list">' + shown.map(row).join('') + '</ul>';
  var sel = $('#bs-mod'); if (sel) sel.addEventListener('change', function () { F.mod = sel.value; paint(); });
}
A.addRoute(/^\/broken-servers$/, function () {
  view.title = 'Broken servers | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Broken servers</h1>' +
    '<p class="lede">Every lab where something is broken and you have to find out why, in one list. Easy, Medium and Hard. Open one, fix it, then press Check my work: the lab looks at the machine and tells you what still fails. Hints come in three steps (nudge, pointer, nearly the answer) and nothing is timed.</p></section>' +
    '<div class="wrap"><div id="bs-body"></div></div>';
  view.after = paint;
});
A.onAct('bs-tier', function (el) { var t = el.getAttribute('data-t'); F.tier = F.tier === t ? '' : t; paint(); });
A.onAct('bs-clear', function () { F.tier = ''; F.mod = ''; paint(); });
A.onAct('bs-random', function () {
  var L = all().filter(function (x) { return (!F.tier || x.tier === F.tier) && (!F.mod || x.mod === F.mod); }), open = L.filter(function (x) { return !x.done; });
  var pool = open.length ? open : L; if (!pool.length) return;
  location.hash = pool[Math.floor(Math.random() * pool.length)].href;
});
};
