/* MARGA learning dashboard: mastery per skill, weak spots, a forgiving streak, a weekly goal and the next best step.
   Reads only the progress already kept in this browser. Nothing is sent anywhere. */
window.MargaLearn = function (A) {
'use strict';
var e = A.e, $ = A.$, plural = A.plural;
function dk(d) { var m = d.getMonth() + 1, x = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (x < 10 ? '0' : '') + x; }
function stats() {
  var S = A.state(), tl = (S.tl && typeof S.tl === 'object') ? S.tl : {}, labs = A.D.termlabs || [], now = Date.now();
  var mods = A.D.modules.map(function (m) {
    var ls = m.lessons || [], done = 0, scores = [];
    ls.forEach(function (id) { var r = S.lessons[id]; if (r && r.done) { done++; if (r.best != null) scores.push(r.best); } });
    var ml = labs.filter(function (l) { return l.module === m.id; }), ld = ml.filter(function (l) { return tl[l.id] && tl[l.id].d; }).length;
    var avg = scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : null;
    var total = ls.length + ml.length, got = done + ld;
    return { m: m, lessons: ls.length, done: done, labs: ml.length, labsDone: ld, avg: avg, pct: total ? Math.round(got * 100 / total) : 0, started: got > 0 };
  });
  var weak = [];
  Object.keys(S.lessons).forEach(function (id) { var r = S.lessons[id], l = A.LES[id]; if (l && r && r.done && r.best != null && r.best < 70) weak.push({ id: id, l: l, best: r.best }); });
  weak.sort(function (a, b) { return a.best - b.best; });
  var due = 0; Object.keys(S.cards).forEach(function (k) { var c = S.cards[k]; if (c && c.box > 0 && c.due <= now) due++; });
  var d = new Date(), week = 0, i;
  for (i = 0; i < 7; i++) { if (S.days.indexOf(dk(d)) >= 0) week++; d.setDate(d.getDate() - 1); }
  /* forgiving streak: one missed day does not break it */
  var cur = 0, gap = 0, x = new Date(); if (S.days.indexOf(dk(x)) < 0) x.setDate(x.getDate() - 1);
  for (i = 0; i < 400; i++) { if (S.days.indexOf(dk(x)) >= 0) { cur++; gap = 0; } else { gap++; if (gap > 1) break; } x.setDate(x.getDate() - 1); }
  return { mods: mods, weak: weak, due: due, week: week, soft: cur, goal: S.wg || 3 };
}
function nextStep(st) {
  var S = A.state();
  if (st.due) return { t: 'Review ' + plural(st.due, 'flashcard') + ' that are due', href: '#/review', why: 'Spaced review is the cheapest way to keep what you learned.' };
  if (st.weak.length) { var w = st.weak[0]; return { t: 'Redo the quiz for "' + w.l.title + '"', href: A.hrefLesson(w.id), why: 'Your best score there is ' + w.best + '%.' }; }
  var path = (A.PATH && A.PATH[S.path]) || null, order = path ? (path.modules || path.mods || []) : [];
  var cand = st.mods.filter(function (r) { return r.started && r.pct < 100; }).concat(st.mods.filter(function (r) { return !r.started; }));
  if (order.length) { var byId = {}; st.mods.forEach(function (r) { byId[r.m.id] = r; }); var p = order.map(function (id) { return byId[id]; }).filter(function (r) { return r && r.pct < 100; }); if (p.length) cand = p; }
  if (!cand.length) return { t: 'Pick an interview question to practise out loud', href: '#/interview', why: 'You have finished everything else.' };
  var m = cand[0].m, nextL = (m.lessons || []).filter(function (id) { return !A.isDone(id); })[0];
  return { t: nextL ? 'Continue ' + m.title : 'Try a terminal lab in ' + m.title, href: nextL ? A.hrefLesson(nextL) : '#/terminal-labs/' + m.id, why: cand[0].pct + '% of this skill is done.' };
}
var loaded = false;
function view() {
  var st = stats(), nx = nextStep(st), S = A.state();
  var rows = st.mods.slice().sort(function (a, b) { return (b.started - a.started) || (b.pct - a.pct); }).map(function (r) {
    return '<li class="ld-row"><a href="#/module/' + e(r.m.id) + '"><span class="ld-name">' + e(r.m.title) + '</span></a>' +
      '<span class="ld-bar" role="img" aria-label="' + r.pct + ' percent done"><span style="width:' + r.pct + '%"></span></span>' +
      '<span class="ld-num">' + r.pct + '%</span>' +
      '<span class="ld-sub small">' + r.done + '/' + r.lessons + ' lessons' + (r.labs ? ', ' + r.labsDone + '/' + r.labs + ' labs' : '') + (r.avg != null ? ', quiz average ' + r.avg + '%' : '') + '</span></li>';
  }).join('');
  var weak = st.weak.length ? '<ul class="plain">' + st.weak.slice(0, 6).map(function (w) { return '<li><a href="' + A.hrefLesson(w.id) + '">' + e(w.l.title) + '</a> <span class="small">best ' + w.best + '%</span></li>'; }).join('') + '</ul>' : '<p class="small">No weak spots. Every passed quiz is at 70% or better.</p>';
  var pct = Math.min(100, Math.round(st.week * 100 / st.goal));
  return { title: 'Learning dashboard | MARGA by EknathaLabs', nav: 'progress',
    html: '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/progress">Progress</a></nav><h1>Learning dashboard</h1><p class="lede">Where you are strong, where to go back, and what to do next. This is read from progress saved in this browser only.</p></section>' +
      '<div class="wrap ld-grid"><section class="ld-card ld-next" aria-labelledby="ld-n"><h2 id="ld-n">Next best step</h2><p><a class="btn btn-primary" href="' + e(nx.href) + '">' + e(nx.t) + '</a></p><p class="small">' + e(nx.why) + '</p></section>' +
      '<section class="ld-card" aria-labelledby="ld-w"><h2 id="ld-w">This week</h2><p class="ld-big">' + st.week + '<small> of ' + st.goal + ' days</small></p>' +
      '<span class="ld-bar" role="img" aria-label="' + pct + ' percent of weekly goal"><span style="width:' + pct + '%"></span></span>' +
      '<p class="small">Streak that forgives one missed day: <strong>' + plural(st.soft, 'day') + '</strong>.</p>' +
      '<label class="field"><span>Weekly goal</span><select id="ld-goal">' + [1, 2, 3, 4, 5, 6, 7].map(function (n) { return '<option value="' + n + '"' + (n === st.goal ? ' selected' : '') + '>' + plural(n, 'day') + ' a week</option>'; }).join('') + '</select></label></section>' +
      '<section class="ld-card" aria-labelledby="ld-k"><h2 id="ld-k">Weak spots</h2>' + weak + (st.due ? '<p><a href="#/review">' + plural(st.due, 'card') + ' due for review</a></p>' : '') + '</section>' +
      '<section class="ld-card ld-wide" aria-labelledby="ld-m"><h2 id="ld-m">Mastery by skill</h2><p class="small">Lessons passed plus terminal labs solved, out of all of them.</p><ul class="ld-list">' + rows + '</ul></section></div>',
    after: function () {
      var miss = Object.keys(S.lessons).some(function (id) { return S.lessons[id] && S.lessons[id].done && !A.LES[id]; });
      if (miss && !loaded) { loaded = true; A.loadAll().then(function () { if (location.hash === '#/dashboard') A.route(); }); }
      var g = $('#ld-goal'); if (g) g.addEventListener('change', function () { S.wg = parseInt(g.value, 10) || 3; A.save(); A.route(); });
    } };
}
A.addRoute(/^\/dashboard$/, function () { var v = A.view, o = view(); v.title = o.title; v.nav = o.nav; v.html = o.html; v.after = o.after; });
A.afterRoute(function () {
  if (location.hash !== '#/progress' || $('#ld-link')) return;
  var head = $('.page-head'); if (!head) return;
  var p = document.createElement('p'); p.id = 'ld-link'; p.className = 'small';
  p.innerHTML = '<a href="#/dashboard">Open the learning dashboard</a> for mastery by skill, weak spots and your weekly goal.';
  head.appendChild(p);
});
};
