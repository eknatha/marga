/* MARGA interactive widgets: small data-driven models you can change and watch.
   A widget is plain data (src/widgets/*.json): inputs, derived values, a diagram of nodes and edges with animated
   request dots, readouts, a chart across one input, and verdict rules. Expressions are written by the authors, are
   checked by tools/validate.js, and run with only math helpers in scope. The models are simplified and say so.
   window.MargaWE is the pure part (no page needed); window.MargaWidgets registers the pages. */
(function () {
'use strict';
var HELP = {
  min: Math.min, max: Math.max, round: Math.round, floor: Math.floor, ceil: Math.ceil, pow: Math.pow, sqrt: Math.sqrt, log: Math.log, exp: Math.exp, abs: Math.abs,
  clamp: function (x, a, b) { return Math.min(b, Math.max(a, x)); },
  fmt: function (n, dp) { n = Number(n); if (!isFinite(n)) return 'n/a'; dp = dp || 0; return n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }); },
  pct: function (n, dp) { n = Number(n); if (!isFinite(n)) return 'n/a'; return HELP.fmt(n * 100, dp || 0) + '%'; }
};

/* deterministic hash-ring maths for the consistent-hashing widget */
function h32(x) { x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); return (x ^ (x >>> 16)) >>> 0; }
var ringMemo = {};
function ringOwners(N, V, K) {
  var key = N + '/' + V + '/' + K; if (ringMemo[key]) return ringMemo[key];
  var pts = [], n, v, k, cnt = [];
  for (n = 0; n < N; n++) { cnt.push(0); for (v = 0; v < V; v++) pts.push([h32(n * 7919 + v * 104729 + 13), n]); }
  pts.sort(function (a, b) { return a[0] - b[0]; });
  var owners = new Array(K);
  for (k = 0; k < K; k++) {
    var hk = h32(k * 40503 + 99), lo = 0, hi = pts.length;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (pts[mid][0] < hk) lo = mid + 1; else hi = mid; }
    owners[k] = pts[lo === pts.length ? 0 : lo][1]; cnt[owners[k]]++;
  }
  var out = { owners: owners, cnt: cnt }; ringMemo[key] = out; return out;
}
HELP.ringMax = function (N, V) { var r = ringOwners(N, V, 4000), m = 0; r.cnt.forEach(function (c) { if (c > m) m = c; }); return m / (4000 / N); };
HELP.ringMin = function (N, V) { var r = ringOwners(N, V, 4000), m = 1e9; r.cnt.forEach(function (c) { if (c < m) m = c; }); return m / (4000 / N); };
HELP.ringMoved = function (N, V) { var a = ringOwners(N, V, 4000).owners, b = ringOwners(N + 1, V, 4000).owners, c = 0; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) c++; return c / a.length; };
HELP.modMoved = function (N) { var c = 0; for (var i = 0; i < 4000; i++) { var h = h32(i * 40503 + 99); if (h % N !== h % (N + 1)) c++; } return c / 4000; };
var cache = {};
function compile(expr) {
  if (cache[expr]) return cache[expr];
  var f = new Function('v', 'with (v) { return (' + expr + '); }');
  cache[expr] = f; return f;
}
function scopeFor(w, values) {
  var v = Object.create(HELP); (w.inputs || []).forEach(function (i) { v[i.id] = values[i.id]; });
  (w.vars || []).forEach(function (p) { v[p[0]] = compile(p[1])(v); });
  return v;
}
function defaults(w) { var o = {}; (w.inputs || []).forEach(function (i) { o[i.id] = i.value; }); return o; }
function ev(expr, v) { return compile(expr)(v); }
/* evaluate everything a page shows; throws on a bad expression */
function run(w, values) {
  var v = scopeFor(w, values), out = { v: v };
  out.nodes = (w.nodes || []).map(function (n) { return { id: n.id, state: +ev(n.state || '0', v), sub: n.sub ? String(ev(n.sub, v)) : '' }; });
  out.edges = (w.edges || []).map(function (e) { return { from: e.from, to: e.to, flow: clampN(+ev(e.flow === undefined ? '1' : String(e.flow), v), 0, 1), bad: !!ev(e.bad === undefined ? 'false' : String(e.bad), v) }; });
  out.readouts = (w.readouts || []).map(function (r) { var x = ev(r.expr, v); return { label: r.label, value: x, text: typeof x === 'number' ? HELP.fmt(x, r.dp || 0) + (r.unit ? ' ' + r.unit : '') : String(x) }; });
  out.verdict = null; (w.verdicts || []).some(function (d) { if (ev(d.when, v)) { out.verdict = d; return true; } return false; });
  return out;
}
function clampN(x, a, b) { return isFinite(x) ? Math.min(b, Math.max(a, x)) : a; }
function sweep(w, values, n) {
  var c = w.chart; if (!c) return null; var inp = (w.inputs || []).filter(function (i) { return i.id === c.x; })[0]; if (!inp) return null;
  var pts = [], i, vals;
  for (i = 0; i <= n; i++) { vals = Object.assign({}, values); vals[c.x] = inp.min + (inp.max - inp.min) * i / n; var v = scopeFor(w, vals); pts.push([vals[c.x], +ev(c.y, v), c.y2 ? +ev(c.y2, v) : null]); }
  return pts;
}
window.MargaWE = { compile: compile, scopeFor: scopeFor, defaults: defaults, run: run, sweep: sweep, ev: ev, HELP: HELP };
})();

