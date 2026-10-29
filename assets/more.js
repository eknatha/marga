/* MARGA extras, round 3: glossary with hover cards and "explain like I'm new", daily challenge,
   interview and case of the day, subnet playground, YAML playground, Python playground and animated explainers.
   Registered by app.js after extras.js through the same small API. */
window.MargaMore = function (A) {
'use strict';
var D = A.D, MOD = A.MOD, MODS = A.MODS, view = A.view;
var $ = A.$, $$ = A.$$, e = A.e, plural = A.plural;
var GLOSS = D.glossary || [], CASES = D.cases || [], IV = D.interview || [];
function S() { return A.state(); }
function bag(name) { var s = S(); if (!s[name] || typeof s[name] !== 'object' || Array.isArray(s[name])) s[name] = {}; return s[name]; }
function head(title, lede, extra) { return '<section class="page-head wrap"><h1>' + e(title) + '</h1><p class="lede">' + lede + '</p>' + (extra || '') + '</section>'; }
function sel(id, label, options, cur) {
  return '<label class="field"><span>' + e(label) + '</span><select id="' + id + '">' + options.map(function (o) {
    return '<option value="' + e(o[0]) + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + e(o[1]) + '</option>'; }).join('') + '</select></label>';
}
function modTitle(id) { return MOD[id] ? MOD[id].title : id; }
function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (x) { /* ignore */ } return null; }

/* ---------------------------------------------------------------- dates and picks */
function todayKey() {
  if (window.MARGA_TODAY && /^\d{4}-\d{2}-\d{2}$/.test(window.MARGA_TODAY)) return window.MARGA_TODAY;
  var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dayNum(key) { var p = key.split('-'); return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000); }
function keyOf(num) { var d = new Date(num * 86400000); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0'); }
function pick(key, salt, n) {  /* same answer for everyone on the same day, different between days */
  var h = dayNum(key) * 2654435761 + salt * 40503; h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16;
  return n ? (h >>> 0) % n : 0;
}

/* ---------------------------------------------------------------- glossary */
var G_BY_ID = {}; GLOSS.forEach(function (g) { G_BY_ID[g.id] = g; });
var AUTO_SINGLE = ['daemon', 'inode', 'idempotent', 'systemd', 'cgroup', 'subnet', 'gateway', 'firewall', 'latency', 'bandwidth', 'dockerfile', 'registry', 'helm', 'kubectl', 'etcd', 'taint', 'cardinality', 'histogram', 'postmortem', 'runbook', 'toil', 'drift', 'ingress', 'configmap', 'replicaset', 'deployment', 'prometheus', 'grafana', 'opentelemetry', 'rollback', 'serverless', 'egress', 'kubelet', 'swap', 'shebang', 'glob', 'cron', 'sudo', 'toleration', 'canary'];
var G_RE = null, G_LOOK = {};
function buildGlossRe() {
  var names = [];
  GLOSS.forEach(function (g) {
    var n = g.show, low = n.toLowerCase();
    var auto = /\s/.test(n) || /^[A-Z0-9]{2,6}$/.test(n) || AUTO_SINGLE.indexOf(low) >= 0 || /[a-z][A-Z]/.test(n);
    if (!auto) return;
    names.push(n); G_LOOK[n.toLowerCase()] = g;
    var acr = /^[A-Z0-9]{2,6}$/.test(n);
    g.aliases.forEach(function (a) { if (/^[A-Z0-9]{2,6}$/.test(a) || /\s/.test(a) || a.length > 7 && /^[a-z]+$/.test(a) === false) { names.push(a); G_LOOK[a.toLowerCase()] = g; } });
  });
  names.sort(function (a, b) { return b.length - a.length; });
  var parts = names.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
  G_RE = new RegExp('(^|[^A-Za-z0-9_.\\-/])(' + parts.join('|') + ')(?![A-Za-z0-9_\\-/])', 'g');
}
var SKIP = /^(CODE|PRE|A|H1|H2|H3|H4|BUTTON|TEXTAREA|SELECT|OPTION|INPUT|SCRIPT|STYLE|ABBR|KBD|LABEL|SUMMARY)$/;
function eli() { return store('ea.eli') === '1'; }
function glossApply() {
  var main = $('#main'); if (!main || !GLOSS.length) return;
  if (!G_RE) buildGlossRe();
  var roots = $$('.prose, .case-body, .drill, .iv-a, .arch-body, #arch-body, .lede', main);
  if (!roots.length) return;
  var seen = {}; $$('.gl', main).forEach(function (x) { seen[x.getAttribute('data-g')] = 1; });
  roots.forEach(function (root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) {
      var p = n.parentNode, skip = false;
      while (p && p !== root.parentNode) { if (p.nodeType === 1 && (SKIP.test(p.tagName) || (p.classList && (p.classList.contains('gl') || p.classList.contains('eli-note') || p.classList.contains('copy') || p.classList.contains('voice'))))) { skip = true; break; } p = p.parentNode; }
      if (!skip && n.nodeValue.length > 2) nodes.push(n);
    }
    nodes.forEach(function (tn) {
      var text = tn.nodeValue, last = 0, frag = null; G_RE.lastIndex = 0; var m;
      while ((m = G_RE.exec(text))) {
        var g = G_LOOK[m[2].toLowerCase()]; if (!g || seen[g.id]) continue;
        seen[g.id] = 1;
        if (!frag) frag = document.createDocumentFragment();
        var start = m.index + m[1].length;
        frag.appendChild(document.createTextNode(text.slice(last, start)));
        var sp = document.createElement('span'); sp.className = 'gl'; sp.tabIndex = 0; sp.setAttribute('data-g', g.id); sp.textContent = m[2];
        frag.appendChild(sp); last = start + m[2].length;
        if (eli()) { var note = document.createElement('span'); note.className = 'eli-note'; note.textContent = ' (' + g.plain.replace(/\.$/, '') + ')'; frag.appendChild(note); }
      }
      if (frag) { frag.appendChild(document.createTextNode(text.slice(last))); tn.parentNode.replaceChild(frag, tn); }
    });
  });
}
function eliSync() {
  var on = eli(), main = $('#main'); if (!main) return;
  $$('.eli-note', main).forEach(function (x) { x.parentNode.removeChild(x); });
  if (on) $$('.gl', main).forEach(function (s) {
    var g = G_BY_ID[s.getAttribute('data-g')]; if (!g) return;
    var note = document.createElement('span'); note.className = 'eli-note'; note.textContent = ' (' + g.plain.replace(/\.$/, '') + ')';
    s.parentNode.insertBefore(note, s.nextSibling);
  });
  var cb = $('#eli'); if (cb) cb.checked = on;
}
var ELI_ANCHORS = '.prose, #case-list, #drill-list, #iv-list, #arch-body, #glossary-list';
function eliBar() {
  var main = $('#main'); if (!main || $('#eli-bar')) return;
  var anchor = $(ELI_ANCHORS, main); if (!anchor) return;
  var bar = document.createElement('div'); bar.className = 'eli-bar wrap'; bar.id = 'eli-bar';
  bar.innerHTML = '<label class="eli-l"><input type="checkbox" id="eli"> <b>Explain like I am new</b></label><span class="small">Adds a plain-words note after each technical term. Hover or focus any dotted term for its meaning. <a href="#/glossary">Glossary</a></span>';
  var host = anchor.closest('.wrap') || anchor; host.parentNode.insertBefore(bar, host);
  $('#eli', bar).checked = eli();
  $('#eli', bar).addEventListener('change', function (ev) { store('ea.eli', ev.target.checked ? '1' : '0'); eliSync(); A.toast(ev.target.checked ? 'Plain-words notes are on.' : 'Plain-words notes are off.'); });
}
/* hover card */
var tip = null, tipFor = null, pinned = false;
function showTip(el, pin) {
  var g = G_BY_ID[el.getAttribute('data-g')]; if (!g) return;
  if (!tip) { tip = document.createElement('div'); tip.id = 'gl-tip'; tip.className = 'gl-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
  tipFor = el; pinned = !!pin;
  tip.innerHTML = '<strong>' + e(g.show) + '</strong> <span class="gl-mod">' + e(modTitle(g.module)) + '</span><p class="gl-plain">' + e(g.plain) + '</p><p class="gl-def">' + e(g.def) + '</p><a href="#/glossary/' + e(g.id) + '">Open in glossary</a>';
  el.setAttribute('aria-describedby', 'gl-tip');
  tip.hidden = false; tip.style.display = 'block';
  var r = el.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 16);
  tip.style.width = w + 'px';
  var left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  var below = r.bottom + 8, th = tip.offsetHeight, top = below + th > window.innerHeight - 8 ? Math.max(8, r.top - th - 8) : below;
  tip.style.left = left + 'px'; tip.style.top = top + 'px';
}
function hideTip(force) {
  if (!tip || (pinned && !force)) return;
  tip.style.display = 'none'; pinned = false; if (tipFor) tipFor.removeAttribute('aria-describedby'); tipFor = null;
}
document.addEventListener('mouseover', function (ev) { var g = ev.target.closest && ev.target.closest('.gl'); if (g && !pinned) showTip(g, false); });
document.addEventListener('mouseout', function (ev) { var g = ev.target.closest && ev.target.closest('.gl'); if (g && !pinned && !(ev.relatedTarget && ev.relatedTarget.closest && ev.relatedTarget.closest('#gl-tip'))) hideTip(); });
document.addEventListener('focusin', function (ev) { var g = ev.target.closest && ev.target.closest('.gl'); if (g) showTip(g, false); else if (!(ev.target.closest && ev.target.closest('#gl-tip'))) hideTip(true); });
document.addEventListener('click', function (ev) {
  var g = ev.target.closest && ev.target.closest('.gl');
  if (g) { if (pinned && tipFor === g) hideTip(true); else showTip(g, true); return; }
  if (tip && !(ev.target.closest && ev.target.closest('#gl-tip'))) hideTip(true);
}, true);
document.addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape' && tip && tip.style.display === 'block') { var f = tipFor; hideTip(true); if (f && f.focus) f.focus(); }
  else if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList && ev.target.classList.contains('gl')) { ev.preventDefault(); if (pinned && tipFor === ev.target) hideTip(true); else showTip(ev.target, true); }
});
window.addEventListener('hashchange', function () { hideTip(true); });
window.addEventListener('scroll', function () { if (tip && tip.style.display === 'block' && !pinned) hideTip(); }, { passive: true });

