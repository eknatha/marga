/* MARGA project tracks: four end-to-end builds, each a chain of stages (learn, build, check, keep).
   Data is src/tracks/*.json. Ticks are saved in this browser (state key trk). Nothing here is graded. */
window.MargaTracks = function (A) {
'use strict';
var D = A.D, LES = A.LES, view = A.view, $ = A.$, $$ = A.$$, e = A.e, plural = A.plural;
var TR = D.tracks || [], BY = {};
TR.forEach(function (t) { BY[t.id] = t; });
function bag() { var s = A.state(); if (!s.trk || typeof s.trk !== 'object' || Array.isArray(s.trk)) s.trk = {}; return s.trk; }
function ticks(id) { var b = bag(); if (!b[id] || typeof b[id] !== 'object') b[id] = {}; return b[id]; }
function inl(t) { return e(t).replace(/`([^`]+)`/g, '<code>$1</code>'); }
function stageTotal(t, i) { var s = t.stages[i]; return s.build.length + s.check.length; }
function stageDone(t, i) {
  var b = ticks(t.id), s = t.stages[i], n = 0, k;
  for (k = 0; k < s.build.length; k++) if (b['s' + i + 'b' + k]) n++;
  for (k = 0; k < s.check.length; k++) if (b['s' + i + 'c' + k]) n++;
  return n;
}
function done(t) { var n = 0, i; for (i = 0; i < t.stages.length; i++) n += stageDone(t, i); return n; }
function total(t) { var n = 0, i; for (i = 0; i < t.stages.length; i++) n += stageTotal(t, i); return n; }
function finished(t) { return done(t) === total(t); }
function stagesFinished(t) { var n = 0; for (var i = 0; i < t.stages.length; i++) if (stageDone(t, i) === stageTotal(t, i)) n++; return n; }
A.tracksFinished = function () { return TR.filter(finished); };
A.tracksCount = function () { return TR.filter(finished).length + ' of ' + TR.length + ' finished'; };
function card(t) {
  var d = stagesFinished(t);
  return '<li class="plan-card"><div class="plan-card-top"><h2><a href="#/track/' + e(t.id) + '">' + e(t.title) + '</a></h2><span class="chip' + (finished(t) ? ' pass' : '') + '">' + (finished(t) ? 'Finished' : d + ' of ' + t.stages.length + ' stages') + '</span></div>' +
    '<p>' + e(t.summary) + '</p><p class="small">' + e(t.level) + '. About ' + t.hours + ' hours, ' + plural(t.stages.length, 'stage') + '. Tools: ' + e(t.tools.join(', ')) + '.</p></li>';
}
A.addRoute(/^\/tracks$/, function () {
  view.title = 'Project tracks | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a></nav><h1>Project tracks</h1>' +
    '<p class="lede">One real project from start to finish, in stages. Each stage lists the lessons to read, the steps to build, the checks that prove it works and what to keep in your repository. Longer than a capstone, and every stage builds on the one before. <a href="#/placement">Not sure which one? Take the placement diagnostic.</a></p></section>' +
    '<div class="wrap"><ul class="plan-list">' + TR.map(card).join('') + '</ul><p class="small">Ticks are saved in this browser only. Nothing here is graded or checked for you: the checks are statements you confirm by running your own project.</p></div>';
  view.after = null;
});
function stageHtml(t, i) {
  var s = t.stages[i], b = ticks(t.id), n = stageDone(t, i), tot = stageTotal(t, i);
  function boxes(list, p) {
    return '<ul class="trk-chk">' + list.map(function (x, k) {
      var key = 's' + i + p + k, on = !!b[key];
      return '<li><label><input type="checkbox" data-act="trk-tick" data-t="' + e(t.id) + '" data-k="' + key + '"' + (on ? ' checked' : '') + '><span class="' + (on ? 'done' : '') + '">' + inl(x) + '</span></label></li>'; }).join('') + '</ul>';
  }
  return '<section class="trk-stage" id="stage-' + (i + 1) + '"><h3>Stage ' + (i + 1) + ': ' + e(s.title) + ' <span class="chip' + (n === tot ? ' pass' : '') + '" data-trk-count="' + (i) + '">' + n + ' of ' + tot + '</span></h3>' +
    '<p>' + e(s.goal) + '</p>' +
    '<h4>Learn first</h4><ul>' + s.learn.map(function (id) { var l = LES[id] || (A.D.lessons && A.D.lessons[id]); return '<li><a href="' + A.hrefLesson(id) + '">' + e(l && l.title ? l.title : lessonName(id)) + '</a></li>'; }).join('') + '</ul>' +
    '<h4>Build</h4>' + boxes(s.build, 'b') + '<h4>Check</h4>' + boxes(s.check, 'c') + breakHtml(s) + '<p class="small"><strong>Keep:</strong> ' + e(s.keep) + '</p></section>';
}
function breakHtml(s) {
  var b = s.breakit; if (!b) return '';
  return '<details class="trk-break"><summary>Break it on purpose</summary><p><strong>Do this:</strong> ' + inl(b.do) + '</p><p><strong>You should see:</strong> ' + inl(b.see) + '</p><p><strong>Then fix it:</strong> ' + inl(b.fix) + '</p><p class="small">Only break your own project, or a sandbox account with a budget alert on. Put what you learned in your notes.</p></details>';
}
function lessonName(id) { var s = id.split('/')[1] || id; s = s.replace(/-/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); }
A.addRoute(/^\/track\/([\w-]+)$/, function (id) {
  var t = BY[id];
  if (!t) { view.title = 'Track not found | MARGA by EknathaLabs'; view.nav = 'practice'; view.html = '<section class="page-head wrap"><h1>Track not found</h1><p class="lede"><a href="#/tracks">See all project tracks</a>.</p></section>'; view.after = null; return; }
  view.title = t.title + ' | Project tracks | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/practice">Practice</a> / <a href="#/tracks">Project tracks</a></nav><h1>' + e(t.title) + '</h1><p class="lede">' + e(t.summary) + '</p>' +
    '<p class="small"><strong>Who it is for:</strong> ' + e(t.who) + '</p><p class="small"><strong>You need:</strong> ' + e(t.needs) + '</p><p class="small"><strong>You finish with:</strong> ' + e(t.outcome) + '</p>' +
    '<p class="small" id="trk-total">' + done(t) + ' of ' + total(t) + ' steps and checks ticked.</p></section>' +
    '<div class="wrap narrow">' + t.stages.map(function (s, i) { return stageHtml(t, i); }).join('') + '</div>';
  view.after = null;
});
A.onAct('trk-tick', function (el) {
  var t = BY[el.getAttribute('data-t')]; if (!t) return;
  var b = ticks(t.id), k = el.getAttribute('data-k');
  if (el.checked) b[k] = 1; else delete b[k];
  A.markActive(); A.save(); A.renderChrome();
  var span = el.parentNode.querySelector('span'); if (span) span.className = el.checked ? 'done' : '';
  var i = Number(k.slice(1)), c = $('[data-trk-count="' + i + '"]'), n = stageDone(t, i), tot = stageTotal(t, i);
  if (c) { c.textContent = n + ' of ' + tot; c.className = 'chip' + (n === tot ? ' pass' : ''); }
  var all = $('#trk-total'); if (all) all.textContent = done(t) + ' of ' + total(t) + ' steps and checks ticked.';
});
};