window.MargaWidgets = function (A) {
'use strict';
var D = A.D, MOD = A.MOD, view = A.view, $ = A.$, $$ = A.$$, e = A.e, plural = A.plural;
var WE = window.MargaWE, WS = D.widgets || [], BY = {};
WS.forEach(function (w) { BY[w.id] = w; });
function modTitle(id) { return MOD[id] ? MOD[id].title : id; }
function bag() { var s = A.state(); if (!s.wgt || typeof s.wgt !== 'object' || Array.isArray(s.wgt)) s.wgt = {}; return s.wgt; }
var reduce = function () { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.getAttribute('data-a-motion') === 'off' || document.documentElement.getAttribute('data-a-motion') === 'reduce'; } catch (x) { return false; } };

/* ---------- links shown on lessons, skill pages and the practice hub ---------- */
window.MargaWidgetLinks = {
  lesson: function (lid) {
    var mid = lid.split('/')[0], T = bag(), items = WS.filter(function (w) { return w.lesson === lid; }), near = false;
    if (!items.length) { near = true; items = WS.filter(function (w) { return w.module === mid; }).sort(function (a, b) { return (!!T[a.id]) - (!!T[b.id]); }).slice(0, 2); }
    if (!items.length) return '';
    return '<section class="try-it" id="try-it" aria-labelledby="ti-h"><h2 id="ti-h">Try it</h2><p class="small">' + (near ? 'No widget is tied to this exact lesson. ' + (items.length === 1 ? 'This one is' : 'These are') + ' from the same skill. ' : (items.length === 1 ? 'An interactive widget' : plural(items.length, 'interactive widget')) + ' for this lesson. ') +
      'Change the inputs and watch what happens. <a href="#/widgets">All widgets</a></p><ul class="ex-list">' + items.map(function (w) { return '<li><a href="#/widget/' + e(w.id) + '"><strong>' + e(w.title) + '</strong><span>' + e(w.summary) + '</span><em>Interactive' + (T[w.id] ? ' | Tried' : '') + '</em></a></li>'; }).join('') + '</ul></section>';
  },
  module: function (mid) { var n = WS.filter(function (w) { return w.module === mid; }).length; return n ? '<a href="#/widgets?skill=' + mid + '">' + plural(n, 'interactive widget') + '</a>' : ''; }
};

/* ---------- index ---------- */
function indexView() {
  var q = (location.hash.split('?')[1] || ''), m = q.match(/(?:^|&)skill=([^&]+)/), want = m ? decodeURIComponent(m[1]).split(',') : [], T = bag();
  var mods = []; WS.forEach(function (w) { if (mods.indexOf(w.module) < 0) mods.push(w.module); });
  view.title = 'Interactive widgets | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = '<section class="page-head wrap"><h1>Interactive widgets</h1><p class="lede">Small simulations you can change. Move a slider, kill a node or flip a setting, and watch the system respond. They are simplified models, not measurements. ' + plural(WS.length, 'widget') + ', ' + Object.keys(T).length + ' tried.</p></section>' +
    '<div class="wrap narrow"><div class="chips" role="group" aria-label="Filter by skill"><a class="chip' + (want.length ? '' : ' on') + '" href="#/widgets">All</a>' +
    mods.map(function (id) { var n = WS.filter(function (w) { return w.module === id; }).length; return '<a class="chip' + (want.indexOf(id) >= 0 ? ' on' : '') + '" href="#/widgets?skill=' + e(id) + '">' + e(modTitle(id)) + ' (' + n + ')</a>'; }).join('') + '</div>' +
    mods.filter(function (id) { return !want.length || want.indexOf(id) >= 0; }).map(function (id) {
      return '<h2 class="sub-h">' + e(modTitle(id)) + '</h2><ul class="ex-list">' + WS.filter(function (w) { return w.module === id; }).map(function (w) { return '<li><a href="#/widget/' + e(w.id) + '"><strong>' + e(w.title) + '</strong><span>' + e(w.summary) + '</span><em>' + (T[w.id] ? 'Tried' : 'Not tried yet') + '</em></a></li>'; }).join('') + '</ul>';
    }).join('') + '</div>';
}

