/* MARGA cross links: for each interview question, the labs that practise the same thing.
   Matching is a plain word-overlap score between the question and each lab, inside the same skill area. No AI, no network. */
window.MargaCross = (function () {
'use strict';
var STOP = {}; ('about above after again also and any are because been before being between both but can could did does doing down during each from have having here how into its just like make more most much must not off once only other our out over own same should some such than that the their them then there these they this those through under until very was were what when where which while who why will with would you your use used using one two get gets set sets run runs name names type').split(' ').forEach(function (w) { STOP[w] = 1; });
var built = null, A = null;
function toks(t) { var o = {}; (String(t || '').toLowerCase().match(/[a-z][a-z0-9\-]{3,}/g) || []).forEach(function (w) { if (!STOP[w]) { w = w.replace(/(ing|ed|es|s)$/, ''); if (w.length > 3) o[w] = (o[w] || 0) + 1; } }); return o; }
function modOf(lab, kind) { if (kind === 'term') return lab.module; var l = lab.lesson ? lab.lesson.split('/')[0] : 'linux'; return l; }
function build(app) {
  A = app; var D = A.D, docs = [], df = {};
  (D.vmlabs || []).forEach(function (x) { docs.push({ kind: 'Real Linux lab', href: '#/linux/' + x.id, title: x.title, mod: modOf(x, 'vm'), t: toks(x.title + ' ' + x.title + ' ' + x.title + ' ' + x.story) }); });
  (D.termlabs || []).forEach(function (x) { docs.push({ kind: 'Terminal lab', href: '#/terminal-lab/' + x.id, title: x.title, mod: x.module, lesson: x.lesson ? x.lesson.split('/')[0] : '', t: toks(x.title + ' ' + x.title + ' ' + x.title + ' ' + x.summary + ' ' + x.story) }); });
  docs.forEach(function (d) { Object.keys(d.t).forEach(function (w) { df[w] = (df[w] || 0) + 1; }); });
  built = { docs: docs, df: df, n: docs.length, cache: {} };
}
function forQuestion(x) {
  if (!A) return []; if (!built) build(A);
  if (built.cache[x.id]) return built.cache[x.id];
  var q = toks(x.q + ' ' + x.q + ' ' + String(x.text || '').slice(0, 260)), res = [];
  built.docs.forEach(function (d) {
    var same = d.mod === x.module || d.lesson === x.module, sc = 0, hits = 0;
    Object.keys(q).forEach(function (w) { if (d.t[w]) { var idf = Math.log(built.n / built.df[w]); sc += idf * Math.min(2, q[w]) * Math.min(2, d.t[w]); hits++; } });
    if (same && hits >= 2 && sc >= 17) res.push({ d: d, sc: sc });
  });
  res.sort(function (a, b) { return b.sc - a.sc; });
  var seen = {}, out = []; res.forEach(function (r) { if (out.length < 2 && !seen[r.d.title]) { seen[r.d.title] = 1; out.push({ href: r.d.href, title: r.d.title, kind: r.d.kind }); } });
  built.cache[x.id] = out; return out;
}
function html(x, e) {
  var l = forQuestion(x); if (!l.length) return '';
  return '<p class="iv-labs small"><strong>Related practice:</strong> ' + l.map(function (y) { return '<a href="' + e(y.href) + '">' + e(y.title) + '</a> (' + e(y.kind) + ')'; }).join(', ') + '</p>';
}
return { init: build, forQuestion: forQuestion, html: html };
}());