/* glossary page */
var gFilter = { q: '', mod: '' };
function glossItems() {
  var q = gFilter.q.trim().toLowerCase();
  return GLOSS.filter(function (g) {
    if (gFilter.mod && g.module !== gFilter.mod) return false;
    return !q || (g.term + ' ' + g.plain + ' ' + g.def + ' ' + g.aliases.join(' ')).toLowerCase().indexOf(q) >= 0;
  }).sort(function (a, b) { return a.term.toLowerCase() < b.term.toLowerCase() ? -1 : 1; });
}
function glossHtml(items, focusId) {
  if (!items.length) return '<p class="empty">No term matches. Try a shorter word.</p>';
  var letter = '';
  return items.map(function (g) {
    var L = g.term.charAt(0).toUpperCase(), h = L !== letter ? '<h2 class="gl-letter" id="gl-' + L + '">' + L + '</h2>' : ''; letter = L;
    return h + '<article class="gl-entry' + (g.id === focusId ? ' focus' : '') + '" id="g-' + e(g.id) + '"><h3>' + e(g.term) + '</h3>' +
      '<p class="gl-plain"><b>In plain words:</b> ' + e(g.plain) + '</p><p>' + e(g.def) + '</p>' +
      '<p class="small"><a class="chip" href="#/module/' + e(g.module) + '">' + e(modTitle(g.module)) + '</a>' + (g.aliases.length ? ' Also called: ' + e(g.aliases.join(', ')) : '') + '</p></article>';
  }).join('');
}
function glossaryView(id) {
  view.title = 'Glossary | MARGA by EknathaLabs'; view.nav = 'practice';
  gFilter.q = ''; gFilter.mod = '';
  var focus = id && G_BY_ID[id] ? id : '';
  if (focus) gFilter.q = '';
  view.html = head('Glossary', plural(GLOSS.length, 'term') + ' in plain words, with the precise meaning underneath. Terms are also underlined inside lessons, cases and answers.') +
    '<div class="wrap"><div class="actions"></div><div class="iv-filters">' + sel('gl-mod', 'Stage', [['', 'All stages']].concat(MODS.map(function (m) { return [m.id, m.title]; })), '') +
    '<label class="field grow"><span>Search terms</span><input id="gl-q" type="search" placeholder="Search terms and meanings" autocomplete="off"></label></div>' +
    '<p class="small" id="gl-count" role="status"></p></div>' +
    '<div class="wrap narrow"><div id="glossary-list"></div></div>';
  view.voice = '#glossary-list'; view.voiceLabel = 'Glossary';
  view.after = function () {
    function paint() { var it = glossItems(); $('#glossary-list').innerHTML = glossHtml(it, focus); $('#gl-count').textContent = plural(it.length, 'term') + ' shown.'; }
    paint();
    $('#gl-mod').addEventListener('change', function (ev) { gFilter.mod = ev.target.value; focus = ''; paint(); });
    $('#gl-q').addEventListener('input', function (ev) { gFilter.q = ev.target.value; focus = ''; paint(); });
    if (focus) { var el = document.getElementById('g-' + focus); if (el) { try { el.scrollIntoView({ block: 'center' }); } catch (x) { /* ignore */ } } }
  };
}
A.addRoute(/^\/glossary$/, function () { glossaryView(''); });
A.addRoute(/^\/glossary\/([\w-]+)$/, glossaryView);

/* ---------------------------------------------------------------- daily challenge, interview and case of the day */
function dailyPool() {
  var out = [];
  MODS.forEach(function (m) { (m.lessons || []).forEach(function (id) { var l = A.LES[id]; if (l) l.quiz.forEach(function (q, i) { out.push({ lesson: id, i: i, q: q }); }); }); });
  return out;
}
var POOL = null;
function dailyOf(key) { if (!POOL) POOL = dailyPool(); return POOL.length ? POOL[pick(key, 1, POOL.length)] : null; }
function dailyStreak() {
  var dc = bag('dc'), key = todayKey(), n = dayNum(key), cur = 0, best = 0, run = 0, k;
  var days = Object.keys(dc).map(dayNum).sort(function (a, b) { return a - b; });
  days.forEach(function (d, i) { run = i && d === days[i - 1] + 1 ? run + 1 : 1; if (run > best) best = run; });
  var start = dc[key] ? n : (dc[keyOf(n - 1)] ? n - 1 : null);
  if (start !== null) { for (k = start; dc[keyOf(k)]; k--) cur++; }
  return { cur: cur, best: best, total: Object.keys(dc).length, right: Object.keys(dc).filter(function (x) { return dc[x].ok; }).length };
}
function dailyCard(key, compact) {
  var d = dailyOf(key); if (!d) return '';
  var dc = bag('dc'), done = dc[key];
  var opts = d.q.options.map(function (o, i) {
    var cls = done ? (i === d.q.answer ? ' good' : (i === done.pick ? ' bad' : '')) : '';
    return '<label class="opt-r' + cls + '"><input type="radio" name="dc-o" value="' + i + '"' + (done ? ' disabled' : '') + (done && done.pick === i ? ' checked' : '') + '> <span>' + e(o) + '</span></label>';
  }).join('');
  return '<fieldset class="drill-q daily-q"><legend>' + e(d.q.q) + '</legend>' + opts + '</fieldset>' +
    (done ? '<div class="drill-res ' + (done.ok ? 'ok' : 'no') + '" role="status"><p><strong>' + (done.ok ? 'Correct.' : 'Not quite.') + '</strong> ' + e(d.q.why) + '</p><p class="small">From the lesson <a href="' + A.hrefLesson(d.lesson) + '">' + e(A.LES[d.lesson].title) + '</a>.</p></div>'
      : '<div class="actions"><button type="button" class="btn btn-primary" data-act="daily-check">Check answer</button></div><div class="drill-res" id="dc-res" hidden></div>');
}
function dailyView() {
  view.title = 'Daily challenge | MARGA by EknathaLabs'; view.nav = 'practice';
  var key = todayKey(), st = dailyStreak(), dc = bag('dc'), n = dayNum(key), dots = '';
  for (var i = 13; i >= 0; i--) { var k = keyOf(n - i), r = dc[k]; dots += '<li class="dd ' + (r ? (r.ok ? 'ok' : 'no') : '') + '" title="' + k + (r ? (r.ok ? ': correct' : ': answered') : ': not played') + '"><span class="sr">' + k + (r ? (r.ok ? ' correct' : ' answered') : ' not played') + '</span></li>'; }
  view.html = head('Daily challenge', 'One question a day, the same for everyone on the same date. Answer it to keep your daily streak going.',
    '<dl class="today dc-stats"><div><dt>Daily streak</dt><dd id="dc-cur">' + st.cur + '</dd></div><div><dt>Best streak</dt><dd>' + st.best + '</dd></div><div><dt>Answered</dt><dd>' + st.total + '</dd></div><div><dt>Correct</dt><dd>' + st.right + '</dd></div></dl>') +
    '<div class="wrap narrow"><article class="drill daily" id="daily-card"><h2 class="sub-h">Today, ' + key + '</h2><div id="daily-body">' + dailyCard(key) + '</div></article>' +
    '<h2 class="sub-h">Last 14 days</h2><ul class="dd-row" aria-label="Last 14 days">' + dots + '</ul>' +
    '<p class="actions"><a class="btn btn-quiet" href="#/today">See the interview and case of the day</a></p></div>';
  view.after = null;
}
A.addRoute(/^\/daily$/, dailyView);
A.onAct('daily-check', function () {
  var key = todayKey(), d = dailyOf(key), r = $('input[name=dc-o]:checked');
  if (!d) return;
  if (!r) { A.toast('Choose an answer first.'); return; }
  var dc = bag('dc'); if (dc[key]) return;
  var p = Number(r.value); dc[key] = { ok: p === d.q.answer, pick: p, lesson: d.lesson };
  A.markActive(); A.save(); A.renderChrome(); A.setNav(view.nav);
  $('#daily-body').innerHTML = dailyCard(key);
  var st = dailyStreak(); var c = $('#dc-cur'); if (c) c.textContent = st.cur;
  var res = $('#daily-body .drill-res'); if (res) res.setAttribute('tabindex', '-1');
});

function ivOfDay(key) { return IV.length ? IV[pick(key, 2, IV.length)] : null; }
function caseOfDay(key) { return CASES.length ? CASES[pick(key, 3, CASES.length)] : null; }
function caseSummary(c) {
  return '<article class="case today-case"><h3><a href="#/cases/' + e(c.id) + '">' + e(c.title) + '</a></h3><p class="small">' + e(c.company) + ', ' + c.year + '. ' + e(c.area) + '</p>' +
    '<p>' + e(c.what) + '</p><p class="case-lesson"><b>Lesson:</b> ' + e(c.lesson) + '</p><p class="actions"><a class="btn btn-quiet" href="#/cases/' + e(c.id) + '">Read the full case</a> <a class="btn btn-quiet" href="' + e(c.source.u) + '" target="_blank" rel="noopener noreferrer">Original report</a></p></article>';
}
function todayView() {
  view.title = 'Today | MARGA by EknathaLabs'; view.nav = 'practice';
  var key = todayKey(), x = ivOfDay(key), c = caseOfDay(key), st = dailyStreak();
  view.html = head('Today, ' + key, 'A new interview question, a real incident and a daily quiz question every day. Everyone sees the same ones on the same date.') +
    '<div class="wrap narrow"><h2 class="sub-h">Interview of the day</h2><div id="iv-list">' + (x ? A.ivListHtml([x]) : '') + '</div>' +
    '<h2 class="sub-h">Case of the day</h2>' + (c ? caseSummary(c) : '') +
    '<h2 class="sub-h">Daily challenge</h2><p>' + (bag('dc')[key] ? 'You have answered today. Daily streak: ' + st.cur + '.' : 'One question from the lessons. Daily streak: ' + st.cur + '.') + '</p>' +
    '<p class="actions"><a class="btn btn-primary" href="#/daily">' + (bag('dc')[key] ? 'See your answer' : 'Take today\'s challenge') + '</a></p></div>';
  view.voice = '#iv-list'; view.voiceLabel = 'Interview of the day';
  view.after = function () { A.wireSay($('#iv-list')); };
}
A.addRoute(/^\/today$/, todayView);

