/* MARGA studio: the mastery map, the architecture gallery, the cluster visualiser and terminal replays.
   All of it runs in the browser from data in the page and progress kept on this device. Nothing is sent anywhere. */
window.MargaStudio = function (A) {
'use strict';
var $ = A.$, $$ = A.$$, e = A.e, D = A.D, view = A.view;
function calm() { try { return matchMedia('(prefers-reduced-motion: reduce)').matches || /^(off|reduce)$/.test(document.documentElement.getAttribute('data-a-motion') || ''); } catch (x) { return false; } }
function head(title, lede) { return '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/studio">Studio</a></nav><h1>' + e(title) + '</h1>' + (lede ? '<p class="lede">' + e(lede) + '</p>' : '') + '</section>'; }

/* ================= studio hub ================= */
var HUB = [
  ['#/mastery', 'Mastery map', 'See your strengths and gaps across every skill, from your own quiz results.'],
  ['#/architectures', 'Architecture gallery', 'Reference designs with clickable parts that link to the lessons behind them.'],
  ['#/cluster', 'Cluster visualiser', 'Break a Kubernetes cluster on purpose: fail a node, drain it, scale it, and watch it recover.'],
  ['#/replays', 'Terminal replays', 'Watch real troubleshooting sessions, one command at a time, with the reasoning beside each step.'],
  ['#/tour', 'Take the tour', 'A two-minute walk through the home page, the skill tree and where practice lives.']
];
A.addRoute(/^\/studio$/, function () {
  view.title = 'Studio | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = '<section class="page-head wrap"><h1>Studio</h1><p class="lede">Visual and hands-on ways to learn. All of them work offline and keep your data on this device.</p></section>' +
    '<section class="wrap"><ul class="studio-grid">' + HUB.map(function (h) { return '<li><a class="studio-card" href="' + h[0] + '"><strong>' + e(h[1]) + '</strong><span>' + e(h[2]) + '</span></a></li>'; }).join('') + '</ul></section>';
});

/* ================= mastery map ================= */
function modStats(m) {
  var S = A.state(), n = m.lessons.length, passed = 0, sum = 0, weak = [];
  m.lessons.forEach(function (id) { var r = S.lessons[id]; if (r && r.done) { passed++; sum += (r.best || 0); if ((r.best || 0) < 80) weak.push({ id: id, best: r.best || 0 }); } });
  var avg = passed ? Math.round(sum / passed) : 0, score = n ? Math.round((passed / n) * (avg / 100) * 100) : 0;
  return { id: m.id, title: m.title, n: n, passed: passed, avg: avg, score: score, weak: weak };
}
function band(s) { return s.passed === 0 ? 0 : s.score >= 85 ? 4 : s.score >= 60 ? 3 : s.score >= 30 ? 2 : 1; }
var BAND = ['Not started', 'Getting started', 'Building', 'Strong', 'Mastered'];
function radar(rows) {
  var n = rows.length, cx = 210, cy = 210, R = 140, out = '<svg class="mm-radar" viewBox="-50 0 520 420" role="img" aria-label="Radar chart of mastery across the skills in your path">';
  [25, 50, 75, 100].forEach(function (p) { var pts = []; for (var i = 0; i < n; i++) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; pts.push((cx + Math.cos(a) * R * p / 100).toFixed(1) + ',' + (cy + Math.sin(a) * R * p / 100).toFixed(1)); } out += '<polygon class="mm-ring" points="' + pts.join(' ') + '"/>'; });
  var poly = [];
  rows.forEach(function (r, i) {
    var a = -Math.PI / 2 + i * 2 * Math.PI / n, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R, v = r.score / 100;
    out += '<line class="mm-spoke" x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) + '"/>';
    poly.push((cx + Math.cos(a) * R * v).toFixed(1) + ',' + (cy + Math.sin(a) * R * v).toFixed(1));
    var lx = cx + Math.cos(a) * (R + 16), ly = cy + Math.sin(a) * (R + 16), an = Math.cos(a) > 0.25 ? 'start' : Math.cos(a) < -0.25 ? 'end' : 'middle';
    var lab = r.title.length > 13 ? r.title.slice(0, 12) + '…' : r.title;
    out += '<text class="mm-lab" x="' + lx.toFixed(1) + '" y="' + (ly + 3).toFixed(1) + '" text-anchor="' + an + '">' + e(lab) + '</text>';
  });
  return out + '<polygon class="mm-shape" points="' + poly.join(' ') + '"/></svg>';
}
function dueCards() { var c = A.state().cards || {}, now = Date.now(), n = 0; Object.keys(c).forEach(function (k) { if (c[k] && c[k].due && c[k].due <= now) n++; }); return n; }
A.addRoute(/^\/mastery$/, function () {
  view.title = 'Mastery map | MARGA by EknathaLabs'; view.nav = 'progress';
  var p = A.PATH[A.state().path] || A.LIVE[0];
  var inPath = p.modules.map(function (id) { return A.MOD[id]; }).filter(Boolean).map(modStats);
  var rest = A.MODS.filter(function (m) { return p.modules.indexOf(m.id) < 0; }).map(modStats);
  var any = inPath.concat(rest).some(function (s) { return s.passed > 0; });
  function tile(s) { var b = band(s); return '<li><a class="mm-tile b' + b + '" href="#/module/' + e(s.id) + '" aria-label="' + e(s.title) + ': ' + BAND[b] + ', ' + s.passed + ' of ' + s.n + ' lessons passed' + (s.passed ? ', average best score ' + s.avg + ' percent' : '') + '"><strong>' + e(s.title) + '</strong><span>' + s.passed + '/' + s.n + (s.passed ? ' · ' + s.avg + '%' : '') + '</span><i style="--w:' + (s.n ? Math.round(s.passed / s.n * 100) : 0) + '%"></i></a></li>'; }
  var strong = inPath.filter(function (s) { return s.passed > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
  var weak = []; inPath.concat(rest).forEach(function (s) { s.weak.forEach(function (w) { weak.push(w); }); }); weak.sort(function (a, b) { return a.best - b.best; });
  var gaps = inPath.filter(function (s) { return s.passed === 0; }).slice(0, 4);
  var due = dueCards();
  view.html = head('Mastery map', 'Built from your own quiz results on this device. A tile is darker the more lessons you have passed and the higher your best scores are.') +
    '<section class="wrap mm">' + (any ? '' : '<p class="mm-empty">Nothing here yet. Pass your first lesson check and the map starts to fill in. <a class="btn btn-primary" href="#/path/' + e(p.id) + '">Open the ' + e(p.title) + ' path</a></p>') +
    '<div class="mm-top"><div class="mm-radar-wrap"><h2 class="sub-h">' + e(p.title) + ' path</h2>' + radar(inPath) + '</div>' +
    '<div class="mm-side"><h2 class="sub-h">At a glance</h2><dl class="mm-dl"><div><dt>Strongest</dt><dd>' + (strong.length ? strong.map(function (s) { return '<a href="#/module/' + e(s.id) + '">' + e(s.title) + '</a> ' + s.score + '%'; }).join('<br>') : 'Not enough data yet') + '</dd></div>' +
    '<div><dt>Review these lessons</dt><dd>' + (weak.length ? weak.slice(0, 4).map(function (w) { var l = A.LES[w.id]; return '<a href="' + A.hrefLesson(w.id) + '">' + e(l ? l.title : w.id) + '</a> best ' + w.best + '%'; }).join('<br>') : 'None. Every passed lesson scored 80% or more.') + '</dd></div>' +
    '<div><dt>Not started in this path</dt><dd>' + (gaps.length ? gaps.map(function (s) { return '<a href="#/module/' + e(s.id) + '">' + e(s.title) + '</a>'; }).join('<br>') : 'Every skill in this path has been started.') + '</dd></div>' +
    '<div><dt>Flashcards due</dt><dd>' + due + (due ? ' <a href="#/progress">Review them</a>' : '') + '</dd></div></dl></div></div>' +
    '<h2 class="sub-h">Skills in your path</h2><ul class="mm-grid">' + inPath.map(tile).join('') + '</ul>' +
    '<h2 class="sub-h">Everything else</h2><ul class="mm-grid">' + rest.map(tile).join('') + '</ul>' +
    '<ul class="mm-key" aria-label="Key">' + BAND.map(function (b, i) { return '<li><i class="mm-sw b' + i + '" aria-hidden="true"></i>' + b + '</li>'; }).join('') + '</ul></section>';
});

/* ================= architecture gallery ================= */
A.addRoute(/^\/architectures$/, function () {
  view.title = 'Architecture gallery | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = head('Architecture gallery', 'Reference designs you will meet at work. Open one, select a part to see what it does and how it fails, then follow the link to the lesson behind it.') +
    '<section class="wrap"><ul class="studio-grid">' + (D.gallery || []).map(function (g) { return '<li><a class="studio-card" href="#/architectures/' + e(g.id) + '"><strong>' + e(g.title) + '</strong><span>' + e(g.summary) + '</span><em>' + e(g.level) + '</em></a></li>'; }).join('') + '</ul></section>';
});
A.addRoute(/^\/architectures\/([\w-]+)$/, function (id) {
  var list = D.gallery || [], i = -1; list.forEach(function (g, k) { if (g.id === id) i = k; });
  if (i < 0) { location.replace('#/architectures'); return 'redirect'; }
  var g = list[i], prev = list[i - 1], next = list[i + 1];
  view.title = g.title + ' | Architecture gallery | MARGA'; view.nav = 'practice';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/studio">Studio</a><a href="#/architectures">Architecture gallery</a></nav><h1>' + e(g.title) + '</h1><p class="lede">' + e(g.summary) + '</p></section>' +
    '<section class="wrap ag"><div class="ag-main">' + g.html + '</div><aside class="ag-side">' +
    '<h2 class="sub-h">Learn the parts</h2><ul class="ag-learn">' + g.learn.map(function (l) { var m = A.MOD[l.module]; var nl = (g.diagram.match(new RegExp('node:\\s*' + l.node + '\\s*\\|\\s*([^|]+)')) || [])[1] || l.node; return '<li><strong>' + e(nl.trim()) + '</strong><span>' + e(l.why) + '</span>' + (m ? '<a href="#/module/' + e(m.id) + '">' + e(m.title) + '</a>' : '') + '</li>'; }).join('') + '</ul>' +
    '<h2 class="sub-h">Trade-offs</h2><ul class="ag-list">' + g.tradeoffs.map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ul>' +
    '<h2 class="sub-h">How it breaks</h2><ul class="ag-list warn">' + g.breaks.map(function (t) { return '<li>' + e(t) + '</li>'; }).join('') + '</ul></aside></section>' +
    '<nav class="wrap pager" aria-label="Architecture navigation">' + (prev ? '<a class="btn btn-quiet" href="#/architectures/' + e(prev.id) + '">Previous: ' + e(prev.title) + '</a>' : '<span></span>') + (next ? '<a class="btn btn-quiet" href="#/architectures/' + e(next.id) + '">Next: ' + e(next.title) + '</a>' : '<span></span>') + '</nav>';
});

/* ================= terminal replays ================= */
function mark(line) {
  var m = line.match(/^([!+~])(?=\S)/);
  if (m) return '<span class="xr-' + cls(m[1]) + '">' + e(line.slice(1)) + '</span>';
  m = line.match(/^(.*?\s)([!+~])(?=\S)(.*)$/);
  if (m) return e(m[1]) + '<span class="xr-' + cls(m[2]) + '">' + e(m[3]) + '</span>';
  return e(line);
}
function cls(c) { return c === '!' ? 'bad' : c === '+' ? 'ok' : 'warn'; }
A.addRoute(/^\/replays$/, function () {
  view.title = 'Terminal replays | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = head('Terminal replays', 'Real troubleshooting sessions, replayed one command at a time. Watch, pause, step or scrub, and read why each command comes next. The output is a recording, not a live system.') +
    '<section class="wrap"><ul class="studio-grid">' + (D.replays || []).map(function (r) { var m = A.MOD[r.module]; return '<li><a class="studio-card" href="#/replays/' + e(r.id) + '"><strong>' + e(r.title) + '</strong><span>' + e(r.summary) + '</span><em>' + e(r.level) + ' · ' + r.steps.length + ' steps' + (m ? ' · ' + e(m.title) : '') + '</em></a></li>'; }).join('') + '</ul></section>';
});
var RP = { timer: 0, gen: 0 };
A.addRoute(/^\/replays\/([\w-]+)$/, function (id) {
  var list = D.replays || [], i = -1; list.forEach(function (r, k) { if (r.id === id) i = k; });
  if (i < 0) { location.replace('#/replays'); return 'redirect'; }
  var r = list[i], m = A.MOD[r.module], N = r.steps.length;
  view.title = r.title + ' | Terminal replays | MARGA'; view.nav = 'practice';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/studio">Studio</a><a href="#/replays">Terminal replays</a></nav><h1>' + e(r.title) + '</h1><p class="lede">' + e(r.summary) + '</p></section>' +
    '<section class="wrap xr"><div class="xr-term term" role="region" aria-label="Recorded terminal session"><div class="tbar"><i></i><i></i><i></i><span>' + e(r.title) + '</span></div><div class="tb xr-screen" id="xr-screen" tabindex="0"></div></div>' +
    '<p class="xr-say" id="xr-say" role="status" aria-live="polite"></p>' +
    '<div class="xr-ctl" role="group" aria-label="Replay controls"><button type="button" class="btn btn-primary" id="xr-play" aria-pressed="false">Play</button><button type="button" class="btn btn-quiet" id="xr-back">Back</button><button type="button" class="btn btn-quiet" id="xr-step">Next step</button><button type="button" class="btn btn-quiet" id="xr-restart">Restart</button>' +
    '<label class="xr-speed">Speed <select id="xr-speed"><option value="1.6">0.5x</option><option value="1" selected>1x</option><option value="0.5">2x</option></select></label>' +
    '<label class="xr-scrub">Step <input type="range" id="xr-range" min="0" max="' + N + '" value="0" aria-label="Step in the session"><output id="xr-pos">0 of ' + N + '</output></label></div>' +
    '<div class="xr-end" id="xr-end" hidden><h2 class="sub-h">What to remember</h2><p>' + e(r.takeaway) + '</p>' + (m ? '<p><a class="btn btn-quiet" href="#/module/' + e(m.id) + '">Learn it properly: ' + e(m.title) + '</a> <a class="btn btn-quiet" href="#/replays">More replays</a></p>' : '') + '</div></section>';
  view.after = function () {
    RP.gen++; var gen = RP.gen; clearTimeout(RP.timer);
    var screen = $('#xr-screen'), say = $('#xr-say'), pb = $('#xr-play'), range = $('#xr-range'), pos = $('#xr-pos'), end = $('#xr-end'), speed = $('#xr-speed');
    var cur = 0, playing = false;
    function sp() { return parseFloat(speed.value) || 1; }
    function stepHtml(s, upto) { return '<p class="tl-l"><span class="pr">$</span> <span class="hd-cmd">' + e(upto === undefined ? s.cmd : s.cmd.slice(0, upto)) + '</span></p>'; }
    function outHtml(s, n) { return s.out.slice(0, n).map(function (l) { return '<p class="tl-l">' + mark(l) + '</p>'; }).join(''); }
    function ui() { range.value = cur; pos.textContent = cur + ' of ' + N; end.hidden = cur < N; pb.textContent = playing ? 'Pause' : (cur >= N ? 'Replay' : 'Play'); pb.setAttribute('aria-pressed', String(playing)); }
    function paint(n) {
      var h = ''; for (var k = 0; k < n; k++) h += stepHtml(r.steps[k]) + outHtml(r.steps[k], 99);
      screen.innerHTML = h; screen.scrollTop = screen.scrollHeight; say.textContent = n ? r.steps[n - 1].say : 'Press Play, or Next step, to begin.'; cur = n; ui();
    }
    function alive() { return gen === RP.gen && document.body.contains(screen); }
    function animate(k, done) {
      var s = r.steps[k], base = '', typed = 0;
      for (var q = 0; q < k; q++) base += stepHtml(r.steps[q]) + outHtml(r.steps[q], 99);
      say.textContent = '';
      var fast = calm();
      function typeNext() {
        if (!alive() || !playing) return;
        if (fast || typed >= s.cmd.length) { typed = s.cmd.length; screen.innerHTML = base + stepHtml(s); lines(0); return; }
        typed += 2; screen.innerHTML = base + stepHtml(s, typed); screen.scrollTop = screen.scrollHeight; RP.timer = setTimeout(typeNext, 28 * sp());
      }
      function lines(n) {
        if (!alive() || !playing) return;
        screen.innerHTML = base + stepHtml(s) + outHtml(s, n); screen.scrollTop = screen.scrollHeight;
        if (n < s.out.length) { RP.timer = setTimeout(function () { lines(n + 1); }, (fast ? 0 : 260) * sp()); return; }
        cur = k + 1; say.textContent = s.say; ui();
        RP.timer = setTimeout(done, 2200 * sp());
      }
      typeNext();
    }
    function run() {
      if (!alive()) return; if (!playing) return;
      if (cur >= N) { playing = false; ui(); return; }
      animate(cur, run);
    }
    pb.addEventListener('click', function () { if (playing) { playing = false; clearTimeout(RP.timer); paint(cur); return; } if (cur >= N) cur = 0, paint(0); playing = true; ui(); run(); });
    $('#xr-step').addEventListener('click', function () { playing = false; clearTimeout(RP.timer); paint(Math.min(N, cur + 1)); });
    $('#xr-back').addEventListener('click', function () { playing = false; clearTimeout(RP.timer); paint(Math.max(0, cur - 1)); });
    $('#xr-restart').addEventListener('click', function () { playing = false; clearTimeout(RP.timer); paint(0); });
    range.addEventListener('input', function () { playing = false; clearTimeout(RP.timer); paint(parseInt(range.value, 10) || 0); });
    paint(0);
  };
});

/* ================= cluster visualiser ================= */
var CL = null;
function clFresh() {
  var c = { t: 0, pid: 0, nid: 3, pdb: true, log: [], nodes: [], pods: [], dep: { web: { want: 3, label: 'web' }, api: { want: 3, label: 'api' }, db: { want: 1, label: 'db' } }, timers: [] };
  for (var i = 1; i <= 3; i++) c.nodes.push({ id: 'node-' + i, ready: true, cordon: false, cap: 4 });
  return c;
}
function clLog(msg, kind) { CL.log.unshift({ msg: msg, kind: kind || '' }); if (CL.log.length > 40) CL.log.pop(); }
function clAfter(ms, fn) { var h = setTimeout(function () { if (!CL) return; fn(); clReconcile(); clDraw(); }, calm() ? 0 : ms); CL.timers.push(h); }
function clNode(id) { return CL.nodes.filter(function (n) { return n.id === id; })[0]; }
function clLoad(n) { return CL.pods.filter(function (p) { return p.node === n.id && p.state !== 'Gone'; }).length; }
function clPick() { var best = null; CL.nodes.forEach(function (n) { if (n.ready && !n.cordon && clLoad(n) < n.cap && (!best || clLoad(n) < clLoad(best))) best = n; }); return best; }
function clReconcile() {
  Object.keys(CL.dep).forEach(function (d) {
    var live = CL.pods.filter(function (p) { return p.dep === d && (p.state === 'Running' || p.state === 'Starting' || p.state === 'Pending'); });
    while (live.length < CL.dep[d].want) { var p = { id: 'p' + (++CL.pid), dep: d, name: d + '-' + Math.random().toString(36).slice(2, 7), state: 'Pending', node: null, fresh: true }; CL.pods.push(p); live.push(p); }
    while (live.length > CL.dep[d].want) { var x = live.pop(); x.state = 'Gone'; }
  });
  CL.pods = CL.pods.filter(function (p) { return p.state !== 'Gone'; });
  CL.pods.forEach(function (p) {
    if (p.state === 'Pending' && !p.node) {
      var n = clPick();
      if (n) { p.node = n.id; p.state = 'Starting'; clLog(p.name + ' scheduled on ' + n.id, ''); (function (q) { clAfter(900, function () { if (q.state === 'Starting' && clNode(q.node).ready) { q.state = 'Running'; q.fresh = false; } }); })(p); }
      else if (!p.warned) { p.warned = true; clLog(p.name + ' is Pending: no node has room. Add a node or scale something down.', 'warn'); }
    }
  });
}
function clReady(d) { return CL.pods.filter(function (p) { return p.dep === d && p.state === 'Running' && clNode(p.node).ready; }).length; }
function clDraw() {
  var root = $('#cl'); if (!root) return;
  var webReady = clReady('web'), apiReady = clReady('api'), dbReady = clReady('db'), up = webReady > 0 && apiReady > 0 && dbReady > 0;
  $('#cl-status', root).className = 'cl-status ' + (up ? (webReady < CL.dep.web.want || apiReady < CL.dep.api.want ? 'warn' : 'ok') : 'bad');
  $('#cl-status', root).innerHTML = '<strong>' + (up ? (webReady < CL.dep.web.want || apiReady < CL.dep.api.want ? 'Degraded' : 'All good') : 'Users see errors') + '</strong> Ready: web ' + webReady + '/' + CL.dep.web.want + ', api ' + apiReady + '/' + CL.dep.api.want + ', db ' + dbReady + '/' + CL.dep.db.want;
  $('#cl-nodes', root).innerHTML = CL.nodes.map(function (n) {
    var pods = CL.pods.filter(function (p) { return p.node === n.id; });
    var slots = ''; for (var i = 0; i < n.cap; i++) { var p = pods[i]; slots += p ? '<li class="cl-pod d-' + p.dep + ' s-' + p.state.toLowerCase() + (p.fresh ? ' fresh' : '') + '"><button type="button" data-cl="kill" data-id="' + p.id + '" aria-label="Delete pod ' + e(p.name) + ', ' + p.state + '"><b>' + p.dep + '</b><small>' + p.state + '</small></button></li>' : '<li class="cl-slot" aria-hidden="true"></li>'; }
    return '<div class="cl-node ' + (n.ready ? '' : 'down ') + (n.cordon ? 'cordon' : '') + '" role="group" aria-label="' + n.id + ', ' + (n.ready ? (n.cordon ? 'cordoned' : 'ready') : 'not ready') + '"><div class="cl-nhead"><strong>' + n.id + '</strong><span>' + (n.ready ? (n.cordon ? 'Cordoned' : 'Ready') : 'NotReady') + '</span></div><ul class="cl-slots">' + slots + '</ul>' +
      '<div class="cl-nact">' + (n.ready ? '<button type="button" class="btn btn-quiet" data-cl="fail" data-id="' + n.id + '">Fail node</button><button type="button" class="btn btn-quiet" data-cl="drain" data-id="' + n.id + '"' + (n.cordon ? ' disabled' : '') + '>Drain</button>' : '<button type="button" class="btn btn-quiet" data-cl="recover" data-id="' + n.id + '">Recover</button>') + (n.cordon && n.ready ? '<button type="button" class="btn btn-quiet" data-cl="uncordon" data-id="' + n.id + '">Uncordon</button>' : '') + '</div></div>';
  }).join('');
  var pend = CL.pods.filter(function (p) { return !p.node && p.state === 'Pending'; });
  $('#cl-pend', root).innerHTML = pend.length ? '<strong>Pending (' + pend.length + '): no node has room</strong><ul class="cl-slots">' + pend.map(function (p) { return '<li class="cl-pod d-' + p.dep + ' s-pending"><button type="button" data-cl="kill" data-id="' + p.id + '" aria-label="Delete pending pod ' + e(p.name) + '"><b>' + p.dep + '</b><small>Pending</small></button></li>'; }).join('') + '</ul>' : '';
  $('#cl-deps', root).innerHTML = ['web', 'api', 'db'].map(function (d) { return '<div class="cl-dep d-' + d + '"><strong>' + d + '</strong><button type="button" class="btn btn-quiet" data-cl="dec" data-id="' + d + '" aria-label="Fewer ' + d + ' replicas">-</button><output>' + CL.dep[d].want + '</output><button type="button" class="btn btn-quiet" data-cl="inc" data-id="' + d + '" aria-label="More ' + d + ' replicas">+</button></div>'; }).join('');
  $('#cl-log', root).innerHTML = CL.log.map(function (l) { return '<li class="' + l.kind + '">' + e(l.msg) + '</li>'; }).join('') || '<li>Select a Pod to delete it, or use the buttons on a node.</li>';
  var pb = $('#cl-pdb', root); if (pb) pb.checked = CL.pdb;
  CL.pods.forEach(function (p) { p.fresh = false; });
}
function clDrain(n) {
  n.cordon = true; clLog('Cordoned ' + n.id + ' (no new Pods). Draining: evicting its Pods one at a time.', 'warn'); clDraw();
  function next() {
    if (!CL) return;
    var p = CL.pods.filter(function (q) { return q.node === n.id && (q.state === 'Running' || q.state === 'Starting'); })[0];
    if (!p) { clLog(n.id + ' is drained. You can update it, then Uncordon.', 'ok'); clDraw(); return; }
    if (CL.pdb && p.dep === 'web' && clReady('web') - 1 < 2) { clLog('Eviction of ' + p.name + ' blocked by the PodDisruptionBudget (web needs 2 ready). Waiting for a replacement.', 'warn'); clDraw(); CL.timers.push(setTimeout(next, calm() ? 0 : 1100)); return; }
    p.state = 'Terminating'; clLog('Evicting ' + p.name + ' from ' + n.id, ''); clDraw();
    CL.timers.push(setTimeout(function () { if (!CL) return; p.state = 'Gone'; clReconcile(); clDraw(); CL.timers.push(setTimeout(next, calm() ? 0 : 900)); }, calm() ? 0 : 500));
  }
  next();
}
A.addRoute(/^\/cluster$/, function () {
  view.title = 'Cluster visualiser | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = head('Cluster visualiser', 'A small Kubernetes cluster you can break. Delete a Pod, fail a node, drain it for maintenance or change the replicas, then watch the controller put things right. It is a simplified model for learning, not a real cluster.') +
    '<section class="wrap" id="cl"><div id="cl-status" class="cl-status ok" role="status" aria-live="polite"></div>' +
    '<div class="cl-bar"><button type="button" class="btn btn-quiet" data-cl="addnode">Add a node</button><label class="cl-pdbl"><input type="checkbox" id="cl-pdb" checked> PodDisruptionBudget: keep 2 web Pods ready</label><button type="button" class="btn btn-quiet" data-cl="reset">Reset</button></div>' +
    '<div id="cl-nodes" class="cl-nodes"></div><div id="cl-pend" class="cl-pend"></div><h2 class="sub-h">Replicas wanted</h2><div id="cl-deps" class="cl-deps"></div>' +
    '<h2 class="sub-h">What the cluster is doing</h2><ol id="cl-log" class="cl-log" aria-live="polite"></ol>' +
    '<div class="cl-try"><h2 class="sub-h">Try these</h2><ol><li>Delete one web Pod. The Deployment creates a replacement at once.</li><li>Fail node-1. Pods on it are replaced elsewhere. Real clusters wait about five minutes before doing this; the model shortens it.</li><li>Turn the PodDisruptionBudget off, then drain a node, and watch web drop lower than two.</li><li>Scale web to 12. There is no room: Pods stay Pending until you add a node.</li></ol>' +
    '<p><a class="btn btn-quiet" href="#/module/kubernetes">Kubernetes lessons</a> <a class="btn btn-quiet" href="#/module/k8s-ops">Kubernetes operations</a></p></div></section>';
  view.after = function () {
    if (CL) CL.timers.forEach(clearTimeout);
    CL = clFresh(); CL.nodes.forEach(function (n) { /* seed */ });
    ['web', 'web', 'web', 'api', 'api', 'api', 'db'].forEach(function (d) { var n = clPick(); var p = { id: 'p' + (++CL.pid), dep: d, name: d + '-' + Math.random().toString(36).slice(2, 7), state: 'Running', node: n.id }; CL.pods.push(p); });
    clLog('Cluster ready: 3 nodes, 7 Pods.', 'ok'); clDraw();
  };
});
A.afterRoute(function (h) { if (h !== '/cluster' && CL) { CL.timers.forEach(clearTimeout); CL = null; } if (RP.gen && !/^\/replays\//.test(h)) { RP.gen++; clearTimeout(RP.timer); } });
document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'cl-pdb' && CL) { CL.pdb = ev.target.checked; clLog('PodDisruptionBudget ' + (CL.pdb ? 'on: drains keep 2 web Pods ready.' : 'off: a drain may remove every web Pod.'), ''); clDraw(); } });
document.addEventListener('click', function (ev) {
  var b = ev.target.closest && ev.target.closest('[data-cl]'); if (!b || !CL || !$('#cl')) return;
  var a = b.getAttribute('data-cl'), id = b.getAttribute('data-id'), n;
  if (a === 'kill') { var p = CL.pods.filter(function (q) { return q.id === id; })[0]; if (p && p.state !== 'Terminating') { p.state = 'Terminating'; clLog('You deleted ' + p.name + '. The Deployment will create a replacement.', 'warn'); clDraw(); clAfter(500, function () { p.state = 'Gone'; }); } }
  else if (a === 'fail') { n = clNode(id); n.ready = false; clLog(n.id + ' stopped responding (NotReady). Its Pods become Unknown and are replaced elsewhere.', 'bad'); CL.pods.forEach(function (p) { if (p.node === id && p.state !== 'Gone') p.state = 'Unknown'; }); clDraw(); clAfter(1500, function () { CL.pods.forEach(function (p) { if (p.node === id && p.state === 'Unknown') p.state = 'Gone'; }); }); }
  else if (a === 'recover') { n = clNode(id); n.ready = true; n.cordon = false; clLog(n.id + ' is back and Ready. New Pods can use it.', 'ok'); clReconcile(); clDraw(); }
  else if (a === 'drain') { clDrain(clNode(id)); }
  else if (a === 'uncordon') { n = clNode(id); n.cordon = false; clLog(n.id + ' is schedulable again.', 'ok'); clReconcile(); clDraw(); }
  else if (a === 'addnode') { CL.nid++; CL.nodes.push({ id: 'node-' + CL.nid, ready: true, cordon: false, cap: 4 }); clLog('Added node-' + CL.nid + '. Pending Pods can now be placed.', 'ok'); clReconcile(); clDraw(); }
  else if (a === 'inc' || a === 'dec') { var d = CL.dep[id]; d.want = Math.max(0, Math.min(12, d.want + (a === 'inc' ? 1 : -1))); clLog('Replicas for ' + id + ' set to ' + d.want, ''); clReconcile(); clDraw(); }
  else if (a === 'reset') { var route = A.route; CL.timers.forEach(clearTimeout); CL = null; route(); }
});
};
