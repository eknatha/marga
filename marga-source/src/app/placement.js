/* MARGA placement diagnostic: three questions per skill, taken from the lesson quizzes (foundation, core, advanced).
   Scores each skill, saves the result in this browser (state key pd), sends misses to weak-spot review,
   and suggests a plan, a project track and the lesson to start each skill from. It is a guide, not a certificate. */
window.MargaPlacement = function (A) {
'use strict';
var D = A.D, MOD = A.MOD, view = A.view, $ = A.$, $$ = A.$$, e = A.e, plural = A.plural;
var GOALS = {
  devops: { title: 'DevOps engineer', mods: ['linux', 'git', 'docker', 'cicd', 'kubernetes', 'terraform'], plan: 'devops-60', track: 'ship-a-service' },
  sre: { title: 'Site reliability engineer', mods: ['linux', 'networking', 'observability', 'sre', 'kubernetes', 'k8s-ops'], plan: 'sre-60', track: 'run-it-reliably' },
  k8s: { title: 'Kubernetes operator', mods: ['docker', 'kubernetes', 'helm', 'argocd', 'k8s-ops', 'security'], plan: 'kubernetes-30', track: 'operate-a-cluster' },
  cloud: { title: 'Cloud engineer', mods: ['linux', 'networking', 'cloud', 'cloud-iam', 'terraform', 'security'], plan: 'cloud-iac-30', track: 'cloud-landing-zone' }
};
var TAGS = ['Foundation', 'Core', 'Advanced'];
var RUN = null;
function S() { return A.state(); }
function planOf(id) { return (D.plans || []).filter(function (p) { return p.id === id; })[0]; }
function trackOf(id) { return (D.tracks || []).filter(function (p) { return p.id === id; })[0]; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function build(gid) {
  var g = GOALS[gid], items = [];
  g.mods.forEach(function (mid) {
    var ids = MOD[mid].lessons, n = ids.length;
    for (var t = 0; t < 3; t++) {
      var lo = Math.floor(n * t / 3), hi = Math.max(lo + 1, Math.floor(n * (t + 1) / 3)), pool = [];
      for (var i = lo; i < hi && i < n; i++) { var l = A.LES[ids[i]]; if (l && l.quiz && l.quiz.length) pool.push(ids[i]); }
      if (!pool.length) continue;
      var lid = pick(pool), qi = Math.floor(Math.random() * A.LES[lid].quiz.length);
      items.push({ mod: mid, lesson: lid, qi: qi, tier: t });
    }
  });
  return { gid: gid, items: items, pos: 0, res: {} };
}
function saved() { var p = S().pd; return p && typeof p === 'object' && p.goal && GOALS[p.goal] ? p : null; }
function levelOf(n) { return n >= 3 ? 'Solid' : n === 2 ? 'Core' : 'Start here'; }
function startLesson(mid, n) {
  var ids = MOD[mid].lessons, at = n >= 3 ? Math.floor(ids.length * 2 / 3) : n === 2 ? Math.floor(ids.length / 3) : 0;
  return ids[Math.min(at, ids.length - 1)];
}
function head(lede) {
  return '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Placement diagnostic</h1><p class="lede">' + lede + '</p></section>';
}
function loadFor(gid, then) {
  var need = GOALS[gid].mods.filter(function (m) { return !MOD[m].lessons.every(function (l) { return A.LES[l]; }); });
  if (!need.length) return then();
  Promise.all(need.map(function (m) { return A.loadModule(m); })).then(then, function () {
    var r = $('#pd'); if (r) r.innerHTML = '<p class="bad">The questions could not load. Check your connection and try again.</p>';
  });
}
function choose() {
  var r = $('#pd'); if (!r) return;
  var sv = saved();
  r.innerHTML = (sv ? savedBlock(sv) : '') + '<h2>' + (sv ? 'Take it again for another goal' : 'Pick your goal') + '</h2><div class="pd-goals">' +
    Object.keys(GOALS).map(function (id) {
      var g = GOALS[id]; return '<button type="button" class="pd-goal" data-goal="' + id + '"><strong>' + e(g.title) + '</strong><span>' + g.mods.length + ' skills, ' + g.mods.length * 3 + ' questions, about ' + Math.ceil(g.mods.length * 3 * 0.75) + ' minutes</span></button>'; }).join('') + '</div>' +
    '<p class="small">Questions come from the lesson checks. Pick "I don\'t know" instead of guessing: it counts as a miss but tells you where to start. Your result stays in this browser.</p>';
  $$('.pd-goal', r).forEach(function (b) {
    b.addEventListener('click', function () { var gid = b.getAttribute('data-goal'); b.disabled = true; loadFor(gid, function () { RUN = build(gid); ask(); }); });
  });
  var rs = $('#pd-show'); if (rs) rs.addEventListener('click', function () { showResult(sv, false); });
}
function savedBlock(sv) {
  var when = new Date(sv.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return '<div class="pd-saved"><p><strong>Last result:</strong> ' + e(GOALS[sv.goal].title) + ', ' + sv.total + ' of ' + sv.of + ' correct on ' + e(when) + '.</p><button class="btn btn-primary" type="button" id="pd-show">Show it again</button></div>';
}
function ask() {
  var r = $('#pd'); if (!r || !RUN) return;
  if (RUN.pos >= RUN.items.length) return finish();
  var it = RUN.items[RUN.pos], q = A.LES[it.lesson].quiz[it.qi];
  var opts = A.shuffle(q.options.map(function (o, oi) { return { o: o, oi: oi }; }));
  r.innerHTML = '<div class="qprog" aria-hidden="true"><i style="width:' + (RUN.pos / RUN.items.length * 100) + '%"></i></div>' +
    '<p class="qcount">Question ' + (RUN.pos + 1) + ' of ' + RUN.items.length + '. ' + e(MOD[it.mod].title) + ', ' + TAGS[it.tier].toLowerCase() + '</p>' +
    '<h2 class="qtext">' + e(q.q) + '</h2><div class="opts" role="group" aria-label="Answer choices">' + opts.map(function (x, k) {
      return '<button type="button" class="opt" data-oi="' + x.oi + '"><span class="key">' + String.fromCharCode(65 + k) + '</span><span>' + e(x.o) + '</span></button>'; }).join('') + '</div>' +
    '<p><button type="button" class="btn btn-quiet" id="pd-skip">I don\'t know</button></p><div class="feedback" id="pd-fb" aria-live="polite"></div>';
  function settle(oi) {
    var ok = oi === q.answer, rec = RUN.res[it.mod] || (RUN.res[it.mod] = { n: 0, miss: [] });
    if (ok) rec.n++; else rec.miss.push(it.lesson);
    if (window.MargaFeatures && window.MargaFeatures.note) window.MargaFeatures.note('q', it.lesson + '#' + it.qi, ok);
    $$('.opt', r).forEach(function (x) { x.disabled = true; if (Number(x.getAttribute('data-oi')) === q.answer) x.classList.add('right'); if (oi >= 0 && Number(x.getAttribute('data-oi')) === oi && !ok) x.classList.add('wrong'); });
    $('#pd-skip', r).hidden = true;
    var last = RUN.pos === RUN.items.length - 1;
    $('#pd-fb', r).innerHTML = '<p class="' + (ok ? 'ok' : 'bad') + '"><strong>' + (ok ? 'Correct.' : oi < 0 ? 'Skipped.' : 'Not quite.') + '</strong> ' + e(q.why) + '</p><button class="btn btn-primary" type="button" id="pd-next">' + (last ? 'See result' : 'Next question') + '</button>';
    var nb = $('#pd-next', r); nb.focus(); nb.addEventListener('click', function () { RUN.pos++; ask(); });
  }
  $$('.opt', r).forEach(function (b) { b.addEventListener('click', function () { settle(Number(b.getAttribute('data-oi'))); }); });
  $('#pd-skip', r).addEventListener('click', function () { settle(-1); });
}
function finish() {
  var g = GOALS[RUN.gid], total = 0, skills = {};
  g.mods.forEach(function (m) { var r = RUN.res[m] || { n: 0, miss: [] }; total += r.n; skills[m] = r.n; });
  S().pd = { goal: RUN.gid, at: Date.now(), total: total, of: RUN.items.length, skills: skills };
  A.save();
  showResult(S().pd, true);
}
function showResult(sv, fresh) {
  var r = $('#pd'); if (!r) return;
  var g = GOALS[sv.goal], pl = planOf(g.plan), tr = trackOf(g.track), weak = [], rows = '';
  g.mods.forEach(function (m) {
    var n = sv.skills[m] || 0, sl = startLesson(m, n); if (n < 2) weak.push(m);
    rows += '<li class="pd-row"><div><a href="#/module/' + e(m) + '">' + e(MOD[m].title) + '</a><span class="pd-bar" aria-hidden="true"><i style="width:' + Math.round(n / 3 * 100) + '%"></i></span></div>' +
      '<span class="chip' + (n >= 3 ? ' pass' : '') + '">' + e(levelOf(n)) + ' (' + n + ' of 3)</span>' +
      '<a class="small" href="' + A.hrefLesson(sl) + '">' + (n >= 3 ? 'Skim from' : 'Start at') + ': ' + e(A.LES[sl] ? A.LES[sl].title : sl) + '</a></li>';
  });
  var msg = weak.length === 0 ? 'Strong across the board. Go straight to the project track and use the plan to fill gaps.'
    : 'Start with ' + weak.slice(0, 2).map(function (m) { return '<strong>' + e(MOD[m].title) + '</strong>'; }).join(' and ') + '. ' + (weak.length > 2 ? plural(weak.length - 2, 'more skill') + ' also need work. ' : '') + 'Missed questions are in your weak-spot review.';
  r.innerHTML = '<div class="result ' + (weak.length ? 'fail' : 'pass') + '"><h2>' + sv.total + ' of ' + sv.of + ' correct</h2><p>' + msg + '</p>' +
    '<p class="small">Goal: ' + e(g.title) + '. Saved in this browser only' + (fresh ? '.' : ', so clearing site data removes it.') + ' Stages still open in order, so you pass each lesson check as usual.</p>' +
    '<ul class="pl-res pd-res">' + rows + '</ul>' +
    '<div class="actions">' + (pl ? '<a class="btn btn-primary" href="#/plan/' + e(pl.id) + '">Follow: ' + e(pl.title) + '</a>' : '') +
    (tr ? '<a class="btn" href="#/track/' + e(tr.id) + '">Project track: ' + e(tr.title) + '</a>' : '') +
    '<a class="btn btn-quiet" href="#/weak">Weak-spot review</a><button class="btn btn-quiet" type="button" id="pd-again">Retake</button></div></div>';
  $('#pd-again', r).addEventListener('click', choose);
}
A.addRoute(/^\/placement$/, function () {
  view.title = 'Placement diagnostic | MARGA by EknathaLabs'; view.nav = 'practice';
  RUN = null;
  view.html = head('Pick a goal and answer three questions per skill, from foundation to advanced. You get a level for each skill, a place to start in each one, a plan and a project track. It is a guide, not a certificate, and it does not unlock anything.') +
    '<div class="wrap narrow"><div id="pd" class="check"></div></div>';
  view.after = choose;
});
};