/* home page: the Today strip, built by the landing page */
function todayStrip() {
  var key = todayKey(), x = ivOfDay(key), c = caseOfDay(key), st = dailyStreak(), done = !!bag('dc')[key];
  return '<section class="band alt" id="today-band"><div class="wrap"><div class="band-head"><h2>Today</h2><p>New every day, the same for everyone. Two minutes is enough. <a href="#/today">Open Today</a></p></div><ul class="prac">' +
    '<li><a href="#/daily"><strong>Daily challenge</strong><span>' + (done ? 'Answered today. Come back tomorrow.' : 'One quiz question from the lessons.') + '</span><em>Daily streak ' + st.cur + '</em></a></li>' +
    (x ? '<li><a href="#/interview/' + e(x.id) + '"><strong>Interview of the day</strong><span>' + e(x.q) + '</span><em>' + e(modTitle(x.module)) + '</em></a></li>' : '') +
    (c ? '<li><a href="#/cases/' + e(c.id) + '"><strong>Case of the day</strong><span>' + e(c.title) + ' (' + e(c.company) + ', ' + c.year + ')</span><em>Real incident</em></a></li>' : '') + '</ul></div></section>';
}
A.todayStrip = todayStrip;

/* ---------------------------------------------------------------- placement check */
var PL = null;
function plBuild() {
  var p = A.PATH[S().path] || A.LIVE[0], mods = p.modules.slice(0, 5), qs = [];
  mods.forEach(function (mid) {
    var l = A.LES[MOD[mid].lessons[0]];
    A.shuffle(l.quiz).slice(0, 2).forEach(function (q) { qs.push({ q: q, mod: mid }); });
  });
  return { p: p, mods: mods, qs: qs, pos: 0, right: {} };
}
function placementView() {
  view.title = 'Placement check | MARGA by EknathaLabs'; view.nav = 'paths';
  PL = plBuild();
  view.html = head('Placement check', 'Ten questions, two from the start of each of the first five stages of your path. It suggests where to begin. It is a guide, not a certificate, and it does not unlock anything.') +
    '<div class="wrap narrow"><p class="small">Path: <strong>' + e(PL.p.title) + '</strong>. You can change the path on the <a href="#/">home page</a>.</p><div id="pl" class="check"></div></div>';
  view.after = plAsk;
}
A.addRoute(/^\/placement$/, placementView);
function plAsk() {
  var root = $('#pl'); if (!root || !PL) return;
  if (PL.pos >= PL.qs.length) return plDone(root);
  var it = PL.qs[PL.pos], q = it.q, opts = A.shuffle(q.options.map(function (o, oi) { return { o: o, oi: oi }; }));
  root.innerHTML = '<div class="qprog" aria-hidden="true"><i style="width:' + (PL.pos / PL.qs.length * 100) + '%"></i></div><p class="qcount">Question ' + (PL.pos + 1) + ' of ' + PL.qs.length + '</p>' +
    '<h2 class="qtext">' + e(q.q) + '</h2><div class="opts" role="group" aria-label="Answer choices">' + opts.map(function (x, k) {
      return '<button type="button" class="opt" data-oi="' + x.oi + '"><span class="key">' + String.fromCharCode(65 + k) + '</span><span>' + e(x.o) + '</span></button>'; }).join('') + '</div><div class="feedback" id="pl-fb" aria-live="polite"></div>';
  $$('.opt', root).forEach(function (b) {
    b.addEventListener('click', function () {
      var ok = Number(b.getAttribute('data-oi')) === q.answer;
      if (ok) PL.right[it.mod] = (PL.right[it.mod] || 0) + 1;
      $$('.opt', root).forEach(function (x) { x.disabled = true; if (Number(x.getAttribute('data-oi')) === q.answer) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      var last = PL.pos === PL.qs.length - 1;
      $('#pl-fb', root).innerHTML = '<p class="' + (ok ? 'ok' : 'bad') + '"><strong>' + (ok ? 'Correct.' : 'Not quite.') + '</strong> ' + e(q.why) + '</p><button class="btn btn-primary" type="button" id="pl-next">' + (last ? 'See result' : 'Next question') + '</button>';
      var nb = $('#pl-next', root); nb.focus();
      nb.addEventListener('click', function () { PL.pos++; plAsk(); });
    });
  });
}
function plDone(root) {
  var total = 0, start = -1;
  PL.mods.forEach(function (mid, i) { var r = PL.right[mid] || 0; total += r; if (start < 0 && r < 2) start = i; });
  var rec = start < 0 ? null : MOD[PL.mods[start]];
  var msg = rec
    ? 'Suggested starting point: <strong>' + e(rec.title) + '</strong> (stage ' + (start + 1) + ' of ' + PL.p.modules.length + '). ' + (start === 0 ? 'Begin at the first stage.' : 'The earlier stages looked solid. You can still skim them from the stage pages.')
    : 'You answered every question correctly. Start with <strong>' + e(MOD[PL.p.modules[Math.min(5, PL.p.modules.length - 1)]].title) + '</strong>, or revisit anything from the earlier stages.';
  root.innerHTML = '<div class="result ' + (rec ? 'fail' : 'pass') + '"><h2>' + total + ' of ' + PL.qs.length + ' correct</h2><p>' + msg + '</p>' +
    '<p class="small">Stages open when the stages they depend on are passed, so you still pass each lesson check in order. This result is not saved.</p>' +
    '<ul class="pl-res">' + PL.mods.map(function (mid) { return '<li><a href="#/module/' + e(mid) + '">' + e(modTitle(mid)) + '</a><span>' + (PL.right[mid] || 0) + ' of 2</span></li>'; }).join('') + '</ul>' +
    '<div class="actions">' + (rec ? '<a class="btn btn-primary" href="#/module/' + e(rec.id) + '">Open ' + e(rec.title) + '</a>' : '<a class="btn btn-primary" href="#/path/' + e(PL.p.id) + '">Open the path</a>') + '<button class="btn btn-quiet" type="button" id="pl-again">Take it again</button></div></div>';
  $('#pl-again', root).addEventListener('click', function () { PL = plBuild(); plAsk(); });
}

/* ---------------------------------------------------------------- subnet and CIDR playground */
var NET = window.MargaNet;
function kvRows(rows) { return '<dl class="calc-out">' + rows.map(function (r) { return '<div class="calc-row"><dt>' + e(r[0]) + '</dt><dd>' + e(r[1]) + '</dd></div>'; }).join('') + '</dl>'; }
function fmtN(n) { return Number(n).toLocaleString('en-US'); }
function subnetBits(i) {
  var m = i.maskBin.replace(/\./g, ''), b = i.ipBin.replace(/\./g, ''), out = '';
  for (var k = 0; k < 32; k++) { if (k && k % 8 === 0) out += '<i>.</i>'; out += '<span class="' + (k < i.prefix ? 'nb' : 'hb') + '">' + b.charAt(k) + '</span>'; }
  return '<p class="sn-bits" aria-label="Address in binary: ' + i.prefix + ' network bits, ' + (32 - i.prefix) + ' host bits">' + out + '</p><p class="small">Blue bits are the network part (' + i.prefix + ' bits). Grey bits are the host part (' + (32 - i.prefix) + ' bits).</p>';
}
function subnetView() {
  view.title = 'Subnet and CIDR playground | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = head('Subnet and CIDR playground', 'Work out network ranges, split a network, check whether an address belongs, plan subnets for a VPC and merge routes. Everything runs in your browser.') +
    '<div class="wrap narrow sn">' +
    '<section class="calc" id="sn-inspect"><h2>Inspect a network</h2><div class="calc-in"><label class="field calc-f"><span>Address with prefix</span><input id="sn-a" type="text" value="192.168.10.130/26" autocomplete="off" spellcheck="false" inputmode="text"></label></div><div id="sn-a-out" aria-live="polite"></div></section>' +
    '<section class="calc" id="sn-split"><h2>Split into smaller subnets</h2><div class="calc-in"><label class="field calc-f"><span>Network</span><input id="sn-s" type="text" value="10.0.0.0/16" autocomplete="off" spellcheck="false"></label>' +
    '<label class="field calc-f"><span>New prefix length</span><input id="sn-sp" type="number" min="1" max="32" value="20"></label></div><div id="sn-s-out" aria-live="polite"></div></section>' +
    '<section class="calc" id="sn-check"><h2>Does it belong, do they overlap?</h2><div class="calc-in"><label class="field calc-f"><span>Network</span><input id="sn-c1" type="text" value="10.0.0.0/24" autocomplete="off" spellcheck="false"></label>' +
    '<label class="field calc-f"><span>Address or second network</span><input id="sn-c2" type="text" value="10.0.0.200" autocomplete="off" spellcheck="false"></label></div><div id="sn-c-out" aria-live="polite"></div></section>' +
    '<section class="calc" id="sn-vlsm"><h2>Plan subnets (VLSM)</h2><p class="small">One subnet per line as name, hosts needed. Subnets are placed largest first so nothing overlaps.</p>' +
    '<div class="calc-in"><label class="field calc-f"><span>Parent network</span><input id="sn-v" type="text" value="10.20.0.0/22" autocomplete="off" spellcheck="false"></label>' +
    '<label class="field calc-f wide"><span>Subnets</span><textarea id="sn-vl" rows="5" spellcheck="false">web, 200\napp, 120\ndatabase, 30\nmanagement, 10</textarea></label></div>' +
    '<label class="opt-r"><input type="checkbox" id="sn-cloud" checked> <span>Cloud rules: AWS and Azure keep 5 addresses in every subnet</span></label><div id="sn-v-out" aria-live="polite"></div></section>' +
    '<section class="calc" id="sn-sum"><h2>Summarise routes</h2><p class="small">One network per line. Adjacent blocks merge into the smallest list that covers exactly the same addresses.</p>' +
    '<div class="calc-in"><label class="field calc-f wide"><span>Networks</span><textarea id="sn-m" rows="5" spellcheck="false">10.0.0.0/24\n10.0.1.0/24\n10.0.2.0/24\n10.0.3.0/24\n10.0.8.0/24</textarea></label></div><div id="sn-m-out" aria-live="polite"></div></section>' +
    '<section class="note-panel"><h3>Remember</h3><ul><li>A /24 holds 256 addresses, 254 usable. Each step down in prefix doubles the size.</li><li>The first address is the network and the last is the broadcast. A /31 is allowed for point-to-point links and a /32 is one host.</li><li>Private ranges: 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16.</li></ul></section></div>';
  view.after = subnetWire;
}
function subnetWire() {
  function bad(msg) { return '<p class="calc-err" role="alert">' + e(msg) + '</p>'; }
  function a() {
    var v = $('#sn-a').value, i = NET.info(v), o = $('#sn-a-out');
    if (!i) { o.innerHTML = bad('Enter an address with a prefix, such as 192.168.10.130/26.'); return; }
    o.innerHTML = kvRows([['Network', i.network + '/' + i.prefix], ['Netmask', i.mask], ['Wildcard mask', i.wildcard], ['Broadcast', i.broadcast], ['Usable range', i.first + ' to ' + i.last], ['Usable hosts', fmtN(i.hosts)], ['Total addresses', fmtN(i.total)], ['Type', i.kind]]) + subnetBits(i);
  }
  function s() {
    var i = NET.info($('#sn-s').value), np = parseInt($('#sn-sp').value, 10), o = $('#sn-s-out');
    if (!i) { o.innerHTML = bad('Enter a network such as 10.0.0.0/16.'); return; }
    var r = NET.split(i.network + '/' + i.prefix, np);
    if (!r) { o.innerHTML = bad('The new prefix must be between ' + i.prefix + ' and 32.'); return; }
    var per = np === 32 ? 1 : np === 31 ? 2 : Math.pow(2, 32 - np) - 2;
    o.innerHTML = '<p>' + fmtN(r.count) + ' subnets of ' + fmtN(Math.pow(2, 32 - np)) + ' addresses (' + fmtN(per) + ' usable each).</p><ul class="sn-list">' + r.subnets.map(function (x) { return '<li><code>' + e(x) + '</code></li>'; }).join('') + '</ul>' + (r.truncated ? '<p class="small">Showing the first 256.</p>' : '');
  }
  function c() {
    var n1 = NET.info($('#sn-c1').value), v2 = $('#sn-c2').value.trim(), o = $('#sn-c-out');
    if (!n1) { o.innerHTML = bad('Enter the first network, such as 10.0.0.0/24.'); return; }
    if (v2.indexOf('/') >= 0) {
      var n2 = NET.info(v2); if (!n2) { o.innerHTML = bad('The second value is not a valid network.'); return; }
      var ov = NET.overlap(n1.cidr, n2.cidr), inside = NET.contains(n1.cidr, n2.network) && NET.contains(n1.cidr, n2.broadcast), outside = NET.contains(n2.cidr, n1.network) && NET.contains(n2.cidr, n1.broadcast);
      o.innerHTML = '<p class="calc-big ' + (ov ? 'no' : 'ok') + '">' + (ov ? 'They overlap.' : 'They do not overlap.') + '</p><p>' + e(n1.cidr) + ' and ' + e(n2.cidr) + (inside ? ': the second is inside the first.' : outside ? ': the first is inside the second.' : ov ? ': they share some addresses.' : '.') + '</p>';
    } else {
      var ip = NET.parseIp(v2); if (ip === null) { o.innerHTML = bad('Enter an address like 10.0.0.200 or a network like 10.0.1.0/24.'); return; }
      var ins = NET.contains(n1.cidr, v2);
      o.innerHTML = '<p class="calc-big ' + (ins ? 'ok' : 'no') + '">' + (ins ? 'Yes, it is inside ' : 'No, it is outside ') + e(n1.cidr) + '.</p><p>' + e(n1.cidr) + ' covers ' + e(n1.network) + ' to ' + e(n1.broadcast) + '.</p>';
    }
  }
  function v() {
    var o = $('#sn-v-out'), cloud = $('#sn-cloud').checked, needs = [];
    $('#sn-vl').value.split('\n').forEach(function (ln) {
      ln = ln.trim(); if (!ln) return;
      var p = ln.split(/[,;\t]+|\s{2,}/), h = parseInt(p[p.length - 1], 10);
      needs.push({ name: p.length > 1 ? p.slice(0, -1).join(' ').trim() : '', hosts: isNaN(h) ? 0 : h + (cloud ? 3 : 0), want: isNaN(h) ? 0 : h });
    });
    if (!needs.length) { o.innerHTML = bad('Add at least one subnet, such as web, 200.'); return; }
    var r = NET.vlsm($('#sn-v').value, needs);
    if (r.error) { o.innerHTML = bad(r.error); return; }
    o.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subnet</th><th>Network</th><th>Range</th><th>Needed</th><th>Usable</th></tr></thead><tbody>' + r.subnets.map(function (x) {
      return '<tr><th scope="row">' + e(x.name) + '</th><td><code>' + e(x.cidr) + '</code></td><td>' + e(x.first) + ' to ' + e(x.last) + '</td><td>' + fmtN(x.wanted - (cloud ? 3 : 0)) + '</td><td>' + fmtN(x.hosts - (cloud ? 3 : 0)) + '</td></tr>'; }).join('') + '</tbody></table></div><p>Addresses used: ' + fmtN(r.used) + '. Still free in the parent: ' + fmtN(r.free) + '.</p>';
  }
  function m() {
    var o = $('#sn-m-out'), list = $('#sn-m').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    if (!list.length) { o.innerHTML = bad('Add at least one network.'); return; }
    var r = NET.summarize(list); if (!r) { o.innerHTML = bad('One of the lines is not a valid network.'); return; }
    o.innerHTML = '<p>' + plural(list.length, 'network') + ' became ' + plural(r.length, 'route') + ':</p><ul class="sn-list">' + r.map(function (x) { return '<li><code>' + e(x) + '</code></li>'; }).join('') + '</ul>';
  }
  [['sn-a', a], ['sn-s', s], ['sn-sp', s], ['sn-c1', c], ['sn-c2', c], ['sn-v', v], ['sn-vl', v], ['sn-cloud', v], ['sn-m', m]].forEach(function (p) {
    var el = $('#' + p[0]); el.addEventListener(p[0] === 'sn-cloud' ? 'change' : 'input', p[1]);
  });
  a(); s(); c(); v(); m();
}
A.addRoute(/^\/subnet$/, subnetView);

