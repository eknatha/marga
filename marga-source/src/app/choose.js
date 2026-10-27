/* MARGA: two ways to learn. "Learn by skill" opens any single skill; "Learn by path" follows a role.
   Also: the Skills page, a custom path builder, goal starters and a ten-question test-out for a skill.
   Registered by app.js through the same small API as the other extras. */
window.MargaChoose = function (A) {
'use strict';
var D = A.D, MOD = A.MOD, MODS = A.MODS, LES = A.LES, LIVE = A.LIVE, view = A.view;
var $ = A.$, $$ = A.$$, e = A.e, plural = A.plural, hours = A.hours;
function S() { return A.state(); }
function nf() { view.title = 'Not found | MARGA'; view.nav = 'paths'; view.html = head('Not found', 'That page does not exist. Try <a href="#/skills">all skills</a> or <a href="#/paths">the role paths</a>.'); view.after = null; }
function head(title, lede, extra) { return '<section class="page-head wrap"><h1>' + e(title) + '</h1><p class="lede">' + lede + '</p>' + (extra || '') + '</section>'; }

/* ---- progress helpers (the same rules as the rest of the app) ---- */
function count(m) { return m.lessons.filter(A.isDone).length; }
function done(m) { return m.lessons.length > 0 && count(m) === m.lessons.length; }
function pct(m) { return Math.round(count(m) / m.lessons.length * 100); }
function unlocked(m) { return m.requires.every(function (r) { return done(MOD[r]); }); }
function status(m) { return done(m) ? 'pass' : count(m) > 0 ? 'run' : unlocked(m) ? 'ready' : 'lock'; }
function nextLesson(m) { for (var i = 0; i < m.lessons.length; i++) if (!A.isDone(m.lessons[i])) return m.lessons[i]; return null; }
function usedIn(id) { return LIVE.filter(function (p) { return p.modules.indexOf(id) >= 0; }); }
function pathStats(p) {
  var tot = 0, dn = 0, min = 0;
  p.modules.forEach(function (id) { var m = MOD[id]; tot += m.lessons.length; dn += count(m); min += m.minutes; });
  return { total: tot, done: dn, minutes: min, pct: tot ? Math.round(dn / tot * 100) : 0 };
}
var STATE_TEXT = { pass: 'Mastered', run: 'In progress', ready: 'Ready', lock: 'Prerequisites open it' };

/* ---- goals: each opens the plan builder with a starting set of skills ---- */
var GOALS = [
  { id: 'from-zero', title: 'Start from zero', text: 'Command line, version control and scripting first.', mods: ['linux', 'git', 'bash'] },
  { id: 'interview', title: 'Prepare for an interview', text: 'The topics that come up most in DevOps and SRE interviews.', mods: ['linux', 'networking', 'git', 'docker', 'cicd', 'kubernetes', 'sre'] },
  { id: 'fix-prod', title: 'Fix production faster', text: 'Find the cause of an outage using the system, the network and telemetry.', mods: ['linux', 'networking', 'observability', 'sre'] },
  { id: 'ship-code', title: 'Ship code safely', text: 'From a commit to a running container, with pipelines and rollouts.', mods: ['git', 'docker', 'cicd', 'kubernetes'] },
  { id: 'automate', title: 'Automate the boring work', text: 'Scripts, Python, configuration management and version control.', mods: ['linux', 'git', 'bash', 'python', 'ansible'] },
  { id: 'secure', title: 'Build securely', text: 'Secrets, images, pipelines and cloud identity.', mods: ['linux', 'git', 'docker', 'cicd', 'security'] }
];
var GOAL = {}; GOALS.forEach(function (g) { GOAL[g.id] = g; });

/* ---- plan: chosen skills plus the skills they need, in a safe order ---- */
function closure(ids) {
  var set = {};
  function visit(id) { if (!MOD[id] || set[id]) return; MOD[id].requires.forEach(visit); set[id] = 1; }
  ids.forEach(visit);
  return Object.keys(set);
}
function order(ids) {
  var all = closure(ids), out = [], seen = {};
  var pos = {}; MODS.forEach(function (m, i) { pos[m.id] = i; });
  all.sort(function (a, b) { return pos[a] - pos[b]; });
  function put(id) { if (seen[id] || all.indexOf(id) < 0) return; MOD[id].requires.forEach(put); if (!seen[id]) { seen[id] = 1; out.push(id); } }
  all.forEach(put);
  return out;
}
function planOf(ids) {
  var chosen = ids.filter(function (id) { return MOD[id]; }), full = order(chosen), min = 0, les = 0, dn = 0;
  full.forEach(function (id) { var m = MOD[id]; min += m.minutes; les += m.lessons.length; dn += count(m); });
  return { chosen: chosen, full: full, minutes: min, lessons: les, done: dn };
}
function saved() { var s = S(); return s.plan && Array.isArray(s.plan.mods) ? s.plan.mods.filter(function (id) { return MOD[id]; }) : []; }

/* ---- home page doors ---- */
function doorsHtml() {
  var skills = MODS.map(function (m) { return '<li><a href="#/module/' + m.id + '">' + e(m.title) + '</a></li>'; }).join('');
  var paths = LIVE.map(function (p) {
    var st = pathStats(p);
    return '<li><a href="#/path/' + p.id + '"><strong>' + e(p.title) + '</strong><span>' + plural(p.modules.length, 'skill') + ', about ' + hours(st.minutes) + '</span>' +
      '<span class="door-bar" role="img" aria-label="' + st.pct + ' percent complete"><i style="width:' + st.pct + '%"></i></span></a></li>';
  }).join('');
  var plan = saved();
  var goals = GOALS.map(function (g) { return '<li><a href="#/build-path/' + g.id + '"><strong>' + e(g.title) + '</strong><span>' + e(g.text) + '</span></a></li>'; }).join('');
  return '<section class="band doors" id="doors"><div class="wrap"><div class="band-head"><h2>Two ways to learn</h2>' +
    '<p>Learn one skill on its own, or follow a path built for a job role. Both use the same lessons and share your progress.</p></div>' +
    '<div class="doors-grid">' +
    '<article class="door" aria-labelledby="door-skill"><h3 id="door-skill">Learn by skill</h3>' +
    '<p>Pick any skill and study it by itself, in any order. Each one lists what it works best after. Know a skill already? Test out of it with ten questions.</p>' +
    '<ul class="chips" aria-label="All skills">' + skills + '</ul>' +
    '<p class="actions"><a class="btn btn-primary" href="#/skills">Browse all ' + MODS.length + ' skills</a></p></article>' +
    '<article class="door" aria-labelledby="door-path"><h3 id="door-path">Learn by path</h3>' +
    '<p>Follow an ordered path for a role. Skills open in order, and the path ends with a completion badge.</p>' +
    '<ul class="door-paths">' + paths + '</ul>' +
    '<p class="actions"><a class="btn btn-primary" href="#/paths">See all paths</a><a class="btn btn-quiet" href="#/build-path">' + (plan.length ? 'Open your plan' : 'Build your own path') + '</a></p></article>' +
    '</div><h3 class="sub-h">Or start from a goal</h3><ul class="prac goals">' + goals + '</ul></div></section>';
}
A.doorsHtml = doorsHtml;

/* ---- Skills page ---- */
var LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
function skillCard(m) {
  var s = status(m), n = count(m), tot = m.lessons.length, nx = nextLesson(m), up = usedIn(m.id);
  var best = m.requires.length ? 'Works best after ' + m.requires.map(function (r) { return '<a href="#/module/' + r + '">' + e(MOD[r].title) + '</a>'; }).join(' and ') + '.' : 'No prerequisites. You can start here.';
  var act = s === 'pass' ? '<a class="btn btn-quiet" href="#/module/' + m.id + '">Review</a>'
    : '<a class="btn btn-primary" href="#/module/' + m.id + '">' + (n ? 'Continue' : 'Open') + '</a>';
  var testout = s === 'pass' ? '' : '<a class="btn btn-quiet" href="#/testout/' + m.id + '">Test out</a>';
  return '<article class="skill s-' + s + '" id="skill-' + m.id + '"><div class="skill-top"><h3><a href="#/module/' + m.id + '">' + e(m.title) + '</a></h3><span class="chip ' + (s === 'pass' ? 'pass' : '') + '">' + STATE_TEXT[s] + '</span></div>' +
    '<p>' + e(m.summary) + '</p>' +
    '<p class="small">' + plural(tot, 'lesson') + ', about ' + hours(m.minutes) + '. ' + best + '</p>' +
    '<p class="small">Used in ' + plural(up.length, 'path') + (up.length ? ': ' + up.map(function (p) { return '<a href="#/path/' + p.id + '">' + e(p.title) + '</a>'; }).join(', ') : '') + '.</p>' +
    '<div class="bar" role="img" aria-label="' + pct(m) + ' percent complete"><i style="width:' + pct(m) + '%"></i></div>' +
    '<p class="small">' + n + ' of ' + tot + ' lessons passed' + (nx && n ? '. Next: ' + e(LES[nx].title) : '') + '</p>' +
    '<div class="actions">' + act + testout + '</div></article>';
}
function skillsView() {
  view.title = 'Learn by skill | MARGA by EknathaLabs'; view.nav = 'skills';
  var by = {}; LEVELS.forEach(function (l) { by[l] = []; });
  MODS.forEach(function (m) { (by[m.level] = by[m.level] || []).push(m); });
  var sections = Object.keys(by).filter(function (l) { return by[l].length; }).map(function (l) {
    return '<h2 class="sub-h">' + e(l) + '</h2><div class="skills-grid">' + by[l].map(skillCard).join('') + '</div>';
  }).join('');
  var goals = GOALS.map(function (g) { return '<li><a href="#/build-path/' + g.id + '">' + e(g.title) + '</a></li>'; }).join('');
  view.html = head('Learn by skill', 'Open any skill and learn it on its own. A skill lists what it works best after, but nothing forces you to take that route: you can test out of a skill you already know, in ten questions. Lessons are shared with the role paths, so progress counts in both.') +
    '<div class="wrap"><p class="small">Prefer a guided order for a job role? See the <a href="#/paths">role paths</a>, <a href="#/build-path">build your own path</a>, or start from a goal:</p><ul class="chips">' + goals + '</ul>' + sections + '</div>';
}
A.addRoute(/^\/skills$/, skillsView);

/* ---- Plan builder ---- */
function planView(goalId) {
  var g = goalId ? GOAL[goalId] : null;
  if (goalId && !g) return nf();
  view.title = (g ? g.title + ': your plan' : 'Build your own path') + ' | MARGA by EknathaLabs'; view.nav = 'paths';
  var start = g ? g.mods.slice() : saved();
  var boxes = MODS.map(function (m) {
    return '<li><label class="pick"><input type="checkbox" name="plan" value="' + m.id + '"' + (start.indexOf(m.id) >= 0 ? ' checked' : '') + '><span><strong>' + e(m.title) + '</strong><small>' + plural(m.lessons.length, 'lesson') + ', about ' + hours(m.minutes) + '</small></span></label></li>';
  }).join('');
  view.html = head(g ? g.title : 'Build your own path', g ? e(g.text) + ' Change the ticks to fit what you need. The plan adds the skills that your choices depend on and puts everything in a sensible order.' : 'Tick the skills you want. MARGA adds the skills they depend on and puts everything in a sensible order. Your plan is saved in this browser.') +
    '<div class="wrap two-col"><form id="plan-form" class="plan-pick" aria-label="Choose skills"><fieldset><legend>Skills</legend><ul class="picks">' + boxes + '</ul></fieldset>' +
    '<p class="actions"><button class="btn btn-quiet" type="button" id="plan-clear">Clear all</button></p></form>' +
    '<div class="plan-out" id="plan-out" aria-live="polite"></div></div>';
  view.after = function () {
    var form = $('#plan-form');
    function chosen() { return $$('input[name=plan]:checked', form).map(function (i) { return i.value; }); }
    function draw() {
      var ids = chosen(), out = $('#plan-out');
      if (!ids.length) { out.innerHTML = '<h2 class="sub-h">Your plan</h2><p>Tick at least one skill to see your plan.</p>'; return; }
      var pl = planOf(ids), added = pl.full.filter(function (id) { return ids.indexOf(id) < 0; });
      var rows = pl.full.map(function (id, i) {
        var m = MOD[id], s = status(m), why = ids.indexOf(id) < 0 ? '<em class="small"> Added because ' + MODS.filter(function (x) { return pl.full.indexOf(x.id) >= 0 && x.requires.indexOf(id) >= 0; }).map(function (x) { return e(x.title); }).join(' and ') + ' builds on it.</em>' : '';
        return '<li class="step s-' + s + '"><span class="n">' + (i + 1) + '</span><div><a href="#/module/' + id + '"><strong>' + e(m.title) + '</strong></a>' + why +
          '<span class="small">' + plural(m.lessons.length, 'lesson') + ', about ' + hours(m.minutes) + '. ' + count(m) + ' passed. <a href="#/testout/' + id + '">Test out</a></span></div></li>';
      }).join('');
      var first = null; for (var i = 0; i < pl.full.length && !first; i++) { var m2 = MOD[pl.full[i]]; if (!done(m2)) first = nextLesson(m2); }
      out.innerHTML = '<h2 class="sub-h">Your plan</h2><p class="plan-meta"><strong>' + plural(pl.full.length, 'skill') + '</strong>, ' + plural(pl.lessons, 'lesson') + ', about ' + hours(pl.minutes) + ' of study. ' + pl.done + ' lessons already passed.' +
        (added.length ? ' ' + plural(added.length, 'skill') + ' added for you.' : '') + '</p><ol class="plan-steps">' + rows + '</ol>' +
        '<p class="actions">' + (first ? '<a class="btn btn-primary" id="plan-go" href="#/lesson/' + first + '">Start with ' + e(LES[first].title) + '</a>' : '<span class="chip pass">Plan complete</span>') +
        '<button class="btn btn-quiet" type="button" id="plan-save">Save this plan</button></p><p class="small" id="plan-note"></p>';
      var sv = $('#plan-save'); if (sv) sv.addEventListener('click', function () { S().plan = { mods: chosen() }; A.save(); $('#plan-note').textContent = 'Plan saved in this browser. It appears on the home page and here.'; });
    }
    form.addEventListener('change', draw);
    $('#plan-clear').addEventListener('click', function () { $$('input[name=plan]', form).forEach(function (i) { i.checked = false; }); draw(); });
    draw();
  };
}
A.addRoute(/^\/build-path$/, function () { return planView(null); });
A.addRoute(/^\/build-path\/([a-z-]+)$/, function (id) { return GOAL[id] ? planView(id) : nf(); });

/* ---- Test out of a skill ---- */
var TO = null;
var TEST_N = 10, TEST_PASS = 8;
function toBuild(m) {
  var pool = [];
  m.lessons.forEach(function (lid) { (LES[lid].quiz || []).forEach(function (q) { pool.push({ q: q, lid: lid }); }); });
  // at most two questions per lesson so the check covers the whole skill
  var per = {}, qs = [];
  A.shuffle(pool).forEach(function (it) { per[it.lid] = per[it.lid] || 0; if (per[it.lid] < 2 && qs.length < TEST_N) { per[it.lid]++; qs.push(it); } });
  if (qs.length < TEST_N) A.shuffle(pool).forEach(function (it) { if (qs.length < TEST_N && qs.indexOf(it) < 0) qs.push(it); });
  return { m: m, qs: A.shuffle(qs), pos: 0, right: 0, missed: {} };
}
function testoutView(id) {
  var m = MOD[id]; if (!m) return nf();
  view.title = 'Test out of ' + m.title + ' | MARGA by EknathaLabs'; view.nav = 'paths';
  TO = toBuild(m);
  var already = done(m);
  view.html = head('Test out of ' + m.title, 'Ten questions drawn from across this skill. Answer ' + TEST_PASS + ' correctly and every lesson in it is marked as passed, which also opens the skills that depend on it. If you miss, you see which lessons to read. You can try again as often as you like.') +
    '<div class="wrap narrow">' + (already ? '<p class="small">You have already passed every lesson in this skill. Taking the check again changes nothing.</p>' : '') +
    '<p class="small">Skill: <a href="#/module/' + m.id + '">' + e(m.title) + '</a>. ' + plural(m.lessons.length, 'lesson') + ' in this skill. Honest note: the check is a guide that you take on your own, and the pass is recorded in this browser only.</p><div id="to" class="check"></div></div>';
  view.after = toAsk;
}
A.addRoute(/^\/testout\/([a-z0-9-]+)$/, testoutView);
function toAsk() {
  var root = $('#to'); if (!root || !TO) return;
  if (TO.pos >= TO.qs.length) return toDone(root);
  var it = TO.qs[TO.pos], q = it.q, opts = A.shuffle(q.options.map(function (o, oi) { return { o: o, oi: oi }; }));
  root.innerHTML = '<div class="qprog" aria-hidden="true"><i style="width:' + (TO.pos / TO.qs.length * 100) + '%"></i></div><p class="qcount">Question ' + (TO.pos + 1) + ' of ' + TO.qs.length + '</p>' +
    '<h2 class="qtext">' + e(q.q) + '</h2><div class="opts" role="group" aria-label="Answer choices">' + opts.map(function (x, k) {
      return '<button type="button" class="opt" data-oi="' + x.oi + '"><span class="key">' + String.fromCharCode(65 + k) + '</span><span>' + e(x.o) + '</span></button>'; }).join('') + '</div><div class="feedback" id="to-fb" aria-live="polite"></div>';
  $$('.opt', root).forEach(function (b) {
    b.addEventListener('click', function () {
      var ok = Number(b.getAttribute('data-oi')) === q.answer;
      if (ok) TO.right++; else TO.missed[it.lid] = (TO.missed[it.lid] || 0) + 1;
      $$('.opt', root).forEach(function (x) { x.disabled = true; if (Number(x.getAttribute('data-oi')) === q.answer) x.classList.add('right'); });
      if (!ok) b.classList.add('wrong');
      var last = TO.pos === TO.qs.length - 1;
      $('#to-fb', root).innerHTML = '<p class="' + (ok ? 'ok' : 'bad') + '"><strong>' + (ok ? 'Correct.' : 'Not quite.') + '</strong> ' + e(q.why) + '</p><button class="btn btn-primary" type="button" id="to-next">' + (last ? 'See result' : 'Next question') + '</button>';
      var nb = $('#to-next', root); nb.focus();
      nb.addEventListener('click', function () { TO.pos++; toAsk(); });
    });
  });
}
function toDone(root) {
  var m = TO.m, pass = TO.right >= TEST_PASS, total = TO.qs.length, html;
  if (pass) {
    var before = done(m), now = Date.now();
    m.lessons.forEach(function (lid) {
      var prev = S().lessons[lid] || {};
      if (!prev.done) S().lessons[lid] = { done: true, best: Math.round(TO.right / total * 100), at: now, attempts: (prev.attempts || 0) + 1, via: 'testout' };
    });
    A.markActive(); A.save(); A.renderChrome(); A.setNav('paths');
    var opened = MODS.filter(function (x) { return x.requires.indexOf(m.id) >= 0 && unlocked(x); });
    html = '<div class="result pass"><h2>' + TO.right + ' of ' + total + ' correct</h2><p>' + (before ? 'Nothing changed: every lesson in this skill was already passed.' : 'Every lesson in <strong>' + e(m.title) + '</strong> is now marked as passed.') + '</p>' +
      (opened.length ? '<p class="stage-pass"><strong>Now open:</strong> ' + opened.map(function (x) { return '<a href="#/module/' + x.id + '">' + e(x.title) + '</a>'; }).join(', ') + '.</p>' : '') +
      '<p class="small">You can still read any lesson, practise the drills and flip the flashcards at any time.</p></div>';
    A.toast('Skill passed by test-out.');
  } else {
    var ml = Object.keys(TO.missed).sort(function (a, b) { return TO.missed[b] - TO.missed[a]; });
    html = '<div class="result fail"><h2>' + TO.right + ' of ' + total + ' correct</h2><p>You need ' + TEST_PASS + ' to test out. These lessons covered the questions you missed:</p><ul>' +
      ml.map(function (lid) { return '<li><a href="' + A.hrefLesson(lid) + '">' + e(LES[lid].title) + '</a></li>'; }).join('') + '</ul></div>';
  }
  root.innerHTML = html + '<p class="actions"><button class="btn btn-quiet" type="button" id="to-again">Try again with new questions</button><a class="btn btn-quiet" href="#/skills">All skills</a><a class="btn btn-primary" href="#/module/' + m.id + '">Open ' + e(m.title) + '</a></p>';
  var again = $('#to-again', root);
  if (again) again.addEventListener('click', function () { TO = toBuild(m); toAsk(); var h = $('#main h1'); if (h) h.scrollIntoView(); });
}

/* ---- module page extras ---- */
A.chooseModule = function (id) {
  var m = MOD[id]; if (!m) return '';
  var up = usedIn(id);
  return '<section class="choose-note"><h2 class="sub-h">Where this skill fits</h2><p>Used in ' + plural(up.length, 'role path') + (up.length ? ': ' + up.map(function (p) { return '<a href="#/path/' + p.id + '">' + e(p.title) + '</a>'; }).join(', ') : '') + '. Progress is shared, so lessons you pass here count in every path.</p>' +
    '<p class="actions">' + (done(m) ? '' : '<a class="btn btn-quiet" href="#/testout/' + id + '">Test out of this skill</a>') + '<a class="btn btn-quiet" href="#/skills">All skills</a><a class="btn btn-quiet" href="#/build-path">Build your own path</a></p></section>';
};
};
