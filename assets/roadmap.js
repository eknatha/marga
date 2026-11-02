/* MARGA role roadmaps: one vertical map per career path, with a "you are here" marker.
   The map is built from the path's skills in order and from your own progress on this device. Nothing is sent anywhere. */
window.MargaRoadmap = function (A) {
'use strict';
var $ = A.$, $$ = A.$$, e = A.e, view = A.view, D = A.D, PATHS = D.paths.live;

function modDone(m) { return m.lessons.length > 0 && m.lessons.filter(A.isDone).length === m.lessons.length; }
function modCount(m) { return m.lessons.filter(A.isDone).length; }
function unlocked(m) { return (m.requires || []).every(function (r) { return A.MOD[r] && modDone(A.MOD[r]); }); }
function missing(m) { return (m.requires || []).filter(function (r) { return A.MOD[r] && !modDone(A.MOD[r]); }).map(function (r) { return A.MOD[r]; }); }
function pathStats(p) {
  var mods = p.modules.map(function (id) { return A.MOD[id]; }).filter(Boolean), total = 0, done = 0, here = null;
  mods.forEach(function (m) { total += m.lessons.length; done += modCount(m); });
  for (var i = 0; i < mods.length; i++) if (!modDone(mods[i]) && unlocked(mods[i])) { here = mods[i]; break; }
  if (!here) for (var j = 0; j < mods.length; j++) if (!modDone(mods[j])) { here = mods[j]; break; }
  return { mods: mods, total: total, done: done, here: here };
}
function nextLesson(m) { for (var i = 0; i < m.lessons.length; i++) if (!A.isDone(m.lessons[i])) return m.lessons[i]; return null; }
function pct(a, b) { return b ? Math.round(a * 100 / b) : 0; }
A.roadmap = { stats: pathStats };

function indexView() {
  view.title = 'Role roadmaps | MARGA by EknathaLabs'; view.nav = 'learn'; view.after = null; view.cleanup = null; view.voice = '';
  view.html = '<section class="page-head wrap"><h1>Role roadmaps</h1><p class="lede">Pick the job you are aiming for. Each map lists the skills in order, shows how far you are, and marks where you are now. Free, no sign-up, and your progress stays on this device.</p></section>' +
    '<div class="wrap"><ul class="rm-cards">' + PATHS.map(function (p) {
      var s = pathStats(p), n = pct(s.done, s.total);
      return '<li class="rm-card"><h2><a href="#/roadmap/' + e(p.id) + '">' + e(p.title) + '</a></h2><p>' + e(p.summary) + '</p>' +
        '<div class="rm-meter" role="img" aria-label="' + n + ' percent of the lessons done"><span style="width:' + n + '%"></span></div>' +
        '<p class="small">' + s.done + ' of ' + s.total + ' lessons done' + (s.here ? ' | You are here: ' + e(s.here.title) : ' | Complete') + '</p></li>';
    }).join('') + '</ul></div>';
}

function mapView(id) {
  var p = PATHS.filter(function (x) { return x.id === id; })[0];
  view.nav = 'learn'; view.after = null; view.cleanup = null; view.voice = '';
  if (!p) { view.title = 'Roadmap not found | MARGA'; view.html = '<section class="page-head wrap"><h1>That roadmap does not exist</h1><p class="lede"><a href="#/roadmap">See all roadmaps</a>.</p></section>'; return; }
  view.title = p.title + ' roadmap | MARGA by EknathaLabs';
  var s = pathStats(p), n = pct(s.done, s.total), nl = s.here ? nextLesson(s.here) : null;
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/roadmap">Role roadmaps</a></nav><h1>' + e(p.title) + ' roadmap</h1><p class="lede">' + e(p.summary) + '</p>' +
    '<div class="rm-meter" role="img" aria-label="' + n + ' percent of the lessons done"><span style="width:' + n + '%"></span></div>' +
    '<p class="small" id="rm-sum">' + s.done + ' of ' + s.total + ' lessons done (' + n + ' percent), across ' + s.mods.length + ' skills.</p>' +
    '<p class="actions">' + (s.here ? '<button type="button" class="btn btn-primary" id="rm-jump">Jump to where I am</button>' : '') + (nl && A.isLoaded !== undefined ? '<a class="btn btn-quiet" id="rm-next" href="' + A.hrefLesson(nl) + '">Continue: ' + e(A.LES[nl].title) + '</a>' : '') +
    '<button type="button" class="btn btn-quiet" data-act="print">Print the map</button></p></section>' +
    '<div class="wrap narrow"><ol class="rm-map">' + s.mods.map(function (m, i) {
      var d = modCount(m), full = modDone(m), here = s.here === m, ok = unlocked(m), cls = full ? 'is-done' : here ? 'is-here' : ok ? 'is-ready' : 'is-locked';
      var state = full ? 'Complete' : here ? 'You are here' : ok ? 'Ready' : 'Locked until ' + missing(m).map(function (x) { return x.title; }).join(' and ');
      var nxt = nextLesson(m);
      return '<li class="rm-node ' + cls + '"' + (here ? ' id="rm-here" aria-current="step"' : '') + '><div class="rm-dot" aria-hidden="true">' + (full ? 'Done' : i + 1) + '</div><div class="rm-body"><h2><a href="#/module/' + e(m.id) + '">' + e(m.title) + '</a></h2>' +
        '<p class="small"><strong class="rm-state">' + e(state) + '</strong> | ' + d + ' of ' + m.lessons.length + ' lessons</p>' +
        '<div class="rm-meter" role="img" aria-label="' + pct(d, m.lessons.length) + ' percent"><span style="width:' + pct(d, m.lessons.length) + '%"></span></div>' +
        '<details' + (here ? ' open' : '') + '><summary>' + (here ? 'Lessons in this skill' : 'Show the lessons') + '</summary><ol class="rm-les">' + m.lessons.map(function (lid) {
          var done = A.isDone(lid), cur = here && lid === nxt;
          return '<li class="' + (done ? 'is-done' : cur ? 'is-cur' : '') + '"' + (cur ? ' id="rm-cur"' : '') + '>' + (done ? '<span class="chip pass">Done</span> ' : cur ? '<span class="chip">Next</span> ' : '') + '<a href="' + A.hrefLesson(lid) + '">' + e(A.LES[lid].title) + '</a></li>';
        }).join('') + '</ol></details></div></li>';
    }).join('') + '</ol></div>';
  view.after = function () {
    var j = $('#rm-jump'); if (j) j.addEventListener('click', function () {
      var t = $('#rm-cur') || $('#rm-here'); if (!t) return;
      var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      t.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' }); var a = $('a', t); if (a) a.focus({ preventScroll: true });
    });
  };
}

/* a link to the map from each role page and from the list of roles */
A.afterRoute(function (h) {
  var m = (h || '').match(/^\/(path)\/([\w-]+)$/), list = /^\/paths$/.test(h || '');
  if ((!m && !list) || $('#rm-link')) return;
  var hd = $('#main h1'); if (!hd) return;
  if (m) { if (!PATHS.some(function (x) { return x.id === m[2]; })) return; hd.insertAdjacentHTML('afterend', '<p class="actions rm-entry"><a class="btn btn-quiet" id="rm-link" href="#/roadmap/' + e(m[2]) + '">See the roadmap with where you are</a></p>'); }
  else hd.insertAdjacentHTML('afterend', '<p class="actions rm-entry"><a class="btn btn-quiet" id="rm-link" href="#/roadmap">See each role as a roadmap</a></p>');
});
A.addRoute(/^\/roadmap$/, indexView);
A.addRoute(/^\/roadmap\/([\w-]+)$/, mapView);
};