/* ---------------------------------------------------------------- YAML playground */
var YAML_SAMPLES = {
  good: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\n  labels:\n    app: web\nspec:\n  replicas: 3\n  selector:\n    matchLabels:\n      app: web\n  template:\n    metadata:\n      labels:\n        app: web\n    spec:\n      containers:\n        - name: web\n          image: nginx:1.27\n          ports:\n            - containerPort: 80\n          resources:\n            requests:\n              cpu: 100m\n              memory: 128Mi\n            limits:\n              memory: 256Mi\n          readinessProbe:\n            httpGet:\n              path: /\n              port: 80\n          securityContext:\n            runAsNonRoot: true\n',
  risky: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: api\n  template:\n    metadata:\n      labels:\n        app: backend\n    spec:\n      hostNetwork: true\n      containers:\n        - name: api\n          image: myorg/api:latest\n          securityContext:\n            privileged: true\n',
  broken: 'apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: settings\ndata:\n  mode: fast\n  mode: slow\n  items: [a, b\n',
  json: '{"service": "billing", "replicas": 2, "ports": [80, 443], "env": {"LOG_LEVEL": "info"}}'
};
function yamlView() {
  view.title = 'YAML playground | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = head('YAML playground', 'Paste YAML or a Kubernetes manifest. The page finds syntax errors with the line number, converts to JSON and flags common risks. Nothing leaves your browser.') +
    '<div class="wrap narrow yp"><div class="actions" role="group" aria-label="Samples"><span class="small">Try a sample:</span> ' +
    '<button type="button" class="btn btn-quiet" data-act="yaml-sample" data-s="good">Good Deployment</button><button type="button" class="btn btn-quiet" data-act="yaml-sample" data-s="risky">Risky Deployment</button><button type="button" class="btn btn-quiet" data-act="yaml-sample" data-s="broken">Broken YAML</button><button type="button" class="btn btn-quiet" data-act="yaml-sample" data-s="json">JSON to YAML</button></div>' +
    '<label class="field"><span>YAML or JSON</span><textarea id="yp-in" class="editor" rows="18" spellcheck="false" autocomplete="off" autocapitalize="off" aria-describedby="yp-hint"></textarea></label><p class="small" id="yp-hint">Checks run as you type. Several documents separated by --- are supported.</p>' +
    '<div class="actions"><button type="button" class="btn btn-primary" data-act="yaml-format">Format as YAML</button><button type="button" class="btn btn-quiet" data-act="yaml-json">Convert to JSON</button><button type="button" class="btn btn-quiet" data-act="yaml-copy">Copy result</button></div>' +
    '<div id="yp-status" role="status" aria-live="polite"></div><div id="yp-lint"></div><pre class="evidence" id="yp-out" tabindex="0" aria-label="Result" hidden><code></code></pre>' +
    '<div id="yx"></div><section class="note-panel"><h3>Common YAML mistakes</h3><ul><li>Tabs instead of spaces. YAML only allows spaces for indentation.</li><li>A key written twice. The second silently wins in some tools, so this tool reports it.</li><li>Unquoted values that look like something else, such as 1.10, 08, or yes and no in older parsers. Quote them when they must be text.</li><li>A list item that is not aligned with its siblings.</li></ul></section></div>';
  view.after = function () { yamlWire(); if (A.yamlExercises) A.yamlExercises(); };
}
function ypLoad(text) {
  var docs, y = window.jsyaml;
  if (!y) return { error: { reason: 'The YAML library did not load. Reload the page.', line: 1 } };
  try { docs = y.loadAll(text); } catch (err) { return { error: { reason: (err.reason || err.message || 'Invalid YAML'), line: err.mark ? err.mark.line + 1 : 1, col: err.mark ? err.mark.column + 1 : 1 } }; }
  return { docs: docs.filter(function (d, i) { return !(d === null && docs.length > 1 && i === docs.length - 1); }) };
}
function ypLint(doc, idx) {
  var out = [], w = 'Document ' + (idx + 1) + ': ';
  function add(level, msg) { out.push({ level: level, msg: w + msg }); }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return out;
  var isK8s = doc.apiVersion || doc.kind;
  if (!isK8s) return out;
  if (!doc.apiVersion) add('error', 'apiVersion is missing.');
  if (!doc.kind) add('error', 'kind is missing.');
  if (!doc.metadata || !doc.metadata.name) { if (!(doc.metadata && doc.metadata.generateName)) add('error', 'metadata.name is missing.'); }
  var kind = doc.kind, spec = doc.spec || {}, tpl = null;
  if (/^(Deployment|StatefulSet|DaemonSet|ReplicaSet|Job)$/.test(kind)) tpl = spec.template;
  else if (kind === 'CronJob') tpl = spec.jobTemplate && spec.jobTemplate.spec && spec.jobTemplate.spec.template;
  else if (kind === 'Pod') tpl = { spec: spec, metadata: doc.metadata };
  if (/^(Deployment|StatefulSet|DaemonSet|ReplicaSet)$/.test(kind)) {
    var ml = spec.selector && spec.selector.matchLabels, tl = tpl && tpl.metadata && tpl.metadata.labels;
    if (!ml) add('error', 'spec.selector.matchLabels is missing.');
    else if (!tl) add('error', 'spec.template.metadata.labels is missing, so the selector matches no pods.');
    else Object.keys(ml).forEach(function (k) { if (tl[k] !== ml[k]) add('error', 'selector label ' + k + '=' + ml[k] + ' does not match the pod template label (' + k + '=' + tl[k] + '). The Deployment would match no pods.'); });
    if (kind === 'Deployment' && spec.replicas === 1) add('info', 'replicas is 1, so there is no redundancy during a node failure or rollout.');
  }
  if (tpl && tpl.spec) {
    var ps = tpl.spec;
    if (ps.hostNetwork) add('warn', 'hostNetwork is true: the pod shares the node network and can see its traffic.');
    if (ps.hostPID) add('warn', 'hostPID is true: the pod can see every process on the node.');
    (ps.containers || []).forEach(function (c) {
      var n = 'container "' + (c.name || '?') + '": ';
      if (!c.image) { add('error', n + 'image is missing.'); return; }
      var tag = String(c.image).split('@')[0].split('/').pop();
      if (String(c.image).indexOf('@sha256:') < 0) { if (tag.indexOf(':') < 0) add('warn', n + 'image has no tag, which means latest. Pin a version.'); else if (/:latest$/.test(tag)) add('warn', n + 'image uses :latest, so deployments are not repeatable. Pin a version.'); }
      if (c.securityContext && c.securityContext.privileged) add('warn', n + 'privileged is true: it has almost full access to the node.');
      if (!c.resources || !(c.resources.limits || c.resources.requests)) add('warn', n + 'no resource requests or limits, so the scheduler cannot place it well and one pod can starve others.');
      else if (!(c.resources.limits && c.resources.limits.memory)) add('info', n + 'no memory limit. A leak can take down the node.');
      if (!c.readinessProbe) add('info', n + 'no readinessProbe, so traffic may reach it before it is ready.');
      if (!(c.securityContext && c.securityContext.runAsNonRoot) && !(ps.securityContext && ps.securityContext.runAsNonRoot)) add('info', n + 'runAsNonRoot is not set.');
    });
    if (!(ps.containers && ps.containers.length)) add('error', 'the pod spec has no containers.');
  } else if (tpl === undefined && /^(Deployment|StatefulSet|DaemonSet|ReplicaSet|Job)$/.test(kind)) add('error', 'spec.template is missing.');
  if (kind === 'Service' && !spec.selector && spec.type !== 'ExternalName') add('warn', 'the Service has no selector, so it will not route to any pods.');
  if (kind === 'Secret' && doc.stringData) add('warn', 'stringData holds secrets in plain text in this file. Do not keep real secrets in files that others can read.');
  return out;
}
var ypLast = '';
function yamlWire() {
  var inp = $('#yp-in'); inp.value = store('ea.yp') || YAML_SAMPLES.good;
  function run() {
    var text = inp.value; store('ea.yp', text.length < 200000 ? text : null);
    var st = $('#yp-status'), li = $('#yp-lint'), out = $('#yp-out'); out.hidden = true;
    if (!text.trim()) { st.innerHTML = '<p class="calc-err">Nothing to check yet. Paste some YAML.</p>'; li.innerHTML = ''; return; }
    var r = ypLoad(text);
    if (r.error) {
      var lines = text.split('\n'), ln = r.error.line, ctx = '';
      for (var i = Math.max(1, ln - 1); i <= Math.min(lines.length, ln + 1); i++) ctx += (i === ln ? '> ' : '  ') + String(i).padStart(3) + ' | ' + lines[i - 1] + '\n';
      st.innerHTML = '<div class="drill-res no"><p><strong>Invalid YAML.</strong> Line ' + ln + (r.error.col ? ', column ' + r.error.col : '') + ': ' + e(r.error.reason) + '</p><pre class="evidence"><code>' + e(ctx) + '</code></pre></div>'; li.innerHTML = ''; ypLast = ''; return;
    }
    var findings = []; r.docs.forEach(function (d, i) { findings = findings.concat(ypLint(d, i)); });
    var errs = findings.filter(function (f) { return f.level === 'error'; }).length;
    st.innerHTML = '<div class="drill-res ' + (errs ? 'no' : 'ok') + '"><p><strong>' + (errs ? 'Valid YAML, but ' + plural(errs, 'problem') + ' found.' : 'Valid YAML.') + '</strong> ' + plural(r.docs.length, 'document') + '.' + (findings.length ? '' : ' No Kubernetes warnings.') + '</p></div>';
    li.innerHTML = findings.length ? '<ul class="yp-find">' + findings.map(function (f) { return '<li class="f-' + f.level + '"><b>' + (f.level === 'error' ? 'Error' : f.level === 'warn' ? 'Warning' : 'Tip') + '</b> ' + e(f.msg) + '</li>'; }).join('') + '</ul>' : '';
  }
  inp.addEventListener('input', run); run();
  $('#yp-in').addEventListener('keydown', function (ev) { if (ev.key === 'Tab' && !ev.shiftKey && false) ev.preventDefault(); });
}
function ypShow(text, label) { var out = $('#yp-out'); out.hidden = false; out.querySelector('code').textContent = text; out.setAttribute('aria-label', label); ypLast = text; }
A.onAct('yaml-sample', function (b) { var t = YAML_SAMPLES[b.getAttribute('data-s')]; if (!t) return; $('#yp-in').value = t; $('#yp-in').dispatchEvent(new Event('input')); });
A.onAct('yaml-json', function () {
  var r = ypLoad($('#yp-in').value); if (r.error) { A.toast('Fix the YAML first.'); return; }
  ypShow(JSON.stringify(r.docs.length === 1 ? r.docs[0] : r.docs, null, 2), 'JSON result');
});
A.onAct('yaml-format', function () {
  var r = ypLoad($('#yp-in').value); if (r.error) { A.toast('Fix the YAML first.'); return; }
  ypShow(r.docs.map(function (d) { return window.jsyaml.dump(d, { lineWidth: 100, noRefs: true }); }).join('---\n'), 'Formatted YAML');
});
A.onAct('yaml-copy', function () {
  if (!ypLast) { A.toast('Format or convert first, then copy.'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ypLast).then(function () { A.toast('Copied.'); }, function () { A.toast('Copy failed. Select the text and copy it.'); });
  else A.toast('Copy is not available in this browser.');
});
A.addRoute(/^\/playground\/yaml$/, yamlView);

/* ---------------------------------------------------------------- Python playground (Pyodide, loaded only when asked) */
var PY_VER = '314.0.7', PY_BASE = 'https://cdn.jsdelivr.net/npm/pyodide@' + PY_VER + '/';
var PY = { promise: null, py: null };
var PY_EX = [
  { id: 'size', title: 'Parse a size such as 10GB', task: 'Write parse_size(text) that turns "512", "4KB", "10MB" or "2GB" into a number of bytes. Use 1024 for each step. Ignore case and spaces.',
    start: 'def parse_size(text):\n    pass\n', sol: 'def parse_size(text):\n    t = text.strip().upper()\n    units = {"KB": 1024, "MB": 1024**2, "GB": 1024**3}\n    for u, m in units.items():\n        if t.endswith(u):\n            return int(t[:-2].strip()) * m\n    return int(t)\n',
    tests: 'assert parse_size("512") == 512, "512 should stay 512"\nassert parse_size("4KB") == 4096, "4KB should be 4096"\nassert parse_size("10 gb") == 10 * 1024**3, "10 gb should work too"\nassert parse_size(" 2MB ") == 2 * 1024**2, "spaces around the value"\n' },
  { id: 'levels', title: 'Count log levels', task: 'Write count_levels(lines). Each line looks like "2026-01-05 ERROR disk full". Return a dict of how many lines have each level (the second word).',
    start: 'def count_levels(lines):\n    pass\n', sol: 'def count_levels(lines):\n    out = {}\n    for line in lines:\n        parts = line.split()\n        if len(parts) >= 2:\n            out[parts[1]] = out.get(parts[1], 0) + 1\n    return out\n',
    tests: 'r = count_levels(["2026-01-05 ERROR disk full", "2026-01-05 INFO started", "2026-01-06 ERROR timeout", ""])\nassert r == {"ERROR": 2, "INFO": 1}, "got " + repr(r)\nassert count_levels([]) == {}, "empty input gives an empty dict"\n' },
  { id: 'unhealthy', title: 'Find unhealthy services in JSON', task: 'Write unhealthy(text). The text is JSON like [{"name": "api", "healthy": true}]. Return the sorted list of names where healthy is false.',
    start: 'import json\n\ndef unhealthy(text):\n    pass\n', sol: 'import json\n\ndef unhealthy(text):\n    return sorted(s["name"] for s in json.loads(text) if not s.get("healthy", False))\n',
    tests: 'data = \'[{"name": "web", "healthy": true}, {"name": "db", "healthy": false}, {"name": "cache", "healthy": false}]\'\nassert unhealthy(data) == ["cache", "db"], "got " + repr(unhealthy(data))\nassert unhealthy("[]") == [], "empty list"\n' },
  { id: 'backoff', title: 'Exponential backoff', task: 'Write backoff(attempt, base=1, cap=30). The delay is base times 2 to the power of attempt, but never more than cap. Attempt 0 is the first retry.',
    start: 'def backoff(attempt, base=1, cap=30):\n    pass\n', sol: 'def backoff(attempt, base=1, cap=30):\n    return min(cap, base * 2 ** attempt)\n',
    tests: 'assert backoff(0) == 1\nassert backoff(3) == 8\nassert backoff(10) == 30, "the delay must stop at the cap"\nassert backoff(2, base=5) == 20\n' },
  { id: 'port', title: 'Read a port from the environment', task: 'Write get_port(env). env is a dict of environment variables. Return the PORT as an int, 8080 if it is missing. If it is not a number, raise ValueError.',
    start: 'def get_port(env):\n    pass\n', sol: 'def get_port(env):\n    raw = env.get("PORT", "8080")\n    if not str(raw).isdigit():\n        raise ValueError("PORT must be a number")\n    return int(raw)\n',
    tests: 'assert get_port({}) == 8080\nassert get_port({"PORT": "9000"}) == 9000\ntry:\n    get_port({"PORT": "abc"})\n    raise AssertionError("a bad PORT should raise ValueError")\nexcept ValueError:\n    pass\n' },
  { id: 'budget', title: 'Error budget in minutes', task: 'Write budget_minutes(slo, days=30). slo is a percentage such as 99.9. Return the allowed downtime in minutes, rounded to one decimal.',
    start: 'def budget_minutes(slo, days=30):\n    pass\n', sol: 'def budget_minutes(slo, days=30):\n    return round(days * 24 * 60 * (100 - slo) / 100, 1)\n',
    tests: 'assert budget_minutes(99.9) == 43.2, "99.9 percent over 30 days is 43.2 minutes"\nassert budget_minutes(99.99) == 4.3\nassert budget_minutes(99.0, days=7) == 100.8\n' },
  { id: 'unique', title: 'Remove duplicates, keep the order', task: 'Write unique_in_order(items). Return a list with the duplicates removed and the first occurrences kept in their original order.',
    start: 'def unique_in_order(items):\n    pass\n', sol: 'def unique_in_order(items):\n    seen = set()\n    out = []\n    for x in items:\n        if x not in seen:\n            seen.add(x)\n            out.append(x)\n    return out\n',
    tests: 'assert unique_in_order([3, 1, 3, 2, 1]) == [3, 1, 2]\nassert unique_in_order([]) == []\nassert unique_in_order("aabca") == ["a", "b", "c"]\n' },
  { id: 'hosts', title: 'Usable hosts in a network', task: 'Write usable_hosts(cidr) using the ipaddress module. A normal network loses 2 addresses (network and broadcast). A /31 has 2 usable and a /32 has 1.',
    start: 'import ipaddress\n\ndef usable_hosts(cidr):\n    pass\n', sol: 'import ipaddress\n\ndef usable_hosts(cidr):\n    net = ipaddress.ip_network(cidr, strict=False)\n    if net.prefixlen >= 31:\n        return net.num_addresses\n    return net.num_addresses - 2\n',
    tests: 'assert usable_hosts("10.0.0.0/24") == 254\nassert usable_hosts("10.0.0.0/31") == 2\nassert usable_hosts("10.0.0.5/32") == 1\nassert usable_hosts("192.168.1.130/26") == 62\n' }
];
PY_EX = PY_EX.concat((D.labs && D.labs.python) || []);
window.MARGA_PY_EX = PY_EX;
window.MARGA_PYLOAD = function () { return pyLoad(); };
window.MARGA_PY_READY = function () { return !!PY.py; };
function pyLoad() {
  if (PY.py) return Promise.resolve(PY.py);
  if (PY.promise) return PY.promise;
  PY.promise = new Promise(function (res, rej) {
    var done = function () { window.loadPyodide({ indexURL: PY_BASE }).then(function (p) { PY.py = p; res(p); }, rej); };
    if (window.loadPyodide) return done();
    var s = document.createElement('script'); s.src = PY_BASE + 'pyodide.js'; s.async = true;
    s.onload = done; s.onerror = function () { rej(new Error('Could not download Python. Check your internet connection and try again.')); };
    document.head.appendChild(s);
  });
  PY.promise.catch(function () { PY.promise = null; });
  return PY.promise;
}
var pyCur = 0;
function pyView() {
  view.title = 'Python playground | MARGA by EknathaLabs'; view.nav = 'practice';
  var solved = bag('py');
  view.html = head('Python playground', 'Write and run real Python in your browser, then check your answer against built-in tests. Python itself (about 10 MB) is downloaded from a public CDN the first time you press Load, then your browser keeps it. Your code never leaves your device.') +
    '<div class="wrap narrow pyp"><div class="actions"><button type="button" class="btn btn-primary" data-act="py-load" id="py-load">Load Python</button><span class="small" id="py-state" role="status" aria-live="polite">Python is not loaded yet.</span></div>' +
    sel('py-ex', 'Exercise', [['free', 'Free play (no tests)']].concat(PY_EX.map(function (x, i) { return [x.id, (solved[x.id] ? 'Solved: ' : '') + (i + 1) + '. ' + x.title]; })), 'free') +
    '<p id="py-task" class="py-task"></p><details id="py-hintbox" hidden><summary>Hint</summary><p id="py-hint"></p></details>' +
    '<label class="field"><span>Python code</span><textarea id="py-code" class="editor" rows="14" spellcheck="false" autocomplete="off" autocapitalize="off"></textarea></label>' +
    '<div class="actions"><button type="button" class="btn btn-primary" data-act="py-run" id="py-run" disabled>Run (Ctrl+Enter)</button><button type="button" class="btn btn-quiet" data-act="py-check" id="py-check" disabled>Check my answer</button><button type="button" class="btn btn-quiet" data-act="py-reset">Reset code</button><button type="button" class="btn btn-quiet" data-act="py-sol" id="py-solbtn" aria-expanded="false">Show a solution</button></div>' +
    '<div id="py-res" role="status" aria-live="polite"></div><pre class="evidence" id="py-out" tabindex="0" aria-label="Program output" hidden><code></code></pre><pre class="evidence" id="py-sol" hidden aria-label="A solution"><code></code></pre>' +
    '<p class="small">A loop that never ends will freeze this tab. Reload the page if that happens. Python runs inside your browser with its standard library; extra packages such as requests are not available.</p></div>';
  view.after = function () { pyCur = 0; pyShow('free'); if (PY.py) pyReady(); };
}
function pyFind(id) { for (var i = 0; i < PY_EX.length; i++) if (PY_EX[i].id === id) return PY_EX[i]; return null; }
function pyShow(id) {
  var x = pyFind(id);
  $('#py-task').textContent = x ? x.task : 'Free play: write anything and press Run. Try print("hello") or import ipaddress.';
  $('#py-code').value = x ? x.start : 'import json\n\nservice = {"name": "api", "replicas": 3}\nprint(json.dumps(service, indent=2))\n';
  var hb = $('#py-hintbox'); if (hb) { hb.hidden = !(x && x.hint); if (x && x.hint) { $('#py-hint').textContent = x.hint; hb.open = false; } }
  $('#py-check').hidden = !x; $('#py-solbtn').hidden = !x; $('#py-sol').hidden = true; $('#py-res').innerHTML = ''; $('#py-out').hidden = true;
  $('#py-solbtn').setAttribute('aria-expanded', 'false');
}
function pyReady() { $('#py-state').textContent = 'Python is ready.'; $('#py-run').disabled = false; $('#py-check').disabled = false; var l = $('#py-load'); if (l) l.hidden = true; }
A.onAct('py-load', function () {
  var b = $('#py-load'); b.disabled = true; $('#py-state').textContent = 'Downloading Python. This can take a little while the first time.';
  pyLoad().then(function () { pyReady(); }, function (err) { b.disabled = false; $('#py-state').textContent = err.message || 'Python failed to load.'; });
});
document.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'py-ex') pyShow(ev.target.value); });
document.addEventListener('keydown', function (ev) { if (ev.target && ev.target.id === 'py-code' && (ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); var b = $('#py-run'); if (b && !b.disabled) b.click(); } });
function pyRun(code, tests) {
  var py = PY.py, buf = [];
  py.setStdout({ batched: function (s) { buf.push(s); } }); py.setStderr({ batched: function (s) { buf.push(s); } });
  var ns = py.globals.get('dict')(), err = null, passed = false;
  return py.runPythonAsync(code, { globals: ns }).then(function () { if (tests) return py.runPythonAsync(tests, { globals: ns }).then(function () { passed = true; }); }).catch(function (x) { err = x; })
    .then(function () { try { ns.destroy(); } catch (z) { /* ignore */ } return { out: buf.join('\n'), err: err, passed: passed }; });
}
function pyErrText(err) { var m = String(err && err.message || err).trim().split('\n'); return m.slice(-6).join('\n'); }
function pyShowOut(r) {
  var o = $('#py-out'); o.hidden = false; o.querySelector('code').textContent = (r.out ? r.out + '\n' : '') + (r.err ? pyErrText(r.err) : '') || '(no output)';
}
A.onAct('py-run', function () {
  if (!PY.py) return; var b = $('#py-run'); b.disabled = true;
  pyRun($('#py-code').value).then(function (r) { b.disabled = false; pyShowOut(r); $('#py-res').innerHTML = r.err ? '<div class="drill-res no"><p><strong>Error.</strong> Read the last line of the output.</p></div>' : ''; });
});
A.onAct('py-check', function () {
  var x = pyFind($('#py-ex').value); if (!x || !PY.py) return;
  var b = $('#py-check'); b.disabled = true;
  pyRun($('#py-code').value, x.tests).then(function (r) {
    b.disabled = false; pyShowOut(r);
    if (r.passed) {
      var m = bag('py'); if (!m[x.id]) { m[x.id] = 1; A.markActive(); A.save(); A.renderChrome(); A.setNav(view.nav); }
      $('#py-res').innerHTML = '<div class="drill-res ok"><p><strong>All checks passed.</strong> ' + plural(Object.keys(bag('py')).length, 'exercise') + ' solved.</p></div>';
    } else {
      var msg = r.err ? pyErrText(r.err).split('\n').slice(-1)[0] : 'Not passed.';
      var fl = '', mm = r.err ? String(r.err.message || r.err).match(/line (\d+)/) : null;
      if (mm) fl = (x.tests.split('\n')[parseInt(mm[1], 10) - 1] || '').trim();
      $('#py-res').innerHTML = '<div class="drill-res no"' + (fl ? ' data-fail="' + e(fl) + '"' : '') + '><p><strong>Not yet.</strong> ' + e(msg) + '</p></div>';
    }
  });
});
A.onAct('py-reset', function () { pyShow($('#py-ex').value); });
A.onAct('py-sol', function () {
  var x = pyFind($('#py-ex').value), box = $('#py-sol'); if (!x) return;
  var open = box.hidden; box.hidden = !open; box.querySelector('code').textContent = x.sol; $('#py-solbtn').setAttribute('aria-expanded', String(open));
});
A.addRoute(/^\/playground\/python$/, pyView);

