/* MARGA practice and case-study pages: Practice hub, Case studies, Architecture post-mortems,
   Troubleshooting drills, Mock interview, Interactive flashcards and Trade-off calculators.
   Registered through the small API that app.js passes in. */
window.MargaExtras = function (A) {
'use strict';
var D = A.D, MOD = A.MOD, MODS = A.MODS, IV = A.IV, view = A.view;
var $ = A.$, $$ = A.$$, e = A.e, plural = A.plural, shuffle = A.shuffle;
var CASES = D.cases || [], ARCH = D.arch || [], DRILLS = D.drills || [];
var LEVELS = A.LEVELS;

function S() { return A.state(); }
function bag(name, kind) { var s = S(), want = kind === 'array'; if (!s[name] || typeof s[name] !== 'object' || Array.isArray(s[name]) !== want) s[name] = want ? [] : {}; return s[name]; }
function modTitle(id) { return MOD[id] ? MOD[id].title : id; }
function chips(mods) {
  return mods.filter(function (m) { return MOD[m]; }).map(function (m) { return '<a class="chip" href="#/module/' + m + '">' + e(modTitle(m)) + '</a>'; }).join('');
}
function head(title, lede, extra) {
  return '<section class="page-head wrap"><h1>' + e(title) + '</h1><p class="lede">' + lede + '</p>' + (extra || '') + '</section>';
}
function sel(id, label, options, cur) {
  return '<label class="field"><span>' + e(label) + '</span><select id="' + id + '">' + options.map(function (o) {
    return '<option value="' + e(o[0]) + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + e(o[1]) + '</option>';
  }).join('') + '</select></label>';
}
function say(btn, text) { return '<button type="button" class="btn btn-quiet say" data-say="' + e(text) + '">Read aloud</button>'; }

/* =========================================================== Practice hub */
function labN(l) { return ((D.labs || {})[l] || []).length; }
function labDone(l) { var m = (S().lab || {}); return ((D.labs || {})[l] || []).filter(function (x) { return m[l + ':' + x.id]; }).length; }
/* Practice hub: grouped tools, a next-step panel, filters, favourites, a week strip. Tests rely on every tool being a link inside a .prac list, once. */
var PRF = { flag: 'all', q: '', skip: 0, why: false };
function prNums(meta) { var m = /(\d+) of (\d+)/.exec(meta || ''); return m ? [Number(m[1]), Number(m[2])] : null; }
function prDayKey(d) { var m = d.getMonth() + 1, dd = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd; }
function prWeek() {
  var days = S().days || [], set = {}; days.forEach(function (k) { set[k] = 1; });
  var now = new Date(), dow = (now.getDay() + 6) % 7, out = [], n = 0, i, d;
  for (i = 0; i < 7; i++) { d = new Date(now); d.setDate(now.getDate() - dow + i); var on = !!set[prDayKey(d)]; if (on) n++; out.push({ on: on, today: i === dow, label: 'MTWTFSS'.charAt(i), name: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i] }); }
  return { days: out, n: n };
}
function prTools() {
  var dr = bag('dr'), solved = Object.keys(dr).filter(function (k) { return dr[k].ok; }).length;
  var fc = bag('fc'), known = Object.keys(fc).filter(function (k) { return fc[k] === 'k'; }).length;
  var mock = bag('mock', 'array'), best = mock.reduce(function (m, x) { return Math.max(m, x.score); }, 0);
  var cs = bag('cs'), read = Object.keys(cs).length;
  var F = window.MargaFeatures || {};
  var pyN = 8 + labN('python'), pyDone = Object.keys(S().py || {}).length;
  var T = [];
  function add(g, id, href, title, desc, meta, time, level, skills, prog) { T.push({ g: g, id: id, href: href, title: title, desc: desc, meta: meta, time: time, level: level, skills: skills, prog: prog }); }
  add('featured', 'explainers', '#/explainers', 'Animated explainers', 'Watch a request move through a system, one step at a time.', (window.MARGA_EXPLAINERS || []).length + ' explainers', '', '', '', null);
  add('featured', 'architecture', '#/architecture', 'Architecture post-mortems', 'Timelines, trade-offs and numbers you can change.', plural(ARCH.length, 'review') + ', calculators', '', '', '', null);
  add('featured', 'drills', '#/drills', 'Troubleshooting drills', 'Read the output, find the cause, pick the fix.', solved + ' of ' + DRILLS.length + ' solved', '', '', '', DRILLS.length ? solved / DRILLS.length : 0);
  add('daily', 'today', '#/today', 'Today', 'An interview question, a real incident and a quiz question.', 'New every day', '5 min', '', '', null);
  add('daily', 'daily', '#/daily', 'Daily challenge', 'One quiz question a day. Keep the streak going.', S().dc ? Object.keys(S().dc).length + ' answered' : 'Not started', '2 min', '', '', null);
  add('daily', 'review', '#/review', 'Review due cards', 'Spaced repetition for lessons you have passed.', 'Cards return when due', '5 min', '', '', null);
  add('labs', 'terminal', '#/terminal-labs', 'Terminal labs', 'Fix broken systems in a simulated terminal, with hints.', (window.MargaTermLabs && MargaTermLabs.count ? MargaTermLabs.count() : 'Simulated terminal'), '20 min', 'starter', 'Linux, Shell, Networking', null);
  add('labs', 'yaml', '#/playground/yaml', 'YAML playground', 'Check manifests, convert to JSON, find risky settings.', labDone('yaml') + ' of ' + labN('yaml') + ' solved', '10 min', 'starter', 'Kubernetes, Helm', labN('yaml') ? labDone('yaml') / labN('yaml') : 0);
  add('labs', 'python', '#/playground/python', 'Python playground', 'Write and run Python with built-in tests.', pyDone + ' of ' + pyN + ' solved', '15 min', 'starter', 'Python', pyN ? pyDone / pyN : 0);
  add('labs', 'go', '#/playground/go', 'Go playground', 'Fifty Go exercises for operations work.', labDone('go') + ' of ' + labN('go') + ' solved', '15 min', 'mid', 'Go', labN('go') ? labDone('go') / labN('go') : 0);
  add('labs', 'hcl', '#/playground/hcl', 'Terraform (HCL) playground', 'Write configuration and get it checked.', labDone('hcl') + ' of ' + labN('hcl') + ' solved', '15 min', 'mid', 'Terraform, Cloud', labN('hcl') ? labDone('hcl') / labN('hcl') : 0);
  add('labs', 'sql', '#/playground/sql', 'SQL for SREs', 'Query deploys, incidents and SLO data in a real database.', labDone('sql') + ' of ' + labN('sql') + ' solved', '15 min', 'mid', 'Databases, SRE', labN('sql') ? labDone('sql') / labN('sql') : 0);
  add('labs', 'sdlab', '#/system-design-lab', 'System design lab', 'Size a system, break a design against an error budget, and fix real outages.', 'Runs in your browser', '15 min', 'mid', 'System design, SRE', null);
  add('labs', 'widgets', '#/widgets', 'Interactive widgets', 'Small simulations for the concepts in each skill. Change a setting and watch the system respond.', (window.MARGA_WIDGET_COUNT || (D.widgets || []).length) + ' widgets', '5 min', 'starter', 'Every skill', null);
  add('labs', 'subnet', '#/subnet', 'Subnet and CIDR playground', 'Inspect networks, split them and plan VLSM for a VPC.', 'Runs in your browser', '10 min', 'starter', 'Networking, Cloud', null);
  add('scenarios', 'games', '#/games', 'Incident games', 'Be on call for an outage. Choose, then see where it leads.', (F.gameCount ? F.gameCount() : '12 games'), '10 min', 'mid', 'Every skill', null);
  add('scenarios', 'capstones', '#/capstones', 'Capstone projects', 'Guided builds for each path, with a self-check.', (F.capCount ? F.capCount() : '16 projects'), '2 hours', 'advanced', 'Every path', null);
  add('scenarios', 'calculators', '#/calculators', 'Trade-off calculators', 'Error budgets, redundancy, cost, recovery time and capacity.', '7 calculators', '10 min', 'mid', 'SRE, Cloud', null);
  add('scenarios', 'mix', '#/mix', 'Mixed practice', 'Twelve questions and drills from different stages, shuffled.', 'Uses lessons you passed', '12 min', 'mid', 'Passed lessons', null);
  add('scenarios', 'weak', '#/weak', 'Weak-spot review', 'Items you missed come back until you get them right.', (F.weakCount ? F.weakCount() : 0) + ' to review', '8 min', '', 'What you missed', null);
  add('study', 'dmock', '#/design-interview', 'Mock design interview', 'A timed system design session with notes per phase and a self-score.', 'Runs in your browser', '45 min', 'senior', 'System design', null);
  add('study', 'mock', '#/interview/mock', 'Mock interview', 'A timed run of questions for your role, then score yourself.', mock.length ? 'Best score ' + best + '%' : 'Not tried yet', '30 min', '', '', null);
  add('study', 'flashcards', '#/flashcards', 'Interactive flashcards', 'Flip, shuffle and sort cards from every lesson.', known + ' cards marked known', '', '', '', null);
  add('study', 'glossary', '#/glossary', 'Glossary', 'Plain-words meanings, also shown inside lessons.', (D.glossary || []).length + ' terms', '', '', '', null);
  add('study', 'cases', '#/cases', 'Real-world case studies', 'Incidents from cloud providers and software supply chains.', read + ' of ' + CASES.length + ' read', '', '', '', CASES.length ? read / CASES.length : 0);
  add('study', 'walkthroughs', '#/walkthroughs', 'Architecture walkthroughs', 'Reference designs with request flows and failure points.', (F.wtCount ? F.wtCount() : 6) + ' walkthroughs', '', '', '', null);
  add('study', 'reading', '#/reading', 'Reading lists', 'Official documentation and articles to read next.', Object.keys(D.reading || {}).reduce(function (n, k) { return n + D.reading[k].length; }, 0) + ' resources', '', '', '', null);
  add('study', 'badges', '#/badges', 'Badges', 'One badge for each stage and path you finish.', (window.MargaBadges && MargaBadges.count ? MargaBadges.count() : 'Earn your first'), '', '', '', null);
  T.forEach(function (x) {
    var n = prNums(x.meta);
    if (x.prog === null && n && n[1]) x.prog = n[0] / n[1];
    x.status = x.prog !== null && x.prog >= 1 ? 'Completed' : (x.prog !== null && x.prog > 0 ? 'Running' : 'Ready');
  });
  return T;
}
var PR_GROUPS = [
  ['daily', 'every-day', 'Daily habits, two minutes at a time', 'daily'],
  ['labs', 'labs', 'Hands-on labs: type, run, get checked', 'labs'],
  ['scenarios', 'scenarios', 'Judgement calls, not just commands', 'scenarios'],
  ['study', 'study', 'Interview and study', 'interview']
];
var PR_FLAGS = [['all', '--all'], ['daily', '--daily'], ['labs', '--labs'], ['scenarios', '--scenarios'], ['interview', '--interview'], ['study', '--study'], ['starred', '--starred']];
function prVisual(id) {
  if (id === 'explainers') return '<svg class="pr-vis" viewBox="0 0 300 120" role="img" aria-label="A message moving between a client, a gateway and a pod, step 3 of 8"><g class="pr-svg"><rect x="10" y="6" width="64" height="20" rx="6" class="f1"/><rect x="118" y="6" width="64" height="20" rx="6" class="f1"/><rect x="226" y="6" width="64" height="20" rx="6" class="f1"/><text x="42" y="20" text-anchor="middle">client</text><text x="150" y="20" text-anchor="middle">gateway</text><text x="258" y="20" text-anchor="middle">pod</text><path d="M42 28 V82 M150 28 V82 M258 28 V82" class="dash"/><path d="M44 46 H146" class="ln"/><path d="M146 46 l-8 -5 v10z" class="fl"/><path d="M152 62 H254" class="ln"/><path d="M254 62 l-8 -5 v10z" class="fl"/><path d="M256 78 H154" class="ln dashed"/><circle cx="150" cy="46" r="5" class="dot"/><circle cx="16" cy="104" r="11" class="play"/><path d="M12 98 l10 6 l-10 6z" class="fl w"/><circle cx="46" cy="104" r="4" class="fl"/><circle cx="62" cy="104" r="4" class="fl"/><circle cx="78" cy="104" r="5" class="fl"/><circle cx="94" cy="104" r="4" class="fl soft"/><circle cx="110" cy="104" r="4" class="fl soft"/><circle cx="126" cy="104" r="4" class="fl soft"/><circle cx="142" cy="104" r="4" class="fl soft"/><circle cx="158" cy="104" r="4" class="fl soft"/><text x="290" y="108" text-anchor="end" class="mono">step 3 of 8</text></g></svg>';
  if (id === 'architecture') return '<svg class="pr-vis" viewBox="0 0 300 120" role="img" aria-label="An incident timeline with alert, page, rollback and recovery, and an error budget slider"><g class="pr-svg"><path d="M16 46 H284" class="ln soft"/><circle cx="16" cy="46" r="8" class="fl c1"/><circle cx="96" cy="46" r="8" class="fl c2"/><circle cx="170" cy="46" r="8" class="fl c3"/><circle cx="268" cy="46" r="8" class="fl c4"/><text x="16" y="26" text-anchor="start" class="mono">alert</text><text x="96" y="76" text-anchor="middle" class="mono">page</text><text x="170" y="26" text-anchor="middle" class="mono">rollback</text><text x="268" y="76" text-anchor="end" class="mono">recovered</text><rect x="10" y="88" width="280" height="28" rx="8" class="f1"/><text x="20" y="106" class="mono">error budget</text><rect x="120" y="98" width="140" height="8" rx="4" class="soft"/><rect x="120" y="98" width="98" height="8" rx="4" class="fl"/><circle cx="218" cy="102" r="8" class="knob"/></g></svg>';
  return '<svg class="pr-vis" viewBox="0 0 300 120" role="img" aria-label="A log showing an OOMKilled container and three answer choices, one selected"><g class="pr-svg"><rect x="6" y="4" width="288" height="46" rx="8" class="term"/><text x="16" y="22" class="mono bad">Back-off restarting failed container</text><text x="16" y="40" class="mono good">exit code 137  OOMKilled</text><circle cx="16" cy="68" r="6" class="ring"/><circle cx="16" cy="68" r="3" class="fl"/><text x="30" y="72" class="bold">Raise the memory limit</text><circle cx="16" cy="90" r="6" class="ring"/><text x="30" y="94">Add more replicas</text><circle cx="16" cy="112" r="6" class="ring"/><text x="30" y="116">Restart the node</text></g></svg>';
}
function prCard(x, big) {
  var fav = !!bag('pfav')[x.id], pct = x.prog === null ? 0 : Math.round(x.prog * 100);
  var tags = (x.time ? '<b class="pr-tag">' + e(x.time) + '</b>' : '') + (x.level ? '<b class="pr-tag lv-' + e(x.level) + '">' + e(x.level) + '</b>' : '');
  return '<li class="pr-li' + (big ? ' pr-big' : '') + '" data-id="' + e(x.id) + '" data-g="' + e(x.g) + '" data-q="' + e((x.title + ' ' + x.desc + ' ' + x.skills).toLowerCase()) + '">' +
    '<a href="' + e(x.href) + '" class="pr-a pr-' + e(x.status.toLowerCase()) + '"><strong>' + e(x.title) + '</strong>' +
    '<span class="pr-st"><i>' + e(x.status) + '</i><u>' + e(x.meta) + '</u></span>' +
    (x.prog !== null ? '<span class="pr-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span>' : '') +
    '<span class="pr-d">' + e(x.desc) + '</span>' + (big ? prVisual(x.id) : '') +
    (tags ? '<span class="pr-tags">' + tags + '</span>' : '') + (x.skills ? '<span class="pr-sk">Practises ' + e(x.skills) + '</span>' : '') + '</a>' +
    '<button type="button" class="pr-star" data-act="pr-fav" data-id="' + e(x.id) + '" aria-pressed="' + fav + '" aria-label="' + (fav ? 'Remove ' : 'Pin ') + e(x.title) + (fav ? ' from favourites' : ' to favourites') + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.5 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6-4.5-4.1 6-.7z"/></svg></button></li>';
}
function prNext(T) {
  var F = window.MargaFeatures || {}, weak = F.weakCount ? F.weakCount() : 0, st = (S().days || []).indexOf(prDayKey(new Date())) >= 0, c = [];
  if (weak) c.push({ t: 'Review ' + plural(weak, 'item') + ' you missed', d: 'Questions, drills and cards come back until you get them right. A correct answer clears each one.', h: '#/weak', cmd: 'marga next --weak' });
  if (!st) c.push({ t: 'Do one quick practice today', d: 'A question, an incident and a quiz take about five minutes and keep your day streak going.', h: '#/today', cmd: 'marga next --today' });
  c.push({ t: 'Try an incident game', d: 'Be on call for an outage and see where each choice leads. About ten minutes.', h: '#/games', cmd: 'marga next --game' });
  c.push({ t: 'Solve a troubleshooting drill', d: 'Read real output, find the cause and pick the fix.', h: '#/drills', cmd: 'marga next --drill' });
  c.push({ t: 'Step through an animated explainer', d: 'Watch a request move through a system, one message at a time.', h: '#/explainers', cmd: 'marga next --explainer' });
  return c;
}
function prNextHtml() {
  var c = prNext(), n = c[PRF.skip % c.length];
  return '<div class="pr-cmd"><div class="pr-cmd-l"><p class="pr-prompt">$ ' + e(n.cmd) + '</p><h2>' + e(n.t) + '</h2><p class="pr-cmd-d">' + e(n.d) + '</p>' +
    '<p class="pr-cmd-a"><a class="btn pr-run" href="' + e(n.h) + '">Run it</a><button type="button" class="btn pr-skip" data-act="pr-skip">Skip</button><button type="button" class="pr-why" data-act="pr-why" aria-expanded="' + PRF.why + '">Why this?</button></p>' +
    '<p class="pr-whyt" id="pr-whyt"' + (PRF.why ? '' : ' hidden') + '>Chosen from your own progress on this device: missed items first, then today\'s practice, then something new. Nothing leaves your browser.</p></div>' +
    '<div class="pr-cmd-r"><p class="pr-prompt">filters</p><div class="pr-flags" role="group" aria-label="Filter practice tools">' + PR_FLAGS.map(function (f) { return '<button type="button" class="pr-flag" data-act="pr-flag" data-flag="' + f[0] + '" aria-pressed="false">' + f[1] + '</button>'; }).join('') + '</div>' +
    '<label class="pr-search"><span class="sr">Search practice tools</span><input type="search" id="pr-q" autocomplete="off" placeholder="search practice tools" value="' + e(PRF.q) + '"></label>' +
    '<p class="small pr-count" id="pr-count" role="status" aria-live="polite"></p></div></div>';
}
function practiceView() {
  view.title = 'Practice | MARGA by EknathaLabs'; view.nav = 'practice';
  var T = prTools(), wk = prWeek(), closed = bag('prc'), feat = T.filter(function (x) { return x.g === 'featured'; });
  var week = '<div class="pr-week" role="group" aria-label="Days practised this week"><p><b>This week</b><span>' + wk.n + ' of 7 days</span></p><ol>' + wk.days.map(function (d) { return '<li class="' + (d.on ? 'on' : '') + (d.today ? ' today' : '') + '" aria-label="' + d.name + (d.on ? ', practised' : ', not practised') + (d.today ? ', today' : '') + '">' + (d.on ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7"/></svg>' : d.label) + '</li>'; }).join('') + '</ol></div>';
  view.html = '<section class="page-head wrap pr-head"><div><h1>Practice</h1><p class="lede">Run something. Everything here is open: no lesson needs to be passed first.</p></div>' + week + '</section>' +
    '<div class="wrap pr" id="pr">' + prNextHtml() +
    '<section class="pr-node pr-feat" data-g="featured" data-fg="featured"><h2><code>node/featured</code><span>Learn how systems work, fail and recover</span></h2><ul class="prac pr-grid pr-3">' + feat.map(function (x) { return prCard(x, true); }).join('') + '</ul></section>' +
    PR_GROUPS.map(function (g) {
      var items = T.filter(function (x) { return x.g === g[0]; });
      return '<details class="pr-node" data-g="' + g[0] + '" data-fg="' + g[3] + '"' + (closed[g[0]] ? '' : ' open') + '><summary><code>node/' + g[1] + '</code><span>' + e(g[2]) + '</span><em>' + plural(items.length, 'tool') + '</em></summary><ul class="prac pr-grid">' + items.map(function (x) { return prCard(x, false); }).join('') + '</ul></details>';
    }).join('') +
    '<div class="empty" id="pr-empty" hidden><h3>No tools match</h3><p>Try another filter or a shorter search.</p><p><button type="button" class="btn btn-primary" data-act="pr-clear">Clear filters</button></p></div></div>';
  view.after = function () {
    prApply();
    var q = $('#pr-q'); if (q) q.addEventListener('input', function () { PRF.q = q.value; prApply(); });
    $$('#pr details.pr-node').forEach(function (d) { d.addEventListener('toggle', function () { var c = bag('prc'); if (d.open) delete c[d.getAttribute('data-g')]; else c[d.getAttribute('data-g')] = 1; A.save(); }); });
  };
}
function prApply() {
  if (!$('#pr')) return;
  var words = PRF.q.trim().toLowerCase().split(/\s+/).filter(Boolean), fav = bag('pfav'), shown = 0, total = 0;
  $$('#pr .pr-li').forEach(function (li) {
    total++;
    var id = li.getAttribute('data-id'), sec = li.closest('.pr-node'), fg = sec.getAttribute('data-fg');
    var okF = PRF.flag === 'all' || (PRF.flag === 'starred' ? !!fav[id] : (fg === PRF.flag || fg === 'featured'));
    var okQ = words.every(function (w) { return li.getAttribute('data-q').indexOf(w) >= 0; });
    li.hidden = !(okF && okQ); if (!li.hidden) shown++;
  });
  $$('#pr .pr-node').forEach(function (n) { n.hidden = !n.querySelector('.pr-li:not([hidden])'); });
  $$('.pr-flag').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-flag') === PRF.flag)); });
  $('#pr-count').textContent = shown + ' of ' + total + ' tools shown';
  $('#pr-empty').hidden = shown > 0;
}
A.onAct('pr-flag', function (b) { PRF.flag = b.getAttribute('data-flag'); prApply(); });
A.onAct('pr-clear', function () { PRF.flag = 'all'; PRF.q = ''; var q = $('#pr-q'); if (q) q.value = ''; prApply(); });
A.onAct('pr-fav', function (b) {
  var f = bag('pfav'), id = b.getAttribute('data-id'); if (f[id]) delete f[id]; else f[id] = 1; A.save();
  var on = !!f[id], t = b.getAttribute('aria-label').replace(/^(Pin|Remove) /, '').replace(/ (to|from) favourites$/, '');
  b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', (on ? 'Remove ' : 'Pin ') + t + (on ? ' from favourites' : ' to favourites'));
  if (PRF.flag === 'starred') prApply();
});
A.onAct('pr-skip', function () { PRF.skip++; var box = $('.pr-cmd'); if (box) { box.outerHTML = prNextHtml(); prApply(); var q = $('#pr-q'); if (q) q.addEventListener('input', function () { PRF.q = q.value; prApply(); }); var r = $('.pr-run'); if (r) r.focus(); } });
A.onAct('pr-why', function (b) { PRF.why = !PRF.why; b.setAttribute('aria-expanded', String(PRF.why)); var w = $('#pr-whyt'); if (w) w.hidden = !PRF.why; });
A.addRoute(/^\/practice$/, practiceView);

/* =========================================================== Case studies */
var csFilter = { area: '', mod: '', q: '', open: '' };
function caseItems() {
  var q = csFilter.q.trim().toLowerCase();
  return CASES.filter(function (c) {
    if (csFilter.area && c.area !== csFilter.area) return false;
    if (csFilter.mod && c.modules.indexOf(csFilter.mod) < 0) return false;
    if (q && (c.title + ' ' + c.company + ' ' + c.what + ' ' + c.cause + ' ' + c.fix + ' ' + c.lesson).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}
function caseHtml(c) {
  var read = !!bag('cs')[c.id], open = csFilter.open === c.id;
  var text = c.title + '. ' + c.company + ', ' + c.year + '. What happened. ' + c.what + ' Cause. ' + c.cause + ' What changed. ' + c.fix + ' Lesson. ' + c.lesson;
  return '<article class="case' + (open ? ' open' : '') + (read ? ' read' : '') + '" id="case-' + c.id + '" data-id="' + c.id + '">' +
    '<h3><button type="button" class="case-toggle" data-act="case-toggle" aria-expanded="' + open + '" aria-controls="cb-' + c.id + '">' + e(c.title) + '</button></h3>' +
    '<p class="iv-meta"><span class="chip">' + e(c.company) + ', ' + c.year + '</span><span class="chip lvl-senior">' + e(c.area) + '</span>' + (read ? '<span class="chip pass">Read</span>' : '') + (A.caseFileFor && A.caseFileFor(c.id) ? '<span class="chip cf-has">Case file</span>' : '') + '</p>' +
    '<div class="case-body" id="cb-' + c.id + '"' + (open ? '' : ' hidden') + '>' +
    '<dl class="case-dl"><dt>What happened</dt><dd>' + e(c.what) + '</dd><dt>Cause</dt><dd>' + e(c.cause) + '</dd><dt>What changed</dt><dd>' + e(c.fix) + '</dd><dt>Lesson</dt><dd class="case-lesson">' + e(c.lesson) + '</dd></dl>' +
    '<p class="small">Related stages: ' + chips(c.modules) + '</p>' +
    '<p class="small">Original source: <a href="' + e(c.source.u) + '" target="_blank" rel="noopener">' + e(c.source.t) + '</a> <span class="host">' + e(c.source.u.replace(/^https:\/\/([^\/]+).*$/, '$1')) + '</span></p>' +
    '<div class="actions">' + (A.caseFileFor && A.caseFileFor(c.id) ? '<a class="btn btn-primary" href="' + A.caseFileFor(c.id) + '">Open the full case file</a>' : '') + say(null, text) + '<button type="button" class="btn btn-quiet" data-act="case-read">' + (read ? 'Mark as unread' : 'Mark as read') + '</button></div></div></article>';
}
function casesView(param) {
  if (param) { if (MOD[param]) { csFilter.mod = param; csFilter.open = ''; } else if (CASES.some(function (c) { return c.id === param; })) { csFilter.open = param; csFilter.area = ''; csFilter.mod = ''; csFilter.q = ''; } }
  view.title = 'Real-world case studies | MARGA by EknathaLabs'; view.nav = 'cases';
  var areas = []; CASES.forEach(function (c) { if (areas.indexOf(c.area) < 0) areas.push(c.area); }); areas.sort();
  view.html = head('Real-world case studies', plural(CASES.length, 'real incident') + ' and what each one teaches. These are short summaries based on the public reports. Open the original source for the full detail.',
    '<p class="small" id="case-stats"></p><div class="actions">' + A.printBar() + '<button type="button" class="btn btn-quiet" data-act="case-all" data-open="0">Open all</button></div>' + A.voiceSlot() +
    '<div class="iv-filters">' + sel('cs-area', 'Type', [['', 'All types']].concat(areas.map(function (x) { return [x, x]; })), csFilter.area) +
    sel('cs-mod', 'Stage', [['', 'All stages']].concat(MODS.map(function (m) { return [m.id, m.title]; })), csFilter.mod) +
    '<label class="field grow"><span>Search</span><input id="cs-q" type="search" placeholder="Search incidents, companies, causes" autocomplete="off" value="' + e(csFilter.q) + '"></label></div>') +
    '<div class="wrap narrow"><p class="small" id="case-count" role="status"></p><div id="case-list"></div></div>';
  view.voice = '#case-list'; view.voiceLabel = 'Real-world case studies';
  view.after = function () {
    function paint() {
      var items = caseItems();
      $('#case-list').innerHTML = items.length ? items.map(caseHtml).join('') : '<div class="empty"><h3>No case studies match</h3><p>Clear a filter or try another search term.</p></div>';
      $('#case-count').textContent = plural(items.length, 'case study', 'case studies') + ' shown.';
      $('#case-stats').textContent = Object.keys(bag('cs')).length + ' of ' + CASES.length + ' marked as read.';
      A.wireSay($('#case-list'));
    }
    $('#cs-area').addEventListener('change', function (ev) { csFilter.area = ev.target.value; paint(); });
    $('#cs-mod').addEventListener('change', function (ev) { csFilter.mod = ev.target.value; paint(); });
    $('#cs-q').addEventListener('input', function (ev) { csFilter.q = ev.target.value; paint(); });
    paint();
    if (csFilter.open) { var t = $('#case-' + csFilter.open); if (t) t.scrollIntoView({ block: 'start' }); csFilter.open = ''; }
  };
}
A.addRoute(/^\/cases$/, function () { return casesView(''); });
A.addRoute(/^\/cases\/([\w-]+)$/, casesView);
function toggleCase(card, open) {
  var b = $('.case-toggle', card), body = $('.case-body', card);
  body.hidden = !open; b.setAttribute('aria-expanded', String(open)); card.classList.toggle('open', open);
}
A.onAct('case-toggle', function (b) { var c = b.closest('.case'); toggleCase(c, b.getAttribute('aria-expanded') !== 'true'); });
A.onAct('case-all', function (b) {
  var open = b.getAttribute('data-open') !== '1';
  $$('#case-list .case').forEach(function (c) { toggleCase(c, open); });
  b.setAttribute('data-open', open ? '1' : '0'); b.textContent = open ? 'Close all' : 'Open all';
});
A.onAct('case-read', function (b) {
  var c = b.closest('.case'), id = c.getAttribute('data-id'), m = bag('cs');
  if (m[id]) delete m[id]; else { m[id] = 1; A.markActive(); }
  A.save(); A.renderChrome(); A.setNav(view.nav);
  var meta = $('.iv-meta', c); $$('.chip.pass', meta).forEach(function (x) { x.remove(); });
  c.classList.toggle('read', !!m[id]);
  if (m[id]) meta.insertAdjacentHTML('beforeend', '<span class="chip pass">Read</span>');
  b.textContent = m[id] ? 'Mark as unread' : 'Mark as read';
  $('#case-stats').textContent = Object.keys(m).length + ' of ' + CASES.length + ' marked as read.';
});

/* =========================================================== Architecture post-mortems */
function archListView() {
  view.title = 'Architecture post-mortems | MARGA by EknathaLabs'; view.nav = 'cases';
  view.html = head('Architecture post-mortems', plural(ARCH.length, 'incident') + ' reviewed in depth: the system, a timeline, the root cause, what changed and the trade-offs. Each one links to calculators you can change. These are summaries of the published reports. Times and numbers follow those reports; read the original for the full record.',
    '<div class="actions">' + A.printBar() + '</div>') +
    '<div class="wrap"><ul class="prac">' + ARCH.map(function (a) {
      return '<li><a href="#/architecture/' + a.id + '"><strong>' + e(a.title) + '</strong><span>' + e(a.summary) + '</span><em>' + e(a.company) + ', ' + e(a.date) + '</em></a></li>';
    }).join('') + '</ul></div>';
  view.after = null;
}
function archView(id) {
  var i = -1; ARCH.forEach(function (a, k) { if (a.id === id) i = k; });
  if (i < 0) { view.title = 'Not found | MARGA by EknathaLabs'; view.nav = ''; view.html = head('That review does not exist', 'Go back to the <a href="#/architecture">architecture post-mortems</a>.'); view.after = null; return; }
  var a = ARCH[i], prev = ARCH[i - 1], next = ARCH[i + 1];
  var calcs = (a.calcs || []).filter(function (c) { return window.MargaCalc && MargaCalc.list.some(function (x) { return x.id === c; }); });
  view.title = a.title + ' | MARGA by EknathaLabs'; view.nav = 'cases';
  view.html = '<section class="page-head wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#/architecture">Architecture post-mortems</a></nav><h1>' + e(a.title) + '</h1>' +
    '<p class="lede">' + e(a.summary) + '</p><p class="small">' + e(a.company) + ', ' + e(a.date) + '. Related stages: ' + chips(a.modules) + '</p>' +
    '<div class="actions">' + A.printBar() + '</div>' + A.voiceSlot() + '</section>' +
    '<div class="wrap narrow"><article class="prose arch" id="arch-body">' + a.html + '</article>' +
    (calcs.length ? '<section class="calc-sec" aria-label="Calculators"><h2>Calculators</h2>' + calcs.map(function (c) { return '<div class="calc-slot" data-calc="' + c + '"></div>'; }).join('') + '</section>' : '') +
    A.refsHtml(a.sources, 'Original reports') +
    '<nav class="pager" aria-label="Other post-mortems">' + (prev ? '<a href="#/architecture/' + prev.id + '">Previous: ' + e(prev.title) + '</a>' : '<span></span>') + (next ? '<a href="#/architecture/' + next.id + '">Next: ' + e(next.title) + '</a>' : '<span></span>') + '</nav></div>';
  view.voice = '#arch-body'; view.voiceLabel = a.title;
  view.after = function () { $$('.calc-slot').forEach(function (s) { MargaCalc.mount(s, s.getAttribute('data-calc')); }); };
}
A.addRoute(/^\/architecture$/, archListView);
A.addRoute(/^\/architecture\/([\w-]+)$/, archView);

/* =========================================================== Calculators */
function calcView(id) {
  var list = window.MargaCalc ? MargaCalc.list : [];
  var one = id && list.some(function (c) { return c.id === id; }) ? id : '';
  view.title = 'Trade-off calculators | MARGA by EknathaLabs'; view.nav = 'practice';
  view.html = head('Trade-off calculators', 'Change the numbers and see what happens to availability, cost and risk. Everything is calculated in your browser.',
    '<div class="actions">' + A.printBar() + (one ? '<a class="btn btn-quiet" href="#/calculators">Show all calculators</a>' : '') + '</div>') +
    '<div class="wrap narrow"><div id="calc-list">' + list.filter(function (c) { return !one || c.id === one; }).map(function (c) {
      return '<section class="calc-sec"><div class="calc-slot" data-calc="' + c.id + '"></div>' + (one ? '' : '<p class="small"><a href="#/calculators/' + c.id + '">Open on its own page</a></p>') + '</section>';
    }).join('') + '</div></div>';
  view.after = function () { $$('.calc-slot').forEach(function (s) { MargaCalc.mount(s, s.getAttribute('data-calc')); }); };
}
A.addRoute(/^\/calculators$/, function () { return calcView(''); });
A.addRoute(/^\/calculators\/([\w-]+)$/, calcView);

/* =========================================================== Troubleshooting drills */
function drillHtml(d) {
  var st = bag('dr')[d.id];
  var opts = shuffle(d.options);
  return '<article class="drill' + (st && st.ok ? ' solved' : '') + '" id="drill-' + d.id + '" data-id="' + d.id + '">' +
    '<h3>' + e(d.title) + '</h3><p class="iv-meta"><span class="chip">' + e(modTitle(d.module)) + '</span><span class="chip lvl-' + d.level + '">' + e(LEVELS[d.level]) + '</span>' + (st && st.ok ? '<span class="chip pass">Solved</span>' : '') + '</p>' +
    '<p>' + e(d.story) + '</p><pre class="evidence" tabindex="0" aria-label="Evidence for ' + e(d.title) + '"><code>' + e(d.evidence) + '</code></pre>' +
    '<fieldset class="drill-q"><legend>' + e(d.q) + '</legend>' + opts.map(function (o, i) {
      return '<label class="opt-r"><input type="radio" name="dq-' + d.id + '" value="' + (o.ok ? '1' : '0') + '"> <span>' + e(o.t) + '</span></label>';
    }).join('') + '</fieldset>' +
    '<div class="actions"><button type="button" class="btn btn-primary" data-act="drill-check">Check answer</button>' + say(null, d.title + '. ' + d.story + ' Question. ' + d.q) + '</div>' +
    '<div class="drill-res" role="status" aria-live="polite" hidden></div></article>';
}
function drillsView(mod) {
  if (mod && !MOD[mod]) mod = '';
  view.title = 'Troubleshooting drills | MARGA by EknathaLabs'; view.nav = 'practice';
  var dr = bag('dr'), solved = Object.keys(dr).filter(function (k) { return dr[k].ok; }).length;
  var mods = MODS.filter(function (m) { return DRILLS.some(function (d) { return d.module === m.id; }) && (!mod || m.id === mod); });
  view.html = head('Troubleshooting drills', 'Each drill shows real-looking output from a failing system. Decide what is wrong and choose the best next step. ' + plural(DRILLS.length, 'drill') + ', covering every stage.',
    '<p class="small" id="drill-stats">' + solved + ' of ' + DRILLS.length + ' solved.</p><div class="actions">' + A.printBar() + '</div>' +
    '<div class="iv-filters">' + sel('dr-mod', 'Stage', [['', 'All stages']].concat(MODS.map(function (m) { return [m.id, m.title]; })), mod || '') + '</div>') +
    '<div class="wrap narrow" id="drill-list">' + mods.map(function (m) {
      return '<section class="drill-group" aria-labelledby="dg-' + m.id + '"><h2 id="dg-' + m.id + '">' + e(m.title) + '</h2>' + DRILLS.filter(function (d) { return d.module === m.id; }).map(drillHtml).join('') + '</section>';
    }).join('') + '</div>';
  view.after = function () { $('#dr-mod').addEventListener('change', function (ev) { location.hash = ev.target.value ? '/drills/' + ev.target.value : '/drills'; }); A.wireSay($('#drill-list')); };
}
A.addRoute(/^\/drills$/, function () { return drillsView(''); });
A.addRoute(/^\/drills\/([\w-]+)$/, drillsView);
A.onAct('drill-check', function (b) {
  var card = b.closest('.drill'), id = card.getAttribute('data-id');
  var d = DRILLS.filter(function (x) { return x.id === id; })[0];
  var picked = $('input[type=radio]:checked', card), res = $('.drill-res', card);
  if (!picked) { A.toast('Choose an answer first.'); return; }
  var ok = picked.value === '1', m = bag('dr'), rec = m[id] || { n: 0, ok: false };
  rec.n++; if (ok) rec.ok = true; m[id] = rec; if (window.MargaFeatures && MargaFeatures.note) MargaFeatures.note('d', id, ok); A.markActive(); A.save(); A.renderChrome(); A.setNav(view.nav);
  $$('input[type=radio]', card).forEach(function (r) { r.disabled = true; var l = r.closest('label'); l.classList.toggle('good', r.value === '1'); l.classList.toggle('bad', r === picked && !ok); });
  res.hidden = false; res.className = 'drill-res ' + (ok ? 'ok' : 'no');
  res.innerHTML = '<p><strong>' + (ok ? 'Correct.' : 'Not quite.') + '</strong> ' + e(d.why) + '</p>' + (ok ? '' : '<p><button type="button" class="btn btn-quiet" data-act="drill-retry">Try again</button></p>');
  if (ok) { card.classList.add('solved'); var meta = $('.iv-meta', card); if (!$('.chip.pass', meta)) meta.insertAdjacentHTML('beforeend', '<span class="chip pass">Solved</span>'); }
  b.disabled = true;
  var solved = Object.keys(m).filter(function (k) { return m[k].ok; }).length, st = $('#drill-stats'); if (st) st.textContent = solved + ' of ' + DRILLS.length + ' solved.';
});
A.onAct('drill-retry', function (b) {
  var card = b.closest('.drill');
  $$('input[type=radio]', card).forEach(function (r) { r.disabled = false; r.checked = false; r.closest('label').classList.remove('good', 'bad'); });
  $('[data-act=drill-check]', card).disabled = false;
  var res = $('.drill-res', card); res.hidden = true; res.innerHTML = '';
});

/* =========================================================== Mock interview */
var MK = null, mkTimer = null;
function mkClear() { if (mkTimer) { clearInterval(mkTimer); mkTimer = null; } }
window.addEventListener('hashchange', mkClear);
function mockView() {
  view.title = 'Mock interview | MARGA by EknathaLabs'; view.nav = 'interview';
  MK = null; mkClear();
  var hist = bag('mock', 'array');
  view.html = head('Mock interview', 'Practise the way an interview goes. You get a set of questions for your role, one at a time. Answer out loud or type notes, reveal the model answer, then score yourself honestly.') +
    '<div class="wrap narrow"><div id="mock-root"></div>' + (hist.length ? '<h2 class="sub-h">Recent mock interviews</h2><ul class="mock-hist">' + hist.slice(-5).reverse().map(function (h) {
      return '<li><b>' + h.score + '%</b> <span>' + e(h.label) + ', ' + plural(h.n, 'question') + ', ' + e(h.day) + '</span></li>'; }).join('') + '</ul>' : '') + '</div>';
  view.after = mockSetup;
}
A.addRoute(/^\/interview\/mock$/, mockView);
function mockSetup() {
  var roles = [['all', 'All topics']].concat(A.D.paths.live.map(function (p) { return [p.id, p.title]; }));
  $('#mock-root').innerHTML = '<form class="mock-setup" id="mock-form" onsubmit="return false">' +
    sel('mk-role', 'Role', roles, 'all') +
    sel('mk-level', 'Level', [['', 'Any level'], ['junior', 'Junior'], ['mid', 'Mid-level'], ['senior', 'Senior']], '') +
    sel('mk-n', 'Questions', [[5, '5 questions'], [10, '10 questions'], [15, '15 questions'], [20, '20 questions']], 10) +
    sel('mk-secs', 'Time per question', [[0, 'No timer'], [60, '1 minute'], [120, '2 minutes'], [180, '3 minutes']], 120) +
    '<label class="chk"><input type="checkbox" id="mk-speak"> Read each question aloud</label>' +
    '<div class="actions"><button type="button" class="btn btn-primary" data-act="mock-start">Start interview</button></div>' +
    '<p class="small" id="mk-msg" role="status"></p></form>';
}
function mkPool(role, level) {
  var mods = null;
  if (role !== 'all') { var p = A.PATH[role]; mods = p ? p.modules : null; }
  return IV.filter(function (x) { return (!mods || mods.indexOf(x.module) >= 0) && (!level || x.level === level); });
}
A.onAct('mock-start', function () {
  var role = $('#mk-role').value, level = $('#mk-level').value, n = Number($('#mk-n').value), secs = Number($('#mk-secs').value), speak = $('#mk-speak').checked;
  var pool = mkPool(role, level);
  if (pool.length < 3) { $('#mk-msg').textContent = 'Not enough questions match that choice. Try another level.'; return; }
  var rl = $('#mk-role option:checked').textContent;
  MK = { qs: shuffle(pool).slice(0, Math.min(n, pool.length)), i: 0, scores: [], secs: secs, speak: speak, label: rl + (level ? ', ' + LEVELS[level] : '') };
  mockQuestion();
});
function fmtT(s) { var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
function mockQuestion() {
  mkClear();
  var q = MK.qs[MK.i], n = MK.qs.length;
  $('#mock-root').innerHTML = '<section class="mock-q" aria-labelledby="mk-h"><p class="small">Question ' + (MK.i + 1) + ' of ' + n + (MK.secs ? ' <span class="mk-time" id="mk-time" aria-hidden="true"></span>' : '') + '</p>' +
    '<div class="bar wide" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + MK.i + '" aria-label="Interview progress"><i style="width:' + Math.round(MK.i / n * 100) + '%"></i></div>' +
    '<h2 id="mk-h" tabindex="-1">' + e(q.q) + '</h2><p class="iv-meta"><span class="chip">' + e(modTitle(q.module)) + '</span><span class="chip lvl-' + q.level + '">' + e(LEVELS[q.level]) + '</span></p>' +
    '<label class="field"><span>Your notes (optional, not saved)</span><textarea id="mk-notes" rows="4" placeholder="Say your answer out loud first. Jot key points here."></textarea></label>' +
    '<p class="small" id="mk-timeup" role="status"></p>' +
    '<div class="actions"><button type="button" class="btn btn-primary" data-act="mock-reveal" id="mk-reveal">Reveal model answer</button>' + say(null, q.q) + '<button type="button" class="btn btn-quiet" data-act="mock-skip">Skip</button></div>' +
    '<div class="iv-a" id="mk-ans" hidden>' + q.html + '</div>' +
    '<div class="mk-score" id="mk-score" hidden><p><strong>How did you do?</strong></p><div class="actions">' +
    '<button type="button" class="btn btn-primary" data-act="mock-score" data-s="2">Nailed it</button><button type="button" class="btn btn-quiet" data-act="mock-score" data-s="1">Partly</button><button type="button" class="btn btn-quiet" data-act="mock-score" data-s="0">Missed it</button></div></div></section>';
  A.wireSay($('#mock-root'));
  var h = $('#mk-h'); if (h) h.focus();
  if (MK.speak && window.MargaVoice && MargaVoice.supported) MargaVoice.say(q.q);
  if (MK.secs) {
    var left = MK.secs, t = $('#mk-time');
    var paint = function () { if (t) t.textContent = 'Time left ' + fmtT(Math.max(0, left)); };
    paint();
    mkTimer = setInterval(function () {
      left--; paint();
      if (left <= 0) { mkClear(); var m = $('#mk-timeup'); if (m) m.textContent = 'Time is up. In a real interview you would wrap up now. Reveal the answer and score yourself.'; }
    }, 1000);
  }
}
A.onAct('mock-reveal', function (b) {
  $('#mk-ans').hidden = false; $('#mk-score').hidden = false; b.hidden = true; mkClear();
  var sc = $('#mk-score [data-s="2"]'); if (sc) sc.focus();
});
function mockPush(s) {
  MK.scores.push({ id: MK.qs[MK.i].id, module: MK.qs[MK.i].module, s: s });
  MK.i++;
  if (MK.i >= MK.qs.length) mockFinish(); else mockQuestion();
}
A.onAct('mock-score', function (b) { mockPush(Number(b.getAttribute('data-s'))); });
A.onAct('mock-skip', function () { mockPush(0); });
function mockFinish() {
  mkClear(); if (window.MargaVoice) MargaVoice.stop();
  var n = MK.scores.length, pts = MK.scores.reduce(function (a, x) { return a + x.s; }, 0), pct = Math.round(pts / (2 * n) * 100);
  var iv = bag('iv');
  MK.scores.forEach(function (x) { iv[x.id] = x.s === 2 ? 'know' : 'review'; });
  var hist = bag('mock', 'array');
  var d = new Date(), day = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  hist.push({ score: pct, n: n, label: MK.label, day: day }); if (hist.length > 20) hist.splice(0, hist.length - 20);
  A.markActive(); A.save(); A.renderChrome(); A.setNav(view.nav);
  var by = {};
  MK.scores.forEach(function (x) { var m = by[x.module] || (by[x.module] = { got: 0, max: 0 }); m.got += x.s; m.max += 2; });
  var rows = Object.keys(by).map(function (k) { return { id: k, pct: Math.round(by[k].got / by[k].max * 100), got: by[k].got, max: by[k].max }; }).sort(function (a, b) { return a.pct - b.pct; });
  var weak = rows.filter(function (r) { return r.pct < 60; });
  var missed = MK.scores.filter(function (x) { return x.s < 2; }).map(function (x) { return IV.filter(function (q) { return q.id === x.id; })[0]; });
  var verdict = pct >= 80 ? 'Strong. You are ready for this level.' : pct >= 60 ? 'Good, with gaps. Review the topics below.' : 'Keep practising. Study the weak topics, then try again.';
  $('#mock-root').innerHTML = '<section class="mock-res" aria-labelledby="mr-h"><h2 id="mr-h" tabindex="-1">Your result: ' + pct + '%</h2><p class="lede">' + e(verdict) + '</p>' +
    '<p class="small">' + e(MK.label) + ', ' + plural(n, 'question') + '. Questions you nailed are marked as known in InterviewHub, the others for review.</p>' +
    '<h3 class="sub-h">By topic</h3><ul class="modbars">' + rows.map(function (r) {
      return '<li><a href="#/module/' + r.id + '"><span>' + e(modTitle(r.id)) + '</span><span class="bar"><i style="width:' + r.pct + '%"></i></span><b>' + r.pct + '%</b></a></li>'; }).join('') + '</ul>' +
    (weak.length ? '<h3 class="sub-h">Study next</h3><ul class="chips">' + weak.map(function (r) { return '<li><a href="#/module/' + r.id + '">' + e(modTitle(r.id)) + '</a></li>'; }).join('') + '</ul>' : '<p>No weak topics in this round.</p>') +
    (missed.length ? '<h3 class="sub-h">Questions to revisit</h3>' + missed.map(function (q) { return '<details class="mk-miss"><summary>' + e(q.q) + '</summary><div class="iv-a">' + q.html + '</div></details>'; }).join('') : '') +
    '<div class="actions"><button type="button" class="btn btn-primary" data-act="mock-again">Start another</button><a class="btn btn-quiet" href="#/interview">Open InterviewHub</a>' + A.printBar() + '</div></section>';
  var h = $('#mr-h'); if (h) h.focus();
}
A.onAct('mock-again', function () { MK = null; mockSetup(); });

/* =========================================================== Interactive flashcards */
var FC = null;
function fcDeck(mod, order, only) {
  var cards = [];
  if (mod === 'interview') IV.forEach(function (x) { cards.push({ id: 'iv:' + x.id, f: x.q, b: x.text, tag: 'InterviewHub, ' + modTitle(x.module) }); });
  else MODS.forEach(function (m) {
    if (mod !== 'all' && mod !== m.id) return;
    m.lessons.forEach(function (lid) { (A.LES[lid].cards || []).forEach(function (c, k) { cards.push({ id: lid + '#' + k, f: c.f, b: c.b, tag: m.title + ', ' + A.LES[lid].title }); }); });
  });
  var fc = bag('fc');
  if (only === 'unknown') cards = cards.filter(function (c) { return fc[c.id] !== 'k'; });
  return order === 'shuffle' ? shuffle(cards) : cards;
}
function flashView() {
  view.title = 'Interactive flashcards | MARGA by EknathaLabs'; view.nav = 'practice';
  FC = null;
  view.html = head('Interactive flashcards', 'Flip each card, say the answer first, then mark whether you know it. Cards come from every lesson and from InterviewHub, and are open to everyone. Keys: Space flips, 1 means still learning, 2 means I know it, the arrow keys move between cards.') +
    '<div class="wrap narrow"><div id="fc-root"></div></div>';
  view.after = fcSetup;
}
A.addRoute(/^\/flashcards$/, flashView);
function fcSetup() {
  var fc = bag('fc'), known = Object.keys(fc).filter(function (k) { return fc[k] === 'k'; }).length;
  $('#fc-root').innerHTML = '<form class="mock-setup" onsubmit="return false">' +
    sel('fc-deck', 'Deck', [['all', 'All lessons'], ['interview', 'InterviewHub questions']].concat(MODS.map(function (m) { return [m.id, m.title]; })), 'all') +
    sel('fc-order', 'Order', [['shuffle', 'Shuffled'], ['order', 'In lesson order']], 'shuffle') +
    sel('fc-only', 'Show', [['all', 'All cards'], ['unknown', 'Skip cards I know']], 'all') +
    '<div class="actions"><button type="button" class="btn btn-primary" data-act="fc-start">Start studying</button></div>' +
    '<p class="small" id="fc-msg" role="status">' + known + ' cards marked as known so far.</p></form>';
}
A.onAct('fc-start', function () {
  var cards = fcDeck($('#fc-deck').value, $('#fc-order').value, $('#fc-only').value);
  if (!cards.length) { $('#fc-msg').textContent = 'Nothing to study with those choices. You may know every card in this deck.'; return; }
  FC = { cards: cards, i: 0, flipped: false, deck: $('#fc-deck').value, order: $('#fc-order').value, learn: 0, know: 0 };
  fcCard();
});
function fcCard() {
  var c = FC.cards[FC.i], n = FC.cards.length, st = bag('fc')[c.id];
  FC.flipped = false;
  $('#fc-root').innerHTML = '<section class="fc" aria-label="Flashcard ' + (FC.i + 1) + ' of ' + n + '">' +
    '<p class="small">Card ' + (FC.i + 1) + ' of ' + n + '. ' + e(c.tag) + (st === 'k' ? '. You marked this as known.' : '') + '</p>' +
    '<div class="bar wide" role="progressbar" aria-valuemin="0" aria-valuemax="' + n + '" aria-valuenow="' + FC.i + '" aria-label="Deck progress"><i style="width:' + Math.round(FC.i / n * 100) + '%"></i></div>' +
    '<button type="button" class="fc-card" data-act="fc-flip" aria-pressed="false" aria-label="Flashcard. Press to flip between question and answer."><span class="fc-face fc-front"><small>Question</small>' + e(c.f) + '</span><span class="fc-face fc-back" aria-hidden="true"><small>Answer</small>' + e(c.b) + '</span></button>' +
    '<div class="actions"><button type="button" class="btn btn-quiet" data-act="fc-flip-btn">Flip card</button>' + say(null, c.f + '. ' + c.b) +
    '<button type="button" class="btn btn-quiet" data-act="fc-prev"' + (FC.i === 0 ? ' disabled' : '') + '>Previous</button><button type="button" class="btn btn-quiet" data-act="fc-next">Skip</button></div>' +
    '<div class="actions fc-rate" id="fc-rate" hidden><button type="button" class="btn btn-quiet" data-act="fc-rate" data-r="l">Still learning (1)</button><button type="button" class="btn btn-primary" data-act="fc-rate" data-r="k">I know it (2)</button></div></section>';
  A.wireSay($('#fc-root'));
  var b = $('.fc-card'); if (b) b.focus();
}
function fcFlip() {
  if (!FC || !$('.fc-card')) return;
  FC.flipped = !FC.flipped;
  var b = $('.fc-card'); b.classList.toggle('flipped', FC.flipped); b.setAttribute('aria-pressed', String(FC.flipped));
  $('.fc-front', b).setAttribute('aria-hidden', String(FC.flipped)); $('.fc-back', b).setAttribute('aria-hidden', String(!FC.flipped));
  $('#fc-rate').hidden = !FC.flipped;
}
A.onAct('fc-flip', fcFlip);
A.onAct('fc-flip-btn', fcFlip);
function fcGo(d) {
  var j = FC.i + d;
  if (j < 0) return;
  if (j >= FC.cards.length) { fcDone(); return; }
  FC.i = j; fcCard();
}
A.onAct('fc-prev', function () { fcGo(-1); });
A.onAct('fc-next', function () { fcGo(1); });
function fcRate(r) {
  if (!FC || !FC.flipped) return;
  var c = FC.cards[FC.i], m = bag('fc'); m[c.id] = r; if (r === 'k') FC.know++; else FC.learn++;
  A.markActive(); A.save(); A.renderChrome(); A.setNav(view.nav); fcGo(1);
}
A.onAct('fc-rate', function (b) { fcRate(b.getAttribute('data-r')); });
function fcDone() {
  var fc = bag('fc'), left = FC.cards.filter(function (c) { return fc[c.id] !== 'k'; }).length;
  $('#fc-root').innerHTML = '<section class="empty"><h2 tabindex="-1" id="fc-done">Deck finished</h2><p>This round: ' + FC.know + ' known, ' + FC.learn + ' still learning. ' + left + ' of ' + FC.cards.length + ' cards in this deck are not marked as known yet.</p>' +
    '<div class="actions"><button type="button" class="btn btn-primary" data-act="fc-again">Study the cards I do not know</button><button type="button" class="btn btn-quiet" data-act="fc-menu">Choose another deck</button></div></section>';
  var h = $('#fc-done'); if (h) h.focus();
}
A.onAct('fc-again', function () {
  var cards = fcDeck(FC.deck, FC.order, 'unknown');
  if (!cards.length) { fcSetup(); return; }
  FC = { cards: cards, i: 0, flipped: false, deck: FC.deck, order: FC.order, learn: 0, know: 0 }; fcCard();
});
A.onAct('fc-menu', function () { FC = null; fcSetup(); });
document.addEventListener('keydown', function (ev) {
  if (!FC || !$('.fc-card')) return;
  var tag = (document.activeElement && document.activeElement.tagName) || '';
  if (/INPUT|TEXTAREA|SELECT/.test(tag) || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  if (ev.key === '1') { ev.preventDefault(); fcRate('l'); }
  else if (ev.key === '2') { ev.preventDefault(); fcRate('k'); }
  else if (ev.key === 'ArrowRight') { ev.preventDefault(); fcGo(1); }
  else if (ev.key === 'ArrowLeft') { ev.preventDefault(); fcGo(-1); }
});
};
