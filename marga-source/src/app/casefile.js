/* MARGA case files: the full, source-checked write-up behind a real-world case study.
   Data comes from src/casefiles/*.json (window.ACADEMY.casefiles). Each file has an overview, labelled architecture
   diagrams (verified or conceptual), a timeline, root cause, evidence (quoted or simulated), a step-by-step fix,
   before and after architecture, learning activities and lessons. Registered by app.js through the small API. */
window.MargaCaseFile = function (A) {
'use strict';
var D = A.D, MOD = A.MOD, view = A.view, $ = A.$, $$ = A.$$, e = A.e, plural = A.plural;
var FILES = D.casefiles || [], CASES = D.cases || [], ARCH = D.arch || [];
function byId(id) { for (var i = 0; i < FILES.length; i++) if (FILES[i].id === id) return FILES[i]; return null; }
function caseOf(id) { for (var i = 0; i < CASES.length; i++) if (CASES[i].id === id) return CASES[i]; return null; }
function bag() { var s = A.state(); if (!s.cf || typeof s.cf !== 'object' || Array.isArray(s.cf)) s.cf = {}; return s.cf; }
A.caseFileFor = function (id) { return byId(id) ? '#/case-file/' + id : ''; };

/* ---------- diagram: layered boxes and elbow lines, drawn as inline SVG ---------- */
var NW = 164, NH = 54, CW = 196, RH = 104, PAD = 22;
function wrap(text, max) {
  var words = String(text).split(' '), lines = [], cur = '';
  words.forEach(function (w) { if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; });
  if (cur) lines.push(cur); return lines.slice(0, 3);
}
function diagramSvg(d) {
  var nodes = {}, maxC = 0, maxR = 0;
  d.nodes.forEach(function (n) { nodes[n.id] = n; if (n.col > maxC) maxC = n.col; if (n.row > maxR) maxR = n.row; });
  var W = PAD * 2 + maxC * CW + NW, H = PAD * 2 + maxR * RH + NH;
  function cx(n) { return PAD + n.col * CW + NW / 2; }
  function cy(n) { return PAD + n.row * RH + NH / 2; }
  var uid = 'cfd-' + d.id, out = '<svg class="cfd" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" role="img" aria-label="' + e(d.title) + '. ' + e(d.kind === 'verified' ? 'Verified from the source report.' : 'Conceptual diagram.') + ' A text version follows.">';
  out += '<defs>' + ['ok', 'fail', 'new'].map(function (s) { return '<marker id="' + uid + '-' + s + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto"><path d="M1 1 L9 5 L1 9 z" class="cfd-ah cfd-ah-' + s + '"/></marker>'; }).join('') + '</defs>';
  var labels = '';
  (d.edges || []).forEach(function (ed) {
    var a = nodes[ed.f], b = nodes[ed.t]; if (!a || !b) return;
    var st = ed.state || 'ok', x1, y1, x2, y2, p, lx, ly;
    if (a.row === b.row) {
      x1 = cx(a) + (b.col > a.col ? NW / 2 : -NW / 2); x2 = cx(b) + (b.col > a.col ? -NW / 2 : NW / 2); y1 = y2 = cy(a);
      p = 'M' + x1 + ' ' + y1 + ' H' + x2; lx = (x1 + x2) / 2; ly = y1 - 6;
    } else {
      var down = b.row > a.row;
      x1 = cx(a); y1 = cy(a) + (down ? NH / 2 : -NH / 2); x2 = cx(b); y2 = cy(b) + (down ? -NH / 2 : NH / 2);
      var my = (y1 + y2) / 2, r = 8, dx = x2 - x1, sg = dx > 0 ? 1 : -1;
      if (Math.abs(dx) < 1) p = 'M' + x1 + ' ' + y1 + ' V' + y2;
      else if (Math.abs(dx) < 2 * r) p = 'M' + x1 + ' ' + y1 + ' V' + my + ' H' + x2 + ' V' + y2;
      else p = 'M' + x1 + ' ' + y1 + ' V' + (my - (down ? r : -r)) + ' Q' + x1 + ' ' + my + ' ' + (x1 + sg * r) + ' ' + my + ' H' + (x2 - sg * r) + ' Q' + x2 + ' ' + my + ' ' + x2 + ' ' + (my + (down ? r : -r)) + ' V' + y2;
      lx = (x1 + x2) / 2; ly = my - 5;
      if (Math.abs(dx) < 1) { lx = x1 + 6; ly = my; }
    }
    out += '<path d="' + p + '" class="cfd-e cfd-e-' + st + '" marker-end="url(#' + uid + '-' + st + ')"/>';
    if (ed.label) labels += '<text x="' + lx + '" y="' + ly + '" class="cfd-el" text-anchor="' + (a.col === b.col && a.row !== b.row ? 'start' : 'middle') + '">' + e(ed.label) + '</text>';
  });
  out += labels;
  d.nodes.forEach(function (n) {
    var x = PAD + n.col * CW, y = PAD + n.row * RH, lines = wrap(n.label, 22), st = n.state || 'ok';
    var ty = y + NH / 2 - (lines.length - 1) * 8 + 5;
    out += '<g class="cfd-n cfd-n-' + st + '"><rect x="' + x + '" y="' + y + '" width="' + NW + '" height="' + NH + '" rx="10"/>' +
      lines.map(function (l, i) { return '<text x="' + (x + NW / 2) + '" y="' + (ty + i * 16) + '" text-anchor="middle">' + e(l) + '</text>'; }).join('') + '</g>';
  });
  return out + '</svg>';
}
function diagramHtml(d, heading) {
  var ver = d.kind === 'verified';
  var stateName = { ok: 'Working', fail: 'Failed', hit: 'Affected', 'new': 'Added or changed by the fix' };
  var used = {}; d.nodes.forEach(function (n) { used[n.state || 'ok'] = 1; }); (d.edges || []).forEach(function (x) { if (x.state === 'fail') used.fail = 1; if (x.state === 'new') used['new'] = 1; });
  var legend = Object.keys(stateName).filter(function (k) { return used[k]; }).map(function (k) { return '<li class="cfd-k cfd-k-' + k + '">' + stateName[k] + '</li>'; }).join('');
  var text = d.nodes.map(function (n) { return '<li><strong>' + e(n.label) + '</strong> (' + e(stateName[n.state || 'ok'].toLowerCase()) + ')' + (n.note ? ': ' + e(n.note) : '') + '</li>'; }).join('') +
    (d.edges || []).map(function (x) { var a = d.nodes.filter(function (n) { return n.id === x.f; })[0], b = d.nodes.filter(function (n) { return n.id === x.t; })[0]; return a && b ? '<li>' + e(a.label) + ' to ' + e(b.label) + (x.label ? ': ' + e(x.label) : '') + (x.state === 'fail' ? ' (failed path)' : x.state === 'new' ? ' (new path)' : '') + '</li>' : ''; }).join('');
  return '<figure class="cf-fig"><figcaption><strong>' + e(heading || d.title) + '</strong> <span class="cf-badge ' + (ver ? 'ver' : 'con') + '">' + (ver ? 'Verified architecture' : 'Conceptual diagram') + '</span></figcaption>' +
    '<p class="small cf-cap">' + e(d.caption) + '</p>' +
    '<div class="cfd-scroll" tabindex="0" role="group" aria-label="' + e(d.title) + ' diagram, scrolls sideways on small screens">' + diagramSvg(d) + '</div>' +
    (legend ? '<ul class="cfd-keys" aria-label="Diagram key">' + legend + '</ul>' : '') +
    '<details class="cf-text"><summary>Text version of this diagram</summary><ul>' + text + '</ul></details></figure>';
}

/* ---------- sections ---------- */
function list(items, cls) { return '<ul' + (cls ? ' class="' + cls + '"' : '') + '>' + items.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>'; }
function codeBlock(body, lang) { return '<pre class="cf-code" tabindex="0"><code' + (lang ? ' class="lang-' + e(lang) + '"' : '') + '>' + e(body) + '</code></pre>'; }
var PHASE = { trigger: 'Trigger', detect: 'Detection', investigate: 'Investigation', mitigate: 'Mitigation', recover: 'Recovery', impact: 'Impact', change: 'Follow-up' };
function secOverview(f) {
  var o = f.overview;
  return '<dl class="cf-dl"><dt>Background</dt><dd>' + e(o.background) + '</dd><dt>Affected systems</dt><dd>' + list(o.systems) + '</dd><dt>Business impact</dt><dd>' + e(o.impact) + '</dd><dt>Severity</dt><dd>' + e(o.severity) + '</dd></dl>' +
    (o.gaps ? '<p class="cf-gap"><strong>Not stated by the source.</strong> ' + e(o.gaps) + '</p>' : '');
}
function secTimeline(f) {
  return '<p class="small">' + e(f.timelineNote) + '</p><ol class="cf-tl">' + f.timeline.map(function (t) {
    return '<li class="ph-' + t.phase + '"><time>' + e(t.t) + '</time><div><span class="cf-phase">' + e(PHASE[t.phase] || t.phase) + '</span> <span class="cf-badge ' + (t.derived ? 'con' : 'ver') + '">' + (t.derived ? 'Derived' : 'Reported') + '</span><p>' + e(t.e) + '</p></div></li>';
  }).join('') + '</ol>';
}
function secRoot(f) {
  var r = f.rootCause;
  return '<dl class="cf-dl"><dt>Triggering event</dt><dd>' + e(r.trigger) + '</dd><dt>Underlying technical cause</dt><dd>' + e(r.underlying) + '</dd><dt>Contributing factors</dt><dd>' + list(r.contributing) + '</dd><dt>How the failure spread</dt><dd><ol>' + r.propagation.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ol></dd></dl>';
}
function secEvidence(f) {
  return '<p class="small">Quoted evidence is copied from the source and shortened. Simulated evidence is written for this lesson to show what you would see; it is not from the real incident.</p>' + f.evidence.map(function (x) {
    var q = x.kind === 'quoted';
    return '<div class="cf-ev"><p class="cf-evh"><strong>' + e(x.label) + '</strong> <span class="cf-badge ' + (q ? 'ver' : 'sim') + '">' + (q ? 'Quoted from the source' : 'Simulated for teaching') + '</span></p>' + codeBlock(x.body, x.lang) + (x.note ? '<p class="small">' + e(x.note) + '</p>' : '') + '</div>';
  }).join('');
}
function stepHtml(s) {
  return '<li><strong>' + e(s.step) + '</strong><p>' + e(s.why) + '</p>' + (s.cmd ? codeBlock(s.cmd, s.lang || 'bash') : '') + '</li>';
}
function secFix(f) {
  var x = f.fix;
  return '<div class="cf-fixgrid">' + [['diagnose', 'Diagnose'], ['correct', 'Correct'], ['verify', 'Verify'], ['prevent', 'Prevent recurrence']].map(function (k, i) {
    return '<section class="cf-step"><h4><span class="cf-n">' + (i + 1) + '</span>' + k[1] + '</h4><ol>' + x[k[0]].map(stepHtml).join('') + '</ol></section>';
  }).join('') + '</div><div class="cf-safe"><strong>Safety first.</strong> ' + e(x.safety) + '</div>' +
    (x.simulated ? '<p class="small">Commands are examples written for learning. They are not copied from the provider\'s runbooks, which are not public. Adapt names and limits to your own system and test in a non-production environment first.</p>' : '');
}
function mcq(q, key, i, label) {
  return '<div class="cf-q" data-key="' + key + '" data-i="' + i + '" data-answer="' + q.answer + '"><p class="cf-qt"><strong>' + e(label) + '</strong> ' + e(q.q) + '</p><div class="cf-opts" role="group" aria-label="Answer options">' +
    q.options.map(function (o, j) { return '<button type="button" class="cf-opt" data-act="cf-pick" data-j="' + j + '">' + e(o) + '</button>'; }).join('') +
    '</div><p class="cf-fb" role="status" aria-live="polite" hidden></p><p class="cf-why" hidden>' + e(q.why) + '</p></div>';
}
function secActivities(f, id) {
  var a = f.activities, n = 0;
  var tr = a.troubleshoot;
  var out = '<div class="cf-act"><h4>Troubleshooting challenge</h4><p>' + e(tr.scenario) + '</p><p><strong>Clues</strong></p>' + list(tr.clues) + '<p><strong>' + e(tr.question) + '</strong></p>' +
    '<details class="cf-hint"><summary>Hints</summary>' + list(tr.hints) + '</details><details class="cf-ans"><summary>Show the answer</summary><p>' + e(tr.answer) + '</p></details></div>';
  out += '<div class="cf-act"><h4>Root-cause exercise</h4>' + mcq(a.rootcause, id, n++, 'Which is the root cause?') + '</div>';
  out += '<div class="cf-act"><h4>Remediation tasks</h4><p>Write down your answer to each task, then open the model answer.</p><ol class="cf-tasks">' + a.remediation.map(function (t) {
    return '<li><p>' + e(t.task) + '</p><details class="cf-ans"><summary>Model answer</summary><p>' + e(t.answer) + '</p></details></li>';
  }).join('') + '</ol></div>';
  var d = a.design;
  out += '<div class="cf-act"><h4>Architecture design challenge</h4><p>' + e(d.prompt) + '</p><p><strong>Constraints</strong></p>' + list(d.constraints) + '<details class="cf-ans"><summary>Show a model design</summary><p>' + e(d.answer) + '</p></details></div>';
  out += '<div class="cf-act"><h4>Knowledge check</h4><p class="small" id="cf-score" role="status"></p>' + a.checks.map(function (q, i) { return mcq(q, id, 100 + i, 'Question ' + (i + 1) + '.'); }).join('') + '</div>';
  return out;
}
function secLessons(f) {
  var l = f.lessons;
  return '<div class="cf-lgrid">' + [['preventive', 'Preventive controls'], ['monitoring', 'Monitoring improvements'], ['recovery', 'Recovery strategies'], ['practices', 'Best practices']].map(function (k) { return '<section><h4>' + k[1] + '</h4>' + list(l[k[0]]) + '</section>'; }).join('') + '</div>';
}
var SECS = [['overview', 'Incident overview'], ['arch', 'Architecture'], ['timeline', 'Timeline'], ['root', 'Root cause'], ['evidence', 'Evidence'], ['fix', 'Step-by-step fix'], ['after', 'Before and after'], ['learn', 'Learning activities'], ['lessons', 'Lessons learned']];

function fileView(id) {
  var f = byId(id), c = caseOf(id);
  if (!f || !c) return { title: 'Not found', html: '<section class="page-head wrap"><h1>Case file not found</h1><p><a href="#/cases">Back to case studies</a></p></section>', after: null, nav: 'cases' };
  var pm = ARCH.filter(function (x) { return x.id === (f.postmortem || id); })[0];
  var arch = f.diagrams.filter(function (d) { return d.section === 'arch'; }), after = f.diagrams.filter(function (d) { return d.section === 'after'; });
  view.title = c.title + ': case file | MARGA by EknathaLabs'; view.nav = 'cases';
  var done = bag()[id];
  var body = {
    overview: secOverview(f),
    arch: '<p class="small">' + e(f.archNote) + '</p>' + arch.map(function (d) { return diagramHtml(d); }).join(''),
    timeline: secTimeline(f), root: secRoot(f), evidence: secEvidence(f), fix: secFix(f),
    after: '<p>' + e(f.afterNote) + '</p>' + (arch[0] ? diagramHtml(arch[0], 'Before: ' + arch[0].title) : '') + after.map(function (d) { return diagramHtml(d, 'After: ' + d.title); }).join('') + list(f.afterChanges, 'cf-chg'),
    learn: secActivities(f, id), lessons: secLessons(f)
  };
  var fmtd = f.checked;
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/cases">Case studies</a></nav><h1>' + e(c.title) + '</h1>' +
    '<p class="lede">' + e(f.summary) + '</p>' +
    '<p class="iv-meta"><span class="chip">' + e(c.company) + ', ' + c.year + '</span><span class="chip lvl-senior">' + e(c.area) + '</span><span class="chip">Sources checked ' + e(fmtd) + '</span>' + (done ? '<span class="chip pass">Knowledge check: ' + done.score + ' of ' + done.total + '</span>' : '') + '</p>' +
    '<p class="small">Related stages: ' + c.modules.map(function (m) { return MOD[m] ? '<a href="#/module/' + m + '">' + e(MOD[m].title) + '</a>' : ''; }).filter(Boolean).join(', ') + '. <a href="#/cases/' + c.id + '">Short case card</a>' + (pm ? ' | <a href="#/architecture/' + pm.id + '">Architecture post-mortem</a>' : '') + '</p>' +
    '<div class="actions">' + A.printBar() + '</div></section>' +
    '<div class="wrap"><nav class="cf-toc" aria-label="Sections of this case file">' + SECS.map(function (s, i) { return '<button type="button" class="cf-jump" data-act="cf-jump" data-to="cf-' + s[0] + '">' + (i + 1) + '. ' + e(s[1]) + '</button>'; }).join('') + '</nav>' +
    '<div class="cf-key"><strong>How to read the labels.</strong> <span class="cf-badge ver">Verified</span> or <span class="cf-badge ver">Reported</span> means it comes from the primary source. <span class="cf-badge con">Conceptual</span> or <span class="cf-badge con">Derived</span> means we drew or worked it out to teach the idea. <span class="cf-badge sim">Simulated</span> means written for this lesson.</div>' +
    SECS.map(function (s, i) { return '<section class="cf-sec" id="cf-' + s[0] + '" aria-labelledby="cf-h-' + s[0] + '"><h2 id="cf-h-' + s[0] + '">' + (i + 1) + '. ' + e(s[1]) + '</h2>' + body[s[0]] + '</section>'; }).join('') +
    '<section class="cf-sec" id="cf-src"><h2>Sources and verification</h2><ul class="cf-src">' + f.sources.map(function (s) { return '<li><a href="' + e(s.url) + '" target="_blank" rel="noopener">' + e(s.title) + '</a> <span class="host">' + e(s.url.replace(/^https:\/\/([^\/]+).*$/, '$1')) + '</span>' + (s.used ? '<span class="small"> Used for: ' + e(s.used) + '</span>' : '') + '</li>'; }).join('') + '</ul><p class="small">' + e(f.verification) + '</p></section></div>';
  view.after = function () { scoreText(id); restore(id); };
}
function total(id) { var f = byId(id); return f ? f.activities.checks.length + 1 : 0; }
function scoreText(id) {
  var el = $('#cf-score'); if (!el) return;
  var got = $$('.cf-q.right').length, tot = total(id);
  el.textContent = 'Score: ' + got + ' of ' + tot + ' answered correctly (includes the root-cause question).';
}
function restore() { /* answers are not saved between visits so each visit is a fresh attempt */ }
A.addRoute(/^\/case-file\/([\w-]+)$/, fileView);

A.onAct('cf-pick', function (b) {
  var q = b.closest('.cf-q'); if (!q || q.classList.contains('done')) return;
  var j = +b.getAttribute('data-j'), ok = j === +q.getAttribute('data-answer'), id = q.getAttribute('data-key');
  $$('.cf-opt', q).forEach(function (x) { x.disabled = true; });
  b.classList.add(ok ? 'right' : 'wrong'); q.classList.add('done'); if (ok) q.classList.add('right');
  if (!ok) { var r = $$('.cf-opt', q)[+q.getAttribute('data-answer')]; if (r) r.classList.add('right'); }
  var fb = $('.cf-fb', q); fb.hidden = false; fb.textContent = ok ? 'Correct.' : 'Not quite. The right answer is highlighted.';
  $('.cf-why', q).hidden = false;
  scoreText(id);
  var all = $$('.cf-q'), finished = all.every(function (x) { return x.classList.contains('done'); });
  if (finished) { var st = bag(); st[id] = { score: $$('.cf-q.right').length, total: all.length }; A.save(); }
});
A.onAct('cf-jump', function (b) {
  var t = document.getElementById(b.getAttribute('data-to')); if (t) { t.scrollIntoView({ block: 'start' }); var h = t.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
});
};