/* ---------------------------------------------------------------- animated explainers */
var EXP = window.MARGA_EXPLAINERS || [];
var EX = null, exTimer = null;
function exStop() { if (exTimer) { clearInterval(exTimer); exTimer = null; } if (EX) EX.playing = false; var b = $('#ex-play'); if (b) b.textContent = 'Play'; if (b) b.setAttribute('aria-pressed', 'false'); }
window.addEventListener('hashchange', function () { exStop(); });
/* ---- explainer list with filters: skill chips with counts, multi-select, search, watched, URL and remembered choice ---- */
var EXF = null, EXP_BY = {}, EXP_IDX = {};
EXP.forEach(function (x) { EXP_BY[x.id] = x; EXP_IDX[x.id] = (x.title + ' ' + x.summary + ' ' + modTitle(x.module) + ' ' + x.steps.map(function (st) { return st.l + ' ' + st.n; }).join(' ')).toLowerCase(); });
function exBag(name) { var st = A.state(); if (!st[name] || typeof st[name] !== 'object' || Array.isArray(st[name])) st[name] = {}; return st[name]; }
function exQuery(qs) {
  var o = {}; String(qs || '').split('&').forEach(function (kv) { if (!kv) return; var i = kv.indexOf('='), k = i < 0 ? kv : kv.slice(0, i), v = i < 0 ? '' : kv.slice(i + 1); try { o[k] = decodeURIComponent(v.replace(/\+/g, ' ')); } catch (x) { o[k] = v; } });
  return o;
}
function exSkills() { return MODS.filter(function (m) { return EXP.some(function (x) { return x.module === m.id; }); }); }
function exCount(id) { return EXP.filter(function (x) { return x.module === id; }).length; }
function explainersView(qs) {
  view.title = 'Animated explainers | MARGA by EknathaLabs'; view.nav = 'practice';
  var skills = exSkills(), valid = {}; skills.forEach(function (m) { valid[m.id] = 1; });
  var P = exQuery(qs), bag = exBag('exf'), has = !!(qs && qs.length);
  EXF = has ? { skills: (P.skill || '').split(',').filter(function (id) { return valid[id]; }), q: P.q || '', unw: P.unwatched === '1' }
            : { skills: (Array.isArray(bag.skills) ? bag.skills : []).filter(function (id) { return valid[id]; }), q: '', unw: !!bag.unw };
  var W = exBag('exw');
  view.html = head('Animated explainers', 'Watch how common systems work, one message at a time. Step through yourself or press Play. Each step has a plain explanation. Choose one or more skills below, or search, to see fewer.') +
    '<div class="wrap exf" id="exf">' +
    '<label class="field exf-search"><span>Search explainers</span><input type="search" id="exf-q" value="' + e(EXF.q) + '" autocomplete="off" placeholder="For example: DNS, rollback, quota"></label>' +
    '<div class="exf-chips" role="group" aria-label="Filter by skill"><button type="button" class="exf-chip" data-act="exf-all" aria-pressed="false">All skills <span class="exf-n">' + EXP.length + '</span></button>' +
    skills.map(function (m) { return '<button type="button" class="exf-chip" data-act="exf-skill" data-mod="' + e(m.id) + '" aria-pressed="false">' + e(m.title) + ' <span class="exf-n">' + exCount(m.id) + '</span></button>'; }).join('') + '</div>' +
    '<div class="exf-bar"><label class="opt-r"><input type="checkbox" id="exf-unw"' + (EXF.unw ? ' checked' : '') + '> <span>Hide explainers I have watched</span></label>' +
    '<button type="button" class="btn btn-quiet" data-act="exf-clear">Clear filters</button><span class="small" id="exf-count" role="status" aria-live="polite"></span></div>' +
    '<div id="exf-list">' + skills.map(function (m) {
      var items = EXP.filter(function (x) { return x.module === m.id; }), seen = items.filter(function (x) { return W[x.id]; }).length;
      return '<section class="exf-g" data-mod="' + e(m.id) + '"><h2 class="sub-h">' + e(m.title) + ' <span class="small exf-prog">' + seen + ' of ' + items.length + ' watched</span></h2><ul class="prac">' + items.map(function (x) {
        return '<li data-id="' + e(x.id) + '"><a href="#/explainers/' + e(x.id) + '"><strong>' + e(x.title) + '</strong><span>' + e(x.summary) + '</span><em>' + plural(x.steps.length, 'step') + (W[x.id] ? ' | Watched' : '') + '</em></a></li>'; }).join('') + '</ul></section>'; }).join('') + '</div>' +
    '<div class="empty" id="exf-empty" hidden><h3>No explainers match</h3><p>Try fewer skills or a shorter search.</p><p><button type="button" class="btn btn-primary" data-act="exf-clear">Clear filters</button></p></div></div>';
  view.after = function () {
    exfApply(false);
    var q = $('#exf-q'); if (q) q.addEventListener('input', function () { EXF.q = q.value; exfApply(true); });
    var u = $('#exf-unw'); if (u) u.addEventListener('change', function () { EXF.unw = u.checked; exfApply(true); });
  };
}
function exfApply(write) {
  if (!EXF || !$('#exf')) return;
  var words = EXF.q.trim().toLowerCase().split(/\s+/).filter(Boolean), W = exBag('exw'), shown = 0;
  $$('#exf-list li').forEach(function (li) {
    var id = li.getAttribute('data-id'), x = EXP_BY[id];
    var okS = !EXF.skills.length || EXF.skills.indexOf(x.module) >= 0, okW = !EXF.unw || !W[id], okQ = words.every(function (w) { return EXP_IDX[id].indexOf(w) >= 0; });
    li.hidden = !(okS && okW && okQ); if (!li.hidden) shown++;
  });
  $$('#exf-list .exf-g').forEach(function (sec) { sec.hidden = !sec.querySelector('li:not([hidden])'); });
  $$('.exf-chip').forEach(function (b) { var m = b.getAttribute('data-mod'); b.setAttribute('aria-pressed', String(m ? EXF.skills.indexOf(m) >= 0 : !EXF.skills.length)); });
  $('#exf-count').textContent = shown + ' of ' + EXP.length + ' explainers shown';
  $('#exf-empty').hidden = shown > 0;
  if (write) {
    var bag = exBag('exf'); bag.skills = EXF.skills.slice(); bag.unw = EXF.unw; A.save();
    var parts = []; if (EXF.skills.length) parts.push('skill=' + EXF.skills.join(',')); if (EXF.q.trim()) parts.push('q=' + encodeURIComponent(EXF.q.trim())); if (EXF.unw) parts.push('unwatched=1');
    try { history.replaceState(null, '', '#/explainers' + (parts.length ? '?' + parts.join('&') : '')); } catch (x) {}
  }
}
A.onAct('exf-skill', function (b) {
  if (!EXF) return; var m = b.getAttribute('data-mod'), i = EXF.skills.indexOf(m);
  if (i >= 0) EXF.skills.splice(i, 1); else EXF.skills.push(m);
  exfApply(true);
});
A.onAct('exf-all', function () { if (!EXF) return; EXF.skills = []; exfApply(true); });
A.onAct('exf-clear', function () { if (!EXF) return; EXF.skills = []; EXF.q = ''; EXF.unw = false; var q = $('#exf-q'); if (q) q.value = ''; var u = $('#exf-unw'); if (u) u.checked = false; exfApply(true); });
A.addRoute(/^\/explainers(?:\?(.*))?$/, explainersView);
function exSvg(x) {
  var n = x.actors.length, W = Math.max(640, n * 150), cw = W / n, top = 56, rowH = 58, H = top + x.steps.length * rowH + 20;
  function cx(i) { return cw * i + cw / 2; }
  var s = '<svg class="ex-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + e(x.title) + ' diagram" focusable="false"><defs><marker id="ex-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ex-arrowhead"/></marker></defs>';
  x.actors.forEach(function (a, i) {
    s += '<line class="ex-life" x1="' + cx(i) + '" y1="' + (top - 10) + '" x2="' + cx(i) + '" y2="' + (H - 8) + '"/>' +
      '<g class="ex-actor" data-a="' + i + '"><rect x="' + (cx(i) - cw / 2 + 10) + '" y="8" width="' + (cw - 20) + '" height="36" rx="8"/><text x="' + cx(i) + '" y="31" text-anchor="middle">' + e(a) + '</text></g>';
  });
  x.steps.forEach(function (st, i) {
    var y = top + i * rowH + 36, g = '<g class="ex-step" data-i="' + i + '">';
    if (st.f === st.t) g += '<rect class="ex-self" x="' + (cx(st.f) - 6) + '" y="' + (y - 20) + '" width="' + Math.min(cw - 24, 170) + '" height="30" rx="6"/><text x="' + (cx(st.f) + 4) + '" y="' + (y) + '" class="ex-lbl">' + e(st.l) + '</text>';
    else { var a = cx(st.f), b = cx(st.t), mid = (a + b) / 2; g += '<line class="ex-line" x1="' + a + '" y1="' + y + '" x2="' + (b + (b > a ? -3 : 3)) + '" y2="' + y + '" marker-end="url(#ex-ah)"/><text x="' + mid + '" y="' + (y - 8) + '" text-anchor="middle" class="ex-lbl">' + e(st.l) + '</text>'; }
    s += g + '</g>';
  });
  s += '<circle class="ex-pkt" r="6" cx="-20" cy="-20"/></svg>';
  return s;
}
function exPaint(animate) {
  var x = EX.x, i = EX.i;
  $$('.ex-step').forEach(function (g) { var k = +g.getAttribute('data-i'); g.classList.toggle('shown', k <= i); g.classList.toggle('cur', k === i); });
  $$('.ex-actor').forEach(function (g) { var a = +g.getAttribute('data-a'); g.classList.toggle('act', a === x.steps[i].f || a === x.steps[i].t); });
  var st = x.steps[i], W = Math.max(640, x.actors.length * 150), cw = W / x.actors.length, pkt = $('.ex-pkt');
  var y = 56 + i * 58 + 36, x0 = cw * st.f + cw / 2, x1 = cw * st.t + cw / 2;
  if (pkt) {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.getAttribute('data-a-motion') === 'reduce';
    pkt.setAttribute('cy', y); pkt.style.transition = 'none'; pkt.setAttribute('cx', x0);
    if (animate && !reduce && st.f !== st.t) { void pkt.getBoundingClientRect(); pkt.style.transition = 'cx .7s ease-in-out'; pkt.setAttribute('cx', x1); }
    else pkt.setAttribute('cx', x1);
    pkt.classList.toggle('self', st.f === st.t);
  }
  if (i === x.steps.length - 1) { var wb = exBag('exw'); if (!wb[x.id]) { wb[x.id] = 1; A.save(); } }
  $('#ex-step').textContent = 'Step ' + (i + 1) + ' of ' + x.steps.length;
  $('#ex-label').textContent = st.l; $('#ex-note').textContent = st.n;
  $('#ex-prev').disabled = i === 0; $('#ex-next').disabled = i === x.steps.length - 1;
  var cur = $('.ex-step.cur'); var sc = $('.ex-scroll');
  if (cur && sc && sc.scrollHeight > sc.clientHeight) { var top = cur.getBBox ? cur.getBBox().y : 0; sc.scrollTop = Math.max(0, top - 100); }
  var sl = $('#ex-range'); if (sl) sl.value = i;
}
function exGo(d, abs) {
  if (!EX) return; var n = EX.x.steps.length, j = abs !== undefined ? abs : EX.i + d;
  j = Math.max(0, Math.min(n - 1, j)); var moved = j !== EX.i; EX.i = j; exPaint(moved && d > 0);
  if (EX.playing && j === n - 1) exStop();
  if (EX.speak && moved && window.MargaVoice && MargaVoice.supported) MargaVoice.say(EX.x.steps[j].l + '. ' + EX.x.steps[j].n);
}
function explainerView(id) {
  var x = EXP.filter(function (q) { return q.id === id; })[0];
  if (!x) return explainersView();
  view.title = x.title + ' | MARGA by EknathaLabs'; view.nav = 'practice';
  EX = { x: x, i: 0, playing: false, speed: 4200 };
  var others = EXP.filter(function (q) { return q.id !== id; }).sort(function (p, q) { return (q.module === x.module) - (p.module === x.module); });
  view.html = head(x.title, e(x.summary), '<p class="small"><a class="chip" href="#/module/' + e(x.module) + '">' + e(modTitle(x.module)) + '</a> <a href="#/explainers?skill=' + e(x.module) + '">More from this skill</a> <a href="#/explainers">All explainers</a></p>') +
    '<div class="wrap"><div class="ex" id="ex"><div class="ex-ctl" role="group" aria-label="Playback controls"><button type="button" class="btn btn-quiet" id="ex-first" data-act="ex-first">Restart</button><button type="button" class="btn btn-quiet" id="ex-prev" data-act="ex-prev">Back</button>' +
    '<button type="button" class="btn btn-primary" id="ex-play" data-act="ex-play" aria-pressed="false">Play</button><button type="button" class="btn btn-quiet" id="ex-next" data-act="ex-next">Next</button>' +
    sel('ex-speed', 'Speed', [['6500', 'Slow'], ['4200', 'Normal'], ['2400', 'Fast']], '4200') +
    '<label class="opt-r ex-say"><input type="checkbox" id="ex-speak"> <span>Read each step aloud</span></label></div>' +
    '<label class="field ex-rangef"><span class="sr">Step</span><input type="range" id="ex-range" min="0" max="' + (x.steps.length - 1) + '" value="0" aria-label="Step"></label>' +
    '<div class="ex-scroll" tabindex="0" aria-label="Diagram, scrolls sideways on small screens">' + exSvg(x) + '</div>' +
    '<div class="ex-note" aria-live="polite"><p class="small" id="ex-step"></p><h2 id="ex-label"></h2><p id="ex-note"></p></div></div>' +
    '<h2 class="sub-h">More explainers</h2><ul class="prac">' + others.slice(0, 3).map(function (o) { return '<li><a href="#/explainers/' + e(o.id) + '"><strong>' + e(o.title) + '</strong><span>' + e(o.summary) + '</span></a></li>'; }).join('') + '</ul></div>';
  view.after = function () {
    exPaint(false);
    $('#ex-range').addEventListener('input', function (ev) { exStop(); exGo(0, +ev.target.value); });
    $('#ex-speed').addEventListener('change', function (ev) { EX.speed = +ev.target.value; if (EX.playing) { exStop(); exPlay(); } });
    $('#ex-speak').addEventListener('change', function (ev) { EX.speak = ev.target.checked; if (EX.speak && window.MargaVoice && MargaVoice.supported) { var st = EX.x.steps[EX.i]; MargaVoice.say(st.l + '. ' + st.n); } });
  };
}
A.addRoute(/^\/explainers\/([\w-]+)$/, explainerView);
A.onAct('ex-prev', function () { exStop(); exGo(-1); });
A.onAct('ex-next', function () { exStop(); exGo(1); });
A.onAct('ex-first', function () { exStop(); exGo(0, 0); });
function exPlay() {
  if (!EX) return;
  if (EX.playing) { exStop(); return; }
  if (EX.i >= EX.x.steps.length - 1) exGo(0, 0);
  EX.playing = true; var b = $('#ex-play'); b.textContent = 'Pause'; b.setAttribute('aria-pressed', 'true');
  exTimer = setInterval(function () { exGo(1); }, EX.speed);
}
A.onAct('ex-play', exPlay);
document.addEventListener('keydown', function (ev) {
  if (!EX || !$('#ex') || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  var tag = (document.activeElement && document.activeElement.tagName) || '';
  if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(tag)) return;
  if (ev.key === 'ArrowRight') { ev.preventDefault(); exStop(); exGo(1); }
  else if (ev.key === 'ArrowLeft') { ev.preventDefault(); exStop(); exGo(-1); }
  else if (ev.key === ' ') { ev.preventDefault(); var pl = $('#ex-play'); if (pl) pl.click(); }
});

/* ---------------------------------------------------------------- hooks */
A.afterRoute(function () { glossApply(); eliBar(); eliSync(); });
var mo = null, moTimer = null;
(function () {
  var main = $('#main'); if (!main || !window.MutationObserver) return;
  mo = new MutationObserver(function () {
    if (moTimer) clearTimeout(moTimer);
    moTimer = setTimeout(function () { mo.disconnect(); try { glossApply(); eliSync(); } finally { mo.observe(main, { childList: true, subtree: true }); } }, 60);
  });
  mo.observe(main, { childList: true, subtree: true });
})();
};