/* ---------- one widget ---------- */
function svgFor(w, r, values) {
  var NW = 150, NH = 52, CW = 190, RH = 92, P = 14, maxC = 0, maxR = 0, by = {}, still = reduce();
  w.nodes.forEach(function (n) { by[n.id] = n; if (n.x > maxC) maxC = n.x; if (n.y > maxR) maxR = n.y; });
  var W = P * 2 + maxC * CW + NW, H = P * 2 + maxR * RH + NH;
  function cx(n) { return P + n.x * CW + NW / 2; } function cy(n) { return P + n.y * RH + NH / 2; }
  var s = '<svg class="wd" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" role="group" aria-label="Diagram of ' + e(w.title) + '. Select a node marked as a control to change it.">';
  r.edges.forEach(function (ed, i) {
    var a = by[ed.from], b = by[ed.to]; if (!a || !b) return;
    var path = 'M' + cx(a) + ' ' + cy(a) + ' L' + cx(b) + ' ' + cy(b);
    s += '<path d="' + path + '" class="wde' + (ed.bad ? ' bad' : '') + '"/>';
    var dots = Math.round(ed.flow * 4);
    for (var k = 0; k < dots; k++) {
      if (still) { var t = (k + 1) / (dots + 1); s += '<circle r="4" class="wdd' + (ed.bad ? ' bad' : '') + '" cx="' + (cx(a) + (cx(b) - cx(a)) * t) + '" cy="' + (cy(a) + (cy(b) - cy(a)) * t) + '"/>'; }
      else s += '<circle r="4" class="wdd' + (ed.bad ? ' bad' : '') + '"><animateMotion dur="' + (2.4 - ed.flow) + 's" begin="-' + (k * (2.4 - ed.flow) / dots).toFixed(2) + 's" repeatCount="indefinite" path="' + path + '"/></circle>';
    }
  });
  w.nodes.forEach(function (n, i) {
    var st = r.nodes[i], cls = ['ok', 'warn', 'bad'][Math.max(0, Math.min(2, Math.round(st.state)))], ctl = n.toggle ? ' role="button" tabindex="0" aria-pressed="' + (!!values[n.toggle]) + '" data-toggle="' + e(n.toggle) + '" aria-label="' + e(n.label + '. ' + (values[n.toggle] ? 'Failed' : 'Working') + '. Select to change.') + '"' : '';
    s += '<g class="wdn ' + cls + (n.toggle ? ' ctl' : '') + '"' + ctl + '><rect x="' + (P + n.x * CW) + '" y="' + (P + n.y * RH) + '" width="' + NW + '" height="' + NH + '" rx="8"/>' +
      '<text x="' + cx(n) + '" y="' + (cy(n) - (st.sub ? 5 : -4)) + '" text-anchor="middle" class="t1">' + e(n.label.length > 22 ? n.label.slice(0, 21) + '.' : n.label) + '</text>' +
      (st.sub ? '<text x="' + cx(n) + '" y="' + (cy(n) + 13) + '" text-anchor="middle" class="t2">' + e(st.sub.length > 26 ? st.sub.slice(0, 25) + '.' : st.sub) + '</text>' : '') + '</g>';
  });
  return s + '</svg>';
}
function chartFor(w, values) {
  var pts = WE.sweep(w, values, 40); if (!pts) return '';
  var c = w.chart, X0 = 44, Y0 = 26, CWd = 300, CH = 120, minx = pts[0][0], maxx = pts[pts.length - 1][0], ys = [];
  pts.forEach(function (p) { ys.push(p[1]); if (p[2] !== null) ys.push(p[2]); });
  var miny = c.min !== undefined ? c.min : Math.min.apply(null, ys), maxy = c.max !== undefined ? c.max : Math.max.apply(null, ys); if (maxy === miny) maxy = miny + 1;
  function X(x) { return X0 + (x - minx) / (maxx - minx || 1) * CWd; } function Y(y) { return Y0 + CH - (Math.min(maxy, Math.max(miny, y)) - miny) / (maxy - miny) * CH; }
  var line = function (idx) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[idx]).toFixed(1); }).join(' '); };
  var cur = values[c.x], v = WE.scopeFor(w, values), cy = +WE.ev(c.y, v);
  var s = '<svg class="wdc" viewBox="0 0 ' + (X0 + CWd + 14) + ' ' + (Y0 + CH + 34) + '" role="img" aria-label="' + e((c.title || 'Chart') + ': ' + c.ylabel + ' against ' + c.xlabel + '. See the table below for values.') + '">' +
    '<line x1="' + X0 + '" y1="' + (Y0 + CH) + '" x2="' + (X0 + CWd) + '" y2="' + (Y0 + CH) + '" class="ax"/><line x1="' + X0 + '" y1="' + Y0 + '" x2="' + X0 + '" y2="' + (Y0 + CH) + '" class="ax"/>' +
    '<path d="' + line(1) + '" class="ln1"/>' + (c.y2 ? '<path d="' + line(2) + '" class="ln2"/>' : '') + '<circle cx="' + X(cur).toFixed(1) + '" cy="' + Y(cy).toFixed(1) + '" r="5" class="mk"/>' +
    '<text x="' + (X0 + CWd / 2) + '" y="' + (Y0 + CH + 28) + '" text-anchor="middle" class="ct">' + e(c.xlabel) + '</text><text x="4" y="12" class="ct">' + e(c.ylabel) + '</text>' +
    '<text x="' + (X0 - 4) + '" y="' + (Y0 + 8) + '" text-anchor="end" class="ct">' + e(WE.HELP.fmt(maxy, maxy < 10 ? 1 : 0)) + '</text><text x="' + (X0 - 4) + '" y="' + (Y0 + CH) + '" text-anchor="end" class="ct">' + e(WE.HELP.fmt(miny, maxy < 10 ? 1 : 0)) + '</text></svg>';
  var rows = [0, 8, 16, 24, 32, 40].map(function (i) { var p = pts[i]; return '<tr><td>' + e(WE.HELP.fmt(p[0], 1)) + '</td><td>' + e(WE.HELP.fmt(p[1], 1)) + '</td>' + (c.y2 ? '<td>' + e(WE.HELP.fmt(p[2], 1)) + '</td>' : '') + '</tr>'; }).join('');
  return '<div class="wd-chart">' + s + (c.y2 && c.y2label ? '<p class="small">Solid line: ' + e(c.ylabel) + '. Dashed line: ' + e(c.y2label) + '.</p>' : '') + '<details><summary>Data table</summary><div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + e(c.xlabel) + '</th><th>' + e(c.ylabel) + '</th>' + (c.y2 ? '<th>' + e(c.y2label || 'Second') + '</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div></details></div>';
}
function inputHtml(i, val) {
  if (i.type === 'toggle') return '<label class="opt-r"><input type="checkbox" data-i="' + e(i.id) + '"' + (val ? ' checked' : '') + '> <span>' + e(i.label) + '</span></label>';
  if (i.type === 'select') return '<label class="field calc-f"><span>' + e(i.label) + '</span><select data-i="' + e(i.id) + '">' + i.options.map(function (o) { return '<option value="' + e(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + e(o[1]) + '</option>'; }).join('') + '</select></label>';
  return '<label class="field calc-f wd-rng"><span>' + e(i.label) + ': <output data-o="' + e(i.id) + '">' + e(WE.HELP.fmt(val, i.step < 1 ? 1 : 0)) + (i.unit ? ' ' + e(i.unit) : '') + '</output></span><input type="range" data-i="' + e(i.id) + '" min="' + i.min + '" max="' + i.max + '" step="' + i.step + '" value="' + val + '"></label>';
}
function presetsHtml(w) {
  var P = w.presets || [];
  return '<div class="wd-presets" role="group" aria-label="Starting points">' + P.map(function (x) { return '<button type="button" class="btn btn-quiet" data-preset="' + e(x.id) + '" aria-describedby="wd-story">' + e(x.label) + '</button>'; }).join('') +
    '<button type="button" class="btn btn-quiet" id="wd-share">Copy link to this setup</button>' +
    (P.length ? '<label class="opt-r"><input type="checkbox" id="wd-predict"> <span>Predict first</span></label>' : '') + '</div>' +
    '<p class="small wd-story" id="wd-story" aria-live="polite"></p><div id="wd-ask" aria-live="polite"></div>';
}
function parseQ(w) {
  var m = (location.hash || '').match(/[?&]v=([^&]+)/), out = {}; if (!m) return out;
  decodeURIComponent(m[1]).split(',').forEach(function (kv) {
    var p = kv.split(':'), i = (w.inputs || []).filter(function (x) { return x.id === p[0]; })[0]; if (!i || p.length < 2) return;
    var raw = p.slice(1).join(':');
    if (i.type === 'toggle') out[i.id] = raw === '1';
    else if (i.type === 'select') { var o = i.options.filter(function (q) { return String(q[0]) === raw; })[0]; if (o) out[i.id] = o[0]; }
    else { var n = +raw; if (isFinite(n)) out[i.id] = Math.min(i.max, Math.max(i.min, n)); }
  });
  return out;
}
function widgetView(id) {
  var w = BY[id];
  if (!w) { view.title = 'Widget not found | MARGA'; view.nav = 'practice'; view.html = '<section class="page-head wrap"><h1>That widget does not exist</h1><p class="lede"><a href="#/widgets">See all widgets</a>.</p></section>'; return; }
  view.title = w.title + ' | Interactive widgets | MARGA by EknathaLabs'; view.nav = 'practice';
  var L = A.LES[w.lesson];
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/widgets">Widgets</a><a href="#/widgets?skill=' + e(w.module) + '">' + e(modTitle(w.module)) + '</a></nav><h1>' + e(w.title) + '</h1><p class="lede">' + e(w.summary) + '</p></section>' +
    '<div class="wrap narrow wdw"><section class="calc" aria-label="Controls"><h2>Change it</h2>' + presetsHtml(w) + '<div class="calc-in" id="wd-in">' + (w.inputs || []).map(function (i) { return inputHtml(i, i.value); }).join('') + '</div><div class="actions"><button type="button" class="btn btn-quiet" id="wd-reset">Reset</button></div></section>' +
    '<section class="calc"><h2>Watch it</h2><div class="sd-wrap" id="wd-dia"></div><div id="wd-chart"></div><dl class="calc-out" id="wd-read"></dl><div id="wd-verdict" aria-live="polite"></div></section>' +
    '<section class="note-panel"><h3>Try this</h3><ul>' + (w.tries || []).map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ul><p class="small">This is a simplified model made to build intuition. Real systems differ, so measure yours.</p>' +
    (L ? '<p class="small">Related lesson: <a href="' + A.hrefLesson(w.lesson) + '">' + e(L.title) + '</a>.</p>' : '') + '</section></div>';
  view.after = function () { wireWidget(w); };
}
function wireWidget(w) {
  var vals = WE.defaults(w); var T = bag(); if (!T[w.id]) { T[w.id] = 1; A.save(); }
  var q0 = parseQ(w); Object.keys(q0).forEach(function (k) { vals[k] = q0[k]; });
  var pending = false;
  function sync() {
    $$('#wd-in [data-i]').forEach(function (c) { var id = c.getAttribute('data-i'); if (c.type === 'checkbox') c.checked = !!vals[id]; else c.value = vals[id]; var o = $('[data-o="' + id + '"]'); if (o) { var inp = w.inputs.filter(function (i) { return i.id === id; })[0]; o.textContent = WE.HELP.fmt(vals[id], inp.step < 1 ? 1 : 0) + (inp.unit ? ' ' + inp.unit : ''); } });
  }
  function qs() {
    var d = WE.defaults(w), parts = (w.inputs || []).filter(function (i) { return vals[i.id] !== d[i.id]; }).map(function (i) { return i.id + ':' + (i.type === 'toggle' ? (vals[i.id] ? 1 : 0) : vals[i.id]); });
    return parts.length ? '?v=' + encodeURIComponent(parts.join(',')) : '';
  }
  function keepUrl() { try { history.replaceState(null, '', location.pathname + location.search + '#/widget/' + w.id + qs()); } catch (x) { /* ignore */ } }
  function mask(on) { pending = on; ['wd-dia', 'wd-chart', 'wd-read', 'wd-verdict'].forEach(function (k) { var n = document.getElementById(k); if (n) n.hidden = on; }); }
  function draw() {
    var r; try { r = WE.run(w, vals); } catch (x) { $('#wd-verdict').innerHTML = '<p class="calc-err" role="alert">This widget could not run.</p>'; return; }
    $('#wd-dia').innerHTML = svgFor(w, r, vals);
    $('#wd-chart').innerHTML = chartFor(w, vals);
    $('#wd-read').innerHTML = r.readouts.map(function (x) { return '<div class="calc-row"><dt>' + e(x.label) + '</dt><dd>' + e(x.text) + '</dd></div>'; }).join('');
    keepUrl(); var d = r.verdict; $('#wd-verdict').innerHTML = d ? '<div class="sd-res ' + (d.tone === 'bad' ? 'bad' : d.tone === 'warn' ? 'mid' : 'good') + '"><p>' + e(d.text) + '</p></div>' : '';
  }
  $('#wd-in').addEventListener('input', function (ev) {
    var t = ev.target, id = t.getAttribute('data-i'); if (!id) return;
    if (pending) { mask(false); $('#wd-ask').innerHTML = ''; }
    vals[id] = t.type === 'checkbox' ? t.checked : (t.tagName === 'SELECT' ? (isNaN(+t.value) ? t.value : +t.value) : +t.value);
    var o = $('[data-o="' + id + '"]'); if (o) { var inp = w.inputs.filter(function (i) { return i.id === id; })[0]; o.textContent = WE.HELP.fmt(vals[id], inp.step < 1 ? 1 : 0) + (inp.unit ? ' ' + inp.unit : ''); }
    draw();
  });
  function flip(g) {
    var id = g.getAttribute('data-toggle'); vals[id] = !vals[id]; var cb = $('input[data-i="' + id + '"]'); if (cb) cb.checked = vals[id]; draw();
    var n = $('[data-toggle="' + id + '"]'); if (n) n.focus();
  }
  $('#wd-dia').addEventListener('click', function (ev) { var g = ev.target.closest('[data-toggle]'); if (g) flip(g); });
  $('#wd-dia').addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { var g = ev.target.closest('[data-toggle]'); if (g) { ev.preventDefault(); flip(g); } } });
  $('#wd-reset').addEventListener('click', function () {
    vals = WE.defaults(w);
    sync(); mask(false); $('#wd-story').textContent = ''; $('#wd-ask').innerHTML = '';
    draw();
  });
  $$('[data-preset]').forEach(function (b) {
    b.addEventListener('click', function () {
      var x = (w.presets || []).filter(function (p) { return p.id === b.getAttribute('data-preset'); })[0]; if (!x) return;
      vals = WE.defaults(w); Object.keys(x.values).forEach(function (k) { vals[k] = x.values[k]; }); sync();
      var pc = $('#wd-predict'), ask = $('#wd-ask'), story = $('#wd-story');
      if (pc && pc.checked) {
        var cope = x.tone === 'good'; draw(); mask(true); story.textContent = '';
        ask.innerHTML = '<div class="note-panel"><p><strong>Predict first.</strong> With these settings, will the system cope?</p><p class="actions"><button type="button" class="btn btn-quiet" data-guess="1">Yes, it copes</button><button type="button" class="btn btn-quiet" data-guess="0">No, it struggles</button></p></div>';
        $$('[data-guess]', ask).forEach(function (g) { g.addEventListener('click', function () { var right = (g.getAttribute('data-guess') === '1') === cope; mask(false); ask.innerHTML = '<p class="small"><strong>' + (right ? 'You called it.' : 'Not quite.') + '</strong></p>'; story.textContent = x.story; }); });
      } else { mask(false); ask.innerHTML = ''; draw(); story.textContent = x.label + ': ' + x.story; }
    });
  });
  $('#wd-share').addEventListener('click', function () {
    var url = location.href, done = function () { $('#wd-story').textContent = 'Link copied. It opens with these settings.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { $('#wd-story').textContent = 'Copy this link: ' + url; });
    else $('#wd-story').textContent = 'Copy this link: ' + url;
  });
  sync(); draw();
}
A.addRoute(/^\/widgets(?:\?.*)?$/, indexView);
A.addRoute(/^\/widget\/([a-z0-9-]+)(?:\?.*)?$/, widgetView);
};
